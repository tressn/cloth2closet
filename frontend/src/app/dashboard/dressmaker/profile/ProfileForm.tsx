"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";

type Profile = {
  displayName: string | null;
  bio: string | null;
  location: string | null;
  languages: string[];
  basePriceFrom: number | null; // cents
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
  const [location, setLocation] = useState(initialProfile.location ?? "");
  const [languagesText, setLanguagesText] = useState((initialProfile.languages ?? []).join(", "));
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

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const previewPrice = useMemo(() => {
    const n = Number(basePriceFrom);
    if (!basePriceFrom.trim() || !Number.isFinite(n)) return null;
    return (n / 100).toFixed(2);
  }, [basePriceFrom]);

  async function onSave() {
    setSaving(true);
    setMessage(null);

    const languages = languagesText.split(",").map((s) => s.trim()).filter(Boolean);
    const specialties = specialtiesText.split(",").map((s) => s.trim()).filter(Boolean);

    const parsedBasePrice = basePriceFrom.trim().length ? Number(basePriceFrom) : null;
    const parsedYears = yearsExperience.trim().length ? Number(yearsExperience) : null;

    const res = await fetch("/api/dressmakers/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName,
        bio,
        location,
        languages,
        basePriceFrom: parsedBasePrice,
        currency,
        yearsExperience: parsedYears,
        specialties,
        websiteUrl: websiteUrl.trim() || null,
        instagramHandle: instagramHandle.trim() || null,
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

        <Field label="Location" hint="City + country works well for trust.">
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder='e.g. "Brooklyn, NY"' />
        </Field>
      </div>

      <Field label="Bio" hint="Describe your style, turnaround time, and what you love making.">
        <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Your specialties, style, turnaround time…" />
      </Field>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Languages" hint="Comma-separated (en, fr, es) or full words — be consistent.">
          <Input value={languagesText} onChange={(e) => setLanguagesText(e.target.value)} placeholder="en, fr" />
        </Field>

        <Field label="Specialties" hint="Comma-separated tags that buyers search for.">
          <Input value={specialtiesText} onChange={(e) => setSpecialtiesText(e.target.value)} placeholder="bridal, eveningwear, alterations" />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Base price from (cents)" hint={previewPrice ? `Preview: ${currency} ${previewPrice}` : "Stored in cents (e.g. 50000 = $500.00)."}>
          <Input value={basePriceFrom} onChange={(e) => setBasePriceFrom(e.target.value)} placeholder="50000" />
        </Field>

        <Field label="Currency">
          <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
            {!CURRENCIES.includes(currency as any) ? <option value={currency}>{currency}</option> : null}
          </Select>
        </Field>

        <Field label="Years experience">
          <Input value={yearsExperience} onChange={(e) => setYearsExperience(e.target.value)} placeholder="e.g. 5" />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Website URL" hint="Optional. Adds trust.">
          <Input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://your-site.com" />
        </Field>

        <Field label="Instagram handle" hint="Optional. No @ needed.">
          <Input value={instagramHandle} onChange={(e) => setInstagramHandle(e.target.value)} placeholder="yourhandle" />
        </Field>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="text-[13px] text-[var(--muted)]">
          Keep your profile warm + clear. Luxury comes from clarity and restraint.
        </div>
        <Button type="button" onClick={onSave} disabled={saving} variant="primary">
          {saving ? "Saving..." : "Save changes"}
        </Button>
      </div>

      {message ? (
        <div className="text-[13px] text-[var(--muted)]">{message}</div>
      ) : null}
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
      <div className="text-[12px] font-medium text-[var(--muted)]">{label}</div>
      {children}
      {hint ? <div className="text-[12px] leading-5 text-[var(--muted)]">{hint}</div> : null}
    </label>
  );
}
