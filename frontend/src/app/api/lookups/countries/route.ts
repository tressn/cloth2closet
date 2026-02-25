import { NextResponse } from "next/server";
import { COUNTRIES } from "@/lib/lookups/countries";

export async function GET() {
  return NextResponse.json(COUNTRIES);
}