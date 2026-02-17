"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";

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

export default function NewPortfolioItemForm() {
  const [title, setTitle] = useState("");
  const [attireType, setAttireType] = useState<AttireType>("OTHER");
  const [tagsText, setTagsText] = useState("");
  const [description, setDescription] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);

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

      const tags = tagsText.split(",").map((s) => s.trim()).filter(Boolean);

      setMessage(files.length ? "Uploading images…" : "Creating item…");
      const imageUrls: string[] = [];
      for (const file of files) imageUrls.push(await uploadOne(file));

      setMessage("Saving portfolio item…");

      const res = await fetch("/api/portfolio-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, attireType, tags, description, isFeatured, imageUrls }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? `Create failed (${res.status})`);

      setMessage("Created! Refreshing…");
      window.location.reload();
    } catch (e: any) {
      setMessage(e?.message ?? "Something went wrong");
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
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Tags" hint="Comma-separated keywords buyers search for.">
        <Input value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="silk, bridal, embroidery" />
      </Field>

      <Field label="Description" hint="Optional. A short story reads premium.">
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Fabric, technique, fit notes…" />
      </Field>

      <label className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
        <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
        <div className="text-[14px] text-[var(--text)]">
          Mark as <span className="font-semibold">Featured</span> <span className="text-[var(--muted)]">(use sparingly)</span>
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
    <label className="grid gap-2">
      <div className="text-[12px] font-medium text-[var(--muted)]">{label}</div>
      {children}
      {hint ? <div className="text-[12px] leading-5 text-[var(--muted)]">{hint}</div> : null}
    </label>
  );
}
