"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export default function PublishToggle({ initialPublished }: { initialPublished: boolean }) {
  const [isPublished, setIsPublished] = useState(initialPublished);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const next = !isPublished;

    const res = await fetch("/api/dressmakers/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: next }),
    });

    setLoading(false);

    if (!res.ok) {
      alert("Failed to update publish status");
      return;
    }
    setIsPublished(next);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-[14px] font-semibold text-[var(--text)]">Current</div>
        <Badge tone={isPublished ? "success" : "neutral"}>
          {isPublished ? "Published" : "Unpublished"}
        </Badge>
      </div>

      <Button type="button" onClick={toggle} disabled={loading} variant={isPublished ? "secondary" : "primary"} className="w-full">
        {loading ? "Saving..." : isPublished ? "Unpublish profile" : "Publish profile"}
      </Button>

      <div className="text-[12px] leading-5 text-[var(--muted)]">
        Published profiles appear in search and can be messaged by customers.
      </div>
    </div>
  );
}
