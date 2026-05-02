import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN")
    return new Response("Forbidden", { status: 403 });

  const body = await req.json().catch(() => ({}));
  const role = body.role ?? null;
  const status = body.status;

  const roleOk =
    role === null || ["CUSTOMER", "DRESSMAKER", "ADMIN"].includes(role);
  const statusOk = ["ACTIVE", "SUSPENDED"].includes(status);

  if (!roleOk) return new Response("Invalid role", { status: 400 });
  if (!statusOk) return new Response("Invalid status", { status: 400 });

  const user = await prisma.user.update({
    where: { id },
    data: { role, status },
  });

  // ── When suspending a dressmaker, unpublish + pause their profile ──
  if (status === "SUSPENDED") {
    await prisma.dressmakerProfile.updateMany({
      where: { userId: id },
      data: { isPublished: false, isPaused: true },
    });

    await prisma.adminActionLog.create({
      data: {
        adminId: session.user.id,
        action: "SUSPEND_USER",
        entity: "User",
        entityId: id,
        meta: { role: user.role },
      },
    });
  }

  // ── Log unsuspend too ──
  if (status === "ACTIVE") {
    await prisma.adminActionLog.create({
      data: {
        adminId: session.user.id,
        action: "UNSUSPEND_USER",
        entity: "User",
        entityId: id,
        meta: { role: user.role },
      },
    });
  }

  return Response.json({ ok: true });
}