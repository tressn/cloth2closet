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
      conversations: true,
      projectMeasurementGate: true,
      customer: {
        include: {
          measurements: {
            orderBy: { updatedAt: "desc" },
            take: 1,
          },
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
  const convoId = project.conversations[0]?.id;
  const sketchImages = details?.sketchImage ?? [];
  const sketchSubmittedAt = details?.sketchSubmittedAt;
  const sketchApprovedAt = details?.sketchApprovedAt;

  const latestMeasurement = project.customer.measurements[0] ?? null;
  const measurementFields =
    latestMeasurement?.fieldsJson &&
    typeof latestMeasurement.fieldsJson === "object" &&
    !Array.isArray(latestMeasurement.fieldsJson)
      ? (latestMeasurement.fieldsJson as Record<string, unknown>)
      : null;

  const requestedFields =
    project.projectMeasurementGate?.requestedFields?.length
      ? project.projectMeasurementGate.requestedFields
      : details?.measurementsRequested ?? [];

  const visibleMeasurementEntries = measurementFields
    ? Object.entries(measurementFields).filter(([key]) =>
        requestedFields.length > 0 ? requestedFields.includes(key) : true
      )
    : [];

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

  return (
    <DashboardShell
      title={project.title ?? project.projectCode}
      subtitle="Review the brief, manage the workflow, and send a quote."
      tabs={[{ label: "Back to projects", href: "/dashboard/dressmaker/projects" }]}
    >
      <div className="max-w-5xl space-y-6">
        <Card>
          <CardHeader
            title="Overview"
            subtitle="Track the project from request to completion."
            right={<Badge tone="neutral">{project.status}</Badge>}
          />
          <CardBody>
            <ProjectProgress
              project={project}
              viewerRole={session.user.role ?? "DRESSMAKER"}
            />
          </CardBody>

          <CardBody className="grid gap-3 border-t border-[var(--border)] text-[14px] text-[var(--muted)] sm:grid-cols-2">
            <div>
              Current quote:{" "}
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

            {convoId ? (
              <div className="sm:col-span-2">
                Messages:{" "}
                <Link
                  className="underline text-[var(--plum-600)]"
                  href={`/messages/${convoId}`}
                >
                  Open conversation
                </Link>
              </div>
            ) : null}
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
                  {details.referenceImages.slice(0, 6).map((url, idx) => (
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
            subtitle="Latest sizing reference for this project."
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
                  {sketchImages.slice(0, 10).map((url, idx) => (
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

        <Card>
          <CardHeader
            title="Project quote"
            subtitle="Enter the full customer-facing amount."
          />
          <CardBody>
            <QuoteForm
              projectId={project.id}
              existingAmount={project.quotedTotalAmount}
              currency={project.currency}
              existingDepositPercent={project.depositPercent}
            />
          </CardBody>
        </Card>

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