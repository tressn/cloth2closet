import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { NavLink } from "@/components/ui/NavLink";
import { prisma } from "@/lib/prisma";

type Role = "CUSTOMER" | "DRESSMAKER" | "ADMIN" | null | undefined;

function roleLabel(role: Role) {
  switch (role) {
    case "ADMIN":
      return "Admin";
    case "DRESSMAKER":
      return "Designer";
    default:
      return "Customer";
  }
}

function SignOutButton() {
  return (
    <Link
      href="/api/auth/signout?callbackUrl=/login"
      className="inline-flex h-11 w-full items-center justify-left rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-[14px] font-semibold text-[var(--text)] hover:bg-[var(--surface-2)]"
    >
      Sign out
    </Link>
  );
}

export default async function DashboardSidebar() {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  const role = (user?.role ?? null) as Role;
  const isAdmin = role === "ADMIN";
  const isDressmaker = role === "DRESSMAKER";
  const isCustomer = role === "CUSTOMER" || role == null;

  const hasCustomerProjects =
    isDressmaker && user?.id
      ? (await prisma.project.count({
          where: { customerId: (user as any).id },
        })) > 0
      : false;

  const name = user?.name || user?.email?.split("@")[0] || "Account";

  return (
    <div className="sticky top-20">
      <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)]">
        {/* Header */}
        <div className="border-b border-[var(--border)] px-5 py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <Avatar
                name={name}
                subtitle={
                  (user as any)?.username
                    ? `@${(user as any).username}`
                    : user?.email ?? undefined
                }
              />
            </div>
            <div className="shrink-0 pt-1">
              <Badge tone={isDressmaker ? "featured" : "neutral"}>
                {roleLabel(role)}
              </Badge>
            </div>
          </div>
        </div>

        {/* Nav */}
        <div className="px-5 py-5">
          <div className="mt-3 grid gap-2">
            <NavLink href="/dashboard" label="Today" />
            <NavLink href="/dashboard/notifications" label="Notifications" />

            {(isCustomer || isAdmin || hasCustomerProjects) && (
              <>
                <NavLink href="/dashboard/customer/profile" label="Profile" />
                <NavLink href="/dashboard/customer/projects" label="Projects" />
                <NavLink href="/dashboard/customer/quotes" label="Quotes" />
                <NavLink href="/dashboard/customer/measurements" label="Measurements" />
              </>
            )}

            {(isDressmaker || isAdmin) ? (
              <>
                <div className="mt-2 grid gap-2">
                  <NavLink href="/dashboard/dressmaker/profile" label="Profile" />
                  <NavLink href="/dashboard/dressmaker/portfolio" label="Portfolio" />
                  <NavLink href="/dashboard/dressmaker/projects" label="Projects" />
                  <NavLink href="/dashboard/dressmaker/quotes" label="Quotes" />
                  <NavLink href="/dashboard/dressmaker/earnings" label="Earnings" />
                </div>
              </>
            ) : (
              <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[13px] text-[var(--muted)]">
                Want to sell your work?{" "}
                <Link
                  href="/become-dressmaker"
                  className="font-semibold text-[var(--plum-600)] underline"
                >
                  Become a designer
                </Link>
              </div>
            )}

            {isAdmin ? (
              <>
                <div className="mt-3 text-[12px] font-medium text-[var(--muted)]">
                  Admin
                </div>
                <div className="mt-2 grid gap-2">
                  <NavLink href="/dashboard/admin/dressmakers" label="Dressmakers" hint="Approve / review makers" />
                  <NavLink href="/dashboard/admin/labels" label="Labels" hint="Approve / reject tags" />
                  <NavLink href="/dashboard/admin/payouts" label="Payouts" hint="Release milestone payouts" />
                  <NavLink href="/dashboard/admin/support" label="Support" hint="User support tickets" />
                  <NavLink href="/dashboard/admin/users" label="Users" hint="Accounts + admin actions" />
                </div>
              </>
            ) : null}

            <div className="mt-5 border-t border-[var(--border)] pt-4">
              <SignOutButton />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}