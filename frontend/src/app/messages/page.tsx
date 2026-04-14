import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/requiredRole";
import MessagesShell from "./MessagesShell";
import { getConversationDisplayMeta } from "@/lib/conversationTitle";

function previewText(text?: string | null) {
  if (!text) return "";
  const firstLine = text
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0) ?? "";
  return firstLine.slice(0, 40);
}

export default async function MessagesPage() {
  const user = await requireUser();
  const userId = user.id;

  const convos = await prisma.conversation.findMany({
    where: { OR: [{ customerId: userId }, { dressmakerId: userId }] },
    orderBy: { updatedAt: "desc" },
    include: {
      project: true,
      customer: { select: { id: true, name: true, username: true, email: true } },
      dressmaker: { select: { id: true, name: true, username: true, email: true } },
      messages: {
        take: 1,
        orderBy: { createdAt: "desc" },
        include: { files: { select: { url: true, purpose: true } } },
      },
      conversationReads: {
        where: { userId },
        take: 1,
        select: { lastReadAt: true },
      },
    },
  });

  const list = (
    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)]">
      <div className="border-b border-[var(--border)] px-5 py-4">
        <div className="text-[17px] font-semibold text-[var(--text)]">Inbox</div>
        <div className="mt-0.5 text-[13px] text-[var(--muted)]">
          {convos.length} conversation{convos.length !== 1 ? "s" : ""}
        </div>
      </div>

      <div className="p-3 grid gap-2">
        {convos.length === 0 ? (
          <div className="px-2 py-4 text-[14px] text-[var(--muted)]">
            No conversations yet.
          </div>
        ) : (
          convos.map((c) => {
            const last = c.messages[0];
            const lastText = previewText(last?.text);
            const photoCount =
              last?.files?.filter((f) => f.purpose === "MESSAGE_ATTACHMENT").length ?? 0;

            const read = c.conversationReads[0]?.lastReadAt ?? null;
            const lastAt = last?.createdAt ?? c.updatedAt;
            const isNew = read ? lastAt > read : true;

            const other = c.customerId === userId ? c.dressmaker : c.customer;
            const display = getConversationDisplayMeta({
              project: c.project,
              customer: c.customer,
              otherParticipant: other,
              isProjectConversation: !!c.projectId,
            });

            return (
              <Link key={c.id} href={`/messages/${c.id}`} className="block">
                <div className="w-full min-w-0 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 hover:bg-[var(--surface-2)] transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-semibold text-[var(--text)]">
                        {display.title}
                      </div>
                      {display.subtitle ? (
                        <div className="mt-0.5 truncate text-[12px] text-[var(--muted)]">
                          {display.subtitle}
                        </div>
                      ) : null}
                      {display.detail ? (
                        <div className="truncate text-[11px] text-[var(--muted)] opacity-70">
                          {display.detail}
                        </div>
                      ) : null}
                      <div className="mt-1.5 truncate text-[13px] text-[var(--muted)]">
                        {lastText
                          ? lastText
                          : photoCount > 0
                          ? `📷 ${photoCount} photo${photoCount !== 1 ? "s" : ""}`
                          : "(no messages)"}
                      </div>
                    </div>

                    <div className="shrink-0 flex flex-col items-end gap-1.5">
                      {isNew ? (
                        <span className="rounded-full bg-[var(--plum-500)] px-2.5 py-0.5 text-[11px] font-semibold text-white">
                          NEW
                        </span>
                      ) : null}
                      {photoCount > 0 ? (
                        <span className="text-[12px] text-[var(--muted)]">
                          📷 {photoCount}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );

  const detail = (
    <div className="h-full flex flex-col items-center justify-center rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)]">
      <div className="text-[15px] font-semibold text-[var(--text)]">
        Select a conversation
      </div>
      <div className="mt-2 text-[13px] text-[var(--muted)]">
        Choose a thread on the left to read messages.
      </div>
    </div>
  );

  return <MessagesShell list={list} detail={detail} />;
}