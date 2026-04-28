"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

type Convo = {
  id: string;
  updatedAt: string;
  projectId: string | null;
  project: { title: string | null; projectCode: string } | null;
  customer: { name: string | null; username: string | null; email: string | null };
  dressmaker: { name: string | null; username: string | null; email: string | null };
  messages: { text: string | null; createdAt: string }[];
};

function name(p: { name: string | null; username: string | null; email: string | null }) {
  return p.name ?? p.username ?? p.email?.split("@")[0] ?? "—";
}

export default function AdminViewConversations({ userId }: { userId: string }) {
  const [convos, setConvos] = useState<Convo[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function load() {
    if (convos) {
      setOpen((v) => !v);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/conversations`);
      const data = await res.json();
      setConvos(data.conversations ?? []);
      setOpen(true);
    } catch {
      setConvos([]);
      setOpen(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
        {loading ? "Loading…" : open ? "Hide convos" : "View convos"}
      </Button>

      {open && convos ? (
        <div className="mt-2 grid gap-1.5">
          {convos.length === 0 ? (
            <div className="text-[12px] text-[var(--muted)]">No conversations.</div>
          ) : (
            convos.map((c) => {
              const preview = c.messages[0]?.text?.slice(0, 50) ?? "(no messages)";
              const label = c.project
                ? c.project.title ?? c.project.projectCode
                : `${name(c.customer)} ↔ ${name(c.dressmaker)}`;

              return (
                <Link
                  key={c.id}
                  href={`/messages/${c.id}`}
                  className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[12px] hover:bg-[var(--surface-2)]"
                >
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-[var(--text)]">
                      {label}
                      {!c.projectId ? (
                        <span className="ml-1.5 rounded-full bg-[var(--plum-200)] px-2 py-0.5 text-[10px] font-semibold text-[var(--plum-700)]">
                          DM
                        </span>
                      ) : null}
                    </div>
                    <div className="truncate text-[var(--muted)]">{preview}</div>
                  </div>
                  <span className="shrink-0 text-[var(--muted)]">→</span>
                </Link>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}