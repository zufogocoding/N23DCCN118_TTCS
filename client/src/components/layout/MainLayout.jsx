import React, { useState, useEffect } from "react";
import { Outlet, Link, useNavigate } from "react-router-dom";
import { usePlayer } from '../../context/PlayerContext';
import {
  Home,
  Search,
  Library,
  PlusSquare,
  Heart,
  PlayCircle,
  PauseCircle, // Đã import thêm PauseCircle
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Volume2,
  Mic2,
  ListMusic,
  Maximize2,
  MoreHorizontal,
} from "lucide-react";
import UserDropdown from "../UserDropdown";
import NotificationDropdown from "../NotificationDropdown.jsx";
import CreatePlaylistModal from "../CreatePlaylistModal";

export default function MainLayout() {
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  // Lấy các state và function từ global context
  const {
    currentSong, isPlaying, volume, currentTime, duration,
    isShuffle, isRepeat, setVolume, togglePlay, playNext, playPrev,
    handleSeek, formatTime, toggleShuffle, toggleRepeat
  } = usePlayer();
  const [userPlaylists, setUserPlaylists] = useState([]);
  const navigate = useNavigate();

  const fetchPlaylists = async () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.id) {
      try {
        const res = await fetch(`http://localhost:9000/api/playlists/user/${user.id}`);
        if (res.ok) {
          const data = await res.json();
          setUserPlaylists(data);
        }
      } catch (error) {
        console.error("Lỗi khi lấy playlist:", error);
      }
    }
  };

  useEffect(() => {
    fetchPlaylists();
  }, []);

  const handleProtectedAction = (action) => {
    const user = localStorage.getItem('user');
    if (!user) {
      navigate('/login');
    } else if (action) {
      action();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white font-sans overflow-hidden">
      {/* Modal */}
      <CreatePlaylistModal
        isOpen={isPlaylistModalOpen}
        onClose={() => setIsPlaylistModalOpen(false)}
        onSuccess={fetchPlaylists}
      />

      {/* KHU VỰC TRÊN: 3 CỘT */}
      <div className="flex flex-1 overflow-hidden">
        {/* CỘT 1: SIDEBAR TRÁI */}
        <div className="w-[240px] bg-black border-r border-[#222] flex flex-col hidden md:flex">
          <div className="p-6">
            <h1 className="text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[#00e6e6] to-[#008080]">
              SOUNDWAVE.
            </h1>
          </div>

          <nav className="flex flex-col gap-4 px-6 text-sm font-semibold text-[#a0a0a0]">
            <Link to="/" className="flex items-center gap-4 text-white hover:text-white transition-colors">
              <Home size={24} /> Trang chủ
            </Link>
            <Link to="/search" className="flex items-center gap-4 hover:text-white transition-colors">
              <Search size={24} /> Tìm kiếm
            </Link>
            <Link to="/library" className="flex items-center gap-4 hover:text-white transition-colors">
              <Library size={24} /> Thư viện
            </Link>
          </nav>

          <div className="mt-8 px-6 flex flex-col gap-4 text-sm font-semibold text-[#a0a0a0]">
            <button
              onClick={() => handleProtectedAction(() => setIsPlaylistModalOpen(true))}
              className="flex items-center gap-4 hover:text-white transition-colors"
            >
              <PlusSquare size={24} /> Tạo Playlist
            </button>
            <button 
              onClick={() => handleProtectedAction()}
              className="flex items-center gap-4 hover:text-white transition-colors text-[#00e6e6]"
            >
              <Heart size={24} className="fill-current" /> Bài hát đã thích
            </button>
          </div>

          <div className="mt-4 px-6 border-t border-[#222] pt-4 flex-1 overflow-y-auto mb-4">
 frontend-quynh
  <ul className="text-sm text-[#a0a0a0] flex flex-col gap-3">

    <li>
      <Link
        to="/playlist/chill-vibes"
        className="hover:text-white cursor-pointer truncate block"
      >
        Chill Vibes
      </Link>
    </li>

    <li>
      <Link
        to="/playlist/workout-mix"
        className="hover:text-white cursor-pointer truncate block"
      >
        Workout Mix
      </Link>
    </li>

    <li>
      <Link
        to="/playlist/lofi-coding"
        className="hover:text-white cursor-pointer truncate block"
      >
        Lofi Coding
      </Link>
    </li>

  </ul>
</div>
</div>

            <ul className="text-sm text-[#a0a0a0] flex flex-col gap-3">
              {userPlaylists.length === 0 ? (
                <li className="text-xs text-[#666]">Chưa có playlist nào.</li>
              ) : (
                userPlaylists.map(playlist => (
                  <li key={playlist.id} className="hover:text-white cursor-pointer truncate transition-colors">
                    {playlist.title}
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
 main

        {/* CỘT 2: NỘI DUNG CHÍNH Ở GIỮA */}
        <div className="flex-1 bg-[#121212] overflow-y-auto rounded-lg m-2 relative flex flex-col shadow-inner">
          {/* THANH HEADER PHẢI */}
          <div className="sticky top-0 z-50 flex items-center justify-end px-6 py-3 bg-gradient-to-b from-black/60 to-transparent backdrop-blur-md">
            <div className="flex items-center gap-2 bg-black/40 p-1 rounded-full border border-white/5">
              <NotificationDropdown />
              <UserDropdown />
            </div>
          </div>

          <div className="px-6 pb-6">
            <Outlet />
          </div>
        </div>

        {/* CỘT 3: NOW PLAYING BÊN PHẢI */}
        <div className="w-[300px] bg-black p-4 hidden lg:flex flex-col border-l border-[#222]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-sm uppercase tracking-widest text-[#00e6e6]">Đang phát</h3>
            <MoreHorizontal size={20} className="text-[#a0a0a0] cursor-pointer" />
          </div>

          <img
            src={currentSong?.coverImage || "https://images.unsplash.com/photo-1598387993441-a364f854c3e1?q=80&w=400&auto=format&fit=crop"}
            alt="Now Playing"
            className="w-full aspect-square object-cover rounded-xl mb-4 shadow-2xl shadow-[#00e6e6]/10"
          />

          <div className="flex justify-between items-start mb-4">
            <div className="overflow-hidden pr-2">
              <h2 className="font-bold text-xl hover:underline cursor-pointer truncate">
                {currentSong?.title || "Sài Gòn Đau Lòng Vãi :(((("}
              </h2>
              <p className="text-[#a0a0a0] text-sm hover:underline cursor-pointer truncate">
                {currentSong?.artist?.name || "Hứa Kim Tuyền"}
              </p>
            </div>
            <Heart
              size={20}
              className="text-[#00e6e6] fill-current mt-1 cursor-pointer shrink-0"
              onClick={() => handleProtectedAction()}
            />
          </div>

          <div className="bg-[#181818] p-4 rounded-xl mt-4 border border-[#333]">
            <h4 className="font-bold text-sm mb-2">Về nghệ sĩ</h4>
            <p className="text-xs text-[#a0a0a0] line-clamp-3 leading-relaxed">
              Hứa Kim Tuyền là một nhạc sĩ, nhà sản xuất âm nhạc nổi tiếng với
              nhiều bản hit lãng mạn, gắn liền với tâm trạng của giới trẻ...
            </p>
          </div>
        </div>
      </div>

      {/* KHU VỰC DƯỚI: THANH MUSIC PLAYER HOẠT ĐỘNG */}
      <div className="h-[95px] bg-black border-t border-[#222] flex items-center justify-between px-4 z-50">

        {/* 1. Trái: Info bài hát */}
        <div className="flex items-center gap-4 w-[30%] min-w-[180px]">
{currentSong ? (
            <>
              <img src={currentSong.coverImage || "https://images.unsplash.com/photo-1598387993441-a364f854c3e1?q=80&w=100"} alt="Cover" className="w-14 h-14 rounded-md object-cover shadow-lg" />
              <div className="hidden sm:block max-w-[180px]">
                <h4 className="font-semibold text-sm hover:underline cursor-pointer truncate">{currentSong.title}</h4>
                <p className="text-xs text-[#a0a0a0] hover:underline cursor-pointer truncate">{currentSong.artist?.name || "Unknown Artist"}</p>
              </div>
              <Heart
                onClick={() => {
                  handleProtectedAction(); 
                  setIsLiked(!isLiked);
                }}
                size={18}
                className={`cursor-pointer ml-2 transition-colors ${isLiked ? 'text-[#00e6e6] fill-current' : 'text-[#a0a0a0] hover:text-white'}`}
              />
            </>
          ) : (
            <>
              <img src="https://images.unsplash.com/photo-1598387993441-a364f854c3e1?q=80&w=100&auto=format&fit=crop" alt="Cover" className="w-14 h-14 rounded-md object-cover shadow-lg opacity-50" />
              <div className="hidden sm:block text-xs text-[#a0a0a0]">Chưa phát bài nào</div>
            </>
          )}
        </div>

        {/* 2. Giữa: Player Controls */}
        <div className="flex flex-col items-center justify-center w-[40%] max-w-[500px]">
          <div className="flex items-center gap-6 mb-2">
            <button onClick={toggleShuffle} className={`transition-colors ${isShuffle ? 'text-[#00e6e6]' : 'text-[#a0a0a0] hover:text-white'}`}>
              <Shuffle size={18} />
            </button>
            <button onClick={playPrev} className="text-[#a0a0a0] hover:text-white transition-colors">
              <SkipBack size={20} fill="currentColor" />
            </button>
            <button
              onClick={() => {
                handleProtectedAction();
                togglePlay();
              }}
              className="text-white hover:scale-105 transition-transform bg-white rounded-full p-1 shadow-lg shadow-white/5"
            >
              {isPlaying ? (
                <PauseCircle size={36} className="text-black" fill="currentColor" />
              ) : (
                <PlayCircle size={36} className="text-black" fill="currentColor" />
              )}
            </button>

            <button onClick={playNext} className="text-[#a0a0a0] hover:text-white transition-colors">
              <SkipForward size={20} fill="currentColor" />
            </button>
            <button onClick={toggleRepeat} className={`transition-colors ${isRepeat ? 'text-[#00e6e6]' : 'text-[#a0a0a0] hover:text-white'}`}>
              <Repeat size={18} />
            </button>
          </div>

          {/* Thanh tua nhạc (Progress Bar) */}
          <div className="w-full flex items-center gap-2 text-xs text-[#a0a0a0] font-mono">
            <span className="w-10 text-right">{formatTime(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={duration || 0}
              value={currentTime}
              onChange={(e) => handleSeek(Number(e.target.value))}
              className="flex-1 h-1 bg-[#333] rounded-full appearance-none cursor-pointer accent-[#00e6e6] hover:accent-[#00ffff]"
            />
            <span className="w-10 text-left">{formatTime(duration)}</span>
          </div>
        </div>

        {/* 3. Phải: Tools (Volume, Queue) */}
        <div className="flex items-center justify-end gap-3 w-[30%] min-w-[180px] text-[#a0a0a0]">
          <Mic2 size={18} className="hover:text-white cursor-pointer transition-colors" />
          <ListMusic size={18} className="hover:text-white cursor-pointer transition-colors" />
          <Volume2 size={18} className="hover:text-white cursor-pointer transition-colors" />

          {/* Thanh chỉnh âm lượng (Volume Bar) */}
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-24 h-1 bg-[#333] rounded-full appearance-none cursor-pointer accent-white hover:accent-[#00e6e6]"
          />

          <Maximize2 size={16} className="hover:text-white cursor-pointer ml-2 transition-colors" />
        </div>
      </div>
    </div>
  );
}
