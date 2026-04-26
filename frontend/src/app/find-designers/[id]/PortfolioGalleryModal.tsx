"use client";

import { useEffect, useMemo, useState } from "react";

type Item = {
  id: string;
  title: string;
  imageUrls: string[];
};

export default function PortfolioGalleryModal({ items }: { items: Item[] }) {
  const [open, setOpen] = useState(false);
  const [itemIndex, setItemIndex] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);

  const current = items[itemIndex];
  const photos = current?.imageUrls ?? [];

  const canPrev = photoIndex > 0;
  const canNext = photoIndex < photos.length - 1;

  const title = useMemo(() => current?.title ?? "", [current]);

  function close() {
    setOpen(false);
  }

  function openItem(i: number) {
    setItemIndex(i);
    setPhotoIndex(0);
    setOpen(true);
  }

  function prev() {
    setPhotoIndex((p) => Math.max(0, p - 1));
  }

  function next() {
    setPhotoIndex((p) => Math.min(photos.length - 1, p + 1));
  }

  useEffect(() => {
    if (!open) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, photos.length]);

  if (items.length === 0) return null;

  return (
    <>
      {/* Grid wrapper is handled by the server page; this component just provides openItem */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it, i) => (
          <button
            key={it.id}
            type="button"
            onClick={() => openItem(i)}
            className="group overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] text-left"
          >
            <div className="aspect-[4/3] bg-[var(--surface-2)]">
              {it.imageUrls?.[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={it.imageUrls[0]}
                  alt={it.title}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-[13px] text-[var(--muted)]">
                  Images coming soon
                </div>
              )}
            </div>
            <div className="p-4">
              <div className="text-[14px] font-semibold text-[var(--text)]">{it.title}</div>
              <div className="mt-1 text-[12px] text-[var(--muted)]">
                {it.imageUrls.length > 1 ? `${it.imageUrls.length} photos` : "1 photo"}
              </div>
            </div>
          </button>
        ))}
      </div>

      {open ? (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-[rgba(0,0,0,0.55)]"
            onClick={close}
          />

          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)]">
              <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
                <div className="min-w-0">
                  <div className="truncate text-[15px] font-semibold text-[var(--text)]">
                    {title}
                  </div>
                  <div className="mt-1 text-[12px] text-[var(--muted)]">
                    {photos.length ? `${photoIndex + 1} / ${photos.length}` : ""}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={close}
                  className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-[13px] font-medium text-[var(--text)] hover:bg-[var(--border)]"
                >
                  Close
                </button>
              </div>

              <div className="relative bg-[var(--surface-2)]">
                <div className="flex items-center justify-center p-3">
                  {photos[photoIndex] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photos[photoIndex]}
                      alt={title}
                      className="max-h-[70vh] w-auto max-w-full object-contain"
                    />
                  ) : null}
                </div>

                {photos.length > 1 ? (
                  <>
                    <button
                      type="button"
                      onClick={prev}
                      disabled={!canPrev}
                      className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.7)] px-3 py-2 text-[13px] font-medium disabled:opacity-40"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      onClick={next}
                      disabled={!canNext}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.7)] px-3 py-2 text-[13px] font-medium disabled:opacity-40"
                    >
                      →
                    </button>
                  </>
                ) : null}
              </div>

              {photos.length > 1 ? (
                <div className="flex gap-2 overflow-x-auto border-t border-[var(--border)] bg-[var(--surface)] p-3">
                  {photos.map((u, idx) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setPhotoIndex(idx)}
                      className={[
                        "h-16 w-16 shrink-0 overflow-hidden rounded-xl border",
                        idx === photoIndex ? "border-[rgba(199,162,74,0.45)]" : "border-[var(--border)]",
                      ].join(" ")}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={u} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}