import React from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export function FeedItemUpload({
  makerName,
  makerMeta,
  title,
  price,
  imageUrl,
  isFeatured,
}: {
  makerName: string;
  makerMeta: string;
  title: string;
  price: string;
  imageUrl?: string;
  isFeatured?: boolean;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-4 px-6 py-5">
        <Avatar name={makerName} subtitle={makerMeta} />
        {isFeatured ? <Badge tone="featured">Featured</Badge> : null}
      </div>

      <div className="aspect-[16/9] w-full bg-[var(--surface-2)]">
        {/* Replace with next/image in your codebase if desired */}
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={title} className="h-full w-full object-cover" />
        ) : null}
      </div>

      <CardBody>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[18px] font-semibold leading-7 text-[var(--text)]">
              {title}
            </div>
            <div className="mt-1 text-[14px] leading-5 text-[var(--muted)]">
              New upload from {makerName}
            </div>
          </div>
          <div className="text-[16px] font-semibold text-[var(--text)]">
            {price}
          </div>
        </div>

        <div className="mt-5 flex gap-3">
          <Button variant="primary">View details</Button>
          <Button variant="secondary">Save</Button>
        </div>
      </CardBody>
    </Card>
  );
}
