"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

type Opt = { value: string; label: string };

export default function CustomerProfileForm({ user, profile }: any) {
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const [countries, setCountries] = useState<Opt[]>([]);
  const [subs, setSubs] = useState<Opt[]>([]);
  const [timezones, setTimezones] = useState<Opt[]>([]);

  const [form, setForm] = useState({
    username: user?.username ?? "",
    name: user?.name ?? "",
    fullName: profile?.fullName ?? "",
    phone: profile?.phone ?? "",
    timezoneIana: profile?.timezoneIana ?? "",
    address1: profile?.address1 ?? "",
    address2: profile?.address2 ?? "",
    city: profile?.city ?? "",
    postalCode: profile?.postalCode ?? "",
    countryCode: profile?.countryCode ?? "",
    subdivisionId: profile?.subdivisionId ?? "",
  });

  useEffect(() => {
    (async () => {
      const [c, t] = await Promise.all([
        fetch("/api/lookups/countries").then((r) => r.json()),
        fetch("/api/lookups/timezones").then((r) => r.json()),
      ]);
      setCountries(c);
      setTimezones(t);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!form.countryCode) {
        setSubs([]);
        return;
      }
      const s = await fetch(`/api/lookups/subdivisions?country=${encodeURIComponent(form.countryCode)}`).then((r) => r.json());
      setSubs(s);
    })();
  }, [form.countryCode]);

  async function onSave() {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch("/api/customer/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to save");
      setStatus("Saved!");
    } catch (e: any) {
      setStatus(e?.message ?? "Error saving");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6">
      {/* ...your existing fields... */}

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {/* Timezone */}
        <Field label="Timezone">
          <Select
            value={form.timezoneIana}
            onChange={(e) => setForm((s) => ({ ...s, timezoneIana: e.target.value }))}
          >
            <option value="">Select timezone</option>
            {timezones.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </Select>
        </Field>

        {/* Country */}
        <Field label="Country">
          <Select
            value={form.countryCode}
            onChange={(e) =>
              setForm((s) => ({ ...s, countryCode: e.target.value, subdivisionId: "" }))
            }
          >
            <option value="">Select country</option>
            {countries.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </Select>
        </Field>

        {/* State/Province */}
        <Field label="State/Province">
          <Select
            value={form.subdivisionId}
            onChange={(e) => setForm((s) => ({ ...s, subdivisionId: e.target.value }))}
            disabled={!form.countryCode}
          >
            <option value="">{form.countryCode ? "Select state/province" : "Select country first"}</option>
            {subs.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </Select>
        </Field>

        {/* Keep your address fields, etc. */}
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