import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Play,
  ArrowLeft,
  Link as LinkIcon,
  Heart,
  Edit2,
  X,
  Plus,
  Trash2,
  Loader2,
  UserPlus,
  UserMinus,
} from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import AddToPlaylistMenu from '../../components/AddToPlaylistMenu';
import { authHeaders } from '../../utils/api';

function getCoverArt(song) {
  if (song.coverArtUrl) {
    return song.coverArtUrl.startsWith('http') ? song.coverArtUrl : `http://localhost:9000${song.coverArtUrl}`;
  }
  const fallbacks = [
    'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=400&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=400&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=400&auto=format&fit=crop',
  ];
  return fallbacks[(song.id - 1) % fallbacks.length];
}

function formatDuration(ms) {
  if (!ms) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

const getSocialIcon = () => <LinkIcon size={20} />;

function displayArtistName(profile) {
  return profile?.artist?.artistName || profile?.displayName || profile?.username || 'Nghệ sĩ';
}

export default function ArtistProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { playSong } = usePlayer();

  const [profile, setProfile] = useState(null);
  const [topSongs, setTopSongs] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [discography, setDiscography] = useState({ songs: [], total: 0, page: 1, limit: 20 });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [likedSongIds, setLikedSongIds] = useState(new Set());
  const [followBusy, setFollowBusy] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateAlbumOpen, setIsCreateAlbumOpen] = useState(false);
  const [newAlbumTitle, setNewAlbumTitle] = useState('');
  const [createAlbumBusy, setCreateAlbumBusy] = useState(false);

  const [editForm, setEditForm] = useState({
    bio: '',
    artistBio: '',
    socialLinks: [],
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const avatarInputRef = useRef(null);
  const bannerInputRef = useRef(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchArtistData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:9000/api/artists/${id}`, {
        headers: authHeaders(false),
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        setTopSongs(data.topSongs || []);
        setAlbums(data.albums || []);
        setDiscography(
          data.discography || { songs: [], total: 0, page: 1, limit: 20 }
        );
      } else {
        setProfile(null);
        setTopSongs([]);
        setAlbums([]);
        setDiscography({ songs: [], total: 0, page: 1, limit: 20 });
      }
    } catch (err) {
      console.error(err);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchArtistData();
  }, [fetchArtistData]);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user.id || topSongs.length === 0) return;
    Promise.all(
      topSongs.map((s) =>
        fetch(`http://localhost:9000/api/interactions/like/${user.id}/${s.id}`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
      )
    ).then((results) => {
      const liked = new Set();
      results.forEach((r, i) => {
        if (r?.isLiked) liked.add(topSongs[i].id);
      });
      setLikedSongIds(liked);
    });
  }, [topSongs]);

  const artistDisplayName = displayArtistName(profile);

  const handlePlaySong = (song, queueSource) => {
    const list = queueSource || topSongs;
    const playerQueue = list.map((s) => ({
      id: s.id,
      title: s.title,
      artist: { name: artistDisplayName },
      coverImage: getCoverArt(s),
    }));
    const playerSong = playerQueue.find((s) => s.id === song.id) || playerQueue[0];
    if (playerSong) playSong(playerSong, playerQueue);
  };

  const handlePlayAll = () => {
    if (topSongs.length === 0) return;
    handlePlaySong(topSongs[0], topSongs);
  };

  const handleToggleLike = async (songId) => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user.id) {
      navigate('/login');
      return;
    }
    try {
      const res = await fetch('http://localhost:9000/api/interactions/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, songId }),
      });
      if (res.ok) {
        const data = await res.json();
        setLikedSongIds((prev) => {
          const next = new Set(prev);
          if (data.isLiked) next.add(songId);
          else next.delete(songId);
          return next;
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFollowToggle = async () => {
    if (!currentUser.id) {
      navigate('/login');
      return;
    }
    if (currentUser.id === parseInt(id, 10)) return;
    setFollowBusy(true);
    try {
      const method = profile.isFollowing ? 'DELETE' : 'POST';
      const res = await fetch(`http://localhost:9000/api/artists/${id}/follow`, {
        method,
        headers: authHeaders(false),
      });
      if (res.ok) {
        await fetchArtistData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFollowBusy(false);
    }
  };

  const handleOpenEditModal = () => {
    setEditForm({
      bio: profile.bio || '',
      artistBio: profile.artist?.artistBio || '',
      socialLinks: Array.isArray(profile.socialLinks) ? [...profile.socialLinks] : [],
    });
    // Set existing image previews
    const existingAvatar = profile.artist?.avatarUrl || profile.avatarUrl;
    setAvatarPreview(existingAvatar ? (existingAvatar.startsWith('http') ? existingAvatar : `http://localhost:9000${existingAvatar}`) : null);
    setAvatarFile(null);
    const existingBanner = profile.artist?.bannerUrl || profile.coverImageUrl;
    setBannerPreview(existingBanner ? (existingBanner.startsWith('http') ? existingBanner : `http://localhost:9000${existingBanner}`) : null);
    setBannerFile(null);
    setIsEditModalOpen(true);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleBannerChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBannerFile(file);
      setBannerPreview(URL.createObjectURL(file));
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('bio', editForm.bio);
      formData.append('artistBio', editForm.artistBio);
      formData.append('socialLinks', JSON.stringify(editForm.socialLinks));
      if (avatarFile) formData.append('avatarFile', avatarFile);
      if (bannerFile) formData.append('bannerFile', bannerFile);

      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:9000/api/artists/${id}/profile`, {
        method: 'PUT',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
      });

      if (res.ok) {
        setIsEditModalOpen(false);
        fetchArtistData();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || 'Cập nhật thất bại');
      }
    } catch (error) {
      console.error(error);
      alert('Lỗi khi cập nhật');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAlbum = async (e) => {
    e.preventDefault();
    if (!newAlbumTitle.trim()) return;
    setCreateAlbumBusy(true);
    try {
      const res = await fetch('http://localhost:9000/api/albums', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ title: newAlbumTitle.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setIsCreateAlbumOpen(false);
        setNewAlbumTitle('');
        if (data.album?.id) navigate(`/album/${data.album.id}`);
        else fetchArtistData();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Không tạo được album');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreateAlbumBusy(false);
    }
  };

  const loadMoreDiscography = async () => {
    if (loadingMore) return;
    const nextPage = discography.page + 1;
    const limit = discography.limit || 20;
    setLoadingMore(true);
    try {
      const res = await fetch(
        `http://localhost:9000/api/artists/${id}?songsPage=${nextPage}&songsLimit=${limit}`,
        { headers: authHeaders(false) }
      );
      if (res.ok) {
        const data = await res.json();
        setDiscography((prev) => ({
          total: data.discography?.total ?? prev.total,
          limit: data.discography?.limit ?? prev.limit,
          page: nextPage,
          songs: [...prev.songs, ...(data.discography?.songs || [])],
        }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSocialLinkChange = (index, value) => {
    const newLinks = [...editForm.socialLinks];
    newLinks[index] = value;
    setEditForm({ ...editForm, socialLinks: newLinks });
  };

  const handleAddSocialLink = () => {
    if (editForm.socialLinks.length < 5) {
      setEditForm({ ...editForm, socialLinks: [...editForm.socialLinks, ''] });
    }
  };

  const handleRemoveSocialLink = (index) => {
    const newLinks = editForm.socialLinks.filter((_, i) => i !== index);
    setEditForm({ ...editForm, socialLinks: newLinks });
  };

  if (loading) {
    return (
      <div className="flex-1 bg-[#121212] flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00e6e6]" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-10 text-white min-h-screen bg-[#121212]">Không tìm thấy nghệ sĩ!</div>
    );
  }

  const banner =
    profile.artist?.bannerUrl || profile.coverImageUrl
      ? (profile.artist?.bannerUrl || profile.coverImageUrl).startsWith('http')
        ? profile.artist?.bannerUrl || profile.coverImageUrl
        : `http://localhost:9000${profile.artist?.bannerUrl || profile.coverImageUrl}`
      : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=1200&auto=format&fit=crop';

  const avatarUrl = profile.artist?.avatarUrl || profile.avatarUrl
    ? (profile.artist?.avatarUrl || profile.avatarUrl).startsWith('http')
      ? profile.artist?.avatarUrl || profile.avatarUrl
      : `http://localhost:9000${profile.artist?.avatarUrl || profile.avatarUrl}`
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(artistDisplayName)}&background=random`;

  const bioText = profile.artist?.artistBio || profile.bio;
  const followerCount = profile.followerCount ?? 0;
  const canLoadMore =
    discography.songs.length < (discography.total || 0);

  return (
    <div className="flex-1 bg-[#121212] overflow-y-auto min-h-screen text-white relative">
      <div className="absolute top-6 left-6 z-50">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      <div className="relative h-80 md:h-96 flex items-end">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${banner})` }}>
          <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/60 to-transparent" />
        </div>

        <div className="relative z-10 p-8 flex items-end gap-6 w-full flex-wrap">
          <img
            src={avatarUrl}
            alt={artistDisplayName}
            className="w-40 h-40 md:w-52 md:h-52 rounded-full object-cover shadow-2xl border-4 border-[#121212]"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-white/80 mb-2">
              {profile.artist?.verifiedTick ? (
                <>
                  <svg className="w-5 h-5 text-[#00e6e6]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-4-4 1.41-1.41L11 14.17l6.59-6.59L19 9l-8 8z" />
                  </svg>
                  Nghệ sĩ xác minh
                </>
              ) : (
                'Nghệ sĩ'
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <h1 className="text-4xl md:text-7xl font-black">{artistDisplayName}</h1>
              {currentUser.id === parseInt(id, 10) && (
                <button
                  type="button"
                  onClick={handleOpenEditModal}
                  className="p-3 bg-black/40 hover:bg-black/60 rounded-full text-white transition-colors border border-white/20"
                  title="Sửa hồ sơ"
                >
                  <Edit2 size={24} />
                </button>
              )}
            </div>

            <p className="text-white/60 text-sm mb-3">
              {followerCount.toLocaleString()} người theo dõi
            </p>

            {currentUser.id !== parseInt(id, 10) && (
              <button
                type="button"
                disabled={followBusy}
                onClick={handleFollowToggle}
                className={`inline-flex items-center gap-2 px-6 py-2 rounded-full font-bold text-sm transition ${
                  profile.isFollowing
                    ? 'bg-transparent border border-white/40 text-white hover:border-white'
                    : 'bg-[#1ed760] text-black hover:scale-105'
                }`}
              >
                {followBusy ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : profile.isFollowing ? (
                  <>
                    <UserMinus size={18} /> Đang theo dõi
                  </>
                ) : (
                  <>
                    <UserPlus size={18} /> Theo dõi
                  </>
                )}
              </button>
            )}

            {bioText && (
              <p className="text-white/70 max-w-2xl line-clamp-3 text-sm md:text-base mt-4">{bioText}</p>
            )}

            {profile.socialLinks && profile.socialLinks.length > 0 && (
              <div className="flex items-center gap-3 mt-4">
                {profile.socialLinks.map((link, idx) => (
                  <a
                    key={idx}
                    href={link}
                    target="_blank"
                    rel="noreferrer"
                    className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                  >
                    {getSocialIcon()}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-8 pb-4 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={handlePlayAll}
          disabled={topSongs.length === 0}
          className="bg-[#1ed760] w-14 h-14 rounded-full flex items-center justify-center hover:scale-105 transition shadow-lg text-black disabled:opacity-50"
        >
          <Play fill="black" size={28} />
        </button>
        {currentUser.id === parseInt(id, 10) && currentUser.isArtist && (
          <>
            <Link
              to="/release/new"
              className="px-5 py-2 rounded-full border border-white/30 text-sm font-bold hover:bg-white/10"
            >
              New Release
            </Link>
            <Link
              to="/upload-song"
              className="px-5 py-2 rounded-full bg-white/10 text-sm font-bold hover:bg-white/20"
            >
              Upload bài hát
            </Link>
          </>
        )}
      </div>

      {/* Albums */}
      <div className="px-8 pb-10">
        <h2 className="text-2xl font-bold mb-4">Album</h2>
        {albums.length === 0 ? (
          <p className="text-[#a0a0a0] text-sm">Chưa có album nào.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {albums.map((al) => {
              const cov = al.coverArtUrl
                ? al.coverArtUrl.startsWith('http')
                  ? al.coverArtUrl
                  : `http://localhost:9000${al.coverArtUrl}`
                : 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=400&auto=format&fit=crop';
              return (
                <Link
                  key={al.id}
                  to={currentUser.id === parseInt(id, 10) ? `/release/${al.id}` : `/album/${al.id}`}
                  className="bg-[#181818] p-4 rounded-xl hover:bg-[#282828] transition group"
                >
                  <img src={cov} alt="" className="w-full aspect-square object-cover rounded-md mb-3 shadow-lg" />
                  <h3 className="font-bold truncate">{al.title}</h3>
                  <p className="text-xs text-[#a0a0a0]">{al.tracks?.length ?? 0} bài</p>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Popular */}
      <div className="px-8 pb-10">
        <h2 className="text-2xl font-bold mb-6">Phổ biến</h2>
        {topSongs.length === 0 ? (
          <div className="p-8 text-center text-[#a0a0a0]">Nghệ sĩ này chưa có bài hát nào.</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <tbody>
              {topSongs.map((song, index) => (
                <tr
                  key={song.id}
                  className="hover:bg-white/10 group transition-colors cursor-pointer rounded-lg"
                >
                  <td
                    className="py-3 px-4 w-12 text-gray-400 group-hover:text-white rounded-l-lg"
                    onClick={() => handlePlaySong(song, topSongs)}
                  >
                    <span className="group-hover:hidden text-base">{index + 1}</span>
                    <Play size={16} fill="white" className="hidden group-hover:block" />
                  </td>
                  <td className="py-3 px-2" onClick={() => handlePlaySong(song, topSongs)}>
                    <div className="flex items-center gap-4">
                      <img
                        src={getCoverArt(song)}
                        alt={song.title}
                        className="w-12 h-12 rounded object-cover shadow-md"
                      />
                      <span className="text-white font-medium text-base truncate max-w-[300px]">{song.title}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-right text-gray-400 text-sm hidden md:table-cell">
                    {song.playCount.toLocaleString()} lượt nghe
                  </td>
                  <td className="py-3 px-4 text-right text-gray-400 text-sm hidden sm:table-cell">
                    {formatDuration(song.durationMs)}
                  </td>
                  <td className="py-3 px-4 w-24 rounded-r-lg">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleLike(song.id);
                        }}
                        className="p-2 rounded-full hover:bg-white/10 transition-colors"
                      >
                        <Heart
                          size={18}
                          className={`transition-colors ${
                            likedSongIds.has(song.id) ? 'text-[#1ed760] fill-current' : 'text-gray-400 hover:text-white'
                          }`}
                        />
                      </button>
                      <AddToPlaylistMenu songId={song.id} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Discography */}
      <div className="px-8 pb-32">
        <h2 className="text-2xl font-bold mb-6">Bài phát hành</h2>
        {discography.songs.length === 0 ? (
          <p className="text-[#a0a0a0]">Chưa có bài trong danh mục công khai.</p>
        ) : (
          <>
            <table className="w-full text-left border-collapse">
              <tbody>
                {discography.songs.map((song) => (
                  <tr key={song.id} className="hover:bg-white/10 group transition-colors">
                    <td className="py-2 px-2 w-10 text-gray-500">
                      <Play
                        size={14}
                        className="opacity-0 group-hover:opacity-100 cursor-pointer"
                        onClick={() => handlePlaySong(song, discography.songs)}
                      />
                    </td>
                    <td className="py-2 px-2 cursor-pointer" onClick={() => handlePlaySong(song, discography.songs)}>
                      <div className="flex items-center gap-3">
                        <img src={getCoverArt(song)} alt="" className="w-10 h-10 rounded object-cover" />
                        <span className="font-medium truncate">{song.title}</span>
                      </div>
                    </td>
                    <td className="py-2 px-2 text-right text-gray-400 text-sm">{formatDuration(song.durationMs)}</td>
                    <td className="py-2 px-2 w-20">
                      <AddToPlaylistMenu songId={song.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {canLoadMore && (
              <button
                type="button"
                disabled={loadingMore}
                onClick={loadMoreDiscography}
                className="mt-6 px-6 py-2 rounded-full border border-white/20 text-sm font-semibold hover:bg-white/10 disabled:opacity-50"
              >
                {loadingMore ? 'Đang tải...' : 'Xem thêm'}
              </button>
            )}
          </>
        )}
      </div>

      {/* Create album modal */}
      {isCreateAlbumOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#121212] border border-[#333] rounded-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Tạo album mới</h2>
            <form onSubmit={handleCreateAlbum} className="space-y-4">
              <input
                value={newAlbumTitle}
                onChange={(e) => setNewAlbumTitle(e.target.value)}
                placeholder="Tên album"
                className="w-full bg-black border border-[#333] rounded-xl px-4 py-3 text-white"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateAlbumOpen(false)}
                  className="px-4 py-2 rounded-lg text-[#a0a0a0]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={createAlbumBusy}
                  className="px-4 py-2 rounded-lg bg-[#00e6e6] text-black font-bold disabled:opacity-50"
                >
                  {createAlbumBusy ? '...' : 'Tạo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#121212] border border-[#333] rounded-2xl w-full max-w-xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#333] bg-black/50 shrink-0">
              <h2 className="text-xl font-bold">Sửa Hồ Sơ</h2>
              <button type="button" onClick={() => setIsEditModalOpen(false)} className="text-[#666] hover:text-white">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 overflow-y-auto flex-1">
              <div className="space-y-5">
                {/* Image uploads */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Avatar upload */}
                  <div>
                    <label className="block mb-2 text-sm font-medium text-[#a0a0a0]">Ảnh đại diện</label>
                    <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                    <div
                      onClick={() => avatarInputRef.current?.click()}
                      className="relative border-2 border-dashed border-[#333] hover:border-[#00e6e6]/50 rounded-xl h-40 flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden group"
                    >
                      {avatarPreview ? (
                        <>
                          <img src={avatarPreview} alt="Avatar" className="absolute inset-0 w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Edit2 size={20} className="text-white" />
                            <span className="text-sm text-white ml-2 font-medium">Đổi ảnh</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-10 h-10 rounded-full bg-[#00e6e6]/10 flex items-center justify-center mb-2">
                            <Plus size={20} className="text-[#00e6e6]" />
                          </div>
                          <p className="text-xs text-[#666]">Chọn ảnh</p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Banner upload */}
                  <div>
                    <label className="block mb-2 text-sm font-medium text-[#a0a0a0]">Ảnh banner</label>
                    <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
                    <div
                      onClick={() => bannerInputRef.current?.click()}
                      className="relative border-2 border-dashed border-[#333] hover:border-[#00e6e6]/50 rounded-xl h-40 flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden group"
                    >
                      {bannerPreview ? (
                        <>
                          <img src={bannerPreview} alt="Banner" className="absolute inset-0 w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Edit2 size={20} className="text-white" />
                            <span className="text-sm text-white ml-2 font-medium">Đổi ảnh</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-10 h-10 rounded-full bg-[#00e6e6]/10 flex items-center justify-center mb-2">
                            <Plus size={20} className="text-[#00e6e6]" />
                          </div>
                          <p className="text-xs text-[#666]">Chọn ảnh</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium text-[#a0a0a0]">Bio (hồ sơ user)</label>
                  <textarea
                    value={editForm.bio}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    className="w-full bg-black border border-[#333] rounded-xl px-4 py-3 text-sm text-white min-h-[80px]"
                  />
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-[#a0a0a0]">Tiểu sử nghệ sĩ (Artist)</label>
                  <textarea
                    value={editForm.artistBio}
                    onChange={(e) => setEditForm({ ...editForm, artistBio: e.target.value })}
                    className="w-full bg-black border border-[#333] rounded-xl px-4 py-3 text-sm text-white min-h-[80px]"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-[#a0a0a0]">Social Links ({editForm.socialLinks.length}/5)</label>
                    {editForm.socialLinks.length < 5 && (
                      <button
                        type="button"
                        onClick={handleAddSocialLink}
                        className="text-xs font-semibold text-[#00e6e6] flex items-center gap-1"
                      >
                        <Plus size={14} /> Thêm
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    {editForm.socialLinks.map((link, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="url"
                          value={link}
                          onChange={(e) => handleSocialLinkChange(index, e.target.value)}
                          className="flex-1 bg-black border border-[#333] rounded-lg px-3 py-2 text-sm text-white"
                          placeholder="https://..."
                        />
                        <button type="button" onClick={() => handleRemoveSocialLink(index)} className="p-2 text-[#a0a0a0]">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-8">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-5 py-2.5 text-[#a0a0a0]">
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-black bg-[#00e6e6] disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 size={18} className="animate-spin" />}
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
