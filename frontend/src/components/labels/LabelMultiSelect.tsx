"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

type Scope = "PROJECT" | "PORTFOLIO" | "SPECIALTY";

export type PickerLabel = {
  id: string;
  name: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  scope?: Scope;
};

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function slugify(name: string) {
  return normalizeName(name)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

export default function LabelMultiSelect(props: {
  scope: Scope;
  selectedLabels?: PickerLabel[];
  onChange: (nextLabels: PickerLabel[]) => void;
  placeholder?: string;
  disabled?: boolean;
  allowCreate?: boolean;
}) {
  const {
    scope,
    selectedLabels = [],
    onChange,
    placeholder = "Start typing to add tags…",
    disabled,
  } = props;

  const allowCreate = props.allowCreate ?? true;

  const [all, setAll] = useState<PickerLabel[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);

    fetch(`/api/labels?scope=${scope}&includePending=1`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return;

        const labels = Array.isArray(data?.labels) ? data.labels : [];
        setAll(
          labels.sort((a: PickerLabel, b: PickerLabel) =>
            a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
          )
        );
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [scope]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const selectedIds = useMemo(
    () => new Set((selectedLabels ?? []).map((l) => l.id)),
    [selectedLabels]
    );

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();

    const list = all
        .filter((l) => l.status === "APPROVED" || l.status === "PENDING")
        .filter((l) => !selectedIds.has(l.id))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

    if (!s) return list;

    return list.filter((l) => l.name.toLowerCase().includes(s));
    }, [all, q, selectedIds]);

  const canCreate = useMemo(() => {
    if (!allowCreate) return false;

    const name = normalizeName(q);
    if (name.length < 2) return false;

    const nextSlug = slugify(name);

    const exists = all.some((l) => slugify(l.name) === nextSlug);
    return !exists;
  }, [allowCreate, q, all]);

  function addLabel(label: PickerLabel) {
    const nextMap = new Map(selectedLabels.map((x) => [x.id, x] as const));
    nextMap.set(label.id, label);

    onChange(Array.from(nextMap.values()));
    setQ("");
    setOpen(false);
    }

  function removeLabel(labelId: string) {
    onChange(selectedLabels.filter((l) => l.id !== labelId));
  }

  async function createAndAttach() {
    const name = normalizeName(q);
    if (name.length < 2) return;

    const existing = all.find((l) => slugify(l.name) === slugify(name));
    if (existing) {
        addLabel(existing);
        return;
    }

    const res = await fetch("/api/labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, name }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(data?.error ?? "Failed to create label");
    }

    const label = data?.label as PickerLabel | undefined;
    if (!label?.id) {
        throw new Error("Label creation returned no id");
    }

    setAll((prev) => {
        const map = new Map(prev.map((x) => [x.id, x] as const));
        map.set(label.id, label);

        return Array.from(map.values()).sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
        );
    });

    addLabel(label);
    }

  return (
    <div ref={boxRef} className="grid gap-2">
      {selectedLabels.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedLabels.map((label) => (
            <span key={label.id} className="inline-flex items-center gap-2">
              <Badge tone={label.status === "APPROVED" ? "neutral" : "featured"}>
                {label.name}
                {label.status !== "APPROVED" ? " (pending)" : ""}
              </Badge>
              <button
                type="button"
                className="text-[12px] text-[var(--muted)] hover:text-[var(--text)]"
                onClick={() => removeLabel(label.id)}
                disabled={disabled}
                aria-label={`Remove ${label.name}`}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div className="relative">
        <Input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
        />

        {open ? (
          <div className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)]">
            {loading ? (
              <div className="px-4 py-3 text-[13px] text-[var(--muted)]">
                Loading tags…
              </div>
            ) : null}

            {!loading && filtered.length === 0 && !canCreate ? (
              <div className="px-4 py-3 text-[13px] text-[var(--muted)]">
                No matches.
              </div>
            ) : null}

            {!loading &&
              filtered.map((label) => (
                <button
                  key={label.id}
                  type="button"
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-[14px] hover:bg-[var(--surface-2)]"
                  onClick={() => addLabel(label)}
                  disabled={disabled}
                >
                  <span className="text-[var(--text)]">{label.name}</span>
                  <span className="text-[12px] text-[var(--muted)]">
                    {label.status === "APPROVED" ? "approved" : "pending"}
                  </span>
                </button>
              ))}

            {canCreate ? (
              <div className="border-t border-[var(--border)] px-4 py-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={createAndAttach}
                  disabled={disabled}
                >
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