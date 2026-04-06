"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

type UploadItem = {
  file: File;
  status: "queued" | "uploading" | "done" | "error";
  publicUrl?: string;
  error?: string;
};

function Field({
  label,
  children,
  hint,
  error,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  error?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <div className="text-[12px] font-medium text-[var(--muted)]">{label}</div>
      {children}
      {hint ? <div className="text-[12px] text-[var(--muted)]">{hint}</div> : null}
      {error ? <div className="text-[12px] text-[var(--danger)]">{error}</div> : null}
    </div>
  );
}

function isPastDate(value: string) {
  if (!value) return false;

  const selected = new Date(`${value}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return selected < today;
}

async function presignMessageUpload(conversationId: string, file: File) {
  const res = await fetch("/api/uploads/messages/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      conversationId,
      filename: file.name,
      contentType: file.type,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Failed to presign upload");
  return data as { uploadUrl: string; publicUrl: string; key: string };
}

async function putToS3(uploadUrl: string, file: File) {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!res.ok) throw new Error("Upload failed");
}

export default function RequestForm({ dressmakerProfileId }: { dressmakerProfileId: string }) {
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [shipByDate, setShipByDate] = useState("");
  const [colorPreferences, setColorPreferences] = useState("");
  const [sizeNotes, setSizeNotes] = useState("");
  const [budgetCeiling, setBudgetCeiling] = useState("");
  const [isRush, setIsRush] = useState(false);
  const [wantsCalico, setWantsCalico] = useState(false);
  const [notes, setNotes] = useState("");
  const [requireSketch, setRequireSketch] = useState(false);

  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const attachments = useMemo(
    () => uploads.filter((u) => u.status === "done" && u.publicUrl).map((u) => u.publicUrl!),
    [uploads]
  );

  const eventDateError = isPastDate(eventDate) ? "Event date can’t be in the past." : "";
  const shipByDateError = isPastDate(shipByDate) ? "Ship-by date can’t be in the past." : "";

  function onPickFiles(files: FileList | null) {
    if (!files) return;
    const MAX_MB = 10;

    const picked = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .filter((f) => f.size <= MAX_MB * 1024 * 1024);

    const next: UploadItem[] = picked.map((f) => ({ file: f, status: "queued" }));
    setUploads((prev) => [...prev, ...next].slice(0, 10));
  }

  function removeAt(idx: number) {
    setUploads((prev) => prev.filter((_, i) => i !== idx));
  }

  async function uploadAllQueued(conversationId: string) {
    const snapshot = uploads;

    for (let i = 0; i < snapshot.length; i++) {
      const u = snapshot[i];
      if (u.status !== "queued") continue;

      setUploads((prev) => prev.map((x, idx) => (idx === i ? { ...x, status: "uploading" } : x)));

      try {
        const { uploadUrl, publicUrl } = await presignMessageUpload(conversationId, u.file);
        await putToS3(uploadUrl, u.file);

        setUploads((prev) => prev.map((x, idx) => (idx === i ? { ...x, status: "done", publicUrl } : x)));
      } catch (e: any) {
        setUploads((prev) =>
          prev.map((x, idx) => (idx === i ? { ...x, status: "error", error: e?.message ?? "Upload error" } : x))
        );
      }
    }
  }

  async function submit() {
    const cleanTitle = title.trim();
    const cleanNotes = notes.trim();

    if (!cleanTitle) {
      setMsg("Please add a title.");
      return;
    }

    if (eventDateError || shipByDateError) {
      setMsg(eventDateError || shipByDateError);
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
      const parsedBudget =
        budgetCeiling.trim().length > 0 ? Math.round(Number.parseFloat(budgetCeiling) * 100) : null;

      if (budgetCeiling.trim().length > 0 && (!Number.isFinite(parsedBudget) || parsedBudget! < 0)) {
        throw new Error("Enter a valid budget amount.");
      }

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dressmakerProfileId,
          title: cleanTitle,
          eventDate: eventDate || null,
          shipByDate: shipByDate || null,
          colorPreferences: colorPreferences.trim() || null,
          sizeNotes: sizeNotes.trim() || null,
          budgetCeiling: parsedBudget,
          isRush,
          wantsCalico,
          requireSketch,
          fabricNotes: cleanNotes,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to send request");

      const conversationId: string = data.conversationId;

      if (uploads.some((u) => u.status === "queued")) {
        await uploadAllQueued(conversationId);
      }

      if (uploads.some((u) => u.status === "error")) {
        throw new Error("One or more photos failed to upload. Remove them or try again.");
      }

      if (attachments.length > 0) {
        const photoMsg =
          `Reference photos for: ${cleanTitle}\n` +
          `• Event date: ${eventDate || "Not set"}\n` +
          `• Ship-by date: ${shipByDate || "Not set"}\n` +
          `• Rush: ${isRush ? "Yes" : "No"}\n` +
          `• Calico: ${wantsCalico ? "Yes" : "No"}\n` +
          `• Sketch approval: ${requireSketch ? "Yes" : "No"}`;

        const res2 = await fetch(`/api/conversations/${conversationId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: photoMsg, attachments }),
        });

        const data2 = await res2.json().catch(() => ({}));
        if (!res2.ok) throw new Error(data2?.error ?? "Failed to send photos");
      }

      window.location.href = `/messages/${conversationId}`;
    } catch (e: any) {
      setMsg(e?.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-5">
      <Field label="Title (required)">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder='e.g. "Bridal satin gown"'
        />
      </Field>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Event date" error={eventDateError}>
          <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
        </Field>

        <Field label="Ship-by date" hint="When you’d ideally like it dispatched." error={shipByDateError}>
          <Input type="date" value={shipByDate} onChange={(e) => setShipByDate(e.target.value)} />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Color preferences" hint="Preferred colors, tones, finishes, or palette.">
          <Input
            value={colorPreferences}
            onChange={(e) => setColorPreferences(e.target.value)}
            placeholder="Ivory, champagne, deep emerald..."
          />
        </Field>

        <Field label="Budget ceiling" hint="Optional maximum budget in dollars.">
          <Input
            value={budgetCeiling}
            onChange={(e) => setBudgetCeiling(e.target.value)}
            placeholder="1200.00"
            inputMode="decimal"
          />
        </Field>
      </div>

      <Field label="Size notes" hint="Sizing concerns, body fit notes, usual size, or alterations history.">
        <Textarea
          value={sizeNotes}
          onChange={(e) => setSizeNotes(e.target.value)}
          placeholder="Long torso, broad shoulders, prefers more ease at the waist..."
        />
      </Field>

      <div className="grid gap-2">
        <div className="text-[12px] font-medium text-[var(--muted)]">Options</div>

        <label className="flex items-center gap-2 text-[14px] text-[var(--text)]">
          <input type="checkbox" checked={isRush} onChange={(e) => setIsRush(e.target.checked)} />
          Rush job
        </label>

        <label className="flex items-center gap-2 text-[14px] text-[var(--text)]">
          <input type="checkbox" checked={wantsCalico} onChange={(e) => setWantsCalico(e.target.checked)} />
          Want a calico mockup
        </label>

        <label className="flex items-center gap-2 text-[14px] text-[var(--text)]">
          <input type="checkbox" checked={requireSketch} onChange={(e) => setRequireSketch(e.target.checked)} />
          Require sketch approval
        </label>

        <div className="text-[12px] text-[var(--muted)]">
          Rush, calico, and sketches affect pricing and timeline.
        </div>
      </div>

      <Field label="Describe what you want" hint="Fabric, vibe, silhouette, shipping city, and anything that helps the maker quote accurately.">
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Be specific—this helps them quote accurately."
        />
      </Field>

      <div className="grid gap-2">
        <div className="text-[12px] font-medium text-[var(--muted)]">Attach photos (optional, up to 10)</div>
        <input type="file" accept="image/*" multiple onChange={(e) => onPickFiles(e.target.files)} />

        {uploads.length ? (
          <div className="grid gap-2">
            {uploads.map((u, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-medium text-[var(--text)]">{u.file.name}</div>
                  <div className="text-[12px] text-[var(--muted)]">
                    {u.status === "queued" ? "Ready" : null}
                    {u.status === "uploading" ? "Uploading..." : null}
                    {u.status === "done" ? "Uploaded" : null}
                    {u.status === "error" ? `Error: ${u.error ?? "Upload failed"}` : null}
                  </div>
                </div>

                <Button type="button" variant="secondary" onClick={() => removeAt(idx)}>
                  Remove
                </Button>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <Button type="button" onClick={submit} disabled={loading} variant="primary">
          {loading ? "Sending..." : "Send request"}
        </Button>
        {msg ? <div className="text-[13px] text-[var(--danger)]">{msg}</div> : null}
      </div>
    </div>
  );
}