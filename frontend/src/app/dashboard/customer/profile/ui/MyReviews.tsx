type ReviewItem = {
  id: string;
  rating: number;
  text: string | null;
  createdAt: Date;
  project: { id: string; projectCode: string; dressmaker: { name: string | null; username: string | null } };
};

export default function MyReviews({ items }: { items: ReviewItem[] }) {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold">My reviews</h2>

      {items.length === 0 ? (
        <p className="mt-3 text-sm opacity-80">You haven’t left any reviews yet.</p>
      ) : (
        <div className="mt-4 grid gap-3">
          {items.map((r) => (
            <div key={r.id} className="rounded-xl border p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="opacity-80">
                  Project {r.project.projectCode} • {r.project.dressmaker.name ?? r.project.dressmaker.username ?? "Dressmaker"}
                </span>
                <span>{"★".repeat(Math.max(1, Math.min(5, r.rating)))}</span>
              </div>
              {r.text && <p className="mt-2 text-sm">{r.text}</p>}
              <p className="mt-2 text-xs opacity-60">{new Date(r.createdAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
