"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

type Role = "CUSTOMER" | "DRESSMAKER";
type Opt = { value: string; label: string };

export default function RegisterPage() {
  const [success, setSuccess] = useState(false);
  const [role, setRole] = useState<Role>("CUSTOMER");

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState(""); // required for customer
  const [password, setPassword] = useState("");

  // dressmaker fields
  const [displayName, setDisplayName] = useState("");
  const [countryCode, setCountryCode] = useState(""); // ✅ ISO alpha-2
  const [minimumBudget, setMinimumBudget] = useState<number>(100);
  const [instagram, setInstagram] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const [countries, setCountries] = useState<Opt[]>([]);

  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Load countries once
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/lookups/countries", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        setCountries(Array.isArray(data) ? data : []);
      } catch {
        // keep silent; registration can still work without list if you want
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function submit() {
    setErr(null);
    setLoading(true);

    const payload: any = {
      role,
      email,
      username,
      password,
    };

    if (role === "DRESSMAKER") {
      payload.displayName = displayName;
      payload.countryCode = countryCode; // ✅ send correct key
      payload.minimumBudget = minimumBudget;
      payload.instagram = instagram;
      payload.tiktok = tiktok;
      payload.contactPhone = contactPhone;
    }

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setErr(data?.error ?? "Registration failed");
      return;
    }

    setSuccess(true);
  }

  if (success) {
    return (
      <div className="bg-[var(--bg)]">
        <Container>
          <main className="py-10">
            <div className="mx-auto max-w-lg">
              <Card>
                <CardHeader
                  title="Check your email"
                  subtitle="We've sent a verification link to your inbox."
                />
                <CardBody className="space-y-4">
                  <div className="text-[13px] text-[var(--muted)]">
                    We sent a confirmation email to <strong>{email}</strong>.
                    Click the link in that email to activate your account. Be sure
                    to check your spam folder if you don't see it.
                  </div>
                  <div className="text-[13px] text-[var(--muted)]">
                    Already verified?{" "}
                    <a className="underline" href="/login">
                      Sign in
                    </a>
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
                title="Create your account"
                subtitle="Choose a role and fill out the required details."
              />
              <CardBody className="space-y-4">
                <div className="grid gap-2">
                  <div className="text-[13px] font-medium text-[var(--muted)]">Account type</div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={role === "CUSTOMER" ? "primary" : "secondary"}
                      onClick={() => setRole("CUSTOMER")}
                      className="flex-1"
                    >
                      Customer
                    </Button>
                    <Button
                      type="button"
                      variant={role === "DRESSMAKER" ? "primary" : "secondary"}
                      onClick={() => setRole("DRESSMAKER")}
                      className="flex-1"
                    >
                      Dressmaker
                    </Button>
                  </div>
                </div>

                <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <Input
                  placeholder={role === "CUSTOMER" ? "Username (required)" : "Username (optional)"}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
                <Input
                  placeholder="Password (min 10 chars)"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                {role === "DRESSMAKER" ? (
                  <div className="mt-2 grid gap-3">
                    <Input
                      placeholder="Display name (required)"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />

                    <Select
                      value={countryCode}
                      onChange={(e: any) => setCountryCode(e.target.value)}
                    >
                      <option value="">Home Country (required)</option>
                      {countries.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </Select>
                    <div className="text-[13px] text-[var(--muted)]">
                      Minimum Budget
                    </div>
                    <Input
                      placeholder="Minimum budget in USD (required)"
                      type="number"
                      value={minimumBudget}
                      onChange={(e) => setMinimumBudget(Number(e.target.value))}
                    />
                    <Input
                      placeholder="Instagram (required if no TikTok)"
                      value={instagram}
                      onChange={(e) => setInstagram(e.target.value)}
                    />
                    <Input
                      placeholder="TikTok (required if no Instagram)"
                      value={tiktok}
                      onChange={(e) => setTiktok(e.target.value)}
                    />
                    <Input
                      placeholder="WhatsApp or phone number (required)"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                    />
                    <div className="text-[13px] text-[var(--muted)]">
                      After signup, an admin must approve your dressmaker profile before you appear in search.
                    </div>
                  </div>
                ) : (
                  <div className="text-[13px] text-[var(--muted)]">
                    Customers can browse, message, and request quotes after signup.
                  </div>
                )}

                {err ? <div className="text-[13px] text-[var(--danger)]">{err}</div> : null}
                <label className="flex items-start gap-2 text-[13px] text-[var(--muted)]">
                  <input
                    type="checkbox"
                    required
                    className="mt-0.5 h-4 w-4 shrink-0"
                  />
                  <span>
                    I agree to the{" "}
                    <a href="/terms" target="_blank" className="underline text-[var(--plum-600)]">
                      Terms of Service
                    </a>
                    . I understand that deposits are non-refundable once a project begins.
                  </span>
                </label>
                <Button
                  type="button"
                  onClick={submit}
                  disabled={loading}
                  variant="primary"
                  className="w-full"
                >
                  {loading ? "Creating..." : "Create account"}
                </Button>

                <div className="text-[13px] text-[var(--muted)]">
                  Already have an account?{" "}
                  <a className="underline" href="/login">
                    Sign in
                  </a>
                </div>
              </CardBody>
            </Card>
          </div>
        </main>
      </Container>
    </div>
  );
}