"use client";

import { useState } from "react";
import { Container } from "@/components/ui/Container";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit() {
    setErr(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErr(data?.error ?? "Something went wrong.");
        setLoading(false);
        return;
      }

      setSent(true);
    } catch {
      setErr("Something went wrong. Please try again.");
    }

    setLoading(false);
  }

  return (
    <div className="bg-[var(--bg)]">
      <Container>
        <main className="py-10">
          <div className="mx-auto max-w-lg">
            <Card>
              <CardHeader
                title="Reset your password"
                subtitle="Enter your email and we'll send you a link to reset your password."
              />
              <CardBody className="space-y-4">
                {sent ? (
                  <>
                    <div className="text-[13px] text-[var(--muted)]">
                      If an account with that email exists, we've sent a reset link.
                      Check your inbox (and spam folder) and follow the instructions.
                    </div>
                    <div className="text-[13px] text-[var(--muted)]">
                      <a className="underline" href="/login">
                        Back to sign in
                      </a>
                    </div>
                  </>
                ) : (
                  <>
                    <Input
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />

                    {err && (
                      <div className="text-[13px] text-[var(--danger)]">{err}</div>
                    )}

                    <Button
                      type="button"
                      onClick={handleSubmit}
                      disabled={loading || !email}
                      variant="primary"
                      className="w-full"
                    >
                      {loading ? "Sending..." : "Send reset link"}
                    </Button>

                    <div className="text-[13px] text-[var(--muted)]">
                      Remember your password?{" "}
                      <a className="underline" href="/login">
                        Sign in
                      </a>
                    </div>
                  </>
                )}
              </CardBody>
            </Card>
          </div>
        </main>
      </Container>
    </div>
  );
}