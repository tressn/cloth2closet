"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";


export default function MeasurementsForm({ initial }: { initial: any | null }) {
  const [height, setHeight] = useState(initial?.heightCm ?? "");
  const [bust, setBust] = useState(initial?.bustCm ?? "");
  const [waist, setWaist] = useState(initial?.waistCm ?? "");
  const [hips, setHips] = useState(initial?.hipsCm ?? "");
  const [shoulderToNipple, setShoulderToNipple] = useState(initial?.shoulderToNippleCm ?? "");
  const [shoulderToUnderbust, setShoulderToUnderbust] = useState(initial?.shoulderToUnderbustCm ?? "");
  const [shoulderToWaist, setShoulderToWaist] = useState(initial?.shoulderToWaistCm ?? "");
  const [aroundBellyButton, setAroundBellyButton] = useState(initial?.aroundBellyButtonCm ?? "");
  const [aroundLowerBelly, setAroundLowerBelly] = useState(initial?.aroundLowerBellyCm ?? "");
  const [acrossBack, setAcrossBack] = useState(initial?.acrossBackCm ?? "");
  const [aroundArm, setAroundArm] = useState(initial?.aroundArmCm ?? "");
  const [sleeveLength, setSleeveLength] = useState(initial?.sleeveLengthCm ?? "");
  const [shoulderToButt, setShoulderToButt] = useState(initial?.shoulderToButtCm ?? "");
  const [fullLength, setFullLength] = useState(initial?.fullLengthCm ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    setMsg(null);

    const res = await fetch("/api/measurements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fieldsJson: {
          heightCm: height,
          bustCm: bust,
          waistCm: waist,
          hipsCm: hips,
          shoulderToNippleCm: shoulderToNipple,
          shoulderToUnderbustCm: shoulderToUnderbust,
          shoulderToWaistCm: shoulderToWaist,
          aroundBellyButtonCm: aroundBellyButton,
          aroundLowerBellyCm: aroundLowerBelly,
          acrossBackCm: acrossBack,
          aroundArmCm: aroundArm,
          sleeveLengthCm: sleeveLength,
          shoulderToButtCm: shoulderToButt,
          fullLengthCm: fullLength,
          notes,
        },
      }),
    });

    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) setMsg(data?.error ?? "Failed to save");
    else setMsg("Saved!");
  }

  return (
    <div className="grid gap-6">
      <Section title="Core">
        <Grid>
          <Field label="Height (cm)" ><Input value={height} onChange={(e) => setHeight(e.target.value)} /></Field>
          <Field label="Bust (cm)" ><Input value={bust} onChange={(e) => setBust(e.target.value)} /></Field>
          <Field label="Waist (cm)" ><Input value={waist} onChange={(e) => setWaist(e.target.value)} /></Field>
          <Field label="Hips (cm)" ><Input value={hips} onChange={(e) => setHips(e.target.value)} /></Field>
        </Grid>
      </Section>

      <Section title="Torso & fit">
        <Grid>
          <Field label="Shoulder → nipple (cm)" ><Input value={shoulderToNipple} onChange={(e) => setShoulderToNipple(e.target.value)} /></Field>
          <Field label="Shoulder → underbust (cm)" ><Input value={shoulderToUnderbust} onChange={(e) => setShoulderToUnderbust(e.target.value)} /></Field>
          <Field label="Shoulder → waist (cm)" ><Input value={shoulderToWaist} onChange={(e) => setShoulderToWaist(e.target.value)} /></Field>
          <Field label="Across back (cm)" ><Input value={acrossBack} onChange={(e) => setAcrossBack(e.target.value)} /></Field>
        </Grid>

        <Grid>
          <Field label="Around belly button (cm)" ><Input value={aroundBellyButton} onChange={(e) => setAroundBellyButton(e.target.value)} /></Field>
          <Field label="Around lower belly (cm)" ><Input value={aroundLowerBelly} onChange={(e) => setAroundLowerBelly(e.target.value)} /></Field>
        </Grid>
      </Section>

      <Section title="Arms & length">
        <Grid>
          <Field label="Around arm (cm)" ><Input value={aroundArm} onChange={(e) => setAroundArm(e.target.value)} /></Field>
          <Field label="Sleeve length (cm)" ><Input value={sleeveLength} onChange={(e) => setSleeveLength(e.target.value)} /></Field>
          <Field label="Shoulder → butt (cm)" ><Input value={shoulderToButt} onChange={(e) => setShoulderToButt(e.target.value)} /></Field>
          <Field label="Full length (cm)" ><Input value={fullLength} onChange={(e) => setFullLength(e.target.value)} /></Field>
        </Grid>
      </Section>

      <Section title="Notes (optional)">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything your dressmaker should know (posture, preferred fit, etc.)" />
      </Section>

      <div className="flex items-center justify-between gap-3">
        <div className="text-[13px] text-[var(--muted)]">{msg ?? " "}</div>
        <Button onClick={save} disabled={loading} variant="primary">
          {loading ? "Saving…" : "Save measurements"}
        </Button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="text-[14px] font-semibold text-[var(--text)]">{title}</div>
      {children}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2">
      <div className="text-[12px] font-medium text-[var(--muted)]">{label}</div>
      {children}
    </label>
  );
}
