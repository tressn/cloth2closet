import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Container } from "@/components/ui/Container";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { COUNTRY_GROUPS, COUNTRIES } from "@/lib/lookup/countries";

const COUNTRY_LABEL_BY_CODE = new Map(COUNTRIES.map((c) => [c.value, c.label]));

export default async function DressmakersListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;

  const q = getFirst(sp.q)?.trim() ?? "";
  const countryCode = getFirst(sp.countryCode)?.trim() ?? ""; // ✅ was location
  const language = getFirst(sp.language)?.trim() ?? "";
  const minPriceRaw = getFirst(sp.minPrice)?.trim() ?? "";
  const minPrice = minPriceRaw ? Number(minPriceRaw) : undefined;

  const where: any = {
    isPublished: true,
    isPaused: false,
    approvalStatus: "APPROVED",
  };

  if (q) {
    where.OR = [
      { displayName: { contains: q, mode: "insensitive" } },
      { bio: { contains: q, mode: "insensitive" } },
      // ✅ specialties live in Labels now
      {
        dressmakerSpecialties: {
          some: {
            label: {
              name: { contains: q, mode: "insensitive" },
            },
          },
        },
      },
    ];
  }

  // ✅ country filter
  if (countryCode) where.countryCode = countryCode;

  if (language) where.languages = { has: language };

  // NOTE: basePriceFrom is stored in cents in your schema comments
  if (typeof minPrice === "number" && Number.isFinite(minPrice)) {
    where.basePriceFrom = { gte: Math.max(0, Math.trunc(minPrice)) };
  }

  const dressmakers = await prisma.dressmakerProfile.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: {
      id: true,
      displayName: true,
      countryCode: true, // ✅ was location
      basePriceFrom: true,
      currency: true,
      yearsExperience: true,
      languages: true,
      dressmakerSpecialties: {
        select: {
          label: { select: { name: true } },
        },
      },
    },
  });

  return (
    <div className="bg-[var(--bg)]">
      <Container>
        <main className="py-10">
          <div className="max-w-5xl">
            <div className="text-[var(--text-2xl)] font-semibold leading-[var(--lh-2xl)] text-[var(--text)]">
              Dressmakers
            </div>
            <div className="mt-2 text-[var(--text-md)] leading-[var(--lh-md)] text-[var(--muted)]">
              Find makers by style, country, language, and starting price.
            </div>

            <Card className="mt-6">
              <CardHeader title="Search" subtitle="Tip: try “bridal”, “eveningwear”, “alterations”, or a specialty label." />
              <CardBody>
                <SearchBar initial={{ q, countryCode, language, minPrice: minPriceRaw }} />

                <div className="mt-4 text-[14px] text-[var(--muted)]">
                  Showing <span className="font-semibold text-[var(--text)]">{dressmakers.length}</span> result
                  {dressmakers.length === 1 ? "" : "s"}
                </div>
              </CardBody>
            </Card>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {dressmakers.map((d) => {
                const label = d.countryCode ? COUNTRY_LABEL_BY_CODE.get(d.countryCode) ?? d.countryCode : null;

                const specialties = d.dressmakerSpecialties
                  .map((s: { label: { name: string } }) => s.label.name) // ✅ fixes implicit any
                  .filter(Boolean);

                return (
                  <Link key={d.id} href={`/dressmakers/${d.id}`} className="block">
                    <Card className="h-full hover:shadow-[0_14px_36px_rgba(27,20,24,0.12)]">
                      <CardBody>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-[16px] font-semibold text-[var(--text)]">{d.displayName ?? "Dressmaker"}</div>

                            {label ? (
                              <div className="mt-2 text-[14px] text-[var(--muted)]">📍 {label}</div>
                            ) : (
                              <div className="mt-2 text-[14px] text-[var(--muted)]">📍 Country not listed</div>
                            )}
                          </div>

                          {d.yearsExperience != null ? <Badge tone="neutral">{d.yearsExperience} yrs</Badge> : null}
                        </div>

                        <div className="mt-4 text-[14px] text-[var(--muted)]">
                          💰{" "}
                          {d.basePriceFrom != null
                            ? `${formatCents(d.basePriceFrom)} ${d.currency}`
                            : "Pricing not listed"}
                        </div>

                        {d.languages.length > 0 ? (
                          <div className="mt-3 text-[13px] text-[var(--muted)]">
                            🗣️ {d.languages.slice(0, 3).join(", ")}
                            {d.languages.length > 3 ? "…" : ""}
                          </div>
                        ) : null}

                        {specialties.length > 0 ? (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {specialties.slice(0, 4).map((name: string) => (
                              <span
                                key={name}
                                className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-[12px] font-medium text-[var(--muted)]"
                              >
                                {name}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </CardBody>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        </main>
      </Container>
    </div>
  );
}

function getFirst(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function SearchBar({
  initial,
}: {
  initial: { q: string; countryCode: string; language: string; minPrice: string };
}) {
  return (
    <form action="/dressmakers" method="GET" className="grid gap-3 md:grid-cols-5 md:items-end">
      <div className="md:col-span-2">
        <div className="text-[12px] font-medium text-[var(--muted)]">Search</div>
        <div className="mt-2">
          <Input name="q" defaultValue={initial.q} placeholder="bridal, eveningwear, alterations…" />
        </div>
      </div>

      <div>
        <div className="text-[12px] font-medium text-[var(--muted)]">Country</div>
        <div className="mt-2">
          <select
            name="countryCode"
            defaultValue={initial.countryCode}
            className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[15px] text-[var(--text)]"
          >
            <option value="">Any country</option>
            {COUNTRY_GROUPS.map((group) => (
              <optgroup key={group.continent} label={group.continent}>
                {group.countries.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      </div>

      <div>
        <div className="text-[12px] font-medium text-[var(--muted)]">Language</div>
        <div className="mt-2">
          <Input name="language" defaultValue={initial.language} placeholder="en" />
        </div>
      </div>

      <div>
        <div className="text-[12px] font-medium text-[var(--muted)]">Min price (cents)</div>
        <div className="mt-2">
          <Input name="minPrice" defaultValue={initial.minPrice} placeholder="50000" />
        </div>
      </div>

      <div className="md:col-span-5 flex justify-end">
        <Button type="submit" variant="primary">
          Search
        </Button>
      </div>
    </form>
  );
}