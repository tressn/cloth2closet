import React from "react";

export default function MessagesShell({
  list,
  detail,
  hasActiveConversation = false,
}: {
  list: React.ReactNode;
  detail: React.ReactNode;
  hasActiveConversation?: boolean;
}) {
  return (
    <div className="h-full grid gap-4 lg:grid-cols-[360px_1fr] overflow-hidden">
      {/* Left inbox — hidden on mobile when viewing a conversation */}
      <div
        className={[
          "min-w-0 overflow-y-auto overflow-x-hidden",
          hasActiveConversation ? "hidden lg:block" : "",
        ].join(" ")}
      >
        {list}
      </div>
      {/* Right conversation — hidden on mobile when no conversation selected */}
      <div
        className={[
          "min-w-0 h-full overflow-hidden flex flex-col",
          hasActiveConversation ? "" : "hidden lg:flex",
        ].join(" ")}
      >
        {detail}
      </div>
    </div>
  );
}