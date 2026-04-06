"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";

function isPastDate(value: string) {
  if (!value) return false;

  const selected = new Date(`${value}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return selected < today;
}

export default function ProjectDetailsEditor({
  projectId,
  initial,
}: {
  projectId: string;
  initial: any;
}) {
  const [eventDate, setEventDate] = useState(initial?.eventDate?.slice?.(0, 10) ?? "");
  const [shipByDate, setShipByDate] = useState(initial?.shipByDate?.slice?.(0, 10) ?? "");
  const [fabricNotes, setFabricNotes] = useState(initial?.fabricNotes ?? "");
  const [fabricAgreed, setFabricAgreed] = useState(!!initial?.fabricAgreed);
  const [fabricAgreedNote, setFabricAgreedNote] = useState(initial?.fabricAgreedNote ?? "");
  const [requireSketch, setRequireSketch] = useState(!!initial?.requireSketch);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const eventDateError = useMemo(
    () => (isPastDate(eventDate) ? "Event date can’t be in the past." : ""),
    [eventDate]
  );

  const shipByDateError = useMemo(
    () => (isPastDate(shipByDate) ? "Ship-by date can’t be in the past." : ""),
    [shipByDate]
  );

  async function save() {
    if (eventDateError) {
      setMsg(eventDateError);
      return;
    }

    if (shipByDateError) {
      setMsg(shipByDateError);
      return;
    }

    if (
      eventDate &&
      shipByDate &&
      new Date(`${shipByDate}T00:00:00`) > new Date(`${eventDate}T00:00:00`)
    ) {
      setMsg("Ship-by date must be on or before the event date.");
      return;
    }

    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/details`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventDate: eventDate || null,
          shipByDate: shipByDate || null,
          fabricNotes,
          fabricAgreed,
          fabricAgreedNote,
          requireSketch,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data?.error ?? "Failed");
      } else {
        setMsg("Saved");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <div>
          <div className="text-[15px] font-semibold text-[var(--text)]">Dates</div>
          <div className="mt-1 text-[13px] text-[var(--muted)]">
            Set the event and delivery timing clearly.
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Event date" error={eventDateError}>
            <Input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
          </Field>

          <Field label="Ship-by date" error={shipByDateError}>
            <Input
              type="date"
              value={shipByDate}
              onChange={(e) => setShipByDate(e.target.value)}
            />
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <div className="text-[15px] font-semibold text-[var(--text)]">Fabric Notes</div>
          <div className="mt-1 text-[13px] text-[var(--muted)]">
            Record sourcing, fabric decisions, and agreement notes.
          </div>
        </div>

        <Field label="Customer notes">
          <Textarea
            value={fabricNotes}
            onChange={(e) => setFabricNotes(e.target.value)}
            placeholder="Fabric type, sourcing notes, trims, lining, weight, finish, concerns…"
            className="min-h-[140px]"
          />
        </Field>

        <label className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
          <input
            type="checkbox"
            checked={fabricAgreed}
            onChange={(e) => setFabricAgreed(e.target.checked)}
            className="h-4 w-4"
          />
          <div>
            <div className="text-[14px] font-medium text-[var(--text)]">Fabric agreed</div>
            <div className="text-[12px] text-[var(--muted)]">
              Mark this once both sides are aligned on fabric.
            </div>
          </div>
        </label>

        <Field label="Fabric agreement note">
          <Input
            value={fabricAgreedNote}
            onChange={(e) => setFabricAgreedNote(e.target.value)}
            placeholder="Example: Customer approved silk mikado in ivory"
          />
        </Field>
      </section>

      <section className="space-y-4">
        <div>
          <div className="text-[15px] font-semibold text-[var(--text)]">Sketch</div>
          <div className="mt-1 text-[13px] text-[var(--muted)]">
            Decide whether this project needs a sketch before production.
          </div>
        </div>

        <label className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
          <input
            type="checkbox"
            checked={requireSketch}
            onChange={(e) => setRequireSketch(e.target.checked)}
            className="h-4 w-4"
          />
          <div>
            <div className="text-[14px] font-medium text-[var(--text)]">Require sketch</div>
            <div className="text-[12px] text-[var(--muted)]">
              Enable this if the customer should review a sketch before the next step.
            </div>
          </div>
        </label>
      </section>

      <div className="flex items-center justify-between gap-3 pt-2">
        <div className="text-[13px] text-[var(--muted)]">{msg ?? " "}</div>
        <Button type="button" onClick={save} disabled={loading} variant="primary">
          {loading ? "Saving…" : "Save details"}
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="text-[12px] font-medium text-[var(--muted)]">{label}</div>
      {children}
      {error ? <div className="text-[12px] text-[var(--danger)]">{error}</div> : null}
    </div>
  );
}