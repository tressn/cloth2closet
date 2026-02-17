import React from "react";
import { Container } from "./Container";

export function Page({
  title,
  subtitle,
  actions,
  children,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="border-b border-[var(--border)] bg-[var(--surface)]">
        <Container>
          <div className="flex flex-col gap-4 py-10 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-[var(--text)] text-[var(--text-2xl)] font-semibold leading-[var(--lh-2xl)]">
                {title}
              </div>
              {subtitle ? (
                <div className="mt-2 text-[var(--muted)] text-[var(--text-md)] leading-[var(--lh-md)]">
                  {subtitle}
                </div>
              ) : null}
            </div>
            {actions ? <div className="shrink-0">{actions}</div> : null}
          </div>
        </Container>
      </header>

      <main className="py-10">
        <Container>{children}</Container>
      </main>
    </div>
  );
}
