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
        orderBy: { createdAt: "desc" },
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
                      {dressmaker.isPublished ? <Badge tone="success">Published</Badge> : null}
                    </div>
                  }
                />
                <CardBody>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone="neutral">
                      💰{" "}
                      {dressmaker.basePriceFrom != null
                        ? `${formatWhole(dressmaker.basePriceFrom)} ${dressmaker.currency}`
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
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {dressmaker.portfolioItems.map((item) => (
                        <article
                          key={item.id}
                          className="overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)]"
                        >
                          <div className="aspect-[4/3] bg-[var(--surface-2)]">
                            {item.imageUrls?.[0] ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.imageUrls[0]}
                                alt={item.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-[13px] text-[var(--muted)]">
                                Images coming soon
                              </div>
                            )}
                          </div>
                          <div className="p-4">
                            <div className="text-[14px] font-semibold text-[var(--text)]">{item.title}</div>
                            {item.portfolioItemLabels?.length ? (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {item.portfolioItemLabels
                                  .map((x) => x.label)
                                  .filter((l) => l.scope === "PORTFOLIO" && l.status !== "REJECTED")
                                  .slice(0, 3)
                                  .map((l) => (
                                    <span
                                      key={l.id}
                                      className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-[12px] font-medium text-[var(--muted)]"
                                    >
                                      {l.name}
                                    </span>
                                  ))}
                              </div>
                            ) : null}
                          </div>
                        </article>
                      ))}
                    </div>
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

              <Card>
                <CardHeader title="Trust" subtitle="Signals that help buyers feel confident." />
                <CardBody>
                  <ul className="space-y-2 text-[14px] leading-6 text-[var(--muted)]">
                    <li>• Clear pricing expectations</li>
                    <li>• Languages & specialties</li>
                    <li>• Portfolio previews</li>
                    <li>• Direct messaging</li>
                  </ul>
                </CardBody>
              </Card>
            </div>
          </div>
        </main>
      </Container>
    </div>
  );
}

function formatWhole(amount: number) {
  return `$${amount}`;
}
