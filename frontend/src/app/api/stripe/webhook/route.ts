import { NextResponse } from "next/server"
import Stripe from "stripe"
import { prisma } from "@/lib/prisma"
import { PaymentStatus, ProjectStatus } from "@prisma/client"

export const runtime = "nodejs" // Stripe library needs Node runtime

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature")
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 })
  }

  let event: Stripe.Event
  const rawBody = await req.text()

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook signature verification failed: ${err.message}` }, { status: 400 })
  }

  try {
    switch (event.type) {
      // ✅ Most common for Checkout
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session

        // You stored stripeCheckoutSessionId in Payment
        const stripeSessionId = session.id
        const paymentIntentId =
          typeof session.payment_intent === "string" ? session.payment_intent : null

        // Find Payment row
        const payment = await prisma.payment.findFirst({
          where: { stripeCheckoutSessionId: stripeSessionId },
        })

        if (!payment) break

        // Mark payment as SUCCEEDED
        const updatedPayment = await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.SUCCEEDED,
            stripePaymentIntentId: paymentIntentId ?? payment.stripePaymentIntentId,
          },
        })

        // Move project forward (optional but recommended)
        await prisma.project.update({
          where: { id: updatedPayment.projectId },
          data: { status: ProjectStatus.IN_PROGRESS },
        })

        const proj = await prisma.project.findUnique({
          where: { id: updatedPayment.projectId },
          select: { id: true, dressmakerId: true, title: true, projectCode: true },
        });

        if (proj) {
          await prisma.notification.create({
            data: {
              userId: proj.dressmakerId,
              type: "PAYMENT_SUCCEEDED",
              title: "Deposit received",
              body: proj.title ?? proj.projectCode,
              href: `/dashboard/dressmaker/projects/${proj.id}`,
              projectId: proj.id,
            },
          });
        }


        break
      }

      // Optional: if session expires/cancels
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session
        const payment = await prisma.payment.findFirst({
          where: { stripeCheckoutSessionId: session.id },
        })
        if (!payment) break

        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.CANCELED },
        })
        break
      }

      // Optional: handle direct PaymentIntent success (sometimes useful)
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent

        // If you ever store stripePaymentIntentId earlier, you can match on it.
        const payment = await prisma.payment.findFirst({
          where: { stripePaymentIntentId: pi.id },
        })
        if (!payment) break

        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.SUCCEEDED },
        })

        await prisma.project.update({
          where: { id: payment.projectId },
          data: { status: ProjectStatus.IN_PROGRESS },
        })

        break
      }

      default:
        // Ignore other events
        break
    }
  } catch (err: any) {
    // If your handler fails, Stripe will retry
    return NextResponse.json({ error: `Webhook handler failed: ${err.message}` }, { status: 500 })
  }

  // Stripe expects a 2xx response
  return NextResponse.json({ received: true })
}
