import { Avatar } from "@/components/ui/Avatar";
import { COUNTRIES } from "@/lib/lookup/countries";

const COUNTRY_LABEL_BY_CODE = new Map(COUNTRIES.map((c) => [c.value, c.label]));

type Item = {
  id: string;
  createdAt: Date;
  dressmakerProfile: {
    id: string;
    displayName: string | null;
    countryCode: string | null; // ✅ was location
    user: { id: string; name: string | null; username: string | null; image: string | null };
  };
};

export default function SavedDressmakers({ items }: { items: Item[] }) {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Saved dressmakers</h2>
        <a className="underline text-sm" href="/dressmakers">
          Browse →
        </a>
      </div>

      {items.length === 0 ? (
        <p className="mt-3 text-sm opacity-80">No saved dressmakers yet.</p>
      ) : (
        <div className="mt-4 grid gap-3">
          {items.map((s) => {
            const u = s.dressmakerProfile.user;

            const displayName =
              s.dressmakerProfile.displayName ??
              u.name ??
              u.username ??
              "Dressmaker";

            const countryLabel = s.dressmakerProfile.countryCode
              ? COUNTRY_LABEL_BY_CODE.get(s.dressmakerProfile.countryCode) ?? s.dressmakerProfile.countryCode
              : undefined;

            const subtitle = countryLabel ?? u.username ?? undefined;

            return (
              <a
                key={s.id}
                href={`/dressmakers/${s.dressmakerProfile.id}`}
                className="flex items-center gap-3 rounded-xl border p-3 hover:opacity-90"
              >
                <Avatar name={displayName} subtitle={subtitle} />

                <div className="min-w-0">
                  <div className="font-medium truncate">{displayName}</div>
                  {countryLabel ? (
                    <div className="text-sm opacity-70 truncate">{countryLabel}</div>
                  ) : null}
                </div>
              </a>
            );
          })}
        </div>
      )}

      <p className="mt-4 text-xs opacity-60">
        Tip: Add a “Save” button on the dressmaker page that calls{" "}
        <code>/api/customer/saved-dressmakers</code>.
      </p>
    </div>
  );
}