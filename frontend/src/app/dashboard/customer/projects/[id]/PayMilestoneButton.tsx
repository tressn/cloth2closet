"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

type Props = {
  projectId: string;
  milestoneType: "DEPOSIT" | "FINAL";
  disabled?: boolean;
};

export default function PayMilestoneButton({
  projectId,
  milestoneType,
  disabled,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/payments/checkout?projectId=${encodeURIComponent(projectId)}&milestoneType=${milestoneType}`,
        { method: "POST" }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error ?? `Checkout failed (HTTP ${res.status})`);
      }

      if (!data.url) {
        throw new Error("Missing checkout URL.");
      }

      window.location.href = data.url;
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong.");
      setLoading(false);
    }
  }

  const label =
    milestoneType === "DEPOSIT" ? "Pay deposit" : "Pay final payment";

  return (
    <div className="space-y-2">
      <Button onClick={onClick} disabled={disabled || loading}>
        {loading ? "Opening Stripe Checkout..." : label}
      </Button>
      {error ? (
        <div className="text-[13px] text-red-600">{error}</div>
      ) : null}
      <p className="text-[12px] text-[var(--muted)]">
        By paying you confirm the deposit is non-refundable and agree to
        our{" "}
        <a href="/terms" className="underline">
          Terms of Service
        </a>
        .
      </p>
    </div>
  );
}