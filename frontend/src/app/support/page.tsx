import { Container } from "@/components/ui/Container";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import SupportForm from "./support-form";

export default function SupportPage() {
  return (
    <main className="py-10 sm:py-14">
      <Container>
        <div className="mx-auto w-full max-w-3xl px-1 sm:px-0">
          <div className="mb-6 sm:mb-8 text-center">
            <h1 className="text-[28px] font-semibold tracking-tight text-[var(--text)] sm:text-[32px]">
              Contact support
            </h1>
            <p className="mt-2 text-[15px] leading-6 text-[var(--muted)]">
              Need help with your account, payments, or a project? Send a message and we’ll follow up.
            </p>
          </div>

          <Card>
            <CardHeader title="Support request" subtitle="We usually reply within 1–2 business days." />
            <CardBody>
              <SupportForm />
            </CardBody>
          </Card>
        </div>
      </Container>
    </main>
  );
}