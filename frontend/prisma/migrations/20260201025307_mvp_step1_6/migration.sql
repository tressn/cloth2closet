-- AlterTable
ALTER TABLE "DressmakerProfile" ADD COLUMN     "isPaused" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPublished" BOOLEAN NOT NULL DEFAULT false;
