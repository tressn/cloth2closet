import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import Link from "next/link"

export default async function NavBar() {
  const session = await getServerSession(authOptions)
  const role = session?.user?.role

  return (
    <nav style={{ borderBottom: "1px solid #ddd", padding: 12 }}>
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <Link href="/">Home</Link>
        <Link href="/dressmakers">Find dressmakers</Link>
        <Link href="/messages">Messages</Link>

        {role === "DRESSMAKER" || role === "ADMIN" ? (
          <>
            <span style={{ opacity: 0.5 }}>|</span>
            <Link href="/dashboard/dressmaker/profile">Dressmaker Profile</Link>
            <Link href="/dashboard/dressmaker/portfolio">Portfolio</Link>
            <Link href="/dashboard/dressmaker/projects">Projects</Link>
          </>
        ) : null}

        <span style={{ opacity: 0.5 }}>|</span>
        <Link href="/dashboard/customer/projects">My Projects</Link>
        <Link href="/api/auth/signout">Sign out</Link>
      </div>
    </nav>
  )
}
