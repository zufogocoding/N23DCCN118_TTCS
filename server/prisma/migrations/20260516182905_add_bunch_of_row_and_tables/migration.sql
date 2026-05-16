/*
  Warnings:

  - Made the column `status` on table `Song` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Artist" ADD COLUMN     "facebookUrl" VARCHAR(500),
ADD COLUMN     "followerCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "instagramUrl" VARCHAR(500),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN     "youtubeUrl" VARCHAR(500);

-- AlterTable
ALTER TABLE "Song" ADD COLUMN     "artistName" VARCHAR(255),
ADD COLUMN     "playCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "uploadedById" INTEGER,
ALTER COLUMN "status" SET NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'pending';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastLogin" TIMESTAMP(3),
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'user';

-- CreateTable
CREATE TABLE "ArtistRequest" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "artistName" VARCHAR(255) NOT NULL,
    "idCardUrl" VARCHAR(500) NOT NULL,
    "demoTrackUrl" VARCHAR(500) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArtistRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL DEFAULT 'info',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ArtistRequest_userId_key" ON "ArtistRequest"("userId");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "ArtistRequest" ADD CONSTRAINT "ArtistRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
