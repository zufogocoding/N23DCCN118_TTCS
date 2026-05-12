/*
  Warnings:

  - Added the required column `title` to the `Album` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Playlist` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Album" ADD COLUMN     "coverArtUrl" VARCHAR(500),
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "title" VARCHAR(255) NOT NULL;

-- AlterTable
ALTER TABLE "Artist" ADD COLUMN     "artistName" VARCHAR(255),
ADD COLUMN     "avatarUrl" VARCHAR(500),
ADD COLUMN     "bannerUrl" VARCHAR(500);

-- AlterTable
ALTER TABLE "Chart" ADD COLUMN     "title" VARCHAR(255);

-- AlterTable
ALTER TABLE "Playlist" ADD COLUMN     "coverArtUrl" VARCHAR(500),
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Song" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarUrl" VARCHAR(500),
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
