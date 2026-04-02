import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/app/dashboard/DashboardShell";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import DressmakerRowActions from "./row-actions";
import Link from "next/link";
import { COUNTRIES } from "@/lib/lookup/countries";

const COUNTRY_LABEL_BY_CODE = new Map(COUNTRIES.map((c) => [c.value, c.label]));

type Approval = "PENDING" | "APPROVED" | "REJECTED";

export default async function AdminDressmakersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/forbidden");

  const sp = await searchParams;
  const status = (sp.status?.toUpperCase() as Approval) || "PENDING";
  const statusFilter: Approval[] = ["PENDING", "APPROVED", "REJECTED"].includes(status)
    ? [status]
    : ["PENDING"];

  const dressmakers = await prisma.dressmakerProfile.findMany({
    where: { approvalStatus: { in: statusFilter } },
    orderBy: { createdAt: "desc" },
    take: 300,
    select: {
      id: true,
      userId: true,
      displayName: true,
      countryCode: true,
      instagramHandle: true,
      basePriceFrom: true,
      currency: true,
      isPublished: true,
      approvalStatus: true,
      rejectionReason: true,
      createdAt: true,
      user: { select: { email: true } },
      _count: { select: { portfolioItems: true } },
    },
  });

  return (
    <DashboardShell
      title="Admin · Dressmakers"
      subtitle="Review and approve dressmakers before they can be featured and trusted on the marketplace."
      tabs={[
        { label: "Pending", href: "/dashboard/admin/dressmakers?status=PENDING" },
        { label: "Approved", href: "/dashboard/admin/dressmakers?status=APPROVED" },
        { label: "Rejected", href: "/dashboard/admin/dressmakers?status=REJECTED" },
      ]}
    >
      <Card>
        <CardHeader
          title="Dressmaker approvals"
          subtitle={`Showing: ${statusFilter[0]}`}
        />
        <CardBody>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[14px]">
              <thead className="text-[12px] text-[var(--muted)]">
                <tr className="border-b border-[var(--border)]">
                  <th className="py-3 pr-4">Dressmaker</th>
                  <th className="py-3 pr-4">Email</th>
                  <th className="py-3 pr-4">Country</th>
                  <th className="py-3 pr-4">IG</th>
                  <th className="py-3 pr-4">Pricing</th>
                  <th className="py-3 pr-4">Portfolio</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4">Published</th>
                  <th className="py-3 pr-4">Actions</th>
                </tr>
              </thead>

              <tbody>
                {dressmakers.map((d) => (
                  <tr key={d.id} className="border-b border-[var(--border)] align-top">
                    <td className="py-3 pr-4 font-semibold text-[var(--text)]">
                      <div className="flex flex-col">
                        <span>{d.displayName ?? "—"}</span>
                        <Link
                          className="mt-1 text-[12px] text-[var(--muted)] underline"
                          href={`/dressmakers/${d.id}`}
                        >
                          View public page
                        </Link>
                      </div>
                    </td>

                    <td className="py-3 pr-4 text-[var(--text)]">{d.user.email}</td>

                    <td className="py-3 pr-4 text-[var(--text)]">
                      {d.countryCode
                        ? COUNTRY_LABEL_BY_CODE.get(d.countryCode) ?? d.countryCode
                        : "—"}
                    </td>

                    <td className="py-3 pr-4 text-[var(--text)]">
                      {d.instagramHandle ? (
                        <a
                          className="underline"
                          href={`https://instagram.com/${d.instagramHandle}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          @{d.instagramHandle}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="py-3 pr-4 text-[var(--text)]">
                        {d.basePriceFrom != null
                            ? new Intl.NumberFormat("en-US", {
                                style: "currency",
                                currency: d.currency,
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0,
                            }).format(d.basePriceFrom)
                            : "—"}
                    </td>

                    <td className="py-3 pr-4 text-[var(--text)]">
                      {d._count.portfolioItems}
                    </td>

                    <td className="py-3 pr-4">
                      <Badge
                        tone={
                          d.approvalStatus === "APPROVED"
                            ? "success"
                            : d.approvalStatus === "REJECTED"
                            ? "danger"
                            : "featured"
                        }
                      >
                        {d.approvalStatus}
                      </Badge>

                      {d.approvalStatus === "REJECTED" && d.rejectionReason ? (
                        <div className="mt-1 text-[12px] text-[var(--muted)]">
                          {d.rejectionReason}
                        </div>
                      ) : null}
                    </td>

                    <td className="py-3 pr-4">
                      <Badge tone={d.isPublished ? "success" : "neutral"}>
                        {d.isPublished ? "Yes" : "No"}
                      </Badge>
                    </td>

                    <td className="py-3 pr-4">
                      <DressmakerRowActions
                        dressmakerProfileId={d.id}
                        approvalStatus={d.approvalStatus as any}
                      />
                    </td>
                  </tr>
                ))}

                {dressmakers.length === 0 ? (
                  <tr>
                    <td className="py-8 text-[14px] text-[var(--muted)]" colSpan={9}>
                      No dressmakers found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </DashboardShell>
  );
}