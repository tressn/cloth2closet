"use client";

import { useState } from "react";

type Role = "CUSTOMER" | "DRESSMAKER" | "ADMIN";
type Status = "ACTIVE" | "SUSPENDED" | "PENDING_EMAIL_VERIFICATION";

export default function UserRowActions({
  userId,
  currentRole,
  currentStatus,
}: {
  userId: string;
  currentRole: Role | null;
  currentStatus: Status;
}) {
  const [role, setRole] = useState<Role | "">(currentRole ?? "");
  const [status, setStatus] = useState<Status>(currentStatus);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: role || null, status }),
      });
      if (!res.ok) throw new Error(await res.text());
      setMsg("Saved");
    } catch (e: any) {
      setMsg(e?.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 text-[14px]"
        value={role}
        onChange={(e) => setRole(e.target.value as any)}
      >
        <option value="">(no role)</option>
        <option value="CUSTOMER">CUSTOMER</option>
        <option value="DRESSMAKER">DRESSMAKER</option>
        <option value="ADMIN">ADMIN</option>
      </select>

      <select
        className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 text-[14px]"
        value={status}
        onChange={(e) => setStatus(e.target.value as any)}
      >
        <option value="ACTIVE">ACTIVE</option>
        <option value="SUSPENDED">SUSPENDED</option>
        <option value="PENDING_EMAIL_VERIFICATION">PENDING_EMAIL_VERIFICATION</option>

      </select>

      <button
        onClick={save}
        disabled={loading}
        className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 font-medium hover:bg-[var(--border)] disabled:opacity-50"
      >
        {loading ? "Saving..." : "Save"}
      </button>

      {msg ? <span className="text-[12px] text-[var(--muted)]">{msg}</span> : null}
    </div>
  );
}