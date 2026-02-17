-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "depositPercent" INTEGER,
ADD COLUMN     "title" TEXT;

-- AlterTable
ALTER TABLE "ProjectDetails" ADD COLUMN     "isRush" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "wantsCalico" BOOLEAN NOT NULL DEFAULT false;
