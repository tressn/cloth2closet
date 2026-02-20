import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MilestoneStatus } from "@prisma/client";
import { releaseMilestonePayoutOrThrow } from "@/lib/payouts";

export const runtime = "nodejs";

// Simple shared secret so random people can’t trigger payouts
function requireCronAuth(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new Error("Missing CRON_SECRET");
  const header = req.headers.get("x-cron-secret");
  if (header !== secret) throw new Error("Unauthorized");
}

export async function POST(req: Request) {
  try {
    requireCronAuth(req);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 });
  }

  const now = new Date();

  // Find milestones that are paid, eligible, but not released
  const due = await prisma.milestone.findMany({
    where: {
      status: MilestoneStatus.PAID,
      payoutEligibleAt: { lte: now },
      releasedAt: null,
    },
    select: { id: true }, // ✅ only need id now
    take: 50, // safety batch
  });

  let released = 0;
  const errors: Array<{ milestoneId: string; error: string }> = [];

  for (const m of due) {
    try {
      await releaseMilestonePayoutOrThrow({
        milestoneId: m.id,
        idempotencyKey: `milestone:${m.id}:release`,
      });
      released += 1;
    } catch (e: any) {
      errors.push({ milestoneId: m.id, error: e?.message ?? "Failed" });
    }
  }

  return NextResponse.json({ ok: true, scanned: due.length, released, errors });
}