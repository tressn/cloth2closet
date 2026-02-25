import { NextResponse } from "next/server";
import { getSubdivisions } from "@/lib/lookup/subdivisions";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const country = (searchParams.get("country") ?? "").toUpperCase();
  return NextResponse.json(getSubdivisions(country));
}