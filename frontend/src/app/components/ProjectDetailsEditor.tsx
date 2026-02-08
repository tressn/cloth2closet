"use client"
import { useState } from "react"

export default function ProjectDetailsEditor({ projectId, initial }: { projectId: string; initial: any }) {
  const [eventDate, setEventDate] = useState(initial?.eventDate?.slice?.(0, 10) ?? "")
  const [shipByDate, setShipByDate] = useState(initial?.shipByDate?.slice?.(0, 10) ?? "")
  const [fabricNotes, setFabricNotes] = useState(initial?.fabricNotes ?? "")
  const [fabricAgreed, setFabricAgreed] = useState(!!initial?.fabricAgreed)
  const [fabricAgreedNote, setFabricAgreedNote] = useState(initial?.fabricAgreedNote ?? "")
  const [requireSketch, setRequireSketch] = useState(!!initial?.requireSketch)
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function save() {
    setLoading(true)
    setMsg(null)

    const res = await fetch(`/api/projects/${projectId}/details`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventDate: eventDate || null,
        shipByDate: shipByDate || null,
        fabricNotes,
        fabricAgreed,
        fabricAgreedNote,
        requireSketch,
      }),
    })

    const data = await res.json().catch(() => ({}))
    setLoading(false)
    if (!res.ok) setMsg(data?.error ?? "Failed")
    else setMsg("Saved!")
  }

  return (
    <section style={{ border: "1px solid #ddd", borderRadius: 12, padding: 14, marginTop: 16 }}>
      <h2>Project Details</h2>

      <label>Event date<input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} /></label>
      <label>Ship by<input type="date" value={shipByDate} onChange={(e) => setShipByDate(e.target.value)} /></label>

      <label>Fabric notes<textarea value={fabricNotes} onChange={(e) => setFabricNotes(e.target.value)} /></label>

      <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input type="checkbox" checked={fabricAgreed} onChange={(e) => setFabricAgreed(e.target.checked)} />
        Fabric agreed
      </label>

      <label>Fabric agreed note<input value={fabricAgreedNote} onChange={(e) => setFabricAgreedNote(e.target.value)} /></label>

      <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input type="checkbox" checked={requireSketch} onChange={(e) => setRequireSketch(e.target.checked)} />
        Require sketch
      </label>

      <button onClick={save} disabled={loading} style={{ padding: 10, marginTop: 10 }}>
        {loading ? "Saving..." : "Save"}
      </button>

      {msg && <p>{msg}</p>}
    </section>
  )
}
