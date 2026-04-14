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
  depositAlreadyPaid = false,
  depositPaidAmount = null,
}: {
  projectId: string;
  existingAmount: number | null;
  currency: string;
  existingDepositPercent?: number | null;
  depositAlreadyPaid?: boolean;
  depositPaidAmount?: number | null;
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

  // When deposit already paid, preview shows remaining balance
  // When not yet paid, preview shows deposit amount
  const previewData = useMemo(() => {
    if (!Number.isFinite(amountDollars) || amountDollars <= 0) return null;

    if (depositAlreadyPaid && depositPaidAmount != null) {
      // ✅ depositPaidAmount is in cents, convert to dollars
      const depositDollars = depositPaidAmount / 100;
      const remainingDollars = amountDollars - depositDollars;
      if (remainingDollars <= 0) return null;
      return {
        label: "Remaining balance customer owes",
        amount: remainingDollars,
        // ✅ Show the breakdown clearly without mentioning percent
        sub: `New total ${formatDollars(amountDollars, currency)} − deposit paid ${formatDollars(depositDollars, currency)}`,
      };
    }

    // Not yet paid — show deposit preview with percent
    if (!percentOk) return null;
    const depositDollars = (amountDollars * parsedPercent) / 100;
    return {
      label: "Deposit customer pays now",
      amount: depositDollars,
      sub: `${parsedPercent}% of ${formatDollars(amountDollars, currency)}`,
    };
  }, [amountDollars, parsedPercent, percentOk, depositAlreadyPaid, depositPaidAmount, currency]);

  async function submit() {
    setLoading(true);
    setMsg(null);

    try {
      if (!Number.isFinite(amountInCents) || amountInCents <= 0) {
        throw new Error("Enter a valid amount.");
      }

      if (!depositAlreadyPaid && !percentOk) {
        throw new Error("Deposit percent must be between 25 and 75.");
      }

      const res = await fetch(`/api/projects/${projectId}/quote`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quotedTotalAmount: amountInCents,
          depositPercent: parsedPercent,
          currency,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed");

      setMsg(depositAlreadyPaid ? "Invoice updated." : "Quote sent.");
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
          {depositAlreadyPaid ? "New total (including shipping and any extras)" : "Total quote"}
        </div>
        <Input
          value={amountInput}
          onChange={(e) => setAmountInput(e.target.value)}
          placeholder="1200.00"
          inputMode="decimal"
        />
        <div className="text-[12px] leading-5 text-[var(--muted)]">
          {depositAlreadyPaid
            ? "Enter the updated full project total. The customer will pay the difference."
            : "Enter the full amount the customer will pay in total."}
        </div>
      </label>

      {/* ✅ Only show deposit percent when deposit not yet paid */}
      {!depositAlreadyPaid ? (
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
            Portion the customer pays upfront (25–75%).
          </div>
          {!percentOk ? (
            <div className="text-[12px] text-[var(--danger)]">
              Deposit must be between 25% and 75%.
            </div>
          ) : null}
        </label>
      ) : null}

      {/* ✅ Preview shows remaining balance when deposit paid, deposit amount otherwise */}
      {previewData ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
          <div className="text-[12px] uppercase tracking-wide text-[var(--muted)]">
            {depositAlreadyPaid ? "Updated balance" : "Payment preview"}
          </div>
          <div className="mt-2 text-[14px] text-[var(--text)]">
            {previewData.label}:{" "}
            <span className="font-semibold">
              {formatDollars(previewData.amount, currency)}
            </span>
          </div>
          {/* ✅ Only show the sub line — no percent shown when deposit already paid */}
          <div className="mt-1 text-[13px] text-[var(--muted)]">{previewData.sub}</div>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <div className="text-[13px] text-[var(--muted)]">{msg ?? " "}</div>
        <Button
          type="button"
          onClick={submit}
          disabled={loading || !amountInput.trim() || (!depositAlreadyPaid && !percentOk)}
          variant="primary"
        >
          {loading
            ? "Saving…"
            : depositAlreadyPaid
            ? "Update invoice"
            : "Send quote"}
        </Button>
      </div>
    </div>
  );
}