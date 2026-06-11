-- AlterTable
ALTER TABLE "Playlist" ADD COLUMN     "category" VARCHAR(100),
ADD COLUMN     "displayOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isOnHomepage" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isSystem" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "PlaylistSong" ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;
