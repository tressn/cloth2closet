import { Container } from "@/components/ui/Container";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import SupportForm from "./support-form";

export default function SupportPage() {
  return (
    <main className="py-6 sm:py-10 md:py-14">
      <Container>
        <div className="mx-auto w-full max-w-3xl">
          <div className="mb-5 sm:mb-8 text-center px-2">
            <h1 className="text-[22px] font-semibold tracking-tight text-[var(--text)] sm:text-[32px]">
              Contact support
            </h1>
            <p className="mt-2 text-[14px] leading-6 text-[var(--muted)] sm:text-[15px]">
              Need help with your account, payments, or a project? Send a message and we'll follow up.
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