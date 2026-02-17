import Link from "next/link";
import { Container } from "@/components/ui/Container";

export default function ForbiddenPage() {
  return (
    <div className="bg-[var(--bg)]">
      <Container>
        <main className="py-10">
          <h1 className="text-xl font-semibold text-[var(--text)]">Access denied</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            You don’t have permission to view that page.
          </p>
          <div className="mt-6 flex gap-3">
            <Link className="underline" href="/dashboard">Go to dashboard</Link>
            <Link className="underline" href="/login">Sign in</Link>
          </div>
        </main>
      </Container>
    </div>
  );
}
