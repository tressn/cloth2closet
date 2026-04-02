"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export default function RequestReviewButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function requestReview() {
    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch("/api/dressmakers/request-review", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to request review");

      setMsg("Requested — now pending review.");
      router.refresh();
    } catch (e: any) {
      setMsg(e?.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" onClick={requestReview} disabled={loading} variant="primary" className="w-full">
        {loading ? "Requesting..." : "Request review again"}
      </Button>
      {msg ? <div className="text-[12px] text-[var(--muted)]">{msg}</div> : null}
    </div>
  );
}