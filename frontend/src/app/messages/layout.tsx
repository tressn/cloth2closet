import { Container } from "@/components/ui/Container";

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[var(--bg)]">
      <Container>
        <main className="py-10">{children}</main>
      </Container>
    </div>
  );
}
