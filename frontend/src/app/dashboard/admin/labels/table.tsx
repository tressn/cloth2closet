"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Item = {
  id: string;
  name: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdBy?: { email?: string | null; name?: string | null } | null;
};

export default function AdminLabelsTable({ items }: { items: Item[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [rename, setRename] = useState<Record<string, string>>({});

  async function act(id: string, payload: any) {
    setLoadingId(id);
    try {
      const res = await fetch("/api/admin/labels", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed");
      window.location.reload();
    } catch (e: any) {
      alert(e?.message ?? "Error");
    } finally {
      setLoadingId(null);
    }
  }

  if (!items.length) return <div className="text-[14px] text-[var(--muted)]">No pending labels.</div>;

  return (
    <div className="grid gap-3">
      {items.map((l) => (
        <div key={l.id} className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[15px] font-semibold text-[var(--text)] truncate">{l.name}</div>
              <div className="mt-1 text-[12px] text-[var(--muted)]">
                Proposed by: {l.createdBy?.name ?? l.createdBy?.email ?? "Unknown"}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="secondary" disabled={loadingId === l.id} onClick={() => act(l.id, { action: "APPROVE" })}>
                Approve
              </Button>
              <Button variant="danger" disabled={loadingId === l.id} onClick={() => act(l.id, { action: "REJECT" })}>
                Reject
              </Button>
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            <div className="text-[12px] font-medium text-[var(--muted)]">Rename (optional)</div>
            <div className="flex items-center gap-2">
              <Input
                value={rename[l.id] ?? ""}
                onChange={(e) => setRename((s) => ({ ...s, [l.id]: e.target.value }))}
                placeholder="New standardized name"
              />
              <Button
                variant="ghost"
                disabled={loadingId === l.id || !(rename[l.id] ?? "").trim()}
                onClick={() => act(l.id, { action: "RENAME", name: rename[l.id] })}
              >
                Rename
              </Button>
              <Button
                variant="primary"
                disabled={loadingId === l.id || !(rename[l.id] ?? "").trim()}
                onClick={() => act(l.id, { action: "RENAME_APPROVE", name: rename[l.id] })}
              >
                Rename + Approve
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
