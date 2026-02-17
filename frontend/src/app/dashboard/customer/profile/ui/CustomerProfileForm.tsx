"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Props = {
  user: { id: string; email: string; name: string | null; username: string | null } | null;
  profile:
    | {
        fullName: string | null;
        phone: string | null;
        timezone: string | null;
        address1: string | null;
        address2: string | null;
        city: string | null;
        region: string | null;
        postalCode: string | null;
        country: string | null;
      }
    | null;
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1">
      <div className="text-[12px] font-medium text-[var(--muted)]">{label}</div>
      {children}
    </div>
  );
}

export default function CustomerProfileForm({ user, profile }: Props) {
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const [form, setForm] = useState({
    username: user?.username ?? "",
    name: user?.name ?? "",
    fullName: profile?.fullName ?? "",
    phone: profile?.phone ?? "",
    timezone: profile?.timezone ?? "",
    address1: profile?.address1 ?? "",
    address2: profile?.address2 ?? "",
    city: profile?.city ?? "",
    region: profile?.region ?? "",
    postalCode: profile?.postalCode ?? "",
    country: profile?.country ?? "",
  });

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
      <h2 className="text-xl font-semibold">Account</h2>
      <p className="mt-1 text-sm opacity-80">Update your public and shipping details.</p>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <Field label="Username">
          <Input
            value={form.username}
            onChange={(e) => setForm((s) => ({ ...s, username: e.target.value }))}
            placeholder="e.g. jane_doe"
          />
        </Field>

        <Field label="Name">
          <Input
            value={form.name}
            onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
            placeholder="e.g. Jane Doe"
          />
        </Field>

        <Field label="Full name (shipping)">
          <Input
            value={form.fullName}
            onChange={(e) => setForm((s) => ({ ...s, fullName: e.target.value }))}
          />
        </Field>

        <Field label="Phone">
          <Input
            value={form.phone}
            onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
          />
        </Field>

        <Field label="Timezone">
          <Input
            value={form.timezone}
            onChange={(e) => setForm((s) => ({ ...s, timezone: e.target.value }))}
            placeholder="e.g. America/New_York"
          />
        </Field>

        <Field label="Country">
          <Input
            value={form.country}
            onChange={(e) => setForm((s) => ({ ...s, country: e.target.value }))}
          />
        </Field>

        <Field label="Address 1">
          <Input
            value={form.address1}
            onChange={(e) => setForm((s) => ({ ...s, address1: e.target.value }))}
          />
        </Field>

        <Field label="Address 2">
          <Input
            value={form.address2}
            onChange={(e) => setForm((s) => ({ ...s, address2: e.target.value }))}
          />
        </Field>

        <Field label="City">
          <Input
            value={form.city}
            onChange={(e) => setForm((s) => ({ ...s, city: e.target.value }))}
          />
        </Field>

        <Field label="State/Region">
          <Input
            value={form.region}
            onChange={(e) => setForm((s) => ({ ...s, region: e.target.value }))}
          />
        </Field>

        <Field label="Postal code">
          <Input
            value={form.postalCode}
            onChange={(e) => setForm((s) => ({ ...s, postalCode: e.target.value }))}
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
