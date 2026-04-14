/*
  Warnings:

  - You are about to drop the column `sketchImage` on the `ProjectDetails` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ProjectDetails" DROP COLUMN "sketchImage";

-- AlterTable
ALTER TABLE "ProjectMeasurementGate" ADD COLUMN     "lockedAt" TIMESTAMP(3),
ADD COLUMN     "snapshotFieldsJson" JSONB,
ADD COLUMN     "sourceMeasurementId" TEXT;
