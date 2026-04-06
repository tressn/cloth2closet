"use client";

import { useRef } from "react";
import AutoScrollToBottom from "./AutoScrollToBottom";

export default function MessagesViewport({
  children,
}: {
  children: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  return (
    <div
      ref={containerRef}
      className="max-h-[calc(100vh-320px)] overflow-auto pr-1"
    >
      <div className="space-y-3">{children}</div>
      <AutoScrollToBottom containerRef={containerRef} />
    </div>
  );
}