"use client"
import { useState } from "react"

export default function PublishToggle({ initialPublished }: { initialPublished: boolean }) {
  const [isPublished, setIsPublished] = useState(initialPublished)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    const next = !isPublished

    const res = await fetch("/api/dressmakers/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: next }),
    })

    setLoading(false)

    if (!res.ok) {
      alert("Failed to update publish status")
      return
    }

    setIsPublished(next)
  }

  return (
    <button type="button" onClick={toggle} disabled={loading} style={{ padding: 10 }}>
      {loading ? "Saving..." : isPublished ? "Unpublish profile" : "Publish profile"}
    </button>
  )
}
