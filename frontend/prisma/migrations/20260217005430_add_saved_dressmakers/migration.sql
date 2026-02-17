-- CreateTable
CREATE TABLE "SavedDressmaker" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "dressmakerProfileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedDressmaker_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedDressmaker_customerId_idx" ON "SavedDressmaker"("customerId");

-- CreateIndex
CREATE INDEX "SavedDressmaker_dressmakerProfileId_idx" ON "SavedDressmaker"("dressmakerProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedDressmaker_customerId_dressmakerProfileId_key" ON "SavedDressmaker"("customerId", "dressmakerProfileId");

-- AddForeignKey
ALTER TABLE "SavedDressmaker" ADD CONSTRAINT "SavedDressmaker_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedDressmaker" ADD CONSTRAINT "SavedDressmaker_dressmakerProfileId_fkey" FOREIGN KEY ("dressmakerProfileId") REFERENCES "DressmakerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
