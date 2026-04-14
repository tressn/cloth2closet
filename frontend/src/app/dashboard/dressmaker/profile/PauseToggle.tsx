"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export default function PauseToggle({
  initialPaused,
}: {
  initialPaused: boolean;
}) {
  const [isPaused, setIsPaused] = useState(initialPaused);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const res = await fetch("/api/dressmakers/pause", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPaused: !isPaused }),
    });
    setLoading(false);

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data?.error ?? "Failed to update");
      return;
    }
    setIsPaused(!isPaused);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-[14px] font-semibold text-[var(--text)]">
          New projects
        </div>
        <Badge tone={isPaused ? "neutral" : "success"}>
          {isPaused ? "Paused" : "Open"}
        </Badge>
      </div>

      <Button
        type="button"
        onClick={toggle}
        disabled={loading}
        variant={isPaused ? "primary" : "secondary"}
        className="w-full"
      >
        {loading
          ? "Saving..."
          : isPaused
          ? "Resume taking projects"
          : "Pause new projects"}
      </Button>

      <div className="text-[12px] leading-5 text-[var(--muted)]">
        {isPaused
          ? "Your profile is hidden from search. Existing projects are unaffected."
          : "You appear in search and customers can send quote requests."}
      </div>
    </div>
  );
}