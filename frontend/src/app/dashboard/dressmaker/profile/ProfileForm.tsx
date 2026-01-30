"use client"

import { useState } from "react"

type Profile = {
  displayName: string | null
  bio: string | null
  location: string | null
  languages: string[]
  basePriceFrom: number | null
  currency: string
  yearsExperience: number | null
  specialties: string[]
  websiteUrl: string | null
  instagramHandle: string | null
}

export default function ProfileForm({ initialProfile }: { initialProfile: Profile }) {
  const [displayName, setDisplayName] = useState(initialProfile.displayName ?? "")
  const [bio, setBio] = useState(initialProfile.bio ?? "")
  const [location, setLocation] = useState(initialProfile.location ?? "")
  const [languagesText, setLanguagesText] = useState((initialProfile.languages ?? []).join(", "))
  const [specialtiesText, setSpecialtiesText] = useState((initialProfile.specialties ?? []).join(", "))

  // basePriceFrom is cents
  const [basePriceFrom, setBasePriceFrom] = useState(
    initialProfile.basePriceFrom != null ? String(initialProfile.basePriceFrom) : ""
  )
  const [currency, setCurrency] = useState(initialProfile.currency ?? "USD")
  const [yearsExperience, setYearsExperience] = useState(
    initialProfile.yearsExperience != null ? String(initialProfile.yearsExperience) : ""
  )
  const [websiteUrl, setWebsiteUrl] = useState(initialProfile.websiteUrl ?? "")
  const [instagramHandle, setInstagramHandle] = useState(initialProfile.instagramHandle ?? "")

  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function onSave() {
    setSaving(true)
    setMessage(null)

    const languages = languagesText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)

    const specialties = specialtiesText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)

    const parsedBasePrice = basePriceFrom.trim().length ? Number(basePriceFrom) : null
    const parsedYears = yearsExperience.trim().length ? Number(yearsExperience) : null

    const res = await fetch("/api/dressmakers/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName,
        bio,
        location,
        languages,
        basePriceFrom: parsedBasePrice,
        currency,
        yearsExperience: parsedYears,
        specialties,
        websiteUrl,
        instagramHandle,
      }),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      setMessage(data?.error ?? `Save failed (${res.status})`)
      setSaving(false)
      return
    }

    setMessage("Saved!")
    setSaving(false)
  }

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: "grid", gap: 12 }}>
        <label>
          <div>Display name</div>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            style={{ width: "100%", padding: 8 }}
            placeholder="e.g. Lina’s Atelier"
          />
        </label>

        <label>
          <div>Bio</div>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            style={{ width: "100%", padding: 8, minHeight: 110 }}
            placeholder="Your specialties, style, turnaround time..."
          />
        </label>

        <label>
          <div>Location</div>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            style={{ width: "100%", padding: 8 }}
            placeholder='e.g. "Brooklyn, NY"'
          />
        </label>

        <label>
          <div>Languages (comma-separated)</div>
          <input
            value={languagesText}
            onChange={(e) => setLanguagesText(e.target.value)}
            style={{ width: "100%", padding: 8 }}
            placeholder="e.g. en, es"
          />
          <small>Tip: keep as short codes (en, es) or full words—just be consistent.</small>
        </label>

        <label>
          <div>Specialties (comma-separated)</div>
          <input
            value={specialtiesText}
            onChange={(e) => setSpecialtiesText(e.target.value)}
            style={{ width: "100%", padding: 8 }}
            placeholder="e.g. bridal, eveningwear, alterations"
          />
        </label>

        <label>
          <div>Base price from (cents)</div>
          <input
            value={basePriceFrom}
            onChange={(e) => setBasePriceFrom(e.target.value)}
            style={{ width: "100%", padding: 8 }}
            placeholder="e.g. 50000"
          />
          <small>We store cents: 50000 = $500.00</small>
        </label>

        <label>
          <div>Currency</div>
          <input
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            style={{ width: "100%", padding: 8 }}
            placeholder="USD"
          />
        </label>

        <label>
          <div>Years experience</div>
          <input
            value={yearsExperience}
            onChange={(e) => setYearsExperience(e.target.value)}
            style={{ width: "100%", padding: 8 }}
            placeholder="e.g. 5"
          />
        </label>

        <label>
          <div>Website URL</div>
          <input
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            style={{ width: "100%", padding: 8 }}
            placeholder="https://your-site.com"
          />
        </label>

        <label>
          <div>Instagram handle</div>
          <input
            value={instagramHandle}
            onChange={(e) => setInstagramHandle(e.target.value)}
            style={{ width: "100%", padding: 8 }}
            placeholder="yourhandle (no @ needed)"
          />
        </label>

        <button type="button" onClick={onSave} disabled={saving} style={{ padding: 10 }}>
          {saving ? "Saving..." : "Save"}
        </button>

        {message && <p>{message}</p>}
      </div>
    </div>
  )
}
