import React, { useState, useEffect } from "react";
import { Outlet, Link, useNavigate } from "react-router-dom";
import { usePlayer } from "../../context/PlayerContext";

import {
  Home,
  Search,
  Library,
  PlusSquare,
  Heart,
  PlayCircle,
  PauseCircle,
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
  const [userPlaylists, setUserPlaylists] = useState([]);

  const navigate = useNavigate();

  const {
    currentSong,
    isPlaying,
    volume,
    currentTime,
    duration,
    isShuffle,
    isRepeat,
    setVolume,
    togglePlay,
    playNext,
    playPrev,
    handleSeek,
    formatTime,
    toggleShuffle,
    toggleRepeat,
  } = usePlayer();

  const fetchPlaylists = async () => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    if (user.id) {
      try {
        const res = await fetch(
          `http://localhost:9000/api/playlists/user/${user.id}`
        );

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
    const user = localStorage.getItem("user");

    if (!user) {
      navigate("/login");
    } else if (action) {
      action();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white font-sans overflow-hidden">

      <CreatePlaylistModal
        isOpen={isPlaylistModalOpen}
        onClose={() => setIsPlaylistModalOpen(false)}
        onSuccess={fetchPlaylists}
      />

      <div className="flex flex-1 overflow-hidden">

        {/* LEFT SIDEBAR */}
        <div className="w-[240px] bg-black border-r border-[#222] flex flex-col hidden md:flex">

          <div className="p-6">
            <h1 className="text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[#00e6e6] to-[#008080]">
              SOUNDWAVE.
            </h1>
          </div>

          <nav className="flex flex-col gap-4 px-6 text-sm font-semibold text-[#a0a0a0]">

            <Link
              to="/"
              className="flex items-center gap-4 text-white"
            >
              <Home size={24} />
              Trang chủ
            </Link>

            <Link
              to="/search"
              className="flex items-center gap-4 hover:text-white transition-colors"
            >
              <Search size={24} />
              Tìm kiếm
            </Link>

            <Link
              to="/library"
              className="flex items-center gap-4 hover:text-white transition-colors"
            >
              <Library size={24} />
              Thư viện
            </Link>

          </nav>

          <div className="mt-8 px-6 flex flex-col gap-4 text-sm font-semibold text-[#a0a0a0]">

            <button
              onClick={() =>
                handleProtectedAction(() =>
                  setIsPlaylistModalOpen(true)
                )
              }
              className="flex items-center gap-4 hover:text-white transition-colors"
            >
              <PlusSquare size={24} />
              Tạo Playlist
            </button>

            <button
              onClick={() => handleProtectedAction()}
              className="flex items-center gap-4 hover:text-white transition-colors text-[#00e6e6]"
            >
              <Heart size={24} className="fill-current" />
              Bài hát đã thích
            </button>

          </div>

          <div className="mt-4 px-6 border-t border-[#222] pt-4 flex-1 overflow-y-auto mb-4">

            <ul className="text-sm text-[#a0a0a0] flex flex-col gap-3">

              {userPlaylists.length === 0 ? (
                <li className="text-xs text-[#666]">
                  Chưa có playlist nào.
                </li>
              ) : (
                userPlaylists.map((playlist) => (
                  <li
                    key={playlist.id}
                    className="hover:text-white cursor-pointer truncate transition-colors"
                  >
                    {playlist.title}
                  </li>
                ))
              )}

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

        {/* MAIN CONTENT */}
        <div className="flex-1 bg-[#121212] overflow-y-auto rounded-lg m-2 relative flex flex-col shadow-inner">

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

      </div>
    </div>
  );
}