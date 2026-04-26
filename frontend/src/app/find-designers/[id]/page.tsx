import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import MessageButton from "./MessageButton";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import SaveDressmakerButton from "./SaveDressmakerButton";
import { COUNTRIES } from "@/lib/lookup/countries";
import PortfolioGalleryModal from "./PortfolioGalleryModal";

const COUNTRY_LABEL_BY_CODE = new Map(COUNTRIES.map((c) => [c.value, c.label]));

function Stars({ rating }: { rating: number }) {
  const r = Math.max(0, Math.min(5, rating));
  return (
    <span className="text-[var(--plum-600)]">
      {"★★★★★☆☆☆☆☆".slice(5 - r, 10 - r)}
    </span>
  );
}

export default async function DressmakerPublicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!id) notFound();

  const dressmaker = await prisma.dressmakerProfile.findUnique({
    where: { id },
    include: {
      dressmakerSpecialties: {
        include: { label: true },
      },
      portfolioItems: {
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
        include: {
          portfolioItemLabels: {
            include: { label: true },
          },
        },
      },
    },
  });

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;

  if (!dressmaker) notFound();

  const isSaved = userId
    ? !!(await prisma.savedDressmaker.findUnique({
        where: {
          customerId_dressmakerProfileId: {
            customerId: userId,
            dressmakerProfileId: dressmaker.id,
          },
        },
        select: { id: true },
      }))
    : false;

  const [reviewAgg, reviews] = await Promise.all([
    prisma.review.aggregate({
      where: { project: { dressmakerId: dressmaker.userId } },
      _avg: { rating: true },
      _count: { rating: true },
    }),
    prisma.review.findMany({
      where: { project: { dressmakerId: dressmaker.userId } },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        rating: true,
        text: true,
        photoUrls: true,
        isVerified: true,
        createdAt: true,
        author: { select: { name: true, username: true } },
        project: { select: { projectCode: true } },
      },
    }),
  ]);

  const avgRating = reviewAgg._avg.rating ?? null;
  const reviewCount = reviewAgg._count.rating ?? 0;

  const approvedSpecialties = dressmaker.dressmakerSpecialties
    .map((x) => x.label)
    .filter((l) => l.scope === "SPECIALTY" && l.status !== "REJECTED");

  const countryLabel = dressmaker.countryCode
    ? COUNTRY_LABEL_BY_CODE.get(dressmaker.countryCode) ?? dressmaker.countryCode
    : null;

  return (
    <div className="bg-[var(--bg)]">
      <Container>
        <main className="py-10">
          <div className="grid gap-6 lg:grid-cols-3">

            {/* ── Left column ─────────────────────────────────────────── */}
            <div className="lg:col-span-2 space-y-6">

              {/* Profile header */}
              <Card>
                <CardBody>
                  <div className="flex items-start justify-between gap-6">
                    <div className="min-w-0">
                      <h1 className="text-[24px] font-semibold leading-8 text-[var(--text)]">
                        {dressmaker.displayName ?? "Dressmaker"}
                      </h1>

                      {/* Location + experience inline */}
                      <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[14px] text-[var(--muted)]">
                        {countryLabel ? <span>{countryLabel}</span> : null}
                        {dressmaker.yearsExperience != null ? (
                          <>
                            {countryLabel ? <span className="text-[var(--border)]">·</span> : null}
                            <span>{dressmaker.yearsExperience} years experience</span>
                          </>
                        ) : null}
                        {dressmaker.languages?.length ? (
                          <>
                            <span className="text-[var(--border)]">·</span>
                            <span>{dressmaker.languages.slice(0, 3).join(", ")}</span>
                          </>
                        ) : null}
                      </div>

                      {/* Rating */}
                      {reviewCount > 0 ? (
                        <div className="mt-2 flex items-center gap-2 text-[14px]">
                          <Stars rating={Math.round(avgRating!)} />
                          <span className="font-semibold text-[var(--text)]">
                            {(Math.round((avgRating ?? 0) * 10) / 10).toFixed(1)}
                          </span>
                          <span className="text-[var(--muted)]">
                            ({reviewCount} review{reviewCount !== 1 ? "s" : ""})
                          </span>
                        </div>
                      ) : (
                        <div className="mt-2 text-[13px] text-[var(--muted)]">
                          No reviews yet
                        </div>
                      )}
                    </div>

                    {/* Status badge */}
                    <div className="shrink-0">
                      {dressmaker.isPaused ? (
                        <Badge tone="neutral">Not taking new projects</Badge>
                      ) : (
                        <Badge tone="success">Taking new projects</Badge>
                      )}
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="mt-5 inline-flex items-baseline gap-1.5">
                    <span className="text-[13px] text-[var(--muted)]">Starting from</span>
                    <span className="text-[20px] font-semibold text-[var(--text)]">
                      {dressmaker.basePriceFrom != null
                        ? new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: dressmaker.currency,
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }).format(dressmaker.basePriceFrom)
                        : "Price on request"}
                    </span>
                  </div>

                  {/* Specialties */}
                  {approvedSpecialties.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {approvedSpecialties.map((l) => (
                        <span
                          key={l.id}
                          className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-[12px] font-medium text-[var(--muted)]"
                        >
                          {l.name}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {/* Bio */}
                  {dressmaker.bio ? (
                    <div className="mt-6 border-t border-[var(--border)] pt-5">
                      <p className="whitespace-pre-wrap text-[15px] leading-7 text-[var(--muted)]">
                        {dressmaker.bio}
                      </p>
                    </div>
                  ) : null}

                  {/* Actions */}
                  <div className="mt-6 flex flex-wrap gap-3">
                    {dressmaker.isPaused ? (
                      <Button variant="primary" disabled>Not accepting requests</Button>
                    ) : (
                      <Link href={`/dressmakers/${dressmaker.id}/request`} className="inline-flex">
                        <Button variant="primary">Request a quote</Button>
                      </Link>
                    )}

                    <MessageButton dressmakerUserId={dressmaker.userId} />

                    <SaveDressmakerButton
                      dressmakerProfileId={dressmaker.id}
                      initialSaved={isSaved}
                      isAuthed={!!userId}
                    />

                    {dressmaker.websiteUrl ? (
                      <a href={dressmaker.websiteUrl} target="_blank" rel="noreferrer" className="inline-flex">
                        <Button variant="ghost">Website</Button>
                      </a>
                    ) : null}

                    {dressmaker.instagramHandle ? (
                      <a
                        href={`https://instagram.com/${dressmaker.instagramHandle}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex"
                      >
                        <Button variant="ghost">@{dressmaker.instagramHandle}</Button>
                      </a>
                    ) : null}
                  </div>
                </CardBody>
              </Card>

              {/* Portfolio */}
              <Card>
                <CardHeader
                  title="Portfolio"
                  subtitle="Recent work and sample pieces."
                />
                <CardBody>
                  {dressmaker.portfolioItems.length === 0 ? (
                    <div className="text-[14px] text-[var(--muted)]">
                      No portfolio items yet.
                    </div>
                  ) : (
                    <PortfolioGalleryModal
                      items={dressmaker.portfolioItems.map((p) => ({
                        id: p.id,
                        title: p.title,
                        imageUrls: p.imageUrls ?? [],
                      }))}
                    />
                  )}
                </CardBody>
              </Card>

              {/* Reviews */}
              <Card>
                <CardHeader
                  title="Reviews"
                  subtitle="Verified reviews from completed projects."
                  right={
                    reviewCount > 0 ? (
                      <Badge tone="neutral">{reviewCount} total</Badge>
                    ) : null
                  }
                />
                <CardBody>
                  {reviews.length === 0 ? (
                    <div className="text-[14px] text-[var(--muted)]">No reviews yet.</div>
                  ) : (
                    <div className="grid gap-4">
                      {reviews.map((r) => (
                        <div
                          key={r.id}
                          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4"
                        >
                          {/* Reviewer row */}
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-[14px] font-semibold text-[var(--text)]">
                                {r.author?.username ?? r.author?.name ?? "Customer"}
                              </div>
                              <div className="mt-0.5 flex items-center gap-2">
                                <Stars rating={r.rating} />
                                <span className="text-[12px] text-[var(--muted)]">
                                  {r.rating}/5
                                </span>
                                {r.isVerified ? (
                                  <span className="rounded-full border border-[rgba(46,107,87,0.35)] bg-[rgba(46,107,87,0.08)] px-2 py-0.5 text-[11px] font-medium text-[var(--text)]">
                                    Verified
                                  </span>
                                ) : null}
                              </div>
                            </div>
                            <div className="shrink-0 text-[12px] text-[var(--muted)]">
                              {new Date(r.createdAt).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </div>
                          </div>

                          {/* Review text */}
                          {r.text ? (
                            <p className="mt-3 text-[14px] leading-6 text-[var(--muted)] whitespace-pre-wrap">
                              {r.text}
                            </p>
                          ) : null}

                          {/* Review photos */}
                          {r.photoUrls?.length ? (
                            <div className="mt-4 grid grid-cols-3 gap-2">
                              {r.photoUrls.slice(0, 6).map((url, idx) => (
                                <a
                                  key={idx}
                                  href={url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block overflow-hidden rounded-lg border border-[var(--border)]"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={url}
                                    alt="Review photo"
                                    className="block w-full h-auto object-contain"
                                  />
                                </a>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </CardBody>
              </Card>
            </div>

            {/* ── Right sidebar ────────────────────────────────────────── */}
            <div className="space-y-6">
              <Card>
                <CardBody className="space-y-3">
                  <Link href="/dressmakers" className="block">
                    <Button variant="secondary" className="w-full">
                      Browse more makers
                    </Button>
                  </Link>
                  <Link href="/messages" className="block">
                    <Button variant="secondary" className="w-full">
                      Go to messages
                    </Button>
                  </Link>
                </CardBody>
              </Card>
            </div>

          </div>
        </main>
      </Container>
    </div>
  );
}