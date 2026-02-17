import Link from "next/link";

export function DashboardShell({
  title,
  subtitle,
  tabs,
  children,
}: {
  title: string;
  subtitle?: string;
  tabs?: { label: string; href: string }[];
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="text-[var(--text-2xl)] font-semibold leading-[var(--lh-2xl)] text-[var(--text)]">
        {title}
      </div>
      {subtitle ? (
        <div className="mt-2 text-[var(--text-md)] leading-[var(--lh-md)] text-[var(--muted)]">
          {subtitle}
        </div>
      ) : null}

      {tabs?.length ? (
        <div className="mt-6 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-[13px] font-medium text-[var(--text)] hover:bg-[var(--surface-2)]"
            >
              {t.label}
            </Link>
          ))}
        </div>
      ) : null}

      <div className="mt-8">{children}</div>
    </section>
  );
}
