import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { derivePayoutMethod } from "@/lib/fees";

export const runtime = "nodejs";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (session.user.role !== "DRESSMAKER" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const appUrl = process.env.APP_URL || "http://localhost:3000";

  const dressmakerProfile = await prisma.dressmakerProfile.findUnique({
    where: { userId: session.user.id },
    include: { payoutProfile: true },
  });

  if (!dressmakerProfile) {
    return NextResponse.json(
      { error: "Dressmaker profile not found" },
      { status: 404 }
    );
  }

  // ── Route by country ─────────────────────────────────────────────
  const payoutMethod = derivePayoutMethod(dressmakerProfile.countryCode);

  // ── INTERNATIONAL: Payoneer path ─────────────────────────────────
  // For non-US dressmakers, we don't create a Stripe Express account.
  // Instead we store their Payoneer details and pay them via batch.
  if (payoutMethod === "PAYONEER") {
    // Ensure payout profile exists with PAYONEER provider
    const payoutProfile =
      dressmakerProfile.payoutProfile ??
      (await prisma.payoutProfile.create({
        data: {
          dressmakerProfileId: dressmakerProfile.id,
          provider: "PAYONEER",
        },
      }));

    // If they already have a provider set to STRIPE, update it
    if (payoutProfile.provider === "STRIPE" && !payoutProfile.stripeAccountId) {
      await prisma.payoutProfile.update({
        where: { id: payoutProfile.id },
        data: { provider: "PAYONEER" },
      });
    }

    // For now, redirect to a page that tells them to set up Payoneer.
    // When you integrate the Payoneer Mass Payout API, you'll redirect
    // them to Payoneer's hosted registration page instead.
    return NextResponse.json({
      redirect: `${appUrl}/dashboard/dressmaker/profile?payout=payoneer-setup`,
      payoutMethod: "PAYONEER",
      message:
        "International dressmakers receive payouts via Payoneer. " +
        "Please ensure you have a Payoneer account. " +
        "We process international payouts weekly on Mondays.",
    });
  }

  // ── NO COUNTRY SET ───────────────────────────────────────────────
  if (payoutMethod === "PENDING") {
    return NextResponse.json(
      {
        error:
          "Please set your country in your profile before setting up payouts.",
        redirect: `${appUrl}/dashboard/dressmaker/profile`,
      },
      { status: 400 }
    );
  }

  // ── US: Stripe Connect Express path ──────────────────────────────
  const payoutProfile =
    dressmakerProfile.payoutProfile ??
    (await prisma.payoutProfile.create({
      data: {
        dressmakerProfileId: dressmakerProfile.id,
        provider: "STRIPE",
      },
    }));

  let stripeAccountId = payoutProfile.stripeAccountId;

  if (!stripeAccountId) {
    // Create Express account for US dressmaker
    const acct = await stripe.accounts.create({
      type: "express",
      country: "US",
      metadata: {
        userId: session.user.id,
        dressmakerProfileId: dressmakerProfile.id,
      },
    });

    stripeAccountId = acct.id;

    await prisma.payoutProfile.update({
      where: { id: payoutProfile.id },
      data: {
        stripeAccountId,
        provider: "STRIPE",
        detailsSubmitted: acct.details_submitted ?? false,
        payoutsEnabled: acct.payouts_enabled ?? false,
        requirementsJson: acct.requirements
          ? (acct.requirements as any)
          : undefined,
      },
    });
  }

  // Create onboarding link
  const link = await stripe.accountLinks.create({
    account: stripeAccountId,
    type: "account_onboarding",
    refresh_url: `${appUrl}/dashboard/dressmaker/profile?payout=refresh`,
    return_url: `${appUrl}/dashboard/dressmaker/profile?payout=return`,
  });

  return NextResponse.json({ url: link.url });
}