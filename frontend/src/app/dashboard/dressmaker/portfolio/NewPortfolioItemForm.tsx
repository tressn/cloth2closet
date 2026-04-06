"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import LabelMultiSelect from "@/components/labels/LabelMultiSelect";

const ATTIRE_TYPES = [
  "DRESS",
  "SUIT",
  "TOP",
  "SKIRT",
  "PANTS",
  "OUTERWEAR",
  "TRADITIONAL",
  "OTHER",
  "BRIDAL",
  "EVENINGWEAR",
] as const;

type AttireType = (typeof ATTIRE_TYPES)[number];

type SelectedLabel = {
  id: string;
  slug: string;
  name: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
};

export default function NewPortfolioItemForm() {
  const [title, setTitle] = useState("");
  const [attireType, setAttireType] = useState<AttireType>("OTHER");
  const [description, setDescription] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);

  // ✅ NEW: labelIds instead of tagsText
  const [selectedLabels, setSelectedLabels] = useState<SelectedLabel[]>([]);
  const labelIds = Array.from(new Set(selectedLabels.map((l) => l.id)));

  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function uploadOne(file: File): Promise<string> {
    const presignRes = await fetch("/api/uploads/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, contentType: file.type }),
    });

    const presignData = await presignRes.json().catch(() => ({}));
    if (!presignRes.ok) throw new Error(presignData?.error ?? `Presign failed (${presignRes.status})`);

    const { uploadUrl, publicUrl } = presignData as { uploadUrl: string; publicUrl: string };

    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });

    if (!putRes.ok) throw new Error(`S3 upload failed (${putRes.status})`);
    return publicUrl;
  }

  async function onCreate() {
    try {
      setSaving(true);
      setMessage(null);

      setMessage(files.length ? "Uploading images…" : "Creating item…");

      const imageUrls: string[] = [];
      for (const file of files) {
        imageUrls.push(await uploadOne(file));
      }

      setMessage("Saving portfolio item…");

      const res = await fetch("/api/portfolio-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          attireType,
          description,
          isFeatured,
          imageUrls,
          labelIds,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error ?? `Create failed (${res.status})`);
      }

      setMessage("Created! Refreshing…");
      window.location.reload();
    } catch (e: any) {
      setMessage(e?.message ?? "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Beaded bodice midi" />
        </Field>

        <Field label="Attire type">
          <Select value={attireType} onChange={(e) => setAttireType(e.target.value as AttireType)}>
            {ATTIRE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {/* ✅ NEW: Labels selector */}
      <Field label="Tags" hint="Pick approved tags buyers search for. Dressmakers can also create new tags (pending approval).">
        <LabelMultiSelect
          scope="PORTFOLIO"
          selectedLabels={selectedLabels}
          onChange={setSelectedLabels}
          allowCreate={true}
          placeholder="Start typing to add tags…"
        />
      </Field>

      <Field label="Description" hint="Optional. A short story reads premium.">
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Fabric, technique, fit notes…"
        />
      </Field>

      <label className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
        <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
        <div className="text-[14px] text-[var(--text)]">
          Mark as <span className="font-semibold">Featured</span>{" "}
          <span className="text-[var(--muted)]">(use sparingly)</span>
        </div>
      </label>

      <Field label="Images" hint="Add 1–5 photos. First image becomes the cover.">
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          className="block w-full text-[14px] text-[var(--muted)]"
        />
        <div className="mt-2 flex items-center gap-2">
          <Badge tone="neutral">{files.length} selected</Badge>
        </div>
      </Field>

      <div className="flex items-center justify-between gap-3">
        <div className="text-[13px] text-[var(--muted)]">{message ?? " "}</div>
        <Button type="button" onClick={onCreate} disabled={saving || !title.trim()} variant="primary">
          {saving ? "Working…" : "Create item"}
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <div className="text-[12px] font-medium text-[var(--muted)]">{label}</div>
      {children}
      {hint ? (
        <div className="text-[12px] leading-5 text-[var(--muted)]">{hint}</div>
      ) : null}
    </div>
  );
}