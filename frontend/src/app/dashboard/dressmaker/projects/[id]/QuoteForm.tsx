"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

function dollarsFromCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function QuoteForm({
  projectId,
  existingAmount,
  currency,
  existingDepositPercent,
}: {
  projectId: string;
  existingAmount: number | null; // full quote in cents
  currency: string;
  existingDepositPercent?: number | null;
}) {
  const [amount, setAmount] = useState(existingAmount != null ? String(existingAmount) : "");
  const [depositPercent, setDepositPercent] = useState(
    existingDepositPercent != null ? String(existingDepositPercent) : "50"
  );

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const parsedAmount = useMemo(() => {
    const n = Number(amount);
    return Number.isFinite(n) ? Math.trunc(n) : NaN;
  }, [amount]);

  const parsedPercent = useMemo(() => {
    const n = Number(depositPercent);
    return Number.isFinite(n) ? Math.trunc(n) : NaN;
  }, [depositPercent]);

  const depositAmount = useMemo(() => {
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return null;
    if (!Number.isFinite(parsedPercent)) return null;
    return Math.max(1, Math.trunc((parsedAmount * parsedPercent) / 100));
  }, [parsedAmount, parsedPercent]);

  const percentOk = Number.isFinite(parsedPercent) && parsedPercent >= 25 && parsedPercent <= 75;

  async function submit() {
    setLoading(true);
    setMsg(null);

    try {
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        throw new Error("Enter a valid total quote amount in cents.");
      }
      if (!percentOk) {
        throw new Error("Deposit percent must be between 25 and 75.");
      }

      const res = await fetch(`/api/projects/${projectId}/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quotedTotalAmount: parsedAmount,
          depositPercent: parsedPercent,
          currency,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed");

      window.location.reload();
    } catch (e: any) {
      setMsg(e?.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-3 max-w-md">
      <label className="grid gap-2">
        <div className="text-[12px] font-medium text-[var(--muted)]">Total quote (cents)</div>
        <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="50000" />
        <div className="text-[12px] leading-5 text-[var(--muted)]">
          Stored in cents. Example: 50000 = {dollarsFromCents(50000)}.
        </div>
      </label>

      <label className="grid gap-2">
        <div className="text-[12px] font-medium text-[var(--muted)]">Deposit percent (25–75)</div>
        <Input value={depositPercent} onChange={(e) => setDepositPercent(e.target.value)} placeholder="50" />
        <div className="text-[12px] leading-5 text-[var(--muted)]">
          Customers pay the deposit now. Remaining balance can be handled later.
        </div>
        {!percentOk ? (
          <div className="text-[12px] text-[var(--danger)]">Deposit must be between 25% and 75%.</div>
        ) : null}
      </label>

      {depositAmount != null && percentOk && Number.isFinite(parsedAmount) && parsedAmount > 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[13px] text-[var(--muted)]">
          Deposit due now: <span className="font-semibold text-[var(--text)]">{dollarsFromCents(depositAmount)}</span>{" "}
          ({parsedPercent}% of {dollarsFromCents(parsedAmount)})
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <div className="text-[13px] text-[var(--muted)]">{msg ?? " "}</div>
        <Button
          type="button"
          onClick={submit}
          disabled={loading || !amount.trim() || !depositPercent.trim() || !percentOk}
          variant="primary"
        >
          {loading ? "Saving…" : "Approve quote"}
        </Button>
      </div>
    </div>
  );
}
