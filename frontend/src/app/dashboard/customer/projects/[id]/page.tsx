import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { DashboardShell } from "@/app/dashboard/DashboardShell";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import ProjectProgress from "@/app/components/projects/ProjectProgress";
import PayMilestoneButton from "./PayMilestoneButton";

function milestoneLabel(status?: string | null) {
  if (!status) return "Not started";
  return status;
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
      payment: true, // keep if you still use it as rollup, but not as truth for milestones
      review: true,
      milestones: true, // ✅ REQUIRED for deposit/final UI
      projectShipping: {
        include: {
          carrier: { select: { name: true } },
        },
      },
    },
  });

  if (!project) notFound();
  if (project.customerId !== session.user.id && session.user.role !== "ADMIN") notFound();

  // Find milestones
  const deposit = project.milestones.find((m) => m.type === "DEPOSIT");
  const final = project.milestones.find((m) => m.type === "FINAL");

  const depositPaid = deposit?.status === "PAID" || deposit?.status === "RELEASED";
  const finalPaid = final?.status === "PAID" || final?.status === "RELEASED";

  // When to show Pay Deposit:
  // - After quote accepted (your quote route sets ACCEPTED)
  // - And deposit not paid
  const showPayDeposit = project.status === "ACCEPTED" && !depositPaid;

  // When to show Pay Final:
  // You said:
  // - after final is submitted (so customer can pay while reviewing)
  // - also after final approval
  // So: if finalSubmittedAt exists OR project is READY_TO_SHIP, and final not paid
  const finalSubmitted = !!project.details?.finalSubmittedAt;
  const showPayFinal = (finalSubmitted || project.status === "READY_TO_SHIP") && !finalPaid;

  // Reviews: unlock after completed AND final payment is paid (not the old project.payment.status)
  const canReview =
    project.status === "COMPLETED" &&
    finalPaid &&
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

          <CardBody className="space-y-4 text-[14px] text-[var(--muted)]">
            <div>
              Quote:{" "}
              <span className="font-semibold text-[var(--text)]">
                {project.quotedTotalAmount != null
                  ? `${project.quotedTotalAmount} ${project.currency}`
                  : "Not quoted yet"}
              </span>
            </div>

            {/* ✅ Milestone payment summary (replace old Payment status display) */}
            <div className="grid gap-2">
              <div>
                Deposit:{" "}
                <span className="font-semibold text-[var(--text)]">
                  {milestoneLabel(deposit?.status)}
                </span>
                {deposit?.amount != null ? (
                  <span className="ml-2 text-[13px] text-[var(--muted)]">
                    ({deposit.amount} {project.currency})
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
                    ({final.amount} {project.currency})
                  </span>
                ) : null}
              </div>
            </div>

            {/* ✅ Payment buttons */}
            <div className="pt-2 space-y-3">
              {showPayDeposit ? (
                <PayMilestoneButton projectId={project.id} milestoneType="DEPOSIT" />
              ) : null}

              {showPayFinal ? (
                <PayMilestoneButton projectId={project.id} milestoneType="FINAL" />
              ) : null}

              {!showPayDeposit && !showPayFinal ? (
                <div className="text-[13px] text-[var(--muted)]">
                  No payments due right now.
                </div>
              ) : null}
            </div>

            {/* Reviews */}
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
                  Reviews unlock after the project is completed and the final payment is settled.
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