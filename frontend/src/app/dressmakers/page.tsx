import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Container } from "@/components/ui/Container";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { COUNTRIES } from "@/lib/lookup/countries";
import TagsFilterClient from "./TagsFilter.client";

const COUNTRY_LABEL_BY_CODE = new Map(COUNTRIES.map((c) => [c.value, c.label]));

export default async function DressmakersListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;

  const q = getFirst(sp.q)?.trim() ?? "";
  const countryCode = getFirst(sp.countryCode)?.trim() ?? "";
  const language = getFirst(sp.language)?.trim() ?? "";
  const minPriceRaw = getFirst(sp.minPrice)?.trim() ?? "";
  const minPrice = minPriceRaw ? Number(minPriceRaw) : undefined;

  const where: any = {
    isPublished: true,
    isPaused: false,
    approvalStatus: "APPROVED",
  };

  const tagIdsRaw = sp.tag;
  const tagIds = (Array.isArray(tagIdsRaw) ? tagIdsRaw : tagIdsRaw ? [tagIdsRaw] : [])
    .map((x) => String(x).trim())
    .filter(Boolean)
      .slice(0, 10);

  if (q) {
    where.OR = [
      { displayName: { contains: q, mode: "insensitive" } },
      { bio: { contains: q, mode: "insensitive" } },

      // Specialty labels
      {
        dressmakerSpecialties: {
          some: {
            label: {
              status: "APPROVED",
              scope: "SPECIALTY",
              name: { contains: q, mode: "insensitive" },
            },
          },
        },
      },

      // ✅ Portfolio labels
      {
        portfolioItems: {
          some: {
            portfolioItemLabels: {
              some: {
                label: {
                  status: "APPROVED",
                  scope: "PORTFOLIO",
                  name: { contains: q, mode: "insensitive" },
                },
              },
            },
          },
        },
      },
    ];
  }

  if (tagIds.length) {
    // AND with other filters, but OR within selected tags
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : []),
      {
        OR: [
          // Match portfolio item labels
          {
            portfolioItems: {
              some: {
                portfolioItemLabels: {
                  some: {
                    labelId: { in: tagIds },
                  },
                },
              },
            },
          },

          // Optional: also match specialties by same label ids
          {
            dressmakerSpecialties: {
              some: {
                labelId: { in: tagIds },
              },
            },
          },
        ],
      },
    ];
  }

  if (countryCode) where.countryCode = countryCode;
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
      countryCode: true,
      basePriceFrom: true,
      currency: true,
      yearsExperience: true,
      languages: true,
      dressmakerSpecialties: {
        select: { label: { select: { name: true } } },
      },

      // ✅ NEW: pull a small slice of portfolio items for thumbnails
      portfolioItems: {
        orderBy: { createdAt: "desc" },
        take: 6,
        select: { id: true, imageUrls: true, isFeatured: true },
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
              <CardHeader
                title="Search"
                subtitle="Tip: try “bridal”, “eveningwear”, “alterations”, or a specialty label."
              />
              <CardBody>
                <SearchBar initial={{ q, countryCode, language, minPrice: minPriceRaw }} />
                <TagsFilterClient />

                <div className="mt-4 text-[14px] text-[var(--muted)]">
                  Showing{" "}
                  <span className="font-semibold text-[var(--text)]">{dressmakers.length}</span>{" "}
                  result{dressmakers.length === 1 ? "" : "s"}
                </div>
              </CardBody>
            </Card>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {dressmakers.map((d) => {
                const label = d.countryCode ? COUNTRY_LABEL_BY_CODE.get(d.countryCode) ?? d.countryCode : null;

                const specialties = d.dressmakerSpecialties
                  .map((s: { label: { name: string } }) => s.label.name)
                  .filter(Boolean);

                // ✅ Thumbnails: featured first, then recent, take 3
                const thumbs = (d.portfolioItems ?? [])
                  .filter((p) => p.imageUrls?.[0])
                  .sort((a, b) => Number(!!b.isFeatured) - Number(!!a.isFeatured))
                  .slice(0, 3)
                  .map((p) => ({
                    id: p.id,
                    url: p.imageUrls[0]!,
                    featured: !!p.isFeatured,
                  }));

                return (
                  <Link key={d.id} href={`/dressmakers/${d.id}`} className="block">
                    <Card className="h-full hover:shadow-[0_14px_36px_rgba(27,20,24,0.12)]">
                      <CardBody>
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="truncate text-[16px] font-semibold text-[var(--text)]">
                              {d.displayName ?? "Dressmaker"}
                            </div>

                            {label ? (
                              <div className="mt-2 text-[14px] text-[var(--muted)]">📍 {label}</div>
                            ) : (
                              <div className="mt-2 text-[14px] text-[var(--muted)]">📍 Country not listed</div>
                            )}
                          </div>

                          {d.yearsExperience != null ? <Badge tone="neutral">{d.yearsExperience} yrs</Badge> : null}
                        </div>

                        {/* ✅ Thumbnail strip */}
                        {thumbs.length ? (
                          <div className="mt-4 flex items-center gap-1.5">
                            {thumbs.map((t) => (
                              <div
                                key={t.id}
                                className="relative aspect-[4/5] overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-2)]"
                                title={t.featured ? "Featured work" : "Recent work"}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={t.url}
                                  alt="Portfolio thumbnail"
                                  className="h-full w-full object-cover object-center"
                                  loading="lazy"
                                />
                                {t.featured ? (
                                  <span className="absolute left-1 top-1 rounded-full bg-[var(--plum-600)] px-2 py-0.5 text-[10px] font-semibold text-white">
                                    ★
                                  </span>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-4 text-[13px] text-[var(--muted)]">
                            No portfolio images yet.
                          </div>
                        )}

                        <div className="mt-4 text-[14px] text-[var(--muted)]">
                          💰{" "}
                          {d.basePriceFrom != null
                            ? new Intl.NumberFormat("en-US", {
                                style: "currency",
                                currency: d.currency,
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0,
                              }).format(d.basePriceFrom)
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
            {COUNTRIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
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
        <div className="text-[12px] font-medium text-[var(--muted)]">Min price</div>
        <div className="mt-2">
          <Input name="minPrice" defaultValue={initial.minPrice} placeholder="500" />
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