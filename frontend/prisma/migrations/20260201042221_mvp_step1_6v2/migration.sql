/*
  Warnings:

  - A unique constraint covering the columns `[projectId]` on the table `Conversation` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "attachments" TEXT[];

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "stripeCheckoutSessionId" TEXT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN     "quotedTotalAmount" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_projectId_key" ON "Conversation"("projectId");
