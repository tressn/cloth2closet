import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { NotificationType } from "@prisma/client";

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

function isValidEmail(email: string) {
  return /^\S+@\S+\.\S+$/.test(email);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;

  const body = await req.json().catch(() => ({}));
  const category = body?.category;

  const subject = typeof body?.subject === "string" ? body.subject.trim() : "";
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const projectId = typeof body?.projectId === "string" ? body.projectId.trim() : null;

  const emailRaw = typeof body?.email === "string" ? body.email.trim() : "";
  const requesterEmail = emailRaw || null;

  const attachmentUrls = Array.isArray(body?.attachmentUrls)
    ? body.attachmentUrls.map((u: any) => String(u).trim()).filter(Boolean).slice(0, 5)
    : [];

  if (!subject) return bad("subject required");
  const MAX_MESSAGE_LENGTH = 2000;
  const MIN_MESSAGE_LENGTH = 10;
  
  if (!message) return bad("message required");
  if (message.length < MIN_MESSAGE_LENGTH)
    return bad(`Message must be at least ${MIN_MESSAGE_LENGTH} characters.`);
  if (message.length > MAX_MESSAGE_LENGTH)
    return bad(`Message cannot exceed ${MAX_MESSAGE_LENGTH} characters.`);

  const allowed = new Set(["ACCOUNT_ROLE", "PAYMENTS", "DISPUTE", "TECHNICAL", "OTHER"]);
  if (!allowed.has(category)) return bad("Invalid category");

  // Guests must supply an email so support can reply
  if (!userId) {
    if (!requesterEmail) return bad("Email is required so support can reply.", 400);
    if (!isValidEmail(requesterEmail)) return bad("Please enter a valid email.", 400);
  }

  // ── Resolve project (user may type projectCode or internal id) ──
  let resolvedProjectId: string | null = null;

    if (projectId) {
      const project = await prisma.project.findFirst({
        where: {
          OR: [{ id: projectId }, { projectCode: projectId }],
        },
        select: { id: true, customerId: true, dressmakerId: true },
      });

      if (!project) return bad("Project not found", 404);

      if (userId) {
        const isAdmin = session?.user?.role === "ADMIN";
        const isParty = project.customerId === userId || project.dressmakerId === userId;
        if (!isParty && !isAdmin) return bad("Forbidden", 403);
      }

      resolvedProjectId = project.id;
    }

    if (attachmentUrls.length > 0) {
      if (!userId) return bad("Please sign in to attach images for security.", 401);
      if (!resolvedProjectId) return bad("Project ID is required for attachments.", 400);
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        userId,
        requesterEmail,
        projectId: resolvedProjectId,
        category,
        subject,
        message,
        attachmentUrls,
        status: "OPEN",
      },
    });

  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  if (admins.length) {
    await prisma.notification.createMany({
      data: admins.map((a) => ({
        userId: a.id,
        type: NotificationType.SUPPORT_TICKET_CREATED,
        title: "New support ticket",
        body: `${subject}${projectId ? ` (Project: ${projectId})` : ""}`,
        href: "/dashboard/admin/support",
      })),
    });
  }

  return NextResponse.json({ ok: true, ticketId: ticket.id });
}