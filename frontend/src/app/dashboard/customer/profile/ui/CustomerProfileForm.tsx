"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

type Opt = { value: string; label: string };

type Props = {
  user: {
    username?: string | null;
    name?: string | null;
  } | null;
  profile: {
    fullName?: string | null;
    phone?: string | null;
    timezoneIana?: string | null; // change to `timezone` if that's your prisma field
    address1?: string | null;
    address2?: string | null;
    city?: string | null;
    postalCode?: string | null;
    countryCode?: string | null;
    subdivisionCode?: string | null;
  } | null;
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const msg =
      (data && typeof data === "object" && "error" in data && (data as any).error) ||
      `Request failed: ${res.status}`;
    throw new Error(String(msg));
  }
  return data as T;
}

export default function CustomerProfileForm({ user, profile }: Props) {
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const [countries, setCountries] = useState<Opt[]>([]);
  const [subs, setSubs] = useState<Opt[]>([]);
  const [timezones, setTimezones] = useState<Opt[]>([]);

  const [form, setForm] = useState(() => ({
    username: user?.username ?? "",
    name: user?.name ?? "",
    fullName: profile?.fullName ?? "",
    phone: profile?.phone ?? "",
    timezoneIana: profile?.timezoneIana ?? "", // change to `timezone` if needed
    address1: profile?.address1 ?? "",
    address2: profile?.address2 ?? "",
    city: profile?.city ?? "",
    postalCode: profile?.postalCode ?? "",
    countryCode: profile?.countryCode ?? "",
    subdivisionCode: profile?.subdivisionCode ?? "",
  }));

  // handy helper
  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((s) => ({ ...s, [key]: value }));

  // Load countries & timezones once
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [c, t] = await Promise.all([
          fetchJson<Opt[]>("/api/lookups/countries"),
          fetchJson<Opt[]>("/api/lookups/timezones"),
        ]);
        if (cancelled) return;
        setCountries(Array.isArray(c) ? c : []);
        setTimezones(Array.isArray(t) ? t : []);
      } catch (e: any) {
        if (cancelled) return;
        setStatus(e?.message ?? "Failed to load lookups");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Load subdivisions when country changes
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (!form.countryCode) {
          setSubs([]);
          return;
        }
        const s = await fetchJson<Opt[]>(
          `/api/lookups/subdivisions?country=${encodeURIComponent(form.countryCode)}`
        );
        if (cancelled) return;
        setSubs(Array.isArray(s) ? s : []);
      } catch (e: any) {
        if (cancelled) return;
        setSubs([]);
        setStatus(e?.message ?? "Failed to load subdivisions");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [form.countryCode]);

  const canChooseSubdivision = useMemo(
    () => Boolean(form.countryCode) && subs.length > 0,
    [form.countryCode, subs.length]
  );

  async function onSave() {
    setSaving(true);
    setStatus(null);

    try {
      const res = await fetch("/api/customer/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any)?.error ?? "Failed to save");

      setStatus("Saved!");
    } catch (e: any) {
      setStatus(e?.message ?? "Error saving");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6">
      <div className="grid gap-3 lg:grid-cols-2">
        <Field label="Username">
          <Input
            value={form.username}
            onChange={(e) => update("username", e.target.value)}
          />
        </Field>

        <Field label="Full name">
          <Input
            value={form.fullName}
            onChange={(e) => update("fullName", e.target.value)}
          />
        </Field>

        <Field label="Phone">
          <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} />
        </Field>

        {/* Timezone */}
        <Field label="Timezone">
          <Select
            value={form.timezoneIana}
            // Some custom Select components don't type events well; this works either way:
            onChange={(e: any) => update("timezoneIana", e.target.value)}
          >
            <option value="">Select timezone</option>
            {timezones.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>

        {/* Country */}
        <Field label="Country">
          <Select
            value={form.countryCode}
            onChange={(e: any) => {
              const nextCountry = e.target.value as string;
              setForm((s) => ({
                ...s,
                countryCode: nextCountry,
                subdivisionCode: "", // reset when changing country
              }));
            }}
          >
            <option value="">Select country</option>
            {countries.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>

        {/* State/Province */}
        <Field label="State/Province">
          <Select
            value={form.subdivisionCode}
            onChange={(e: any) => update("subdivisionCode", e.target.value)}
            disabled={!form.countryCode || subs.length === 0}
          >
            <option value="">
              {!form.countryCode
                ? "Select country first"
                : canChooseSubdivision
                  ? "Select state/province"
                  : "No subdivisions"}
            </option>
            {subs.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Address line 1">
          <Input
            value={form.address1}
            onChange={(e) => update("address1", e.target.value)}
          />
        </Field>

        <Field label="Address line 2">
          <Input
            value={form.address2}
            onChange={(e) => update("address2", e.target.value)}
          />
        </Field>

        <Field label="City">
          <Input value={form.city} onChange={(e) => update("city", e.target.value)} />
        </Field>

        <Field label="Postal code">
          <Input
            value={form.postalCode}
            onChange={(e) => update("postalCode", e.target.value)}
          />
        </Field>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Button onClick={onSave} disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </Button>
        {status && <span className="text-sm opacity-80">{status}</span>}
      </div>
    </div>
  );
}