import { auth } from "@/auth"

export async function requireUser() {
  const session = await auth()
  if (!session?.user) {
    throw new Error("Not authenticated")
  }
  return session.user
}

export async function requireDressmaker() {
  const user = await requireUser()
  if (user.role !== "DRESSMAKER" && user.role !== "ADMIN") {
    throw new Error("Forbidden")
  }
  return user
}
