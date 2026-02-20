"use client";

import { useEffect, useId, useState } from "react";
import { MEASUREMENT_HELP } from "@/lib/measurementHelp";

export function MeasurementInfoIcon({ fieldKey }: { fieldKey: string }) {
  const info = MEASUREMENT_HELP[fieldKey];
  const [open, setOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!info) return null;

  return (
    <>
      <button
        type="button"
        aria-label={`How to measure ${info.label}`}
        onClick={() => setOpen(true)}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-[12px] font-semibold text-[var(--muted)] hover:bg-[var(--border)]"
      >
        i
      </button>

      {open ? (
        <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="fixed inset-0 z-50 flex items-center justify-center">
          <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/40" />
          <div className="relative mx-4 w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-lg">
            <div id={titleId} className="text-[16px] font-semibold text-[var(--text)]">{info.label}</div>
            <div className="mt-2 text-[13px] text-[var(--muted)]">{info.tip}</div>

            <div className="mt-4 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-2)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={info.img} alt={`${info.label} diagram`} className="h-auto w-full" />
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-10 rounded-xl bg-[var(--plum-500)] px-4 font-medium text-white hover:bg-[var(--plum-600)]"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}