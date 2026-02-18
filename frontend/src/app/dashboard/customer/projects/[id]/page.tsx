import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { DashboardShell } from "@/app/dashboard/DashboardShell";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

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
    include: { details: true, payment: true, review: true },
  });

  if (!project) notFound();
  if (project.customerId !== session.user.id && session.user.role !== "ADMIN") notFound();

  const canReview =
    project.status === "COMPLETED" &&
    project.payment?.status === "SUCCEEDED" &&
    !project.review;

  return (
    <DashboardShell
      title={project.projectCode}
      subtitle="Project overview for customers."
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
          <CardHeader title="Progress" subtitle="Track what happens next, step-by-step." />
          <CardBody>
            <ProjectProgress project={project} viewerRole={session.user.role ?? "CUSTOMER"} />
          </CardBody>

          <CardBody className="space-y-3 text-[14px] text-[var(--muted)]">
            <div>
              Quote:{" "}
              <span className="font-semibold text-[var(--text)]">
                {project.quotedTotalAmount != null
                  ? `${project.quotedTotalAmount} ${project.currency}`
                  : "Not quoted yet"}
              </span>
            </div>
            <div>
              Payment:{" "}
              <span className="font-semibold text-[var(--text)]">
                {project.payment?.status ?? "None"}
              </span>
            </div>

            <div className="pt-2">
              {project.review ? (
                <div className="text-[13px]">
                  ✅ Review submitted.{" "}
                  <Link className="underline" href={`/dashboard/customer/projects`}>
                    Back to projects
                  </Link>
                </div>
              ) : canReview ? (
                <Link href={`/dashboard/customer/projects/${project.id}/review`}>
                  <Button variant="primary">Leave a verified review</Button>
                </Link>
              ) : (
                <div className="text-[13px] text-[var(--muted)]">
                  Reviews unlock after the project is completed and payment is settled.
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Details" subtitle="This is where you can later show details + attachments." />
          <CardBody>
            <div className="text-[14px] text-[var(--muted)]">
              Next step: render `project.details` fields in a clean, read-only panel for customers.
            </div>
          </CardBody>
        </Card>
      </div>
    </DashboardShell>
  );
}
