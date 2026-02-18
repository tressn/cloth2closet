import { requireUser } from "@/lib/requiredRole";
import { DashboardShell } from "@/app/dashboard/DashboardShell";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import SupportForm from "./support-form";

export default async function SupportPage() {
  await requireUser();

  return (
    <DashboardShell
      title="Contact support"
      subtitle="Need help with your account, role, payments, or a project? Send a message to support."
      tabs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Messages", href: "/messages" },
      ]}
    >
      <div className="max-w-3xl">
        <Card>
          <CardHeader title="Support request" subtitle="We usually reply within 1–2 business days." />
          <CardBody>
            <SupportForm />
          </CardBody>
        </Card>
      </div>
    </DashboardShell>
  );
}
