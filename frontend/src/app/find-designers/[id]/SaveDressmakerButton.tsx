"use client";

import { useState } from "react";

export default function SaveDressmakerButton({
  dressmakerProfileId,
  initialSaved = false,
  isAuthed = true,
}: {
  dressmakerProfileId: string;
  initialSaved: boolean;
  isAuthed?: boolean;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      const res = await fetch("/api/customer/saved-dressmakers", {
        method: saved ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dressmakerProfileId }),
      });
      if (!res.ok) throw new Error(await res.text());
      setSaved(!saved);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="h-11 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 font-medium hover:bg-[var(--border)] disabled:opacity-50"
    >
      {saved ? "Saved" : "Save"}
    </button>
  );
}