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

  const [files, setFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function uploadOne(file: File): Promise<string> {
    // 1) Ask server for a presigned URL
    const presignRes = await fetch("/api/uploads/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type,
      }),
    })

    const presignData = await presignRes.json().catch(() => ({}))
    if (!presignRes.ok) {
      throw new Error(presignData?.error ?? `Presign failed (${presignRes.status})`)
    }

    const { uploadUrl, publicUrl } = presignData as { uploadUrl: string; publicUrl: string }

    // 2) Upload file directly to S3 with PUT
    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
      },
      body: file,
    })

    if (!putRes.ok) {
      throw new Error(`S3 upload failed (${putRes.status})`)
    }

    return publicUrl
  }

  async function onCreate() {
    try {
      setSaving(true)
      setMessage(null)

      const tags = tagsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)

      // Upload images first
      setMessage(files.length ? "Uploading images..." : "Creating item...")

      const imageUrls: string[] = []
      for (const file of files) {
        const url = await uploadOne(file)
        imageUrls.push(url)
      }

      setMessage("Saving portfolio item...")

      // Create PortfolioItem with imageUrls
      const res = await fetch("/api/portfolio-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          attireType,
          tags,
          description,
          isFeatured,
          imageUrls,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error ?? `Create failed (${res.status})`)
      }

      setMessage("Created! Refreshing…")
      window.location.reload()
    } catch (e: any) {
      setMessage(e?.message ?? "Something went wrong")
      setSaving(false)
    }
  }

  return (
    <div style={{ display: "grid", gap: 10, maxWidth: 650 }}>
      <label>
        <div>Title</div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ width: "100%", padding: 8 }}
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
          style={{ width: "100%", padding: 8, minHeight: 90 }}
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

      <label>
        <div>Images</div>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
        />
        <small>{files.length} file(s) selected</small>
      </label>

      <button type="button" onClick={onCreate} disabled={saving} style={{ padding: 10 }}>
        {saving ? "Working..." : "Create item"}
      </button>

      {message && <p>{message}</p>}
    </div>
  )
}