import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "CUSTOMER" | "DRESSMAKER" | "ADMIN" | null;
      email?: string | null;
      name?: string | null;
      image?: string | null;
    };
  }
}
