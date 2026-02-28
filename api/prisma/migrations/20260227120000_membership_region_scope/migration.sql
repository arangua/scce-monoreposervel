-- CreateEnum
CREATE TYPE "RegionScopeMode" AS ENUM ('ALL', 'LIST');

-- AlterTable
ALTER TABLE "Membership" ADD COLUMN "regionScopeMode" "RegionScopeMode" NOT NULL DEFAULT 'LIST';
ALTER TABLE "Membership" ADD COLUMN "regionScope" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
