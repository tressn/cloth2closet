import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatMoney } from "@/lib/money";

export default async function DressmakerProjectsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/api/auth/signin");
  if (session.user.role !== "DRESSMAKER" && session.user.role !== "ADMIN") redirect("/");

  const projects = await prisma.project.findMany({
    where: { dressmakerId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: { 
      details: true, 
      projectShipping: true,
      customer: {
        select: { name: true, username: true }, 
      },
    },
  });

  return (
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
                          <div className="text-[15px] font-semibold text-[var(--text)]">{p.title ?? p.projectCode}</div>
                          <div className="mt-1 text-[13px] text-[var(--muted)]">ProjectID: {p.projectCode} </div>
                          <div className="mt-1 text-[13px] text-[var(--muted)]">Customer: {p.customer.name ?? p.customer.username ?? "Customer"} </div>
                          <div className="mt-1 text-[13px] text-[var(--muted)]">Status: {p.status}</div>
                        </div>
                        <Badge tone="neutral">
                          Quote: {formatMoney(p.quotedTotalAmount, p.currency)}
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
  );
}
