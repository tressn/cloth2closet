export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[var(--bg)]">
      <main className="mx-auto w-full max-w-[1600px] px-4 py-10 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}