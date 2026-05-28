/*
  Warnings:

  - You are about to drop the column `embedding` on the `Song` table. All the data in the column will be lost.
  - You are about to drop the column `alsFeature` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Artist" ADD COLUMN     "pinnedSongId" INTEGER;

-- AlterTable
ALTER TABLE "Song" DROP COLUMN "embedding",
ADD COLUMN     "collaborativeVector" vector(64),
ADD COLUMN     "contentVector" vector(128),
ADD COLUMN     "danceability" DOUBLE PRECISION,
ADD COLUMN     "lyrics" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "alsFeature",
ADD COLUMN     "collaborativeVector" vector(64),
ADD COLUMN     "contentVector" vector(128);

-- CreateTable
CREATE TABLE "Report" (
    "id" SERIAL NOT NULL,
    "reporterId" INTEGER NOT NULL,
    "targetType" VARCHAR(50) NOT NULL,
    "targetId" INTEGER NOT NULL,
    "reason" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "proofUrl" VARCHAR(500),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SongLike" (
    "userId" INTEGER NOT NULL,
    "songId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SongLike_pkey" PRIMARY KEY ("userId","songId")
);

-- CreateIndex
CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "Artist" ADD CONSTRAINT "Artist_pinnedSongId_fkey" FOREIGN KEY ("pinnedSongId") REFERENCES "Song"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SongLike" ADD CONSTRAINT "SongLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SongLike" ADD CONSTRAINT "SongLike_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;
