import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/app/dashboard/DashboardShell";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import ProfileForm from "./ProfileForm";
import PublishToggle from "./PublishToggle";
import PauseToggle from "./PauseToggle";
import SetupPayoutButton from "./SetupPayoutButton";
import RequestReviewButton from "./RequestReviewButton";



export default async function DressmakerProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/api/auth/signin");
  if (session.user.role !== "DRESSMAKER" && session.user.role !== "ADMIN") redirect("/");

  const profile = await prisma.dressmakerProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      payoutProfile: true,
      dressmakerSpecialties: {
        include: { label: true },
      },
    },
  });

  if (!profile) redirect("/become-dressmaker");

  const social = (profile.socialLinks ?? {}) as Record<string, unknown>;
  const tiktokHandle = typeof social.tiktok === "string" ? social.tiktok : "";

  return (
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader
              title="Profile details"
              subtitle="These are shown on your public dressmaker page."
            />
            <CardBody>
              <ProfileForm
                initialProfile={{
                  displayName: profile.displayName ?? null,
                  bio: profile.bio ?? null,

                  countryCode: profile.countryCode ?? null,
                  timezoneIana: profile.timezoneIana ?? null,

                  languageCodes: profile.languages ?? [],

                  basePriceFrom: profile.basePriceFrom ?? null,
                  currency: profile.currency ?? "USD",
                  yearsExperience: profile.yearsExperience ?? null,

                  specialties: profile.dressmakerSpecialties
                    .map((x) => x.label)
                    .filter((l) => l.scope === "SPECIALTY" && l.status !== "REJECTED")
                    .map((l) => l.slug),

                  websiteUrl: profile.websiteUrl ?? null,
                  instagramHandle: profile.instagramHandle ?? null,
                  tiktokHandle: tiktokHandle || null,
                  contactPhone: profile.contactPhone ?? null,
                }}
              />
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
              <PublishToggle
                initialPublished={profile.isPublished}
                approvalStatus={profile.approvalStatus}
                rejectionReason={profile.rejectionReason}
              />

              {profile.approvalStatus === "APPROVED" && profile.isPublished ? (
                <div className="mt-4 border-t border-[var(--border)] pt-4">
                  <PauseToggle initialPaused={profile.isPaused} />
                </div>
              ) : null}

              {profile.approvalStatus === "REJECTED" ? (
                <div className="mt-3">
                  <RequestReviewButton />
                  <div className="mt-2 text-[12px] leading-5 text-[var(--muted)]">
                    After updating your profile, request review to re-enter the approval queue.
                  </div>
                </div>
              ) : null}
              <div className="mt-3 text-[13px] leading-6 text-[var(--muted)]">
                Tip: featured portfolio items help you look premium without needing lots of content.
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Payouts"
              subtitle="Set up payouts so you can receive money from projects."
            />
            <CardBody className="space-y-3">
              {profile.payoutProfile?.provider === "PAYONEER" ? (
                <div className="text-[14px]">
                  <span className="font-medium">Status:</span>{" "}
                  <span className="text-green-600">Payoneer</span>
                  <div className="mt-1 text-[13px] text-[var(--muted)]">
                    International payouts are processed weekly on Mondays.
                  </div>
                </div>
              ) : profile.payoutProfile?.stripeAccountId ? (
                profile.payoutProfile.payoutsEnabled ? (
                  <div className="text-[14px]">
                    <span className="font-medium">Status:</span>{" "}
                    <span className="text-green-600">Payouts enabled</span>
                  </div>
                ) : (
                  <div className="text-[14px]">
                    <span className="font-medium">Status:</span>{" "}
                    <span className="text-amber-600">Setup incomplete</span>
                    <div className="mt-1 text-[13px] text-[var(--muted)]">
                      Stripe needs more information before payouts can be sent.
                    </div>
                  </div>
                )
              ) : (
                <div className="text-[14px]">
                  <span className="font-medium">Status:</span>{" "}
                  <span className="text-amber-600">Not set up</span>
                </div>
              )}

              <SetupPayoutButton />
            </CardBody>
          </Card>


          <Card>
            <CardHeader title="Quick links" />
            <CardBody className="space-y-2 text-[14px] text-[var(--muted)]">
              <a className="block underline" href={`/find-designers/${profile.id}`}>
                View your public profile
              </a>
            </CardBody>
          </Card>
        </div>
      </div>
  );
}
