"use client"
import { useState } from "react"

export default function RequestForm({ dressmakerProfileId }: { dressmakerProfileId: string }) {
  const [eventDate, setEventDate] = useState("")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function submit() {
    setLoading(true)
    setMsg(null)

    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dressmakerProfileId,
        eventDate: eventDate || null,
        fabricNotes: notes,
      }),
    })

    const data = await res.json().catch(() => ({}))
    setLoading(false)

    if (!res.ok) {
      setMsg(data?.error ?? "Failed to create request")
      return
    }

    window.location.href = `/messages/${data.conversationId}`
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <label>
        <div>Event date (optional)</div>
        <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
      </label>

      <label>
        <div>Describe what you want</div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          style={{ minHeight: 120 }}
          placeholder="What do you want made? Any deadlines, fabric notes, references..."
        />
      </label>

      <button type="button" onClick={submit} disabled={loading} style={{ padding: 10 }}>
        {loading ? "Sending..." : "Send request"}
      </button>

      {msg && <p>{msg}</p>}
    </div>
  )
}
