import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/requiredRole";
import { redirect, notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import ReviewForm from "./ReviewForm";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: { payment: true, review: true },
  });

  if (!project) notFound();
  if (project.customerId !== user.id) redirect("/forbidden");

  // if review already exists
  if (project.review) {
    return (
      <div className="bg-[var(--bg)]">
        <Container>
          <main className="py-10 max-w-2xl">
            <Card>
              <CardHeader title="Review submitted" subtitle="Thanks — your review is already on file for this project." />
              <CardBody>
                <a className="underline" href="/dashboard/customer/projects">Back to projects</a>
              </CardBody>
            </Card>
          </main>
        </Container>
      </div>
    );
  }

  // Gate: show a friendly message (server enforced; API enforces too)
  const canReview =
    project.status === "COMPLETED" &&
    project.payment?.status === "SUCCEEDED";

  if (!canReview) {
    return (
      <div className="bg-[var(--bg)]">
        <Container>
          <main className="py-10 max-w-2xl">
            <Card>
              <CardHeader
                title="Reviews unlock after completion"
                subtitle="You can leave a verified review once the project is completed and payment is settled."
              />
              <CardBody>
                <div className="text-sm text-[var(--muted)]">
                  Status: <span className="font-medium text-[var(--text)]">{project.status}</span>
                  <br />
                  Payment: <span className="font-medium text-[var(--text)]">{project.payment?.status ?? "NONE"}</span>
                </div>
              </CardBody>
            </Card>
          </main>
        </Container>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg)]">
      <Container>
        <main className="py-10 max-w-2xl">
          <Card>
            <CardHeader
              title="Leave a review"
              subtitle="This review will be marked as verified because it’s tied to a completed, paid project."
            />
            <CardBody>
              <ReviewForm projectId={project.id} />
            </CardBody>
          </Card>
        </main>
      </Container>
    </div>
  );
}
