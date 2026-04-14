"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type TicketStatus = "OPEN" | "IN_PROGRESS" | "CLOSED";

export default function TicketStatusActions({
  ticketId,
  currentStatus,
}: {
  ticketId: string;
  currentStatus: TicketStatus;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<TicketStatus | null>(null);
  const [error, setError] = useState("");

  async function updateStatus(nextStatus: TicketStatus) {
    if (nextStatus === currentStatus) return;

    setLoading(nextStatus);
    setError("");

    try {
      const res = await fetch(`/api/support/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Failed to update ticket.");
      }

      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Failed to update ticket.");
    } finally {
      setLoading(null);
    }
  }

  const baseButton =
    "rounded-full border px-3 py-1 text-[12px] font-medium transition disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={() => updateStatus("OPEN")}
          disabled={loading !== null || currentStatus === "OPEN"}
          className={`${baseButton} border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-2)]`}
        >
          {loading === "OPEN" ? "Saving..." : "Reopen"}
        </button>

        <button
          type="button"
          onClick={() => updateStatus("IN_PROGRESS")}
          disabled={loading !== null || currentStatus === "IN_PROGRESS"}
          className={`${baseButton} border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-2)]`}
        >
          {loading === "IN_PROGRESS" ? "Saving..." : "In progress"}
        </button>

        <button
          type="button"
          onClick={() => updateStatus("CLOSED")}
          disabled={loading !== null || currentStatus === "CLOSED"}
          className={`${baseButton} border-transparent bg-[var(--plum-500)] text-white hover:opacity-90`}
        >
          {loading === "CLOSED" ? "Closing..." : "Close"}
        </button>
      </div>

      {error ? (
        <div className="max-w-[220px] text-right text-[12px] text-red-600">
          {error}
        </div>
      ) : null}
    </div>
  );
}