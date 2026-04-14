import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { COUNTRY_SET } from "@/lib/lookup/countries";

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const role = body.role;
    const email = (body.email ?? "").toLowerCase().trim();
    const username = (body.username ?? "").trim();
    const password = body.password ?? "";

    const fullName = (body.fullName ?? body.name ?? "").trim();
    const displayName = (body.displayName ?? "").trim();

    if (role !== "CUSTOMER" && role !== "DRESSMAKER") {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }

    if (!email || !isEmail(email)) {
      return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
    }

    if (!password || password.length < 10) {
      return NextResponse.json({ error: "Password must be at least 10 characters." }, { status: 400 });
    }

    if (role === "CUSTOMER") {
      if (!username || username.length < 3) {
        return NextResponse.json({ error: "Username is required (min 3 chars)." }, { status: 400 });
      }

      if (!fullName) {
        return NextResponse.json({ error: "Full name is required." }, { status: 400 });
      }
    }

    const countryCode = (body.countryCode ?? "").toUpperCase().trim();
    if (countryCode && !COUNTRY_SET.has(countryCode)) {
      return NextResponse.json({ error: "Invalid country." }, { status: 400 });
    }

    const minimumBudget = body.minimumBudget;
    const instagram = (body.instagramHandle ?? body.instagram ?? "").trim();
    const tiktok = (body.tiktokHandle ?? body.tiktok ?? "").trim();

    if (role === "DRESSMAKER") {
      if (!displayName) {
        return NextResponse.json({ error: "Display name is required." }, { status: 400 });
      }

      if (!countryCode) {
        return NextResponse.json({ error: "Country is required." }, { status: 400 });
      }

      if (typeof minimumBudget !== "number" || minimumBudget <= 0) {
        return NextResponse.json({ error: "Minimum budget must be a positive number." }, { status: 400 });
      }

      if (!instagram && !tiktok) {
        return NextResponse.json({ error: "Instagram or TikTok is required." }, { status: 400 });
      }
    }

    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return NextResponse.json({ error: "Email already in use." }, { status: 409 });
    }

    if (username) {
      const existingUsername = await prisma.user.findUnique({ where: { username } });
      if (existingUsername) {
        return NextResponse.json({ error: "Username already in use." }, { status: 409 });
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);

    if (role === "CUSTOMER") {
      await prisma.user.create({
        data: {
          email,
          username,
          passwordHash,
          termsAcceptedAt: new Date(),
          termsAcceptedVersion: "1.0",
          role: "CUSTOMER",
          name: fullName,
          customerProfile: {
            create: {
              fullName,
              countryCode: countryCode || null,
            },
          },
        },
      });
    } else {
      const basePriceFrom = Math.round(minimumBudget);

      await prisma.user.create({
        data: {
          email,
          username: username || null,
          passwordHash,
          role: "DRESSMAKER",
          name: displayName,
          termsAcceptedAt: new Date(),
          termsAcceptedVersion: "1.0",
          dressmakerProfile: {
            create: {
              displayName,
              countryCode,
              basePriceFrom,
              currency: "USD",
              instagramHandle: instagram.trim().replace(/^@/, "") || null,
              socialLinks: {
                tiktok: tiktok.trim().replace(/^@/, "") || null,
              },
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