"use client";

import { RefObject, useEffect, useLayoutEffect } from "react";

type Props = {
  containerRef?: RefObject<HTMLElement | null>;
};

export default function AutoScrollToBottom({ containerRef }: Props) {
  function scrollToBottom(behavior: ScrollBehavior = "auto") {
    const el = containerRef?.current;
    if (!el) return;

    el.scrollTo({
      top: el.scrollHeight,
      behavior,
    });
  }

  useLayoutEffect(() => {
    const id1 = requestAnimationFrame(() => {
      const id2 = requestAnimationFrame(() => {
        scrollToBottom("auto");
      });
      return () => cancelAnimationFrame(id2);
    });

    return () => cancelAnimationFrame(id1);
  }, []);

  useEffect(() => {
    const onSent = () => {
      requestAnimationFrame(() => scrollToBottom("smooth"));
    };

    window.addEventListener("c2c:message-sent", onSent);
    return () => window.removeEventListener("c2c:message-sent", onSent);
  }, []);

  return null;
}