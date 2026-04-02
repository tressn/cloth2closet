import { formatMoney } from "@/lib/money";

type QuoteItem = {
  id: string;
  projectCode: string;
  status: string;
  quotedTotalAmount: number | null;
  currency: string;
  updatedAt: Date;
  dressmaker: { name: string | null; username: string | null };
};

export default function MyQuotes({ items }: { items: QuoteItem[] }) {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold">My quotes</h2>
      <p className="mt-1 text-sm opacity-80">Quotes are attached to projects once a dressmaker submits pricing.</p>

      {items.length === 0 ? (
        <p className="mt-3 text-sm opacity-80">No quotes yet.</p>
      ) : (
        <div className="mt-4 grid gap-3">
          {items.map((q) => (
            <a
              key={q.id}
              href={`/dashboard/customer/projects/${q.id}`}
              className="block min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 hover:bg-[var(--surface-2)]"
            >
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-semibold text-[var(--text)]">
                    Project {q.projectCode}
                  </div>
                  <div className="mt-1 truncate text-[13px] text-[var(--muted)]">
                    Dressmaker: {q.dressmaker.name ?? q.dressmaker.username ?? "Dressmaker"}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[12px] font-medium text-[var(--muted)]">
                    {q.status}
                  </span>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-[14px] font-semibold text-[var(--text)]">
                  {formatMoney(q.quotedTotalAmount, q.currency)}
                </span>
                <span className="text-[12px] text-[var(--muted)]">
                  • updated {new Date(q.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
