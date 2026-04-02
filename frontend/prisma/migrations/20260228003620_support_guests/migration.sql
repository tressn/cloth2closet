-- AlterTable
ALTER TABLE "SupportTicket" ADD COLUMN     "requesterEmail" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;
