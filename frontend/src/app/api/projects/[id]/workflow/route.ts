import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { NotificationType, Prisma, ProjectStatus } from "@prisma/client";

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

function asStringArray(x: any, max = 10): string[] {
  if (!Array.isArray(x)) return [];
  return x.map((v) => String(v).trim()).filter(Boolean).slice(0, max);
}

function hrefFor(role: "CUSTOMER" | "DRESSMAKER", projectId: string) {
  return role === "CUSTOMER"
    ? `/dashboard/customer/projects/${projectId}`
    : `/dashboard/dressmaker/projects/${projectId}`;
}

function toPrismaJson(
  value: Prisma.JsonValue
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value === null ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
}

async function ensureDetails(projectId: string) {
  const existing = await prisma.projectDetails.findUnique({ where: { projectId } });
  if (existing) return existing;
  return prisma.projectDetails.create({
    data: {
      projectId,
      referenceImages: [],
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

async function ensureMeasurementGate(projectId: string) {
  const existing = await prisma.projectMeasurementGate.findUnique({ where: { projectId } });
  if (existing) return existing;
  return prisma.projectMeasurementGate.create({
    data: { projectId, requestedFields: [] },
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return bad("Not authenticated", 401);

  const { id: projectId } = await params;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { details: true, payment: true, projectShipping: true },
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
    if (!isAdmin && !isDressmakerParty)
      throw new Error("Only the dressmaker can do that.");
  };
  const requireCustomer = () => {
    if (!isAdmin && !isCustomerParty)
      throw new Error("Only the customer can do that.");
  };

  const now = new Date();
  const detailsUpdate: any = {};
  const projectUpdate: any = {};
  const projectTitle = project.title ?? project.projectCode;

  try {
    switch (action) {

      // ── SKETCH ──────────────────────────────────────────────────────────
      case "SUBMIT_SKETCH": {
        requireDressmaker();
        if (!details.requireSketch) throw new Error("This project does not require a sketch.");
        if (details.sketchApprovedAt) throw new Error("Sketch already approved.");

        const images = asStringArray(body.images);
        if (!images.length) throw new Error("At least one sketch image is required.");
        images.forEach((url) => {
          if (!url.startsWith(publicBase)) throw new Error("Invalid image URL.");
        });

        // Save sketch to SketchSubmission model
        await prisma.sketchSubmission.upsert({
          where: { projectId: project.id },
          update: { imageUrls: images, submittedById: userId, note: body.note ?? null },
          create: {
            projectId: project.id,
            submittedById: userId,
            imageUrls: images,
            note: body.note ?? null,
          },
        });

        detailsUpdate.sketchSubmittedAt = now;

        await notifyOtherParty({
          projectId: project.id,
          projectTitle,
          customerId: project.customerId,
          dressmakerId: project.dressmakerId,
          actorId: userId,
          title: "Sketch submitted",
          body: "The dressmaker has submitted a sketch for your approval.",
        });
        break;
      }

      case "APPROVE_SKETCH": {
        requireCustomer();
        if (!details.requireSketch) throw new Error("This project does not require a sketch.");
        if (!details.sketchSubmittedAt) throw new Error("No sketch has been submitted yet.");
        if (details.sketchApprovedAt) throw new Error("Sketch already approved.");

        detailsUpdate.sketchApprovedAt = now;

        await prisma.sketchSubmission.updateMany({
          where: { projectId: project.id },
          data: { approvedAt: now, approvedById: userId },
        });

        await notifyOtherParty({
          projectId: project.id,
          projectTitle,
          customerId: project.customerId,
          dressmakerId: project.dressmakerId,
          actorId: userId,
          title: "Sketch approved",
          body: "The customer approved the sketch. You can now begin production.",
        });
        break;
      }

      // ── MEASUREMENTS ────────────────────────────────────────────────────
      case "CONFIRM_MEASUREMENTS_CUSTOMER": {
        requireCustomer();
        if (details.measurementsConfirmedByCustomerAt) {
          throw new Error("You have already confirmed your measurements.");
        }

        // ✅ Writes to details so ProjectProgress can read it from `d`
        detailsUpdate.measurementsConfirmedByCustomerAt = now;

        await notifyOtherParty({
          projectId: project.id,
          projectTitle,
          customerId: project.customerId,
          dressmakerId: project.dressmakerId,
          actorId: userId,
          title: "Customer confirmed measurements",
          body: "The customer has confirmed their measurements are up to date.",
        });
        break;
      }

      case "CONFIRM_MEASUREMENTS_DRESSMAKER": {
        requireDressmaker();

        if (!details.measurementsConfirmedByCustomerAt) {
          throw new Error("The customer must confirm their measurements first.");
        }
        if (details.measurementsConfirmedByDressmakerAt) {
          throw new Error("Measurements are already confirmed for this project.");
        }

        // ✅ Load the customer's latest measurements to snapshot them
        const latestMeasurement = await prisma.measurement.findFirst({
          where: { customerId: project.customerId },
          orderBy: { updatedAt: "desc" },
        });

        if (!latestMeasurement) {
          throw new Error("No customer measurements found.");
        }

        const snapshotFieldsJson = toPrismaJson(latestMeasurement.fieldsJson);

        detailsUpdate.measurementsConfirmedByDressmakerAt = now;

        // ✅ Store snapshot so live changes can't affect locked measurements
        await prisma.projectMeasurementGate.upsert({
          where: { projectId: project.id },
          update: {
            dressmakerConfirmedAt: now,
            snapshotFieldsJson,
          },
          create: {
            projectId: project.id,
            requestedFields: [],
            dressmakerConfirmedAt: now,
            snapshotFieldsJson,
          },
        });

        await notifyOtherParty({
          projectId: project.id,
          projectTitle,
          customerId: project.customerId,
          dressmakerId: project.dressmakerId,
          actorId: userId,
          title: "Dressmaker confirmed measurements",
          body: "Measurements have been confirmed and locked for this project.",
        });
        break;
      }
      // ── FIT SAMPLE ──────────────────────────────────────────────────────
      case "MARK_FIT_SAMPLE_SENT": {
        requireDressmaker();
        if (!details.wantsCalico) throw new Error("This project does not require a fit sample.");
        if (details.fitSampleSentAt) throw new Error("Fit sample already marked as sent.");
        if (project.status !== ProjectStatus.IN_PROGRESS) {
          throw new Error("Project must be IN_PROGRESS to mark fit sample sent.");
        }

        detailsUpdate.fitSampleSentAt = now;
        projectUpdate.status = ProjectStatus.FIT_SAMPLE_SENT;

        await notifyOtherParty({
          projectId: project.id,
          projectTitle,
          customerId: project.customerId,
          dressmakerId: project.dressmakerId,
          actorId: userId,
          title: "Fit sample sent",
          body: "The dressmaker has sent your fit sample. Please confirm receipt.",
        });
        break;
      }

      case "CONFIRM_FIT_SAMPLE_RECEIVED": {
        requireCustomer();
        if (!details.fitSampleSentAt) throw new Error("Fit sample has not been sent yet.");
        if (details.fitSampleReceivedAt) throw new Error("Already confirmed receipt.");

        detailsUpdate.fitSampleReceivedAt = now;

        await notifyOtherParty({
          projectId: project.id,
          projectTitle,
          customerId: project.customerId,
          dressmakerId: project.dressmakerId,
          actorId: userId,
          title: "Fit sample received",
          body: "The customer confirmed they received the fit sample.",
        });
        break;
      }

      // ── FINAL ───────────────────────────────────────────────────────────
      case "SUBMIT_FINAL": {
        requireDressmaker();
        if (details.finalApprovedAt) throw new Error("Final already approved.");
        const finalImages = asStringArray(body.images);
        if (!finalImages.length) throw new Error("At least one final image is required.");
        finalImages.forEach((url) => {
          if (!url.startsWith(publicBase)) throw new Error("Invalid image URL.");
        });

        detailsUpdate.finalImages = finalImages;
        detailsUpdate.finalSubmittedAt = now;

        await notifyOtherParty({
          projectId: project.id,
          projectTitle,
          customerId: project.customerId,
          dressmakerId: project.dressmakerId,
          actorId: userId,
          title: "Final garment submitted",
          body: "The dressmaker has submitted final photos. Please review and approve.",
        });
        break;
      }

      case "APPROVE_FINAL": {
        requireCustomer();
        if (!details.finalSubmittedAt) throw new Error("Final has not been submitted yet.");
        if (details.finalApprovedAt) throw new Error("Final already approved.");

        detailsUpdate.finalApprovedAt = now;
        projectUpdate.status = ProjectStatus.READY_TO_SHIP;

        await notifyOtherParty({
          projectId: project.id,
          projectTitle,
          customerId: project.customerId,
          dressmakerId: project.dressmakerId,
          actorId: userId,
          title: "Final garment approved",
          body: "The customer approved the final garment. You can now ship.",
        });
        break;
      }

      // ── SHIPPING ────────────────────────────────────────────────────────
      case "MARK_SHIPPED": {
        requireDressmaker();
        if (project.status !== ProjectStatus.READY_TO_SHIP) {
          throw new Error("Project must be READY_TO_SHIP before marking shipped.");
        }

        const carrier = typeof body.carrier === "string" ? body.carrier.trim() : null;
        const trackingNumber =
          typeof body.trackingNumber === "string" ? body.trackingNumber.trim() : null;
        if (!trackingNumber) throw new Error("Tracking number is required.");

        projectUpdate.status = ProjectStatus.SHIPPED;

        await prisma.projectShipping.upsert({
          where: { projectId: project.id },
          update: { carrierOther: carrier, trackingNumber, shippedAt: now },
          create: {
            projectId: project.id,
            carrierOther: carrier,
            trackingNumber,
            shippedAt: now,
          },
        });

        await notifyOtherParty({
          projectId: project.id,
          projectTitle,
          customerId: project.customerId,
          dressmakerId: project.dressmakerId,
          actorId: userId,
          title: "Order shipped",
          body: `Your order has been shipped. Tracking: ${trackingNumber}`,
        });
        break;
      }

      case "MARK_COMPLETED": {
        requireCustomer();
        if (project.status !== ProjectStatus.SHIPPED) {
          throw new Error("Project must be SHIPPED before marking completed.");
        }

        projectUpdate.status = ProjectStatus.COMPLETED;
        detailsUpdate.completedAt = now;

        await notifyOtherParty({
          projectId: project.id,
          projectTitle,
          customerId: project.customerId,
          dressmakerId: project.dressmakerId,
          actorId: userId,
          title: "Project completed",
          body: "The customer marked the project as completed.",
        });
        break;
      }

      // ── CANCEL ──────────────────────────────────────────────────────────
      case "CANCEL_PROJECT": {
        const requesterRole = isAdmin ? "ADMIN" : isCustomerParty ? "CUSTOMER" : "DRESSMAKER";

        if (requesterRole === "CUSTOMER") {
          if (
            project.status === ProjectStatus.SHIPPED ||
            project.status === ProjectStatus.COMPLETED
          ) {
            throw new Error("Cannot cancel after shipment.");
          }
        }

        projectUpdate.status = ProjectStatus.CANCELED;
        detailsUpdate.canceledAt = now;
        detailsUpdate.cancelReason =
          typeof body.reason === "string" ? body.reason.trim() || null : null;

        await notifyOtherParty({
          projectId: project.id,
          projectTitle,
          customerId: project.customerId,
          dressmakerId: project.dressmakerId,
          actorId: userId,
          title: "Project canceled",
          body: detailsUpdate.cancelReason ?? "The project has been canceled.",
        });
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    const updated = await prisma.project.update({
      where: { id: project.id },
      data: {
        ...projectUpdate,
        details: {
          update: detailsUpdate,
        },
      },
      include: { details: true, payment: true, projectShipping: true },
    });

    return NextResponse.json({ ok: true, project: updated });
  } catch (e: any) {
    return bad(e?.message ?? "Workflow action failed", 400);
  }
}