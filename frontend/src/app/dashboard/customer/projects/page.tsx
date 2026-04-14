import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/app/dashboard/DashboardShell";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatMoney } from "@/lib/money";

export default async function CustomerProjectsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/api/auth/signin");

  const projects = await prisma.project.findMany({
    where: { customerId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      milestones: true,
      dressmaker: {
        select: {
          name: true,
          dressmakerProfile: { select: { displayName: true } },
        },
      },
    },
  });

  return (
    <div className="max-w-4xl">
      <Card>
        <CardHeader
          title="Projects"
          subtitle={`${projects.length} project${projects.length === 1 ? "" : "s"}`}
        />
        <CardBody>
          {projects.length === 0 ? (
            <div className="text-[14px] text-[var(--muted)]">No projects yet.</div>
          ) : (
            <div className="grid gap-3">
              {projects.map((p) => {
                const deposit = p.milestones.find((m) => m.type === "DEPOSIT");
                const final = p.milestones.find((m) => m.type === "FINAL");
                const depositPaid =
                  deposit?.status === "PAID" || deposit?.status === "RELEASED";
                const finalPaid =
                  final?.status === "PAID" || final?.status === "RELEASED";
                const dressmakerName =
                  p.dressmaker.dressmakerProfile?.displayName ??
                  p.dressmaker.name ??
                  "Dressmaker";

                return (
                  <Link
                    key={p.id}
                    href={`/dashboard/customer/projects/${p.id}`}
                    className="block"
                  >
                    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-5 py-4 hover:bg-[var(--surface-2)]">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="text-[15px] font-semibold text-[var(--text)]">
                            {p.title ?? p.projectCode}
                          </div>
                          <div className="mt-1 text-[13px] text-[var(--muted)]">
                            {p.projectCode} · By {dressmakerName}
                          </div>
                          <div className="mt-1 text-[13px] text-[var(--muted)]">
                            Status: {p.status}
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <Badge tone="neutral">
                            {p.quotedTotalAmount != null
                              ? formatMoney(p.quotedTotalAmount, p.currency)
                              : "No quote yet"}
                          </Badge>

                          {/* Payment state pills */}
                          {deposit ? (
                            <div className="text-[12px] text-[var(--muted)]">
                              Deposit:{" "}
                              <span
                                className={
                                  depositPaid
                                    ? "font-semibold text-green-600"
                                    : "font-semibold text-[var(--text)]"
                                }
                              >
                                {depositPaid ? "Paid ✓" : deposit.status}
                              </span>
                            </div>
                          ) : null}

                          {final ? (
                            <div className="text-[12px] text-[var(--muted)]">
                              Final:{" "}
                              <span
                                className={
                                  finalPaid
                                    ? "font-semibold text-green-600"
                                    : "font-semibold text-[var(--text)]"
                                }
                              >
                                {finalPaid ? "Paid ✓" : final.status}
                              </span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}