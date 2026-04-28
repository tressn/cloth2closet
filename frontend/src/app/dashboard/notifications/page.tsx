import Link from "next/link";
import { requireUser } from "@/lib/requiredRole";
import { prisma } from "@/lib/prisma";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DashboardShell } from "@/app/dashboard/DashboardShell";

export default async function NotificationsPage() {
  const user = await requireUser();

  const items = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <DashboardShell title="Notifications" subtitle="Updates about quotes, payments, and activity.">
      <div className="max-w-3xl">
        <Card>
          <CardBody>
            {items.length === 0 ? (
              <div className="py-8 text-center text-[14px] text-[var(--muted)]">No notifications yet.</div>
            ) : (
              <div className="grid gap-3">
                {items.map((n) => {
                  const unread = !n.readAt;
                  return (
                    <div
                      key={n.id}
                      className={[
                        "rounded-[var(--radius)] border px-4 py-3 sm:px-5 sm:py-4",
                        unread ? "border-[rgba(134,56,111,0.35)] bg-[rgba(134,56,111,0.08)]" : "border-[var(--border)] bg-[var(--surface)]",
                      ].join(" ")}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                        <div className="min-w-0">
                          <div className="text-[14px] font-semibold text-[var(--text)] sm:text-[15px]">{n.title}</div>
                          {n.body ? <div className="mt-1 text-[13px] text-[var(--muted)]">{n.body}</div> : null}
                          <div className="mt-1.5 text-[12px] text-[var(--muted)]">
                            {new Date(n.createdAt).toLocaleString()}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
                          {n.href ? (
                            <Link href={n.href} className="text-[13px] font-medium text-[var(--plum-600)] underline">
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
      </div>
    </DashboardShell>
  );
}