"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Container } from "@/components/ui/Container";
import { useEffect, useState } from "react";

export default function NavBar() {
  const { data: session, status } = useSession();
  const role = (session?.user as any)?.role as
    | "CUSTOMER"
    | "DRESSMAKER"
    | "ADMIN"
    | null
    | undefined;

  const loggedIn = status === "authenticated";

  const [hasUnread, setHasUnread] = useState(false);

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
    const t = setInterval(load, 30000); // 30s
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
            <Link href="/" className="text-[16px] font-semibold tracking-tight text-[var(--text)]">
              <span className="text-[var(--plum-700)]">Cloth</span>2Closet
            </Link>

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
                  <Link className="hover:text-[var(--text)]" href="/dashboard">Dashboard</Link>
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
            {loggedIn ? (
              <button
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-medium text-[var(--text)] hover:bg-[var(--surface-2)]"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                Sign out
              </button>
            ) : null}
          </div>
        </div>
      </Container>
    </header>
  );
}
