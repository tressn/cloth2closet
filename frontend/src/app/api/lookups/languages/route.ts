import { NextResponse } from "next/server";
import { LANGUAGES } from "@/lib/lookup/languages";

export async function GET() {
  return NextResponse.json(LANGUAGES);
}