"use client"
import { useState } from "react"

export default function QuoteForm({
  projectId,
  existingAmount,
  currency,
}: {
  projectId: string
  existingAmount: number | null
  currency: string
}) {
  const [amount, setAmount] = useState(existingAmount != null ? String(existingAmount) : "")
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function submit() {
    setLoading(true)
    setMsg(null)

    const res = await fetch(`/api/projects/${projectId}/quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quotedTotalAmount: Number(amount), currency }),
    })

    const data = await res.json().catch(() => ({}))
    setLoading(false)

    if (!res.ok) setMsg(data?.error ?? "Failed")
    else window.location.reload()
  }

  return (
    <div style={{ display: "grid", gap: 8, maxWidth: 420 }}>
      <label>
        <div>Total quote (cents)</div>
        <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="50000" />
      </label>
      <button type="button" onClick={submit} disabled={loading} style={{ padding: 10 }}>
        {loading ? "Saving..." : "Save quote (Accept)"}
      </button>
      {msg && <p>{msg}</p>}
      <small>We store cents. 50000 = $500.00</small>
    </div>
  )
}
