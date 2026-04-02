"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";

type PendingUpload = {
  file: File;
  previewUrl: string;
};

async function presignProjectUpload(projectId: string, file: File, purpose: string) {
  const res = await fetch("/api/uploads/projects/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId,
      filename: file.name,
      contentType: file.type,
      purpose,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Failed to prepare upload");
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

export default function SketchSubmitForm({
  projectId,
  initialImages,
  disabled,
}: {
  projectId: string;
  initialImages: string[];
  disabled?: boolean;
}) {
  const [imageUrls, setImageUrls] = useState<string[]>(initialImages ?? []);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function onPickFiles(files: FileList | null) {
    if (!files) return;

    const MAX_FILES = 10;
    const MAX_MB = 10;

    const picked = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .filter((f) => f.size <= MAX_MB * 1024 * 1024);

    const remainingSlots = Math.max(0, MAX_FILES - imageUrls.length - pendingUploads.length);
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
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return copy;
    });
  }

  async function uploadPendingImages() {
    const uploadedUrls: string[] = [];

    for (const upload of pendingUploads) {
      const { uploadUrl, publicUrl } = await presignProjectUpload(projectId, upload.file, "sketch");
      await putToS3(uploadUrl, upload.file);
      uploadedUrls.push(publicUrl);
    }

    return uploadedUrls;
  }

  async function onSubmit() {
    if (disabled) return;

    setSaving(true);
    setMessage(null);

    try {
      const uploadedUrls = await uploadPendingImages();
      const nextImageUrls = [...imageUrls, ...uploadedUrls].slice(0, 10);

      if (nextImageUrls.length === 0) {
        throw new Error("Add at least one sketch image.");
      }

      const res = await fetch(`/api/projects/${projectId}/workflow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SUBMIT_SKETCH",
          images: nextImageUrls,
          note: note.trim() || null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to submit sketch");

      pendingUploads.forEach((u) => {
        if (u.previewUrl) URL.revokeObjectURL(u.previewUrl);
      });

      setImageUrls(nextImageUrls);
      setPendingUploads([]);
      setMessage("Sketch submitted!");
      window.location.href = `/dashboard/dressmaker/projects/${projectId}`;
    } catch (e: any) {
      setMessage(e?.message ?? "Failed to submit sketch");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3">
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={disabled || saving}
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
                  alt={`Sketch ${idx + 1}`}
                  className="aspect-square w-full rounded-xl object-cover"
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={disabled || saving}
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
            <div className="text-[12px] font-medium text-[var(--muted)]">New images to upload</div>
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
                  <div className="truncate text-[12px] text-[var(--muted)]">{upload.file.name}</div>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={disabled || saving}
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

      <div className="grid gap-2">
        <div className="text-[12px] font-medium text-[var(--muted)]">Note for the customer (optional)</div>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="A short note about silhouette, construction direction, or what to review."
          disabled={disabled || saving}
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="text-[13px] text-[var(--muted)]">{message ?? " "}</div>
        <Button
          type="button"
          variant="primary"
          onClick={onSubmit}
          disabled={disabled || saving}
        >
          {saving ? "Submitting…" : "Submit sketch"}
        </Button>
      </div>
    </div>
  );
}