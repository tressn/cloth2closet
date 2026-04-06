"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";

export default function DressmakerNotesCard({
  projectId,
  initialValue,
}: {
  projectId: string;
  initialValue?: string | null;
}) {
  const [notes, setNotes] = useState(initialValue ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSave() {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/dressmaker-notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to save notes");
      }

      setMessage("Saved");
    } catch (e: any) {
      setMessage(e?.message ?? "Failed to save notes");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Add private fit notes, sourcing notes, reminders, or internal client preferences…"
        className="min-h-[180px]"
      />

      <div className="flex items-center justify-between gap-3">
        <div className="text-[13px] text-[var(--muted)]">
          {message ?? "Visible only to the assigned dressmaker and admins."}
        </div>
        <Button type="button" variant="primary" onClick={onSave} disabled={saving}>
          {saving ? "Saving…" : "Save notes"}
        </Button>
      </div>
    </div>
  );
}