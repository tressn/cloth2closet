import { NextResponse } from "next/server";
import { TIMEZONES } from "@/lib/lookup/timezones";

export async function GET() {
  return NextResponse.json(TIMEZONES);
}