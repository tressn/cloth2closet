"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { centsToInputValue, dollarsInputToCents } from "@/lib/money";

function formatDollars(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function QuoteForm({
  projectId,
  existingAmount,
  currency,
  existingDepositPercent,
}: {
  projectId: string;
  existingAmount: number | null;
  currency: string;
  existingDepositPercent?: number | null;
}) {
  const [amountInput, setAmountInput] = useState(centsToInputValue(existingAmount));
  const [depositPercent, setDepositPercent] = useState(
    existingDepositPercent != null ? String(existingDepositPercent) : "50"
  );

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const amountDollars = useMemo(() => {
    const normalized = amountInput.replace(/[^0-9.]/g, "");
    const value = Number.parseFloat(normalized);
    return Number.isFinite(value) && value > 0 ? value : NaN;
  }, [amountInput]);

  const amountInCents = useMemo(() => {
    try {
      if (!amountInput.trim()) return NaN;
      return dollarsInputToCents(amountInput);
    } catch {
      return NaN;
    }
  }, [amountInput]);

  const parsedPercent = useMemo(() => {
    const n = Number(depositPercent);
    return Number.isFinite(n) ? Math.trunc(n) : NaN;
  }, [depositPercent]);

  const percentOk =
    Number.isFinite(parsedPercent) && parsedPercent >= 25 && parsedPercent <= 75;

  const depositDollars = useMemo(() => {
    if (!Number.isFinite(amountDollars) || amountDollars <= 0) return null;
    if (!percentOk) return null;
    return (amountDollars * parsedPercent) / 100;
  }, [amountDollars, parsedPercent, percentOk]);

  async function submit() {
    setLoading(true);
    setMsg(null);

    try {
      if (!Number.isFinite(amountInCents) || amountInCents <= 0) {
        throw new Error("Enter a valid quote amount.");
      }

      if (!percentOk) {
        throw new Error("Deposit percent must be between 25 and 75.");
      }

      const res = await fetch(`/api/projects/${projectId}/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quotedTotalAmount: amountInCents,
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
    <div className="grid max-w-md gap-4">
      <label className="grid gap-2">
        <div className="text-[12px] font-medium text-[var(--muted)]">
          Total quote
        </div>
        <Input
          value={amountInput}
          onChange={(e) => setAmountInput(e.target.value)}
          placeholder="1200.00"
          inputMode="decimal"
        />
        <div className="text-[12px] leading-5 text-[var(--muted)]">
          Enter the full amount the customer will see.
        </div>
      </label>

      <label className="grid gap-2">
        <div className="text-[12px] font-medium text-[var(--muted)]">
          Deposit percent
        </div>
        <Input
          value={depositPercent}
          onChange={(e) => setDepositPercent(e.target.value)}
          placeholder="50"
          inputMode="numeric"
        />
        <div className="text-[12px] leading-5 text-[var(--muted)]">
          This is the portion the customer pays now.
        </div>
        {!percentOk ? (
          <div className="text-[12px] text-[var(--danger)]">
            Deposit must be between 25% and 75%.
          </div>
        ) : null}
      </label>

      {depositDollars != null && Number.isFinite(amountDollars) && percentOk ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
          <div className="text-[12px] uppercase tracking-wide text-[var(--muted)]">
            Payment preview
          </div>
          <div className="mt-2 text-[14px] text-[var(--text)]">
            Customer pays now:{" "}
            <span className="font-semibold">
              {formatDollars(depositDollars, currency)}
            </span>
          </div>
          <div className="mt-1 text-[13px] text-[var(--muted)]">
            {parsedPercent}% of {formatDollars(amountDollars, currency)}
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <div className="text-[13px] text-[var(--muted)]">{msg ?? " "}</div>
        <Button
          type="button"
          onClick={submit}
          disabled={loading || !amountInput.trim() || !depositPercent.trim() || !percentOk}
          variant="primary"
        >
          {loading ? "Saving…" : "Save quote"}
        </Button>
      </div>
    </div>
  );
}