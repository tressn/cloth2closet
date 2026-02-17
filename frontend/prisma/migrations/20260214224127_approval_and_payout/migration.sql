-- CreateEnum
CREATE TYPE "DressmakerApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('PENDING_EMAIL_VERIFICATION', 'ACTIVE', 'SUSPENDED');

-- AlterTable
ALTER TABLE "DressmakerProfile" ADD COLUMN     "approvalStatus" "DressmakerApprovalStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "socialLinks" JSONB,
ADD COLUMN     "timezone" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "status" "AccountStatus" NOT NULL DEFAULT 'PENDING_EMAIL_VERIFICATION';

-- CreateTable
CREATE TABLE "PayoutProfile" (
    "id" TEXT NOT NULL,
    "dressmakerProfileId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'PAYONEER',
    "payoneerEmail" TEXT,
    "payoneerId" TEXT,
    "legalName" TEXT,
    "country" TEXT,
    "address1" TEXT,
    "address2" TEXT,
    "city" TEXT,
    "region" TEXT,
    "postalCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayoutProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PayoutProfile_dressmakerProfileId_key" ON "PayoutProfile"("dressmakerProfileId");

-- AddForeignKey
ALTER TABLE "DressmakerProfile" ADD CONSTRAINT "DressmakerProfile_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutProfile" ADD CONSTRAINT "PayoutProfile_dressmakerProfileId_fkey" FOREIGN KEY ("dressmakerProfileId") REFERENCES "DressmakerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
