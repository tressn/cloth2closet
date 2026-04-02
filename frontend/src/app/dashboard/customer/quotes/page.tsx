import Link from "next/link";
import { requireUser } from "@/lib/requiredRole";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Container } from "@/components/ui/Container";

function statusLabel(s: string) {
  if (s === "REQUESTED") return "Requested";
  if (s === "ACCEPTED") return "Approved";
  return s;
}

export default async function CustomerQuotesPage() {
  const user = await requireUser();
  const userId = user.id;

  const quotes = await prisma.project.findMany({
    where: {
      customerId: userId,
      status: { in: ["REQUESTED", "ACCEPTED"] },
    },
    orderBy: { createdAt: "desc" },
    include: {
      payment: true,
      details: true,
      conversations: { take: 1, select: { id: true } },
      dressmaker: { select: { id: true, name: true, email: true } },
    },
  });

  return (
    <Container>
      <main className="py-10">
        <Card>
          <CardHeader title="Quotes" subtitle="Requests and approved quotes waiting for payment." />
          <CardBody>
            {quotes.length === 0 ? (
              <div className="text-[14px] text-[var(--muted)]">No quotes yet.</div>
            ) : (
              <div className="grid gap-3">
                {quotes.map((q) => {
                  const convoId = q.conversations[0]?.id;
                  const dmName = q.dressmaker?.name || q.dressmaker?.email || "Dressmaker";

                  return (
                    <div key={q.id} className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="truncate text-[15px] font-semibold text-[var(--text)]">
                            {q.title ?? q.projectCode}
                          </div>
                          <div className="mt-1 text-[13px] text-[var(--muted)]">
                            Maker: {dmName}
                            {q.details?.eventDate ? ` • Event: ${new Date(q.details.eventDate).toLocaleDateString()}` : ""}
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <Badge tone={q.status === "ACCEPTED" ? "success" : "neutral"}>{statusLabel(q.status)}</Badge>
                            {q.details?.isRush ? <Badge tone="featured">Rush</Badge> : null}
                            {q.details?.wantsCalico ? <Badge tone="neutral">Calico</Badge> : null}
                          </div>

                          {q.status === "ACCEPTED" ? (
                            <div className="mt-3 text-[13px] text-[var(--muted)]">
                              Ready to pay deposit.
                            </div>
                          ) : (
                            <div className="mt-3 text-[13px] text-[var(--muted)]">
                              Waiting for maker to approve and price your quote.
                            </div>
                          )}
                        </div>

                        <div className="flex shrink-0 flex-col gap-2">
                          {convoId ? (
                            <Link className="underline text-sm" href={`/messages/${convoId}`}>
                              Message →
                            </Link>
                          ) : null}

                          {q.status === "ACCEPTED" ? (
                            <Link className="underline text-sm" href={`/api/payments/checkout?projectId=${q.id}`}>
                              Pay deposit →
                            </Link>
                          ) : null}

                          <Link className="underline text-sm" href={`/dashboard/customer/projects/${q.id}`}>
                            View details →
                          </Link>
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
