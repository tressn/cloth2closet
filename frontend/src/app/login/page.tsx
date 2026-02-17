"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Container } from "@/components/ui/Container";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCredentialsLogin() {
    setErr(null);
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: true,
      callbackUrl: "/dashboard",
    });

    // signIn redirects on success; on failure it may return error
    if (res?.error) setErr("Invalid email or password");
    setLoading(false);
  }

  return (
    <div className="bg-[var(--bg)]">
      <Container>
        <main className="py-10">
          <div className="mx-auto max-w-lg">
            <Card>
              <CardHeader
                title="Welcome back"
                subtitle="Sign in to message dressmakers, request quotes, and manage projects."
              />
              <CardBody className="space-y-4">
                <div className="space-y-2">
                  <Input
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <Input
                    placeholder="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  {err ? <div className="text-sm">{err}</div> : null}
                  <Button
                    onClick={handleCredentialsLogin}
                    variant="primary"
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? "Signing in..." : "Sign in"}
                  </Button>
                </div>
                <div className="text-[13px] text-[var(--muted)]">
                  New here?{" "}
                  <a className="underline" href="/register">
                    Create an account
                  </a>
                </div>


                <div className="text-[13px] leading-6 text-[var(--muted)]">
                  By signing in, you agree to respectful communication and honest listings.
                </div>
              </CardBody>
            </Card>
          </div>
        </main>
      </Container>
    </div>
  );
}
