"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export default function DeleteButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false);

  async function onDelete() {
    if (!confirm("Delete this portfolio item?")) return;

    setLoading(true);
    const res = await fetch(`/api/portfolio-items/${id}`, { method: "DELETE" });
    setLoading(false);

    if (!res.ok) {
      alert("Delete failed");
      return;
    }

    window.location.reload();
  }

  return (
    <Button type="button" onClick={onDelete} disabled={loading} variant="danger" size="sm">
      {loading ? "Deleting…" : "Delete"}
    </Button>
  );
}
