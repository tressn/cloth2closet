"use client";

import { useState } from "react";
import { Container } from "@/components/ui/Container";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function BecomeDressmakerPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleBecomeDressmaker() {
    setLoading(true);
    setMessage(null);

    const res = await fetch("/api/account/become-dressmaker", { method: "POST" });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setMessage(data?.error ?? "Something went wrong");
      setLoading(false);
      return;
    }

    setMessage("You are now a dressmaker! Redirecting to your profile…");
    setLoading(false);
    window.location.href = "/dashboard/dressmaker/profile";
  }

  return (
    <div className="bg-[var(--bg)]">
      <Container>
        <main className="py-10">
          <div className="mx-auto max-w-2xl">
            <Card>
              <CardHeader
                title="Become a Dressmaker"
                subtitle="Upgrade your account and create your public dressmaker profile."
              />
              <CardBody className="space-y-4">
                <div className="text-[14px] leading-6 text-[var(--muted)]">
                  You’ll be able to publish a profile, upload portfolio items, and manage customer projects.
                </div>

                <Button type="button" onClick={handleBecomeDressmaker} disabled={loading} variant="primary">
                  {loading ? "Upgrading..." : "Become a Dressmaker"}
                </Button>

                {message ? (
                  <div className="text-[14px] text-[var(--muted)]">{message}</div>
                ) : null}
              </CardBody>
            </Card>
          </div>
        </main>
      </Container>
    </div>
  );
}
