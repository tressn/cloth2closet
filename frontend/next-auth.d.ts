import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "CUSTOMER" | "DRESSMAKER" | "ADMIN" | null;
      status?: "PENDING_EMAIL_VERIFICATION" | "ACTIVE" | "SUSPENDED";
      email?: string | null;
      name?: string | null;
      image?: string | null;
    };
  }
}
