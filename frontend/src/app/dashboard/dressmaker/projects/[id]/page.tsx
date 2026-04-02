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

  const convoId = project.conversations[0]?.id;
  const sketchImages = project.details?.sketchImage ?? [];
  const sketchSubmittedAt = project.details?.sketchSubmittedAt;
  const sketchApprovedAt = project.details?.sketchApprovedAt;

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
      : project.details?.measurementsRequested ?? [];

  const visibleMeasurementEntries = measurementFields
    ? Object.entries(measurementFields).filter(([key]) =>
        requestedFields.length > 0 ? requestedFields.includes(key) : true
      )
    : [];

  return (
    <DashboardShell
      title={project.title ?? project.projectCode}
      subtitle="Review details, then send a quote."
      tabs={[{ label: "Back to projects", href: "/dashboard/dressmaker/projects" }]}
    >
      <div className="max-w-5xl space-y-6">
        <Card>
          <CardHeader
            title="Overview"
            subtitle="High-level project status and links."
            right={<Badge tone="neutral">{project.status}</Badge>}
          />
          <CardHeader
            title="Progress"
            subtitle="Track what happens next, step-by-step."
          />
          <CardBody>
            <ProjectProgress
              project={project}
              viewerRole={session.user.role ?? "DRESSMAKER"}
            />
          </CardBody>
          <CardBody className="space-y-3 text-[14px] text-[var(--muted)]">
            <div>
              Current Project Quote:{" "}
              <span className="font-semibold text-[var(--text)]">
                {project.quotedTotalAmount != null
                  ? formatMoney(project.quotedTotalAmount, project.currency)
                  : "Not quoted yet"}
              </span>
            </div>

            {convoId ? (
              <div>
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
            title="Project details"
            subtitle="Edit requirements, measurements, materials, deadlines."
          />
          <CardBody>
            <ProjectDetailsEditor projectId={project.id} initial={project.details} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Sketch"
            subtitle={
              project.details?.requireSketch
                ? "Required for this project."
                : "Optional for this project."
            }
            right={
              project.details?.requireSketch ? (
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
          <Card>

      <CardBody className="space-y-3">
        {!project.details?.requireSketch ? (
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
            No sketch submitted yet. Submit after measurements are requested/confirmed.
          </div>
        )}

        {project.details?.requireSketch ? (
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
        </Card>

        <Card>
          <CardHeader
            title="Project Quote"
            subtitle="Enter total in cents. This will be used for checkout."
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
                      {key.replace(/([A-Z])/g, " $1").replace(/[_-]/g, " ").trim()}
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
      </div>
    </DashboardShell>
  );
}