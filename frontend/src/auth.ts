// auth.ts
import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma" 

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),

  // Pick your providers (GitHub is common for dev)
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
  ],

  session: { strategy: "database" }, // works well with Prisma adapter

  callbacks: {
    /**
     * This runs whenever a session is checked/created.
     * We copy role from DB onto session.user.role
     */
    session: async ({ session, user }) => {
      if (session.user) {
        // user is your Prisma User row (because adapter)
        session.user.id = user.id
        // @ts-expect-error - we will add types in next-auth.d.ts
        session.user.role = (user as any).role
      }
      return session
    },

    /**
     * Optional: used by middleware to decide if the request is allowed.
     * If you export `auth as middleware`, this controls access.
     */
    // authorized({ auth, request }) {
    //   const path = request.nextUrl.pathname

    //   // Anything under /dashboard requires login
    //   if (path.startsWith("/dashboard")) {
    //     return !!auth?.user
    //   }

    //   // Everything else public
    //   return true
    // },
  },
})
