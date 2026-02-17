"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";

export default function SaveDressmakerButton({
  dressmakerProfileId,
  initialSaved,
  isAuthed,
}: {
  dressmakerProfileId: string;
  initialSaved: boolean;
  isAuthed: boolean;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [isPending, startTransition] = useTransition();

  function redirectToLogin() {
    window.location.href = `/login?callbackUrl=${encodeURIComponent(
      `/dressmakers/${dressmakerProfileId}`
    )}`;
  }

  function toggle() {
    if (!isAuthed) return redirectToLogin();

    const next = !saved;

    // optimistic UI
    setSaved(next);

    startTransition(async () => {
      try {
        const res = await fetch("/api/customer/saved-dressmakers", {
          method: next ? "POST" : "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dressmakerProfileId }),
        });

        if (!res.ok) throw new Error();
      } catch {
        // revert if failed
        setSaved(!next);
      }
    });
  }

  return (
    <Button
      type="button"
      variant={saved ? "secondary" : "ghost"}
      disabled={isPending}
      onClick={toggle}
      aria-pressed={saved}
    >
      {isPending ? "..." : saved ? "Saved" : "Save"}
    </Button>
  );
}
