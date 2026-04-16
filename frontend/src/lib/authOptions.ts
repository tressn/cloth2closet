import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    Credentials({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = (credentials?.email ?? "").toLowerCase().trim();
        const password = credentials?.password ?? "";
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        // IMPORTANT: return role too so jwt callback can pick it up on first sign-in
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role ?? null,
        } as any;
      },
    }),
  ],

  // REQUIRED for Credentials in next-auth v4
  session: { strategy: "jwt" },

  callbacks: {
    async jwt({ token, user }) {
      // On first sign-in, seed from the authorize return
      if (user) {
        (token as any).id = (user as any).id;
        (token as any).role = (user as any).role ?? null;
      }

      // are reflected without requiring a sign-out
      const userId = (token as any).id;
      if (userId) {
        const fresh = await prisma.user.findUnique({
          where: { id: userId },
          select: { name: true, username: true, role: true, status: true },
        });
        if (fresh) {
          token.name = fresh.name ?? token.name;
          (token as any).username = fresh.username ?? null;
          (token as any).role = fresh.role ?? null;
          (token as any).status = fresh.status ?? "ACTIVE";
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = (token as any).id;
        (session.user as any).role = (token as any).role ?? null;
        (session.user as any).username = (token as any).username ?? null;
        (session.user as any).status = (token as any).status ?? "ACTIVE";
        // Sync name from token so sidebar always has fresh value
        session.user.name = token.name ?? session.user.name;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login", // keep UX simple for MVP
  },
};

