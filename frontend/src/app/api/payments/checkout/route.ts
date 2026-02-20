import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { MilestoneType, MilestoneStatus, ProjectStatus } from "@prisma/client";

export const runtime = "nodejs";

function intEnv(name: string, fallback: number) {
  const raw = process.env[name];
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId");
  const milestoneTypeRaw = url.searchParams.get("milestoneType");

  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });
  if (milestoneTypeRaw !== "DEPOSIT" && milestoneTypeRaw !== "FINAL") {
    return NextResponse.json({ error: "milestoneType must be DEPOSIT or FINAL" }, { status: 400 });
  }

  const milestoneType = milestoneTypeRaw as MilestoneType;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      payment: true, // keep as rollup if you want
      milestones: true,
      details: true,
    },
  });

  if (!project || project.customerId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Guard: Final payment only after final approval
  if (milestoneType === "FINAL") {
    if (!project.details?.finalApprovedAt) {
      return NextResponse.json({ error: "Final must be approved before paying final amount" }, { status: 400 });
    }
  }

  // Compute deposit/final amounts.
  // Assumptions:
  // - project.quotedTotalAmount is total agreed price in cents
  // - project.depositPercent is integer percentage (e.g. 30)
  const total = project.quotedTotalAmount ?? project.payment?.totalAmount ?? null;
  if (!total || total <= 0) {
    return NextResponse.json({ error: "Missing total agreed amount (quotedTotalAmount)" }, { status: 400 });
  }

  const depositPercent = project.depositPercent ?? 0;
  if (depositPercent <= 0 || depositPercent >= 100) {
    return NextResponse.json({ error: "depositPercent must be set on project (1..99)" }, { status: 400 });
  }

  const depositAmount = Math.max(1, Math.trunc((total * depositPercent) / 100));
  const finalAmount = Math.max(1, total - depositAmount);

  const amount = milestoneType === "DEPOSIT" ? depositAmount : finalAmount;

  // Create or fetch milestone (unique per project+type)
  const milestone = await prisma.milestone.upsert({
    where: { projectId_type: { projectId: project.id, type: milestoneType } },
    update: {
      amount,
      title: milestoneType === "DEPOSIT" ? "Deposit" : "Final payment",
      status: MilestoneStatus.INVOICED,
    },
    create: {
      projectId: project.id,
      type: milestoneType,
      title: milestoneType === "DEPOSIT" ? "Deposit" : "Final payment",
      amount,
      status: MilestoneStatus.INVOICED,
    },
  });

  // Prevent double-paying a milestone
  if (milestone.status === MilestoneStatus.PAID || milestone.status === MilestoneStatus.RELEASED) {
    return NextResponse.json({ error: "This milestone is already paid" }, { status: 400 });
  }

  // Prevent creating multiple checkout sessions for the same milestone
if (milestone.status === MilestoneStatus.INVOICED && milestone.stripeCheckoutSessionId) {
  return NextResponse.json(
    { error: "Payment already initiated for this milestone. Please complete checkout." },
    { status: 400 }
  );
}

  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const currency = (project.currency || project.payment?.currency || "USD").toLowerCase();

  const checkout = await stripe.checkout.sessions.create({
    mode: "payment",
    success_url: `${appUrl}/payments/success?projectId=${project.id}&milestoneType=${milestoneType}`,
    cancel_url: `${appUrl}/payments/cancel?projectId=${project.id}&milestoneType=${milestoneType}`,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency,
          unit_amount: amount,
          product_data: {
            name:
              milestoneType === "DEPOSIT"
                ? `Deposit for ${project.title ?? `Project ${project.projectCode}`}`
                : `Final payment for ${project.title ?? `Project ${project.projectCode}`}`,
          },
        },
      },
    ],

    // VERY IMPORTANT: put identifiers on the PaymentIntent so payment_intent.* webhooks can match too
    payment_intent_data: {
      transfer_group: project.projectCode, // links transfers later :contentReference[oaicite:7]{index=7}
      metadata: {
        projectId: project.id,
        milestoneId: milestone.id,
        milestoneType,
      },
    },

    metadata: {
      projectId: project.id,
      milestoneId: milestone.id,
      milestoneType,
    },
  });
  

  await prisma.milestone.update({
    where: { id: milestone.id },
    data: {
      stripeCheckoutSessionId: checkout.id,
      status: MilestoneStatus.INVOICED,
    },
  });

  return NextResponse.redirect(checkout.url!, { status: 303 });
}
