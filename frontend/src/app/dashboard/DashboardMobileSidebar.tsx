"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

export default function DashboardMobileSidebar({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Toggle button — only visible on mobile (below lg) */}
      <button
        className="mb-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[14px] font-semibold text-[var(--text)] active:bg-[var(--surface-2)] lg:hidden"
        onClick={() => setOpen((v) => !v)}
      >
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="5" x2="17" y2="5" />
          <line x1="3" y1="10" x2="17" y2="10" />
          <line x1="3" y1="15" x2="17" y2="15" />
        </svg>
        {open ? "Close menu" : "Dashboard menu"}
      </button>

      {/* Mobile overlay */}
      {open ? (
        <div className="fixed inset-0 top-16 z-30 overflow-y-auto bg-[var(--bg)] px-4 pb-8 pt-4 lg:hidden">
          {children}
        </div>
      ) : null}

      {/* Desktop sidebar — always visible at lg+ */}
      <aside className="hidden lg:block">
        {children}
      </aside>
    </>
  );
}