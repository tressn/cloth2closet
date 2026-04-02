"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";

type UploadItem = {
  file: File;
  status: "queued" | "uploading" | "done" | "error";
  publicUrl?: string;
  error?: string;
};

async function presignReviewUpload(projectId: string, file: File) {
  const res = await fetch("/api/uploads/reviews/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId,
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

export default function ReviewForm({ projectId }: { projectId: string }) {
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const photoUrls = useMemo(
    () => uploads.filter((u) => u.status === "done" && u.publicUrl).map((u) => u.publicUrl!),
    [uploads]
  );

  function onPickFiles(files: FileList | null) {
    if (!files) return;

    const MAX = 10;
    const picked = Array.from(files).slice(0, MAX);

    setUploads((prev) => {
      const next = [...prev, ...picked.map((f) => ({ file: f, status: "queued" as const }))].slice(0, MAX);
      return next;
    });
  }

  async function uploadAllQueued() {
    const snapshot = uploads;

    for (let i = 0; i < snapshot.length; i++) {
      const item = snapshot[i];
      if (item.status !== "queued") continue;

      setUploads((prev) => prev.map((u, idx) => (idx === i ? { ...u, status: "uploading" } : u)));

      try {
        const { uploadUrl, publicUrl } = await presignReviewUpload(projectId, item.file);
        await putToS3(uploadUrl, item.file);
        setUploads((prev) => prev.map((u, idx) => (idx === i ? { ...u, status: "done", publicUrl } : u)));
      } catch (e: any) {
        setUploads((prev) =>
          prev.map((u, idx) => (idx === i ? { ...u, status: "error", error: e?.message ?? "Upload error" } : u))
        );
      }
    }
  }

  function removeAt(idx: number) {
    setUploads((prev) => prev.filter((_, i) => i !== idx));
  }

  async function submit() {
    setErr(null);
    setLoading(true);

    try {
      if (text.trim().length > 1500) throw new Error("Review is too long (max 1500 characters).");

      if (uploads.some((u) => u.status === "queued")) {
        await uploadAllQueued();
      }
      if (uploads.some((u) => u.status === "error")) {
        throw new Error("One or more photos failed to upload. Remove them or try again.");
      }

      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, rating, text: text.trim(), photoUrls }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to submit review");

      setOk(true);
    } catch (e: any) {
      setErr(e?.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  }

  if (ok) {
    return (
      <div className="space-y-2">
        <div className="text-sm text-[var(--text)] font-medium">Review submitted ✅</div>
        <a className="underline text-sm" href="/dashboard/customer/projects">
          Back to projects
        </a>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <div className="text-[12px] font-medium text-[var(--muted)]">Rating</div>
        <select
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
          className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[15px] text-[var(--text)]"
        >
          {[5, 4, 3, 2, 1].map((r) => (
            <option key={r} value={r}>
              {r} / 5
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-2">
        <div className="text-[12px] font-medium text-[var(--muted)]">Describe the experience (optional)</div>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Quality, communication, timeline…"
          maxLength={1500}
        />
        <div className="text-[12px] text-[var(--muted)]">{text.length}/1500</div>
      </div>

      <div className="grid gap-2">
        <div className="text-[12px] font-medium text-[var(--muted)]">Photos (optional, up to 10)</div>
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
                    {u.status === "uploading" ? "Uploading…" : null}
                    {u.status === "done" ? "Uploaded" : null}
                    {u.status === "error" ? `Error: ${u.error ?? "Upload failed"}` : null}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button type="button" variant="secondary" onClick={() => removeAt(idx)}>
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {err ? <div className="text-[13px] text-[var(--danger)]">{err}</div> : null}

      <Button type="button" onClick={submit} disabled={loading} variant="primary">
        {loading ? "Submitting…" : "Submit review"}
      </Button>

      <div className="text-[12px] text-[var(--muted)]">
        This review is verified when it’s tied to a completed project with settled final payment.
      </div>
    </div>
  );
}