import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import ProfileForm from "./ProfileForm"
import PublishToggle from "./PublishToggle"


export default async function DressmakerProfilePage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Not signed in</h1>
        <p>Please sign in to access your dashboard.</p>
      </main>
    )
  }

  if (session.user.role !== "DRESSMAKER" && session.user.role !== "ADMIN") {
    return (
      <main style={{ padding: 24 }}>
        <h1>Forbidden</h1>
        <p>You must be a dressmaker to view this page.</p>
      </main>
    )
  }

  const profile = await prisma.dressmakerProfile.findUnique({
    where: { userId: session.user.id },
  })

  if (!profile) {
    return (
      <main style={{ padding: 24 }}>
        <h1>No dressmaker profile found</h1>
        <p>
          Go to <code>/become-dressmaker</code> first, then come back here.
        </p>
      </main>
    )
  }

  return (
    <main style={{ padding: 24, maxWidth: 760 }}>
      <h1>Dressmaker Profile</h1>
      <p>Edit your profile details. These will be shown on your public page.</p>

      <ProfileForm initialProfile={profile} />
      <PublishToggle initialPublished={profile.isPublished} />

    </main>
  )
}
