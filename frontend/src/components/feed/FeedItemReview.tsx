import React from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export function FeedItemReview({
  rating,
  quote,
  reviewer,
  region,
  itemTitle,
}: {
  rating: number;
  quote: string;
  reviewer: string;
  region: string;
  itemTitle: string;
}) {
  const stars = "★★★★★☆☆☆☆☆".slice(5 - rating, 10 - rating);

  return (
    <Card>
      <CardBody>
        <div className="flex items-center justify-between gap-4">
          <div className="text-[14px] font-semibold text-[var(--text)]">
            Recent review
          </div>
          <Badge tone="success">{rating}/5</Badge>
        </div>

        <div className="mt-3 text-[18px] leading-8 text-[var(--text)]">
          <span className="text-[var(--plum-700)]">{stars} </span>
          <span className="font-medium">“{quote}”</span>
        </div>

        <div className="mt-4 text-[14px] leading-6 text-[var(--muted)]">
          <span className="font-semibold text-[var(--text)]">{reviewer}</span>{" "}
          in {region} · reviewing{" "}
          <span className="font-semibold text-[var(--text)]">{itemTitle}</span>
        </div>
      </CardBody>
    </Card>
  );
}
