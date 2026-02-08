"use client"

import { useState } from "react"

export default function MessageButton({ dressmakerUserId }: { dressmakerUserId: string }) {
  const [loading, setLoading] = useState(false)

  async function onClick() {
    setLoading(true)

    const res = await fetch("/api/conversations/dm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dressmakerUserId }),
    })

    const data = await res.json().catch(() => ({}))
    setLoading(false)

    if (!res.ok) {
      alert(data?.error ?? "Failed to start conversation")
      return
    }

    window.location.href = `/messages/${data.conversationId}`
  }

  return (
    <button type="button" onClick={onClick} disabled={loading} style={{ padding: "10px 12px", borderRadius: 10 }}>
      {loading ? "Opening..." : "Message"}
    </button>
  )
}
