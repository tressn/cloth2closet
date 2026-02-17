import React from "react";

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={[
        "min-h-24 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-[15px] text-[var(--text)]",
        "placeholder:text-[var(--muted-2)]",
        "focus-visible:ring-2 focus-visible:ring-[var(--plum-500)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]",
        props.className ?? "",
      ].join(" ")}
    />
  );
}
