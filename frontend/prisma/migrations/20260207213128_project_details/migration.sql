-- AlterEnum
ALTER TYPE "ProjectStatus" ADD VALUE 'FIT_SAMPLE_SENT';

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "isGeneral" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Payment" ALTER COLUMN "status" SET DEFAULT 'REQUIRES_PAYMENT_METHOD';

-- AlterTable
ALTER TABLE "ProjectDetails" ADD COLUMN     "fabricAgreed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fabricAgreedNote" TEXT,
ADD COLUMN     "requireSketch" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sketchImage" TEXT[];
