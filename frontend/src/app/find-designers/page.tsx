import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Container } from "@/components/ui/Container";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { COUNTRIES } from "@/lib/lookup/countries";

const COUNTRY_LABEL_BY_CODE = new Map(COUNTRIES.map((c) => [c.value, c.label]));

export const metadata = {
  title: "Find Custom Clothing Designers · Browse Bespoke Fashion Talent · Cloth2Closet",
  description:
    "Find custom clothing designers for made-to-order fashion, bespoke outfits, special events, and personalized garments. Connect with designers for your next event.",
};

export default async function DressmakersListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;

  const q = getFirst(sp.q)?.trim() ?? "";
  const countryCode = getFirst(sp.countryCode)?.trim() ?? "";
  const maxPriceRaw = getFirst(sp.maxPrice)?.trim() ?? "";
  const maxPrice = maxPriceRaw ? Number(maxPriceRaw) : undefined;
  const specialtyId = getFirst(sp.specialty)?.trim() ?? "";

  // ✅ Load approved specialties for the dropdown
  const specialtyOptions = await prisma.label.findMany({
    where: { scope: "SPECIALTY", status: "APPROVED" },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const where: any = {
    isPublished: true,
    isPaused: false,
    approvalStatus: "APPROVED",
  };

  if (q) {
    where.OR = [
      { displayName: { contains: q, mode: "insensitive" } },
      { bio: { contains: q, mode: "insensitive" } },
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
    ];
  }

  // ✅ Single specialty dropdown filter
  if (specialtyId) {
    where.dressmakerSpecialties = {
      some: { labelId: specialtyId },
    };
  }

  if (countryCode) where.countryCode = countryCode;

  if (typeof maxPrice === "number" && Number.isFinite(maxPrice) && maxPrice > 0) {
    where.basePriceFrom = { lte: Math.max(0, Math.trunc(maxPrice)) };
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
            <h1 className="text-[var(--text-2xl)] font-semibold leading-[var(--lh-2xl)] text-[var(--text)]">
              Designers
            </h1>
            <p className="mt-2 text-[var(--text-md)] leading-[var(--lh-md)] text-[var(--muted)]">
              Find custom clothing designers by style, country, and budget.
            </p>

            <Card className="mt-6">
              <CardHeader title="Search" />
              <CardBody>
                <form
                  action="/find-designers"
                  method="GET"
                >
                  <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                    {/* Left: all filters */}
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="lg:col-span-2">
                        <div className="text-[12px] font-medium text-[var(--muted)]">Search</div>
                        <div className="mt-2">
                          <Input
                            name="q"
                            defaultValue={q}
                            placeholder="bridal, eveningwear, alterations…"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="text-[12px] font-medium text-[var(--muted)]">Specialty</div>
                        <div className="mt-2">
                          <select
                            name="specialty"
                            defaultValue={specialtyId}
                            className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[15px] text-[var(--text)]"
                          >
                            <option value="">Any specialty</option>
                            {specialtyOptions.map((s) => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <div className="text-[12px] font-medium text-[var(--muted)]">Country</div>
                        <div className="mt-2">
                          <select
                            name="countryCode"
                            defaultValue={countryCode}
                            className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[15px] text-[var(--text)]"
                          >
                            <option value="">Any country</option>
                            {COUNTRIES.map((c) => (
                              <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <div className="text-[12px] font-medium text-[var(--muted)]">Max budget ($)</div>
                        <div className="mt-2">
                          <Input
                            name="maxPrice"
                            defaultValue={maxPriceRaw}
                            placeholder="500"
                            inputMode="numeric"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Right: actions + result count stacked */}
                    <div className="flex flex-col items-end justify-between gap-3 pt-5">
                      <div className="flex gap-2">
                        {(q || countryCode || maxPriceRaw || specialtyId) ? (
                          <Link
                            href="/find-designers"
                            className="h-11 inline-flex items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-[14px] font-medium text-[var(--muted)] hover:bg-[var(--surface-2)]"
                          >
                            Clear
                          </Link>
                        ) : null}
                        <Button type="submit" variant="primary">Search</Button>
                      </div>
                      <div className="text-[13px] text-[var(--muted)] whitespace-nowrap">
                        {dressmakers.length} result{dressmakers.length === 1 ? "" : "s"}
                      </div>
                    </div>
                  </div>
                </form>
              </CardBody>
            </Card>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {dressmakers.length === 0 ? (
                <div className="col-span-full py-12 text-center text-[14px] text-[var(--muted)]">
                  No designers found. Try adjusting your filters.
                </div>
              ) : (
                dressmakers.map((d) => {
                  const countryLabel = d.countryCode
                    ? COUNTRY_LABEL_BY_CODE.get(d.countryCode) ?? d.countryCode
                    : null;

                  const specialties = d.dressmakerSpecialties
                    .map((s) => s.label.name)
                    .filter(Boolean);

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
                    <Link key={d.id} href={`/find-designers/${d.id}`} className="block">
                      <Card className="h-full hover:shadow-[0_14px_36px_rgba(27,20,24,0.12)] transition-shadow">
                        <CardBody>

                          {/* Portfolio thumbnails — fixed height grid, never shrinks */}
                          {thumbs.length ? (
                            <div className="grid grid-cols-3 gap-1.5 rounded-xl overflow-hidden">
                              {thumbs.map((t) => (
                                <div
                                  key={t.id}
                                  className="relative h-28 overflow-hidden bg-[var(--surface-2)]"
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
                              {/* Fill empty slots so grid stays consistent */}
                              {Array.from({ length: Math.max(0, 3 - thumbs.length) }).map((_, i) => (
                                <div key={`empty-${i}`} className="h-28 bg-[var(--surface-2)]" />
                              ))}
                            </div>
                          ) : (
                            <div className="h-28 rounded-xl bg-[var(--surface-2)] flex items-center justify-center">
                              <span className="text-[12px] text-[var(--muted)]">No portfolio yet</span>
                            </div>
                          )}

                          {/* Name + country */}
                          <div className="mt-4 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-[16px] font-semibold text-[var(--text)]">
                                {d.displayName ?? "Dressmaker"}
                              </div>
                              {countryLabel ? (
                                <div className="mt-0.5 text-[13px] text-[var(--muted)]">
                                  {countryLabel}
                                </div>
                              ) : null}
                            </div>
                            {d.yearsExperience != null ? (
                              <Badge tone="neutral">{d.yearsExperience} yrs exp</Badge>
                            ) : null}
                          </div>

                          {/* Price + languages in one clean row */}
                          <div className="mt-3 flex items-center gap-3 text-[13px] text-[var(--muted)]">
                            {d.basePriceFrom != null ? (
                              <span>
                                From{" "}
                                <span className="font-semibold text-[var(--text)]">
                                  {new Intl.NumberFormat("en-US", {
                                    style: "currency",
                                    currency: d.currency,
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0,
                                  }).format(d.basePriceFrom)}
                                </span>
                              </span>
                            ) : (
                              <span>Price on request</span>
                            )}

                            {d.languages.length > 0 ? (
                              <>
                                <span className="text-[var(--border)]">·</span>
                                <span>
                                  {d.languages.slice(0, 2).join(", ")}
                                  {d.languages.length > 2 ? "…" : ""}
                                </span>
                              </>
                            ) : null}
                          </div>

                          {/* Specialties */}
                          {specialties.length > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {specialties.slice(0, 3).map((name) => (
                                <span
                                  key={name}
                                  className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--muted)]"
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
                })
              )}
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