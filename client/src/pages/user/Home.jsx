/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Search, Heart, Play } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import AddToPlaylistMenu from '../../components/AddToPlaylistMenu';
import CreatePlaylistModal from '../../components/CreatePlaylistModal';
import UploadButton from "../../components/layout/UploadButton";

// Helper: lấy tên artist từ cấu trúc API response
function getArtistName(song) {
  if (song.artists && song.artists.length > 0) {
    return song.artists.map(a => a.artist?.artistName || a.artist?.user?.username || 'Unknown').join(', ');
  }
  return 'Unknown Artist';
}

// Helper: lấy cover art URL
function getCoverArt(song) {
  if (song.coverArtUrl) {
    return song.coverArtUrl.startsWith('http') ? song.coverArtUrl : `http://localhost:9000${song.coverArtUrl}`;
  }
  // Fallback dựa trên ID
  const fallbacks = [
    'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=400&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=400&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=400&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=400&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1598387993441-a364f854c3e1?q=80&w=400&auto=format&fit=crop',
  ];
  return fallbacks[(song.id - 1) % fallbacks.length];
}


export default function Home() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const navigate = useNavigate();
  const { playSong } = usePlayer();

  const [songs, setSongs] = useState([]);
  const [userPlaylists, setUserPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);

  // Fetch songs từ API (chỉ lấy bài đã approved)
  useEffect(() => {
    async function fetchData() {
      try {
        const [songsRes, playlistsRes] = await Promise.all([
          fetch('http://localhost:9000/api/songs'),
          user.id ? fetch(`http://localhost:9000/api/playlists/user/${user.id}`) : Promise.resolve(null)
        ]);

        if (songsRes.ok) {
          const data = await songsRes.json();
          setSongs(data);
        }

        if (playlistsRes && playlistsRes.ok) {
          const plData = await playlistsRes.json();
          setUserPlaylists(plData);
        }
      } catch (err) {
        console.error('Lỗi khi tải dữ liệu:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleProtectedAction = (action) => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      navigate('/login');
    } else if (action) {
      action();
    }
  };

  const handlePlaySong = (song) => {
    handleProtectedAction(() => {
      const playerSong = {
        id: song.id,
        title: song.title,
        artist: { name: getArtistName(song) },
        coverImage: getCoverArt(song),
      };
      const playerQueue = songs.map(s => ({
        id: s.id,
        title: s.title,
        artist: { name: getArtistName(s) },
        coverImage: getCoverArt(s),
      }));
      playSong(playerSong, playerQueue);
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Modal tạo playlist */}
      <CreatePlaylistModal
        isOpen={isPlaylistModalOpen}
        onClose={() => setIsPlaylistModalOpen(false)}
      />

      {/* HEADER BÊN TRONG CỘT GIỮA */}
      <div className="sticky top-0 bg-[#121212]/90 backdrop-blur-md z-10 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <button className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-[#a0a0a0] cursor-not-allowed">
              <ChevronLeft size={20} />
            </button>
            <button className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-[#a0a0a0] cursor-not-allowed">
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="relative w-[300px] hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black" size={18} />
            <input
              type="text"
              placeholder="What do you want to listen to?"
              className="w-full py-2 pl-10 pr-4 rounded-full bg-white text-black text-sm outline-none font-medium"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <UploadButton />
        </div>
      </div>

      {/* CONTENT */}
      <div className="p-6 pt-0 flex-1 overflow-y-auto">

        {/* Greeting */}
        <div className="mt-8 mb-6">
          <h1 className="text-4xl font-black text-[#5e9ca0] mb-1 uppercase tracking-wider">
            {user.username ? 'Welcome Back' : 'Welcome to Soundwave'}
          </h1>
          {user.username && <h2 className="text-xl font-bold">{user.username}</h2>}
        </div>

        {/* Section: My Library - User Playlists từ DB */}
        {user.id && (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[#b83280]">My Library</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {/* Liked Songs Card */}
              <div
                onClick={() => navigate('/playlist/liked')}
                className="bg-[#181818] p-4 rounded-xl hover:bg-[#282828] transition-colors cursor-pointer group"
              >
                <div className="w-full aspect-square bg-gradient-to-br from-indigo-600 to-purple-800 rounded-md mb-4 shadow-lg flex items-center justify-center">
                  <Heart size={48} className="text-white fill-current" />
                </div>
                <h3 className="font-bold truncate text-white">Liked Songs</h3>
              </div>

              {/* User playlists từ DB */}
              {userPlaylists.map(pl => (
                <div
                  key={pl.id}
                  onClick={() => navigate(`/playlist/${pl.id}`)}
                  className="bg-[#181818] p-4 rounded-xl hover:bg-[#282828] transition-colors cursor-pointer group"
                >
                  <div className="w-full aspect-square bg-gradient-to-br from-[#00e6e6]/20 to-[#333] rounded-md mb-4 shadow-lg flex items-center justify-center">
                    <span className="text-4xl">🎵</span>
                  </div>
                  <h3 className="font-bold truncate text-white">{pl.title}</h3>
                  <p className="text-xs text-[#a0a0a0] mt-1">{pl._count?.songs || 0} bài hát</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section: All Songs (từ DB - chỉ hiện bài approved) */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">
              {songs.length > 0 ? 'Trending Songs' : 'Bài hát'}
            </h2>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#00e6e6]"></div>
            </div>
          ) : songs.length === 0 ? (
            <div className="p-8 border border-dashed border-[#333] rounded-xl text-center">
              <p className="text-[#a0a0a0] font-medium">Chưa có bài hát nào trong hệ thống.</p>
              <p className="text-xs text-[#666] mt-2">Hãy upload bài hát qua trang Upload.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-5">
              {songs.map(song => (
                <div
                  key={song.id}
                  className="bg-[#181818] p-4 rounded-xl hover:bg-[#282828] transition-colors cursor-pointer group relative"
                >
                  {/* Cover image + Play overlay */}
                  <div className="relative mb-4" onClick={() => handlePlaySong(song)}>
                    <img
                      src={getCoverArt(song)}
                      className="w-full aspect-square object-cover rounded-md shadow-lg"
                      alt={song.title}
                    />
                    <button className="absolute bottom-2 right-2 w-12 h-12 rounded-full bg-[#1ed760] flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                      <Play size={24} fill="black" color="black" className="ml-0.5" />
                    </button>
                  </div>

                  {/* Song info */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1" onClick={() => handlePlaySong(song)}>
                      <h3 className="font-bold text-white truncate text-base mb-1">{song.title}</h3>
                      <p className="text-sm text-[#a0a0a0] truncate">{getArtistName(song)}</p>
                    </div>
                    {/* Add to Playlist button */}
                    {user.id && (
                      <AddToPlaylistMenu
                        songId={song.id}
                        onCreatePlaylist={() => setIsPlaylistModalOpen(true)}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}