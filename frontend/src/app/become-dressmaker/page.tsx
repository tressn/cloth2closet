"use client"

import { useState } from "react"

export default function BecomeDressmakerPage() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleBecomeDressmaker() {
    console.log("CLICK HANDLER RAN")
    setLoading(true)
    setMessage(null)

    const res = await fetch("/api/account/become-dressmaker", {
      method: "POST",
    })

    const data = await res.json()

    if (!res.ok) {
      setMessage(data?.error ?? "Something went wrong")
      setLoading(false)
      return
    }

    setMessage("You are now a dressmaker! Go to your dashboard to edit your profile.")
    setLoading(false)

    // Optional: refresh to ensure session/role updates are reflected
    window.location.href = "/dashboard/dressmaker/profile"
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Become a Dressmaker</h1>
      <p>This will upgrade your account and create your dressmaker profile.</p>

      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          handleBecomeDressmaker()
          }}
  disabled={loading}
>
        {loading ? "Upgrading..." : "Become a Dressmaker"}
      </button>

      {message && <p style={{ marginTop: 12 }}>{message}</p>}
    </main>
  )
}
