"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

type Role = "CUSTOMER" | "DRESSMAKER" | "ADMIN" | null;

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

type Project = {
  id: string;
  projectCode: string;
  title: string | null;
  status: ProjectStatus;
  payment?: { status: string | null } | null;

  // ✅ belongs on Project (top-level)
  projectShipping?: {
    carrier: { name: string } | null; // matches your schema relation carrier: ShippingCarrier?
    carrierOther: string | null;
    trackingNumber: string | null;
    shippedAt: string | Date | null;
  } | null;

  details?: {
    requireSketch: boolean;
    referenceImages: string[];
    isRush: boolean;
    wantsCalico: boolean;

    sketchSubmittedAt: string | Date | null;
    sketchApprovedAt: string | Date | null;

    measurementsRequested: string[];
    measurementsConfirmedByDressmakerAt: string | Date | null;
    measurementsConfirmedByCustomerAt: string | Date | null;

    fitSampleSentAt: string | Date | null;
    fitSampleReceivedAt: string | Date | null;

    finalImages: string[];
    finalSubmittedAt: string | Date | null;
    finalApprovedAt: string | Date | null;

    completedAt: string | Date | null;
    canceledAt: string | Date | null;
    cancelReason: string | null;
  } | null;
};

function fmtDate(d: any) {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  try {
    return dt.toLocaleDateString();
  } catch {
    return "";
  }
}

async function postAction(projectId: string, payload: any) {
  const res = await fetch(`/api/projects/${projectId}/workflow`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Action failed");
  return data;
}

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

export default function ProjectProgress({ project, viewerRole }: { project: Project; viewerRole: Role }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [sketchFiles, setSketchFiles] = useState<File[]>([]);
  const [finalFiles, setFinalFiles] = useState<File[]>([]);
  const [carrier, setCarrier] = useState("");
  const [tracking, setTracking] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  const title = project.title ?? project.projectCode;
  const d = project.details;

  const paymentSettled = project.payment?.status === "SUCCEEDED";

  const steps = useMemo(() => {
    const sketchDone = !!d?.sketchApprovedAt || !d?.requireSketch;
    const measurementsDone = !!d?.measurementsConfirmedByDressmakerAt;
    const finalDone = !!d?.finalApprovedAt;

    const status = project.status;

    return [
      { key: "REQUESTED", label: "Requested", done: ["REQUESTED", "ACCEPTED", "IN_PROGRESS", "FIT_SAMPLE_SENT", "READY_TO_SHIP", "SHIPPED", "COMPLETED"].includes(status) },
      { key: "ACCEPTED", label: "Accepted", done: ["ACCEPTED", "IN_PROGRESS", "FIT_SAMPLE_SENT", "READY_TO_SHIP", "SHIPPED", "COMPLETED"].includes(status) },
      { key: "SKETCH", label: d?.requireSketch ? "Sketch approved" : "Sketch (not required)", done: sketchDone },
      { key: "IN_PROGRESS", label: "In progress", done: ["IN_PROGRESS", "FIT_SAMPLE_SENT", "READY_TO_SHIP", "SHIPPED", "COMPLETED"].includes(status) || (status === "ACCEPTED" && sketchDone && paymentSettled) },
      { key: "MEASUREMENTS", label: "Measurements confirmed", done: measurementsDone || ["READY_TO_SHIP", "SHIPPED", "COMPLETED"].includes(status) },
      ...(d?.wantsCalico ? [{ key: "FIT_SAMPLE_SENT", label: "Fit sample", done: ["FIT_SAMPLE_SENT", "READY_TO_SHIP", "SHIPPED", "COMPLETED"].includes(status) }] : []),
      { key: "READY_TO_SHIP", label: "Final approved", done: finalDone || ["READY_TO_SHIP", "SHIPPED", "COMPLETED"].includes(status) },
      { key: "SHIPPED", label: "Shipped", done: ["SHIPPED", "COMPLETED"].includes(status) },
      { key: "COMPLETED", label: "Completed", done: status === "COMPLETED" },
    ];
  }, [project.status, d, paymentSettled]);

  const pct = useMemo(() => {
    const done = steps.filter((s) => s.done).length;
    return Math.round((done / steps.length) * 100);
  }, [steps]);

  const isCustomer = viewerRole === "CUSTOMER";
  const isDressmaker = viewerRole === "DRESSMAKER";
  const isAdmin = viewerRole === "ADMIN";

  async function run(name: string, fn: () => Promise<any>) {
    setLoading(name);
    setErr(null);
    try {
      await fn();
      window.location.reload();
    } catch (e: any) {
      setErr(e?.message ?? "Action failed");
    } finally {
      setLoading(null);
    }
  }

  async function uploadMany(projectId: string, files: File[], purpose: string) {
    const MAX_MB = 10;

    const picked = files
      .filter((f) => f.type.startsWith("image/"))
      .filter((f) => f.size <= MAX_MB * 1024 * 1024)
      .slice(0, 10);

    if (!picked.length) throw new Error("Pick at least one image (PNG/JPG/WebP/HEIC).");

    const urls: string[] = [];
    for (const f of picked) {
      const { uploadUrl, publicUrl } = await presignProjectUpload(projectId, f, purpose);
      await putToS3(uploadUrl, f);
      urls.push(publicUrl);
    }
    return urls;
  }

  const canSubmitSketch =
    (isDressmaker || isAdmin) &&
    (project.status === "ACCEPTED" || project.status === "IN_PROGRESS") &&
    !!d?.requireSketch &&
    !d?.sketchApprovedAt;

  const canApproveSketch =
    (isCustomer || isAdmin) &&
    !!d?.requireSketch &&
    !!d?.sketchSubmittedAt &&
    !d?.sketchApprovedAt;

  const canConfirmMeasurementsCustomer =
  (isCustomer || isAdmin) &&
  project.status === "IN_PROGRESS" &&
  !d?.measurementsConfirmedByCustomerAt;

  const canConfirmMeasurementsDressmaker =
    (isDressmaker || isAdmin) &&
    project.status === "IN_PROGRESS" &&
    !!d?.measurementsConfirmedByCustomerAt && 
    !d?.measurementsConfirmedByDressmakerAt;

  const canMarkFitSampleSent =
    (isDressmaker || isAdmin) && project.status === "IN_PROGRESS" && !!d?.wantsCalico && !d?.fitSampleSentAt;

  const canConfirmFitSampleReceived =
    (isCustomer || isAdmin) && project.status === "FIT_SAMPLE_SENT" && !!d?.fitSampleSentAt && !d?.fitSampleReceivedAt;

  const canSubmitFinal =
    (isDressmaker || isAdmin) &&
    (project.status === "IN_PROGRESS" || project.status === "FIT_SAMPLE_SENT") &&
    !d?.finalApprovedAt;

  const canApproveFinal =
    (isCustomer || isAdmin) && !!d?.finalSubmittedAt && !d?.finalApprovedAt;

  const canMarkShipped =
    (isDressmaker || isAdmin) && project.status === "READY_TO_SHIP";

  const canMarkCompleted =
    (isCustomer || isAdmin) && project.status === "SHIPPED";

  const canCancel =
    project.status !== "COMPLETED" &&
    project.status !== "CANCELED" &&
    (isAdmin || (project.status !== "SHIPPED" && (isCustomer || isDressmaker)));

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[14px] font-semibold text-[var(--text)] truncate">{title}</div>
          <div className="text-[13px] text-[var(--muted)]">
            Status: <span className="font-semibold text-[var(--text)]">{project.status}</span>
            {d?.isRush ? <span className="ml-2">⚡ Rush</span> : null}
            {d?.wantsCalico ? <span className="ml-2">🧵 Calico</span> : null}
          </div>
        </div>
        <Badge tone="neutral">{pct}%</Badge>
      </div>

      <div className="h-2 w-full rounded-full bg-[var(--surface-2)] overflow-hidden">
        <div className="h-full bg-[var(--plum-500)]" style={{ width: `${pct}%` }} />
      </div>

      <div className="grid gap-1.5">
        {steps.map((s) => (
          <div
            key={s.key}
            className={[
              "flex items-center justify-between rounded-xl border px-4 py-3 transition-colors",
              s.done
                ? "border-[rgba(134,56,111,0.2)] bg-[rgba(134,56,111,0.05)]"
                : "border-[var(--border)] bg-[var(--surface)]",
            ].join(" ")}
          >
            <div className="flex items-center gap-3">
              {/* Refined status dot instead of emoji */}
              <div className={[
                "h-2 w-2 rounded-full shrink-0",
                s.done ? "bg-[var(--plum-500)]" : "bg-[var(--border)]",
              ].join(" ")} />
              <div className={[
                "text-[14px]",
                s.done ? "text-[var(--text)]" : "text-[var(--muted)]",
              ].join(" ")}>
                {s.label}
              </div>
            </div>
            <div className="text-[12px] text-[var(--muted)]">
              {s.done && s.key !== "REQUESTED" ? (
                <span className="text-[var(--plum-600)] font-medium">Done </span>
              ) : null}
              {s.key === "SKETCH" && d?.sketchApprovedAt
                ? <span className="ml-1 text-[var(--muted)]">{fmtDate(d.sketchApprovedAt)}</span>
                : null}
              {s.key === "SHIPPED" && project.projectShipping?.trackingNumber
                ? <span className="ml-1">{project.projectShipping.trackingNumber}</span>
                : null}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="text-[14px] font-semibold text-[var(--text)]">Next actions</div>

        {canSubmitSketch ? (
          <div className="grid gap-2">
            <div className="text-[13px] text-[var(--muted)]">Upload 1–10 sketch images. Customer must approve.</div>
            <input type="file" accept="image/*" multiple onChange={(e) => setSketchFiles(Array.from(e.target.files ?? []))} />
            <Button
              variant="primary"
              disabled={loading !== null || sketchFiles.length === 0}
              onClick={() =>
                run("SUBMIT_SKETCH", async () => {
                  const urls = await uploadMany(project.id, sketchFiles, "sketch");
                  await postAction(project.id, { action: "SUBMIT_SKETCH", images: urls });
                })
              }
            >
              {loading === "SUBMIT_SKETCH" ? "Uploading..." : "Submit sketch"}
            </Button>
          </div>
        ) : null}

        {canApproveSketch ? (
          <div className="grid gap-2">
            <div className="text-[13px] text-[var(--muted)]">
              Sketch submitted. Approve to move forward{paymentSettled ? " into production." : " (payment still required)."}
            </div>
            <Button
              variant="primary"
              disabled={loading !== null}
              onClick={() => run("APPROVE_SKETCH", () => postAction(project.id, { action: "APPROVE_SKETCH" }))}
            >
              {loading === "APPROVE_SKETCH" ? "Saving..." : "Approve sketch"}
            </Button>
          </div>
        ) : null}

        {canConfirmMeasurementsDressmaker ? (
          <Button
            variant="secondary"
            disabled={loading !== null}
            onClick={() =>
              run("CONFIRM_MEASUREMENTS_DRESSMAKER", () =>
                postAction(project.id, { action: "CONFIRM_MEASUREMENTS_DRESSMAKER" })
              )
            }
          >
            {loading === "CONFIRM_MEASUREMENTS_DRESSMAKER" ? "Saving..." : "I have all required measurements"}
          </Button>
        ) : null}

        {canConfirmMeasurementsCustomer ? (
          <Button
            variant="secondary"
            disabled={loading !== null}
            onClick={() =>
              run("CONFIRM_MEASUREMENTS_CUSTOMER", () =>
                postAction(project.id, { action: "CONFIRM_MEASUREMENTS_CUSTOMER" })
              )
            }
          >
            {loading === "CONFIRM_MEASUREMENTS_CUSTOMER" ? "Saving..." : "Confirm Measurements"}
          </Button>
        ) : null}

        {canMarkFitSampleSent ? (
          <Button
            variant="secondary"
            disabled={loading !== null}
            onClick={() => run("MARK_FIT_SAMPLE_SENT", () => postAction(project.id, { action: "MARK_FIT_SAMPLE_SENT" }))}
          >
            {loading === "MARK_FIT_SAMPLE_SENT" ? "Saving..." : "Mark fit sample sent"}
          </Button>
        ) : null}

        {canConfirmFitSampleReceived ? (
          <Button
            variant="secondary"
            disabled={loading !== null}
            onClick={() =>
              run("CONFIRM_FIT_SAMPLE_RECEIVED", () => postAction(project.id, { action: "CONFIRM_FIT_SAMPLE_RECEIVED" }))
            }
          >
            {loading === "CONFIRM_FIT_SAMPLE_RECEIVED" ? "Saving..." : "I received the fit sample"}
          </Button>
        ) : null}

        {canSubmitFinal ? (
          <div className="grid gap-2">
            <div className="text-[13px] text-[var(--muted)]">Upload final garment photos. Customer must approve before shipping.</div>
            <input type="file" accept="image/*" multiple onChange={(e) => setFinalFiles(Array.from(e.target.files ?? []))} />
            <Button
              variant="primary"
              disabled={loading !== null || finalFiles.length === 0}
              onClick={() =>
                run("SUBMIT_FINAL", async () => {
                  const urls = await uploadMany(project.id, finalFiles, "final");
                  await postAction(project.id, { action: "SUBMIT_FINAL", images: urls });
                })
              }
            >
              {loading === "SUBMIT_FINAL" ? "Uploading..." : "Submit final photos"}
            </Button>
          </div>
        ) : null}

        {canApproveFinal ? (
          <Button
            variant="primary"
            disabled={loading !== null}
            onClick={() => run("APPROVE_FINAL", () => postAction(project.id, { action: "APPROVE_FINAL" }))}
          >
            {loading === "APPROVE_FINAL" ? "Saving..." : "Approve final garment"}
          </Button>
        ) : null}

        {canMarkShipped ? (
          <div className="grid gap-2">
            <div className="grid gap-2">
              <div className="text-[12px] font-medium text-[var(--muted)]">Carrier (optional)</div>
              <input
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[15px] text-[var(--text)]"
                placeholder="USPS / UPS / DHL"
              />
            </div>

            <div className="grid gap-2">
              <div className="text-[12px] font-medium text-[var(--muted)]">Tracking number</div>
              <input
                value={tracking}
                onChange={(e) => setTracking(e.target.value)}
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[15px] text-[var(--text)]"
                placeholder="e.g. 9400..."
              />
            </div>

            <Button
              variant="primary"
              disabled={loading !== null || tracking.trim().length === 0}
              onClick={() =>
                run("MARK_SHIPPED", () => postAction(project.id, { action: "MARK_SHIPPED", carrier, trackingNumber: tracking }))
              }
            >
              {loading === "MARK_SHIPPED" ? "Saving..." : "Mark shipped"}
            </Button>
          </div>
        ) : null}

        {canMarkCompleted ? (
          <Button
            variant="primary"
            disabled={loading !== null}
            onClick={() => run("MARK_COMPLETED", () => postAction(project.id, { action: "MARK_COMPLETED" }))}
          >
            {loading === "MARK_COMPLETED" ? "Saving..." : "Mark completed"}
          </Button>
        ) : null}

        {canCancel ? (
          <div className="grid gap-2 pt-2 border-t border-[var(--border)]">
            <div className="text-[13px] text-[var(--muted)]">Need to cancel? Add a short reason (optional).</div>
            <input
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[15px] text-[var(--text)]"
              placeholder="Reason (optional)"
            />
            <Button
              variant="danger"
              disabled={loading !== null}
              onClick={() => run("CANCEL_PROJECT", () => postAction(project.id, { action: "CANCEL_PROJECT", reason: cancelReason }))}
            >
              {loading === "CANCEL_PROJECT" ? "Canceling..." : "Cancel project"}
            </Button>
          </div>
        ) : null}

        {err ? <div className="text-[13px] text-[var(--danger)]">{err}</div> : null}

        <div className="text-[12px] text-[var(--muted)]">
          Tip: Most steps also work through Messages — keep communication clear and attached to this project.
        </div>
      </div>
    </div>
  );
}
