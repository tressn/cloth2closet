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
      <div className="lg:sticky lg:top-20 lg:h-[calc(100vh-120px)] lg:overflow-auto">
        {list}
      </div>

      {/* Right panel */}
      <div className="min-h-[300px] lg:h-[calc(100vh-120px)] lg:overflow-auto">
        {detail}
      </div>
    </div>
  );
}
