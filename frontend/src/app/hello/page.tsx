import { Container } from "@/components/ui/Container";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

export default function Hello() {
  return (
    <div className="bg-[var(--bg)]">
      <Container>
        <main className="py-10">
          <div className="max-w-xl">
            <Card>
              <CardHeader title="Hello" subtitle="This route works — and now matches your UI system." />
              <CardBody>
                <div className="text-[14px] leading-6 text-[var(--muted)]">
                  You can delete this page later; it’s useful while wiring deployments.
                </div>
              </CardBody>
            </Card>
          </div>
        </main>
      </Container>
    </div>
  );
}
