import { prisma } from "@/lib/prisma";

export async function GET() {
  const [portfolio, reviews] = await Promise.all([
    prisma.portfolioItem.findMany({
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
            basePriceFrom: true,
            currency: true,
          },
        },
      },
    }),
    prisma.review.findMany({
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
    }),
  ]);

  // Normalize to your UI’s expected shape
  const uploads = portfolio.map((p) => ({
    type: "upload" as const,
    id: `u_${p.id}`,
    maker: p.dressmaker.displayName ?? "Dressmaker",
    location: p.dressmaker.location ?? "—",
    title: p.title,
    price:
      typeof p.dressmaker.basePriceFrom === "number"
        ? `From ${formatMoney(p.dressmaker.basePriceFrom, p.dressmaker.currency)}`
        : "—",
    imageUrl: p.imageUrls?.[0] ?? undefined,
    featured: p.isFeatured,
    dressmakerProfileId: p.dressmaker.id,
  }));

  const reviewItems = reviews
    .filter((r) => r.text && r.text.trim().length > 0) // avoid empty reviews in feed
    .map((r) => {
      const dm = r.project.dressmaker.dressmakerProfile;
      return {
        type: "review" as const,
        id: `r_${r.id}`,
        rating: r.rating,
        quote: r.text!,
        reviewer: r.author.name ?? "Customer",
        region: dm?.location ?? "—",
        itemTitle: dm?.displayName ?? "Dressmaker",
      };
    });

  const items = [...uploads, ...reviewItems]
    // if you want strict ordering by date, include createdAt in objects and sort.
    .slice(0, 30);

  return Response.json({ items });
}

function formatMoney(amount: number, currency: string) {
  // basePriceFrom is Int? in your schema. If you store cents, use /100.
  // Right now you commented “store cents? or whole currency units”.
  // I’ll assume cents for consistency with your Payment/Milestone amounts.
  const cents = amount;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(cents / 100);
  } catch {
    return `${currency} ${(cents / 100).toFixed(2)}`;
  }
}