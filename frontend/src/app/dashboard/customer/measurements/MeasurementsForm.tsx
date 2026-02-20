"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { MeasurementInfoIcon } from "@/components/measurements/MeasurementInfoIcon";

export default function MeasurementsForm({ initial }: { initial: any | null }) {
  const [height, setHeight] = useState(initial?.heightIn ?? "");
  const [bust, setBust] = useState(initial?.bustIn ?? "");
  const [waist, setWaist] = useState(initial?.waistIn ?? "");
  const [hips, setHips] = useState(initial?.hipsIn ?? "");
  const [shoulderToNipple, setShoulderToNipple] = useState(initial?.shoulderToNippleIn ?? "");
  const [shoulderToUnderbust, setShoulderToUnderbust] = useState(initial?.shoulderToUnderbustIn ?? "");
  const [shoulderToWaist, setShoulderToWaist] = useState(initial?.shoulderToWaistIn ?? "");
  const [aroundBellyButton, setAroundBellyButton] = useState(initial?.aroundBellyButtonIn ?? "");
  const [aroundLowerBelly, setAroundLowerBelly] = useState(initial?.aroundLowerBellyIn ?? "");
  const [acrossBack, setAcrossBack] = useState(initial?.acrossBackIn ?? "");
  const [aroundArm, setAroundArm] = useState(initial?.aroundArmIn ?? "");
  const [sleeveLength, setSleeveLength] = useState(initial?.sleeveLengthIn ?? "");
  const [shoulderToButt, setShoulderToButt] = useState(initial?.shoulderToButtIn ?? "");
  const [fullLength, setFullLength] = useState(initial?.fullLengthIn ?? "");
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
          heightIn: height,
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
          fullLengthIn: fullLength,
          notes,
        },
      }),
    });

    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) setMsg(data?.error ?? "Failed to save");
    else setMsg("Saved!");
  }

  function Field({ label, helpKey, children }: { label: string; helpKey?: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[12px] font-medium text-[var(--muted)]">{label}</div>
        {helpKey ? <MeasurementInfoIcon fieldKey={helpKey} /> : null}
      </div>
      {children}
    </label>
  );
  }

  return (
    <div className="grid gap-6">
      <Section title="Core">
        <Grid>
          <Field label="Height (cm)" helpKey="heightIn"><Input value={height} onChange={(e) => setHeight(e.target.value)} /></Field>
          <Field label="Bust (cm)" helpKey="bustIn"><Input value={bust} onChange={(e) => setBust(e.target.value)} /></Field>
          <Field label="Waist (cm)" helpKey="waistIn"><Input value={waist} onChange={(e) => setWaist(e.target.value)} /></Field>
          <Field label="Hips (cm)" helpKey="hipsIn"><Input value={hips} onChange={(e) => setHips(e.target.value)} /></Field>
        </Grid>
      </Section>

      <Section title="Torso & fit">
        <Grid>
          <Field label="Shoulder → nipple (cm)" helpKey="shoulderToNippleIn"><Input value={shoulderToNipple} onChange={(e) => setShoulderToNipple(e.target.value)} /></Field>
          <Field label="Shoulder → underbust (cm)" helpKey="shoulderToUnderbustIn"><Input value={shoulderToUnderbust} onChange={(e) => setShoulderToUnderbust(e.target.value)} /></Field>
          <Field label="Shoulder → waist (cm)" helpKey="shoulderToWaistIn"><Input value={shoulderToWaist} onChange={(e) => setShoulderToWaist(e.target.value)} /></Field>
          <Field label="Across back (cm)" helpKey="acrossBackIn"><Input value={acrossBack} onChange={(e) => setAcrossBack(e.target.value)} /></Field>
        </Grid>

        <Grid>
          <Field label="Around belly button (cm)" helpKey="aroundBellyButtonIn"><Input value={aroundBellyButton} onChange={(e) => setAroundBellyButton(e.target.value)} /></Field>
          <Field label="Around lower belly (cm)" helpKey="aroundLowerBellyIn"><Input value={aroundLowerBelly} onChange={(e) => setAroundLowerBelly(e.target.value)} /></Field>
        </Grid>
      </Section>

      <Section title="Arms & length">
        <Grid>
          <Field label="Around arm (cm)" helpKey="aroundArmIn"><Input value={aroundArm} onChange={(e) => setAroundArm(e.target.value)} /></Field>
          <Field label="Sleeve length (cm)" helpKey="sleeveLengthIn"><Input value={sleeveLength} onChange={(e) => setSleeveLength(e.target.value)} /></Field>
          <Field label="Shoulder → butt (cm)" helpKey="shoulderToButtIn"><Input value={shoulderToButt} onChange={(e) => setShoulderToButt(e.target.value)} /></Field>
          <Field label="Full length (cm)" helpKey="fullLengthIn"><Input value={fullLength} onChange={(e) => setFullLength(e.target.value)} /></Field>
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
