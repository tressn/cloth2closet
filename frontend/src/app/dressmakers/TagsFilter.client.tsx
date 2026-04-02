"use client";

import { useMemo, useState } from "react";
import LabelMultiSelect, { type PickerLabel } from "@/components/labels/LabelMultiSelect";
import { Button } from "@/components/ui/Button";

function getQueryArrayParam(name: string) {
  if (typeof window === "undefined") return [];
  const sp = new URLSearchParams(window.location.search);
  return sp.getAll(name);
}

export default function TagsFilterClient() {
  // start from URL: ?tag=...&tag=...
  const initialIds = useMemo(() => getQueryArrayParam("tag"), []);

  const [selectedLabels, setSelectedLabels] = useState<PickerLabel[]>(
    initialIds.map((id) => ({
      id,
      name: id,
      status: "APPROVED",
      scope: "PORTFOLIO",
    }))
  );

  const tagIds = selectedLabels.map((label) => label.id);

  return (
    <div className="mt-4 grid gap-3">
      <div>
        <div className="text-[12px] font-medium text-[var(--muted)]">Tags</div>
        <div className="mt-2">
          <LabelMultiSelect
            scope="PORTFOLIO"
            selectedLabels={selectedLabels}
            onChange={setSelectedLabels}
            allowCreate={false}
            placeholder="Pick tags (bridal, eveningwear, etc.)"
          />
        </div>
      </div>

      <div className="flex justify-end">
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
          Apply tags
        </Button>
      </div>
    </div>
  );
}