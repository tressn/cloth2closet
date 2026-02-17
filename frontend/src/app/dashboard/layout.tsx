import { Container } from "@/components/ui/Container";
import DashboardSidebar from "./DashboardSidebar";
import { requireUser } from "@/lib/requiredRole";
import { requireAssignedRole } from "@/lib/requiredRole"
import Link from "next/link";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAssignedRole();

  const isUnassigned = !user.role;
  const isDressmaker = user.role === "DRESSMAKER" || user.role === "ADMIN";

  const disabledClasses =
    "pointer-events-none opacity-40 cursor-not-allowed";

  const baseClasses =
    "rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-[13px] font-medium text-[var(--text)]";

  const badge =
  user.role === "ADMIN"
    ? "Admin"
    : user.role === "DRESSMAKER"
    ? "Dressmaker"
    : "Customer";


  return (
    <div className="bg-[var(--bg)]">
      <Container>
        <div className="py-10">
          {/* Mobile header */}
          <div className="mb-6 lg:hidden">
            <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-5 py-4 shadow-[var(--shadow)]">
              <div className="text-[14px] font-semibold text-[var(--text)]">
                Dashboard
              </div>

              {isUnassigned ? (
                <div className="mt-2 text-[13px] text-[var(--muted)]">
                  Finish setup to unlock dashboard features.{" "}
                  <Link className="underline" href="/onboarding/choose-role">
                    Choose your role
                  </Link>
                </div>
              ) : (
                <div className="mt-1 text-[13px] text-[var(--muted)]">
                  Use the navigation links inside each page.
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {/* Customer Links */}
                <Link
                  href="/dashboard/customer/projects"
                  className={`${baseClasses} ${
                    isUnassigned ? disabledClasses : ""
                  }`}
                >
                  Projects
                </Link>

                <Link
                  href="/dashboard/customer/measurements"
                  className={`${baseClasses} ${
                    isUnassigned ? disabledClasses : ""
                  }`}
                >
                  Measurements
                </Link>

                {/* Dressmaker Link */}
                {isDressmaker ? (
                  <Link
                    href="/dashboard/dressmaker/profile"
                    className={baseClasses}
                  >
                    Dressmaker
                  </Link>
                ) : (
                  <Link
                    href={
                      isUnassigned
                        ? "/onboarding/choose-role"
                        : "/become-dressmaker"
                    }
                    className={`${baseClasses} ${
                      isUnassigned ? disabledClasses : ""
                    }`}
                  >
                    Dressmaker
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Desktop grid */}
          <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
            <DashboardSidebar />
            <div>{children}</div>
          </div>
        </div>
      </Container>
    </div>
  );
}
