import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

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
    return NextResponse.json({ error: "Dressmaker profile not found" }, { status: 404 });
  }

  // Ensure payout profile exists
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
    // Create Express account :contentReference[oaicite:8]{index=8}
    const acct = await stripe.accounts.create({
      type: "express",
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
        detailsSubmitted: acct.details_submitted ?? false,
        payoutsEnabled: acct.payouts_enabled ?? false,
        requirementsJson: acct.requirements ? (acct.requirements as any) : undefined,
      },
    });
  }

  // Create onboarding link (one-time-use) :contentReference[oaicite:9]{index=9}
  const link = await stripe.accountLinks.create({
    account: stripeAccountId,
    type: "account_onboarding",
    refresh_url: `${appUrl}/dashboard/dressmaker/profile?payout=refresh`,
    return_url: `${appUrl}/dashboard/dressmaker/profile?payout=return`,
  });

  return NextResponse.redirect(link.url, { status: 303 });
}
