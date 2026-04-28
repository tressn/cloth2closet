import { requireRole } from "@/lib/requiredRole";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/app/dashboard/DashboardShell";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import TicketStatusActions from "./TicketStatusActions";
import AdminMessageButton from "@/components/admin/AdminMessageButton";
import AdminViewConversations from "@/components/admin/AdminViewConversations";

export default async function AdminSupportPage() {
  await requireRole(["ADMIN"]);

  const tickets = await prisma.supportTicket.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
        id: true,
        subject: true,
        message: true,
        category: true,
        status: true,
        createdAt: true,
        attachmentUrls: true,
        requesterEmail: true,
        userId: true,
        user: { select: { email: true, name: true } },
        project: { select: { id: true, projectCode: true, title: true } },
    },
    });

  return (
      <div className="max-w-5xl">
        <Card>
          <CardHeader title="Tickets" subtitle={`${tickets.length} recent`} />
          <CardBody>
            {tickets.length === 0 ? (
              <div className="text-[14px] text-[var(--muted)]">No support tickets.</div>
            ) : (
              <div className="grid gap-3">
                {tickets.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-5 py-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-[15px] font-semibold text-[var(--text)] truncate">{t.subject}</div>
                        <div className="mt-1 text-[12px] text-[var(--muted)]">
                          {(() => {const from = t.user?.name ||t.user?.email ||t.requesterEmail ||"Guest";
                            return (
                                <>
                                From: {from} • {new Date(t.createdAt).toLocaleString()}
                                </>
                            );
                            })()}
                        </div>

                        <div className="mt-2 text-[13px] text-[var(--muted)] whitespace-pre-wrap">{t.message}</div>

                        {t.project ? (
                          <div className="mt-3 text-[13px]">
                            Project:{" "}
                            <span className="font-semibold text-[var(--text)]">
                              {t.project.title ?? t.project.projectCode} ({t.project.id})
                            </span>
                          </div>
                        ) : null}

                        {t.attachmentUrls?.length ? (
                          <div className="mt-3 grid gap-2">
                            <div className="text-[12px] font-medium text-[var(--muted)]">
                              Attachments ({t.attachmentUrls.length})
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {t.attachmentUrls.slice(0, 6).map((url, idx) => (
                                <a
                                  key={idx}
                                  href={url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block overflow-hidden rounded-xl border"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={url} alt="Attachment" className="h-28 w-full object-cover" />
                                </a>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <div className="text-[10px]">user id: {t.userId ?? "null"}</div>
                        {t.userId ? (
                          <div className="flex flex-col gap-2">
                            <AdminMessageButton userId={t.userId} />
                          </div>
                        ) : null}
                        <Badge tone="neutral">{t.category}</Badge>
                        <Badge
                          tone={
                            t.status === "OPEN"
                              ? "featured"
                              : t.status === "CLOSED"
                                ? "success"
                                : "neutral"
                          }
                        >
                          {t.status}
                        </Badge>

                        <TicketStatusActions
                          ticketId={t.id}
                          currentStatus={t.status}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
  );
}
