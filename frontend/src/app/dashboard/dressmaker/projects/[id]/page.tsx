import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { DashboardShell } from "@/app/dashboard/DashboardShell";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import QuoteForm from "./QuoteForm";
import ProjectDetailsEditor from "@/app/components/ProjectDetailsEditor";

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
    include: { details: true, payment: true, conversations: true },
  });

  if (!project) notFound();
  if (project.dressmakerId !== session.user.id && session.user.role !== "ADMIN") notFound();

  const convoId = project.conversations[0]?.id;

  return (
    <DashboardShell
      title={project.title ?? project.projectCode}
      subtitle="Review details, then send a quote."
      tabs={[
        { label: "Back to projects", href: "/dashboard/dressmaker/projects" },
        { label: "Portfolio", href: "/dashboard/dressmaker/portfolio" },
        { label: "Profile", href: "/dashboard/dressmaker/profile" },
      ]}
    >
      <div className="max-w-5xl space-y-6">
        <Card>
          <CardHeader
            title="Overview"
            subtitle="High-level project status and links."
            right={<Badge tone="neutral">{project.status}</Badge>}
          />
          <CardHeader title="Progress" subtitle="Track what happens next, step-by-step." />
            <CardBody>
              <ProjectProgress project={project} viewerRole={session.user.role ?? "DRESSMAKER"} />
            </CardBody>
          <CardBody className="space-y-3 text-[14px] text-[var(--muted)]">
            <div>
              Quote:{" "}
              <span className="font-semibold text-[var(--text)]">
                {project.quotedTotalAmount != null ? `${project.quotedTotalAmount} ${project.currency}` : "Not quoted yet"}
              </span>
            </div>
            {convoId ? (
              <div>
                Messages:{" "}
                <Link className="underline text-[var(--plum-600)]" href={`/messages/${convoId}`}>
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
            <ProjectDetailsEditor 
              projectId={project.id} 
              initial={project.details} 
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader 
            title="Quote" 
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
      </div>
    </DashboardShell>
  );
}
