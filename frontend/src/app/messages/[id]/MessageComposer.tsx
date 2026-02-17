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

export default function MessageComposer({ conversationId }: { conversationId: string }) {
  const [text, setText] = useState("");
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const attachments = useMemo(
    () => uploads.filter((u) => u.status === "done" && u.publicUrl).map((u) => u.publicUrl!),
    [uploads]
  );

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

  async function uploadAllQueued() {
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

  async function send() {
    const t = text.trim();

    setLoading(true);
    setError(null);

    try {
      if (uploads.some((u) => u.status === "queued")) {
        await uploadAllQueued();
      }

      if (uploads.some((u) => u.status === "error")) {
        throw new Error("One or more photos failed to upload. Remove them or try again.");
      }

      if (!t && attachments.length === 0) {
        throw new Error("Write a message or attach a photo.");
      }

      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: t, attachments }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to send");

      setText("");
      setUploads([]);
      window.location.reload();
    } catch (e: any) {
      setError(e?.message ?? "Failed to send");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-3">
      <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a message…" />

      <div className="grid gap-2">
        <div className="text-[13px] text-[var(--muted)]">Attach photos (optional, up to 10)</div>
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
                    {u.status === "queued" ? "Ready to upload" : null}
                    {u.status === "uploading" ? "Uploading..." : null}
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

      <div className="flex items-center justify-between gap-3">
        <div className="text-[13px] text-[var(--muted)]">Be clear about timeline, budget, and measurements.</div>
        <Button type="button" onClick={send} disabled={loading} variant="primary">
          {loading ? "Sending..." : "Send"}
        </Button>
      </div>

      {error ? <div className="text-[13px] text-[var(--danger)]">{error}</div> : null}
    </div>
  );
}
