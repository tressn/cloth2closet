import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { MilestoneStatus, ProjectStatus, TransferStatus } from "@prisma/client";

export const runtime = "nodejs";

function intEnv(name: string, fallback: number) {
  const raw = process.env[name];
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function calcPlatformFee(amount: number) {
  const bps = intEnv("PLATFORM_FEE_BPS", 1000); // default 10%
  return Math.max(0, Math.trunc((amount * bps) / 10000));
}

async function notifyAdmins(opts: { title: string; body?: string | null; href?: string | null; projectId?: string | null }) {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });

  if (admins.length === 0) return;

  await prisma.notification.createMany({
    data: admins.map((a) => ({
      userId: a.id,
      type: "PAYMENT_SUCCEEDED", // reuse existing enum; see note below
      title: opts.title,
      body: opts.body ?? null,
      href: opts.href ?? null,
      projectId: opts.projectId ?? null,
    })),
  });
}

async function createStripeTransferOrThrow(opts: {
  milestoneId: string;
  projectId: string;
  projectCode: string;
  currency: string;
  amount: number;
  dressmakerUserId: string;
}) {
  const { milestoneId, projectId, projectCode, currency, amount, dressmakerUserId } = opts;

  // ✅ Idempotency guard: if transfer already exists for this milestone, do nothing
  const existing = await prisma.transfer.findUnique({
    where: { milestoneId },
    select: { id: true, stripeTransferId: true, status: true },
  });

  if (existing?.stripeTransferId) {
    // already created a transfer in Stripe
    return { transferId: existing.stripeTransferId, fee: 0, transferAmount: 0, skipped: true as const };
  }

  const dressmaker = await prisma.user.findUnique({
    where: { id: dressmakerUserId },
    include: { dressmakerProfile: { include: { payoutProfile: true } } },
  });

  const stripeAccountId = dressmaker?.dressmakerProfile?.payoutProfile?.stripeAccountId;
  const payoutsEnabled = dressmaker?.dressmakerProfile?.payoutProfile?.payoutsEnabled;

  if (!stripeAccountId) throw new Error("Dressmaker missing Stripe payout setup");
  if (!payoutsEnabled) throw new Error("Dressmaker Stripe payouts not enabled (KYC incomplete)");

  const fee = calcPlatformFee(amount);
  const transferAmount = amount - fee;
  if (transferAmount <= 0) throw new Error("Transfer amount <= 0 after fees");

  // ✅ Create transfer on Stripe
  const tr = await stripe.transfers.create({
    amount: transferAmount,
    currency: currency.toLowerCase(),
    destination: stripeAccountId,
    transfer_group: projectCode,
    metadata: { projectId, milestoneId, fee: String(fee) },
  }, 
  { idempotencyKey: `milestone:${milestoneId}:transfer` }
  );

  // ✅ Write DB in a transaction
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

  return { transferId: tr.id, fee, transferAmount, skipped: false as const };
}


export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });

  let event: Stripe.Event;
  const rawBody = await req.text(); // Stripe requires raw body :contentReference[oaicite:11]{index=11}

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook signature verification failed: ${err.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "account.updated": {
        const acct = event.data.object as Stripe.Account;

        await prisma.payoutProfile.updateMany({
          where: { stripeAccountId: acct.id },
          data: {
            payoutsEnabled: acct.payouts_enabled ?? false,
            detailsSubmitted: acct.details_submitted ?? false,
            requirementsJson: acct.requirements ? (acct.requirements as any) : undefined,
          },
        });

        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const stripeSessionId = session.id;
        const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : null;

        const milestone = await prisma.milestone.findFirst({
          where: { stripeCheckoutSessionId: stripeSessionId },
          include: { project: true },
        });
        if (!milestone) break;

        const now = new Date();
        const finalDelayDays = intEnv("FINAL_PAYOUT_DELAY_DAYS", 7);
        const payoutEligibleAt =
          milestone.type === "DEPOSIT"
            ? now
            : new Date(now.getTime() + finalDelayDays * 24 * 60 * 60 * 1000);

        // Mark milestone PAID
        // ✅ Idempotency guard: if already PAID/RELEASED, don't redo work
        if (milestone.status === MilestoneStatus.PAID || milestone.status === MilestoneStatus.RELEASED) {
          break;
        }

        // Mark milestone PAID
        await prisma.milestone.update({
          where: { id: milestone.id },
          data: {
            status: MilestoneStatus.PAID,
            stripePaymentIntentId: paymentIntentId ?? milestone.stripePaymentIntentId,
            paidAt: now,
            payoutEligibleAt,
          },
        });

        // Deposit: move project IN_PROGRESS and pay out immediately
        if (milestone.type === "DEPOSIT") {
          await prisma.project.update({
            where: { id: milestone.projectId },
            data: { status: ProjectStatus.IN_PROGRESS },
          });

          // Create transfer now (immediate deposit payout)
          try {
            await createStripeTransferOrThrow({
              milestoneId: milestone.id,
              projectId: milestone.project.id,
              projectCode: milestone.project.projectCode,
              currency: milestone.project.currency,
              amount: milestone.amount,
              dressmakerUserId: milestone.project.dressmakerId,
            });
          } catch (e: any) {
            // Don’t fail webhook if payout fails; log + notify dressmaker/admin
            // Stripe will retry the whole webhook otherwise; safer to capture state and let your release job retry.
            await prisma.notification.create({
              data: {
                userId: milestone.project.dressmakerId,
                type: "PAYMENT_SUCCEEDED",
                title: "Deposit received (payout pending)",
                body: e?.message ?? "Payout setup required",
                href: `/dashboard/dressmaker/profile`,
                projectId: milestone.project.id,
              },
            });
          }
        }

        // Final: do NOT transfer here (wait for payoutEligibleAt + release job)
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;

        await prisma.milestone.updateMany({
          where: { stripeCheckoutSessionId: session.id, status: MilestoneStatus.INVOICED},
          data: { status: MilestoneStatus.CANCELED },
        });

        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;

        const paymentIntentId =
          typeof charge.payment_intent === "string" ? charge.payment_intent : null;

        if (!paymentIntentId) break;

        const milestone = await prisma.milestone.findFirst({
          where: { stripePaymentIntentId: paymentIntentId },
          include: { project: true },
        });

        if (!milestone) break;

        // Mark milestone canceled/refunded in your DB
        await prisma.milestone.update({
          where: { id: milestone.id },
          data: {
            status: MilestoneStatus.REFUNDED,
            // You can also store refundedAt if you add a field later
          },
        });

        const title = "Payment refunded";
        const body = `A payment for ${milestone.type} was refunded for project ${milestone.project.projectCode}.`;

        // Notify customer + dressmaker
        await prisma.notification.createMany({
          data: [
            {
              userId: milestone.project.customerId,
              type: "PAYMENT_SUCCEEDED",
              title,
              body,
              href: `/dashboard/customer/projects/${milestone.projectId}`,
              projectId: milestone.projectId,
            },
            {
              userId: milestone.project.dressmakerId,
              type: "PAYMENT_SUCCEEDED",
              title,
              body,
              href: `/dashboard/dressmaker/projects/${milestone.projectId}`,
              projectId: milestone.projectId,
            },
          ],
        });

        // Notify admins
        await notifyAdmins({
          title,
          body: `${body} Charge: ${charge.id}`,
          href: `/dashboard/dressmaker/projects/${milestone.projectId}`,
          projectId: milestone.projectId,
        });

        break;
      }

      case "charge.dispute.created": {
        const dispute = event.data.object as Stripe.Dispute;

        const chargeId = typeof dispute.charge === "string" ? dispute.charge : null;
        if (!chargeId) break;

        // Retrieve charge so we can find payment_intent -> milestone
        const charge = await stripe.charges.retrieve(chargeId);

        const paymentIntentId =
          typeof charge.payment_intent === "string" ? charge.payment_intent : null;

        if (!paymentIntentId) break;

        const milestone = await prisma.milestone.findFirst({
          where: { stripePaymentIntentId: paymentIntentId },
          include: { project: true },
        });

        if (!milestone) break;

        const title = "Dispute opened";
        const body = `A dispute was opened for ${milestone.type} on project ${milestone.project.projectCode}.`;

        // Notify customer + dressmaker
        await prisma.notification.createMany({
          data: [
            {
              userId: milestone.project.customerId,
              type: "PAYMENT_SUCCEEDED",
              title,
              body,
              href: `/dashboard/customer/projects/${milestone.projectId}`,
              projectId: milestone.projectId,
            },
            {
              userId: milestone.project.dressmakerId,
              type: "PAYMENT_SUCCEEDED",
              title,
              body,
              href: `/dashboard/dressmaker/projects/${milestone.projectId}`,
              projectId: milestone.projectId,
            },
          ],
        });

        // Notify admins (include dispute id + reason/status)
        await notifyAdmins({
          title,
          body: `${body} Dispute: ${dispute.id} Status: ${dispute.status} Reason: ${dispute.reason ?? "n/a"}`,
          href: `/dashboard/dressmaker/projects/${milestone.projectId}`,
          projectId: milestone.projectId,
        });

        break;
      }

      default:
        break;
    }
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook handler failed: ${err.message}` }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
