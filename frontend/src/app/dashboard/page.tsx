import Link from "next/link";
import { requireUser } from "@/lib/requiredRole";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/app/dashboard/DashboardShell";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

function fmt(n: number) {
  return new Intl.NumberFormat().format(n);
}

const ACTION_ROW =
  "flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4";

const ACTION_TEXT =
  "min-w-0 flex-1 pr-1 text-[14px] leading-6 text-[var(--muted)]";

const ACTION_BUTTON =
  "inline-flex shrink-0 items-center justify-center self-start whitespace-nowrap rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-[13px] font-semibold text-[var(--text)] hover:bg-[var(--surface-2)]";

export default async function DashboardHomePage() {
  const user = await requireUser();
  const role = user.role; // "CUSTOMER" | "DRESSMAKER" | "ADMIN" | null

  const isAdmin = role === "ADMIN";
  const isDressmaker = role === "DRESSMAKER" || role === "ADMIN";
  const isCustomer = role === "CUSTOMER" || role === "ADMIN" || role == null;

  const unreadNotifications = await prisma.notification.count({
    where: { userId: user.id, readAt: null },
  });

  // --- Customer: projects snapshot ---
  const customerRequestedCount = isCustomer
    ? await prisma.project.count({
        where: { customerId: user.id, status: "REQUESTED" },
      })
    : 0;

  const customerActiveCount = isCustomer
    ? await prisma.project.count({
        where: {
          customerId: user.id,
          status: {
            in: ["ACCEPTED", "IN_PROGRESS", "FIT_SAMPLE_SENT", "READY_TO_SHIP", "SHIPPED"],
          },
        },
      })
    : 0;

  const customerRecentProjects = isCustomer
    ? await prisma.project.findMany({
        where: { customerId: user.id },
        orderBy: { updatedAt: "desc" },
        take: 3,
        select: { id: true, projectCode: true, title: true, status: true, updatedAt: true },
      })
    : [];

    const customerPendingReviews = isCustomer
    ? await prisma.project.count({
        where: {
            customerId: user.id,
            status: "COMPLETED",
            review: { is: null },
            milestones: { some: { type: "FINAL", status: { in: ["PAID", "RELEASED"] } } },
        },
        })
    : 0;

  // --- Dressmaker: projects snapshot ---
  const makerRequestedCount = isDressmaker
    ? await prisma.project.count({
        where: { dressmakerId: user.id, status: "REQUESTED" },
      })
    : 0;

  const makerActiveCount = isDressmaker
    ? await prisma.project.count({
        where: {
          dressmakerId: user.id,
          status: {
            in: ["ACCEPTED", "IN_PROGRESS", "FIT_SAMPLE_SENT", "READY_TO_SHIP", "SHIPPED"],
          },
        },
      })
    : 0;

  const makerRecentProjects = isDressmaker
    ? await prisma.project.findMany({
        where: { dressmakerId: user.id },
        orderBy: { updatedAt: "desc" },
        take: 3,
        select: { id: true, projectCode: true, title: true, status: true, updatedAt: true },
      })
    : [];

  const dressmakerProfile = isDressmaker
    ? await prisma.dressmakerProfile.findUnique({
        where: { userId: user.id },
        select: { isPublished: true, isPaused: true, approvalStatus: true, id: true },
      })
    : null;

  // ✅ Approved specialties (labels) for dressmakers
  const approvedSpecialties = dressmakerProfile?.id
    ? await prisma.dressmakerSpecialty.findMany({
        where: {
          dressmakerProfileId: dressmakerProfile.id,
          label: { status: "APPROVED", scope: "SPECIALTY" },
        },
        select: { label: { select: { name: true, slug: true } } },
        orderBy: { createdAt: "desc" },
        take: 12,
      })
    : [];

  const adminOpenTickets = isAdmin
    ? await prisma.supportTicket.count({ where: { status: "OPEN" } })
    : 0;

  const title = isAdmin ? "Today (Admin)" : "Today";

  return (
    <DashboardShell title={title} subtitle="A quick snapshot of what needs your attention.">
      <div className="max-w-5xl space-y-4">
        {/* Top row: lightweight “signals” */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Notifications" subtitle="Updates across quotes, payments, and projects." />
            <CardBody className={ACTION_ROW}>
              <div className={ACTION_TEXT}>
                You have{" "}
                <span className="font-semibold text-[var(--text)]">{fmt(unreadNotifications)}</span>{" "}
                unread.
              </div>
              <Link href="/dashboard/notifications" className={ACTION_BUTTON}>
                View
              </Link>
            </CardBody>
          </Card>

          {isAdmin ? (
            <Card>
              <CardHeader title="Support" subtitle="New tickets that need attention." />
              <CardBody className={ACTION_ROW}>
                <div className={ACTION_TEXT}>
                  Open tickets:{" "}
                  <span className="font-semibold text-[var(--text)]">{fmt(adminOpenTickets)}</span>
                </div>
                <Link href="/dashboard/admin/support" className={ACTION_BUTTON}>
                  Review
                </Link>
              </CardBody>
            </Card>
          ) : (
            <Card>
              <CardHeader title="Profile" subtitle="Keep your info up to date for smoother orders." />
              <CardBody className={ACTION_ROW}>
                <div className={ACTION_TEXT}>Manage account details and preferences.</div>
                <Link
                  href={isDressmaker ? "/dashboard/dressmaker/profile" : "/dashboard/customer/profile"}
                  className={ACTION_BUTTON}
                >
                  Open
                </Link>
              </CardBody>
            </Card>
          )}
        </div>

        {/* Customer section */}
        {isCustomer && !isAdmin ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Your projects" subtitle="What’s moving right now." />
              <CardBody className="space-y-3">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
                  <Badge tone="neutral">Requested: {fmt(customerRequestedCount)}</Badge>
                  <Badge tone="featured">Active: {fmt(customerActiveCount)}</Badge>
                </div>

                {customerRecentProjects.length ? (
                  <div className="grid gap-2">
                    {customerRecentProjects.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-semibold text-[var(--text)]">
                            {p.title ?? p.projectCode}
                          </div>
                          <div className="text-[12px] text-[var(--muted)]">Status: {p.status}</div>
                        </div>
                        <Link
                          href={`/dashboard/customer/projects/${p.id}`}
                          className="shrink-0 text-[13px] font-semibold text-[var(--plum-600)] underline"
                        >
                          Open
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[13px] text-[var(--muted)]">
                    No projects yet. When you request a dressmaker, it’ll show up here.
                  </div>
                )}

                <div className="pt-1">
                  <Link
                    href="/dashboard/customer/projects"
                    className="text-[13px] font-semibold text-[var(--plum-600)] underline"
                  >
                    View all projects
                  </Link>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Measurements" subtitle="Better fit starts here." />
              <CardBody className={ACTION_ROW}>
                <div className={ACTION_TEXT}>
                  Keep your latest measurements saved for faster quoting.
                </div>
                <Link href="/dashboard/customer/measurements" className={ACTION_BUTTON}>
                  Update
                </Link>
              </CardBody>
            </Card>
            <Card>
                <CardHeader title="Reviews" subtitle="Help great makers stand out." />
                <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
                    <div className="min-w-0 flex-1 text-[14px] leading-6 text-[var(--muted)]">
                    Reviews to write:{" "}
                    <span className="font-semibold text-[var(--text)]">{fmt(customerPendingReviews)}</span>
                    </div>
                    <Link
                      href="/dashboard/customer/projects"
                      className="inline-flex shrink-0 self-start whitespace-nowrap rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-[13px] font-semibold text-[var(--text)] hover:bg-[var(--surface-2)]"
                    >
                      View projects
                    </Link>
                </CardBody>
            </Card>
          </div>
        ) : null}

        {/* Dressmaker section */}
        {isDressmaker && !isAdmin ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Requests & workload" subtitle="What needs your attention." />
              <CardBody className="space-y-3">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
                  <Badge tone="featured">New requests: {fmt(makerRequestedCount)}</Badge>
                  <Badge tone="neutral">Active: {fmt(makerActiveCount)}</Badge>
                </div>

                {makerRecentProjects.length ? (
                  <div className="grid gap-2">
                    {makerRecentProjects.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-semibold text-[var(--text)]">
                            {p.title ?? p.projectCode}
                          </div>
                          <div className="text-[12px] text-[var(--muted)]">Status: {p.status}</div>
                        </div>
                        <Link
                          href={`/dashboard/dressmaker/projects/${p.id}`}
                          className="shrink-0 text-[13px] font-semibold text-[var(--plum-600)] underline"
                        >
                          Open
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[13px] text-[var(--muted)]">
                    No projects yet. New requests will appear here when customers reach out.
                  </div>
                )}

                <div className="pt-1">
                  <Link
                    href="/dashboard/dressmaker/projects"
                    className="text-[13px] font-semibold text-[var(--plum-600)] underline"
                  >
                    View all projects
                  </Link>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Visibility" subtitle="Control how customers discover you." />
              <CardBody className="space-y-3">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
                  <Badge tone={dressmakerProfile?.approvalStatus === "APPROVED" ? "featured" : "neutral"}>
                    Approval: {dressmakerProfile?.approvalStatus ?? "—"}
                  </Badge>
                  <Badge tone={dressmakerProfile?.isPublished ? "featured" : "neutral"}>
                    Published: {dressmakerProfile?.isPublished ? "Yes" : "No"}
                  </Badge>
                  <Badge tone={dressmakerProfile?.isPaused ? "neutral" : "featured"}>
                    Paused: {dressmakerProfile?.isPaused ? "Yes" : "No"}
                  </Badge>
                </div>

                <div className={ACTION_ROW}>
                  <div className={ACTION_TEXT}>Update profile, publish, or pause listings.</div>
                  <Link href="/dashboard/dressmaker/profile" className={ACTION_BUTTON}>
                    Manage
                  </Link>
                </div>
              </CardBody>
            </Card>

            {/* ✅ Approved Specialties card */}
            <Card className="lg:col-span-2">
              <CardHeader title="Approved specialties" subtitle="Tags customers can discover you by." />
              <CardBody className="space-y-3">
                {approvedSpecialties.length ? (
                  <div className="flex flex-wrap gap-x-2 gap-y-2">
                    {approvedSpecialties.map((s) => (
                      <Badge key={s.label.slug} tone="neutral">
                        {s.label.name}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <div className="text-[13px] text-[var(--muted)]">
                    No approved specialties yet. Add a few to help customers find you.
                  </div>
                )}

                <div className="pt-1">
                  <Link
                    href="/dashboard/dressmaker/labels"
                    className="text-[13px] font-semibold text-[var(--plum-600)] underline"
                  >
                    Manage labels
                  </Link>
                </div>
              </CardBody>
            </Card>
          </div>
        ) : null}
      </div>
    </DashboardShell>
  );
}