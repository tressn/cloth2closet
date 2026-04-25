"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export default function SendFinalInvoiceButton({
  projectId,
}: {
  projectId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/send-invoice`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error ?? "Something went wrong");
      }

      setSent(true);
      window.location.reload();
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="text-[13px] text-green-600 font-medium">
        ✓ Final invoice sent to customer
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button variant="primary" onClick={handleClick} disabled={loading}>
        {loading ? "Sending…" : "Send final invoice to customer"}
      </Button>
      <p className="text-[12px] text-[var(--muted)]">
        Make sure shipping and any extras are included in the total before
        sending. The customer will be able to pay once you send this.
      </p>
      {error ? (
        <div className="text-[13px] text-red-600">{error}</div>
      ) : null}
    </div>
  );
}