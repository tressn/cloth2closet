"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export default function AdminMessageButton({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/conversations/admin-dm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: userId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed");

      router.push(`/messages/${data.conversationId}`);
    } catch (e: any) {
      alert(e?.message ?? "Failed to start conversation");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="secondary" onClick={onClick} disabled={loading}>
      {loading ? "Opening…" : "Message user"}
    </Button>
  );
}