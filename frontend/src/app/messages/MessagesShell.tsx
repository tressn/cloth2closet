import React from "react";

export default function MessagesShell({
  list,
  detail,
}: {
  list: React.ReactNode;
  detail: React.ReactNode;
}) {
  return (
    <div className="h-full grid gap-4 lg:grid-cols-[360px_1fr] overflow-hidden">
      {/* Left inbox — scrolls its own content */}
      <div className="min-w-0 overflow-y-auto overflow-x-hidden">
        {list}
      </div>
      {/* Right conversation — fills height, children manage their own scroll */}
      <div className="min-w-0 h-full overflow-hidden flex flex-col">
        {detail}
      </div>
    </div>
  );
}