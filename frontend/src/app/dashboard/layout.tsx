import { Container } from "@/components/ui/Container";
import DashboardSidebar from "./DashboardSidebar";
import DashboardMobileSidebar from "./DashboardMobileSidebar";
import { requireAssignedRole } from "@/lib/requiredRole";
import Link from "next/link";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAssignedRole();
  const isUnassigned = !user.role;

  return (
    <div className="bg-[var(--bg)]">
      <Container>
        <div className="py-6 sm:py-10">
          {isUnassigned ? (
            <div className="mb-6 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-5 py-4 shadow-[var(--shadow)] lg:hidden">
              <div className="text-[14px] font-semibold text-[var(--text)]">
                Dashboard
              </div>
              <div className="mt-2 text-[13px] text-[var(--muted)]">
                Finish setup to unlock dashboard features.{" "}
                <Link className="underline" href="/onboarding/choose-role">
                  Choose your role
                </Link>
              </div>
            </div>
          ) : null}

          <div className="lg:grid lg:grid-cols-[320px_1fr] lg:gap-8">
            <DashboardMobileSidebar>
              <DashboardSidebar />
            </DashboardMobileSidebar>

            <div className="min-w-0">{children}</div>
          </div>
        </div>
      </Container>
    </div>
  );
}