import Link from "next/link";
import { requireUser } from "@/lib/requiredRole";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Container } from "@/components/ui/Container";

export default async function DressmakerQuotesPage() {
  const user = await requireUser(); // must be logged in
  const userId = user.id;

  const quotes = await prisma.project.findMany({
    where: {
      dressmakerId: userId,
      status: "REQUESTED",
    },
    orderBy: { createdAt: "desc" },
    include: {
      details: true,
      customer: { select: { id: true, name: true, email: true } },
      conversations: { take: 1, select: { id: true } },
    },
  });

  return (
    <Container>
      <main className="py-10">
        <Card>
          <CardHeader title="Quotes" subtitle="New quote requests waiting for your response." />
          <CardBody>
            {quotes.length === 0 ? (
              <div className="text-[14px] text-[var(--muted)]">No new quote requests right now.</div>
            ) : (
              <div className="grid gap-3">
                {quotes.map((q) => {
                  const customerName = q.customer?.name || q.customer?.email || "Customer";
                  const convoId = q.conversations[0]?.id;

                  return (
                    <div key={q.id} className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="truncate text-[15px] font-semibold text-[var(--text)]">
                            {q.title ?? q.projectCode}
                          </div>
                          <div className="mt-1 text-[13px] text-[var(--muted)]">
                            From: {customerName}
                            {q.details?.eventDate ? ` • Event: ${new Date(q.details.eventDate).toLocaleDateString()}` : ""}
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {q.details?.isRush ? <Badge tone="featured">Rush</Badge> : null}
                            {q.details?.wantsCalico ? <Badge tone="neutral">Calico</Badge> : null}
                            <Badge tone="neutral">{q.projectCode}</Badge>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-col gap-2">
                          <Link className="underline text-sm" href={`/dashboard/dressmaker/projects/${q.id}`}>
                            Open quote →
                          </Link>
                          {convoId ? (
                            <Link className="underline text-sm" href={`/messages/${convoId}`}>
                              Message →
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>
      </main>
    </Container>
  );
}
