import React from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-medium " +
    "focus-visible:ring-2 focus-visible:ring-[var(--plum-500)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] " +
    "disabled:opacity-50 disabled:cursor-not-allowed";

  const sizes = size === "sm" ? "h-9 px-3 text-[14px]" : "h-11 px-4 text-[15px]";

  const variants: Record<Variant, string> = {
    primary: "bg-[var(--plum-500)] text-white hover:bg-[var(--plum-600)]",
    secondary:
      "bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--border)] border border-[var(--border)]",
    ghost: "bg-transparent text-[var(--text)] hover:bg-[var(--surface-2)]",
    danger: "bg-[var(--danger)] text-white hover:opacity-90",
  };

  return (
    <button className={[base, sizes, variants[variant], className].join(" ")} {...props}>
      {children}
    </button>
  );
}
