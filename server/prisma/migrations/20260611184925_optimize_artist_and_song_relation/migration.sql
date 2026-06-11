/*
  Warnings:

  - You are about to drop the column `artistBio` on the `Artist` table. All the data in the column will be lost.
  - You are about to drop the column `avatarUrl` on the `Artist` table. All the data in the column will be lost.
  - You are about to drop the column `bannerUrl` on the `Artist` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Artist" DROP COLUMN "artistBio",
DROP COLUMN "avatarUrl",
DROP COLUMN "bannerUrl";

-- AddForeignKey
ALTER TABLE "Song" ADD CONSTRAINT "Song_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
