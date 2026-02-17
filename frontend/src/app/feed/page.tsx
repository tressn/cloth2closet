import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

type FeedItem =
  | { type: "upload"; id: string; maker: string; location: string; title: string; price: string; imageUrl?: string; featured?: boolean }
  | { type: "review"; id: string; rating: number; quote: string; reviewer: string; region: string; itemTitle: string }
  | { type: "spotlight"; id: string; maker: string; location: string; blurb: string; tags: string[] };

const FEED: FeedItem[] = [
  { type: "upload", id: "u1", maker: "Amina Atelier", location: "London, UK", title: "Plum satin wrap gown", price: "£190", imageUrl: "https://placehold.co/1200x675", featured: true },
  { type: "review", id: "r1", rating: 5, quote: "Perfect fit and immaculate stitching. I felt incredible.", reviewer: "Nadia", region: "Toronto, CA", itemTitle: "Lace-trim evening dress" },
  { type: "spotlight", id: "s1", maker: "Kofi Crafted", location: "New York, US", blurb: "Hand-finished tailoring with bold linings and timeless silhouettes—made to measure.", tags: ["Made-to-measure", "Inclusive sizing", "Hand-finished"] },
  { type: "upload", id: "u2", maker: "Soleil Studio", location: "Paris, FR", title: "Beaded bodice midi", price: "€240", imageUrl: "https://placehold.co/1200x675" },
];

function Stars({ rating }: { rating: number }) {
  const r = Math.max(0, Math.min(5, rating));
  return <span className="text-[var(--plum-700)]">{"★★★★★☆☆☆☆☆".slice(5 - r, 10 - r)}</span>;
}

export default function FeedPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="border-b border-[var(--border)] bg-[var(--surface)]">
        <Container>
          <div className="py-10">
            <div className="text-[var(--text-2xl)] font-semibold leading-[var(--lh-2xl)] text-[var(--text)]">
              New activity
            </div>
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
                          href="/dressmakers"
                        >
                          View details
                        </Link>
                        <button className="h-11 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 font-medium hover:bg-[var(--border)]">
                          Save
                        </button>
                      </div>
                    </CardBody>
                  </Card>
                );
              }

              if (item.type === "review") {
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
              }

              return (
                <Card key={item.id}>
                  <CardBody>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-[15px] font-semibold text-[var(--text)]">{item.maker}</div>
                        <div className="mt-1 text-[13px] text-[var(--muted)]">{item.location} · Creator spotlight</div>
                      </div>
                      <Badge tone="featured">Spotlight</Badge>
                    </div>

                    <div className="mt-4 text-[16px] leading-7 text-[var(--text)]">{item.blurb}</div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {item.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-[12px] font-medium text-[var(--muted)]"
                        >
                          {t}
                        </span>
                      ))}
                    </div>

                    <div className="mt-5">
                      <Link
                        className="inline-flex h-11 items-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 font-medium hover:bg-[var(--border)]"
                        href="/dressmakers"
                      >
                        View maker profile
                      </Link>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        </Container>
      </main>
    </div>
  );
}
