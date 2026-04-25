import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { MilestoneType, MilestoneStatus } from "@prisma/client";
import {
  calcBuyerServiceFee,
  calcPlatformFee,
  isStripeTaxEnabled,
  derivePayoutMethod,
} from "@/lib/fees";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId");
  const milestoneTypeRaw = url.searchParams.get("milestoneType");

  if (!projectId)
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  if (milestoneTypeRaw !== "DEPOSIT" && milestoneTypeRaw !== "FINAL") {
    return NextResponse.json(
      { error: "milestoneType must be DEPOSIT or FINAL" },
      { status: 400 }
    );
  }

  const milestoneType = milestoneTypeRaw as MilestoneType;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      payment: true,
      milestones: true,
      details: true,
      dressmaker: {
        include: {
          dressmakerProfile: {
            select: { countryCode: true },
          },
        },
      },
    },
  });

  if (!project || project.customerId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // ── Guards ───────────────────────────────────────────────────────
  if (milestoneType === "FINAL") {
    if (!project.details?.finalApprovedAt) {
      return NextResponse.json(
        { error: "Final must be approved before paying final amount" },
        { status: 400 }
      );
    }
  }

  const total =
    project.quotedTotalAmount ?? project.payment?.totalAmount ?? null;
  if (!total || total <= 0) {
    return NextResponse.json(
      { error: "Missing total agreed amount (quotedTotalAmount)" },
      { status: 400 }
    );
  }

  const depositPercent = project.depositPercent ?? 0;
  if (depositPercent <= 0 || depositPercent >= 100) {
    return NextResponse.json(
      { error: "depositPercent must be set on project (1..99)" },
      { status: 400 }
    );
  }

  // ── Get or calculate milestone amount ────────────────────────────
  const existingMilestone = await prisma.milestone.findUnique({
    where: { projectId_type: { projectId: project.id, type: milestoneType } },
  });

  let milestoneAmount: number;

  if (existingMilestone && existingMilestone.amount > 0) {
    milestoneAmount = existingMilestone.amount;
  } else {
    const depositAmount = Math.max(
      1,
      Math.trunc((total * depositPercent) / 100)
    );
    const finalAmount = Math.max(1, total - depositAmount);
    milestoneAmount =
      milestoneType === "DEPOSIT" ? depositAmount : finalAmount;
  }

  // ── Fees ─────────────────────────────────────────────────────────
  const serviceFeeAmount = calcBuyerServiceFee(milestoneAmount);
  const platformFeeAmount = calcPlatformFee(milestoneAmount);

  // ── Payout method ────────────────────────────────────────────────
  const dressmakerCountry =
    project.dressmaker.dressmakerProfile?.countryCode ?? null;
  const payoutMethod = derivePayoutMethod(dressmakerCountry);

  if (
    (project as any).payoutMethod === "PENDING" ||
    !(project as any).payoutMethod
  ) {
    await prisma.project.update({
      where: { id: project.id },
      data: {
        payoutMethod,
        dressmakerCountryCode: dressmakerCountry,
      } as any,
    });
  }

  // ── Guards on existing milestone ─────────────────────────────────
  if (
    existingMilestone?.status === MilestoneStatus.PAID ||
    existingMilestone?.status === MilestoneStatus.RELEASED
  ) {
    return NextResponse.json(
      { error: "This milestone is already paid" },
      { status: 400 }
    );
  }

  if (
    existingMilestone?.status === MilestoneStatus.INVOICED &&
    existingMilestone.stripeCheckoutSessionId
  ) {
    await prisma.milestone.update({
      where: { id: existingMilestone.id },
      data: {
        stripeCheckoutSessionId: null,
        status: MilestoneStatus.PENDING,
      },
    });
  }

  // ── Milestone upsert ─────────────────────────────────────────────
  const milestone = await prisma.milestone.upsert({
    where: {
      projectId_type: { projectId: project.id, type: milestoneType },
    },
    update: {
      amount: milestoneAmount,
      serviceFeeAmount,
      platformFeeAmount,
      title: milestoneType === "DEPOSIT" ? "Deposit" : "Final payment",
      status: MilestoneStatus.INVOICED,
    },
    create: {
      projectId: project.id,
      type: milestoneType,
      title: milestoneType === "DEPOSIT" ? "Deposit" : "Final payment",
      amount: milestoneAmount,
      serviceFeeAmount,
      platformFeeAmount,
      status: MilestoneStatus.INVOICED,
    },
  });

  // ── Stripe Checkout Session ──────────────────────────────────────
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const currency = (
    project.currency ||
    project.payment?.currency ||
    "USD"
  ).toLowerCase();

  const projectLabel = project.title ?? `Project ${project.projectCode}`;

  const lineItems: any[] = [
    {
      quantity: 1,
      price_data: {
        currency,
        unit_amount: milestoneAmount,
        product_data: {
          name:
            milestoneType === "DEPOSIT"
              ? `Deposit for ${projectLabel}`
              : `Final payment for ${projectLabel}`,
          description: "Custom outfit by your dressmaker",
        },
      },
    },
    {
      quantity: 1,
      price_data: {
        currency,
        unit_amount: serviceFeeAmount,
        product_data: {
          name: "Service fee",
          description: "Marketplace service and payment protection",
        },
      },
    },
  ];

  const checkoutParams: any = {
    mode: "payment",
    success_url: `${appUrl}/dashboard/customer/projects/${project.id}?payment=success&milestoneType=${milestoneType}`,
    cancel_url: `${appUrl}/dashboard/customer/projects/${project.id}?payment=cancelled&milestoneType=${milestoneType}`,
    line_items: lineItems,

    payment_intent_data: {
      transfer_group: project.projectCode,
      metadata: {
        projectId: project.id,
        milestoneId: milestone.id,
        milestoneType,
        serviceFeeAmount: String(serviceFeeAmount),
        platformFeeAmount: String(platformFeeAmount),
      },
    },

    metadata: {
      projectId: project.id,
      milestoneId: milestone.id,
      milestoneType,
    },
  };

  if (isStripeTaxEnabled()) {
    checkoutParams.automatic_tax = { enabled: true };
  }

  const checkout = await stripe.checkout.sessions.create(checkoutParams);

  await prisma.milestone.update({
    where: { id: milestone.id },
    data: {
      stripeCheckoutSessionId: checkout.id,
      status: MilestoneStatus.INVOICED,
    },
  });

  return NextResponse.json({ url: checkout.url });
}