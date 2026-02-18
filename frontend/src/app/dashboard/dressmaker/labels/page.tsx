import { requireDressmaker } from "@/lib/requiredRole";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/app/dashboard/DashboardShell";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import ProposeLabelForm from "./propose-form";

export default async function DressmakerLabelsPage() {
  const user = await requireDressmaker();

  const mine = await prisma.label.findMany({
    where: { createdById: user.id },
    orderBy: { createdAt: "desc" },
  });

  const approved = await prisma.label.findMany({
    where: { status: "APPROVED" },
    orderBy: { name: "asc" },
    take: 100,
  });

  return (
    <DashboardShell
      title="Labels"
      subtitle="Propose labels for standardized tagging. Admin approves to keep things consistent."
      tabs={[
        { label: "Projects", href: "/dashboard/dressmaker/projects" },
        { label: "Portfolio", href: "/dashboard/dressmaker/portfolio" },
        { label: "Profile", href: "/dashboard/dressmaker/profile" },
      ]}
    >
      <div className="max-w-4xl space-y-6">
        <Card>
          <CardHeader title="Propose a label" subtitle="Examples: bridal, embroidery, eveningwear, menswear" />
          <CardBody>
            <ProposeLabelForm />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Your proposals" subtitle={`${mine.length} total`} />
          <CardBody>
            {mine.length === 0 ? (
              <div className="text-[14px] text-[var(--muted)]">No proposals yet.</div>
            ) : (
              <div className="grid gap-2">
                {mine.map((l) => (
                  <div
                    key={l.id}
                    className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
                  >
                    <div className="text-[14px] text-[var(--text)]">{l.name}</div>
                    <div className="text-[12px] text-[var(--muted)]">{l.status}</div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Approved labels" subtitle="These are available for consistent tagging." />
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
