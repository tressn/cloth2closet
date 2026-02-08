"use client"
import { useState } from "react"

export default function MeasurementsForm({ initial }: { initial: any | null }) {
  const [height, setHeight] = useState(initial?.heightIn ?? "")
  const [bust, setBust] = useState(initial?.bustIn ?? "")
  const [waist, setWaist] = useState(initial?.waistIn ?? "")
  const [hips, setHips] = useState(initial?.hipsIn ?? "")
  const [shoulderToNipple, setShoulderToNipple] = useState(initial?.shoulderToNippleIn ?? "")
  const [shoulderToUnderbust, setShoulderToUnderbust] = useState(initial?.shoulderToUnderbustIn ?? "")
  const [shoulderToWaist, setShoulderToWaist] = useState(initial?.shoulderToWaistIn ?? "")
  const [aroundBellyButton, setAroundBellyButton] = useState(initial?.aroundBellyButtonIn ?? "")
  const [aroundLowerBelly, setAroundLowerBelly] = useState(initial?.aroundLowerBellyIn ?? "")
  const [acrossBack, setAcrossBack] = useState(initial?.acrossBackIn ?? "")
  const [aroundArm, setAroundArm] = useState(initial?.aroundArmIn ?? "")
  const [sleeveLength, setSleeveLength] = useState(initial?.sleeveLengthIn ?? "")
  const [shoulderToButt, setShoulderToButt] = useState(initial?.shoulderToButtIn ?? "")
  const [fullHeight, setFullHeight] = useState(initial?.fullHeightIn ?? "")
  const [notes, setNotes] = useState(initial?.notes ?? "")
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function save() {
    setLoading(true)
    setMsg(null)

    const res = await fetch("/api/measurements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fieldsJson: { heightIn: height, 
                    bustIn: bust, 
                    waistIn: waist, 
                    hipsIn: hips, 
                    shoulderToNippleIn: shoulderToNipple, 
                    shoulderToUnderbustIn: shoulderToUnderbust, 
                    shoulderToWaistIn: shoulderToWaist, 
                    aroundBellyButtonIn: aroundBellyButton,
                    aroundLowerBellyIn: aroundLowerBelly,
                    acrossBackIn: acrossBack,
                    aroundArmIn: aroundArm,
                    sleeveLengthIn: sleeveLength,
                    shoulderToButtIn: shoulderToButt,
                    fullHeightIn: fullHeight,
                    notes },
      }),
    })

    const data = await res.json().catch(() => ({}))
    setLoading(false)

    if (!res.ok) setMsg(data?.error ?? "Failed to save")
    else setMsg("Saved!")
  }

  return (
    <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
      <label>Height (in)<input value={height} onChange={(e) => setHeight(e.target.value)} /></label>
      <label>Bust (in)<input value={bust} onChange={(e) => setBust(e.target.value)} /></label>
      <label>Waist (in)<input value={waist} onChange={(e) => setWaist(e.target.value)} /></label>
      <label>Hips (in)<input value={hips} onChange={(e) => setHips(e.target.value)} /></label>
      <label>Shoulder To Nipple (in)<input value={shoulderToNipple} onChange={(e) => setShoulderToNipple(e.target.value)} /></label>
      <label>Shoulder To Underbust (in)<input value={shoulderToUnderbust} onChange={(e) => setShoulderToUnderbust(e.target.value)} /></label>
      <label>Shoulder To Waist (in)<input value={shoulderToWaist} onChange={(e) => setShoulderToWaist(e.target.value)} /></label>
      <label>Around Bellybutton (in)<input value={aroundBellyButton} onChange={(e) => setAroundBellyButton(e.target.value)} /></label>
      <label>Around Lower Belly (in)<input value={aroundLowerBelly} onChange={(e) => setAroundLowerBelly(e.target.value)} /></label>
      <label>Across Back (in)<input value={acrossBack} onChange={(e) => setAcrossBack(e.target.value)} /></label>
      <label>Around Arm (in)<input value={aroundArm} onChange={(e) => setAroundArm(e.target.value)} /></label>
      <label>Sleeve Length (in)<input value={sleeveLength} onChange={(e) => setSleeveLength(e.target.value)} /></label>
      <label>Shoulder To Butt (in)<input value={shoulderToButt} onChange={(e) => setShoulderToButt(e.target.value)} /></label>
      <label>Full Height (in)<input value={fullHeight} onChange={(e) => setFullHeight(e.target.value)} /></label>
      <label>Notes (in)<input value={notes} onChange={(e) => setNotes(e.target.value)} /></label>

      <button onClick={save} disabled={loading} style={{ padding: 10 }}>
        {loading ? "Saving..." : "Save measurements"}
      </button>

      {msg && <p>{msg}</p>}
    </div>
  )
}
