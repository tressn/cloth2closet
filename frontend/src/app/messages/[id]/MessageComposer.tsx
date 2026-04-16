"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { useRouter } from "next/navigation";

type UploadItem = {
  id: string;
  file: File;
  status: "queued" | "uploading" | "done" | "error";
  previewUrl: string;
  publicUrl?: string;
  error?: string;
};

type ProjectStatus =
  | "DRAFT"
  | "REQUESTED"
  | "ACCEPTED"
  | "IN_PROGRESS"
  | "FIT_SAMPLE_SENT"
  | "READY_TO_SHIP"
  | "SHIPPED"
  | "COMPLETED"
  | "CANCELED";

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

function helperText(status?: ProjectStatus) {
  if (status === "REQUESTED") {
    return "Quote stage: discuss timeline, budget, measurements, fabric sourcing, shipping city, and whether rush/calico is needed.";
  }
  if (status === "ACCEPTED") {
    return "Quote approved: confirm deposit amount, deadlines, and shipping details before payment.";
  }
  if (status === "IN_PROGRESS") {
    return "Project active: share progress updates, fittings, and delivery timeline.";
  }
  return "Be clear about timeline, budget, and measurements.";
}

function dedupe<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

export default function MessageComposer({
  conversationId,
  projectTitle,
  projectStatus,
}: {
  conversationId: string;
  projectTitle?: string;
  projectStatus?: ProjectStatus;
}) {
  const [text, setText] = useState("");
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // ✅ Cleanup blob URLs on unmount (prevents memory leaks)
  useEffect(() => {
    return () => {
      uploads.forEach((u) => u.previewUrl && URL.revokeObjectURL(u.previewUrl));
    };
    // NOTE: we intentionally do NOT put `uploads` in deps, because that would revoke
    // active previews during normal usage. This is unmount-only cleanup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onPickFiles(files: FileList | null) {
    if (!files) return;

    const MAX_MB = 10;

    const picked = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .filter((f) => f.size <= MAX_MB * 1024 * 1024);

    const next: UploadItem[] = picked.map((f) => ({
      id: crypto.randomUUID(),
      file: f,
      previewUrl: URL.createObjectURL(f),
      status: "queued",
    }));

    setUploads((prev) => [...prev, ...next].slice(0, 10));
  }

  function removeAt(id: string) {
    setUploads((prev) => {
      const item = prev.find((x) => x.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((x) => x.id !== id);
    });
  }

  async function uploadQueuedFromSnapshot(snapshot: UploadItem[]): Promise<string[]> {
    const uploadedUrls: string[] = [];

    for (const u of snapshot) {
      if (u.status !== "queued") continue;

      setUploads((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, status: "uploading", error: undefined } : x))
      );

      try {
        const { uploadUrl, publicUrl } = await presignMessageUpload(conversationId, u.file);
        await putToS3(uploadUrl, u.file);

        uploadedUrls.push(publicUrl);

        setUploads((prev) =>
          prev.map((x) => (x.id === u.id ? { ...x, status: "done", publicUrl } : x))
        );
      } catch (e: any) {
        setUploads((prev) =>
          prev.map((x) =>
            x.id === u.id
              ? { ...x, status: "error", error: e?.message ?? "Upload error" }
              : x
          )
        );
      }
    }

    return uploadedUrls;
  }

  async function send() {
    setLoading(true);
    setError(null);

    try {
      const t = text.trim();

      // ✅ Take a snapshot *once* so we can deterministically compute URLs to send.
      const snapshot = uploads;

      // 1) Upload queued items from snapshot (returns new URLs deterministically)
      const newlyUploaded = snapshot.some((u) => u.status === "queued")
        ? await uploadQueuedFromSnapshot(snapshot)
        : [];

      // 2) Collect already-done URLs from snapshot (these are stable)
      const alreadyDone = snapshot
        .filter((u) => u.status === "done" && u.publicUrl)
        .map((u) => u.publicUrl!);

      // 3) Build final URLs list (don’t rely on state updates timing)
      const urls = dedupe([...alreadyDone, ...newlyUploaded]).filter(Boolean);

      // If any upload errors exist (in snapshot or after upload attempt), block send
      // We check current state as well since upload attempts may have errored.
      if (uploads.some((u) => u.status === "error")) {
        throw new Error("One or more photos failed to upload. Remove them or try again.");
      }

      if (!t && urls.length === 0) {
        throw new Error("Write a message or attach a photo.");
      }

      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: t || null, attachments: urls }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to send");

      // ✅ clear safely (revoke previews)
      snapshot.forEach((u) => u.previewUrl && URL.revokeObjectURL(u.previewUrl));
      setText("");
      setUploads([]);

      window.dispatchEvent(new Event("c2c:message-sent"));
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? "Failed to send");
    } finally {
      setLoading(false);
    }
  }

  const selectedLabel = useMemo(() => {
    if (!uploads.length) return "No photos selected";
    return `${uploads.length} selected`;
  }, [uploads.length]);

  return (
    <div className="grid gap-3">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={projectTitle ? `Message about: ${projectTitle}` : "Write a message…"}
      />

      <div className="grid gap-2">
        <div className="text-[13px] text-[var(--muted)]">Attach photos (optional, up to 10)</div>

        <label className="inline-flex items-center gap-4">
          <span className="inline-flex h-10 cursor-pointer items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-[13px] font-medium text-[var(--text)] hover:bg-[var(--surface-2)]">
            Choose photos
          </span>

          <span className="text-[13px] text-[var(--muted)]">{selectedLabel}</span>

          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => onPickFiles(e.target.files)}
            className="hidden"
          />
        </label>

        {uploads.length ? (
          <div className="grid gap-2 sm:grid-cols-3 md:grid-cols-4">
            {uploads.map((u) => (
              <div
                key={u.id}
                className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u.previewUrl} alt="Upload preview" className="h-28 w-full object-contain bg-[var(--surface-2)]" />

                <div className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-2">
                  <span className="rounded-full border border-[var(--border)] bg-[rgba(0,0,0,0.35)] px-2 py-1 text-[11px] text-white">
                    {u.status === "queued"
                      ? "Ready"
                      : u.status === "uploading"
                      ? "Uploading"
                      : u.status === "done"
                      ? "Uploaded"
                      : "Error"}
                  </span>

                  <Button type="button" variant="secondary" size="sm" onClick={() => removeAt(u.id)}>
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="text-[13px] text-[var(--muted)]">
          {text.trim().length === 0 ? helperText(projectStatus) : " "}
        </div>
        <Button
          type="button"
          onClick={send}
          disabled={loading || (!text.trim() && uploads.length === 0)}
          variant="primary"
        >
          {loading ? "Sending..." : "Send"}
        </Button>
      </div>

      {error ? <div className="text-[13px] text-[var(--danger)]">{error}</div> : null}
    </div>
  );
}