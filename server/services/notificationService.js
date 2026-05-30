async function createNotificationsForArtistFollowers(db, artistId, message, type, metadata = {}) {
  const followers = await db.follow.findMany({
    where: { followeeId: artistId },
    select: { followerId: true },
  });

  const notifications = followers
    .filter(({ followerId }) => followerId !== artistId)
    .map(({ followerId }) => ({
      userId: followerId,
      message,
      type,
      ...metadata,
    }));

  if (notifications.length === 0) return 0;

  const result = await db.notification.createMany({
    data: notifications,
  });

  return result.count;
}

async function notifyFollowersAboutAlbumRelease(db, albumId) {
  const album = await db.album.findUnique({
    where: { id: albumId },
    include: {
      artist: {
        include: {
          user: { select: { displayName: true, username: true } },
        },
      },
    },
  });

  if (!album || !album.artist || album.status !== 'released') return 0;

  const artistName = album.artist.user?.displayName || album.artist.user?.username || 'Nghệ sĩ bạn theo dõi';
  const message = `${artistName} vừa phát hành album "${album.title}".`;

  return createNotificationsForArtistFollowers(db, album.artistId, message, 'new_album', {
    targetType: 'ALBUM',
    targetId: album.id,
    actionUrl: `/album/${album.id}`,
  });
}

async function notifyFollowersAboutSingleRelease(db, songId) {
  const song = await db.song.findUnique({
    where: { id: songId },
    include: {
      albums: { select: { albumId: true } },
      artists: {
        include: {
          artist: {
            include: {
              user: { select: { displayName: true, username: true } },
            },
          },
        },
      },
    },
  });

  if (!song || song.status !== 'approved' || song.isDeleted || song.albums.length > 0) return 0;

  const artistIds = [...new Set(song.artists.map(({ artistId }) => artistId))];
  if (artistIds.length === 0 && song.uploadedById) artistIds.push(song.uploadedById);
  if (artistIds.length === 0) return 0;

  const artistNames = song.artists
    .map(({ artist }) => artist?.user?.displayName || artist?.user?.username)
    .filter(Boolean);
  const artistName = artistNames[0] || song.artistName || 'Nghệ sĩ bạn theo dõi';
  const message = `${artistName} vừa phát hành bài hát mới "${song.title}".`;

  const followerIds = new Set();
  const followers = await db.follow.findMany({
    where: { followeeId: { in: artistIds } },
    select: { followerId: true, followeeId: true },
  });
  followers.forEach(({ followerId, followeeId }) => {
    if (followerId !== followeeId) followerIds.add(followerId);
  });

  const notifications = [...followerIds].map((userId) => ({
    userId,
    message,
    type: 'new_song',
    targetType: 'SONG',
    targetId: song.id,
    actionUrl: `/song/${song.id}`,
  }));

  if (notifications.length === 0) return 0;

  const result = await db.notification.createMany({
    data: notifications,
  });

  return result.count;
}

module.exports = {
  createNotificationsForArtistFollowers,
  notifyFollowersAboutAlbumRelease,
  notifyFollowersAboutSingleRelease,
};
