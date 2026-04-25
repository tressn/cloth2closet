import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/app/dashboard/DashboardShell";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatMoney } from "@/lib/money";
import { platformFeeBps, buyerServiceFeeBps } from "@/lib/fees";
import Link from "next/link";

type BadgeTone = "success" | "featured" | "neutral" | "danger";

function payoutBadge(
  milestoneStatus: string,
  transferStatus: string | null
): { label: string; tone: BadgeTone } {
  if (milestoneStatus === "RELEASED" || transferStatus === "PAID_OUT") {
    return { label: "Paid out", tone: "success" };
  }
  if (milestoneStatus === "PAID" && !transferStatus) {
    return { label: "Payout pending", tone: "featured" };
  }
  if (transferStatus === "PENDING") {
    return { label: "Transferring", tone: "featured" };
  }
  if (milestoneStatus === "REFUNDED") {
    return { label: "Refunded", tone: "danger" };
  }
  if (milestoneStatus === "CANCELED") {
    return { label: "Canceled", tone: "neutral" };
  }
  return { label: milestoneStatus, tone: "neutral" };
}

export default async function DressmakerEarningsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "DRESSMAKER" && session.user.role !== "ADMIN")
    redirect("/");

  const profile = await prisma.dressmakerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, countryCode: true },
  });

  if (!profile) redirect("/become-dressmaker");

  const milestones = await prisma.milestone.findMany({
    where: {
      project: { dressmakerId: session.user.id },
      status: { in: ["PAID", "RELEASED", "REFUNDED"] },
    },
    include: {
      project: {
        select: {
          id: true,
          projectCode: true,
          title: true,
          currency: true,
          customer: {
            select: { name: true, username: true },
          },
        },
      },
      transfer: {
        select: { status: true, stripeTransferId: true },
      },
    },
    orderBy: { paidAt: "desc" },
  });

  const feeBps = platformFeeBps();
  const buyerFeeBps = buyerServiceFeeBps();

  let totalEarned = 0;
  let totalCommission = 0;
  let totalPaidOut = 0;
  let totalPending = 0;

  const rows = milestones.map((m) => {
    const commission =
      m.platformFeeAmount ?? Math.trunc((m.amount * feeBps) / 10_000);
    const dressmakerEarns = m.amount - commission;
    const isPaidOut =
      m.status === "RELEASED" || m.transfer?.status === "PAID_OUT";
    const isPending = m.status === "PAID" && !isPaidOut;

    totalEarned += m.amount;
    totalCommission += commission;
    if (isPaidOut) totalPaidOut += dressmakerEarns;
    if (isPending) totalPending += dressmakerEarns;

    const badge = payoutBadge(m.status, m.transfer?.status ?? null);
    const customerName =
      m.project.customer.name ?? m.project.customer.username ?? "Customer";

    return {
      id: m.id,
      projectId: m.project.id,
      projectCode: m.project.projectCode,
      projectTitle: m.project.title,
      customerName,
      type: m.type,
      amount: m.amount,
      commission,
      dressmakerEarns,
      currency: m.project.currency,
      paidAt: m.paidAt,
      badge,
    };
  });

  const isInternational = profile.countryCode && profile.countryCode !== "US";

  return (
    <DashboardShell
      title="Earnings"
      subtitle={`cloth2closet's commission rate: ${feeBps / 100}%` }
      tabs={[
        { label: "Overview", href: "/dashboard/dressmaker/earnings" },
        { label: "Profile", href: "/dashboard/dressmaker/profile" },
      ]}
    >
      <div className="max-w-5xl space-y-6">
        {/* ── Summary cards ─────────────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Total project value",
              value: formatMoney(totalEarned, "USD"),
              sub: `across ${milestones.length} payments`,
            },
            {
              label: "Paid out",
              value: formatMoney(totalPaidOut, "USD"),
              sub: "transferred to your bank",
            },
            {
              label: "Pending payout",
              value: formatMoney(totalPending, "USD"),
              sub: isInternational
                ? "next weekly Payoneer batch"
                : "processing via Stripe",
            },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4"
            >
              <div className="text-[12px] uppercase tracking-wide text-[var(--muted)]">
                {card.label}
              </div>
              <div className="mt-1 text-[22px] font-semibold text-[var(--text)]">
                {card.value}
              </div>
              <div className="mt-1 text-[12px] text-[var(--muted)]">
                {card.sub}
              </div>
            </div>
          ))}
        </div>

        {/* ── How fees work ─────────────────────────────────────── */}
        <Card>
          <CardHeader
            title="How your earnings work"
            subtitle="Simple and transparent — you always know what you take home."
          />
          <CardBody className="space-y-3 text-[14px] text-[var(--muted)]">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-2">
              <div className="text-[13px] leading-6">
                <span className="font-semibold text-[var(--text)]">
                  You set your price.
                </span>{" "}
                When you quote $500 for an outfit, you receive{" "}
                <span className="font-semibold text-[var(--text)]">
                  {formatMoney(
                    500_00 - Math.trunc((500_00 * feeBps) / 10_000),
                    "USD"
                  )}
                </span>{" "}
                ({100 - feeBps / 100}% of your quoted price).
              </div>
              <div className="text-[13px] leading-6">
                <span className="font-semibold text-[var(--text)]">
                  The buyer pays a separate {buyerFeeBps / 100}% service fee
                </span>{" "}
                on top of your price. This covers payment processing and
                platform protection. It does not come out of your earnings.
              </div>
              <div className="text-[13px] leading-6">
                <span className="font-semibold text-[var(--text)]">
                  Payouts
                </span>{" "}
                  <>
                    arrive in your bank account within 2 business days via
                    Stripe.
                  </>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* ── Transaction history ──────────────────────────────── */}
        <Card>
          <CardHeader
            title="Payment history"
            subtitle="Every payment received, with commission and payout status."
          />
          <CardBody>
            {rows.length === 0 ? (
              <div className="py-8 text-center text-[14px] text-[var(--muted)]">
                No payments received yet. Earnings will appear here once a
                customer pays a deposit or final payment.
              </div>
            ) : (
              <div className="space-y-3">
                {rows.map((row) => (
                  <Link
                    key={row.id}
                    href={`/dashboard/dressmaker/projects/${row.projectId}`}
                    className="block rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 transition-colors hover:bg-[var(--bg-hover,var(--surface))]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-semibold text-[var(--text)]">
                            {row.projectTitle ?? row.projectCode}
                          </span>
                          <Badge tone={row.badge.tone}>
                            {row.badge.label}
                          </Badge>
                        </div>
                        <div className="mt-1 text-[13px] text-[var(--muted)]">
                          {row.type === "DEPOSIT"
                            ? "Deposit"
                            : "Final payment"}{" "}
                          · {row.customerName} · {row.projectCode}
                        </div>
                        {row.paidAt ? (
                          <div className="mt-1 text-[12px] text-[var(--muted)]">
                            Paid{" "}
                            {new Date(row.paidAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </div>
                        ) : null}
                      </div>

                      <div className="shrink-0 text-right">
                        <div className="text-[16px] font-semibold text-[var(--text)]">
                          {formatMoney(row.dressmakerEarns, row.currency)}
                        </div>
                        <div className="mt-1 text-[12px] text-[var(--muted)]">
                          {formatMoney(row.amount, row.currency)} −{" "}
                          {formatMoney(row.commission, row.currency)} commission
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </DashboardShell>
  );
}