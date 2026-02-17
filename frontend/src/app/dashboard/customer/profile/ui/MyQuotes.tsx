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
            <a key={q.id} href={`/dashboard/customer/projects/${q.id}`} className="rounded-xl border p-3 block hover:opacity-90">
              <div className="flex items-center justify-between">
                <div className="font-medium">Project {q.projectCode}</div>
                <div className="text-sm opacity-80">{q.status}</div>
              </div>
              <div className="mt-1 text-sm opacity-80">
                Dressmaker: {q.dressmaker.name ?? q.dressmaker.username ?? "Dressmaker"}
              </div>
              <div className="mt-2">
                <span className="font-semibold">
                  {q.quotedTotalAmount ?? 0} {q.currency}
                </span>
                <span className="text-xs opacity-60"> • updated {new Date(q.updatedAt).toLocaleDateString()}</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
