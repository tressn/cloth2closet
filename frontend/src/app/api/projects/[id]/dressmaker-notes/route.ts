import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return bad("Not authenticated", 401);

  const { id: projectId } = await params;
  const body = await req.json().catch(() => ({}));
  const notes = typeof body?.notes === "string" ? body.notes.trim() : "";

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, dressmakerId: true },
  });

  if (!project) return bad("Project not found", 404);

  const isAdmin = session.user.role === "ADMIN";
  const isOwner = project.dressmakerId === session.user.id;

  if (!isAdmin && !isOwner) return bad("Forbidden", 403);

  const updated = await prisma.projectDetails.upsert({
    where: { projectId },
    update: { dressmakerPrivateNotes: notes },
    create: {
      projectId,
      dressmakerPrivateNotes: notes,
    },
    select: {
      dressmakerPrivateNotes: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ ok: true, details: updated });
}