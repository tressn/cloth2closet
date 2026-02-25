"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";

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

export default function EditPortfolioForm({ item }: { item: any }) {
  const [title, setTitle] = useState(item.title ?? "");
  const [attireType, setAttireType] = useState<AttireType>((item.attireType ?? "OTHER") as AttireType);
  const [tagsText, setTagsText] = useState(
    ((item.portfolioItemLabels ?? []).map((x: any) => x.label?.name).filter(Boolean)).join(", ")
  );
  const [description, setDescription] = useState(item.description ?? "");
  const [isFeatured, setIsFeatured] = useState(!!item.isFeatured);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSave() {
    setSaving(true);
    setMessage(null);

    const tags = tagsText.split(",").map((s: string) => s.trim()).filter(Boolean);

    const res = await fetch(`/api/portfolio-items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, attireType, tags, description, isFeatured }),
    });

    const data = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      setMessage(data?.error ?? `Save failed (${res.status})`);
      return;
    }
    setMessage("Saved!");
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Attire type">
          <Select value={attireType} onChange={(e) => setAttireType(e.target.value as AttireType)}>
            {ATTIRE_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Tags" hint="Comma-separated keywords.">
        <Input value={tagsText} onChange={(e) => setTagsText(e.target.value)} />
      </Field>

      <Field label="Description">
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>

      <label className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
        <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
        <div className="text-[14px] text-[var(--text)]">
          Featured <span className="text-[var(--muted)]">(appears prominently)</span>
        </div>
      </label>

      <div className="flex items-center justify-between gap-3">
        <div className="text-[13px] text-[var(--muted)]">{message ?? " "}</div>
        <Button type="button" onClick={onSave} disabled={saving || !title.trim()} variant="primary">
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2">
      <div className="text-[12px] font-medium text-[var(--muted)]">{label}</div>
      {children}
      {hint ? <div className="text-[12px] leading-5 text-[var(--muted)]">{hint}</div> : null}
    </label>
  );
}
