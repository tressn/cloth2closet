"use client";

import { useState } from "react";

export default function ReleaseButton({ milestoneId, disabled }: { milestoneId: string; disabled?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/payouts/milestones/${milestoneId}/release`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Release failed");
      setMsg(data.skipped ? "Already handled" : "Released");
      window.location.reload();
    } catch (e: any) {
      setMsg(e?.message ?? "Release failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-2">
      <button
        onClick={run}
        disabled={disabled || loading}
        className="h-10 rounded-xl bg-[var(--plum-500)] px-4 font-medium text-white hover:bg-[var(--plum-600)] disabled:opacity-50"
      >
        {loading ? "Releasing…" : "Release"}
      </button>
      {msg ? <div className="text-[12px] text-[var(--muted)]">{msg}</div> : null}
    </div>
  );
}