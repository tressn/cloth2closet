"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const verified = searchParams.get("verified");

  async function handleCredentialsLogin() {
    setErr(null);
    setLoading(true);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: true,
      callbackUrl: "/dashboard",
    });
    if (res?.error) setErr("Invalid email or password");
    setLoading(false);
  }

  return (
    <div className="mx-auto max-w-lg">
      {verified === "true" && (
        <div className="mb-4 rounded-md border border-green-300 bg-green-50 px-4 py-3 text-[13px] text-green-800">
          Your email has been verified. You can now sign in.
        </div>
      )}
      {verified === "expired" && (
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
          That verification link has expired. Please sign in and request a new one.
        </div>
      )}
      {(verified === "invalid" || verified === "error") && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-[13px] text-red-800">
          That verification link is invalid. Please try again or contact support.
        </div>
      )}
      <Card>
        <CardHeader
          title="Welcome back"
          subtitle="Sign in to message dressmakers, request quotes, and manage projects."
        />
        <CardBody className="space-y-4">
          <div className="space-y-2">
            <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            {err ? <div className="text-sm">{err}</div> : null}
            <Button onClick={handleCredentialsLogin} variant="primary" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </div>
          <div className="text-[13px] text-[var(--muted)]">
            <a className="underline" href="login/forgot-password">Forgot your password?</a>
          </div>
          <div className="text-[13px] text-[var(--muted)]">
            New here? <a className="underline" href="/register">Create an account</a>
          </div>
          <div className="text-[13px] leading-6 text-[var(--muted)]">
            By signing in, you agree to respectful communication and honest listings.
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="bg-[var(--bg)]">
      <Container>
        <main className="py-10">
          <Suspense>
            <LoginForm />
          </Suspense>
        </main>
      </Container>
    </div>
  );
}