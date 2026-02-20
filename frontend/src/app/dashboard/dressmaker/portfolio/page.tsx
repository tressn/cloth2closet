import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/app/dashboard/DashboardShell";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import DeleteButton from "./DeleteButton";
import NewPortfolioItemForm from "./NewPortfolioItemForm";

export default async function DressmakerPortfolioPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/api/auth/signin");
  if (session.user.role !== "DRESSMAKER" && session.user.role !== "ADMIN") {
    redirect("/become-dressmaker");
  }

  const profile = await prisma.dressmakerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, displayName: true },
  });
  if (!profile) redirect("/become-dressmaker");

  const items = await prisma.portfolioItem.findMany({
    where: { dressmakerId: profile.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      attireType: true,
      tags: true,
      imageUrls: true,
      description: true,
      isFeatured: true,
      createdAt: true,
    },
  });

  return (
    <DashboardShell
      title="Portfolio"
      subtitle="Curate what buyers see. Featured items help you look premium fast."
      tabs={[
        { label: "Profile", href: "/dashboard/dressmaker/profile" },
        { label: "Portfolio", href: "/dashboard/dressmaker/portfolio" },
        { label: "Projects", href: "/dashboard/dressmaker/projects" },
      ]}
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader title="Create a new item" subtitle="Upload 1–5 strong photos. Keep titles short." />
            <CardBody>
              <NewPortfolioItemForm />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Existing items"
              subtitle={items.length ? `${items.length} item${items.length === 1 ? "" : "s"}` : "No items yet"}
              right={
                <Link
                  className="text-[13px] font-medium text-[var(--plum-600)] underline"
                  href={`/dressmakers/${profile.id}`}
                >
                  View public profile
                </Link>
              }
            />
            <CardBody>
              {items.length === 0 ? (
                <div className="text-[14px] text-[var(--muted)]">Add your first item above.</div>
              ) : (
                <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                  {items.map((item) => (
                    <article
                      key={item.id}
                      className="overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)]"
                    >
                      <div className="aspect-[1/1] bg-[var(--surface-2)]">
                        {item.imageUrls?.[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.imageUrls[0]}
                            alt={item.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[12px] text-[var(--muted)]">
                            No image
                          </div>
                        )}
                      </div>

                      <div className="p-3">
                        <div className="truncate text-[13px] font-semibold text-[var(--text)]">
                          {item.title}
                        </div>
                        <div className="mt-1 truncate text-[12px] text-[var(--muted)]">
                          {item.attireType}
                          {item.isFeatured ? " • Featured" : ""}
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <Link
                            className="text-[12px] font-medium underline text-[var(--plum-600)]"
                            href={`/dashboard/dressmaker/portfolio/${item.id}/edit`}
                          >
                            Edit
                          </Link>
                          <DeleteButton id={item.id} />
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <Card>
            <CardHeader title="Curation tips" />
            <CardBody className="space-y-2 text-[14px] leading-6 text-[var(--muted)]">
              <div>• Use consistent lighting + framing.</div>
              <div>• Featured: your 2–3 best pieces.</div>
              <div>• Tags should match what buyers search.</div>
              <div>• Short titles read “luxury”.</div>
            </CardBody>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
