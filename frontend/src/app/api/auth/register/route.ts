import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const role = body.role; // "CUSTOMER" | "DRESSMAKER"
    const email = (body.email ?? "").toLowerCase().trim();
    const username = (body.username ?? "").trim();
    const password = body.password ?? "";

    if (role !== "CUSTOMER" && role !== "DRESSMAKER") {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }

    if (!email || !isEmail(email)) {
      return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
    }

    if (!password || password.length < 10) {
      return NextResponse.json({ error: "Password must be at least 10 characters." }, { status: 400 });
    }

    // Customer requires username
    if (role === "CUSTOMER") {
      if (!username || username.length < 3) {
        return NextResponse.json({ error: "Username is required (min 3 chars)." }, { status: 400 });
      }
    }

    // Dressmaker required fields
    const displayName = (body.displayName ?? "").trim();
    const location = (body.location ?? "").trim();
    const minimumBudget = body.minimumBudget; // number in dollars (UI) -> convert to cents
    const instagram = (body.instagram ?? "").trim();
    const tiktok = (body.tiktok ?? "").trim();

    if (role === "DRESSMAKER") {
      if (!displayName) return NextResponse.json({ error: "Display name is required." }, { status: 400 });
      if (!location) return NextResponse.json({ error: "Location is required." }, { status: 400 });
      if (typeof minimumBudget !== "number" || minimumBudget <= 0) {
        return NextResponse.json({ error: "Minimum budget must be a positive number." }, { status: 400 });
      }
      if (!instagram && !tiktok) {
        return NextResponse.json({ error: "Instagram or TikTok is required." }, { status: 400 });
      }
    }

    // Uniqueness checks
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) return NextResponse.json({ error: "Email already in use." }, { status: 409 });

    if (username) {
      const existingUsername = await prisma.user.findUnique({ where: { username } });
      if (existingUsername) return NextResponse.json({ error: "Username already in use." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Create user + profile
    if (role === "CUSTOMER") {
      await prisma.user.create({
        data: {
          email,
          username,
          passwordHash,
          role: "CUSTOMER",
          customerProfile: { create: { fullName: null } },
        },
      });
    } else {
      await prisma.user.create({
        data: {
          email,
          username: username || null,
          passwordHash,
          role: "DRESSMAKER",
          dressmakerProfile: {
            create: {
              displayName,
              location,
              minimumBudgetCents: Math.round(minimumBudget * 100),
              socialLinks: { instagram: instagram || null, tiktok: tiktok || null },
              approvalStatus: "PENDING",
              isPublished: false,
            },
          },
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
}
