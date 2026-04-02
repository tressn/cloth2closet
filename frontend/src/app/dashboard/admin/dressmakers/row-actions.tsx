"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Approval = "PENDING" | "APPROVED" | "REJECTED";

export default function DressmakerRowActions({
  dressmakerProfileId,
  approvalStatus,
}: {
  dressmakerProfileId: string;
  approvalStatus: Approval;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function approve() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/dressmakers/${dressmakerProfileId}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(await res.text());
      setMsg("Approved");
      router.refresh();
    } catch (e: any) {
      setMsg(e?.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function reject() {
    const reason = window.prompt("Rejection reason (shown internally & to dressmaker):", "");
    if (reason == null) return;

    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/dressmakers/${dressmakerProfileId}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error(await res.text());
      setMsg("Rejected");
      router.refresh();
    } catch (e: any) {
      setMsg(e?.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={approve}
        disabled={loading || approvalStatus === "APPROVED"}
        className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 font-medium hover:bg-[var(--border)] disabled:opacity-50"
      >
        Approve
      </button>

      <button
        onClick={reject}
        disabled={loading || approvalStatus === "REJECTED"}
        className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 font-medium hover:bg-[var(--border)] disabled:opacity-50"
      >
        Reject
      </button>

      {msg ? <span className="text-[12px] text-[var(--muted)]">{msg}</span> : null}
    </div>
  );
}