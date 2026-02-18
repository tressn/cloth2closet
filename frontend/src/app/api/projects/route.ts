import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { ProjectStatus } from "@prisma/client";

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  const dressmakerProfileId = asString(body?.dressmakerProfileId);
  const title = asString(body?.title);
  const fabricNotes = typeof body?.fabricNotes === "string" ? body.fabricNotes.trim() : null;

  const eventDateRaw = body?.eventDate;
  const eventDate = typeof eventDateRaw === "string" && eventDateRaw ? new Date(eventDateRaw) : null;

  const isRush = Boolean(body?.isRush);
  const wantsCalico = Boolean(body?.wantsCalico);

  if (!dressmakerProfileId) {
    return NextResponse.json({ error: "dressmakerProfileId is required" }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const dm = await prisma.dressmakerProfile.findUnique({
    where: { id: dressmakerProfileId },
    select: { id: true, userId: true, isPublished: true, isPaused: true },
  });
  if (!dm) return NextResponse.json({ error: "Dressmaker not found" }, { status: 404 });
  if (!dm.isPublished || dm.isPaused) {
    return NextResponse.json({ error: "Dressmaker is not accepting requests" }, { status: 400 });
  }

  const projectCode = `P-${Date.now()}-${Math.random().toString(16).slice(2, 8).toUpperCase()}`;

  const intro =
    [
      `New quote request: ${title}`,
      `Project: ${projectCode}`,
      "",
      `Event date: ${eventDate ? eventDate.toDateString() : "Not set"}`,
      `Rush: ${isRush ? "Yes" : "No"}`,
      `Calico mockup: ${wantsCalico ? "Yes" : "No"}`,
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
          fabricNotes,
          referenceImages: [],
          isRush,
          wantsCalico,
        },
      },
    },
  });

  const convo = await prisma.conversation.upsert({
    where: { projectId: project.id },
    update: {},
    create: {
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


  return NextResponse.json({ ok: true, projectId: project.id, conversationId: convo.id });
}
