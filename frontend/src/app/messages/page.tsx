import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { requireUser } from "@/lib/requiredRole";
import MessagesShell from "./MessagesShell";

function previewText(text?: string | null) {
  const t = (text ?? "").trim();
  return t ? t.slice(0, 90) : "";
}

export default async function MessagesPage() {
  const user = await requireUser();
  const userId = user.id;

  const convos = await prisma.conversation.findMany({
    where: { OR: [{ customerId: userId }, { dressmakerId: userId }] },
    orderBy: { updatedAt: "desc" },
    include: {
      project: true,
      customer: { select: { id: true, name: true, email: true } },
      dressmaker: { select: { id: true, name: true, email: true } },
      messages: { take: 1, orderBy: { createdAt: "desc" } },
      conversationReads: {
        where: { userId },
        take: 1,
        select: { lastReadAt: true },
      },
    },
  });

  const list = (
    <Card>
      <CardHeader
        title="Inbox"
        subtitle={`${convos.length} conversation${convos.length === 1 ? "" : "s"}`}
      />
      <CardBody>
        {convos.length === 0 ? (
          <div className="text-[14px] text-[var(--muted)]">No conversations yet.</div>
        ) : (
          <div className="grid gap-3">
            {convos.map((c) => {
              const last = c.messages[0];
              const lastText = previewText(last?.text);
              const photoCount = Array.isArray(last?.attachments) ? last!.attachments.length : 0;

              const read = c.conversationReads[0]?.lastReadAt ?? null;
              const lastAt = last?.createdAt ?? c.updatedAt;
              const isNew = read ? lastAt > read : true; // never read => NEW

              const other = c.customerId === userId ? c.dressmaker : c.customer;
              const otherName = other?.name || other?.email || "Conversation";

              return (
                <Link key={c.id} href={`/messages/${c.id}`} className="block">
                  <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-5 py-4 hover:bg-[var(--surface-2)]">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="truncate text-[15px] font-semibold text-[var(--text)]">
                          {c.project?.projectCode ?? otherName}
                        </div>
                        <div className="mt-1 truncate text-[13px] text-[var(--muted)]">
                          With: {otherName}
                        </div>

                        <div className="mt-2 text-[13px] text-[var(--muted)]">
                          Last:{" "}
                          {lastText
                            ? lastText
                            : photoCount > 0
                              ? `(sent ${photoCount} photo${photoCount === 1 ? "" : "s"})`
                              : "(no messages)"}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        {photoCount > 0 ? (
                          <div className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-[12px] text-[var(--muted)]">
                            📷 {photoCount}
                          </div>
                        ) : null}

                        {isNew ? (
                          <div className="rounded-full bg-[var(--plum-500)] px-3 py-1 text-[12px] font-semibold text-white">
                            NEW
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardBody>
    </Card>
  );

  const detail = (
    <div className="hidden lg:block">
      <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-6 py-10 text-center">
        <div className="text-[15px] font-semibold text-[var(--text)]">
          Select a conversation
        </div>
        <div className="mt-2 text-[13px] text-[var(--muted)]">
          Choose a thread on the left to view messages.
        </div>
      </div>
    </div>
  );

  return <MessagesShell list={list} detail={detail} />;
}
