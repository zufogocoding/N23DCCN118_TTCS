/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Play, Clock, MoreHorizontal, House, Heart, Trash2 } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import AddToPlaylistMenu from '../components/AddToPlaylistMenu';
import CreatePlaylistModal from '../components/CreatePlaylistModal';

// Helper: lấy tên artist từ cấu trúc API response
function getArtistName(song) {
  if (song.artists && song.artists.length > 0) {
    return song.artists.map(a => a.artist?.artistName || a.artist?.user?.username || 'Unknown').join(', ');
  }
  if (song.artistName) return song.artistName;
  return 'Unknown Artist';
}

// Helper: lấy cover art URL
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

// Format duration từ milliseconds
function formatDuration(ms) {
  if (!ms) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

const PlaylistView = () => {
  const { playlistId } = useParams();
  const navigate = useNavigate();
  const { playSong } = usePlayer();
  const [playlist, setPlaylist] = useState(null);
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLikedPage, setIsLikedPage] = useState(false);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [playlistToolbarMenuOpen, setPlaylistToolbarMenuOpen] = useState(false);
  const playlistToolbarMenuRef = useRef(null);
  const [likedSongIds, setLikedSongIds] = useState(new Set());

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const user = JSON.parse(localStorage.getItem('user') || '{}');

      if (playlistId === 'liked') {
        // Trang Liked Songs — fetch từ interaction API
        setIsLikedPage(true);
        if (user.id) {
          try {
            const res = await fetch(`http://localhost:9000/api/interactions/liked/${user.id}`);
            if (res.ok) {
              const data = await res.json();
              setSongs(data);
              setPlaylist({
                title: 'Liked Songs',
                user: { username: user.username },
                songCount: data.length,
              });
            }
          } catch (err) {
            console.error('Lỗi khi lấy liked songs:', err);
          }
        }
      } else {
        // Playlist thường — fetch từ playlist API
        setIsLikedPage(false);
        try {
          const res = await fetch(`http://localhost:9000/api/playlists/${playlistId}`);
          if (res.ok) {
            const data = await res.json();
            setPlaylist(data);
            // Trích xuất songs từ bảng trung gian PlaylistSong
            const extractedSongs = data.songs ? data.songs.map(ps => ps.song) : [];
            setSongs(extractedSongs);
          }
        } catch (err) {
          console.error('Lỗi khi lấy playlist:', err);
        }
      }
      setLoading(false);
    }
    fetchData();
  }, [playlistId]);

  // Fetch liked status for all songs
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user.id || songs.length === 0) return;
    Promise.all(
      songs.map(s =>
        fetch(`http://localhost:9000/api/interactions/like/${user.id}/${s.id}`)
          .then(r => r.ok ? r.json() : null)
          .catch(() => null)
      )
    ).then(results => {
      const liked = new Set();
      results.forEach((r, i) => { if (r?.isLiked) liked.add(songs[i].id); });
      setLikedSongIds(liked);
    });
  }, [songs]);

  useEffect(() => {
    const handleClose = (e) => {
      if (playlistToolbarMenuRef.current && !playlistToolbarMenuRef.current.contains(e.target)) {
        setPlaylistToolbarMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClose);
    return () => document.removeEventListener('mousedown', handleClose);
  }, []);

  useEffect(() => {
    setPlaylistToolbarMenuOpen(false);
  }, [playlistId]);

  const handlePlayAll = () => {
    if (songs.length === 0) return;
    const playerQueue = songs.map(s => ({
      id: s.id,
      title: s.title,
      artist: { name: getArtistName(s) },
      coverImage: getCoverArt(s),
    }));
    playSong(playerQueue[0], playerQueue);
  };

  const handlePlaySong = (song) => {
    const playerQueue = songs.map(s => ({
      id: s.id,
      title: s.title,
      artist: { name: getArtistName(s) },
      coverImage: getCoverArt(s),
    }));
    const playerSong = playerQueue.find(s => s.id === song.id) || playerQueue[0];
    playSong(playerSong, playerQueue);
  };

  const handleToggleLike = async (songId) => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user.id) { navigate('/login'); return; }
    try {
      const res = await fetch('http://localhost:9000/api/interactions/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, songId }),
      });
      if (res.ok) {
        const data = await res.json();
        setLikedSongIds(prev => {
          const next = new Set(prev);
          data.isLiked ? next.add(songId) : next.delete(songId);
          return next;
        });
      }
    } catch (err) { console.error(err); }
  };

  const handleRemoveSong = async (songId) => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user.id) return;
    try {
      const res = await fetch(`http://localhost:9000/api/playlists/${playlistId}/songs/${songId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      if (res.ok) {
        setSongs(prev => prev.filter(s => s.id !== songId));
      }
    } catch (err) { console.error(err); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00e6e6]"></div>
      </div>
    );
  }

  if (!playlist) {
    return <div className="p-10 text-white">Playlist không tồn tại!</div>;
  }

  const gradientColor = isLikedPage ? 'from-indigo-900' : 'from-[#00e6e6]/30';

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isPlaylistOwner =
    !isLikedPage &&
    playlist?.user?.id != null &&
    Number(playlist.user.id) === Number(currentUser.id);

  const copyPageLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setPlaylistToolbarMenuOpen(false);
      alert('Đã sao chép link.');
    } catch {
      alert('Trình duyệt không cho phép sao chép.');
    }
  };

  const handleDeletePlaylist = async () => {
    if (!playlist?.id || !isPlaylistOwner || isLikedPage) return;
    if (!window.confirm(`Xóa playlist "${playlist.title}"? Không thể hoàn tác.`)) return;

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user.id) {
      navigate('/login');
      return;
    }

    try {
      const res = await fetch(`http://localhost:9000/api/playlists/${playlist.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      setPlaylistToolbarMenuOpen(false);
      if (res.ok) {
        navigate('/');
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Không xóa được playlist.');
      }
    } catch {
      alert('Lỗi kết nối.');
    }
  };

  return (
    <div className={`flex-1 bg-gradient-to-b ${gradientColor} to-[#121212] overflow-y-auto min-h-screen text-white relative`}>

      {/* Modal */}
      <CreatePlaylistModal
        isOpen={isPlaylistModalOpen}
        onClose={() => setIsPlaylistModalOpen(false)}
      />

      {/* BUTTON BACK + HOME */}
      <div className="absolute top-6 left-6 flex items-center gap-4 z-50">
        <button
          onClick={() => window.history.back()}
          className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white text-lg transition-colors"
        >
          ←
        </button>
        <Link
          to="/"
          className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center transition-colors"
        >
          <House size={20} className="text-white" />
        </Link>
      </div>

      {/* Header */}
      <div className="p-8 flex items-end gap-6 bg-black/20 pt-20">
        {isLikedPage ? (
          <div className="w-52 h-52 bg-gradient-to-br from-indigo-600 to-purple-800 rounded-md shadow-2xl flex items-center justify-center">
            <Heart size={80} className="text-white fill-current" />
          </div>
        ) : (
          <div className="w-52 h-52 bg-gradient-to-br from-[#00e6e6]/20 to-[#333] rounded-md shadow-2xl flex items-center justify-center">
            <span className="text-7xl">🎵</span>
          </div>
        )}
        <div>
          <p className="text-xs font-bold uppercase">Playlist</p>
          <h1 className="text-5xl md:text-7xl font-black my-2">{playlist.title}</h1>
          <p className="text-gray-300 text-sm font-bold">
            {playlist.user?.username || 'Unknown'} • {songs.length} bài hát
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="p-8 flex items-center gap-8 relative z-10">
        <button
          onClick={handlePlayAll}
          disabled={songs.length === 0}
          className="bg-[#1ed760] w-14 h-14 rounded-full flex items-center justify-center hover:scale-105 transition shadow-lg text-black disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Play fill="black" size={28} />
        </button>
        <div className="relative" ref={playlistToolbarMenuRef}>
          <button
            type="button"
            onClick={() => setPlaylistToolbarMenuOpen((o) => !o)}
            className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Tùy chọn playlist"
            aria-expanded={playlistToolbarMenuOpen}
            aria-haspopup="menu"
          >
            <MoreHorizontal size={32} />
          </button>
          {playlistToolbarMenuOpen && (
            <div
              role="menu"
              className="absolute left-0 top-full mt-2 w-56 rounded-lg border border-[#333] bg-[#282828] py-1 shadow-2xl z-[80]"
            >
              <button
                type="button"
                role="menuitem"
                className="w-full px-4 py-2.5 text-left text-sm text-white hover:bg-white/10"
                onClick={copyPageLink}
              >
                Sao chép link
              </button>
              {!isLikedPage && isPlaylistOwner && (
                <button
                  type="button"
                  role="menuitem"
                  className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-white/10"
                  onClick={handleDeletePlaylist}
                >
                  Xóa playlist
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Danh sách bài hát */}
      <div className="px-8 pb-32">
        {songs.length === 0 ? (
          <div className="p-8 border border-dashed border-white/10 rounded-xl text-center">
            <p className="text-[#a0a0a0]">
              {isLikedPage
                ? 'Bạn chưa thích bài hát nào. Hãy nghe và nhấn ♥ để thêm!'
                : 'Playlist này chưa có bài hát nào.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="text-gray-400 text-sm border-b border-white/10 uppercase">
              <tr>
                <th className="pb-3 w-12 font-normal">#</th>
                <th className="pb-3 font-normal">Tiêu đề</th>
                <th className="pb-3 font-normal hidden md:table-cell">Artist</th>
                <th className="pb-3 font-normal text-right pr-4">
                  <div className="flex justify-end items-center gap-4">
                    <Clock size={16} />
                  </div>
                </th>
                <th className="pb-3 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {songs.map((song, index) => (
                <tr
                  key={song.id}
                  className="hover:bg-white/10 group transition-colors cursor-pointer"
                >
                  <td className="py-3 text-gray-400 group-hover:text-white" onClick={() => handlePlaySong(song)}>
                    <span className="group-hover:hidden">{index + 1}</span>
                    <Play size={14} fill="white" className="hidden group-hover:block" />
                  </td>
                  <td className="py-3" onClick={() => handlePlaySong(song)}>
                    <div className="flex items-center gap-3">
                      <img
                        src={getCoverArt(song)}
                        alt={song.title}
                        className="w-10 h-10 rounded object-cover"
                      />
                      <span className="text-white font-medium truncate max-w-[200px]">{song.title}</span>
                    </div>
                  </td>
                  <td className="py-3 text-gray-400 text-sm group-hover:text-white hidden md:table-cell">
                    {getArtistName(song)}
                  </td>
                  <td className="py-3 text-right pr-4 text-gray-400 text-sm">
                    {formatDuration(song.durationMs)}
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggleLike(song.id); }}
                        className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
                        title={likedSongIds.has(song.id) ? 'Bỏ thích' : 'Thích'}
                      >
                        <Heart
                          size={16}
                          className={`transition-colors ${likedSongIds.has(song.id) ? 'text-[#00e6e6] fill-current' : 'text-gray-400 hover:text-white'}`}
                        />
                      </button>
                      {!isLikedPage && (
                        <AddToPlaylistMenu
                          songId={song.id}
                          onCreatePlaylist={() => setIsPlaylistModalOpen(true)}
                        />
                      )}
                      {isPlaylistOwner && !isLikedPage && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRemoveSong(song.id); }}
                          className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-red-400 transition-colors"
                          title="Xóa khỏi playlist"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default PlaylistView;