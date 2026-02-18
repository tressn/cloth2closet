import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

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

function asStringArray(x: any): string[] {
  if (!Array.isArray(x)) return [];
  return x.map((v) => String(v).trim()).filter(Boolean).slice(0, 25);
}

async function ensureDetails(projectId: string) {
  const existing = await prisma.projectDetails.findUnique({ where: { projectId } });
  if (existing) return existing;

  // IMPORTANT: arrays in your schema are required; initialize them.
  return prisma.projectDetails.create({
    data: {
      projectId,
      referenceImages: [],
      sketchImage: [],
      measurementsRequested: [],
      finalImages: [],
      isRush: false,
      wantsCalico: false,
    },
  });
}

function canCancel(status: ProjectStatus, requester: "CUSTOMER" | "DRESSMAKER" | "ADMIN") {
  // You requested: customer can't cancel after shipping.
  if (requester === "CUSTOMER") {
    return status !== "SHIPPED" && status !== "COMPLETED";
  }
  // Dressmaker/admin can cancel at any time (you can tighten later).
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

  const role = (session.user.role ?? null) as "CUSTOMER" | "DRESSMAKER" | "ADMIN" | null;

  const isAdmin = role === "ADMIN";
  const isCustomerParty = project.customerId === userId;
  const isDressmakerParty = project.dressmakerId === userId;

  if (!isAdmin && !isCustomerParty && !isDressmakerParty) {
    return bad("Forbidden", 403);
  }

  const body = await req.json().catch(() => ({}));
  const action = body?.action as Action;

  if (!action) return bad("action is required");

  const details = project.details ?? (await ensureDetails(project.id));

  // Helpers: role checks
  const requireDressmaker = () => {
    if (!isAdmin && !isDressmakerParty) throw new Error("Only the dressmaker can do that.");
  };
  const requireCustomer = () => {
    if (!isAdmin && !isCustomerParty) throw new Error("Only the customer can do that.");
  };

  // We’ll update details + sometimes project.status.
  const detailsUpdate: any = {};
  const projectUpdate: any = {};

  try {
    switch (action) {
      // -----------------------------
      // Sketch gate
      // -----------------------------
      case "SUBMIT_SKETCH": {
        requireDressmaker();

        const images = asStringArray(body?.imageUrls);
        if (images.length === 0) throw new Error("Provide at least one sketch imageUrl.");

        detailsUpdate.sketchImage = images; // you named it sketchImage in schema
        detailsUpdate.sketchSubmittedAt = new Date();

        // Optional: if you want sketch to be required only sometimes
        // detailsUpdate.requireSketch = true;

        // No status change necessary—this is a gate inside REQUESTED/ACCEPTED/IN_PROGRESS
        break;
      }

      case "APPROVE_SKETCH": {
        requireCustomer();

        if (!details.sketchSubmittedAt) throw new Error("No sketch submitted yet.");
        detailsUpdate.sketchApprovedAt = new Date();
        break;
      }

      // -----------------------------
      // Measurements gate
      // -----------------------------
      case "REQUEST_MEASUREMENTS": {
        requireDressmaker();

        const requested = asStringArray(body?.requestedFields);
        if (requested.length === 0) throw new Error("Provide requestedFields (at least one).");

        detailsUpdate.measurementsRequested = requested;
        // reset confirmations when requested list changes
        detailsUpdate.measurementsConfirmedByDressmakerAt = null;
        detailsUpdate.measurementsConfirmedByCustomerAt = null;
        break;
      }

      case "CONFIRM_MEASUREMENTS_DRESSMAKER": {
        requireDressmaker();
        detailsUpdate.measurementsConfirmedByDressmakerAt = new Date();

        // If both confirmed, push to IN_PROGRESS (only if quote accepted)
        const customerConfirmed = details.measurementsConfirmedByCustomerAt;
        if (customerConfirmed && project.status === "ACCEPTED") {
          projectUpdate.status = "IN_PROGRESS";
        }
        break;
      }

      case "CONFIRM_MEASUREMENTS_CUSTOMER": {
        requireCustomer();
        detailsUpdate.measurementsConfirmedByCustomerAt = new Date();

        const dressmakerConfirmed = details.measurementsConfirmedByDressmakerAt;
        if (dressmakerConfirmed && project.status === "ACCEPTED") {
          projectUpdate.status = "IN_PROGRESS";
        }
        break;
      }

      // -----------------------------
      // Fit sample (calico) gate
      // -----------------------------
      case "MARK_FIT_SAMPLE_SENT": {
        requireDressmaker();
        if (!details.wantsCalico) throw new Error("This project is not marked for calico/fit sample.");

        detailsUpdate.fitSampleSentAt = new Date();
        // Status can move to FIT_SAMPLE_SENT once dressmaker indicates sent
        projectUpdate.status = "FIT_SAMPLE_SENT";
        break;
      }

      case "CONFIRM_FIT_SAMPLE_RECEIVED": {
        requireCustomer();
        if (!details.wantsCalico) throw new Error("This project is not marked for calico/fit sample.");
        if (!details.fitSampleSentAt) throw new Error("Fit sample hasn't been marked as sent yet.");

        detailsUpdate.fitSampleReceivedAt = new Date();
        // After customer confirms, project is active work
        projectUpdate.status = "IN_PROGRESS";
        break;
      }

      // -----------------------------
      // Final approval gate
      // -----------------------------
      case "SUBMIT_FINAL": {
        requireDressmaker();

        const images = asStringArray(body?.imageUrls);
        if (images.length === 0) throw new Error("Provide at least one final imageUrl.");

        detailsUpdate.finalImages = images;
        detailsUpdate.finalSubmittedAt = new Date();
        // No immediate status change; customer must approve
        break;
      }

      case "APPROVE_FINAL": {
        requireCustomer();
        if (!details.finalSubmittedAt) throw new Error("No final images submitted yet.");

        detailsUpdate.finalApprovedAt = new Date();
        projectUpdate.status = "READY_TO_SHIP";
        break;
      }

      // -----------------------------
      // Shipping & completion
      // -----------------------------
      case "MARK_SHIPPED": {
        requireDressmaker();

        const trackingNumber = isNonEmptyString(body?.trackingNumber) ? body.trackingNumber.trim() : "";
        const carrier = isNonEmptyString(body?.carrier) ? body.carrier.trim() : null;

        if (!trackingNumber) throw new Error("trackingNumber is required.");

        detailsUpdate.shippingTrackingNumber = trackingNumber;
        detailsUpdate.shippingCarrier = carrier;
        detailsUpdate.shippedAt = new Date();

        projectUpdate.status = "SHIPPED";
        break;
      }

      case "MARK_COMPLETED": {
        requireCustomer();

        if (project.status !== "SHIPPED") throw new Error("Project must be SHIPPED first.");
        if (!details.shippedAt) throw new Error("Missing shippedAt.");

        // Optional: enforce 14-day window
        const shippedAt = new Date(details.shippedAt);
        const now = new Date();
        const days = Math.floor((now.getTime() - shippedAt.getTime()) / (1000 * 60 * 60 * 24));
        if (days > 14) {
          throw new Error("Completion window expired (more than 14 days since shipped). Contact support.");
        }

        detailsUpdate.completedAt = new Date();
        projectUpdate.status = "COMPLETED";
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

        detailsUpdate.canceledAt = new Date();
        detailsUpdate.cancelReason = reason;
        projectUpdate.status = "CANCELED";
        break;
      }

      default:
        return bad("Unknown action", 400);
    }

    // Persist changes
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
    return bad(e?.message ?? "Failed", 400);
  }
}
