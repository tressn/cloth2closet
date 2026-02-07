"use client"
import { useState } from "react"

export default function MessageComposer({ conversationId }: { conversationId: string }) {
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function send() {
    const t = text.trim()
    if (!t) return

    setLoading(true)
    setError(null)

    const res = await fetch(`/api/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: t }),
    })

    const data = await res.json().catch(() => ({}))
    setLoading(false)

    if (!res.ok) {
      setError(data?.error ?? "Failed to send")
      return
    }

    window.location.reload()
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <textarea value={text} onChange={(e) => setText(e.target.value)} style={{ minHeight: 80 }} />
      <button type="button" onClick={send} disabled={loading} style={{ padding: 10 }}>
        {loading ? "Sending..." : "Send"}
      </button>
      {error && <p>{error}</p>}
    </div>
  )
}
