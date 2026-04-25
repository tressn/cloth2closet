"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export default function SetupPayoutButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/dressmakers/payout/onboard", {
        method: "POST",
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error ?? "Something went wrong");
      }

      if (data.url) {
        window.location.href = data.url;
        return;
      }
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button variant="primary" onClick={handleClick} disabled={loading}>
        {loading ? "Setting up…" : "Set up payouts"}
      </Button>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-[13px] text-red-700">
          {error}
        </div>
      ) : null}
    </div>
  );
}