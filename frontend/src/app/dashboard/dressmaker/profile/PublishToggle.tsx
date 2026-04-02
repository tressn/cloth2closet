"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

type Approval = "PENDING" | "APPROVED" | "REJECTED";

export default function PublishToggle({
  initialPublished,
  approvalStatus,
  rejectionReason,
}: {
  initialPublished: boolean;
  approvalStatus: Approval;
  rejectionReason?: string | null;
}) {
  const [isPublished, setIsPublished] = useState(initialPublished);
  const [loading, setLoading] = useState(false);

  const canPublish = approvalStatus === "APPROVED";

  async function toggle() {
    if (!canPublish) return;
    setLoading(true);
    const next = !isPublished;

    const res = await fetch("/api/dressmakers/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: next }),
    });

    setLoading(false);

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data?.error ?? "Failed to update publish status");
      return;
    }
    setIsPublished(next);
  }

  const statusBadge =
    approvalStatus === "APPROVED"
      ? isPublished
        ? { tone: "success" as const, text: "Published" }
        : { tone: "neutral" as const, text: "Unpublished" }
      : approvalStatus === "PENDING"
      ? { tone: "featured" as const, text: "Pending review" }
      : { tone: "danger" as const, text: "Needs changes" };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-[14px] font-semibold text-[var(--text)]">Status</div>
        <Badge tone={statusBadge.tone}>{statusBadge.text}</Badge>
      </div>

      {approvalStatus === "REJECTED" && rejectionReason ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[13px] leading-6 text-[var(--muted)]">
          <div className="font-semibold text-[var(--text)]">Admin feedback</div>
          <div className="mt-1">{rejectionReason}</div>
        </div>
      ) : null}

      <Button
        type="button"
        onClick={toggle}
        disabled={loading || !canPublish}
        variant={isPublished ? "secondary" : "primary"}
        className="w-full"
      >
        {loading
          ? "Saving..."
          : !canPublish
          ? "Publishing locked"
          : isPublished
          ? "Unpublish profile"
          : "Publish profile"}
      </Button>

      <div className="text-[12px] leading-5 text-[var(--muted)]">
        {approvalStatus === "APPROVED"
          ? "Published profiles appear in search and can be messaged by customers."
          : approvalStatus === "PENDING"
          ? "Your profile is under review. You’ll be able to publish once approved."
          : "Update your profile based on the feedback above, then request review again."}
      </div>
    </div>
  );
}