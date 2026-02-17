import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Container } from "@/components/ui/Container";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export default async function DressmakersListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;

  const q = getFirst(sp.q)?.trim() ?? "";
  const location = getFirst(sp.location)?.trim() ?? "";
  const language = getFirst(sp.language)?.trim() ?? "";
  const minPriceRaw = getFirst(sp.minPrice)?.trim() ?? "";
  const minPrice = minPriceRaw ? Number(minPriceRaw) : undefined;

  const where: any = { isPublished: true, isPaused: false };

  if (q) {
    where.OR = [
      { displayName: { contains: q, mode: "insensitive" } },
      { bio: { contains: q, mode: "insensitive" } },
      { specialties: { has: q } },
    ];
  }
  if (location) where.location = { contains: location, mode: "insensitive" };
  if (language) where.languages = { has: language };
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
      location: true,
      basePriceFrom: true,
      currency: true,
      yearsExperience: true,
      languages: true,
      specialties: true,
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
              Find makers by style, location, language, and starting price.
            </div>

            <Card className="mt-6">
              <CardHeader
                title="Search"
                subtitle="Tip: try “bridal”, “eveningwear”, “alterations”, or a city."
              />
              <CardBody>
                <SearchBar
                  initial={{ q, location, language, minPrice: minPriceRaw }}
                />
                <div className="mt-4 text-[14px] text-[var(--muted)]">
                  Showing <span className="font-semibold text-[var(--text)]">{dressmakers.length}</span> result
                  {dressmakers.length === 1 ? "" : "s"}
                </div>
              </CardBody>
            </Card>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {dressmakers.map((d) => (
                <Link key={d.id} href={`/dressmakers/${d.id}`} className="block">
                  <Card className="h-full hover:shadow-[0_14px_36px_rgba(27,20,24,0.12)]">
                    <CardBody>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-[16px] font-semibold text-[var(--text)]">
                            {d.displayName ?? "Dressmaker"}
                          </div>
                          {d.location ? (
                            <div className="mt-2 text-[14px] text-[var(--muted)]">📍 {d.location}</div>
                          ) : (
                            <div className="mt-2 text-[14px] text-[var(--muted)]">📍 Location not listed</div>
                          )}
                        </div>
                        {d.yearsExperience != null ? (
                          <Badge tone="neutral">{d.yearsExperience} yrs</Badge>
                        ) : null}
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

                      {d.specialties.length > 0 ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {d.specialties.slice(0, 4).map((s) => (
                            <span
                              key={s}
                              className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-[12px] font-medium text-[var(--muted)]"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </CardBody>
                  </Card>
                </Link>
              ))}
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
  initial: { q: string; location: string; language: string; minPrice: string };
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
        <div className="text-[12px] font-medium text-[var(--muted)]">Location</div>
        <div className="mt-2">
          <Input name="location" defaultValue={initial.location} placeholder="Brooklyn" />
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
        <Button type="submit" variant="primary">Search</Button>
      </div>
    </form>
  );
}
