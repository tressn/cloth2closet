export default function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[var(--bg)] overflow-hidden" style={{ height: "calc(100vh - 64px)" }}>
      <div className="h-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 overflow-hidden">
        {children}
      </div>
    </div>
  );
}