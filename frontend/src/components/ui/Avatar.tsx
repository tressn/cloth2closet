import React from "react";

type AvatarProps = {
  name?: string | null;
  subtitle?: string | null;
};

function getInitials(name?: string | null) {
  if (!name) return "U";

  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "U";

  return (
    (parts[0][0] ?? "").toUpperCase() +
    (parts[parts.length - 1][0] ?? "").toUpperCase()
  );
}

export function Avatar({ name, subtitle }: AvatarProps) {
  const initials = getInitials(name);

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--plum-200)] text-[14px] font-semibold text-[var(--plum-900)]">
        {initials}
      </div>

      <div className="min-w-0">
        <div className="truncate text-[14px] font-semibold leading-5 text-[var(--text)]">
          {name ?? "Unknown user"}
        </div>

        {subtitle ? (
          <div className="truncate text-[12px] leading-4 text-[var(--muted)]">
            {subtitle}
          </div>
        ) : null}
      </div>
    </div>
  );
}
