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
  
    // --- Reviews for this dressmaker (via projects) ---
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
        author: { select: { name: true } },
        project: { select: { projectCode: true } },
      },
    }),
  ]);

  const avgRating = reviewAgg._avg.rating ?? null;
  const reviewCount = reviewAgg._count.rating ?? 0;

  function fmtAvg(x: number) {
    return (Math.round(x * 10) / 10).toFixed(1);
  }

  return (
    <div className="bg-[var(--bg)]">
      <Container>
        <main className="py-10">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left: profile */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader
                  title={dressmaker.displayName ?? "Dressmaker"}
                  subtitle={
                    dressmaker.countryCode
                      ? `📍 ${COUNTRY_LABEL_BY_CODE.get(dressmaker.countryCode) ?? dressmaker.countryCode}`
                      : "📍 Country not listed"
                  }
                  right={
                    <div className="flex items-center gap-2">
                      {dressmaker.yearsExperience != null ? (
                        <Badge tone="neutral">{dressmaker.yearsExperience} yrs</Badge>
                      ) : null}
                      {dressmaker.isPublished && dressmaker.approvalStatus === "APPROVED" ? (
                          <Badge tone="success">Published</Badge>
                        ) : dressmaker.approvalStatus === "PENDING" ? (
                          <Badge tone="featured">Pending review</Badge>
                        ) : dressmaker.approvalStatus === "REJECTED" ? (
                          <Badge tone="danger">Needs changes</Badge>
                        ) : null}
                      {reviewCount > 0 ? (
                        <Badge tone="success">{fmtAvg(avgRating!)} ★ ({reviewCount})</Badge>
                      ) : (
                        <Badge tone="neutral">No reviews</Badge>
                      )}
                    </div>
                  }
                />
                <CardBody>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone="neutral">
                      💰{" "}
                      {dressmaker.basePriceFrom != null
                        ? new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: dressmaker.currency,
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }).format(dressmaker.basePriceFrom)
                        : "Pricing not listed"}
                    </Badge>

                    {dressmaker.languages?.length ? (
                      <Badge tone="neutral">🗣️ {dressmaker.languages.slice(0, 3).join(", ")}{dressmaker.languages.length > 3 ? "…" : ""}</Badge>
                    ) : null}

                    {dressmaker.dressmakerSpecialties?.length ? (
                      <Badge tone="neutral">
                        ✨{" "}
                        {dressmaker.dressmakerSpecialties
                          .map((x) => x.label)
                          .filter((l) => l.scope === "SPECIALTY" && l.status !== "REJECTED")
                          .map((l) => l.name)
                          .slice(0, 2)
                          .join(" • ")}
                        {dressmaker.dressmakerSpecialties.filter((x) => x.label.scope === "SPECIALTY" && x.label.status !== "REJECTED").length >
                        2
                          ? "…"
                          : ""}
                      </Badge>
                    ) : null}
                  </div>

                  {dressmaker.bio ? (
                    <div className="mt-6">
                      <div className="text-[14px] font-semibold text-[var(--text)]">About</div>
                      <p className="mt-2 whitespace-pre-wrap text-[15px] leading-7 text-[var(--muted)]">
                        {dressmaker.bio}
                      </p>
                    </div>
                  ) : null}

                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link href={`/dressmakers/${dressmaker.id}/request`} className="inline-flex">
                      <Button variant="primary">Request a quote</Button>
                    </Link>

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
                <CardHeader title="Portfolio" subtitle="Recent work and sample pieces." />
                <CardBody>
                  {dressmaker.portfolioItems.length === 0 ? (
                    <div className="text-[14px] text-[var(--muted)]">No portfolio items yet.</div>
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
              {/*Review */}
              <Card>
                <CardHeader title="Reviews" subtitle="Verified reviews from completed projects." />
                <CardBody>
                  {reviews?.length ? (
                    <div className="grid gap-4">
                      <div className="text-[14px] text-[var(--muted)]">
                        Recent reviews: <span className="font-semibold text-[var(--text)]">{reviews.length}</span>
                      </div>
                    
                      {reviews.map((r) => (
                        <div key={r.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-[13px] font-semibold text-[var(--text)]">
                              {r.author?.name ?? "Customer"} • {r.rating}/5
                              {r.isVerified ? <span className="ml-2 text-[12px] text-[var(--muted)]">✅ verified</span> : null}
                            </div>
                            <div className="text-[12px] text-[var(--muted)]">
                              {new Date(r.createdAt).toLocaleDateString()}
                            </div>
                          </div>

                          {r.text ? (
                            <div className="mt-2 text-[14px] text-[var(--muted)] whitespace-pre-wrap">
                              {r.text}
                            </div>
                          ) : null}

                          {r.photoUrls?.length ? (
                            <div className="mt-3 grid grid-cols-3 gap-2">
                              {r.photoUrls.slice(0, 6).map((url: string, idx: number) => (
                                <a
                                  key={idx}
                                  href={url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block overflow-hidden rounded-lg border"
                                >
                                  <div className="aspect-square overflow-hidden leading-none">
                                    <img
                                      src={url}
                                      alt="Review photo"
                                      className="block h-full w-full object-cover object-center"
                                    />
                                  </div>
                                </a>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[14px] text-[var(--muted)]">No reviews yet.</div>
                  )}
                </CardBody>
              </Card>
            </div>

            {/* Right: sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader title="Next steps" subtitle="Quick actions." />
                <CardBody className="space-y-3">
                  <Link href="/dressmakers" className="block">
                    <Button variant="secondary" className="w-full">Browse more makers</Button>
                  </Link>
                  <Link href="/messages" className="block">
                    <Button variant="secondary" className="w-full">Go to messages</Button>
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

