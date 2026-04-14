-- AlterTable
ALTER TABLE "Milestone" ADD COLUMN     "platformFeeAmount" INTEGER,
ADD COLUMN     "shippingAmount" INTEGER,
ADD COLUMN     "transferGroup" TEXT;

-- AlterTable
ALTER TABLE "ProjectShipping" ADD COLUMN     "quotedAmount" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "termsAcceptedVersion" TEXT;
