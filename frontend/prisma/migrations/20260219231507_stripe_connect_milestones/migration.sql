/*
  Warnings:

  - A unique constraint covering the columns `[stripeCheckoutSessionId]` on the table `Milestone` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripePaymentIntentId]` on the table `Milestone` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[projectId,type]` on the table `Milestone` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripeAccountId]` on the table `PayoutProfile` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `type` to the `Milestone` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "MilestoneType" AS ENUM ('DEPOSIT', 'FINAL');

-- AlterTable
ALTER TABLE "Milestone" ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "payoutEligibleAt" TIMESTAMP(3),
ADD COLUMN     "releasedAt" TIMESTAMP(3),
ADD COLUMN     "stripeCheckoutSessionId" TEXT,
ADD COLUMN     "stripePaymentIntentId" TEXT,
ADD COLUMN     "type" "MilestoneType" NOT NULL;

-- AlterTable
ALTER TABLE "PayoutProfile" ADD COLUMN     "detailsSubmitted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "payoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requirementsJson" JSONB,
ADD COLUMN     "stripeAccountId" TEXT,
ALTER COLUMN "provider" SET DEFAULT 'STRIPE';

-- CreateIndex
CREATE UNIQUE INDEX "Milestone_stripeCheckoutSessionId_key" ON "Milestone"("stripeCheckoutSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Milestone_stripePaymentIntentId_key" ON "Milestone"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "Milestone_payoutEligibleAt_idx" ON "Milestone"("payoutEligibleAt");

-- CreateIndex
CREATE UNIQUE INDEX "Milestone_projectId_type_key" ON "Milestone"("projectId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "PayoutProfile_stripeAccountId_key" ON "PayoutProfile"("stripeAccountId");
