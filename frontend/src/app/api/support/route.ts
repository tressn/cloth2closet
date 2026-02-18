import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { NotificationType } from "@prisma/client";

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return bad("Not authenticated", 401);

  const body = await req.json().catch(() => ({}));
  const category = body?.category;
  const subject = typeof body?.subject === "string" ? body.subject.trim() : "";
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const projectId = typeof body?.projectId === "string" ? body.projectId.trim() : null;

  const attachmentUrls = Array.isArray(body?.attachmentUrls)
    ? body.attachmentUrls.map((u: any) => String(u).trim()).filter(Boolean).slice(0, 5)
    : [];

  if (!subject) return bad("subject required");
  if (!message) return bad("message required");

  const allowed = new Set(["ACCOUNT_ROLE", "PAYMENTS", "DISPUTE", "TECHNICAL", "OTHER"]);
  if (!allowed.has(category)) return bad("Invalid category");

  if (projectId) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, customerId: true, dressmakerId: true },
    });
    if (!project) return bad("Project not found", 404);

    const isAdmin = session.user.role === "ADMIN";
    const isParty = project.customerId === userId || project.dressmakerId === userId;
    if (!isParty && !isAdmin) return bad("Forbidden", 403);
  }

  const ticket = await prisma.supportTicket.create({
    data: {
      userId,
      projectId: projectId || null,
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
