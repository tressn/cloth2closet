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
    <DashboardShell
      title="Measurements"
      subtitle="Update anytime. Your latest entry is used for new projects."
      tabs={[
        { label: "Projects", href: "/dashboard/customer/projects" },
        { label: "Measurements", href: "/dashboard/customer/measurements" },
      ]}
    >
      <div className="max-w-3xl">
        <Card>
          <CardHeader title="Your measurements" subtitle="Use inches (in). If unsure, add a note at the end." />
          <CardBody>
            <MeasurementsForm initial={latest?.fieldsJson ?? null} />
          </CardBody>
        </Card>
      </div>
    </DashboardShell>
  );
}
