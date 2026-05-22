/*
  Warnings:

  - You are about to drop the column `artistName` on the `Artist` table. All the data in the column will be lost.
  - You are about to drop the column `facebookUrl` on the `Artist` table. All the data in the column will be lost.
  - You are about to drop the column `instagramUrl` on the `Artist` table. All the data in the column will be lost.
  - You are about to drop the column `youtubeUrl` on the `Artist` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Album" ADD COLUMN     "scheduledAt" TIMESTAMP(3),
ADD COLUMN     "status" VARCHAR(50) NOT NULL DEFAULT 'draft';

-- AlterTable
ALTER TABLE "Artist" DROP COLUMN "artistName",
DROP COLUMN "facebookUrl",
DROP COLUMN "instagramUrl",
DROP COLUMN "youtubeUrl";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "coverImageUrl" VARCHAR(500),
ADD COLUMN     "displayName" VARCHAR(100),
ADD COLUMN     "socialLinks" JSONB NOT NULL DEFAULT '[]';

-- CreateIndex
CREATE INDEX "Interaction_userId_songId_idx" ON "Interaction"("userId", "songId");

-- CreateIndex
CREATE INDEX "Interaction_timeStamp_idx" ON "Interaction"("timeStamp");

-- CreateIndex
CREATE INDEX "Song_status_idx" ON "Song"("status");

-- CreateIndex
CREATE INDEX "Song_createdAt_idx" ON "Song"("createdAt");
