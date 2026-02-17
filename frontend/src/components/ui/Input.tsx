import React from "react";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        "h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[15px] text-[var(--text)]",
        "placeholder:text-[var(--muted-2)]",
        "focus-visible:ring-2 focus-visible:ring-[var(--plum-500)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]",
        props.className ?? "",
      ].join(" ")}
    />
  );
}
