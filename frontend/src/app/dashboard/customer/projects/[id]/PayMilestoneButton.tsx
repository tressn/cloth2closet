"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

type Props = {
  projectId: string;
  milestoneType: "DEPOSIT" | "FINAL";
  disabled?: boolean;
};

export default function PayMilestoneButton({ projectId, milestoneType, disabled }: Props) {
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

      // This endpoint redirects (303). fetch doesn't navigate cross-origin automatically.
      const redirectUrl = res.url;

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `Checkout failed (HTTP ${res.status})`);
      }

      if (!redirectUrl) throw new Error("Missing redirect URL.");

      window.location.href = redirectUrl;
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
      {error ? <div className="text-[13px] text-red-600">{error}</div> : null}
    </div>
  );
}
