/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useRef, useCallback } from "react";
import { Outlet, Link, useNavigate } from "react-router-dom";
import { usePlayer } from "../../context/PlayerContext";

import {
  Home,
  Search,
  Library,
  PlusSquare,
  Heart,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Volume2,
  VolumeX,
  Mic2,
  Music,
  MoreHorizontal,
} from "lucide-react";

import UserDropdown from "../UserDropdown";
import NotificationDropdown from "../NotificationDropdown.jsx";
import CreatePlaylistModal from "../CreatePlaylistModal";
import AddToPlaylistMenu from "../AddToPlaylistMenu";

function formatPlayerClock(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

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
    toggleShuffle,
    toggleRepeat,
  } = usePlayer();

  const progressBarRef = useRef(null);
  const seekingRef = useRef(false);

  const seekFromClientX = useCallback(
    (clientX) => {
      const el = progressBarRef.current;
      if (!el || !Number.isFinite(duration) || duration <= 0) return;
      const rect = el.getBoundingClientRect();
      const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      handleSeek(pct * duration);
    },
    [duration, handleSeek]
  );

  useEffect(() => {
    const onMove = (e) => {
      if (!seekingRef.current) return;
      seekFromClientX(e.clientX);
    };
    const onUp = () => {
      seekingRef.current = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [seekFromClientX]);

  const progressPct =
    Number.isFinite(duration) && duration > 0
      ? Math.min(100, Math.max(0, (currentTime / duration) * 100))
      : 0;

  const [nowPlayingMenuOpen, setNowPlayingMenuOpen] = useState(false);
  const nowPlayingMenuRef = useRef(null);

  useEffect(() => {
    const handleClose = (e) => {
      if (nowPlayingMenuRef.current && !nowPlayingMenuRef.current.contains(e.target)) {
        setNowPlayingMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClose);
    return () => document.removeEventListener("mousedown", handleClose);
  }, []);

  useEffect(() => {
    setNowPlayingMenuOpen(false);
  }, [currentSong?.id]);

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
      } catch (error) { console.error(error);
        console.error("Lỗi khi lấy playlist:", error);
      }
    }
  };

  useEffect(() => {
    fetchPlaylists();
  }, []);

  useEffect(() => {
    if (!currentSong?.id) {
      setIsLiked(false);
      return;
    }
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user.id) {
      setIsLiked(false);
      return;
    }
    let cancelled = false;
    fetch(`http://localhost:9000/api/interactions/like/${user.id}/${currentSong.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setIsLiked(!!data.isLiked);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [currentSong?.id]);

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


          </div>

          <div className="mt-4 px-6 border-t border-[#222] pt-4 flex-1 overflow-y-auto mb-4">

            <Link
              to="/playlist/liked"
              className="flex items-center gap-4 hover:text-white transition-colors text-[#00e6e6] mb-4"
            >
              <Heart size={24} className="fill-current" /> Bài hát đã thích
            </Link>

            <ul className="text-sm text-[#a0a0a0] flex flex-col gap-3">

              {userPlaylists.length === 0 ? (
                <li className="text-xs text-[#666]">
                  Chưa có playlist nào.
                </li>
              ) : (
                userPlaylists.map(playlist => (
                  <li key={playlist.id}>
                    <Link
                      to={`/playlist/${playlist.id}`}
                      className="hover:text-white cursor-pointer truncate transition-colors block"
                    >
                      {playlist.title}
                    </Link>
                  </li>
                ))
              )}

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

        {/* CỘT 3: NOW PLAYING BÊN PHẢI */}
        <div className="w-[300px] bg-black p-4 hidden lg:flex flex-col border-l border-[#222]">
          <div className="flex justify-between items-center mb-6 relative z-20" ref={nowPlayingMenuRef}>
            <h3 className="font-bold text-sm uppercase tracking-widest text-[#00e6e6]">Đang phát</h3>
            <button
              type="button"
              onClick={() => setNowPlayingMenuOpen((o) => !o)}
              className="p-1.5 rounded-full text-[#a0a0a0] hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Tùy chọn đang phát"
              aria-expanded={nowPlayingMenuOpen}
              aria-haspopup="menu"
            >
              <MoreHorizontal size={20} />
            </button>
            {nowPlayingMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-1 w-52 rounded-lg border border-[#333] bg-[#282828] py-1 shadow-2xl z-[80]"
              >
                <button
                  type="button"
                  role="menuitem"
                  disabled={!currentSong}
                  className="w-full px-4 py-2.5 text-left text-sm text-white hover:bg-white/10 disabled:pointer-events-none disabled:opacity-40"
                  onClick={() => {
                    setNowPlayingMenuOpen(false);
                    if (currentSong) navigate(`/song/${currentSong.id}`);
                  }}
                >
                  Xem trang bài hát
                </button>
              </div>
            )}
          </div>

          <img
            src={currentSong?.coverImage || "https://images.unsplash.com/photo-1598387993441-a364f854c3e1?q=80&w=400&auto=format&fit=crop"}
            alt="Now Playing"
            className="w-full aspect-square object-cover rounded-xl mb-4 shadow-2xl shadow-[#00e6e6]/10"
          />

          <div className="flex justify-between items-start mb-4">
            <div className="overflow-hidden pr-2">
              <h2 className="font-bold text-xl hover:underline cursor-pointer truncate">
                {currentSong?.title || "Chưa phát bài nào"}
              </h2>
              <p className="text-[#a0a0a0] text-sm hover:underline cursor-pointer truncate">
                {currentSong?.artist?.name || "Nghệ sĩ"}
              </p>
            </div>
            <div className="flex items-center gap-2 mt-1 shrink-0">
              <Heart
                size={20}
                className={`cursor-pointer transition-colors ${isLiked ? "text-[#00e6e6] fill-current" : "text-[#a0a0a0] hover:text-white"}`}
                onClick={() => {
                  if (!currentSong) return;
                  const user = JSON.parse(localStorage.getItem("user") || "{}");
                  if (!user.id) { navigate("/login"); return; }
                  fetch("http://localhost:9000/api/interactions/like", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId: user.id, songId: currentSong.id }),
                  })
                    .then((r) => r.json())
                    .then((data) => setIsLiked(data.isLiked))
                    .catch((err) => console.error(err));
                }}
              />
              {currentSong && (
                <AddToPlaylistMenu
                  songId={currentSong.id}
                  onCreatePlaylist={() => setIsPlaylistModalOpen(true)}
                />
              )}
            </div>
          </div>

          <div className="bg-[#181818] p-4 rounded-xl mt-4 border border-[#333]">
            <h4 className="font-bold text-sm mb-2">Về nghệ sĩ</h4>
            <p className="text-xs text-[#a0a0a0] line-clamp-3 leading-relaxed">
              {currentSong 
                ? `${currentSong.artist?.name} là nghệ sĩ đang phát trên Soundwave. Hãy theo dõi để cập nhật những sản phẩm mới nhất của họ.`
                : "Chọn một bài hát để xem thông tin nghệ sĩ."}
            </p>
          </div>
        </div>
      </div>

      {/* KHU VỰC DƯỚI: THANH MUSIC PLAYER HOẠT ĐỘNG */}
      <div className="min-h-[96px] shrink-0 bg-[#121212] border-t border-[#2a2a2a] flex items-center justify-between gap-3 px-4 py-2 z-50">

        {/* 1. Trái: Info bài hát */}
        <div className="flex items-center gap-3 min-w-0 flex-[1.1] max-w-[28vw]">
          {currentSong ? (
            <>
              {currentSong.coverImage ? (
                <img
                  src={currentSong.coverImage}
                  alt=""
                  className="w-14 h-14 rounded object-cover shadow-md shrink-0 bg-[#282828]"
                />
              ) : (
                <div className="w-14 h-14 rounded shrink-0 bg-[#282828] flex items-center justify-center">
                  <Music size={22} className="text-[#666]" strokeWidth={1.5} />
                </div>
              )}
              <div className="hidden sm:block min-w-0 flex-1">
                <h4 className="font-semibold text-sm text-white truncate leading-tight">{currentSong.title}</h4>
                <p className="text-xs text-[#b3b3b3] truncate mt-0.5">{currentSong.artist?.name || "Nghệ sĩ"}</p>
              </div>
              <div className="hidden sm:flex items-center gap-1 shrink-0">
                <Heart
                  onClick={() => {
                    if (!currentSong) return;
                    const user = JSON.parse(localStorage.getItem("user") || "{}");
                    if (!user.id) {
                      navigate("/login");
                      return;
                    }
                    fetch("http://localhost:9000/api/interactions/like", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ userId: user.id, songId: currentSong.id }),
                    })
                      .then((r) => r.json())
                      .then((data) => setIsLiked(data.isLiked))
                      .catch((err) => console.error(err));
                  }}
                  size={18}
                  className={`cursor-pointer transition-colors ${isLiked ? "text-[#00e6e6] fill-current" : "text-[#b3b3b3] hover:text-white"}`}
                />
              </div>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded shrink-0 bg-[#282828] flex items-center justify-center opacity-70">
                <Music size={22} className="text-[#555]" strokeWidth={1.5} />
              </div>
              <div className="hidden sm:block text-xs text-[#b3b3b3]">Chưa phát bài nào</div>
            </>
          )}
        </div>

        {/* 2. Giữa: điều khiển + thanh tua */}
        <div className="flex flex-col items-stretch justify-center flex-[1.6] max-w-[560px] w-full min-w-0">
          <div className="flex items-center justify-center gap-5 mb-1.5">
            <button
              type="button"
              onClick={toggleShuffle}
              className={`p-1 rounded transition-colors ${isShuffle ? "text-[#00e6e6]" : "text-[#b3b3b3] hover:text-white"}`}
              aria-label="Trộn bài"
            >
              <Shuffle size={17} strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={playPrev}
              className="p-1 rounded text-[#b3b3b3] hover:text-white transition-colors"
              aria-label="Bài trước"
            >
              <SkipBack size={20} fill="currentColor" />
            </button>
            <button
              type="button"
              onClick={() => {
                togglePlay();
              }}
              className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-[1.06] active:scale-95 transition-transform shadow-md"
              aria-label={isPlaying ? "Tạm dừng" : "Phát"}
            >
              {isPlaying ? (
                <Pause size={22} className="text-black" fill="currentColor" />
              ) : (
                <Play size={22} className="text-black ml-[3px]" fill="currentColor" />
              )}
            </button>
            <button
              type="button"
              onClick={playNext}
              className="p-1 rounded text-[#b3b3b3] hover:text-white transition-colors"
              aria-label="Bài tiếp"
            >
              <SkipForward size={20} fill="currentColor" />
            </button>
            <button
              type="button"
              onClick={toggleRepeat}
              className={`p-1 rounded transition-colors ${isRepeat ? "text-[#00e6e6]" : "text-[#b3b3b3] hover:text-white"}`}
              aria-label="Lặp lại"
            >
              <Repeat size={17} strokeWidth={1.75} />
            </button>
          </div>

          <div className="flex items-center gap-2 w-full">
            <span className="text-[11px] text-[#b3b3b3] tabular-nums w-10 text-right shrink-0">
              {formatPlayerClock(currentTime)}
            </span>
            <div
              ref={progressBarRef}
              role="slider"
              tabIndex={currentSong && duration > 0 ? 0 : -1}
              aria-valuenow={Math.round(progressPct)}
              aria-valuemin={0}
              aria-valuemax={100}
              className={`relative flex-1 h-5 flex items-center ${currentSong && duration > 0 ? "cursor-pointer" : "cursor-default opacity-50"}`}
              onMouseDown={(e) => {
                if (!currentSong || !Number.isFinite(duration) || duration <= 0) return;
                e.preventDefault();
                seekingRef.current = true;
                seekFromClientX(e.clientX);
              }}
              onKeyDown={(e) => {
                if (!currentSong || !Number.isFinite(duration) || duration <= 0) return;
                const step = duration * 0.05;
                if (e.key === "ArrowRight") {
                  e.preventDefault();
                  handleSeek(Math.min(duration, currentTime + step));
                } else if (e.key === "ArrowLeft") {
                  e.preventDefault();
                  handleSeek(Math.max(0, currentTime - step));
                }
              }}
            >
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[3px] rounded-full bg-[#4d4d4d]" />
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 h-[4px] rounded-full bg-white pointer-events-none transition-[width] duration-150 ease-linear"
                style={{ width: `${progressPct}%` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md pointer-events-none ring-2 ring-[#121212]"
                style={{ left: `calc(${progressPct}% - 6px)` }}
              />
            </div>
            <span className="text-[11px] text-[#b3b3b3] tabular-nums w-10 shrink-0">
              {formatPlayerClock(duration)}
            </span>
          </div>
        </div>

        {/* 3. Phải: âm lượng, lyrics */}
        <div className="hidden md:flex items-center justify-end gap-2 flex-[1.1] min-w-0 max-w-[28vw]">
          <button
            type="button"
            onClick={() => setVolume(volume > 0 ? 0 : 1)}
            className="p-1.5 rounded text-[#b3b3b3] hover:text-white transition-colors shrink-0"
            aria-label={volume === 0 ? "Bật tiếng" : "Tắt tiếng"}
          >
            {volume === 0 ? <VolumeX size={18} strokeWidth={1.75} /> : <Volume2 size={18} strokeWidth={1.75} />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-[88px] h-1 accent-white cursor-pointer shrink-0 opacity-90 hover:opacity-100"
            aria-label="Âm lượng"
          />
          <button
            type="button"
            disabled={!currentSong}
            onClick={() => currentSong && navigate(`/song/${currentSong.id}`)}
            className="p-1.5 rounded text-[#b3b3b3] hover:text-white transition-colors shrink-0 disabled:opacity-35 disabled:pointer-events-none"
            title="Lời bài hát"
            aria-label="Xem lời bài hát"
          >
            <Mic2 size={18} strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </div>
  );
}