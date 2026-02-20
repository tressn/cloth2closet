import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { MilestoneStatus, TransferStatus } from "@prisma/client";

function intEnv(name: string, fallback: number) {
  const raw = process.env[name];
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function calcPlatformFee(amount: number) {
  const bps = intEnv("PLATFORM_FEE_BPS", 1000); // default 10%
  return Math.max(0, Math.trunc((amount * bps) / 10000));
}

/**
 * Releases payout for a milestone by creating a Stripe transfer (idempotent) and marking DB released.
 * Safe to call from cron, admin, webhook.
 */
export async function releaseMilestonePayoutOrThrow(opts: {
  milestoneId: string;
  idempotencyKey: string; // caller decides key
}) {
  const { milestoneId, idempotencyKey } = opts;

  // Load milestone + project
  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    include: { project: true, transfer: true },
  });
  if (!milestone) throw new Error("Milestone not found");

  // ✅ Idempotency guard 1: already released
  if (milestone.status === MilestoneStatus.RELEASED && milestone.releasedAt) {
    return { ok: true, skipped: true as const, reason: "already_released" };
  }

  // ✅ Must be paid
  if (milestone.status !== MilestoneStatus.PAID) {
    throw new Error(`Milestone must be PAID before release (current: ${milestone.status})`);
  }

  // ✅ Must be eligible (final delay window)
  const now = new Date();
  if (milestone.payoutEligibleAt && milestone.payoutEligibleAt > now) {
    throw new Error("Milestone is not payout-eligible yet");
  }

  // ✅ Idempotency guard 2: transfer already exists in DB
  const existing = await prisma.transfer.findUnique({
    where: { milestoneId },
    select: { stripeTransferId: true },
  });

  if (existing?.stripeTransferId) {
    // ensure milestone is marked released (in case previous run created transfer but failed after)
    await prisma.milestone.update({
      where: { id: milestoneId },
      data: { status: MilestoneStatus.RELEASED, releasedAt: milestone.releasedAt ?? new Date() },
    });
    return { ok: true, skipped: true as const, reason: "transfer_exists" };
  }

  const dressmaker = await prisma.user.findUnique({
    where: { id: milestone.project.dressmakerId },
    include: { dressmakerProfile: { include: { payoutProfile: true } } },
  });

  const payout = dressmaker?.dressmakerProfile?.payoutProfile;
  const stripeAccountId = payout?.stripeAccountId;

  if (!stripeAccountId) throw new Error("Dressmaker missing Stripe payout setup");
  if (!payout?.payoutsEnabled) throw new Error("Dressmaker Stripe payouts not enabled (KYC incomplete)");

  const fee = calcPlatformFee(milestone.amount);
  const transferAmount = milestone.amount - fee;
  if (transferAmount <= 0) throw new Error("Transfer amount <= 0 after fees");

  // ✅ Create transfer on Stripe (idempotent)
  const tr = await stripe.transfers.create(
    {
      amount: transferAmount,
      currency: milestone.project.currency.toLowerCase(),
      destination: stripeAccountId,
      transfer_group: milestone.project.projectCode,
      metadata: { projectId: milestone.projectId, milestoneId, fee: String(fee) },
    },
    { idempotencyKey }
  );

  // ✅ Write DB atomically
  await prisma.$transaction([
    prisma.transfer.upsert({
      where: { milestoneId },
      update: { stripeTransferId: tr.id, status: TransferStatus.PENDING },
      create: { milestoneId, stripeTransferId: tr.id, status: TransferStatus.PENDING },
    }),
    prisma.milestone.update({
      where: { id: milestoneId },
      data: { status: MilestoneStatus.RELEASED, releasedAt: new Date() },
    }),
  ]);

  return { ok: true, skipped: false as const, transferId: tr.id, fee, transferAmount };
}