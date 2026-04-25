/**
 * Centralized fee configuration and calculation.
 *
 * All amounts are in CENTS.  Every fee lives here so there's one place to
 * change when you adjust pricing.
 */

// ---------------------------------------------------------------------------
// Config helpers
// ---------------------------------------------------------------------------

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

// ---------------------------------------------------------------------------
// Platform fee  (what the DRESSMAKER pays — deducted from their earnings)
// ---------------------------------------------------------------------------

/** Basis points: 1000 = 10 %.  Override with PLATFORM_FEE_BPS env var. */
export function platformFeeBps(): number {
  return intEnv("PLATFORM_FEE_BPS", 1000);
}

/** Platform fee on a given amount (cents). */
export function calcPlatformFee(amountCents: number): number {
  return Math.max(0, Math.trunc((amountCents * platformFeeBps()) / 10_000));
}

// ---------------------------------------------------------------------------
// Buyer service fee  (what the BUYER pays — added to their checkout total)
// ---------------------------------------------------------------------------

/** Basis points: 500 = 5 %.  Override with BUYER_SERVICE_FEE_BPS env var. */
export function buyerServiceFeeBps(): number {
  return intEnv("BUYER_SERVICE_FEE_BPS", 500);
}

/** Buyer service fee on the milestone amount (cents). */
export function calcBuyerServiceFee(milestoneAmountCents: number): number {
  return Math.max(0, Math.trunc((milestoneAmountCents * buyerServiceFeeBps()) / 10_000));
}

// ---------------------------------------------------------------------------
// Stripe processing estimate (for display only — Stripe deducts this itself)
// ---------------------------------------------------------------------------

/** Rough Stripe processing fee so you can show "estimated Stripe cost" in
 *  admin dashboards. NOT used for charging — Stripe bills you separately. */
export function estimateStripeFee(chargeAmountCents: number): number {
  // 2.9 % + 30¢
  return Math.trunc(chargeAmountCents * 0.029) + 30;
}

// ---------------------------------------------------------------------------
// Transfer amount (what the dressmaker actually receives via Stripe Connect)
// ---------------------------------------------------------------------------

export function calcTransferAmount(milestoneAmountCents: number): {
  platformFee: number;
  transferAmount: number;
} {
  const platformFee = calcPlatformFee(milestoneAmountCents);
  const transferAmount = milestoneAmountCents - platformFee;
  return { platformFee, transferAmount };
}

// ---------------------------------------------------------------------------
// Full checkout breakdown (for display in UI)
// ---------------------------------------------------------------------------

export interface CheckoutBreakdown {
  /** What the dressmaker quoted (cents) */
  milestoneAmount: number;
  /** Buyer service fee added at checkout (cents) */
  serviceFee: number;
  /** Total the buyer pays at Stripe checkout (cents) */
  buyerTotal: number;
  /** Platform commission deducted from dressmaker (cents) */
  platformFee: number;
  /** What the dressmaker receives (cents) */
  dressmakerReceives: number;
  /** Estimated Stripe processing cost (cents, for your info) */
  estimatedStripeCost: number;
  /** Your real margin: serviceFee + platformFee - stripeCost (cents) */
  estimatedPlatformMargin: number;
}

export function calcCheckoutBreakdown(milestoneAmountCents: number): CheckoutBreakdown {
  const serviceFee = calcBuyerServiceFee(milestoneAmountCents);
  const buyerTotal = milestoneAmountCents + serviceFee;
  const platformFee = calcPlatformFee(milestoneAmountCents);
  const dressmakerReceives = milestoneAmountCents - platformFee;
  const estimatedStripeCost = estimateStripeFee(buyerTotal);
  const estimatedPlatformMargin = serviceFee + platformFee - estimatedStripeCost;

  return {
    milestoneAmount: milestoneAmountCents,
    serviceFee,
    buyerTotal,
    platformFee,
    dressmakerReceives,
    estimatedStripeCost,
    estimatedPlatformMargin,
  };
}

// ---------------------------------------------------------------------------
// Payout method derivation
// ---------------------------------------------------------------------------

/** US dressmakers → Stripe Connect.  Everyone else → Payoneer (future). */
export function derivePayoutMethod( dressmakerCountryCode: string | null | undefined ): "STRIPE" | "PAYONEER" | "PENDING" {
  if (!dressmakerCountryCode) return "PENDING";
  return "STRIPE";
}

// ---------------------------------------------------------------------------
// Tax notes (for future implementation)
// ---------------------------------------------------------------------------

/**
 * TAX STRATEGY — when to turn this on:
 *
 * 1. You become a "marketplace facilitator" once you have nexus (sales
 *    volume or physical presence) in a US state.  Most states have a
 *    $100k / 200-transaction threshold.
 *
 * 2. Custom clothing is generally TAXABLE in most US states as tangible
 *    personal property.  A few states exempt clothing (PA, NJ, MN, etc.)
 *    but only up to a price cap.
 *
 * 3. Implementation path:
 *    a. Enable Stripe Tax on your Stripe Dashboard
 *    b. Set `automatic_tax: { enabled: true }` on Checkout Sessions
 *    c. Stripe will calculate + collect tax based on buyer's address
 *    d. Stripe Tax costs 0.5% per transaction
 *    e. You remit collected tax via Stripe's tax filing tools
 *
 * 4. For MVP with low volume: you can SKIP tax collection initially.
 *    Once you cross ~$100k in any state, enable Stripe Tax.
 *
 * The checkout route below has a STRIPE_TAX_ENABLED env flag you can
 * flip when ready.  No code changes needed.
 */
export function isStripeTaxEnabled(): boolean {
  return process.env.STRIPE_TAX_ENABLED === "true";
}