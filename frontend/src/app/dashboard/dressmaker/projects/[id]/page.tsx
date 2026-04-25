import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { DashboardShell } from "@/app/dashboard/DashboardShell";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import QuoteForm from "./QuoteForm";
import ProjectDetailsEditor from "@/app/features/ProjectDetailsEditor";
import ProjectProgress from "@/components/projects/ProjectProgress";
import { formatMoney } from "@/lib/money";
import DressmakerNotesCard from "./DressmakerNotesCard";
import DeadlineAlerts from "@/components/projects/DeadlineAlerts";
import SendFinalInvoiceButton from "./SendFinalInvoiceButton";

function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

function prettifyLabel(key: string) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export default async function DressmakerProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/api/auth/signin");

  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      details: true,
      payment: true,
      milestones: true,
      conversations: true,
      projectMeasurementGate: true,
      sketchSubmission: true,
      customer: {
        include: {
          measurements: {
            orderBy: { updatedAt: "desc" },
            take: 1,
          },
          customerProfile: true,
        },
      },
      projectShipping: {
        include: {
          carrier: { select: { name: true } },
        },
      },
    },
  });

  if (!project) notFound();
  if (project.dressmakerId !== session.user.id && session.user.role !== "ADMIN") {
    notFound();
  }

  const details = project.details;
  const customerDisplayName = project.customer.name ?? project.customer.username ?? "Customer";
  const convoId = project.conversations[0]?.id;
  const sketchImages = project.sketchSubmission?.imageUrls ?? [];
  const sketchSubmittedAt = details?.sketchSubmittedAt;
  const sketchApprovedAt = details?.sketchApprovedAt;

  const latestMeasurement = project.customer.measurements[0] ?? null;

  const snapshotFields =
  project.projectMeasurementGate?.snapshotFieldsJson &&
  typeof project.projectMeasurementGate.snapshotFieldsJson === "object" &&
  !Array.isArray(project.projectMeasurementGate.snapshotFieldsJson)
    ? (project.projectMeasurementGate.snapshotFieldsJson as Record<string, unknown>)
    : null;

const latestCustomerMeasurementFields =
  latestMeasurement?.fieldsJson &&
  typeof latestMeasurement.fieldsJson === "object" &&
  !Array.isArray(latestMeasurement.fieldsJson)
    ? (latestMeasurement.fieldsJson as Record<string, unknown>)
    : null;

const measurementsLocked = Boolean(project.projectMeasurementGate?.dressmakerConfirmedAt);

const measurementFields = measurementsLocked
  ? snapshotFields
  : latestCustomerMeasurementFields;

  const visibleMeasurementEntries = measurementFields ? Object.entries(measurementFields) : [];

  const summaryItems = [
    { label: "Event date", value: formatDateTime(details?.eventDate) },
    { label: "Ship-by date", value: formatDateTime(details?.shipByDate) },
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
    { label: "Calico requested", value: details?.wantsCalico ? "Yes" : "No" },
    { label: "Sketch required", value: details?.requireSketch ? "Yes" : "No" },
  ];

  // Normalize for ProjectProgress, which still expects details.sketchImage
  const projectForProgress = {
    ...project,
    details: details
      ? {
          ...details,
          sketchImage: project.sketchSubmission?.imageUrls ?? [],
        }
      : null,
  };

  return (
    <DashboardShell
      title={project.title ?? project.projectCode}
      subtitle={`${project.projectCode} · ${customerDisplayName}`}
      tabs={[{ label: "Back to projects", href: "/dashboard/dressmaker/projects" }]}
    >
      <div className="max-w-5xl space-y-6">
        <DeadlineAlerts
          deadlines={[
            { label: "Ship-by date", date: details?.shipByDate },
            { label: "Event date", date: details?.eventDate },
          ]}
        />

        <Card>
          <CardHeader
            title="Overview"
            subtitle="Track the project from request to completion."
            right={<Badge tone="neutral">{project.status}</Badge>}
          />
          <CardBody>
            <ProjectProgress
              project={projectForProgress}
              viewerRole={session.user.role ?? "DRESSMAKER"}
            />
          </CardBody>

          <CardBody className="grid gap-3 border-t border-[var(--border)] text-[14px] text-[var(--muted)] sm:grid-cols-2">
            {(() => {
              const deposit = project.milestones.find((m) => m.type === "DEPOSIT");
              const final = project.milestones.find((m) => m.type === "FINAL");
              const depositPaid = deposit?.status === "PAID" || deposit?.status === "RELEASED";
              const finalPaid = final?.status === "PAID" || final?.status === "RELEASED";

              return (
                <>
                  <div>
                    Total quote:{" "}
                    <span className="font-semibold text-[var(--text)]">
                      {project.quotedTotalAmount != null
                        ? formatMoney(project.quotedTotalAmount, project.currency)
                        : "Not quoted yet"}
                    </span>
                  </div>

                  <div>
                    Currency:{" "}
                    <span className="font-semibold text-[var(--text)]">{project.currency}</span>
                  </div>

                  {deposit ? (
                    <div>
                      Deposit ({project.depositPercent ?? "—"}%):{" "}
                      <span className="font-semibold text-[var(--text)]">
                        {formatMoney(deposit.amount, project.currency)}
                      </span>{" "}
                      <span className={depositPaid ? "text-green-600 font-semibold" : ""}>
                        {depositPaid ? "— Paid ✓" : `— ${deposit.status}`}
                      </span>
                    </div>
                  ) : null}

                  {final ? (
                    <div>
                      Final payment:{" "}
                      <span className="font-semibold text-[var(--text)]">
                        {formatMoney(final.amount, project.currency)}
                      </span>{" "}
                      <span className={finalPaid ? "text-green-600 font-semibold" : ""}>
                        {finalPaid ? "— Paid ✓" : `— ${final.status}`}
                      </span>
                    </div>
                  ) : null}
                  {deposit && (deposit.status === "PAID" || deposit.status === "RELEASED") ? (
                    <div>
                      Your deposit earnings:{" "}
                      <span className="font-semibold text-green-600">
                        {formatMoney(
                          deposit.amount - (deposit.platformFeeAmount ?? Math.trunc(deposit.amount * 0.1)),
                          project.currency
                        )}
                      </span>
                      <span className="ml-1 text-[12px] text-[var(--muted)]">
                        (after {deposit.platformFeeAmount ? formatMoney(deposit.platformFeeAmount, project.currency) : "10%"} our commission)
                      </span>
                    </div>
                  ) : null}

                  {final &&
                    final.status === "PENDING" &&
                    (project.status === "READY_TO_SHIP" || project.status === "IN_PROGRESS") ? (
                        <div className="sm:col-span-2 pt-2">
                          <SendFinalInvoiceButton projectId={project.id} />
                        </div>
                      ) : final?.status === "INVOICED" && !finalPaid ? (
                    <div className="sm:col-span-2 text-[13px] text-green-600 font-medium">
                      ✓ Final invoice sent — waiting for customer payment
                    </div>
                  ) : null}

                  {convoId ? (
                    <div className="sm:col-span-2">
                      Messages:{" "}
                      <Link className="underline text-[var(--plum-600)]" href={`/messages/${convoId}`}>
                        Open conversation
                      </Link>
                    </div>
                  ) : null}
                </>
              );
            })()}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Project brief"
            subtitle="The customer’s key requirements and preferences."
          />
          <CardBody className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2">
              {summaryItems.map((item) => (
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

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <div className="text-[12px] uppercase tracking-wide text-[var(--muted)]">
                  Customer notes
                </div>
                <div className="mt-2 whitespace-pre-wrap text-[14px] leading-6 text-[var(--text)]">
                  {details?.fabricNotes?.trim() || "No customer notes yet."}
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <div className="text-[12px] uppercase tracking-wide text-[var(--muted)]">
                  Shipping
                </div>
                <div className="mt-2 space-y-2 text-[14px] text-[var(--text)]">
                  <div>
                    Carrier:{" "}
                    <span className="font-medium">
                      {project.projectShipping?.carrier?.name ??
                        project.projectShipping?.carrierOther ??
                        "—"}
                    </span>
                  </div>
                  <div>
                    Tracking number:{" "}
                    <span className="font-medium">
                      {project.projectShipping?.trackingNumber ?? "—"}
                    </span>
                  </div>
                  <div>
                    Shipped at:{" "}
                    <span className="font-medium">
                      {project.projectShipping?.shippedAt
                        ? new Date(project.projectShipping.shippedAt).toLocaleString()
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {details?.referenceImages?.length ? (
              <div>
                <div className="mb-3 text-[12px] uppercase tracking-wide text-[var(--muted)]">
                  Reference images
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
                        alt={`Reference image ${idx + 1}`}
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
          <CardHeader
            title="Dressmaker notes"
            subtitle="Private working notes for fit, sourcing, and reminders."
          />
          <CardBody>
            <DressmakerNotesCard
              projectId={project.id}
              initialValue={details?.dressmakerPrivateNotes ?? ""}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Customer measurements"
            subtitle={
              measurementsLocked
                ? "Approved measurements locked for this project."
                : "Latest customer measurements for review before approval."
            }
            right={
              measurementsLocked ? (
                <Badge tone="success">Locked</Badge>
              ) : (
                <Badge tone="neutral">Reviewing</Badge>
              )
            }
          />
          <CardBody>
            {!measurementFields ? (
              <div className="text-[14px] text-[var(--muted)]">
                No measurements available yet.
              </div>
            ) : visibleMeasurementEntries.length === 0 ? (
              <div className="text-[14px] text-[var(--muted)]">
                No requested measurements are available yet.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {visibleMeasurementEntries.map(([key, value]) => (
                  <div
                    key={key}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
                  >
                    <div className="text-[12px] uppercase tracking-wide text-[var(--muted)]">
                      {prettifyLabel(key)}
                    </div>
                    <div className="mt-1 text-[14px] font-semibold text-[var(--text)]">
                      {String(value)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Sketch"
            subtitle={
              details?.requireSketch
                ? "Required for this project."
                : "Optional for this project."
            }
            right={
              details?.requireSketch ? (
                sketchApprovedAt ? (
                  <Badge tone="success">Approved</Badge>
                ) : sketchSubmittedAt ? (
                  <Badge tone="featured">Submitted</Badge>
                ) : (
                  <Badge tone="neutral">Not submitted</Badge>
                )
              ) : (
                <Badge tone="neutral">Not required</Badge>
              )
            }
          />
          <CardBody className="space-y-3">
            {!details?.requireSketch ? (
              <div className="text-[14px] text-[var(--muted)]">
                This project doesn’t require a sketch.
              </div>
            ) : sketchImages.length > 0 ? (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {sketchImages.slice(0, 10).map((url: string, idx: number) => (
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

                <div className="text-[12px] text-[var(--muted)]">
                  {sketchSubmittedAt
                    ? `Submitted ${new Date(sketchSubmittedAt).toLocaleString()}`
                    : "Submitted"}
                  {sketchApprovedAt
                    ? ` • Approved ${new Date(sketchApprovedAt).toLocaleString()}`
                    : ""}
                </div>
              </>
            ) : (
              <div className="text-[14px] text-[var(--muted)]">
                No sketch submitted yet. Submit after measurements are requested and confirmed.
              </div>
            )}

            {details?.requireSketch ? (
              <div className="pt-1">
                <Link
                  className="text-[13px] font-semibold text-[var(--plum-600)] underline"
                  href={`/dashboard/dressmaker/projects/${project.id}/sketch`}
                >
                  Submit / update sketch →
                </Link>
              </div>
            ) : null}
          </CardBody>
        </Card>

        {(() => {
          const depositMilestone = project.milestones.find((m) => m.type === "DEPOSIT");
          const depositAlreadyPaid =
            depositMilestone?.status === "PAID" || depositMilestone?.status === "RELEASED";
          const depositPaidAmount = depositAlreadyPaid ? depositMilestone!.amount : null;

          return (
            <Card>
              <CardHeader
                title={depositAlreadyPaid ? "Update final invoice" : "Project quote"}
                subtitle={
                  depositAlreadyPaid
                    ? `Deposit of ${formatMoney(depositPaidAmount!, project.currency)} already paid. Update the total to adjust the remaining balance.`
                    : "Enter your price for this project including materials and shipping."
                }
              />
              <CardBody>
                <QuoteForm
                  projectId={project.id}
                  existingAmount={project.quotedTotalAmount}
                  currency={project.currency}
                  existingDepositPercent={project.depositPercent}
                  depositAlreadyPaid={depositAlreadyPaid}
                  depositPaidAmount={depositPaidAmount}
                />
              </CardBody>
            </Card>
          );
        })()}

        {(project.status === "READY_TO_SHIP" ||
          project.status === "SHIPPED" ||
          project.status === "COMPLETED") ? (
          <Card>
            <CardHeader
              title="Shipping address"
              subtitle="Customer's address for this shipment. Handle with care."
            />
            <CardBody>
              {project.customer.customerProfile?.fullName ?? "—"}
              {project.customer.customerProfile?.address1 ? (
                <div className="text-[14px] text-[var(--text)] space-y-1">
                  <div>{project.customer.customerProfile.address1}</div>
                  {project.customer.customerProfile.address2 ? (
                    <div>{project.customer.customerProfile.address2}</div>
                  ) : null}
                  <div>
                    {[
                      project.customer.customerProfile.postalCode,
                      project.customer.customerProfile.countryCode,
                    ].filter(Boolean).join(", ")}
                  </div>
                </div>
              ) : (
                <div className="text-[14px] text-[var(--muted)]">
                  Customer has not added a shipping address yet. Ask them via messages.
                </div>
              )}
            </CardBody>
          </Card>
        ) : null}

        <Card>
          <CardHeader
            title="Edit project details"
            subtitle="Adjust delivery, fabric, and sketch requirements."
          />
          <CardBody>
            <ProjectDetailsEditor projectId={project.id} initial={details} />
          </CardBody>
        </Card>
      </div>
    </DashboardShell>
  );
}