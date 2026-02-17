import React from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export function FeedItemSpotlight({
  makerName,
  makerMeta,
  blurb,
  tags,
}: {
  makerName: string;
  makerMeta: string;
  blurb: string;
  tags?: string[];
}) {
  return (
    <Card>
      <CardBody>
        <div className="flex items-start justify-between gap-4">
          <Avatar name={makerName} subtitle={makerMeta} />
          <Badge tone="featured">Spotlight</Badge>
        </div>

        <div className="mt-4 text-[16px] leading-7 text-[var(--text)]">
          {blurb}
        </div>

        {tags?.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {tags.map((t) => (
              <span
                key={t}
                className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-[12px] font-medium text-[var(--muted)]"
              >
                {t}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-5">
          <Button variant="secondary">View maker profile</Button>
        </div>
      </CardBody>
    </Card>
  );
}
