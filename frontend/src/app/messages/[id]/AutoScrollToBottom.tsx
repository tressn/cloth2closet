"use client";

import { useEffect, useRef } from "react";

export default function AutoScrollToBottom() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const scroll = () => {
      ref.current?.scrollIntoView({ block: "end", behavior: "smooth" });
    };

    scroll();

    const handler = () => scroll();
    window.addEventListener("c2c:message-sent", handler);

    return () => window.removeEventListener("c2c:message-sent", handler);
  }, []);

  return <div ref={ref} />;
}