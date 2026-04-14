import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { DashboardShell } from "@/app/dashboard/DashboardShell";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import ProjectProgress from "@/components/projects/ProjectProgress";
import PayMilestoneButton from "./PayMilestoneButton";
import ApproveSketchButton from "./ApproveSketchButton";
import { formatMoney } from "@/lib/money";

function milestoneLabel(status?: string | null) {
  if (!status) return "Not started";
  return status;
}

function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export default async function CustomerProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      details: true,
      payment: true,
      review: true,
      milestones: true,
      sketchSubmission: true,
      projectShipping: {
        include: {
          carrier: { select: { name: true } },
        },
      },
      dressmaker: {
        select: {
          name: true,
          username: true,
          dressmakerProfile: {
            select: { displayName: true },
          },
        },
      },
    },
  });

  if (!project) notFound();
  if (project.customerId !== session.user.id && session.user.role !== "ADMIN") {
    notFound();
  }

  const details = project.details;

  const dressmakerDisplayName = project.dressmaker.dressmakerProfile?.displayName ?? project.dressmaker.name ?? project.dressmaker.username ?? "Dressmaker";
  
  const sketchImages = project.sketchSubmission?.imageUrls ?? [];

  const deposit = project.milestones.find((m) => m.type === "DEPOSIT");
  const final = project.milestones.find((m) => m.type === "FINAL");

  const depositPaid =
    deposit?.status === "PAID" || deposit?.status === "RELEASED";
  const finalPaid =
    final?.status === "PAID" || final?.status === "RELEASED";

  const showPayDeposit = project.status === "ACCEPTED" && !depositPaid;
  const finalSubmitted = !!details?.finalSubmittedAt;
  const showPayFinal = (!!details?.finalApprovedAt || project.status === "READY_TO_SHIP") && !finalPaid;

  const canReview =
    project.status === "COMPLETED" &&
    finalPaid &&
    !project.review;

  // Temporary shim for ProjectProgress until its prop type is updated
  const projectForProgress = {
    ...project,
    details: details
      ? {
          ...details,
          sketchImage: sketchImages,
        }
      : null,
  };

  return (
    <DashboardShell
      title={project.title ?? project.projectCode}
      subtitle={`${project.projectCode} · By ${dressmakerDisplayName}`}
      tabs={[
        { label: "Back to projects", href: "/dashboard/customer/projects" },
        { label: "Measurements", href: "/dashboard/customer/measurements" },
      ]}
    >
      <div className="max-w-4xl space-y-6">
        <Card>
          <CardHeader
            title="Overview"
            right={<Badge tone="neutral">{project.status}</Badge>}
          />
        </Card>

        <Card>
          <CardHeader
            title="Progress"
            subtitle="Track what happens next, step-by-step."
          />
          <CardBody>
            <ProjectProgress
              project={projectForProgress}
              viewerRole={session.user.role ?? "CUSTOMER"}
            />
          </CardBody>

          <CardBody className="space-y-4 text-[14px] text-[var(--muted)]">
            <div>
              Quote:{" "}
              <span className="font-semibold text-[var(--text)]">
                {project.quotedTotalAmount != null
                  ? formatMoney(project.quotedTotalAmount, project.currency)
                  : "Not quoted yet"}
              </span>
            </div>

            <div className="grid gap-2">
              <div>
                Deposit:{" "}
                <span className="font-semibold text-[var(--text)]">
                  {milestoneLabel(deposit?.status)}
                </span>
                {deposit?.amount != null ? (
                  <span className="ml-2 text-[13px] text-[var(--muted)]">
                    ({formatMoney(deposit.amount, project.currency)})
                  </span>
                ) : null}
              </div>

              <div>
                Final:{" "}
                <span className="font-semibold text-[var(--text)]">
                  {milestoneLabel(final?.status)}
                </span>
                {final?.amount != null ? (
                  <span className="ml-2 text-[13px] text-[var(--muted)]">
                    ({formatMoney(final.amount, project.currency)})
                  </span>
                ) : null}
              </div>
            </div>

            <div className="pt-2 space-y-3">
              {showPayDeposit ? (
                <PayMilestoneButton
                  projectId={project.id}
                  milestoneType="DEPOSIT"
                />
              ) : null}

              {showPayFinal ? (
                <PayMilestoneButton
                  projectId={project.id}
                  milestoneType="FINAL"
                />
              ) : null}

              {!showPayDeposit && !showPayFinal ? (
                <div className="text-[13px] text-[var(--muted)]">
                  No payments due right now.
                </div>
              ) : null}
            </div>

            <div className="pt-2">
              {project.review ? (
                <div className="text-[13px]">
                  ✅ Review submitted.{" "}
                  <Link
                    className="underline"
                    href="/dashboard/customer/projects"
                  >
                    Back to projects
                  </Link>
                </div>
              ) : canReview ? (
                <Link href={`/dashboard/customer/projects/${project.id}/review`}>
                  <Button variant="primary">Leave a verified review</Button>
                </Link>
              ) : (
                <div className="text-[13px] text-[var(--muted)]">
                  Reviews unlock after the project is completed and the final
                  payment is settled.
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        {/* ✅ Your request summary — mirrors what the dressmaker sees */}
        <Card>
          <CardHeader
            title="Your request"
            subtitle="What you submitted to the dressmaker."
          />
          <CardBody className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  label: "Event date",
                  value: details?.eventDate
                    ? new Date(details.eventDate).toLocaleDateString()
                    : "—",
                },
                {
                  label: "Ship-by date",
                  value: details?.shipByDate
                    ? new Date(details.shipByDate).toLocaleDateString()
                    : "—",
                },
                {
                  label: "Budget ceiling",
                  value:
                    details?.budgetCeiling != null
                      ? formatMoney(details.budgetCeiling, project.currency)
                      : "—",
                },
                {
                  label: "Color preferences",
                  value: details?.colorPreferences?.trim() || "—",
                },
                {
                  label: "Size notes",
                  value: details?.sizeNotes?.trim() || "—",
                },
                { label: "Rush order", value: details?.isRush ? "Yes" : "No" },
                { label: "Calico mockup", value: details?.wantsCalico ? "Yes" : "No" },
                { label: "Sketch required", value: details?.requireSketch ? "Yes" : "No" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
                >
                  <div className="text-[12px] uppercase tracking-wide text-[var(--muted)]">
                    {item.label}
                  </div>
                  <div className="mt-1 whitespace-pre-wrap text-[14px] font-medium text-[var(--text)]">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            {details?.fabricNotes?.trim() ? (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <div className="text-[12px] uppercase tracking-wide text-[var(--muted)]">
                  Your notes to the dressmaker
                </div>
                <div className="mt-2 whitespace-pre-wrap text-[14px] leading-6 text-[var(--text)]">
                  {details.fabricNotes.trim()}
                </div>
              </div>
            ) : null}

            {details?.referenceImages?.length ? (
              <div>
                <div className="mb-3 text-[12px] uppercase tracking-wide text-[var(--muted)]">
                  Reference images you sent
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {details.referenceImages.slice(0, 6).map((url: string, idx: number) => (
                    <a
                      key={`${url}-${idx}`}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="block overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`Reference ${idx + 1}`}
                        className="h-40 w-full object-cover"
                      />
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Details" subtitle="Key info for quoting + fit." />
          <CardBody className="space-y-3 text-[14px] text-[var(--muted)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold text-[var(--text)]">
                  Measurements
                </div>
                <div className="text-[13px] text-[var(--muted)]">
                  Keep your latest sizes up to date for better fit.
                </div>
              </div>
              <Link
                href="/dashboard/customer/measurements"
                className="inline-flex"
              >
                <Button variant="secondary">View</Button>
              </Link>
            </div>

            <div className="border-t border-[var(--border)] pt-3">
              <div className="font-semibold text-[var(--text)]">
                Project notes
              </div>
              <div className="text-[13px] whitespace-pre-wrap">
                {details?.fabricNotes?.trim() || "No notes yet."}
              </div>
            </div>

            <div className="border-t border-[var(--border)] pt-3">
              <div className="font-semibold text-[var(--text)]">Key dates</div>
              <div className="text-[13px]">
                Final submitted:{" "}
                <span className="font-semibold text-[var(--text)]">
                  {formatDateTime(details?.finalSubmittedAt)}
                </span>
              </div>
            </div>

            {details?.requireSketch ? (
              <div className="border-t border-[var(--border)] pt-3">
                <div className="font-semibold text-[var(--text)]">Sketch</div>

                {sketchImages.length > 0 ? (
                  <div className="mt-3 space-y-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {sketchImages.map((url: string, idx: number) => (
                        <a
                          key={`${url}-${idx}`}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="block overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt={`Sketch ${idx + 1}`}
                            className="w-full object-cover"
                          />
                        </a>
                      ))}
                    </div>

                    <div className="text-[13px] text-[var(--muted)]">
                      {details.sketchSubmittedAt
                        ? `Submitted ${formatDateTime(details.sketchSubmittedAt)}`
                        : "Submitted"}
                      {details.sketchApprovedAt
                        ? ` • Approved ${formatDateTime(details.sketchApprovedAt)}`
                        : ""}
                    </div>

                    {!details.sketchApprovedAt &&
                    details.sketchSubmittedAt &&
                    sketchImages.length > 0 ? (
                      <div className="pt-1">
                        <ApproveSketchButton projectId={project.id} />
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-2 text-[13px] text-[var(--muted)]">
                    No sketch submitted yet.
                  </div>
                )}
              </div>
            ) : null}

            {details?.finalImages?.length ? (
              <div className="border-t border-[var(--border)] pt-3">
                <div className="font-semibold text-[var(--text)]">Final garment photos</div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {details.finalImages.map((url: string, idx: number) => (
                    <a
                      key={`${url}-${idx}`}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="block overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`Final photo ${idx + 1}`}
                        className="w-full object-cover"
                      />
                  </a>
                ))}
                </div>
                {details.finalApprovedAt ? (
                  <div className="mt-2 text-[12px] text-green-600 font-medium">
                    ✓ Approved {new Date(details.finalApprovedAt).toLocaleDateString()}
                  </div>
                ) : (
                  <div className="mt-2 text-[12px] text-[var(--muted)]">
                    Awaiting your approval before shipping.
                  </div>
                )}
              </div>
            ) : null}

            {project.projectShipping ? (
              <div className="border-t border-[var(--border)] pt-3">
                <div className="font-semibold text-[var(--text)]">Shipping</div>
                <div className="text-[13px]">
                  Carrier:{" "}
                  <span className="font-semibold text-[var(--text)]">
                    {project.projectShipping.carrier?.name ??
                      project.projectShipping.carrierOther ??
                      "—"}
                  </span>
                </div>

                <div className="text-[13px]">
                  Tracking number:{" "}
                  <span className="font-semibold text-[var(--text)]">
                    {project.projectShipping.trackingNumber ?? "—"}
                  </span>
                </div>

                <div className="text-[13px]">
                  Shipped at:{" "}
                  <span className="font-semibold text-[var(--text)]">
                    {formatDateTime(project.projectShipping.shippedAt)}
                  </span>
                </div>
              </div>
            ) : null}
          </CardBody>
        </Card>
      </div>
    </DashboardShell>
  );
}