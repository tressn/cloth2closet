"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
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

type PendingUpload = {
  file: File;
  previewUrl: string;
};

type SelectedLabel = {
  id: string;
  slug: string;
  name: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
};

async function presignPortfolioUpload(file: File) {
  const res = await fetch("/api/uploads/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error ?? "Failed to prepare upload");
  }

  return data as { uploadUrl: string; publicUrl: string; key: string };
}

async function putToS3(uploadUrl: string, file: File) {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });

  if (!res.ok) {
    throw new Error("Upload failed");
  }
}

export default function EditPortfolioForm({ item }: { item: any }) {
  const [title, setTitle] = useState(item.title ?? "");
  const [attireType, setAttireType] = useState<AttireType>(
    (item.attireType ?? "OTHER") as AttireType
  );

  const initialLabels = useMemo<SelectedLabel[]>(() => {
    return ((item.portfolioItemLabels ?? [])
      .map((x: any) => x.label)
      .filter(Boolean)
      .filter((l: any) => l.scope === "PORTFOLIO" && l.status !== "REJECTED")
      .map((l: any) => ({
        id: l.id,
        slug: l.slug,
        name: l.name,
        status: l.status as SelectedLabel["status"],
      }))) as SelectedLabel[];
  }, [item]);

  const [selectedLabels, setSelectedLabels] = useState<SelectedLabel[]>(initialLabels ?? []);
  const labelIds = Array.from(new Set((selectedLabels ?? []).map((l) => l.id)));

  const [description, setDescription] = useState(item.description ?? "");
  const [isFeatured, setIsFeatured] = useState(!!item.isFeatured);

  const [imageUrls, setImageUrls] = useState<string[]>(
    Array.isArray(item.imageUrls) ? item.imageUrls : []
  );
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function onPickFiles(files: FileList | null) {
    if (!files) return;

    const MAX_FILES = 10;
    const MAX_MB = 10;

    const picked = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .filter((f) => f.size <= MAX_MB * 1024 * 1024);

    const remainingSlots = Math.max(
      0,
      MAX_FILES - imageUrls.length - pendingUploads.length
    );

    const next = picked.slice(0, remainingSlots).map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    if (next.length === 0) {
      setMessage("You can upload up to 10 images, each up to 10 MB.");
      return;
    }

    setPendingUploads((prev) => [...prev, ...next]);
    setMessage(null);
  }


  function removeExistingImage(idx: number) {
    setImageUrls((prev) => prev.filter((_, i) => i !== idx));
  }

  function removePendingImage(idx: number) {
    setPendingUploads((prev) => {
      const copy = [...prev];
      const [removed] = copy.splice(idx, 1);
      if (removed?.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return copy;
    });
  }

  async function uploadPendingImages() {
    if (pendingUploads.length === 0) return [];

    const uploadedUrls: string[] = [];

    for (const upload of pendingUploads) {
      const { uploadUrl, publicUrl } = await presignPortfolioUpload(upload.file);
      await putToS3(uploadUrl, upload.file);
      uploadedUrls.push(publicUrl);
    }

    return uploadedUrls;
  }

  async function onSave() {
    setSaving(true);
    setMessage(null);

    try {
      const uploadedUrls = await uploadPendingImages();
      const nextImageUrls = [...imageUrls, ...uploadedUrls].slice(0, 10);

      const res = await fetch(`/api/portfolio-items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          attireType,
          description,
          isFeatured,
          labelIds,
          imageUrls: nextImageUrls,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error ?? `Save failed (${res.status})`);
      }

      pendingUploads.forEach((u) => {
        if (u.previewUrl) {
          URL.revokeObjectURL(u.previewUrl);
        }
      });

      setImageUrls(nextImageUrls);
      setPendingUploads([]);
      setMessage("Saved!");
    } catch (e: any) {
      setMessage(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>

        <Field label="Attire type">
          <Select
            value={attireType}
            onChange={(e) => setAttireType(e.target.value as AttireType)}
          >
            {ATTIRE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field
        label="Photos"
        hint="Keep up to 10 polished images. First image works best as the cover."
      >
        <div className="grid gap-3">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => onPickFiles(e.target.files)}
          />

          {imageUrls.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {imageUrls.map((url, idx) => (
                <div
                  key={`${url}-${idx}`}
                  className="grid gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Portfolio image ${idx + 1}`}
                    className="aspect-square w-full rounded-xl object-cover"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => removeExistingImage(idx)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          ) : null}

          {pendingUploads.length > 0 ? (
            <div className="grid gap-2">
              <div className="text-[12px] font-medium text-[var(--muted)]">
                New photos to upload
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {pendingUploads.map((upload, idx) => (
                  <div
                    key={`${upload.file.name}-${idx}`}
                    className="grid gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-2"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={upload.previewUrl}
                      alt={upload.file.name}
                      className="aspect-square w-full rounded-xl object-cover"
                    />
                    <div className="truncate text-[12px] text-[var(--muted)]">
                      {upload.file.name}
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => removePendingImage(idx)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="text-[12px] text-[var(--muted)]">
            JPG, PNG, WebP, or HEIC. Up to 10 images total.
          </div>
        </div>
      </Field>

      <Field
        label="Tags"
        hint="Pick approved tags buyers search for. You can create new tags (pending approval)."
      >
        <LabelMultiSelect
          scope="PORTFOLIO"
          selectedLabels={selectedLabels}
          onChange={setSelectedLabels}
          allowCreate={true}
          placeholder="Start typing to add tags…"
        />
      </Field>

      <Field label="Description">
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>

      <label className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
        <input
          type="checkbox"
          checked={isFeatured}
          onChange={(e) => setIsFeatured(e.target.checked)}
        />
        <div className="text-[14px] text-[var(--text)]">
          Featured <span className="text-[var(--muted)]">(appears prominently)</span>
        </div>
      </label>

      <div className="flex items-center justify-between gap-3">
        <div className="text-[13px] text-[var(--muted)]">{message ?? " "}</div>
        <Button
          type="button"
          onClick={onSave}
          disabled={saving || !title.trim()}
          variant="primary"
        >
          {saving ? "Saving…" : "Save changes"}
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
      {hint ? (
        <div className="text-[12px] leading-5 text-[var(--muted)]">{hint}</div>
      ) : null}
    </label>
  );
}