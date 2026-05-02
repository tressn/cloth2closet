"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Container } from "@/components/ui/Container";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Image from 'next/image';

export default function NavBar() {
  const { data: session, status } = useSession();
  const role = (session?.user as any)?.role as
    | "CUSTOMER"
    | "DRESSMAKER"
    | "ADMIN"
    | null
    | undefined;

  const loggedIn = status === "authenticated";
  const pathname = usePathname();

  const [hasUnread, setHasUnread] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hasUnreadNotifs, setHasUnreadNotifs] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!loggedIn) return;

    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/conversations/unread", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!cancelled) setHasUnread(!!data?.hasUnread);
      } catch {
        // ignore
      }
    }

    load();
    const t = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [loggedIn]);

  // Checking for unread notifications
    useEffect(() => {
      if (!loggedIn) return;

      let cancelled = false;

      async function load() {
        try {
          const res = await fetch("/api/notifications/unread", { cache: "no-store" });
          const data = await res.json().catch(() => ({}));
          if (!cancelled) setHasUnreadNotifs(!!data?.hasUnread);
        } catch {}
      }

      load();
      const t = setInterval(load, 30000);
      return () => {
        cancelled = true;
        clearInterval(t);
      };
    }, [loggedIn]);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[rgba(255,255,255,0.85)] backdrop-blur">
      <Container>
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center">
              <Image 
                src="/images/cloth2closet-logo.png" 
                alt="Cloth 2 Closet - Custom Attire" 
                width={200}
                height={65}
                priority
                className="h-17 w-auto"
              />
            </Link>

            {/* Desktop nav */}
            <nav className="hidden items-center gap-5 text-[14px] font-medium text-[var(--muted)] md:flex">
              <Link className="hover:text-[var(--text)]" href="/feed">Feed</Link>
              <Link className="hover:text-[var(--text)]" href="/find-designers">Designers</Link>
              <Link className="hover:text-[var(--text)] relative" href="/messages">
                Messages
                {hasUnread ? (
                  <span className="ml-2 inline-block h-2 w-2 rounded-full bg-[var(--plum-500)] align-middle" />
                ) : null}
              </Link>

              {loggedIn ? (
                <>
                  <span className="mx-1 h-4 w-px bg-[var(--border)]" />
                    <Link className="hover:text-[var(--text)] relative" href="/dashboard">
                      Dashboard
                      {hasUnreadNotifs ? (
                        <span className="ml-2 inline-block h-2 w-2 rounded-full bg-[var(--plum-500)] align-middle" />
                      ) : null}
                    </Link>
                </>
              ) : (
                <>
                  <span className="mx-1 h-4 w-px bg-[var(--border)]" />
                  <Link className="hover:text-[var(--text)]" href="/login">Login</Link>
                  <Link className="hover:text-[var(--text)]" href="/register">Sign up</Link>
                </>
              )}
              <Link className="hover:text-[var(--text)]" href="/support">Help</Link>
              <Link className="hover:text-[var(--text)]" href="/faq">FAQ</Link>
              <Link className="hover:text-[var(--text)]" href="/about">About</Link>
            </nav>
          </div>

          <div className="flex items-center gap-3 text-[14px]">
            {/* Desktop sign out */}
            {loggedIn ? (
              <button
                className="hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-medium text-[var(--text)] hover:bg-[var(--surface-2)] md:block"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                Sign out
              </button>
            ) : null}

            {/* Mobile hamburger button */}
            <button
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] md:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              {mobileOpen ? (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="4" y1="4" x2="16" y2="16" />
                  <line x1="16" y1="4" x2="4" y2="16" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="3" y1="5" x2="17" y2="5" />
                  <line x1="3" y1="10" x2="17" y2="10" />
                  <line x1="3" y1="15" x2="17" y2="15" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </Container>

      {/* Mobile menu overlay */}
      {mobileOpen ? (
        <div className="fixed inset-0 top-16 z-40 bg-[var(--surface)] md:hidden">
          <nav className="flex flex-col gap-1 px-5 py-4 text-[16px] font-medium text-[var(--muted)]">
            <MobileNavLink href="/feed" label="Feed" />
            <MobileNavLink href="/find-designers" label="Designers" />
            <MobileNavLink href="/messages" label="Messages" badge={hasUnread} />
            <MobileNavLink href="/support" label="Help" />
            <MobileNavLink href="/faq" label="FAQ" />
            <MobileNavLink href="/about" label="About" />

            <div className="my-3 h-px bg-[var(--border)]" />

            {loggedIn ? (
              <>
                <MobileNavLink href="/dashboard" label="Dashboard" badge={hasUnreadNotifs} />
                <button
                  className="mt-4 h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[15px] font-semibold text-[var(--text)] active:bg-[var(--surface-2)]"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <MobileNavLink href="/login" label="Login" />
                <MobileNavLink href="/register" label="Sign up" />
              </>
            )}
          </nav>
        </div>
      ) : null}
    </header>
  );
}

function MobileNavLink({
  href,
  label,
  badge,
}: {
  href: string;
  label: string;
  badge?: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex h-12 items-center rounded-xl px-4 text-[var(--text)] active:bg-[var(--surface-2)]"
    >
      {label}
      {badge ? (
        <span className="ml-2 inline-block h-2 w-2 rounded-full bg-[var(--plum-500)]" />
      ) : null}
    </Link>
  );
}