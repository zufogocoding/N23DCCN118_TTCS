/*
  Warnings:

  - You are about to alter the column `totalScore` on the `ChartSong` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `DoublePrecision`.
  - You are about to alter the column `completionRate` on the `Interaction` table. The data in that column could be lost. The data in that column will be cast from `Decimal(5,4)` to `DoublePrecision`.
  - You are about to alter the column `energy` on the `Song` table. The data in that column could be lost. The data in that column will be cast from `Decimal(5,4)` to `DoublePrecision`.
  - You are about to alter the column `tempo` on the `Song` table. The data in that column could be lost. The data in that column will be cast from `Decimal(6,2)` to `DoublePrecision`.

*/
-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- AlterTable
ALTER TABLE "ChartSong" ALTER COLUMN "totalScore" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Interaction" ADD COLUMN     "isSkipped" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "completionRate" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Song" ADD COLUMN     "embedding" vector(64),
ALTER COLUMN "energy" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "tempo" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "alsFeature" vector(64);

-- CreateTable
CREATE TABLE "RecommendationCache" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "songId" INTEGER NOT NULL,
    "finalScore" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecommendationCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecommendationCache_userId_finalScore_idx" ON "RecommendationCache"("userId", "finalScore" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "RecommendationCache_userId_songId_key" ON "RecommendationCache"("userId", "songId");

-- CreateIndex
CREATE INDEX "Interaction_userId_timeStamp_idx" ON "Interaction"("userId", "timeStamp");

-- CreateIndex
CREATE INDEX "Song_isDeleted_idx" ON "Song"("isDeleted");

-- AddForeignKey
ALTER TABLE "RecommendationCache" ADD CONSTRAINT "RecommendationCache_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationCache" ADD CONSTRAINT "RecommendationCache_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;
