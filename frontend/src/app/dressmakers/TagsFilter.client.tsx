"use client";

import { useMemo, useState } from "react";
import LabelMultiSelect, { type PickerLabel } from "@/components/labels/LabelMultiSelect";
import { Button } from "@/components/ui/Button";

export default function TagsFilterClient({
  initialSelectedLabels = [],
}: {
  initialSelectedLabels?: PickerLabel[];
}) {
  const [selectedLabels, setSelectedLabels] = useState<PickerLabel[]>(
    initialSelectedLabels
  );

  const tagIds = useMemo(
    () => selectedLabels.map((label) => label.id),
    [selectedLabels]
  );

  return (
    <div className="mt-4 grid gap-3">
      <div>
        <div className="text-[12px] font-medium text-[var(--muted)]">
          Filter by specialty
        </div>
        <div className="mt-2">
          <LabelMultiSelect
            // ✅ Specialty only for MVP — clean, accurate, admin-approved
            scope="SPECIALTY"
            selectedLabels={selectedLabels}
            onChange={setSelectedLabels}
            allowCreate={false}
            placeholder="Pick specialties (bridal, eveningwear, etc.)"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        {selectedLabels.length > 0 ? (
          <button
            type="button"
            className="text-[13px] text-[var(--muted)] underline hover:text-[var(--text)]"
            onClick={() => {
              setSelectedLabels([]);
              const sp = new URLSearchParams(window.location.search);
              sp.delete("tag");
              window.location.href = `/dressmakers?${sp.toString()}`;
            }}
          >
            Clear
          </button>
        ) : (
          <div />
        )}

        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            const sp = new URLSearchParams(window.location.search);
            sp.delete("tag");
            for (const id of tagIds) {
              sp.append("tag", id);
            }
            window.location.href = `/dressmakers?${sp.toString()}`;
          }}
        >
          Apply filters
        </Button>
      </div>
    </div>
  );
}