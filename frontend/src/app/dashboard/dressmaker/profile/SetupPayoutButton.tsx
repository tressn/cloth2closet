"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export default function SetupPayoutButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/dressmakers/payout/onboard", {
        method: "POST",
      });

      // The API returns a 303 redirect to Stripe onboarding.
      // fetch() won't automatically navigate for cross-origin redirects,
      // so we read the final URL and redirect the browser ourselves.
      const redirectUrl = res.url;

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `Failed to start payout setup (HTTP ${res.status})`);
      }

      // If for some reason there's no URL, fail clearly
      if (!redirectUrl) {
        throw new Error("Missing redirect URL from payout onboarding endpoint.");
      }

      window.location.href = redirectUrl;
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button onClick={onClick} disabled={loading}>
        {loading ? "Opening Stripe onboarding..." : "Set up payouts"}
      </Button>

      {error ? (
        <div className="text-[13px] text-red-600">
          {error}
        </div>
      ) : (
        <div className="text-[13px] leading-5 text-[var(--muted)]">
          This opens Stripe’s secure onboarding so you can receive payouts.
        </div>
      )}
    </div>
  );
}
