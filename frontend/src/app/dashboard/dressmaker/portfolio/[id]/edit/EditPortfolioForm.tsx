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

export default function EditPortfolioForm({ item }: { item: any }) {
  const [title, setTitle] = useState(item.title ?? "")
  const [attireType, setAttireType] = useState(item.attireType ?? "OTHER")
  const [tagsText, setTagsText] = useState((item.tags ?? []).join(", "))
  const [description, setDescription] = useState(item.description ?? "")
  const [isFeatured, setIsFeatured] = useState(!!item.isFeatured)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function onSave() {
    setSaving(true)
    setMessage(null)

    const tags = tagsText.split(",").map((s) => s.trim()).filter(Boolean)

    const res = await fetch(`/api/portfolio-items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, attireType, tags, description, isFeatured }),
    })

    const data = await res.json().catch(() => ({}))
    setSaving(false)

    if (!res.ok) {
      setMessage(data?.error ?? `Save failed (${res.status})`)
      return
    }

    setMessage("Saved!")
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <label>
        <div>Title</div>
        <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ padding: 8, width: "100%" }} />
      </label>

      <label>
        <div>Attire type</div>
        <select value={attireType} onChange={(e) => setAttireType(e.target.value)} style={{ padding: 8 }}>
          {ATTIRE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>

      <label>
        <div>Tags</div>
        <input value={tagsText} onChange={(e) => setTagsText(e.target.value)} style={{ padding: 8, width: "100%" }} />
      </label>

      <label>
        <div>Description</div>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} style={{ padding: 8, minHeight: 100 }} />
      </label>

      <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
        Featured
      </label>

      <button type="button" onClick={onSave} disabled={saving} style={{ padding: 10 }}>
        {saving ? "Saving..." : "Save"}
      </button>

      {message && <p>{message}</p>}
    </div>
  )
}
