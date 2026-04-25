import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { MilestoneStatus, TransferStatus } from "@prisma/client";
import { calcPlatformFee, derivePayoutMethod } from "@/lib/fees";

/**
 * Releases payout for a milestone.
 *
 * - US dressmakers → Stripe Connect transfer (immediate)
 * - International dressmakers → marks as RELEASED for Payoneer batch
 *
 * Safe to call from cron, admin panel, or webhook.
 */
export async function releaseMilestonePayoutOrThrow(opts: {
  milestoneId: string;
  idempotencyKey: string;
}) {
  const { milestoneId, idempotencyKey } = opts;

  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    include: { project: true, transfer: true },
  });

  if (!milestone) throw new Error("Milestone not found");

  // Already released
  if (milestone.status === MilestoneStatus.RELEASED && milestone.releasedAt) {
    return { ok: true, skipped: true as const, reason: "already_released" };
  }

  // Must be paid
  if (milestone.status !== MilestoneStatus.PAID) {
    throw new Error(
      `Milestone must be PAID before release (current: ${milestone.status})`
    );
  }

  // Must be eligible (final delay window)
  const now = new Date();
  if (milestone.payoutEligibleAt && milestone.payoutEligibleAt > now) {
    throw new Error("Milestone is not payout-eligible yet");
  }

  // Transfer already exists
  const existing = await prisma.transfer.findUnique({
    where: { milestoneId },
    select: { stripeTransferId: true },
  });

  if (existing?.stripeTransferId) {
    await prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        status: MilestoneStatus.RELEASED,
        releasedAt: milestone.releasedAt ?? new Date(),
      },
    });
    return { ok: true, skipped: true as const, reason: "transfer_exists" };
  }

  // ── Load dressmaker and determine payout method ──────────────────
  const dressmaker = await prisma.user.findUnique({
    where: { id: milestone.project.dressmakerId },
    include: {
      dressmakerProfile: {
        include: { payoutProfile: true },
      },
    },
  });

  const countryCode = dressmaker?.dressmakerProfile?.countryCode;
  const payoutMethod = derivePayoutMethod(countryCode);

  // ── INTERNATIONAL: mark as released for Payoneer batch ───────────
  if (payoutMethod === "PAYONEER" || payoutMethod === "PENDING") {
    const fee = calcPlatformFee(milestone.amount);
    const transferAmount = milestone.amount - fee;

    await prisma.$transaction([
      // Create a transfer record WITHOUT stripeTransferId
      // This marks it as "released, pending Payoneer payout"
      prisma.transfer.upsert({
        where: { milestoneId },
        update: { status: TransferStatus.PENDING },
        create: {
          milestoneId,
          status: TransferStatus.PENDING,
          // stripeTransferId is null — signals Payoneer payout
        },
      }),
      prisma.milestone.update({
        where: { id: milestoneId },
        data: {
          status: MilestoneStatus.RELEASED,
          releasedAt: new Date(),
          platformFeeAmount: fee,
        },
      }),
    ]);

    return {
      ok: true,
      skipped: false as const,
      method: "payoneer" as const,
      fee,
      transferAmount,
    };
  }

  // ── US: Stripe Connect transfer ──────────────────────────────────
  const payout = dressmaker?.dressmakerProfile?.payoutProfile;
  const stripeAccountId = payout?.stripeAccountId;

  if (!stripeAccountId)
    throw new Error("Dressmaker missing Stripe payout setup");
  if (!payout?.payoutsEnabled)
    throw new Error("Dressmaker Stripe payouts not enabled (KYC incomplete)");

  const fee = calcPlatformFee(milestone.amount);
  const transferAmount = milestone.amount - fee;
  if (transferAmount <= 0)
    throw new Error("Transfer amount <= 0 after fees");

  const tr = await stripe.transfers.create(
    {
      amount: transferAmount,
      currency: milestone.project.currency.toLowerCase(),
      destination: stripeAccountId,
      transfer_group: milestone.project.projectCode,
      metadata: {
        projectId: milestone.projectId,
        milestoneId,
        fee: String(fee),
      },
    },
    { idempotencyKey }
  );

  await prisma.$transaction([
    prisma.transfer.upsert({
      where: { milestoneId },
      update: {
        stripeTransferId: tr.id,
        status: TransferStatus.PENDING,
      },
      create: {
        milestoneId,
        stripeTransferId: tr.id,
        status: TransferStatus.PENDING,
      },
    }),
    prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        status: MilestoneStatus.RELEASED,
        releasedAt: new Date(),
        platformFeeAmount: fee,
      },
    }),
  ]);

  return {
    ok: true,
    skipped: false as const,
    method: "stripe" as const,
    transferId: tr.id,
    fee,
    transferAmount,
  };
}

/**
 * Query all milestones that are PAID, past their payoutEligibleAt date,
 * and not yet released. Used by the cron job / admin release-due route.
 */
export async function findReleasableMilestones() {
  return prisma.milestone.findMany({
    where: {
      status: MilestoneStatus.PAID,
      payoutEligibleAt: { lte: new Date() },
      transfer: null,
    },
    include: {
      project: {
        select: {
          id: true,
          projectCode: true,
          currency: true,
          dressmakerId: true,
        },
      },
    },
    orderBy: { payoutEligibleAt: "asc" },
  });
}