import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/app/dashboard/DashboardShell";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import MeasurementsForm from "./MeasurementsForm";

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
