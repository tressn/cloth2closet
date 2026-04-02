import Link from "next/link";
import { requireUser } from "@/lib/requiredRole";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import MessageComposer from "./MessageComposer";
import MessagesShell from "../MessagesShell";
import AutoScrollToBottom from "./AutoScrollToBottom";

function AttachmentGallery({ urls, mine }: { urls: string[]; mine: boolean }) {
  const safe = Array.isArray(urls) ? urls.filter(Boolean).slice(0, 10) : [];
  if (safe.length === 0) return null;

  const thumb = "h-12 w-12";

  return (
    <div className="mt-3">
      <div className={["grid gap-2", safe.length === 1 ? "grid-cols-1" : "grid-cols-2"].join(" ")}>
        {safe.map((url, idx) => (
          <a
            key={`${url}-${idx}`}
            href={url}
            target="_blank"
            rel="noreferrer noopener"
            className={[
              "block overflow-hidden rounded-xl border",
              mine ? "border-white/20" : "border-[var(--border)]",
            ].join(" ")}
            title="Open image"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt="Attachment"
              loading="lazy"
              referrerPolicy="no-referrer"
              className={["grid gap-2",
                  safe.length === 1 ? "grid-cols-1" : "grid-cols-2",
                ].join(" ")}
            />
          </a>
        ))}
      </div>
      <div className={["mt-2 text-[12px]", mine ? "text-white/80" : "text-[var(--muted)]"].join(" ")}>
        {safe.length} photo{safe.length === 1 ? "" : "s"}
      </div>
    </div>
  );
}

function previewText(text?: string | null) {
  const t = (text ?? "").trim();
  return t ? t.slice(0, 90) : "";
}

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const userId = user.id;

  // Fetch convo for right panel
  const convo = await prisma.conversation.findUnique({
    where: { id },
    include: {
      project: true,
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          files: { select: { url: true, purpose: true } },
        },
      },
    },
  });

  if (!convo) notFound();
  if (convo.customerId !== userId && convo.dressmakerId !== userId) notFound();

  // Mark as read (clears NEW badge)
  await prisma.conversationRead.upsert({
    where: { conversationId_userId: { conversationId: convo.id, userId } },
    update: { lastReadAt: new Date() },
    create: { conversationId: convo.id, userId, lastReadAt: new Date() },
  });

  // Fetch list for left panel
  const convos = await prisma.conversation.findMany({
    where: { OR: [{ customerId: userId }, { dressmakerId: userId }] },
    orderBy: { updatedAt: "desc" },
    include: {
      project: true,
      customer: { select: { id: true, name: true, email: true } },
      dressmaker: { select: { id: true, name: true, email: true } },
      messages: { take: 1, 
        orderBy: { createdAt: "desc" }, 
        include: { files: { select: { url: true, purpose: true } } }
    },
      conversationReads: { where: { userId }, take: 1, select: { lastReadAt: true } },
    },
  });

  const list = (
    <Card>
      <CardHeader title="Inbox" subtitle={`${convos.length} conversation${convos.length === 1 ? "" : "s"}`} />
      <CardBody>
        <div className="grid gap-3">
          {convos.map((c) => {
            const last = c.messages[0];
            const lastText = previewText(last?.text);
            const photoCount =
              last?.files?.filter((f: any) => f.purpose === "MESSAGE_ATTACHMENT").length
              ?? (Array.isArray((last as any)?.attachments) ? (last as any).attachments.length : 0);

            const read = c.conversationReads[0]?.lastReadAt ?? null;
            const lastAt = last?.createdAt ?? c.updatedAt;
            const isNew = read ? lastAt > read : true;

            const other = c.customerId === userId ? c.dressmaker : c.customer;
            const otherName = other?.name || other?.email || "Them";

            const active = c.id === convo.id;

            return (
              <Link key={c.id} href={`/messages/${c.id}`} className="block">
                <div
                  className={[
                    "rounded-[var(--radius)] border px-5 py-4",
                    active
                      ? "border-[rgba(134,56,111,0.35)] bg-[rgba(134,56,111,0.08)]"
                      : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)]",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="truncate text-[15px] font-semibold text-[var(--text)]">
                        {c.project?.title ?? c.project?.projectCode ?? otherName}
                      </div>
                      <div className="mt-2 text-[13px] text-[var(--muted)]">
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
                      {isNew && !active ? (
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
      </CardBody>
    </Card>
  );

  const detail = (
    <Card>
      <CardHeader
        title={convo.project?.title ?? convo.project?.projectCode ?? "Conversation"}
        subtitle="Messages are private between you and the other party."
      />
      <CardBody>
        <div className="space-y-3">
          {convo.messages.map((m) => {
            const mine = m.senderId === userId;
            const attachments = Array.isArray(m.files) && m.files.length
                ? m.files
                    .filter((f) => f.purpose === "MESSAGE_ATTACHMENT")
                    .map((f) => f.url)
                    .filter(Boolean)
                : Array.isArray((m as any).attachments)
                  ? (m as any).attachments
                  : [];

            return (
              <div key={m.id} className={mine ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={[
                    "max-w-[80%] rounded-2xl px-4 py-3",
                    mine
                      ? "bg-[var(--plum-500)] text-white"
                      : "bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)]",
                  ].join(" ")}
                >
                  <div className="text-[12px] opacity-80">
                    {mine ? "You" : "Them"} • {new Date(m.createdAt).toLocaleString()}
                  </div>

                  {m.text ? (
                    <div className="mt-1 whitespace-pre-wrap text-[14px] leading-6">{m.text}</div>
                  ) : null}

                  <AttachmentGallery urls={attachments} mine={mine} />
                </div>
              </div>
            );
          })}
          <AutoScrollToBottom />
        </div>

        <div className="mt-6 border-t border-[var(--border)] pt-5">
          <MessageComposer
            conversationId={convo.id}
            projectTitle={convo.project?.title ?? convo.project?.projectCode ?? undefined}
            projectStatus={convo.project?.status ?? undefined}
          />

        </div>
      </CardBody>
    </Card>
  );

  return <MessagesShell list={list} detail={detail} />;
}
