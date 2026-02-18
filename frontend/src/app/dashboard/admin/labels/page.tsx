import { requireRole } from "@/lib/requiredRole";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/app/dashboard/DashboardShell";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import AdminLabelsTable from "./table";

export default async function AdminLabelsPage() {
  await requireRole(["ADMIN"]);

  const pending = await prisma.label.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: { createdBy: { select: { email: true, name: true } } },
  });

  const approved = await prisma.label.findMany({
    where: { status: "APPROVED" },
    orderBy: { name: "asc" },
    take: 200,
  });

  return (
    <DashboardShell
      title="Admin • Labels"
      subtitle="Approve / reject / rename proposed labels to keep tagging consistent."
      tabs={[
        { label: "Support", href: "/dashboard/admin/support" },
        { label: "Labels", href: "/dashboard/admin/labels" },
      ]}
    >
      <div className="max-w-5xl space-y-6">
        <Card>
          <CardHeader title="Pending labels" subtitle={`${pending.length} waiting`} />
          <CardBody>
            <AdminLabelsTable items={pending as any} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Approved labels" subtitle={`${approved.length} total`} />
          <CardBody>
            <div className="flex flex-wrap gap-2">
              {approved.map((l) => (
                <span
                  key={l.id}
                  className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-[12px] font-medium text-[var(--muted)]"
                >
                  {l.name}
                </span>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </DashboardShell>
  );
}
