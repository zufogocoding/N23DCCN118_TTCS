/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Play, Trash2, Plus, Loader2, Pencil } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import { api, getMediaUrl } from '../../utils/api';
import { getCoverArt, formatDuration, getArtistName } from '../../utils/songHelpers';
import AddToPlaylistMenu from '../../components/common/AddToPlaylistMenu';

export default function AlbumView() {
  const { albumId } = useParams();
  const navigate = useNavigate();
  const { playSong } = usePlayer();
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [myUploads, setMyUploads] = useState([]);
  const [editTitle, setEditTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [addingId, setAddingId] = useState(null);

  const loadAlbum = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/api/albums/${albumId}`);
      if (!res.ok) {
        setError('Không tìm thấy album');
        setData(null);
        return;
      }
      const json = await res.json();
      setData(json);
      setEditTitle(json.album?.title || '');
    } catch (e) {
      console.error(e);
      setError('Lỗi tải album');
    } finally {
      setLoading(false);
    }
  }, [albumId]);

  useEffect(() => {
    loadAlbum();
  }, [loadAlbum]);

  const isOwner = data?.album?.artistId === currentUser.id;

  useEffect(() => {
    if (!isOwner || !currentUser.id) return;
    api.get('/api/songs/my-uploaded')
      .then((r) => (r.ok ? r.json() : []))
      .then(setMyUploads)
      .catch(() => setMyUploads([]));
  }, [isOwner, currentUser.id, data?.tracks?.length]);

  const trackIds = new Set((data?.tracks || []).map((t) => t.id));
  const aid = parseInt(albumId, 10);
  const inOtherAlbum = (s) =>
    (s.albums || []).some((as) => as.album && as.album.id !== aid);
  const addableSongs = myUploads.filter(
    (s) => s.status === 'approved' && !inOtherAlbum(s) && !trackIds.has(s.id)
  );

  const handlePlayTrack = (song) => {
    const queue = (data?.tracks || []).map((s) => ({
      id: s.id,
      title: s.title,
      artist: { name: getArtistName(s) },
      coverImage: getCoverArt(s),
      audioUrl: getMediaUrl(s.audioUrl),
      durationMs: s.durationMs,
    }));
    const playerSong = queue.find((q) => q.id === song.id) || queue[0];
    if (playerSong) playSong(playerSong, queue);
  };

  const handlePlayAlbum = () => {
    if (!data?.tracks?.length) return;
    handlePlayTrack(data.tracks[0]);
  };

  const handleRemoveTrack = async (songId) => {
    if (!window.confirm('Gỡ bài này khỏi album?')) return;
    try {
      const res = await api.delete(`/api/albums/${albumId}/songs/${songId}`);
      if (res.ok) loadAlbum();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddTrack = async (songId) => {
    setAddingId(songId);
    try {
      const res = await api.post(`/api/albums/${albumId}/songs`, { songId });
      if (res.ok) loadAlbum();
    } catch (e) {
      console.error(e);
    } finally {
      setAddingId(null);
    }
  };

  const handleSaveTitle = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put(`/api/albums/${albumId}`, { title: editTitle });
      if (res.ok) loadAlbum();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAlbum = async () => {
    if (!window.confirm('Xóa album này? Các bài vẫn tồn tại trên hệ thống.')) return;
    try {
      const res = await api.delete(`/api/albums/${albumId}`);
      if (res.ok) navigate(`/artist/${currentUser.id}`);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 bg-[#121212] flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-[#00e6e6]" size={40} />
      </div>
    );
  }

  if (error || !data?.album) {
    return (
      <div className="p-10 text-white bg-[#121212] min-h-screen">
        <p>{error || 'Không tìm thấy album'}</p>
        <button type="button" onClick={() => navigate(-1)} className="mt-4 text-[#00e6e6]">
          Quay lại
        </button>
      </div>
    );
  }

  const { album, tracks } = data;
  const cover =
    album.coverArtUrl
      ? getMediaUrl(album.coverArtUrl)
      : 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=800&auto=format&fit=crop';

  const artistUser = album.artist?.user;
  const artistLabel =
    album.artist?.artistName || artistUser?.displayName || artistUser?.username || 'Nghệ sĩ';

  return (
    <div className="flex-1 bg-[#121212] overflow-y-auto min-h-screen text-white">
      <div className="absolute top-6 left-6 z-50">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center"
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      <div className="relative h-72 md:h-80 flex items-end">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${cover})` }}>
          <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/70 to-transparent" />
        </div>
        <div className="relative z-10 p-8 flex items-end gap-6 w-full">
          <img src={cover} alt="" className="w-40 h-40 md:w-48 md:h-48 rounded-md shadow-2xl object-cover hidden sm:block" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase text-white/80 mb-2">Album</p>
            {isOwner ? (
              <form onSubmit={handleSaveTitle} className="flex flex-wrap items-center gap-3 mb-2">
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="text-3xl md:text-5xl font-black bg-black/30 border border-white/20 rounded-lg px-3 py-1 max-w-full"
                />
                <button
                  type="submit"
                  disabled={saving}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20"
                  title="Lưu tên"
                >
                  {saving ? <Loader2 className="animate-spin" size={20} /> : <Pencil size={20} />}
                </button>
              </form>
            ) : (
              <h1 className="text-3xl md:text-5xl font-black truncate">{album.title}</h1>
            )}
            <div className="flex flex-wrap items-center gap-2 text-sm text-white/80 mt-2">
              <Link to={`/artist/${album.artistId}`} className="font-semibold text-white hover:underline">
                {artistLabel}
              </Link>
              {album.releasedDate && (
                <>
                  <span>•</span>
                  <span>{new Date(album.releasedDate).getFullYear()}</span>
                </>
              )}
              <span>•</span>
              <span>{tracks.length} bài</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={handlePlayAlbum}
          disabled={!tracks.length}
          className="bg-[#1ed760] w-14 h-14 rounded-full flex items-center justify-center text-black hover:scale-105 disabled:opacity-40"
        >
          <Play fill="black" size={28} />
        </button>
        {isOwner && (
          <button
            type="button"
            onClick={handleDeleteAlbum}
            className="px-4 py-2 rounded-full border border-red-500/50 text-red-400 hover:bg-red-500/10 text-sm font-semibold"
          >
            Xóa album
          </button>
        )}
      </div>

      <div className="px-8 pb-12">
        <h2 className="text-xl font-bold mb-4">Danh sách phát</h2>
        {!tracks.length ? (
          <p className="text-[#a0a0a0]">Chưa có bài nào (hoặc đang chờ duyệt).</p>
        ) : (
          <table className="w-full text-left">
            <tbody>
              {tracks.map((song, index) => (
                <tr key={song.id} className="hover:bg-white/5 group">
                  <td className="py-3 px-2 w-10 text-[#a0a0a0]">{index + 1}</td>
                  <td className="py-3 px-2 cursor-pointer" onClick={() => handlePlayTrack(song)}>
                    <div className="flex items-center gap-3">
                      <img src={getCoverArt(song)} alt="" className="w-10 h-10 rounded object-cover" />
                      <span className="font-medium">{song.title}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-right text-[#a0a0a0] text-sm">{formatDuration(song.durationMs)}</td>
                  <td className="py-3 px-2 w-24">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100">
                      <AddToPlaylistMenu songId={song.id} />
                      {isOwner && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTrack(song.id)}
                          className="p-2 rounded hover:bg-white/10 text-[#a0a0a0]"
                          title="Gỡ khỏi album"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {isOwner && (
          <div className="mt-10 border border-[#333] rounded-xl p-6">
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
              <Plus size={20} className="text-[#00e6e6]" />
              Thêm bài từ thư viện upload
            </h3>
            {!currentUser.id ? (
              <p className="text-[#a0a0a0] text-sm">Đăng nhập để quản lý album.</p>
            ) : addableSongs.length === 0 ? (
              <p className="text-[#a0a0a0] text-sm">Không còn bài đã duyệt để thêm (hoặc đã nằm album khác).</p>
            ) : (
              <ul className="space-y-2 max-h-64 overflow-y-auto">
                {addableSongs.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2 py-2 border-b border-[#222]">
                    <span className="truncate text-sm">{s.title}</span>
                    <button
                      type="button"
                      disabled={addingId === s.id}
                      onClick={() => handleAddTrack(s.id)}
                      className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-full bg-[#00e6e6] text-black hover:bg-[#00d0d0] disabled:opacity-50"
                    >
                      {addingId === s.id ? '...' : 'Thêm'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
