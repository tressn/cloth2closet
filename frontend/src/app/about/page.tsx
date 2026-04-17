import { Container } from "@/components/ui/Container";

export const metadata = {
  title: "About · Cloth2Closet",
  description:
    "Cloth2Closet is a marketplace connecting customers with skilled dressmakers for custom-made outfits — from first sketch to final stitch.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* ───── Hero ───── */}
      <header className="relative overflow-hidden border-b border-[var(--border)] bg-[var(--surface)]">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, currentColor 0px, currentColor 1px, transparent 1px, transparent 12px)",
          }}
        />
        <Container>
          <div className="relative py-20 text-center sm:py-28">
            <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              About us
            </p>
            <h1 className="mx-auto mt-4 max-w-2xl text-[clamp(1.75rem,4vw,2.75rem)] font-bold leading-[1.15] tracking-tight text-[var(--text)]">
              Fashion: made&nbsp;personal
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-[var(--text-md)] leading-[var(--lh-md)] text-[var(--muted)]">
              Cloth2Closet is the marketplace that connects you with talented
              dressmakers, so every outfit is designed, fitted, and crafted
              just&nbsp;for&nbsp;you.
            </p>
          </div>
        </Container>
      </header>

      <main>
        {/* ───── Mission ───── */}
        <section className="border-b border-[var(--border)] py-16 sm:py-20">
          <Container>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-[var(--text-2xl)] font-semibold leading-[var(--lh-2xl)] text-[var(--text)]">
                Why we exist
              </h2>
              <p className="mt-4 text-[15px] leading-7 text-[var(--muted)]">
                Finding a skilled dressmaker used to mean word-of-mouth referrals and
                crossed fingers. We built Cloth2Closet to change that — a single
                place where customers can browse verified dressmakers, request
                custom pieces, and manage the entire process from first
                conversation to final fitting. No guesswork, no loose threads.
              </p>
            </div>
          </Container>
        </section>

        {/* ───── How it works ───── */}
        <section className="border-b border-[var(--border)] bg-[var(--surface)] py-16 sm:py-20">
          <Container>
            <h2 className="text-center text-[var(--text-2xl)] font-semibold leading-[var(--lh-2xl)] text-[var(--text)]">
              How it works
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-center text-[14px] leading-6 text-[var(--muted)]">
              End-to-end, from inspiration to your closet.
            </p>

            <div className="mx-auto mt-12 grid max-w-3xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  step: "01",
                  title: "Discover",
                  body: "Browse dressmaker profiles, portfolios, and verified reviews to find the perfect match for your style.",
                },
                {
                  step: "02",
                  title: "Request",
                  body: "Share your vision — reference images, measurements, fabric preferences, and budget — in one simple brief.",
                },
                {
                  step: "03",
                  title: "Collaborate",
                  body: "Chat directly with your dressmaker, approve sketches, and track progress through every milestone.",
                },
                {
                  step: "04",
                  title: "Receive",
                  body: "Pay securely through the platform, get your outfit shipped, and leave a verified review.",
                },
              ].map((item) => (
                <div key={item.step} className="flex flex-col">
                  <span className="text-[28px] font-bold leading-none tracking-tight text-[var(--border)]">
                    {item.step}
                  </span>
                  <h3 className="mt-3 text-[15px] font-semibold text-[var(--text)]">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-[13px] leading-5 text-[var(--muted)]">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* ───── Features grid ───── */}
        <section className="border-b border-[var(--border)] py-16 sm:py-20">
          <Container>
            <h2 className="text-center text-[var(--text-2xl)] font-semibold leading-[var(--lh-2xl)] text-[var(--text)]">
              Built for trust &amp; transparency
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-center text-[14px] leading-6 text-[var(--muted)]">
              Everything you need for a smooth custom-fashion experience.
            </p>

            <div className="mx-auto mt-12 grid max-w-4xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: "🔒",
                  title: "Secure payments",
                  body: "Funds are held safely and released to the dressmaker only when each milestone is completed.",
                },
                {
                  icon: "💬",
                  title: "Built-in messaging",
                  body: "Chat, share photos, and stay aligned with your dressmaker without leaving the platform.",
                },
                {
                  icon: "✏️",
                  title: "Sketch approvals",
                  body: "Review and approve design sketches before any fabric is cut.",
                },
                {
                  icon: "📦",
                  title: "Shipping tracking",
                  body: "Get carrier details and tracking numbers as soon as your outfit ships.",
                },
                {
                  icon: "⭐",
                  title: "Verified reviews",
                  body: "Only customers who completed a project can leave reviews — so every rating is real.",
                },
                {
                  icon: "📐",
                  title: "Measurement profiles",
                  body: "Save your measurements once and share them instantly with any dressmaker.",
                },
              ].map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-5"
                >
                  <span className="text-[24px]">{feature.icon}</span>
                  <h3 className="mt-3 text-[14px] font-semibold text-[var(--text)]">
                    {feature.title}
                  </h3>
                  <p className="mt-1.5 text-[13px] leading-5 text-[var(--muted)]">
                    {feature.body}
                  </p>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* ───── For dressmakers ───── */}
        <section className="border-b border-[var(--border)] bg-[var(--surface)] py-16 sm:py-20">
          <Container>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-[var(--text-2xl)] font-semibold leading-[var(--lh-2xl)] text-[var(--text)]">
                For dressmakers
              </h2>
              <p className="mt-4 text-[15px] leading-7 text-[var(--muted)]">
                Cloth2Closet gives independent dressmakers a professional
                storefront, a steady pipeline of clients, and tools to manage
                projects from quote to delivery. Build your portfolio, set your
                own prices, and grow your business — we handle payments,
                messaging, and milestone tracking so you can focus on what you do
                best: creating beautiful garments.
              </p>

            </div>
          </Container>
        </section>
      </main>
    </div>
  );
}