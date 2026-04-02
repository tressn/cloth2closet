"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";

type Opt = { value: string; label: string };

type Profile = {
  displayName: string | null;
  bio: string | null;

  countryCode: string | null;
  timezoneIana: string | null;

  languageCodes: string[];

  basePriceFrom: number | null; // dollars
  currency: string;
  yearsExperience: number | null;

  specialties: string[];
  websiteUrl: string | null;
  instagramHandle: string | null;
  tiktokHandle: string | null;
};

const CURRENCIES = ["USD", "CAD", "EUR", "GBP"] as const;

export default function ProfileForm({ initialProfile }: { initialProfile: Profile }) {
  const [displayName, setDisplayName] = useState(initialProfile.displayName ?? "");
  const [bio, setBio] = useState(initialProfile.bio ?? "");

  const [specialtiesText, setSpecialtiesText] = useState(
    (initialProfile.specialties ?? []).join(", ")
  );

  const [basePriceFrom, setBasePriceFrom] = useState(
    initialProfile.basePriceFrom != null ? String(initialProfile.basePriceFrom) : ""
  );
  const [currency, setCurrency] = useState((initialProfile.currency as any) ?? "USD");
  const [yearsExperience, setYearsExperience] = useState(
    initialProfile.yearsExperience != null ? String(initialProfile.yearsExperience) : ""
  );

  const [websiteUrl, setWebsiteUrl] = useState(initialProfile.websiteUrl ?? "");
  const [instagramHandle, setInstagramHandle] = useState(initialProfile.instagramHandle ?? "");
  const [tiktokHandle, setTiktokHandle] = useState(initialProfile.tiktokHandle ?? "");

  const [countryCode, setCountryCode] = useState(initialProfile.countryCode ?? "");
  const [timezoneIana, setTimezoneIana] = useState(initialProfile.timezoneIana ?? "");

  const [languageCodes, setLanguageCodes] = useState<string[]>(initialProfile.languageCodes ?? []);

  const [countries, setCountries] = useState<Opt[]>([]);
  const [timezones, setTimezones] = useState<Opt[]>([]);
  const [languages, setLanguages] = useState<Opt[]>([]);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const pricePreview = useMemo(() => {
    const n = Number(basePriceFrom);
    if (!basePriceFrom.trim() || !Number.isFinite(n) || n < 0) return null;
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  }, [basePriceFrom, currency]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [c, t, l] = await Promise.all([
          fetch("/api/lookups/countries", { cache: "no-store" }).then((r) => r.json()),
          fetch("/api/lookups/timezones", { cache: "no-store" }).then((r) => r.json()),
          fetch("/api/lookups/languages", { cache: "no-store" }).then((r) => r.json()),
        ]);
        if (cancelled) return;
        setCountries(Array.isArray(c) ? c : []);
        setTimezones(Array.isArray(t) ? t : []);
        setLanguages(Array.isArray(l) ? l : []);
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  function toggleLanguage(code: string) {
    setLanguageCodes((prev) => {
      const set = new Set(prev);
      if (set.has(code)) set.delete(code);
      else set.add(code);
      return Array.from(set);
    });
  }

  async function onSave() {
    setSaving(true);
    setMessage(null);

    const specialties = specialtiesText.split(",").map((s) => s.trim()).filter(Boolean);

    const parsedBasePrice = basePriceFrom.trim().length ? Number(basePriceFrom) : null;
    const parsedYears = yearsExperience.trim().length ? Number(yearsExperience) : null;

    const res = await fetch("/api/dressmakers/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName,
        bio,
        countryCode: countryCode || null,
        timezoneIana: timezoneIana || null,
        languageCodes,
        basePriceFrom: parsedBasePrice, // dollars
        currency,
        yearsExperience: parsedYears,
        specialties,
        websiteUrl: websiteUrl.trim() || null,
        instagramHandle: instagramHandle.trim().replace(/^@/, "") || null,
        tiktokHandle: tiktokHandle.trim().replace(/^@/, "") || null,
      }),
    });

    const data = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      setMessage(data?.error ?? `Save failed (${res.status})`);
      return;
    }
    setMessage("Saved!");
  }

  return (
    <div className="flex flex-col gap-12">
      {/* SECTION: Public profile */}
      <Section title="Public profile" subtitle="This information appears on your dressmaker page.">
        <div className="grid gap-5 md:grid-cols-2">
          <Field
            label="Designer Label"
          >
            <Control>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Lina’s Atelier"
              />
            </Control>
          </Field>

          <Field label="Country" hint="Where you're based (shown publicly).">
            <Control>
              <Select value={countryCode} onChange={(e: any) => setCountryCode(e.target.value)}>
                <option value="">Select country</option>
                {countries.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Control>
          </Field>

          <Field label="Timezone" hint="Used for scheduling and availability.">
            <Control>
              <Select value={timezoneIana} onChange={(e: any) => setTimezoneIana(e.target.value)}>
                <option value="">Select timezone</option>
                {timezones.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </Control>
          </Field>

          <Field label="Instagram handle" hint="No @ needed.">
            <Control>
              <Input
                value={instagramHandle}
                onChange={(e) => setInstagramHandle(e.target.value)}
                placeholder="your handle"
              />
            </Control>
          </Field>

          <Field label="TikTok handle" hint="No @ needed.">
            <Control>
              <Input
                value={tiktokHandle}
                onChange={(e) => setTiktokHandle(e.target.value)}
                placeholder="your handle"
              />
            </Control>
          </Field>
        </div>

        <div className="mt-4">
          <Field
            label="Bio"
            hint="A short intro: what you specialize in, typical turnaround, and what you love making."
          >
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} />
          </Field>
        </div>
      </Section>

      {/* SECTION: Skills */}
      <Section title="Skills & Specialties" subtitle="Helps customers find you in search.">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Specialties" hint="Comma-separated (e.g. bridal, eveningwear, alterations).">
            <Control>
              <Input
                value={specialtiesText}
                onChange={(e) => setSpecialtiesText(e.target.value)}
                placeholder="bridal, eveningwear, alterations"
              />
            </Control>
          </Field>

          <Field label="Website URL" hint="Optional. Include https://">
            <Control>
              <Input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} />
            </Control>
          </Field>
        </div>

        <div className="mt-4">
          <Field label="Languages" hint="Select the languages you can comfortably communicate in.">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {languages.length === 0 ? (
                <div className="text-[13px] text-[var(--muted)]">No languages available.</div>
              ) : (
                languages.map((l) => {
                  const checked = languageCodes.includes(l.value);
                  return (
                    <label
                      key={l.value}
                      className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[13px] text-[var(--text)] hover:bg-[var(--surface-2)]"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleLanguage(l.value)}
                        className="h-4 w-4"
                      />
                      <span className="truncate">{l.label}</span>
                    </label>
                  );
                })
              )}
            </div>
          </Field>
        </div>
      </Section>

      {/* SECTION: Pricing */}
      <Section title="Pricing" subtitle="Displayed as your starting price. (Stored in dollars.)">
        <div className="grid gap-4 md:grid-cols-3">
          <Field
            label="Base price from"
            hint={pricePreview ? `Preview: ${pricePreview}` : "Enter your minimum starting price in dollars."}
          >
            <Control>
              <Input
                value={basePriceFrom}
                onChange={(e) => setBasePriceFrom(e.target.value)}
                placeholder="100"
                inputMode="numeric"
              />
            </Control>
          </Field>

          <Field label="Currency" hint="Shown publicly with your base price.">
            <Control>
              <Select value={currency} onChange={(e: any) => setCurrency(e.target.value)}>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Control>
          </Field>

          <Field label="Years of experience" hint="Optional, but builds trust.">
            <Control>
              <Input
                value={yearsExperience}
                onChange={(e) => setYearsExperience(e.target.value)}
                placeholder="e.g. 5"
                inputMode="numeric"
              />
            </Control>
          </Field>
        </div>
      </Section>

      {/* Footer */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Button type="button" onClick={onSave} disabled={saving} variant="primary">
          {saving ? "Saving..." : "Save changes"}
        </Button>

        {message ? <div className="text-[13px] text-[var(--muted)]">{message}</div> : null}
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <div className="text-[15px] font-semibold tracking-[0.01em] text-[var(--text)]">
          {title}
        </div>
        {subtitle ? (
          <div className="max-w-2xl text-[13px] leading-6 text-[var(--muted)]">
            {subtitle}
          </div>
        ) : null}
      </div>

      <div>{children}</div>
    </section>
  );
}

/**
 * Key alignment fix:
 * - label and hint reserve space so fields in the same row feel aligned
 * - controls are forced to full width
 */
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <div className="min-h-[18px] text-[12px] font-medium text-[var(--muted)]">{label}</div>
      <div className="mt-2">{children}</div>
      <div className="mt-2 min-h-[18px] text-[12px] leading-5 text-[var(--muted)]">
        {hint ?? ""}
      </div>
    </div>
  );
}

/**
 * Control wrapper:
 * - forces consistent height + width across Input/Select
 * - doesn't affect Textarea (you don't wrap Textarea with it)
 */
function Control({ children }: { children: React.ReactNode }) {
  return <div className="w-full [&>*]:w-full [&_*]:h-11">{children}</div>;
}