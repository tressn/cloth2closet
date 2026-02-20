import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { NotificationType, ProjectStatus } from "@prisma/client";

export const runtime = "nodejs";

type Role = "CUSTOMER" | "DRESSMAKER" | "ADMIN";

type Action =
  | "SUBMIT_SKETCH"
  | "APPROVE_SKETCH"
  | "REQUEST_MEASUREMENTS"
  | "CONFIRM_MEASUREMENTS_DRESSMAKER"
  | "CONFIRM_MEASUREMENTS_CUSTOMER"
  | "MARK_FIT_SAMPLE_SENT"
  | "CONFIRM_FIT_SAMPLE_RECEIVED"
  | "SUBMIT_FINAL"
  | "APPROVE_FINAL"
  | "MARK_SHIPPED"
  | "MARK_COMPLETED"
  | "CANCEL_PROJECT";

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function isNonEmptyString(x: any) {
  return typeof x === "string" && x.trim().length > 0;
}

function asStringArray(x: any, max = 10): string[] {
  if (!Array.isArray(x)) return [];
  return x.map((v) => String(v).trim()).filter(Boolean).slice(0, max);
}

function validateUrlsAreFromS3PublicBase(urls: string[], publicBase: string) {
  for (const url of urls) {
    if (!url.startsWith(publicBase)) {
      throw new Error("Invalid image URL");
    }
  }
}

function hrefFor(role: "CUSTOMER" | "DRESSMAKER", projectId: string) {
  return role === "CUSTOMER"
    ? `/dashboard/customer/projects/${projectId}`
    : `/dashboard/dressmaker/projects/${projectId}`;
}

async function ensureDetails(projectId: string) {
  const existing = await prisma.projectDetails.findUnique({ where: { projectId } });
  if (existing) return existing;

  // IMPORTANT: array fields are required in your schema → initialize them.
  return prisma.projectDetails.create({
    data: {
      projectId,
      referenceImages: [],
      sketchImage: [],
      finalImages: [],
      measurementsRequested: [],
      isRush: false,
      wantsCalico: false,
    },
  });
}

async function notifyOtherParty(opts: {
  projectId: string;
  projectTitle: string;
  customerId: string;
  dressmakerId: string;
  actorId: string;
  title: string;
  body?: string | null;
}) {
  const { projectId, projectTitle, customerId, dressmakerId, actorId, title, body } = opts;

  const targetUserId = actorId === customerId ? dressmakerId : customerId;
  const targetRole = targetUserId === customerId ? "CUSTOMER" : "DRESSMAKER";

  await prisma.notification.create({
    data: {
      userId: targetUserId,
      type: NotificationType.PROJECT_UPDATE,
      title,
      body: body ?? projectTitle,
      href: hrefFor(targetRole, projectId),
      projectId,
    },
  });
}

function canCancel(status: ProjectStatus, requester: "CUSTOMER" | "DRESSMAKER" | "ADMIN") {
  // Your rule: customer can't cancel after shipping
  if (requester === "CUSTOMER") {
    return status !== ProjectStatus.SHIPPED && status !== ProjectStatus.COMPLETED;
  }
  // Dressmaker/admin can cancel anytime (tighten later if you want)
  return true;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return bad("Not authenticated", 401);

  const { id: projectId } = await params;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { details: true, payment: true },
  });
  if (!project) return bad("Project not found", 404);

  const role = (session.user.role ?? null) as Role | null;
  const isAdmin = role === "ADMIN";
  const isCustomerParty = project.customerId === userId;
  const isDressmakerParty = project.dressmakerId === userId;

  if (!isAdmin && !isCustomerParty && !isDressmakerParty) return bad("Forbidden", 403);

  if (project.status === ProjectStatus.CANCELED) return bad("Project is canceled", 400);

  const body = await req.json().catch(() => ({}));
  const action = body?.action as Action;
  if (!action) return bad("action is required");

  const publicBase = process.env.S3_PUBLIC_BASE_URL;
  if (!publicBase) return bad("Missing S3_PUBLIC_BASE_URL", 500);

  const details = project.details ?? (await ensureDetails(project.id));

  const requireDressmaker = () => {
    if (!isAdmin && !isDressmakerParty) throw new Error("Only the dressmaker can do that.");
  };
  const requireCustomer = () => {
    if (!isAdmin && !isCustomerParty) throw new Error("Only the customer can do that.");
  };

  const now = new Date();
  const detailsUpdate: any = {};
  const projectUpdate: any = {};

  const projectTitle = project.title ?? project.projectCode;

  try {
    switch (action) {
      // -----------------------------
      // Sketch gate
      // -----------------------------
      case "SUBMIT_SKETCH": {
        requireDressmaker();
        if (!details.requireSketch) throw new Error("Sketch is not required for this project.");

        const images = asStringArray(body?.images ?? body?.imageUrls, 10);
        if (images.length === 0) throw new Error("Provide at least one sketch image URL.");

        validateUrlsAreFromS3PublicBase(images, publicBase);

        detailsUpdate.sketchImage = images;
        detailsUpdate.sketchSubmittedAt = now;
        detailsUpdate.sketchApprovedAt = null;

        await notifyOtherParty({
          projectId: project.id,
          projectTitle,
          customerId: project.customerId,
          dressmakerId: project.dressmakerId,
          actorId: userId,
          title: "Sketch submitted",
          body: "Review and approve to proceed.",
        });

        break;
      }

      case "APPROVE_SKETCH": {
        requireCustomer();
        if (!details.requireSketch) throw new Error("Sketch is not required for this project.");
        if (!details.sketchSubmittedAt) throw new Error("No sketch submitted yet.");
        if (details.sketchApprovedAt) throw new Error("Sketch already approved.");

        detailsUpdate.sketchApprovedAt = now;

        await notifyOtherParty({
          projectId: project.id,
          projectTitle,
          customerId: project.customerId,
          dressmakerId: project.dressmakerId,
          actorId: userId,
          title: "Sketch approved",
          body: "You can continue with production steps.",
        });

        break;
      }

      // -----------------------------
      // Measurements gate
      // -----------------------------
      case "REQUEST_MEASUREMENTS": {
        requireDressmaker();

        const requested = asStringArray(body?.requestedFields, 25);
        if (requested.length === 0) throw new Error("Provide requestedFields (at least one).");

        detailsUpdate.measurementsRequested = requested;
        detailsUpdate.measurementsConfirmedByDressmakerAt = null;
        detailsUpdate.measurementsConfirmedByCustomerAt = null;

        await notifyOtherParty({
          projectId: project.id,
          projectTitle,
          customerId: project.customerId,
          dressmakerId: project.dressmakerId,
          actorId: userId,
          title: "Measurements requested",
          body: requested.join(", "),
        });

        break;
      }

      case "CONFIRM_MEASUREMENTS_DRESSMAKER": {
        requireDressmaker();
        detailsUpdate.measurementsConfirmedByDressmakerAt = now;

        await notifyOtherParty({
          projectId: project.id,
          projectTitle,
          customerId: project.customerId,
          dressmakerId: project.dressmakerId,
          actorId: userId,
          title: "Dressmaker confirmed measurements",
          body: "They have what they need to proceed.",
        });

        break;
      }

      case "CONFIRM_MEASUREMENTS_CUSTOMER": {
        requireCustomer();
        detailsUpdate.measurementsConfirmedByCustomerAt = now;

        await notifyOtherParty({
          projectId: project.id,
          projectTitle,
          customerId: project.customerId,
          dressmakerId: project.dressmakerId,
          actorId: userId,
          title: "Customer confirmed measurements",
          body: "Measurements updated/confirmed.",
        });

        break;
      }

      // -----------------------------
      // Fit sample (calico) gate
      // -----------------------------
      case "MARK_FIT_SAMPLE_SENT": {
        requireDressmaker();
        if (!details.wantsCalico) throw new Error("This project is not marked for calico/fit sample.");
        if (details.fitSampleSentAt) throw new Error("Fit sample already marked as sent.");

        detailsUpdate.fitSampleSentAt = now;
        projectUpdate.status = ProjectStatus.FIT_SAMPLE_SENT;

        await notifyOtherParty({
          projectId: project.id,
          projectTitle,
          customerId: project.customerId,
          dressmakerId: project.dressmakerId,
          actorId: userId,
          title: "Fit sample sent",
          body: "Confirm when you receive it so we can proceed.",
        });

        break;
      }

      case "CONFIRM_FIT_SAMPLE_RECEIVED": {
        requireCustomer();
        if (!details.wantsCalico) throw new Error("This project is not marked for calico/fit sample.");
        if (!details.fitSampleSentAt) throw new Error("Fit sample hasn't been marked as sent yet.");
        if (details.fitSampleReceivedAt) throw new Error("Fit sample already confirmed as received.");

        detailsUpdate.fitSampleReceivedAt = now;

        await notifyOtherParty({
          projectId: project.id,
          projectTitle,
          customerId: project.customerId,
          dressmakerId: project.dressmakerId,
          actorId: userId,
          title: "Fit sample received",
          body: "Proceeding to final garment.",
        });

        break;
      }

      // -----------------------------
      // Final approval gate
      // -----------------------------
      case "SUBMIT_FINAL": {
        requireDressmaker();

        const images = asStringArray(body?.images ?? body?.imageUrls, 10);
        if (images.length === 0) throw new Error("Provide at least one final image URL.");

        validateUrlsAreFromS3PublicBase(images, publicBase);

        detailsUpdate.finalImages = images;
        detailsUpdate.finalSubmittedAt = now;
        detailsUpdate.finalApprovedAt = null;

        await notifyOtherParty({
          projectId: project.id,
          projectTitle,
          customerId: project.customerId,
          dressmakerId: project.dressmakerId,
          actorId: userId,
          title: "Final photos submitted",
          body: "Approve to allow shipping.",
        });

        break;
      }

      case "APPROVE_FINAL": {
        requireCustomer();
        if (!details.finalSubmittedAt || (details.finalImages?.length ?? 0) === 0) {
          throw new Error("No final photos submitted yet.");
        }
        if (details.finalApprovedAt) throw new Error("Final already approved.");

        detailsUpdate.finalApprovedAt = now;
        projectUpdate.status = ProjectStatus.READY_TO_SHIP;

        await notifyOtherParty({
          projectId: project.id,
          projectTitle,
          customerId: project.customerId,
          dressmakerId: project.dressmakerId,
          actorId: userId,
          title: "Final approved",
          body: "You can ship the garment now.",
        });

        break;
      }

      // -----------------------------
      // Shipping & completion
      // -----------------------------
      case "MARK_SHIPPED": {
        requireDressmaker();
        // ✅ Guard: final payment must be completed before shipping
        const finalMilestone = await prisma.milestone.findUnique({
          where: {
            projectId_type: {
              projectId: project.id,
              type: "FINAL",
            },
          },
          select: { status: true },
        });

        if (!finalMilestone || (finalMilestone.status !== "PAID" && finalMilestone.status !== "RELEASED")) {
          throw new Error("Final payment must be completed before shipping.");
        }


        const trackingNumber = isNonEmptyString(body?.trackingNumber) ? body.trackingNumber.trim() : "";
        const carrier = isNonEmptyString(body?.carrier) ? body.carrier.trim().slice(0, 40) : null;

        if (!trackingNumber) throw new Error("trackingNumber is required.");

        detailsUpdate.shippingTrackingNumber = trackingNumber;
        detailsUpdate.shippingCarrier = carrier;
        detailsUpdate.shippedAt = now;

        projectUpdate.status = ProjectStatus.SHIPPED;

        await notifyOtherParty({
          projectId: project.id,
          projectTitle,
          customerId: project.customerId,
          dressmakerId: project.dressmakerId,
          actorId: userId,
          title: "Order shipped",
          body: carrier ? `${carrier}: ${trackingNumber}` : `Tracking: ${trackingNumber}`,
        });

        break;
      }

      case "MARK_COMPLETED": {
        requireCustomer();

        if (project.status !== ProjectStatus.SHIPPED) throw new Error("Project must be SHIPPED first.");
        if (!details.shippedAt) throw new Error("Missing shippedAt.");

        // Optional: enforce 14-day completion window
        const shippedAt = new Date(details.shippedAt);
        const days = Math.floor((now.getTime() - shippedAt.getTime()) / (1000 * 60 * 60 * 24));
        if (days > 14 && !isAdmin) {
          throw new Error("Completion window expired (more than 14 days since shipped). Contact support.");
        }

        detailsUpdate.completedAt = now;
        projectUpdate.status = ProjectStatus.COMPLETED;

        await notifyOtherParty({
          projectId: project.id,
          projectTitle,
          customerId: project.customerId,
          dressmakerId: project.dressmakerId,
          actorId: userId,
          title: "Project completed",
          body: "Customer marked the project as complete.",
        });

        break;
      }

      // -----------------------------
      // Cancel
      // -----------------------------
      case "CANCEL_PROJECT": {
        const requester: "CUSTOMER" | "DRESSMAKER" | "ADMIN" =
          isAdmin ? "ADMIN" : isCustomerParty ? "CUSTOMER" : "DRESSMAKER";

        if (!canCancel(project.status, requester)) {
          throw new Error("Customer cannot cancel after shipping. Contact support.");
        }

        const reason = isNonEmptyString(body?.reason) ? body.reason.trim().slice(0, 500) : null;

        detailsUpdate.canceledAt = now;
        detailsUpdate.cancelReason = reason;
        projectUpdate.status = ProjectStatus.CANCELED;

        await notifyOtherParty({
          projectId: project.id,
          projectTitle,
          customerId: project.customerId,
          dressmakerId: project.dressmakerId,
          actorId: userId,
          title: "Project canceled",
          body: reason ?? "No reason provided.",
        });

        break;
      }

      default:
        return bad("Unknown action", 400);
    }

    const updated = await prisma.project.update({
      where: { id: project.id },
      data: {
        ...projectUpdate,
        details: {
          update: detailsUpdate,
        },
      },
      include: { details: true, payment: true },
    });

    return NextResponse.json({ ok: true, project: updated });
  } catch (e: any) {
    return bad(e?.message ?? "Workflow action failed", 400);
  }
}
