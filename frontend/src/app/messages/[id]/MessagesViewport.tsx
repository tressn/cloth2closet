"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

export default function MessagesViewport({
  children,
}: {
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function scrollToBottom(behavior: ScrollBehavior = "auto") {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }

  useLayoutEffect(() => {
    const id = requestAnimationFrame(() => scrollToBottom("auto"));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const onSent = () => requestAnimationFrame(() => scrollToBottom("smooth"));
    window.addEventListener("c2c:message-sent", onSent);
    return () => window.removeEventListener("c2c:message-sent", onSent);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const imgs = Array.from(el.querySelectorAll("img"));
    const onLoad = () => scrollToBottom("auto");
    imgs.forEach((img) => {
      if (!img.complete) img.addEventListener("load", onLoad);
    });
    return () => imgs.forEach((img) => img.removeEventListener("load", onLoad));
  }, [children]);

  return (
    <div ref={ref} className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
      <div className="space-y-4">{children}</div>
    </div>
  );
}