import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/app/dashboard/DashboardShell";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default async function DressmakerProjectsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/api/auth/signin");
  if (session.user.role !== "DRESSMAKER" && session.user.role !== "ADMIN") redirect("/");

  const projects = await prisma.project.findMany({
    where: { dressmakerId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: { details: true },
  });

  return (
    <DashboardShell
      title="Projects"
      subtitle="Track requests, edit details, and send quotes."
      tabs={[
        { label: "Profile", href: "/dashboard/dressmaker/profile" },
        { label: "Portfolio", href: "/dashboard/dressmaker/portfolio" },
        { label: "Projects", href: "/dashboard/dressmaker/projects" },
      ]}
    >
      <div className="max-w-4xl">
        <Card>
          <CardHeader
            title="Your projects"
            subtitle={`${projects.length} project${projects.length === 1 ? "" : "s"}`}
          />
          <CardBody>
            {projects.length === 0 ? (
              <div className="text-[14px] text-[var(--muted)]">No projects yet.</div>
            ) : (
              <div className="grid gap-3">
                {projects.map((p) => (
                  <Link key={p.id} href={`/dashboard/dressmaker/projects/${p.id}`} className="block">
                    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-5 py-4 hover:bg-[var(--surface-2)]">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-[15px] font-semibold text-[var(--text)]">{p.projectCode}</div>
                          <div className="mt-1 text-[13px] text-[var(--muted)]">Status: {p.status}</div>
                        </div>
                        <Badge tone="neutral">
                          Quote: {p.quotedTotalAmount != null ? p.quotedTotalAmount : "—"} {p.currency}
                        </Badge>
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
