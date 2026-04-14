import Link from "next/link";
import { requireUser } from "@/lib/requiredRole";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import MessageComposer from "./MessageComposer";
import MessagesShell from "../MessagesShell";
import { getConversationDisplayMeta } from "@/lib/conversationTitle";
import MessagesViewport from "./MessagesViewport";

// REPLACE AttachmentGallery
function AttachmentGallery({
  urls,
  mine,
}: {
  urls: string[];
  mine: boolean;
}) {
  const safe = urls.filter(Boolean).slice(0, 10);
  if (!safe.length) return null;

  return (
    <div className="mt-3">
      <div className={["grid gap-2", safe.length === 1 ?  "grid-cols-1" : "grid-cols-2"].join(" ")}>
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
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`Photo ${idx + 1}`}
              loading="lazy"
              className="h-44 w-full object-cover"
            />
          </a>
        ))}
      </div>
      <div className={["mt-1 text-[11px]", mine ? "text-white/60" : "text-[var(--muted)]"].join(" ")}>
        {safe.length} photo{safe.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
function previewText(text?: string | null) {
  if (!text) return "";
  const firstLine = text
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0) ?? "";
  return firstLine.slice(0, 40);
}

function fmtTime(d: Date | string) {
  return new Date(d).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const userId = user.id;

  const convo = await prisma.conversation.findUnique({
    where: { id },
    include: {
      project: true,
      customer: { select: { id: true, name: true, username: true, email: true } },
      dressmaker: { select: { id: true, name: true, username: true, email: true } },
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

  await prisma.conversationRead.upsert({
    where: { conversationId_userId: { conversationId: id, userId } },
    update: { lastReadAt: new Date() },
    create: { conversationId: id, userId, lastReadAt: new Date() },
  });

  const otherParticipant =
    convo.customerId === userId ? convo.dressmaker : convo.customer;

  function displayName(p?: {
    name?: string | null;
    username?: string | null;
    email?: string | null;
  }) {
    if (!p) return "Them";
    return p.name ?? p.username ?? p.email?.split("@")[0] ?? "Them";
  }

  const otherName = displayName(otherParticipant);

  const convoDisplay = getConversationDisplayMeta({
    project: convo.project,
    customer: convo.customer,
    otherParticipant,
    isProjectConversation: !!convo.projectId,
  });

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
      conversationReads: { where: { userId }, take: 1, select: { lastReadAt: true } },
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
        {convos.map((c) => {
          const last = c.messages[0];
          const lastText = previewText(last?.text);
          const photoCount =
            last?.files?.filter((f) => f.purpose === "MESSAGE_ATTACHMENT").length ?? 0;

          const read = c.conversationReads[0]?.lastReadAt ?? null;
          const lastAt = last?.createdAt ?? c.updatedAt;
          const isNew = read ? lastAt > read : true;
          const active = c.id === convo.id;

          const other = c.customerId === userId ? c.dressmaker : c.customer;
          const display = getConversationDisplayMeta({
            project: c.project,
            customer: c.customer,
            otherParticipant: other,
            isProjectConversation: !!c.projectId,
          });

          return (
            <Link key={c.id} href={`/messages/${c.id}`} className="block">
              <div
                className={[
                  "w-full min-w-0 overflow-hidden rounded-xl border px-4 py-3 transition-colors",
                  active
                    ? "border-[rgba(134,56,111,0.35)] bg-[rgba(134,56,111,0.07)]"
                    : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)]",
                ].join(" ")}
              >
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
                    {isNew && !active ? (
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
        })}
      </div>
    </div>
  );

  const detail = (
    <div className="flex flex-col h-full overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)]">

      <div className="shrink-0 border-b border-[var(--border)] px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[17px] font-semibold text-[var(--text)] truncate">
              {convoDisplay.title}
            </div>
            {convoDisplay.subtitle ? (
              <div className="mt-0.5 text-[13px] text-[var(--muted)] truncate">
                {convoDisplay.subtitle}
              </div>
            ) : null}
            {convoDisplay.detail ? (
              <div className="text-[11px] text-[var(--muted)] opacity-70 truncate">
                {convoDisplay.detail} · Private conversation
              </div>
            ) : (
              <div className="text-[11px] text-[var(--muted)] opacity-70">
                Private conversation
              </div>
            )}
          </div>

          {convo.project ? (
            <Link
              href={`/dashboard/${
                convo.dressmakerId === userId ? "dressmaker" : "customer"
              }/projects/${convo.project.id}`}
              className="shrink-0 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-[12px] font-medium text-[var(--text)] hover:bg-[var(--border)] transition-colors"
            >
              View project →
            </Link>
          ) : null}
        </div>
      </div>

      <MessagesViewport>
        {convo.messages.map((m) => {
          const mine = m.senderId === userId;

          const attachments = Array.isArray(m.files)
            ? m.files
                .filter((f) => f.purpose === "MESSAGE_ATTACHMENT")
                .map((f) => f.url)
                .filter(Boolean)
            : [];

          return (
            <div
              key={m.id}
              className={mine ? "flex justify-end px-4" : "flex justify-start px-4"}
            >
              <div
                className={[
                  "min-w-0 overflow-hidden rounded-2xl px-4 py-3",
                  "w-fit max-w-[320px]",
                  mine
                    ? "bg-[var(--plum-500)] text-white"
                    : "border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)]",
                ].join(" ")}
              >
                <div
                  className={[
                    "text-[11px] font-medium mb-1",
                    mine ? "text-white/70" : "text-[var(--muted)]",
                  ].join(" ")}
                >
                  {mine ? "You" : otherName} · {fmtTime(m.createdAt)}
                </div>

                {m.text ? (
                  <div className="whitespace-pre-wrap break-words text-[14px] leading-[1.55]">
                    {m.text}
                  </div>
                ) : null}

                <AttachmentGallery urls={attachments} mine={mine} />
              </div>
            </div>
          );
        })}
      </MessagesViewport>

      <div className="shrink-0 border-t border-[var(--border)] px-5 py-4">
        <MessageComposer
          conversationId={convo.id}
          projectTitle={
            convo.project?.title ?? convo.project?.projectCode ?? undefined
          }
          projectStatus={convo.project?.status ?? undefined}
        />
      </div>
    </div>
  );

  return <MessagesShell list={list} detail={detail} />;
}