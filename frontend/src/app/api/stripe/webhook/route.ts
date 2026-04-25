import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { MilestoneStatus, ProjectStatus, TransferStatus } from "@prisma/client";
import { calcPlatformFee, derivePayoutMethod } from "@/lib/fees";

export const runtime = "nodejs";

function intEnv(name: string, fallback: number) {
  const raw = process.env[name];
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

// ─── Helpers ──────────────────────────────────────────────────────────

async function notifyUser(opts: {
  userId: string;
  title: string;
  body?: string | null;
  href?: string | null;
  projectId?: string | null;
}) {
  await prisma.notification.create({
    data: {
      userId: opts.userId,
      type: "PAYMENT_SUCCEEDED",
      title: opts.title,
      body: opts.body ?? null,
      href: opts.href ?? null,
      projectId: opts.projectId ?? null,
    },
  });
}

async function notifyAdmins(opts: {
  title: string;
  body?: string | null;
  href?: string | null;
  projectId?: string | null;
}) {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });
  if (admins.length === 0) return;
  await prisma.notification.createMany({
    data: admins.map((a) => ({
      userId: a.id,
      type: "PAYMENT_SUCCEEDED" as const,
      title: opts.title,
      body: opts.body ?? null,
      href: opts.href ?? null,
      projectId: opts.projectId ?? null,
    })),
  });
}

/**
 * Attempts a Stripe Connect transfer for US dressmakers.
 * For international dressmakers (Payoneer), this is skipped —
 * payouts happen via your weekly Payoneer batch.
 */
async function attemptStripeTransfer(opts: {
  milestoneId: string;
  projectId: string;
  projectCode: string;
  currency: string;
  amount: number;
  dressmakerUserId: string;
}) {
  const { milestoneId, projectId, projectCode, currency, amount, dressmakerUserId } = opts;

  // Idempotency: already transferred?
  const existing = await prisma.transfer.findUnique({
    where: { milestoneId },
    select: { stripeTransferId: true },
  });
  if (existing?.stripeTransferId) return { skipped: true };

  // Check dressmaker's payout setup
  const dressmaker = await prisma.user.findUnique({
    where: { id: dressmakerUserId },
    include: {
      dressmakerProfile: {
        include: { payoutProfile: true },
      },
    },
  });

  const countryCode = dressmaker?.dressmakerProfile?.countryCode;
  const payoutMethod = derivePayoutMethod(countryCode);

  // ── INTERNATIONAL: skip Stripe transfer, queue for Payoneer ──────
  if (payoutMethod === "PAYONEER" || payoutMethod === "PENDING") {
    // Just mark milestone as PAID (not RELEASED) — you'll release
    // via Payoneer batch later. The dressmaker sees "Payout pending"
    // in their dashboard.
    return { skipped: true, reason: "payoneer" };
  }

  // ── US: Stripe Connect transfer ──────────────────────────────────
  const stripeAccountId =
    dressmaker?.dressmakerProfile?.payoutProfile?.stripeAccountId;
  const payoutsEnabled =
    dressmaker?.dressmakerProfile?.payoutProfile?.payoutsEnabled;

  if (!stripeAccountId) throw new Error("Dressmaker missing Stripe payout setup");
  if (!payoutsEnabled) throw new Error("Dressmaker Stripe payouts not enabled");

  const fee = calcPlatformFee(amount);
  const transferAmount = amount - fee;
  if (transferAmount <= 0) throw new Error("Transfer amount <= 0 after fees");

  const tr = await stripe.transfers.create(
    {
      amount: transferAmount,
      currency: currency.toLowerCase(),
      destination: stripeAccountId,
      transfer_group: projectCode,
      metadata: { projectId, milestoneId, fee: String(fee) },
    },
    { idempotencyKey: `milestone:${milestoneId}:transfer` }
  );

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

  return { skipped: false, transferId: tr.id, fee, transferAmount };
}

// ─── Webhook handler ──────────────────────────────────────────────────

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig)
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret)
    return NextResponse.json(
      { error: "Missing STRIPE_WEBHOOK_SECRET" },
      { status: 500 }
    );

  let event: Stripe.Event;
  const rawBody = await req.text();

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${err.message}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      // ── Connect account updates ──────────────────────────────────
      case "account.updated": {
        const acct = event.data.object as Stripe.Account;

        await prisma.payoutProfile.updateMany({
          where: { stripeAccountId: acct.id },
          data: {
            payoutsEnabled: acct.payouts_enabled ?? false,
            detailsSubmitted: acct.details_submitted ?? false,
            requirementsJson: acct.requirements
              ? (acct.requirements as any)
              : undefined,
          },
        });
        break;
      }

      // ── Checkout completed (deposit or final paid) ───────────────
      case "checkout.session.completed": {
        const checkoutSession = event.data.object as Stripe.Checkout.Session;
        const stripeSessionId = checkoutSession.id;
        const paymentIntentId =
          typeof checkoutSession.payment_intent === "string"
            ? checkoutSession.payment_intent
            : null;

        const milestone = await prisma.milestone.findFirst({
          where: { stripeCheckoutSessionId: stripeSessionId },
          include: { project: true },
        });
        if (!milestone) break;

        // Idempotency: already processed
        if (
          milestone.status === MilestoneStatus.PAID ||
          milestone.status === MilestoneStatus.RELEASED
        ) {
          break;
        }

        const now = new Date();
        const finalDelayDays = intEnv("FINAL_PAYOUT_DELAY_DAYS", 7);
        const payoutEligibleAt =
          milestone.type === "DEPOSIT"
            ? now
            : new Date(
                now.getTime() + finalDelayDays * 24 * 60 * 60 * 1000
              );

        // ── Extract tax from Stripe (if tax was enabled) ───────────
        let taxAmount = 0;
        if (checkoutSession.total_details?.amount_tax) {
          taxAmount = checkoutSession.total_details.amount_tax;
        }

        // ── Mark milestone PAID ────────────────────────────────────
        await prisma.milestone.update({
          where: { id: milestone.id },
          data: {
            status: MilestoneStatus.PAID,
            stripePaymentIntentId:
              paymentIntentId ?? milestone.stripePaymentIntentId,
            paidAt: now,
            payoutEligibleAt,
            taxAmount: taxAmount || undefined,
          },
        });

        // ── Notify customer ────────────────────────────────────────
        await notifyUser({
          userId: milestone.project.customerId,
          title: `Payment confirmed`,
          body: `Your ${milestone.type.toLowerCase()} for ${milestone.project.projectCode} has been received.`,
          href: `/dashboard/customer/projects/${milestone.projectId}`,
          projectId: milestone.projectId,
        });

        // ── Deposit: advance project + attempt immediate transfer ──
        if (milestone.type === "DEPOSIT") {
          await prisma.project.update({
            where: { id: milestone.projectId },
            data: { status: ProjectStatus.IN_PROGRESS },
          });

          try {
            const result = await attemptStripeTransfer({
              milestoneId: milestone.id,
              projectId: milestone.project.id,
              projectCode: milestone.project.projectCode,
              currency: milestone.project.currency,
              amount: milestone.amount,
              dressmakerUserId: milestone.project.dressmakerId,
            });

            if (result.skipped && (result as any).reason === "payoneer") {
              // International dressmaker — notify them payout is pending
              await notifyUser({
                userId: milestone.project.dressmakerId,
                title: "Deposit received — payout processing",
                body: "Your deposit payment has been received. Payout will be processed in the next weekly batch.",
                href: `/dashboard/dressmaker/earnings`,
                projectId: milestone.projectId,
              });
            } else {
              // US dressmaker — transferred via Stripe
              await notifyUser({
                userId: milestone.project.dressmakerId,
                title: "Deposit received and paid out",
                body: `Deposit for ${milestone.project.projectCode} has been transferred to your bank.`,
                href: `/dashboard/dressmaker/earnings`,
                projectId: milestone.projectId,
              });
            }
          } catch (e: any) {
            // Don't fail the webhook — notify and let release job retry
            await notifyUser({
              userId: milestone.project.dressmakerId,
              title: "Deposit received (payout pending)",
              body: e?.message ?? "Payout setup required",
              href: `/dashboard/dressmaker/profile`,
              projectId: milestone.projectId,
            });
          }
        }

        // ── Final: do NOT transfer yet (wait for payoutEligibleAt) ─
        if (milestone.type === "FINAL") {
          await notifyUser({
            userId: milestone.project.dressmakerId,
            title: "Final payment received",
            body: `Final payment for ${milestone.project.projectCode} received. Payout will be released after the review period.`,
            href: `/dashboard/dressmaker/earnings`,
            projectId: milestone.projectId,
          });
        }

        break;
      }

      // ── Checkout expired ─────────────────────────────────────────
      case "checkout.session.expired": {
        const expiredSession = event.data.object as Stripe.Checkout.Session;

        await prisma.milestone.updateMany({
          where: {
            stripeCheckoutSessionId: expiredSession.id,
            status: MilestoneStatus.INVOICED,
          },
          data: { status: MilestoneStatus.CANCELED },
        });
        break;
      }

      // ── Refund ───────────────────────────────────────────────────
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const piId =
          typeof charge.payment_intent === "string"
            ? charge.payment_intent
            : null;
        if (!piId) break;

        const milestone = await prisma.milestone.findFirst({
          where: { stripePaymentIntentId: piId },
          include: { project: true },
        });
        if (!milestone) break;

        await prisma.milestone.update({
          where: { id: milestone.id },
          data: { status: MilestoneStatus.REFUNDED },
        });

        const title = "Payment refunded";
        const body = `A payment for ${milestone.type} was refunded for project ${milestone.project.projectCode}.`;

        await prisma.notification.createMany({
          data: [
            {
              userId: milestone.project.customerId,
              type: "PAYMENT_REFUNDED",
              title,
              body,
              href: `/dashboard/customer/projects/${milestone.projectId}`,
              projectId: milestone.projectId,
            },
            {
              userId: milestone.project.dressmakerId,
              type: "PAYMENT_REFUNDED",
              title,
              body,
              href: `/dashboard/dressmaker/projects/${milestone.projectId}`,
              projectId: milestone.projectId,
            },
          ],
        });

        await notifyAdmins({
          title,
          body: `${body} Charge: ${charge.id}`,
          href: `/dashboard/dressmaker/projects/${milestone.projectId}`,
          projectId: milestone.projectId,
        });
        break;
      }

      // ── Dispute ──────────────────────────────────────────────────
      case "charge.dispute.created": {
        const dispute = event.data.object as Stripe.Dispute;
        const chargeId =
          typeof dispute.charge === "string" ? dispute.charge : null;
        if (!chargeId) break;

        const fullCharge = await stripe.charges.retrieve(chargeId);
        const piId =
          typeof fullCharge.payment_intent === "string"
            ? fullCharge.payment_intent
            : null;
        if (!piId) break;

        const milestone = await prisma.milestone.findFirst({
          where: { stripePaymentIntentId: piId },
          include: { project: true },
        });
        if (!milestone) break;

        const title = "Dispute opened";
        const body = `A dispute was opened for ${milestone.type} on project ${milestone.project.projectCode}.`;

        await prisma.notification.createMany({
          data: [
            {
              userId: milestone.project.customerId,
              type: "DISPUTE_OPENED",
              title,
              body,
              href: `/dashboard/customer/projects/${milestone.projectId}`,
              projectId: milestone.projectId,
            },
            {
              userId: milestone.project.dressmakerId,
              type: "DISPUTE_OPENED",
              title,
              body,
              href: `/dashboard/dressmaker/projects/${milestone.projectId}`,
              projectId: milestone.projectId,
            },
          ],
        });

        await notifyAdmins({
          title,
          body: `${body} Dispute: ${dispute.id} Reason: ${dispute.reason ?? "n/a"}`,
          href: `/dashboard/dressmaker/projects/${milestone.projectId}`,
          projectId: milestone.projectId,
        });
        break;
      }

      default:
        break;
    }
  } catch (err: any) {
    console.error("[stripe-webhook]", err);
    return NextResponse.json(
      { error: `Webhook handler failed: ${err.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}