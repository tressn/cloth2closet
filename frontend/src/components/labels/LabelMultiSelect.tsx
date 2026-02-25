"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

type Scope = "PROJECT" | "PORTFOLIO" | "SPECIALTY";

type Label = {
  id: string;
  name: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  scope: Scope;
};

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

export default function LabelMultiSelect(props: {
  scope: Scope;
  valueIds: string[];                // selected label ids
  valueNames?: string[];             // optional: selected label names (for immediate rendering)
  onChange: (nextIds: string[], nextLabels: Array<{ id: string; name: string; status: Label["status"] }>) => void;

  placeholder?: string;
  disabled?: boolean;
  allowCreate?: boolean;             // default true
}) {
  const { scope, valueIds, onChange } = props;
  const allowCreate = props.allowCreate ?? true;

  const [all, setAll] = useState<Label[]>([]);
  const [loading, setLoading] = useState(false);

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  // Fetch approved labels for this scope
  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`/api/labels?scope=${scope}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return;
        setAll(Array.isArray(data?.labels) ? data.labels : []);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [scope]);

  // Close on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const selected = useMemo(() => {
    const map = new Map(all.map((l) => [l.id, l] as const));
    return valueIds
      .map((id) => map.get(id))
      .filter(Boolean) as Label[];
  }, [all, valueIds]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = all
      .filter((l) => l.status === "APPROVED" || l.status === "PENDING")
      .filter((l) => !valueIds.includes(l.id));
    if (!s) return list.slice(0, 12);
    return list
      .filter((l) => l.name.toLowerCase().includes(s))
      .slice(0, 12);
  }, [all, q, valueIds]);

  const canCreate = useMemo(() => {
    if (!allowCreate) return false;
    const name = normalizeName(q);
    if (name.length < 2) return false;
    const exists = all.some((l) => l.scope === scope && l.name.toLowerCase() === name.toLowerCase());
    return !exists;
  }, [allowCreate, q, all, scope]);

  async function addById(labelId: string) {
    const label = all.find((x) => x.id === labelId);
    if (!label) return;

    const nextIds = Array.from(new Set([...valueIds, labelId]));
    const nextLabels = [
      ...selected.map((x) => ({ id: x.id, name: x.name, status: x.status })),
      { id: label.id, name: label.name, status: label.status },
    ];
    onChange(nextIds, nextLabels);
    setQ("");
    setOpen(false);
  }

  function removeById(labelId: string) {
    const nextIds = valueIds.filter((id) => id !== labelId);
    const nextLabels = selected
      .filter((x) => x.id !== labelId)
      .map((x) => ({ id: x.id, name: x.name, status: x.status }));
    onChange(nextIds, nextLabels);
  }

  async function createAndAttach() {
    const name = normalizeName(q);
    if (name.length < 2) return;

    // Create PENDING label (your API supports this)
    const res = await fetch("/api/labels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope, name }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error ?? "Failed to create label");

    const label: Label = data?.label;
    if (!label?.id) throw new Error("Label creation returned no id");

    // Put it in local list so it shows up immediately
    setAll((prev) => {
      const exists = prev.some((x) => x.id === label.id);
      return exists ? prev : [label, ...prev];
    });

    await addById(label.id);
  }

  return (
    <div ref={boxRef} className="grid gap-2">
      {/* Selected badges */}
      {selected.length ? (
        <div className="flex flex-wrap gap-2">
          {selected.map((l) => (
            <span key={l.id} className="inline-flex items-center gap-2">
              <Badge tone={l.status === "APPROVED" ? "neutral" : "featured"}>
                {l.name}
                {l.status !== "APPROVED" ? " (pending)" : ""}
              </Badge>
              <button
                type="button"
                className="text-[12px] text-[var(--muted)] hover:text-[var(--text)]"
                onClick={() => removeById(l.id)}
                disabled={props.disabled}
                aria-label={`Remove ${l.name}`}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {/* Input + dropdown */}
      <div className="relative">
        <Input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={props.placeholder ?? (loading ? "Loading…" : "Start typing to search tags…")}
          disabled={props.disabled}
        />

        {open ? (
          <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)]">
            {filtered.length === 0 && !canCreate ? (
              <div className="px-4 py-3 text-[13px] text-[var(--muted)]">
                No matches.
              </div>
            ) : null}

            {filtered.map((l) => (
              <button
                key={l.id}
                type="button"
                className="flex w-full items-center justify-between px-4 py-3 text-left text-[14px] hover:bg-[var(--surface-2)]"
                onClick={() => addById(l.id)}
                disabled={props.disabled}
              >
                <span className="text-[var(--text)]">{l.name}</span>
                <span className="text-[12px] text-[var(--muted)]">{l.status === "APPROVED" ? "approved" : "pending"}</span>
              </button>
            ))}

            {canCreate ? (
              <div className="border-t border-[var(--border)] px-4 py-3">
                <Button type="button" variant="secondary" onClick={createAndAttach} disabled={props.disabled}>
                  Create “{normalizeName(q)}” (pending)
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}