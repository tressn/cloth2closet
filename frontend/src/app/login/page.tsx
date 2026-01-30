"use client"

import { signIn } from "next-auth/react"

export default function LoginPage() {
  return (
    <button onClick={() => signIn("github")}>
      Sign in with GitHub
    </button>
  )
}
