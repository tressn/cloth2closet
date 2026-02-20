import React from "react";

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        "rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)]",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

export function CardBody({ 
  children, 
  className = "", 
}: { 
  children: React.ReactNode;
  className?: string;
 }) {
  return <div className="px-6 py-6">{children}</div>;
}

export function CardHeader({
  title,
  subtitle,
  right,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-6 py-5">
      <div>
        <div className="text-[18px] font-semibold leading-7 text-[var(--text)]">{title}</div>
        {subtitle ? (
          <div className="mt-1 text-[14px] leading-6 text-[var(--muted)]">{subtitle}</div>
        ) : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}
