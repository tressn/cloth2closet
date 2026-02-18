import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import Stripe from "stripe"

export const runtime = "nodejs"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const url = new URL(req.url)
  const projectId = url.searchParams.get("projectId")
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 })

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { payment: true },
  })

  if (!project || project.customerId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if (!project.payment || project.payment.status !== "REQUIRES_PAYMENT_METHOD") {
    return NextResponse.json({ error: "Payment not ready" }, { status: 400 })
  }

  const appUrl = process.env.APP_URL || "http://localhost:3000"

  const checkout = await stripe.checkout.sessions.create({
    mode: "payment",
    success_url: `${appUrl}/payments/success?projectId=${projectId}`,
    cancel_url: `${appUrl}/payments/cancel?projectId=${projectId}`,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: project.payment.currency.toLowerCase(),
          unit_amount: project.payment.totalAmount,
          product_data: {
          name: `Deposit for ${project.title ?? `Project ${project.projectCode}`}`,
        },
        },
      },
    ],
    metadata: {
      projectId,
      paymentId: project.payment.id,
    },
  })

  await prisma.payment.update({
    where: { id: project.payment.id },
    data: {
      stripeCheckoutSessionId: checkout.id,
      status: "PROCESSING",
    },
  })

  return NextResponse.redirect(checkout.url!, { status: 303 })
}
