import Link from "next/link";
import { requireUser } from "@/lib/requiredRole";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

export default async function NotificationsPage() {
  const user = await requireUser();

  const items = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <Container>
      <main className="py-10">
        <Card>
          <CardHeader title="Notifications" subtitle="Updates about quotes, payments, and activity." />
          <CardBody>
            {items.length === 0 ? (
              <div className="text-[14px] text-[var(--muted)]">No notifications yet.</div>
            ) : (
              <div className="grid gap-3">
                {items.map((n) => {
                  const unread = !n.readAt;
                  return (
                    <div
                      key={n.id}
                      className={[
                        "rounded-[var(--radius)] border px-5 py-4",
                        unread ? "border-[rgba(134,56,111,0.35)] bg-[rgba(134,56,111,0.08)]" : "border-[var(--border)] bg-[var(--surface)]",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="text-[15px] font-semibold text-[var(--text)]">{n.title}</div>
                          {n.body ? <div className="mt-1 text-[13px] text-[var(--muted)]">{n.body}</div> : null}
                          <div className="mt-2 text-[12px] text-[var(--muted)]">
                            {new Date(n.createdAt).toLocaleString()}
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-col items-end gap-2">
                          {n.href ? (
                            <Link href={n.href} className="underline text-sm">
                              Open →
                            </Link>
                          ) : null}

                          {unread ? (
                            <form
                              action={async () => {
                                "use server";
                                await prisma.notification.update({
                                  where: { id: n.id },
                                  data: { readAt: new Date() },
                                });
                              }}
                            >
                              <Button type="submit" variant="secondary" size="sm">
                                Mark read
                              </Button>
                            </form>
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
