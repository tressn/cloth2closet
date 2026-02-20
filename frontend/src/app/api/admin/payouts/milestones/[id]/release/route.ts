import { NextResponse } from "next/server";
import { requireRole } from "@/lib/requiredRole";
import { releaseMilestonePayoutOrThrow } from "@/lib/payouts";

export const runtime = "nodejs";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  await requireRole(["ADMIN"]);

  try {
    const result = await releaseMilestonePayoutOrThrow({
      milestoneId: params.id,
      idempotencyKey: `admin:milestone:${params.id}:release`,
    });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Release failed" }, { status: 400 });
  }
}