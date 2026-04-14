import { NextResponse } from "next/server";
import { requireRole } from "@/lib/requiredRole";
import { releaseMilestonePayoutOrThrow } from "@/lib/payouts";

export const runtime = "nodejs";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireRole(["ADMIN"]);
  const { id } = await params;
  try {
    const result = await releaseMilestonePayoutOrThrow({
      milestoneId: id,
      idempotencyKey: `admin:milestone:${id}:release`,
    });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Release failed" }, { status: 400 });
  }
}