-- AlterTable
ALTER TABLE "ArtistRequest" ADD COLUMN     "rejectionReason" TEXT;

-- AlterTable
ALTER TABLE "Playlist" ADD COLUMN     "isCollaborative" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PlaylistCollaborator" (
    "playlistId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlaylistCollaborator_pkey" PRIMARY KEY ("playlistId","userId")
);

-- AddForeignKey
ALTER TABLE "PlaylistCollaborator" ADD CONSTRAINT "PlaylistCollaborator_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "Playlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaylistCollaborator" ADD CONSTRAINT "PlaylistCollaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
