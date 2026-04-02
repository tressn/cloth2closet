import { NextResponse } from "next/server";
import { COUNTRIES } from "@/lib/lookup/countries";

export async function GET() {
  return NextResponse.json(COUNTRIES);
}