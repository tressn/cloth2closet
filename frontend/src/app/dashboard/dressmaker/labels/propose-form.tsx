"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function ProposeLabelForm() {
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    const n = name.trim();
    if (!n) return;

    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch("/api/labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: n }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to propose label");

      setName("");
      setMsg(data?.created ? "Proposed! Pending admin approval." : "Already exists.");
      window.location.reload();
    } catch (e: any) {
      setMsg(e?.message ?? "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-3 max-w-lg">
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. bridal" />
      <div className="flex items-center justify-between gap-3">
        <div className="text-[13px] text-[var(--muted)]">{msg ?? " "}</div>
        <Button type="button" variant="primary" disabled={loading || !name.trim()} onClick={submit}>
          {loading ? "Submitting..." : "Propose"}
        </Button>
      </div>
    </div>
  );
}
