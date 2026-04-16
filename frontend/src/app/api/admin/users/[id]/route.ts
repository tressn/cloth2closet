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

  await prisma.user.update({
    where: { id },
    data: { role, status },
  });

  return Response.json({ ok: true });
}