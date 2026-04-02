"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

type UploadItem = {
  file: File;
  status: "queued" | "uploading" | "done" | "error";
  publicUrl?: string;
  error?: string;
};

async function presignProjectUpload(projectId: string, file: File) {
  const res = await fetch("/api/uploads/projects/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId,
      filename: file.name,
      contentType: file.type,
      purpose: "support",
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Failed to presign upload");
  return data as { uploadUrl: string; publicUrl: string };
}

async function putToS3(uploadUrl: string, file: File) {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!res.ok) throw new Error("Upload failed");
}

export default function SupportForm() {

  const { data: session, status: authStatus } = useSession();
  const loggedIn = authStatus === "authenticated";
  const sessionEmail = (session?.user as any)?.email as string | undefined;
  const [email, setEmail] = useState("");

  const [category, setCategory] = useState("ACCOUNT_ROLE");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [projectId, setProjectId] = useState("");

  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const MAX_MESSAGE_LENGTH = 2000;
  const MIN_MESSAGE_LENGTH = 10;

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

    setUploads((prev) => [...prev, ...picked.map((f) => ({ file: f, status: "queued" as const }))].slice(0, 5));
  }

  function removeAt(idx: number) {
    setUploads((prev) => prev.filter((_, i) => i !== idx));
  }

  async function uploadAllQueued() {
    const pid = projectId.trim();
    if (!pid) throw new Error("Add a Project ID to attach images (so we can authorize access).");

    const queuedIndices = uploads
    .map((u, idx) => (u.status === "queued" ? idx : -1))
    .filter((idx) => idx !== -1);

    for (const i of queuedIndices) {
        const u = uploads[i];
        if (!u || u.status !== "queued") continue;


      setUploads((prev) => prev.map((x, idx) => (idx === i ? { ...x, status: "uploading" } : x)));

      try {
        const { uploadUrl, publicUrl } = await presignProjectUpload(pid, u.file);
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
    setLoading(true);
    setNotice(null);

    try {
      if (!subject.trim()) throw new Error("Subject is required");
      if (!message.trim()) throw new Error("Message is required");
      if (!loggedIn) {
        const e = email.trim();
        if (!e) throw new Error("Email is required so support can reply.");
        // simple email sanity check (not perfect, but good UX)
        if (!/^\S+@\S+\.\S+$/.test(e)) throw new Error("Please enter a valid email.");
      }

      if (!loggedIn && uploads.length > 0) {
        throw new Error("Please sign in to attach images for security.");
      }

      if (uploads.some((u) => u.status === "queued")) {
        await uploadAllQueued();
      }
      if (uploads.some((u) => u.status === "error")) {
        throw new Error("One or more attachments failed. Remove them or try again.");
      }

      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          subject: subject.trim(),
          message: message.trim(),
          email: loggedIn ? (sessionEmail ?? null) : email.trim(),
          projectId: projectId.trim() || null,
          attachmentUrls: attachments,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to send");

      setSubject("");
      setMessage("");
      setProjectId("");
      setUploads([]);
      setNotice("Sent! Support will follow up.");
    } catch (e: any) {
      setNotice(e?.message ?? "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <div className="text-[12px] font-medium text-[var(--muted)]">Category</div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[15px] text-[var(--text)]"
        >
          <option value="ACCOUNT_ROLE">Account / Role change</option>
          <option value="PAYMENTS">Payments</option>
          <option value="DISPUTE">Dispute</option>
          <option value="TECHNICAL">Technical</option>
          <option value="OTHER">Other</option>
        </select>

        {!loggedIn ? (
            <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email (so we can reply)"
            />
      ) : null}
      </div>

      <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
      <Textarea
        value={message}
        onChange={(e) => {
            if (e.target.value.length <= MAX_MESSAGE_LENGTH) {
            setMessage(e.target.value);
            }
        }}
        placeholder="Describe the issue…"
        maxLength={MAX_MESSAGE_LENGTH}
        />
        <div className="flex justify-end text-[12px] text-[var(--muted)]">{message.length}/{MAX_MESSAGE_LENGTH}</div>
      <Input value={projectId} onChange={(e) => setProjectId(e.target.value)} placeholder="Project ID (optional, required for attachments)" />

      <div className="grid gap-2">
        <div className="text-[13px] text-[var(--muted)]">Attach images (optional, up to 5)</div>
        <input
            type="file"
            accept="image/*"
            multiple
            disabled={!loggedIn}
            onChange={(e) => onPickFiles(e.target.files)}
            />
            {!loggedIn ? (
            <div className="text-[12px] text-[var(--muted)]">
                Sign in to attach images.
            </div>
            ) : null}

        {uploads.length ? (
          <div className="grid gap-2">
            {uploads.map((u, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
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

                <Button variant="secondary" type="button" onClick={() => removeAt(idx)}>
                  Remove
                </Button>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="text-[13px] text-[var(--muted)]">{notice ?? " "}</div>
        <Button type="button" variant="primary" disabled={loading} onClick={submit}>
          {loading ? "Sending..." : "Send"}
        </Button>
      </div>
    </div>
  );
}
