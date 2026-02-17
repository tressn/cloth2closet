import Link from "next/link";
import { requireUser } from "@/lib/requiredRole";
import { Container } from "@/components/ui/Container";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

export default async function DashboardHomePage() {
  const user = await requireUser();
  const role = user.role; // may be null if old accounts exist

  const isDressmaker = role === "DRESSMAKER" || role === "ADMIN";
  const isCustomer = role === "CUSTOMER" || role === "ADMIN";

  return (
    <div className="bg-[var(--bg)]">
      <Container>
        <main className="py-10">
          <div className="max-w-3xl space-y-6">
            <div>
              <div className="text-[var(--text-2xl)] font-semibold leading-[var(--lh-2xl)] text-[var(--text)]">
                Dashboard
              </div>
              <div className="mt-2 text-[var(--text-md)] leading-[var(--lh-md)] text-[var(--muted)]">
                Manage projects, messages, and your profile.
              </div>
            </div>

            {!role ? (
              <Card>
                <CardHeader title="Finish setup" subtitle="Choose a role to unlock dashboard features." />
                <CardBody>
                  <Link className="underline" href="/register">
                    Go to signup
                  </Link>
                </CardBody>
              </Card>
            ) : null}

            <div className="grid gap-4">
              {isCustomer ? (
                <Card>
                  <CardHeader title="Customer" subtitle="Request quotes and manage projects." />
                  <CardBody className="flex gap-3">
                    <Link className="underline" href="/dashboard/customer/projects">Projects</Link>
                    <Link className="underline" href="/dashboard/customer/measurements">Measurements</Link>
                  </CardBody>
                </Card>
              ) : null}

              {isDressmaker ? (
                <Card>
                  <CardHeader title="Dressmaker" subtitle="Manage your profile, portfolio, and quotes." />
                  <CardBody className="flex gap-3">
                    <Link className="underline" href="/dashboard/dressmaker/profile">Profile</Link>
                    <Link className="underline" href="/dashboard/dressmaker/portfolio">Portfolio</Link>
                    <Link className="underline" href="/dashboard/dressmaker/projects">Projects</Link>
                  </CardBody>
                </Card>
              ) : null}

              <Card>
                <CardHeader title="Messages" subtitle="Conversations with customers and dressmakers." />
                <CardBody>
                  <Link className="underline" href="/messages">Go to messages</Link>
                </CardBody>
              </Card>
            </div>
          </div>
        </main>
      </Container>
    </div>
  );
}
