import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/app/dashboard/DashboardShell";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import ProfileForm from "./ProfileForm";
import PublishToggle from "./PublishToggle";

export default async function DressmakerProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/api/auth/signin");
  if (session.user.role !== "DRESSMAKER" && session.user.role !== "ADMIN") redirect("/");

  const profile = await prisma.dressmakerProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!profile) redirect("/become-dressmaker");

  return (
    <DashboardShell
      title="Dressmaker dashboard"
      subtitle="Edit your profile, publish it, and manage portfolio + projects."
      tabs={[
        { label: "Profile", href: "/dashboard/dressmaker/profile" },
        { label: "Portfolio", href: "/dashboard/dressmaker/portfolio" },
        { label: "Projects", href: "/dashboard/dressmaker/projects" },
      ]}
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader
              title="Profile details"
              subtitle="These are shown on your public dressmaker page."
            />
            <CardBody>
              <ProfileForm initialProfile={profile} />
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Publish status"
              subtitle="Publish when your bio + portfolio are ready."
            />
            <CardBody>
              <PublishToggle initialPublished={profile.isPublished} />
              <div className="mt-3 text-[13px] leading-6 text-[var(--muted)]">
                Tip: featured portfolio items help you look premium without needing lots of content.
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Quick links" />
            <CardBody className="space-y-2 text-[14px] text-[var(--muted)]">
              <a className="underline" href={`/dressmakers/${profile.id}`}>
                View your public profile
              </a>
              <a className="underline" href="/messages">
                Messages
              </a>
            </CardBody>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
