"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({
  href,
  label,
  hint,
}: {
  href: string;
  label: string;
  hint?: string;
}) {
  const pathname = usePathname();

  const active =
    href === "/dashboard"
      ? pathname === "/dashboard" // ✅ exact match only for Home
      : pathname === href || pathname?.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={[
        "block rounded-xl border px-4 py-3",
        active
          ? "border-[rgba(134,56,111,0.35)] bg-[rgba(134,56,111,0.08)]"
          : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)]",
      ].join(" ")}
    >
      <div className="text-[14px] font-semibold text-[var(--text)]">{label}</div>
      {hint ? (
        <div className="mt-1 text-[12px] leading-5 text-[var(--muted)]">
          {hint}
        </div>
      ) : null}
    </Link>
  );
}