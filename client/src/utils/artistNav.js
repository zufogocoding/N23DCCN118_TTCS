/** Lấy userId nghệ sĩ chính để mở /artist/:userId */
export function getPrimaryArtistUserId(song) {
  if (!song) return null;
  const first = song.artists?.[0];
  if (first?.artistId != null) return first.artistId;
  if (first?.artist?.userId != null) return first.artist.userId;
  if (song.uploadedById != null) return song.uploadedById;
  return null;
}
