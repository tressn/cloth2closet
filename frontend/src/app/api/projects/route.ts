import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { ProjectStatus } from "@prisma/client";
import { checkSuspended } from "@/lib/checkSuspended";

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function parseDateOnly(value: unknown): Date | null {
  if (typeof value !== "string" || !value) return null;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isPastDateOnly(date: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

export async function POST(req: Request) {
  console.log("=== PROJECTS ROUTE HIT ===")
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const blocked = await checkSuspended(session.user.id);
  if (blocked) return blocked;

  const body = await req.json().catch(() => ({}));

  const dressmakerProfileId = asString(body?.dressmakerProfileId);
  const title = asString(body?.title);
  const fabricNotes =
    typeof body?.fabricNotes === "string" ? body.fabricNotes.trim() : null;

  const eventDateRaw = body?.eventDate;
  const eventDate = eventDateRaw ? parseDateOnly(eventDateRaw) : null;

  const isRush = Boolean(body?.isRush);
  const wantsCalico = Boolean(body?.wantsCalico);
  const requireSketch = Boolean(body?.requireSketch);

  const shipByDateRaw = body?.shipByDate;
  const shipByDate = shipByDateRaw ? parseDateOnly(shipByDateRaw) : null;

  const colorPreferences = asString(body?.colorPreferences);
  const sizeNotes = asString(body?.sizeNotes);

const budgetCeiling =
  typeof body?.budgetCeiling === "number" && Number.isFinite(body.budgetCeiling)
    ? Math.max(0, Math.round(body.budgetCeiling))
    : null;

  if (!dressmakerProfileId) {
    return NextResponse.json({ error: "dressmakerProfileId is required" }, { status: 400 });
  }

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  if (eventDateRaw && !eventDate) {
    return NextResponse.json({ error: "Event date is invalid" }, { status: 400 });
  }

  if (eventDate && isPastDateOnly(eventDate)) {
    return NextResponse.json(
      { error: "Event date can't be in the past." },
      { status: 400 }
    );
  }

  const dm = await prisma.dressmakerProfile.findUnique({
    where: { id: dressmakerProfileId },
    select: { id: true, userId: true, isPublished: true, isPaused: true },
  });

  if (!dm) {
    return NextResponse.json({ error: "Dressmaker not found" }, { status: 404 });
  }

  if (!dm.isPublished || dm.isPaused) {
    return NextResponse.json(
      { error: "Dressmaker is not accepting requests" },
      { status: 400 }
    );
  }

  const projectCode = `P-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2, 8)
    .toUpperCase()}`;

  const intro = [
    `New quote request: ${title}`,
    `Project: ${projectCode}`,
    "",
    `Event date: ${eventDate ? eventDate.toDateString() : "Not set"}`,
    `Ship-by date: ${shipByDate ? shipByDate.toDateString() : "Not set"}`,
    `Rush: ${isRush ? "Yes" : "No"}`,
    `Calico mockup: ${wantsCalico ? "Yes" : "No"}`,
    `Sketch approval required: ${requireSketch ? "Yes" : "No"}`,
    "",
    fabricNotes ? `Customer notes:\n${fabricNotes}` : null,
    "",
    "Suggested questions:",
    "• Budget range?",
    "• Measurements + fit preferences?",
    "• Fabric choice + who sources it?",
    "• Shipping city + deadlines?",
    "• Rush fees / calico timeline?",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const project = await prisma.project.create({
      data: {
        projectCode,
        status: ProjectStatus.REQUESTED,
        title,
        customerId: session.user.id,
        dressmakerId: dm.userId,
        details: {
          create: {
            eventDate,
            shipByDate,
            fabricNotes,
            colorPreferences,
            sizeNotes,
            budgetCeiling,
            referenceImages: [],
            isRush,
            wantsCalico,
            requireSketch,
            finalImages: [],
            measurementsRequested: [],
          },
        },
      },
    });

    const convo = await prisma.conversation.create({
      data: {
        projectId: project.id,
        customerId: session.user.id,
        dressmakerId: dm.userId,
        messages: {
          create: {
            senderId: session.user.id,
            text: intro,
            attachments: [],
          },
        },
      },
    });

    await prisma.notification.create({
      data: {
        userId: dm.userId,
        type: "QUOTE_REQUESTED",
        title: "New quote request",
        body: title,
        href: `/dashboard/dressmaker/quotes`,
        projectId: project.id,
      },
    });

    return NextResponse.json({
      ok: true,
      projectId: project.id,
      conversationId: convo.id,
    });
  } catch (e: any) {
    console.error("[POST /api/projects]", e);
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}