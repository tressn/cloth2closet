"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

export default function MessagesViewport({
  children,
}: {
  children: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  function scrollToBottom(behavior: ScrollBehavior = "auto") {
    const el = containerRef.current;
    if (!el) return;

    el.scrollTo({
      top: el.scrollHeight,
      behavior,
    });
  }

  useLayoutEffect(() => {
    const id = requestAnimationFrame(() => {
      scrollToBottom("auto");
    });

    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const onSent = () => {
      requestAnimationFrame(() => scrollToBottom("smooth"));
    };

    window.addEventListener("c2c:message-sent", onSent);
    return () => window.removeEventListener("c2c:message-sent", onSent);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const images = Array.from(el.querySelectorAll("img"));
    if (!images.length) return;

    const handleLoad = () => scrollToBottom("auto");

    images.forEach((img) => {
      if (!img.complete) {
        img.addEventListener("load", handleLoad);
      }
    });

    return () => {
      images.forEach((img) => {
        img.removeEventListener("load", handleLoad);
      });
    };
  }, [children]);

  return (
    <div
      ref={containerRef}
      className="flex-1 min-h-0 overflow-y-auto pr-1"
    >
      <div className="space-y-3">{children}</div>
    </div>
  );
}