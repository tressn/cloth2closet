import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

type FAQItem = {
  question: string;
  answer: React.ReactNode;
};

type FAQSection = {
  title: string;
  description?: string;
  items: FAQItem[];
};

const faqSections: FAQSection[] = [
  {
    title: "Getting started",
    description: "How to begin working with a dressmaker on a custom outfit.",
    items: [
      {
        question: "How do I get started with a custom outfit order?",
        answer: (
          <>
            Browse designers, review their profiles and portfolio, then send a
            request with your idea, timeline, and reference images. Once the
            designer reviews your request, you can continue discussing the
            project through messages and move toward a quote.
          </>
        ),
      },
      {
        question: "Can I message a designer before paying?",
        answer: (
          <>
            Yes. You should use messages to work through important details
            before payment, including your design idea, event date, fabrics,
            fit preferences, delivery timing, and inspiration photos.
          </>
        ),
      },
      {
        question: "What should I include in my first request?",
        answer: (
          <>
            Include the type of outfit you want, occasion, preferred colors,
            target delivery date, any fabric ideas, reference images, and your
            approximate budget. The more detail you provide early, the easier it
            is for the designer to quote accurately.
          </>
        ),
      },
      {
        question: "Can I save designers I like?",
        answer: (
          <>
            Yes. You can save designers so you can compare them later and return
            to the ones that best match your style, budget, and timeline.
          </>
        ),
      },
    ],
  },
  {
    title: "Quotes, deposits, and payments",
    description: "What happens once you are ready to move forward.",
    items: [
      {
        question: "How does the quote process work?",
        answer: (
          <>
            After you send a request, the designer reviews your project details
            and can prepare a quote based on complexity, materials, and timing.
            You should review that quote carefully and message the designer
            about anything that needs clarification before approving it.
          </>
        ),
      },
      {
        question: "How do I pay the deposit?",
        answer: (
          <>
            Once the quote is approved and payment is ready, you will be
            prompted to pay the deposit through the platform. This keeps your
            payment connected to your project, milestones, and order history.
          </>
        ),
      },
      {
        question: "Why do I need to pay through the platform?",
        answer: (
          <>
            Paying through the platform helps keep the project organized and
            makes it easier to track milestones, payment status, and project
            progress in one place.
          </>
        ),
      },
      {
        question: "When do I pay the rest of the balance?",
        answer: (
          <>
            Many projects use milestone payments, such as a deposit and a final
            payment. The remaining balance is usually requested later in the
            project flow based on the milestone setup for that order.
          </>
        ),
      },
      {
        question: "What if I have a payment issue?",
        answer: (
          <>
            Go to the help page and submit a support request with your project
            details and a short explanation of the problem. Include any useful
            screenshots or supporting files if needed.
          </>
        ),
      },
    ],
  },
  {
    title: "Messages, files, and project details",
    description: "How to keep communication clear and avoid misunderstandings.",
    items: [
      {
        question: "Where should I discuss measurements, fabrics, and design details?",
        answer: (
          <>
            Use your project messages for all important decisions. That includes
            measurements, design details, fabrics, color choices, fit, sketch
            expectations, and timeline updates. Keeping it all on-platform
            creates a clear shared record.
          </>
        ),
      },
      {
        question: "Can I send photos or reference images?",
        answer: (
          <>
            Yes. You can share reference images and project files to help the
            designer understand your vision, styling references, and specific
            construction details.
          </>
        ),
      },
      {
        question: "What if I forgot an important detail in my request?",
        answer: (
          <>
            Send it in messages as soon as possible. It is always better to
            clarify early. If the new detail changes the scope, price, or
            timeline, the designer may need to update the quote or expectations.
          </>
        ),
      },
      {
        question: "Should I keep all project communication on the platform?",
        answer: (
          <>
            Yes. That helps protect both sides by keeping project decisions,
            shared files, and important messages in one place.
          </>
        ),
      },
    ],
  },
  {
    title: "Measurements, sketches, and approvals",
    description: "Things you may need to review before work continues.",
    items: [
      {
        question: "Will I need to provide measurements?",
        answer: (
          <>
            Usually yes. Your designer may request measurements needed for your
            garment. Make sure they are accurate and updated, since incorrect
            measurements can affect fit and final results.
          </>
        ),
      },
      {
        question: "What happens if the designer submits a sketch?",
        answer: (
          <>
            If your project includes a sketch step, you should review the sketch
            carefully and confirm it matches your expectations before approving
            it. This is the best time to catch misunderstandings before more
            work is done.
          </>
        ),
      },
      {
        question: "What should I check before approving a sketch?",
        answer: (
          <>
            Double-check the silhouette, neckline, sleeves, color direction,
            proportions, and custom details you asked for. If anything looks
            unclear or incomplete, message the designer before approving.
          </>
        ),
      },
      {
        question: "Can I update my measurements later?",
        answer: (
          <>
            Possibly, but only if the project has not progressed too far. If you
            need to change measurements, contact the designer immediately
            through messages so they can tell you whether any timeline or scope
            changes are needed.
          </>
        ),
      },
    ],
  },
  {
    title: "Shipping, completion, and reviews",
    description: "What to expect near the end of the project.",
    items: [
      {
        question: "How will I know when my item has shipped?",
        answer: (
          <>
            Shipping details and tracking information should appear as part of
            the project flow once they are added. Check your project updates and
            notifications for the latest status.
          </>
        ),
      },
      {
        question: "What should I do if my order is delayed?",
        answer: (
          <>
            Message the designer first to confirm the status and next expected
            date. If you still need help, use the help page and include the
            project details in your request.
          </>
        ),
      },
      {
        question: "How do I leave a review?",
        answer: (
          <>
            After the project is completed, you can leave a review through the
            project flow. Reviews help future customers understand quality,
            communication, and the overall experience.
          </>
        ),
      },
      {
        question: "Can I upload photos with my review?",
        answer: (
          <>
            Yes. If review photo uploads are enabled in the flow, you can add
            photos alongside your rating and written feedback.
          </>
        ),
      },
    ],
  },
  {
    title: "Problems and support",
    description: "What to do when you need extra help.",
    items: [
      {
        question: "What should I do if a designer stops responding?",
        answer: (
          <>
            Start by sending a follow-up in messages. If the issue affects your
            order and you still do not get a response, contact support through
            the help page so the team can review it.
          </>
        ),
      },
      {
        question: "Where do I ask for help with account or role issues?",
        answer: (
          <>
            Use the help page for account issues, technical problems, payment
            questions, disputes, or anything else that needs support review.
          </>
        ),
      },
      {
        question: "What should I include in a support request?",
        answer: (
          <>
            Include your project title or code if you have it, the designer’s
            name, a short summary of the issue, what you have already tried, and
            any screenshots or files that help explain the problem.
          </>
        ),
      },
    ],
  },
];

function FAQAccordionItem({
  question,
  answer,
}: {
  question: string;
  answer: React.ReactNode;
}) {
  return (
    <details className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4 open:bg-white">
      <summary>
        <span className="text-[15px] font-medium leading-6 text-[var(--text)] sm:text-[16px]">
          {question}
        </span>
      </summary>

      <div className="pt-3 pr-8 text-[14px] leading-7 text-[var(--muted)]">
        {answer}
      </div>
    </details>
  );
}

export default function FAQPage() {
  return (
    <main className="py-10 sm:py-14">
      <Container>
        <div className="mx-auto w-full max-w-4xl px-1 sm:px-0">
          <div className="mb-8 text-center sm:mb-10">
            <h1 className="text-[30px] font-semibold tracking-tight text-[var(--text)] sm:text-[36px]">
              Frequently asked questions
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-[15px] leading-6 text-[var(--muted)]">
              Answers about messaging designers, approving quotes, paying
              deposits, sharing project details, shipping, reviews, and getting
              support.
            </p>
          </div>

          <div className="space-y-6">
            {faqSections.map((section) => (
              <Card key={section.title}>
                <CardHeader
                  title={section.title}
                  subtitle={section.description}
                />
                <CardBody>
                  <div className="space-y-3">
                    {section.items.map((item) => (
                      <FAQAccordionItem
                        key={item.question}
                        question={item.question}
                        answer={item.answer}
                      />
                    ))}
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>

        </div>
      </Container>
    </main>
  );
}