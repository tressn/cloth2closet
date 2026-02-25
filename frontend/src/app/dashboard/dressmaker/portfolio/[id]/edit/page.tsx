import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { DashboardShell } from "@/app/dashboard/DashboardShell";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import EditPortfolioForm from "./EditPortfolioForm";

export default async function EditPortfolioItemPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/api/auth/signin");
  if (session.user.role !== "DRESSMAKER" && session.user.role !== "ADMIN") redirect("/");

  const { id } = await params;

  const profile = await prisma.dressmakerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!profile) notFound();

  const item = await prisma.portfolioItem.findUnique({
    where: { id },
    include: {
      portfolioItemLabels: { include: { label: true } },
    },
  });
  if (!item || item.dressmakerId !== profile.id) notFound();

  return (
    <DashboardShell
      title="Edit portfolio item"
      subtitle="Keep it concise. Luxury reads clean."
      tabs={[
        { label: "Back to portfolio", href: "/dashboard/dressmaker/portfolio" },
        { label: "Profile", href: "/dashboard/dressmaker/profile" },
        { label: "Projects", href: "/dashboard/dressmaker/projects" },
      ]}
    >
      <div className="max-w-2xl">
        <Card>
          <CardHeader title="Item details" />
          <CardBody>
            <EditPortfolioForm item={item} />
          </CardBody>
        </Card>
      </div>
    </DashboardShell>
  );
}
