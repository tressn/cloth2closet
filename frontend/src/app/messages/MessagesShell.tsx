import React from "react";

export default function MessagesShell({
  list,
  detail,
}: {
  list: React.ReactNode;
  detail: React.ReactNode;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      {/* Left list */}
      <div className="min-w-0 lg:sticky lg:top-20 lg:h-[calc(100vh-120px)] lg:overflow-y-auto lg:overflow-x-hidden">
        {list}
      </div>

      {/* Right panel */}
      <div className="min-w-0 min-h-[300px] lg:h-[calc(100vh-120px)] lg:overflow-hidden">
        {detail}
      </div>
    </div>
  );
}