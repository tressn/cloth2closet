"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function QuoteForm({
  projectId,
  existingAmount,
  currency,
}: {
  projectId: string;
  existingAmount: number | null;
  currency: string;
}) {
  const [amount, setAmount] = useState(existingAmount != null ? String(existingAmount) : "");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setMsg(null);

    const res = await fetch(`/api/projects/${projectId}/quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quotedTotalAmount: Number(amount), currency }),
    });

    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) setMsg(data?.error ?? "Failed");
    else window.location.reload();
  }

  return (
    <div className="grid gap-3 max-w-md">
      <label className="grid gap-2">
        <div className="text-[12px] font-medium text-[var(--muted)]">Total quote (cents)</div>
        <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="50000" />
        <div className="text-[12px] leading-5 text-[var(--muted)]">
          Stored in cents. Example: 50000 = $500.00
        </div>
      </label>

      <div className="flex items-center justify-between gap-3">
        <div className="text-[13px] text-[var(--muted)]">{msg ?? " "}</div>
        <Button type="button" onClick={submit} disabled={loading || !amount.trim()} variant="primary">
          {loading ? "Saving…" : "Save quote"}
        </Button>
      </div>
    </div>
  );
}
