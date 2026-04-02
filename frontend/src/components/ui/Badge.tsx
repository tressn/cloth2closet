import React from "react";

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "featured" | "success" | "danger";
}) {
  const tones = {
    neutral: "bg-[var(--surface-2)] text-[var(--muted)] border-[var(--border)]",
    featured: "bg-[rgba(199,162,74,0.14)] text-[var(--text)] border-[rgba(199,162,74,0.35)]",
    success: "bg-[rgba(46,107,87,0.12)] text-[var(--text)] border-[rgba(46,107,87,0.35)]",
    danger: "bg-[rgba(134,56,111,0.10)] text-[var(--text)] border-[rgba(134,56,111,0.35)]",
  }


  return (
    <span className={["inline-flex items-center rounded-full border px-3 py-1 text-[12px] font-medium", tones[tone]].join(" ")}>
      {children}
    </span>
  );
}
