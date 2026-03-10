-- CreateEnum
CREATE TYPE "AIUsageType" AS ENUM ('AI_POST_GENERATION', 'AI_CONTENT_COACH');

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "writingStyle" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "customStyles" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "defaultTone" TEXT NOT NULL DEFAULT 'Professional',
ADD COLUMN     "plan" TEXT NOT NULL DEFAULT 'free',
ADD COLUMN     "writingStyles" JSONB DEFAULT '[]';

-- CreateTable
CREATE TABLE "AIUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "AIUsageType" NOT NULL DEFAULT 'AI_POST_GENERATION',
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AIUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AIUsage_userId_date_type_idx" ON "AIUsage"("userId", "date", "type");

-- CreateIndex
CREATE UNIQUE INDEX "AIUsage_userId_date_type_key" ON "AIUsage"("userId", "date", "type");

-- AddForeignKey
ALTER TABLE "AIUsage" ADD CONSTRAINT "AIUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
