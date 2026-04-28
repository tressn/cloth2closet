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
      socialLinks: true,
      basePriceFrom: true,
      currency: true,
      contactPhone: true,
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
          {dressmakers.length === 0 ? (
            <div className="py-8 text-center text-[14px] text-[var(--muted)]">
              No dressmakers found.
            </div>
          ) : (
            <div className="grid gap-3">
              {dressmakers.map((d) => {
                const links = d.socialLinks as Record<string, string> | null;
                const socialEntries = links && typeof links === "object"
                  ? Object.entries(links).filter(([, v]) => v)
                  : [];

                const urlFor = (platform: string, handle: string) => {
                  if (handle.startsWith("http")) return handle;
                  switch (platform.toLowerCase()) {
                    case "tiktok": return `https://tiktok.com/@${handle}`;
                    case "youtube": return `https://youtube.com/@${handle}`;
                    case "pinterest": return `https://pinterest.com/${handle}`;
                    default: return `https://${platform}.com/${handle}`;
                  }
                };

                return (
                  <div
                    key={d.id}
                    className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-4 py-4 sm:px-5"
                  >
                    {/* Top row: name + badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[15px] font-semibold text-[var(--text)]">
                        {d.displayName ?? "—"}
                      </span>
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
                      <Badge tone={d.isPublished ? "success" : "neutral"}>
                        {d.isPublished ? "Published" : "Unpublished"}
                      </Badge>
                    </div>

                    {d.approvalStatus === "REJECTED" && d.rejectionReason ? (
                      <div className="mt-1 text-[12px] text-[var(--danger)]">
                        Reason: {d.rejectionReason}
                      </div>
                    ) : null}

                    {/* Details grid */}
                    <div className="mt-3 grid gap-x-6 gap-y-2 text-[13px] sm:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <span className="text-[var(--muted)]">Email: </span>
                        <span className="text-[var(--text)]">{d.user.email}</span>
                      </div>

                      <div>
                        <span className="text-[var(--muted)]">Phone: </span>
                        <span className="text-[var(--text)]">{d.contactPhone ?? "—"}</span>
                      </div>

                      <div>
                        <span className="text-[var(--muted)]">Country: </span>
                        <span className="text-[var(--text)]">
                          {d.countryCode
                            ? COUNTRY_LABEL_BY_CODE.get(d.countryCode) ?? d.countryCode
                            : "—"}
                        </span>
                      </div>

                      <div>
                        <span className="text-[var(--muted)]">Pricing: </span>
                        <span className="text-[var(--text)]">
                          {d.basePriceFrom != null
                            ? new Intl.NumberFormat("en-US", {
                                style: "currency",
                                currency: d.currency,
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0,
                              }).format(d.basePriceFrom)
                            : "—"}
                        </span>
                      </div>

                      <div>
                        <span className="text-[var(--muted)]">Portfolio: </span>
                        <span className="text-[var(--text)]">{d._count.portfolioItems} items</span>
                      </div>

                      <div>
                        <span className="text-[var(--muted)]">IG: </span>
                        {d.instagramHandle ? (
                          <a
                            className="underline text-[var(--text)]"
                            href={`https://instagram.com/${d.instagramHandle}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            @{d.instagramHandle}
                          </a>
                        ) : (
                          <span className="text-[var(--text)]">—</span>
                        )}
                      </div>

                      {socialEntries.length > 0 ? (
                        <div>
                          <span className="text-[var(--muted)]">Socials: </span>
                          {socialEntries.map(([platform, handle], idx) => (
                            <span key={platform}>
                              {idx > 0 ? ", " : ""}
                              <a
                                className="underline text-[var(--text)]"
                                href={urlFor(platform, handle)}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {platform}
                              </a>
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    {/* Actions row */}
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-3">
                      <DressmakerRowActions
                        dressmakerProfileId={d.id}
                        approvalStatus={d.approvalStatus as any}
                      />
                      <Link
                        className="text-[12px] font-medium text-[var(--plum-600)] underline"
                        href={`/find-designers/${d.id}`}
                      >
                        View public page
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>
    </DashboardShell>
  );
}