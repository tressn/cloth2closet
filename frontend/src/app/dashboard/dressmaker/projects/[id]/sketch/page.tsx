import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { DashboardShell } from "@/app/dashboard/DashboardShell";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import SketchSubmitForm from "./SketchSubmitForm";

export default async function DressmakerSketchPage({
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
      sketchSubmission: true,
    },
  });

  if (!project) notFound();
  if (project.dressmakerId !== session.user.id && session.user.role !== "ADMIN") {
    notFound();
  }

  const sketchImages = project.sketchSubmission?.imageUrls ?? [];
  const sketchSubmittedAt = project.details?.sketchSubmittedAt;
  const sketchApprovedAt = project.details?.sketchApprovedAt;

  return (
    <DashboardShell
      title="Submit sketch"
      subtitle="Upload concept images for customer approval."
      tabs={[
        {
          label: "Back to project",
          href: `/dashboard/dressmaker/projects/${project.id}`,
        },
      ]}
    >
      <div className="max-w-3xl space-y-6">
        <Card>
          <CardHeader
            title={project.title ?? project.projectCode}
            subtitle={
              project.details?.requireSketch
                ? "Sketch approval is required for this project."
                : "Sketch is optional for this project."
            }
            right={
              sketchApprovedAt ? (
                <Badge tone="success">Approved</Badge>
              ) : sketchSubmittedAt ? (
                <Badge tone="featured">Submitted</Badge>
              ) : (
                <Badge tone="neutral">
                  {project.details?.requireSketch ? "Required" : "Optional"}
                </Badge>
              )
            }
          />
          <CardBody className="space-y-4">
            {sketchImages.length > 0 ? (
              <>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {sketchImages.map((url: string, idx: number) => (
                    <a
                      key={`${url}-${idx}`}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="block overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`Sketch ${idx + 1}`}
                        className="aspect-square w-full object-cover"
                      />
                    </a>
                  ))}
                </div>

                <div className="text-[12px] text-[var(--muted)]">
                  {sketchSubmittedAt
                    ? `Submitted ${new Date(sketchSubmittedAt).toLocaleString()}`
                    : null}
                  {sketchApprovedAt
                    ? ` • Approved ${new Date(sketchApprovedAt).toLocaleString()}`
                    : ""}
                </div>
              </>
            ) : (
              <div className="text-[14px] text-[var(--muted)]">
                No sketch submitted yet.
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title={sketchImages.length > 0 ? "Update sketch" : "Submit sketch"}
            subtitle="Upload 1–10 images for customer review."
          />
          <CardBody>
            <SketchSubmitForm
              projectId={project.id}
              initialImages={sketchImages}
              disabled={!!sketchApprovedAt}
            />
          </CardBody>
        </Card>
      </div>
    </DashboardShell>
  );
}