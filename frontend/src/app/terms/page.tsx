import { Container } from "@/components/ui/Container";

export default function TermsPage() {
  return (
    <div className="bg-[var(--bg)] py-16">
      <Container>
        <div className="mx-auto max-w-2xl space-y-10 text-[15px] leading-7 text-[var(--muted)]">

          <div>
            <h1 className="text-[28px] font-semibold text-[var(--text)]">
              Terms of Service
            </h1>
            <p className="mt-2 text-[14px]">
              Last updated: April 2026 · Version 1.0
            </p>
          </div>

          <Section title="1. About Cloth2Closet">
            Cloth2Closet ("we", "us", "the platform") is a marketplace connecting
            customers with independent dressmakers and fashion designers. We facilitate
            transactions but are not a party to the contract between customers and
            dressmakers.
          </Section>

          <Section title="2. Accounts">
            You must be 18 or older to create an account. You are responsible for
            keeping your login credentials secure. You may not create accounts for
            others or use the platform on behalf of a third party without their consent.
          </Section>

          <Section title="3. Dressmaker obligations">
            Dressmakers must accurately represent their skills, experience, and portfolio.
            Dressmakers agree to fulfil accepted orders to the standard described in the
            project brief. Dressmakers must not accept projects they cannot complete within
            the agreed timeline. Dressmakers acknowledge that Cloth2Closet may withhold
            payouts during dispute resolution windows.
          </Section>

          <Section title="4. Customer obligations">
            Customers must provide accurate measurements, reference materials, and
            communication in good faith. Customers are responsible for reviewing quotes
            before payment. Customers must confirm receipt and completion of orders
            promptly.
          </Section>

          <Section title="5. Payments and deposits">
            <strong className="text-[var(--text)]">Deposits are non-refundable</strong>{" "}
            once a project has been accepted and work has commenced. This reflects the
            dressmaker's time, sourcing costs, and reservation of capacity. Final
            payments are held by Cloth2Closet until the customer approves the completed
            work. Disputed payments are subject to our dispute resolution process before
            any payout or refund is issued.
          </Section>

          <Section title="6. Refunds and disputes">
            Customers may raise a dispute within 7 days of the final payment being
            settled. Cloth2Closet will review evidence from both parties and make a
            binding decision. Refunds on final payments may be issued at our discretion
            in cases of significant departure from the agreed brief. We are not liable
            for disputes arising from unclear or incomplete project briefs.
          </Section>

          <Section title="7. Cancellations">
            Customers may cancel a project before the deposit is paid with no charge.
            After the deposit is paid, cancellation forfeits the deposit. After the
            final payment is paid, cancellation is not available and the dispute process
            applies. Dressmakers who cancel an accepted project without good cause may
            have their account reviewed.
          </Section>

          <Section title="8. Platform fees">
            Cloth2Closet charges a platform fee on each transaction. This fee is
            deducted from the dressmaker's payout. The current fee is disclosed at the
            time of payout and may change with 30 days notice.
          </Section>

          <Section title="9. Prohibited conduct">
            You may not use the platform to circumvent fees by taking transactions
            off-platform, harass or abuse other users, upload content you do not own
            or have rights to, or misrepresent your identity or work.
          </Section>

          <Section title="10. Intellectual property">
            Customers retain ownership of designs they commission. Dressmakers may
            display completed work in their portfolio unless the customer requests
            otherwise in writing before the project begins.
          </Section>

          <Section title="11. Privacy">
            Customer shipping addresses are shared with dressmakers only at the point
            of shipment to fulfil orders. We do not sell personal data to third parties.
            For full details see our Privacy Policy.
          </Section>

          <Section title="12. Limitation of liability">
            Cloth2Closet is a marketplace platform and is not responsible for the
            quality of work produced by dressmakers, shipping delays, or losses arising
            from disputes between users. Our total liability is limited to the value of
            the transaction in question.
          </Section>

          <Section title="13. Changes to these terms">
            We may update these terms at any time. Material changes will be notified
            by email and users will be asked to re-agree before their next transaction.
          </Section>

          <Section title="14. Governing law">
            These terms are governed by the laws of the jurisdiction in which
            Cloth2Closet is registered. Disputes will be resolved in the courts of
            that jurisdiction.
          </Section>

          <div className="border-t border-[var(--border)] pt-6 text-[13px]">
            Questions? Contact us through the{" "}
            <a href="/support" className="underline text-[var(--plum-600)]">
              support page
            </a>
            .
          </div>
        </div>
      </Container>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-[17px] font-semibold text-[var(--text)]">{title}</h2>
      <p className="mt-2">{children}</p>
    </div>
  );
}