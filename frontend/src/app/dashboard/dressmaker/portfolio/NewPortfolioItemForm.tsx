"use client"

import { useState } from "react"

const ATTIRE_TYPES = [
  "DRESS",
  "SUIT",
  "TOP",
  "SKIRT",
  "PANTS",
  "OUTERWEAR",
  "TRADITIONAL",
  "OTHER",
  "BRIDAL",
  "EVENINGWEAR"
] as const

export default function NewPortfolioItemForm() {
  const [title, setTitle] = useState("")
  const [attireType, setAttireType] = useState<(typeof ATTIRE_TYPES)[number]>("OTHER")
  const [tagsText, setTagsText] = useState("")
  const [description, setDescription] = useState("")
  const [isFeatured, setIsFeatured] = useState(false)

  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function onCreate() {
    setSaving(true)
    setMessage(null)

    const tags = tagsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)

    const res = await fetch("/api/portfolio-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        attireType,
        tags,
        description,
        isFeatured,
      }),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      setMessage(data?.error ?? `Create failed (${res.status})`)
      setSaving(false)
      return
    }

    setMessage("Created! Refreshing…")
    setSaving(false)
    window.location.reload()
  }

  return (
    <div style={{ display: "grid", gap: 10, maxWidth: 600 }}>
      <label>
        <div>Title</div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ width: "100%", padding: 8 }}
          placeholder="e.g. Hand-stitched bridal gown"
        />
      </label>

      <label>
        <div>Attire type</div>
        <select
          value={attireType}
          onChange={(e) => setAttireType(e.target.value as any)}
          style={{ width: "100%", padding: 8 }}
        >
          {ATTIRE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>

      <label>
        <div>Tags (comma-separated)</div>
        <input
          value={tagsText}
          onChange={(e) => setTagsText(e.target.value)}
          style={{ width: "100%", padding: 8 }}
          placeholder="silk, bridal, embroidery"
        />
      </label>

      <label>
        <div>Description (optional)</div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ width: "100%", padding: 8, minHeight: 100 }}
          placeholder="Details about materials, techniques, turnaround time..."
        />
      </label>

      <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          type="checkbox"
          checked={isFeatured}
          onChange={(e) => setIsFeatured(e.target.checked)}
        />
        <span>Featured item</span>
      </label>

      <button type="button" onClick={onCreate} disabled={saving} style={{ padding: 10 }}>
        {saving ? "Creating..." : "Create item"}
      </button>

      {message && <p>{message}</p>}
    </div>
  )
}
