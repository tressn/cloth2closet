import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";

type Role = "CUSTOMER" | "DRESSMAKER" | "ADMIN";

export async function requireUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  return session.user as typeof session.user & { id: string; role: Role | null };
}

export async function requireRole(allowed: Role[]) {
  const user = await requireUser();
  if (!user.role) redirect("/register");
  if (!allowed.includes(user.role)) redirect("/forbidden");
  return user as typeof user & { role: Role };
}

export async function requireDressmaker() {
  return requireRole(["DRESSMAKER", "ADMIN"]);
}

export async function requireAssignedRole() {
  const user = await requireUser();
  if (!user.role) redirect("/register"); // or wherever you set role
  return user as typeof user & { role: Role };
}
