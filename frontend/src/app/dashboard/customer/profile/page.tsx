import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

import { Page } from "@/components/ui/Page";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

import CustomerProfileForm from "./ui/CustomerProfileForm";
import SavedDressmakers from "./ui/SavedDressmakers";
import MyReviews from "./ui/MyReviews";
import MyQuotes from "./ui/MyQuotes";
import MyFiles from "./ui/MyFiles";

export default async function CustomerProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  // Fetch everything the page needs (server-side, fast, secure)
  const [user, customerProfile, measurements, saved, reviews, quotes, files] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, username: true, image: true },
    }),
    prisma.customerProfile.findUnique({ where: { userId } }),
    prisma.measurement.findMany({
      where: { customerId: userId },
      orderBy: { updatedAt: "desc" },
      take: 1, // latest
    }),

    
    prisma.savedDressmaker.findMany({
      where: { customerId: userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        dressmakerProfileId: true,
        dressmakerProfile: {
          select: {
            id: true,
            displayName: true,
            countryCode: true,
            user: { select: { id: true, name: true, image: true, username: true } },
          },
        },
      },
    }),

    prisma.review.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: "desc" },
      include: {
        project: {
          select: {
            id: true,
            projectCode: true,
            dressmaker: { select: { id: true, name: true, username: true } },
          },
        },
      },
    }),

    prisma.project.findMany({
      where: { customerId: userId, quotedTotalAmount: { not: null } },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        projectCode: true,
        status: true,
        quotedTotalAmount: true,
        currency: true,
        updatedAt: true,
        dressmaker: { select: { id: true, name: true, username: true } },
      },
    }),

    prisma.fileAsset.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const latestMeasurement = measurements[0] ?? null;


return (
  <div className="grid gap-6">
    {/* Profile Section */}
    <Card>
      <CardHeader
        title="My profile"
        subtitle="Update your personal details and account preferences."
      />
      <CardBody>
        <CustomerProfileForm user={user} profile={customerProfile} />
      </CardBody>
    </Card>

    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <SavedDressmakers items={saved} />
      </Card>
      <Card>
        <MyQuotes items={quotes} />
      </Card>
    </div>

    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <MyReviews items={reviews} />
      </Card>
      <Card>
        <MyFiles items={files} />
      </Card>
    </div>

    <Card>
      <div className="p-6">
        <h2 className="text-xl font-semibold">Measurements</h2>
        <p className="mt-2 text-sm opacity-80">
          Latest set:{" "}
          {latestMeasurement
            ? new Date(latestMeasurement.updatedAt).toLocaleString()
            : "None yet"}
        </p>

        <div className="mt-4">
          <a className="underline" href="/dashboard/customer/measurements">
            View / update measurements →
          </a>
        </div>
      </div>
    </Card>
  </div>
);
}