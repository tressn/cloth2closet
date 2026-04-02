import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PaymentStatus } from "@prisma/client";
import { DashboardShell } from "@/app/dashboard/DashboardShell";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatMoney } from "@/lib/money";

export default async function CustomerProjectsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/api/auth/signin");

  const projects = await prisma.project.findMany({
    where: { customerId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: { payment: true },
  });

  return (
      <div className="max-w-4xl">
        <Card>
          <CardHeader title="Projects" subtitle={`${projects.length} project${projects.length === 1 ? "" : "s"}`} />
          <CardBody>
            {projects.length === 0 ? (
              <div className="text-[14px] text-[var(--muted)]">No projects yet.</div>
            ) : (
              <div className="grid gap-3">
                {projects.map((p) => (
                  <div key={p.id} className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-[15px] font-semibold text-[var(--text)]">{p.projectCode}</div>
                        <div className="mt-1 text-[13px] text-[var(--muted)]">Status: {p.status}</div>
                      </div>

                      <Badge tone="neutral">
                        Quote: {formatMoney(p.quotedTotalAmount, p.currency)}
                      </Badge>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <Link className="text-[13px] font-medium underline text-[var(--plum-600)]" href={`/dashboard/customer/projects/${p.id}`}>
                        View project
                      </Link>

                      <div className="flex items-center gap-2">
                        <Badge tone="neutral">Payment: {p.payment?.status ?? "None"}</Badge>

                        {p.payment && p.payment.status === PaymentStatus.REQUIRES_PAYMENT_METHOD ? (
                          <form action={`/api/payments/checkout?projectId=${p.id}`} method="POST">
                            <Button type="submit" variant="primary" size="sm">
                              Pay now
                            </Button>
                          </form>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
  );
}
