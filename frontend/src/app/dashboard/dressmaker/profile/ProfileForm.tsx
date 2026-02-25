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

  basePriceFrom: number | null;
  currency: string;
  yearsExperience: number | null;

  specialties: string[];
  websiteUrl: string | null;
  instagramHandle: string | null;
};

const CURRENCIES = ["USD", "CAD", "EUR", "GBP"] as const;

export default function ProfileForm({ initialProfile }: { initialProfile: Profile }) {
  const [displayName, setDisplayName] = useState(initialProfile.displayName ?? "");
  const [bio, setBio] = useState(initialProfile.bio ?? "");

  const [specialtiesText, setSpecialtiesText] = useState((initialProfile.specialties ?? []).join(", "));

  const [basePriceFrom, setBasePriceFrom] = useState(
    initialProfile.basePriceFrom != null ? String(initialProfile.basePriceFrom) : ""
  );
  const [currency, setCurrency] = useState((initialProfile.currency as any) ?? "USD");
  const [yearsExperience, setYearsExperience] = useState(
    initialProfile.yearsExperience != null ? String(initialProfile.yearsExperience) : ""
  );

  const [websiteUrl, setWebsiteUrl] = useState(initialProfile.websiteUrl ?? "");
  const [instagramHandle, setInstagramHandle] = useState(initialProfile.instagramHandle ?? "");

  const [countryCode, setCountryCode] = useState(initialProfile.countryCode ?? "");
  const [timezoneIana, setTimezoneIana] = useState(initialProfile.timezoneIana ?? "");

  const [languageCodes, setLanguageCodes] = useState<string[]>(initialProfile.languageCodes ?? []);

  const [countries, setCountries] = useState<Opt[]>([]);
  const [timezones, setTimezones] = useState<Opt[]>([]);
  const [languages, setLanguages] = useState<Opt[]>([]);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const previewPrice = useMemo(() => {
    const n = Number(basePriceFrom);
    if (!basePriceFrom.trim() || !Number.isFinite(n)) return null;
    return (n / 100).toFixed(2);
  }, [basePriceFrom]);

  useEffect(() => {
    (async () => {
      try {
        const [c, t, l] = await Promise.all([
          fetch("/api/lookups/countries").then((r) => r.json()),
          fetch("/api/lookups/timezones").then((r) => r.json()),
          fetch("/api/lookups/languages").then((r) => r.json()),
        ]);
        setCountries(Array.isArray(c) ? c : []);
        setTimezones(Array.isArray(t) ? t : []);
        setLanguages(Array.isArray(l) ? l : []);
      } catch {
        // ignore
      }
    })();
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

        basePriceFrom: parsedBasePrice,
        currency,
        yearsExperience: parsedYears,
        specialties,
        websiteUrl: websiteUrl.trim() || null,
        instagramHandle: instagramHandle.trim().replace(/^@/, "") || null,
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
    <div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Display name" hint="This appears publicly. Keep it simple + memorable.">
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g. Lina’s Atelier" />
        </Field>

        <Field label="Country">
          <Select value={countryCode} onChange={(e) => setCountryCode(e.target.value)}>
            <option value="">Select country</option>
            {countries.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Timezone" hint="Shown for availability / scheduling.">
          <Select value={timezoneIana} onChange={(e) => setTimezoneIana(e.target.value)}>
            <option value="">Select timezone</option>
            {timezones.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Bio">
        <Textarea value={bio} onChange={(e) => setBio(e.target.value)} />
      </Field>

      <Field label="Languages" hint="Select the languages you can comfortably communicate in.">
        <div className="grid gap-2 sm:grid-cols-2">
          {languages.map((l) => {
            const checked = languageCodes.includes(l.value);
            return (
              <label key={l.value} className="flex items-center gap-2 text-[13px]">
                <input type="checkbox" checked={checked} onChange={() => toggleLanguage(l.value)} />
                <span>{l.label}</span>
              </label>
            );
          })}
          {languages.length === 0 ? <div className="text-[13px] opacity-70">No languages available.</div> : null}
        </div>
      </Field>

      <Field label="Specialties" hint="Comma-separated (e.g. bridal, eveningwear).">
        <Input value={specialtiesText} onChange={(e) => setSpecialtiesText(e.target.value)} />
      </Field>

      <div className="grid gap-4 md:grid-cols-3">
        <Field
          label="Base price from (cents)"
          hint={previewPrice ? `Preview: ${currency} ${previewPrice}` : "Stored in cents (e.g. 50000 = $500.00)."}
        >
          <Input value={basePriceFrom} onChange={(e) => setBasePriceFrom(e.target.value)} placeholder="50000" />
        </Field>

        <Field label="Currency">
          <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
        </Field>

        <Field label="Years experience">
          <Input value={yearsExperience} onChange={(e) => setYearsExperience(e.target.value)} placeholder="e.g. 5" />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Website URL">
          <Input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} />
        </Field>

        <Field label="Instagram handle" hint="No @ needed.">
          <Input value={instagramHandle} onChange={(e) => setInstagramHandle(e.target.value)} />
        </Field>
      </div>

      <div className="flex items-center justify-between gap-3">
        <Button type="button" onClick={onSave} disabled={saving} variant="primary">
          {saving ? "Saving..." : "Save changes"}
        </Button>
        {message ? <div className="text-[13px] opacity-70">{message}</div> : null}
      </div>
    </div>
  );
}

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
    <label className="grid gap-2">
      <div className="text-[12px] font-medium opacity-70">{label}</div>
      {children}
      {hint ? <div className="text-[12px] leading-5 opacity-70">{hint}</div> : null}
    </label>
  );
}