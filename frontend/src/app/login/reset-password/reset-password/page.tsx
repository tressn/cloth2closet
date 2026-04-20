"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit() {
    setErr(null);

    if (password.length < 10) {
      setErr("Password must be at least 10 characters.");
      return;
    }

    if (password !== confirm) {
      setErr("Passwords don't match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErr(data?.error ?? "Something went wrong.");
        setLoading(false);
        return;
      }

      setDone(true);
    } catch {
      setErr("Something went wrong. Please try again.");
    }

    setLoading(false);
  }

  if (!token) {
    return (
      <div className="bg-[var(--bg)]">
        <Container>
          <main className="py-10">
            <div className="mx-auto max-w-lg">
              <Card>
                <CardHeader title="Invalid link" />
                <CardBody className="space-y-4">
                  <div className="text-[13px] text-[var(--muted)]">
                    This reset link is invalid. Please{" "}
                    <a className="underline" href="/login/forgot-password">
                      request a new one
                    </a>
                    .
                  </div>
                </CardBody>
              </Card>
            </div>
          </main>
        </Container>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg)]">
      <Container>
        <main className="py-10">
          <div className="mx-auto max-w-lg">
            <Card>
              <CardHeader
                title="Choose a new password"
                subtitle="Enter your new password below."
              />
              <CardBody className="space-y-4">
                {done ? (
                  <>
                    <div className="text-[13px] text-[var(--muted)]">
                      Your password has been reset successfully.
                    </div>
                    <Button
                      type="button"
                      variant="primary"
                      className="w-full"
                      onClick={() => (window.location.href = "/login")}
                    >
                      Sign in
                    </Button>
                  </>
                ) : (
                  <>
                    <Input
                      placeholder="New password (min 10 chars)"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <Input
                      placeholder="Confirm new password"
                      type="password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                    />

                    {err && (
                      <div className="text-[13px] text-[var(--danger)]">{err}</div>
                    )}

                    <Button
                      type="button"
                      onClick={handleSubmit}
                      disabled={loading}
                      variant="primary"
                      className="w-full"
                    >
                      {loading ? "Resetting..." : "Reset password"}
                    </Button>
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