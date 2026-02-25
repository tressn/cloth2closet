import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/requiredRole";

export const revalidate = 3600;

export async function GET() {
  const carriers = await prisma.shippingCarrier.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });

  return NextResponse.json([
    ...carriers.map((c) => ({ value: c.id, label: c.name })),
    { value: "OTHER", label: "Other (not listed)" },
  ]);
}

/**
 * Logged-in users can request a new carrier.
 * Body: { name: string }
 */
export async function POST(req: Request) {
  // requireUser() may throw a redirect() response; catch and convert to 401 JSON
  let user: { id: string; email?: string | null; role?: string | null };
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const name = (body?.name ?? "").trim();

  if (!name || name.length < 2) {
    return NextResponse.json({ error: "Carrier name is required." }, { status: 400 });
  }

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });

  if (admins.length) {
    await prisma.notification.createMany({
      data: admins.map((a) => ({
        userId: a.id,
        type: "PROJECT_UPDATE",
        title: "New shipping carrier requested",
        body: `Requested carrier: ${name}\nRequested by: ${user.email ?? user.id}`,
        href: `/dashboard/admin/support`,
      })),
    });
  }

  // Optional tracking ticket (recommended)
  await prisma.supportTicket.create({
    data: {
      userId: user.id,
      category: "OTHER",
      subject: "Shipping carrier request",
      message: `Requested carrier: ${name}`,
      attachmentUrls: [],
      status: "OPEN",
    },
  });

  return NextResponse.json({ ok: true });
}