"use client"

import { useState } from "react"

export default function DeleteButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false)

  async function onDelete() {
    if (!confirm("Delete this portfolio item?")) return

    setLoading(true)
    const res = await fetch(`/api/portfolio-items/${id}`, { method: "DELETE" })
    setLoading(false)

    if (!res.ok) {
      alert("Delete failed")
      return
    }

    window.location.reload()
  }

  return (
    <button type="button" onClick={onDelete} disabled={loading} style={{ padding: 8 }}>
      {loading ? "Deleting..." : "Delete"}
    </button>
  )
}
