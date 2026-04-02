import { requireRole } from "@/lib/requiredRole";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/app/dashboard/DashboardShell";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import ReleaseButton from "./release-button";
import { formatMoney } from "@/lib/money";


export default async function AdminPayoutsPage() {
  await requireRole(["ADMIN"]);

  const now = new Date();

  const milestones = await prisma.milestone.findMany({
    where: { status: { in: ["PAID", "RELEASED"] } },
    orderBy: [{ payoutEligibleAt: "asc" }, { paidAt: "desc" }],
    take: 200,
    include: {
      project: {
        select: {
          id: true,
          projectCode: true,
          title: true,
          currency: true,
          dressmaker: { select: { id: true, name: true, email: true } },
          customer: { select: { id: true, name: true, email: true } },
        },
      },
      transfer: true,
    },
  });

  return (
    <DashboardShell
      title="Admin • Payouts"
      subtitle="Review paid milestones and release payouts."
      tabs={[
        { label: "Dressmakers", href: "/dashboard/admin/dressmakers" },
        { label: "Payouts", href: "/dashboard/admin/payouts" },
        { label: "Support", href: "/dashboard/admin/support" },
        { label: "Users", href: "/dashboard/admin/users" },
        { label: "Labels", href: "/dashboard/admin/labels" },
      ]}
    >
      <div className="max-w-6xl">
        <Card>
          <CardHeader title="Milestones" subtitle={`${milestones.length} recent`} />
          <CardBody>
            {milestones.length === 0 ? (
              <div className="text-[14px] text-[var(--muted)]">No paid milestones yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[14px]">
                  <thead className="text-[12px] text-[var(--muted)]">
                    <tr className="border-b border-[var(--border)]">
                      <th className="py-3 pr-4">Project</th>
                      <th className="py-3 pr-4">Milestone</th>
                      <th className="py-3 pr-4">Amount</th>
                      <th className="py-3 pr-4">Status</th>
                      <th className="py-3 pr-4">Eligible</th>
                      <th className="py-3 pr-4">Dressmaker</th>
                      <th className="py-3 pr-4">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {milestones.map((m) => {
                      const eligible = !m.payoutEligibleAt || m.payoutEligibleAt <= now;
                      return (
                        <tr key={m.id} className="border-b border-[var(--border)]">
                          <td className="py-3 pr-4">
                            <div className="font-semibold text-[var(--text)]">{m.project.projectCode}</div>
                            <div className="text-[12px] text-[var(--muted)]">{m.project.title ?? "Untitled"}</div>
                          </td>

                          <td className="py-3 pr-4">
                            <div className="font-semibold text-[var(--text)]">{m.title}</div>
                            <div className="text-[12px] text-[var(--muted)]">{m.type}</div>
                          </td>

                          <td className="py-3 pr-4 font-semibold text-[var(--text)]">
                            {formatMoney(m.amount, m.project.currency)}
                          </td>

                          <td className="py-3 pr-4">
                            <Badge tone={m.status === "RELEASED" ? "success" : "featured"}>{m.status}</Badge>
                          </td>

                          <td className="py-3 pr-4 text-[12px] text-[var(--muted)]">
                            {m.payoutEligibleAt ? new Date(m.payoutEligibleAt).toLocaleString() : "Now"}
                          </td>

                          <td className="py-3 pr-4">
                            <div className="text-[var(--text)]">{m.project.dressmaker.name ?? "—"}</div>
                            <div className="text-[12px] text-[var(--muted)]">{m.project.dressmaker.email}</div>
                          </td>

                          <td className="py-3 pr-4">
                            {m.status === "RELEASED" ? (
                              <span className="text-[12px] text-[var(--muted)]">Released</span>
                            ) : (
                              <ReleaseButton milestoneId={m.id} disabled={!eligible} />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </DashboardShell>
  );
}