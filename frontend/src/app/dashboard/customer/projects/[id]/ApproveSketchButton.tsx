"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export default function ApproveSketchButton({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onApprove() {
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/workflow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "APPROVE_SKETCH" }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to approve sketch");
      }

      setMessage("Sketch approved.");
      window.location.reload();
    } catch (e: any) {
      setMessage(e?.message ?? "Failed to approve sketch");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="primary" disabled={loading} onClick={onApprove}>
        {loading ? "Approving..." : "Approve sketch"}
      </Button>
      {message ? <div className="text-[13px] text-[var(--muted)]">{message}</div> : null}
    </div>
  );
}