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
      <div className="text-[20px] font-semibold leading-[28px] text-[var(--text)] sm:text-[var(--text-2xl)] sm:leading-[var(--lh-2xl)]">
        {title}
      </div>
      {subtitle ? (
        <div className="mt-1.5 text-[14px] leading-[20px] text-[var(--muted)] sm:mt-2 sm:text-[var(--text-md)] sm:leading-[var(--lh-md)]">
          {subtitle}
        </div>
      ) : null}

      {tabs?.length ? (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 sm:mt-6 sm:flex-wrap sm:overflow-visible sm:pb-0">
          {tabs.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-[13px] font-medium text-[var(--text)] hover:bg-[var(--surface-2)]"
            >
              {t.label}
            </Link>
          ))}
        </div>
      ) : null}

      <div className="mt-6 sm:mt-8">{children}</div>
    </section>
  );
}