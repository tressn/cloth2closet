import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { NavLink } from "@/components/ui/NavLink";

type Role = "CUSTOMER" | "DRESSMAKER" | "ADMIN" | null | undefined;

function roleLabel(role: Role) {
  switch (role) {
    case "ADMIN":
      return "Admin";
    case "DRESSMAKER":
      return "Dressmaker";
    default:
      return "Customer";
  }
}

function QuickLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-[13px] font-medium text-[var(--text)] hover:bg-[var(--surface-2)]"
    >
      {children}
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

  const name = user?.name || user?.email || "Account";

  return (
    <aside className="hidden lg:block">
      <div className="sticky top-20">
        <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)]">
          {/* Header */}
          <div className="border-b border-[var(--border)] px-5 py-5">
            <div className="flex items-start justify-between gap-3">
              <Avatar name={name} subtitle={user?.email ?? undefined} />
              <Badge tone={isDressmaker ? "featured" : "neutral"}>
                {roleLabel(role)}
              </Badge>
            </div>

            <div className="mt-4 grid gap-2">
              <QuickLink href="/feed">Back to Feed</QuickLink>
              <QuickLink href="/messages">Messages</QuickLink>
            </div>
          </div>

          {/* Nav */}
          <div className="px-5 py-5">
            <div className="text-[12px] font-medium text-[var(--muted)]">
              Dashboard
            </div>

            <div className="mt-3 grid gap-2">
              {/* Common */}
              <NavLink
                href="/dashboard"
                label="Home"
                hint="Overview + quick actions"
              />
              <NavLink
                href="/dashboard/notifications"
                label="Notifications"
                hint="Quote + payment updates"
              />


              {/* Customer */}
              {(isCustomer || isAdmin) && (
                <>
                  <NavLink
                    href="/dashboard/customer/projects"
                    label="Projects"
                    hint="Quotes, payments, updates"
                  />
                  <NavLink
                    href="/dashboard/customer/quotes"
                    label="Quotes"
                    hint="Requests + approved quotes"
                  />

                  <NavLink
                    href="/dashboard/customer/measurements"
                    label="Measurements"
                    hint="Keep your latest sizes saved"
                  />
                  <NavLink
                    href="/dashboard/customer/profile"
                    label="My Profile"
                    hint="Address, saved dressmakers, reviews"
                  />
                </>
              )}

              {/* Dressmaker */}
              {(isDressmaker || isAdmin) ? (
                <>
                  <div className="mt-3 text-[12px] font-medium text-[var(--muted)]">
                    Dressmaker
                  </div>
                  <div className="mt-2 grid gap-2">
                    <NavLink
                      href="/dashboard/dressmaker/profile"
                      label="Profile"
                      hint="Public info + publish toggle"
                    />
                    <NavLink
                      href="/dashboard/dressmaker/portfolio"
                      label="Portfolio"
                      hint="Curate your best work"
                    />
                    <NavLink
                      href="/dashboard/dressmaker/projects"
                      label="Projects"
                      hint="Requests + quoting"
                    />
                    <NavLink
                      href="/dashboard/dressmaker/quotes"
                      label="My Quotes"
                      hint="New requests waiting"
                    />

                  </div>
                </>
              ) : (
                <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[13px] text-[var(--muted)]">
                  Want to sell your work?{" "}
                  <Link
                    href="/become-dressmaker"
                    className="font-semibold text-[var(--plum-600)] underline"
                  >
                    Become a dressmaker
                  </Link>
                </div>
              )}

              <div className="mt-4 border-t border-[var(--border)] pt-4">
                <Link href="/api/auth/signout?callbackUrl=/login">
                  Sign out
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Pro tip */}
        <div className="mt-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
          <div className="text-[13px] font-semibold text-[var(--text)]">
            Pro tip
          </div>
          <div className="mt-1 text-[13px] leading-6 text-[var(--muted)]">
            Luxury reads as{" "}
            <span className="font-semibold text-[var(--text)]">clarity</span>:
            concise titles, consistent photos, and clean pricing.
          </div>
        </div>
      </div>
    </aside>
  );
}
