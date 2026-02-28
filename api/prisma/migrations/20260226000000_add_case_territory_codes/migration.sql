-- AlterTable
ALTER TABLE "Case" ADD COLUMN "regionCode" TEXT NOT NULL DEFAULT '',
ADD COLUMN "communeCode" TEXT NOT NULL DEFAULT '',
ADD COLUMN "localCode" TEXT NOT NULL DEFAULT '',
ADD COLUMN "localSnapshot" JSONB;

-- CreateIndex
CREATE INDEX "Case_regionCode_communeCode_idx" ON "Case"("regionCode", "communeCode");
