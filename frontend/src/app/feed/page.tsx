import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Container } from "@/components/ui/Container";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import SaveDressmakerButton from "@/components/dressmakers/SaveDressmakerButton";

type FeedItem =
  | {
      type: "upload";
      id: string;
      maker: string;
      location: string;
      title: string;
      price: string;
      imageUrl?: string;
      featured?: boolean;
      dressmakerProfileId: string;
    }
  | {
      type: "review";
      id: string;
      rating: number;
      quote: string;
      reviewer: string;
      region: string;
      itemTitle: string;
    };

function Stars({ rating }: { rating: number }) {
  const r = Math.max(0, Math.min(5, rating));
  return <span className="text-[var(--plum-700)]">{"★★★★★☆☆☆☆☆".slice(5 - r, 10 - r)}</span>;
}

function formatMoneyWhole(amount: number, currency: string) {
  // You said: whole units (no cents)
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

export default async function FeedPage() {
  // 1) Portfolio
  const portfolio = await prisma.portfolioItem.findMany({
    where: {
      dressmaker: {
        isPublished: true,
        isPaused: false,
        approvalStatus: "APPROVED",
      },
    },
    orderBy: { createdAt: "desc" },
    take: 25,
    select: {
      id: true,
      title: true,
      imageUrls: true,
      isFeatured: true,
      createdAt: true,
      dressmaker: {
        select: {
          id: true,
          displayName: true,
          location: true,
          basePriceFrom: true, // whole units
          currency: true,
        },
      },
    },
  });

  // 2) Reviews
  const reviews = await prisma.review.findMany({
    orderBy: { createdAt: "desc" },
    take: 25,
    select: {
      id: true,
      rating: true,
      text: true,
      createdAt: true,
      author: { select: { name: true } },
      project: {
        select: {
          dressmaker: {
            select: {
              dressmakerProfile: { select: { displayName: true, location: true } },
            },
          },
        },
      },
    },
  });

  const uploads: FeedItem[] = portfolio.map((p) => ({
    type: "upload",
    id: `u_${p.id}`,
    maker: p.dressmaker.displayName ?? "Dressmaker",
    location: p.dressmaker.location ?? "—",
    title: p.title,
    price:
      typeof p.dressmaker.basePriceFrom === "number"
        ? `From ${formatMoneyWhole(p.dressmaker.basePriceFrom, p.dressmaker.currency)}`
        : "—",
    imageUrl: p.imageUrls?.[0] ?? undefined,
    featured: p.isFeatured,
    dressmakerProfileId: p.dressmaker.id,
  }));

  const reviewItems: FeedItem[] = reviews
    .filter((r) => r.text && r.text.trim().length > 0)
    .map((r) => {
      const dm = r.project.dressmaker.dressmakerProfile;
      return {
        type: "review",
        id: `r_${r.id}`,
        rating: r.rating,
        quote: r.text!,
        reviewer: r.author.name ?? "Customer",
        region: dm?.location ?? "—",
        itemTitle: dm?.displayName ?? "Dressmaker",
      };
    });

  // Optional: mix by newest (simple approach: just interleave)
  const FEED: FeedItem[] = [...uploads, ...reviewItems].slice(0, 30);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="border-b border-[var(--border)] bg-[var(--surface)]">
        <Container>
          <div className="py-10">
            <div className="text-[var(--text-2xl)] font-semibold leading-[var(--lh-2xl)] text-[var(--text)]">New activity</div>
            <div className="mt-2 text-[var(--text-md)] leading-[var(--lh-md)] text-[var(--muted)]">
              Fresh uploads from dressmakers + recent reviews
            </div>
          </div>
        </Container>
      </header>

      <main className="py-10">
        <Container>
          <div className="mx-auto w-full max-w-2xl space-y-10">
            {FEED.map((item) => {
              if (item.type === "upload") {
                return (
                  <Card key={item.id} className="overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-5">
                      <div>
                        <div className="text-[15px] font-semibold text-[var(--text)]">{item.maker}</div>
                        <div className="mt-1 text-[13px] text-[var(--muted)]">{item.location} · New upload</div>
                      </div>
                      {item.featured ? <Badge tone="featured">Featured</Badge> : null}
                    </div>

                    <div className="aspect-[16/9] w-full bg-[var(--surface-2)]">
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
                      ) : null}
                    </div>

                    <CardBody>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-[18px] font-semibold leading-7 text-[var(--text)]">{item.title}</div>
                          <div className="mt-1 text-[14px] leading-6 text-[var(--muted)]">
                            Crafted by <span className="font-semibold text-[var(--text)]">{item.maker}</span>
                          </div>
                        </div>
                        <div className="text-[16px] font-semibold text-[var(--text)]">{item.price}</div>
                      </div>

                      <div className="mt-5 flex gap-3">
                        <Link
                          className="flex h-11 items-center rounded-xl bg-[var(--plum-500)] px-4 font-medium text-white hover:bg-[var(--plum-600)]"
                          href={`/dressmakers/${item.dressmakerProfileId}`}
                        >
                          View details
                        </Link>
                        <SaveDressmakerButton
                          dressmakerProfileId={item.dressmakerProfileId}
                          initialSaved={false}
                        />
                      </div>
                    </CardBody>
                  </Card>
                );
              }

              return (
                <Card key={item.id}>
                  <CardBody>
                    <div className="flex items-center justify-between">
                      <div className="text-[14px] font-semibold text-[var(--text)]">Recent review</div>
                      <Badge tone="success">{item.rating}/5</Badge>
                    </div>

                    <div className="mt-3 text-[18px] leading-8 text-[var(--text)]">
                      <Stars rating={item.rating} /> <span className="font-medium">“{item.quote}”</span>
                    </div>

                    <div className="mt-4 text-[14px] leading-6 text-[var(--muted)]">
                      <span className="font-semibold text-[var(--text)]">{item.reviewer}</span> in {item.region} · reviewing{" "}
                      <span className="font-semibold text-[var(--text)]">{item.itemTitle}</span>
                    </div>
                  </CardBody>
                </Card>
              );
            })}

            {FEED.length === 0 ? (
              <Card>
                <CardBody>
                  <div className="text-[var(--muted)]">No activity yet.</div>
                </CardBody>
              </Card>
            ) : null}
          </div>
        </Container>
      </main>
    </div>
  );
}