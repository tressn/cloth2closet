import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/app/dashboard/DashboardShell";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import MeasurementsForm from "./MeasurementsForm";

export const metadata = {
  title: "Custom Clothing Measurements · Save Your Fit Profile · Cloth2Closet",
  description:
    "Find custom clothing designers for made-to-order fashion, bespoke outfits, special events, and personalized attire. Connect with designers for your next event.",
};

export default async function MeasurementsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/api/auth/signin");

  const latest = await prisma.measurement.findFirst({
    where: { customerId: session.user.id },
    orderBy: { updatedAt: "desc" },
  });

  return (
      <div className="max-w-3xl">
        <Card>
          <CardHeader title="Measurements" subtitle="Use centimeter (cm)). If unsure, add a note at the end." />
          <CardBody>
            <MeasurementsForm initial={latest?.fieldsJson ?? null} />
          </CardBody>
        </Card>
      </div>
  );
}
