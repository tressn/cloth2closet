import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: { payment: true },
  });

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (project.dressmakerId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (project.status === "CANCELED") {
    return NextResponse.json({ error: "Cannot quote a canceled project" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const quotedTotalAmount = Number(body?.quotedTotalAmount);
  const depositPercent = Number(body?.depositPercent);

  if (!Number.isFinite(quotedTotalAmount) || quotedTotalAmount <= 0) {
    return NextResponse.json(
      { error: "quotedTotalAmount must be a positive number (cents)" },
      { status: 400 }
    );
  }

  if (!Number.isFinite(depositPercent) || depositPercent < 25 || depositPercent > 75) {
    return NextResponse.json(
      { error: "depositPercent must be between 25 and 75" },
      { status: 400 }
    );
  }

  const currency =
    typeof body?.currency === "string" ? body.currency.toUpperCase() : project.currency;

  const total = Math.trunc(quotedTotalAmount);
  const pct = Math.trunc(depositPercent);
  const depositAmount = Math.max(1, Math.trunc((total * pct) / 100));

  const updated = await prisma.project.update({
    where: { id },
    data: {
      quotedTotalAmount: total,
      depositPercent: pct,
      currency,
      status: "ACCEPTED",
      payment: project.payment
        ? {
            update: {
              totalAmount: depositAmount, // deposit charged now
              currency,
              status: "REQUIRES_PAYMENT_METHOD",
            },
          }
        : {
            create: {
              totalAmount: depositAmount,
              currency,
              status: "REQUIRES_PAYMENT_METHOD",
            },
          },
    },
    include: { payment: true },
  });

  // ✅ ONE notification (use project.customerId that we already have)
  await prisma.notification.create({
    data: {
      userId: project.customerId,
      type: "QUOTE_APPROVED",
      title: "Quote approved",
      body: updated.title ?? updated.projectCode,
      href: "/dashboard/customer/quotes",
      projectId: updated.id,
    },
  });

  return NextResponse.json({
    ok: true,
    project: updated,
    depositAmount,
  });
}
