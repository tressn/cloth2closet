import { prisma } from "@/lib/prisma";
import { COUNTRIES } from "@/lib/lookup/countries";

const COUNTRY_LABEL_BY_CODE = new Map(COUNTRIES.map((c) => [c.value, c.label]));

export async function GET() {
  const [portfolio, reviews] = await Promise.all([
    prisma.portfolioItem.findMany({
      where: {
        dressmaker: {
          isPublished: true,
          isPaused: false,
          approvalStatus: "APPROVED",
          // ── Exclude suspended dressmakers ──
          user: { status: { not: "SUSPENDED" } },
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
            countryCode: true,
            basePriceFrom: true,
            currency: true,
          },
        },
      },
    }),

    prisma.review.findMany({
      where: {
        // ── Exclude reviews on projects by suspended dressmakers ──
        project: {
          dressmaker: { status: { not: "SUSPENDED" } },
        },
      },
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
                dressmakerProfile: {
                  select: {
                    displayName: true,
                    countryCode: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  const uploads = portfolio.map((p) => {
    const code = p.dressmaker.countryCode ?? null;
    return {
      type: "upload" as const,
      id: `u_${p.id}`,
      maker: p.dressmaker.displayName ?? "Dressmaker",
      countryCode: code,
      countryLabel: code ? COUNTRY_LABEL_BY_CODE.get(code) ?? code : "—",
      title: p.title,
      price:
        typeof p.dressmaker.basePriceFrom === "number"
          ? `From ${formatMoney(p.dressmaker.basePriceFrom, p.dressmaker.currency)}`
          : "—",
      imageUrl: p.imageUrls?.[0] ?? undefined,
      featured: p.isFeatured,
      dressmakerProfileId: p.dressmaker.id,
      createdAt: p.createdAt,
    };
  });

  const reviewItems = reviews
    .filter((r) => r.text && r.text.trim().length > 0)
    .map((r) => {
      const dm = r.project.dressmaker.dressmakerProfile;
      const code = dm?.countryCode ?? null;
      return {
        type: "review" as const,
        id: `r_${r.id}`,
        rating: r.rating,
        quote: r.text!,
        reviewer: r.author.name ?? "Customer",
        countryCode: code,
        countryLabel: code ? COUNTRY_LABEL_BY_CODE.get(code) ?? code : "—",
        itemTitle: dm?.displayName ?? "Dressmaker",
        createdAt: r.createdAt,
      };
    });

  const items = [...uploads, ...reviewItems]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 30);

  return Response.json({ items });
}

function formatMoney(amount: number, currency: string) {
  const cents = amount;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(cents / 100);
  } catch {
    return `${currency} ${(cents / 100).toFixed(2)}`;
  }
}