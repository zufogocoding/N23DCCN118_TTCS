import { useState, useEffect, useRef, useCallback } from "react";
import { Outlet, Link, useNavigate } from "react-router-dom";
import { usePlayer } from "../../context/PlayerContext";
import { useAuth } from "../../context/AuthContext";

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
  Flag,
  ListMusic,
  Info
} from "lucide-react";

import UserDropdown from "../common/UserDropdown";
import NotificationDropdown from "../common/NotificationDropdown.jsx";
import CreatePlaylistModal from "../common/CreatePlaylistModal";
import ReportModal from "../common/ReportModal";
import AddToPlaylistMenu from "../common/AddToPlaylistMenu";
import QueuePanel from "./QueuePanel";
import LyricsPanel from "./LyricsPanel";
import { api } from "../../utils/api";
import { getCoverArt } from "../../utils/songHelpers";
import useClickOutside from "../../hooks/useClickOutside";
import { FastAverageColor } from 'fast-average-color';
import { ChevronUp, ChevronDown } from "lucide-react";

function formatPlayerClock(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function MainLayout() {
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isPlayerMenuOpen, setIsPlayerMenuOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isLyricsOpen, setIsLyricsOpen] = useState(false);
  const playerMenuRef = useRef(null);
  useClickOutside(playerMenuRef, () => setIsPlayerMenuOpen(false));

  const [isLiked, setIsLiked] = useState(false);
  const [userPlaylists, setUserPlaylists] = useState([]);

  const navigate = useNavigate();
  const { user } = useAuth();

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

  useClickOutside(nowPlayingMenuRef, () => setNowPlayingMenuOpen(false));

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNowPlayingMenuOpen(false);
  }, [currentSong?.id]);

  const fetchPlaylists = async () => {
    if (user && user.id) {
      try {
        const res = await api.get(
          `/api/playlists/user/${user.id}`
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
  }, [user?.id]);

  useEffect(() => {
    if (!currentSong?.id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsLiked(false);
      return;
    }
    if (!user || !user.id) {
      setIsLiked(false);
      return;
    }
    let cancelled = false;
    api.get(`/api/interactions/like-status/${currentSong.id}`)
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
    if (!user) {
      navigate("/login");
    } else if (action) {
      action();
    }
  };

  const [ambientColor, setAmbientColor] = useState('transparent');
  const [isNowPlayingExpanded, setIsNowPlayingExpanded] = useState(false);

  useEffect(() => {
    if (!currentSong) {
      setAmbientColor('transparent');
      return;
    }
    const coverArt = getCoverArt(currentSong);
    if (!coverArt) {
      setAmbientColor('transparent');
      return;
    }
    const fac = new FastAverageColor();
    fac.getColorAsync(coverArt, { algorithm: 'dominant' })
      .then(color => {
        setAmbientColor(color.rgba);
      })
      .catch(e => {
        console.log(e);
        setAmbientColor('transparent');
      });
  }, [currentSong]);

  return (
    <div className="flex flex-col h-screen bg-background text-text font-sans overflow-hidden">

      <CreatePlaylistModal
        isOpen={isPlaylistModalOpen}
        onClose={() => setIsPlaylistModalOpen(false)}
        onSuccess={fetchPlaylists}
      />
      
      {currentSong && (
        <ReportModal 
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          targetType="SONG"
          targetId={currentSong.id}
        />
      )}

      <div className="flex flex-1 overflow-hidden relative">
        <QueuePanel isOpen={isQueueOpen} onClose={() => setIsQueueOpen(false)} />
        <LyricsPanel isOpen={isLyricsOpen} onClose={() => setIsLyricsOpen(false)} />

        {/* LEFT SIDEBAR */}
        <div className="w-[240px] bg-background border-r border-border flex flex-col hidden md:flex">

          <div className="p-6">
            <h1 className="text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[#00e6e6] to-[#008080]">
              SOUNDWAVE.
            </h1>
          </div>

          <nav className="flex flex-col gap-4 px-6 text-sm font-semibold text-[#a0a0a0]">

            <Link
              to="/"
              className="flex items-center gap-4 text-text hover:text-primary transition-colors"
            >
              <Home size={24} />
              Trang chủ
            </Link>

            <Link
              to="/search"
              className="flex items-center gap-4 hover:text-text transition-colors"
            >
              <Search size={24} />
              Tìm kiếm
            </Link>

            <Link
              to="/library"
              className="flex items-center gap-4 hover:text-text transition-colors"
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
              className="flex items-center gap-4 hover:text-text transition-colors"
            >
              <PlusSquare size={24} />
              Tạo Playlist
            </button>


          </div>

          <div className="mt-4 px-6 border-t border-[#222] pt-4 flex-1 overflow-y-auto mb-4">

            <button
              onClick={() => handleProtectedAction(() => navigate('/playlist/liked'))}
              className="w-full text-left flex items-center gap-4 hover:text-text transition-colors text-primary mb-4"
            >
              <Heart size={24} className="fill-current text-primary" /> Bài hát đã thích
            </button>

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
                      className="hover:text-text cursor-pointer truncate transition-colors block"
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
        <div className="flex-1 bg-surface overflow-y-auto rounded-lg m-2 relative flex flex-col shadow-inner">

          <div className="sticky top-0 z-50 flex items-center justify-end px-6 py-3 bg-gradient-to-b from-background/60 to-transparent backdrop-blur-md">
            {user ? (
              <div className="flex items-center gap-2 bg-background/40 p-1 rounded-full border border-border/50">
                <NotificationDropdown />
                <UserDropdown />
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link
                  to="/register"
                  className="text-[#a0a0a0] hover:text-white font-bold py-2 px-4 transition-colors text-sm"
                >
                  Đăng ký
                </Link>
                <Link
                  to="/login"
                  className="bg-white text-black hover:scale-105 font-bold py-2 px-6 rounded-full transition-transform text-sm"
                >
                  Đăng nhập
                </Link>
              </div>
            )}
          </div>

          <div className="px-6 pb-6">
            <Outlet />
          </div>

        </div>

      </div>

      {/* NOW PLAYING FULLSCREEN OVERLAY */}
      <div 
        className={`fixed inset-0 z-40 bg-background transition-all duration-500 ease-in-out ${isNowPlayingExpanded ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}`}
      >
        {currentSong && (
          <>
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-30 blur-3xl scale-110"
              style={{ backgroundImage: `url(${getCoverArt(currentSong)})` }}
            />
            <div className="absolute inset-0 bg-black/60" />
            <div className="relative h-full flex flex-col items-center justify-center p-8">
              <button 
                onClick={() => setIsNowPlayingExpanded(false)}
                className="absolute top-8 right-8 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-all"
              >
                <ChevronDown size={32} />
              </button>
              
              <img 
                src={getCoverArt(currentSong)} 
                alt="" 
                className={`w-[40vh] h-[40vh] md:w-[50vh] md:h-[50vh] object-cover rounded-2xl shadow-2xl transition-transform duration-500 ${isPlaying ? 'scale-100' : 'scale-95'}`}
                style={{ boxShadow: `0 25px 50px -12px ${ambientColor}` }}
              />
              
              <h2 className="text-4xl md:text-5xl font-black text-white mt-12 text-center drop-shadow-lg">{currentSong.title}</h2>
              <p className="text-xl md:text-2xl text-gray-300 mt-4 text-center">{currentSong.artist?.name || "Nghệ sĩ"}</p>
              
              {/* Audio Visualizer (Large) */}
              <div className="flex gap-2 mt-12 h-16 items-end">
                 <div className={`w-3 rounded-full bg-primary ${isPlaying ? 'animate-[audio-bar_0.8s_ease-in-out_infinite]' : 'h-2'}`} style={{ animationDelay: '0.1s' }} />
                 <div className={`w-3 rounded-full bg-primary ${isPlaying ? 'animate-[audio-bar_1.2s_ease-in-out_infinite]' : 'h-2'}`} style={{ animationDelay: '0.3s' }} />
                 <div className={`w-3 rounded-full bg-primary ${isPlaying ? 'animate-[audio-bar_0.9s_ease-in-out_infinite]' : 'h-2'}`} style={{ animationDelay: '0.5s' }} />
                 <div className={`w-3 rounded-full bg-primary ${isPlaying ? 'animate-[audio-bar_1.1s_ease-in-out_infinite]' : 'h-2'}`} style={{ animationDelay: '0.2s' }} />
                 <div className={`w-3 rounded-full bg-primary ${isPlaying ? 'animate-[audio-bar_1.3s_ease-in-out_infinite]' : 'h-2'}`} style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* KHU VỰC DƯỚI: THANH MUSIC PLAYER HOẠT ĐỘNG */}
      <div
        className="h-[108px] shrink-0 bg-[#0a0a0a]/90 backdrop-blur-3xl border-t border-white/5 grid grid-cols-[minmax(0,1fr)_minmax(260px,1.6fr)] md:grid-cols-[minmax(220px,1.2fr)_minmax(320px,1.6fr)_minmax(220px,1.2fr)] items-center gap-4 px-6 py-3 z-50 relative transition-all duration-1000 ease-in-out"
      >
        {/* Ambient Glow */}
        <div 
          className="absolute inset-0 opacity-10 pointer-events-none transition-all duration-1000 ease-in-out" 
          style={{ background: `linear-gradient(to top, ${ambientColor}, transparent)` }} 
        />
        <div 
          className="absolute top-0 left-0 right-0 h-[1px] opacity-40 transition-all duration-1000 ease-in-out pointer-events-none"
          style={{ boxShadow: `0 -10px 40px 20px ${ambientColor}` }}
        />

        {/* 1. Trái: Info bài hát */}
        <div className="flex items-center gap-4 min-w-0 relative z-10 h-full">
          {currentSong ? (
            <>
              {getCoverArt(currentSong) ? (
                <div 
                  className="relative w-16 h-16 shrink-0 group cursor-pointer"
                  onClick={() => setIsNowPlayingExpanded(!isNowPlayingExpanded)}
                >
                  <img
                    src={getCoverArt(currentSong)}
                    alt=""
                    className="w-full h-full rounded-md object-cover shadow-lg bg-[#282828] group-hover:blur-[2px] transition-all"
                  />
                  <div className="absolute inset-0 bg-black/50 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white">
                    <ChevronUp size={24} />
                  </div>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-md shrink-0 bg-[#282828] flex items-center justify-center shadow-lg">
                  <Music size={24} className="text-[#666]" strokeWidth={1.5} />
                </div>
              )}
              <div className="hidden sm:flex flex-col min-w-0 flex-1 justify-center">
                <h4 
                  onClick={() => {
                    if (currentSong?.id) {
                      navigate(`/song/${currentSong.id}`);
                    }
                  }}
                  className="font-bold text-sm md:text-base text-white hover:underline cursor-pointer truncate leading-tight"
                >
                  {currentSong.title}
                </h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs md:text-sm text-[#a0a0a0] hover:underline cursor-pointer truncate">{currentSong.artist?.name || "Nghệ sĩ"}</p>
                  {isPlaying && (
                    <div className="flex items-end gap-[2px] h-[10px] opacity-80 shrink-0 mb-[1px]">
                      <div className="w-[2px] rounded-full bg-primary animate-[audio-bar_0.8s_ease-in-out_infinite]" style={{ animationDelay: '0.1s' }} />
                      <div className="w-[2px] rounded-full bg-primary animate-[audio-bar_1.2s_ease-in-out_infinite]" style={{ animationDelay: '0.3s' }} />
                      <div className="w-[2px] rounded-full bg-primary animate-[audio-bar_0.9s_ease-in-out_infinite]" style={{ animationDelay: '0.5s' }} />
                    </div>
                  )}
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 shrink-0 ml-2">
                <Heart
                  onClick={() => {
                    if (!currentSong) return;
                    if (!user || !user.id) {
                      navigate("/login");
                      return;
                    }
                    api.post("/api/interactions/like", { songId: currentSong.id })
                      .then((r) => r.json())
                      .then((data) => setIsLiked(data.isLiked))
                      .catch((err) => console.error(err));
                  }}
                  size={20}
                  className={`cursor-pointer transition-all w-9 h-9 p-2 rounded-full ${isLiked ? "text-primary fill-current animate-like-bounce drop-shadow-[0_0_8px_rgba(0,230,230,0.5)]" : "text-[#a0a0a0] hover:text-white hover:scale-110"}`}
                />

                {/* 3-dot Context Menu in Player Bar */}
                <div className="relative" ref={playerMenuRef}>
                  <button 
                    onClick={() => setIsPlayerMenuOpen(!isPlayerMenuOpen)}
                    className="w-9 h-9 flex items-center justify-center rounded-full text-[#a0a0a0] hover:text-white transition-colors"
                  >
                    <MoreHorizontal size={20} />
                  </button>
                  
                  {isPlayerMenuOpen && (
                    <div className="absolute left-0 bottom-full mb-2 w-48 bg-[#282828] rounded-lg shadow-2xl border border-[#333] py-1 z-[100]">
                      <AddToPlaylistMenu
                        songId={currentSong.id}
                        onCreatePlaylist={() => {
                          setIsPlayerMenuOpen(false);
                          setIsPlaylistModalOpen(true);
                        }}
                        asMenuItem={true}
                      />
                      
                      <button 
                        onClick={() => {
                          setIsPlayerMenuOpen(false);
                          if (currentSong?.id) {
                            navigate(`/song/${currentSong.id}`);
                          }
                        }}
                        className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-gray-200 hover:bg-white/10 transition-colors"
                      >
                        <Info size={18} />
                        <span>Chi tiết bài hát</span>
                      </button>
                      
                      <button 
                        onClick={() => {
                          setIsPlayerMenuOpen(false);
                          setIsReportModalOpen(true);
                        }}
                        className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-gray-200 hover:bg-white/10 transition-colors"
                      >
                        <Flag size={18} />
                        <span>Báo cáo bài hát</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-md shrink-0 bg-[#181818] flex items-center justify-center border border-[#333]">
                <Music size={24} className="text-[#444]" strokeWidth={1.5} />
              </div>
              <div className="hidden sm:block text-sm text-[#666] font-medium">Chưa phát bài nào</div>
            </>
          )}
        </div>

        {/* 2. Giữa: điều khiển + thanh tua */}
        <div className="flex flex-col items-stretch justify-center max-w-[600px] w-full min-w-0 mx-auto relative z-10">
          <div className="flex items-center justify-center gap-5 md:gap-7 h-11 mb-2">
            <button
              type="button"
              onClick={toggleShuffle}
              className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${isShuffle ? "text-[#1db954]" : "text-[#a0a0a0] hover:text-white"}`}
              aria-label="Trộn bài"
            >
              <Shuffle size={18} strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={playPrev}
              className="w-9 h-9 flex items-center justify-center rounded-full text-[#a0a0a0] hover:text-white transition-colors hover:scale-105 active:scale-95"
              aria-label="Bài trước"
            >
              <SkipBack size={24} fill="currentColor" />
            </button>
            <button
              type="button"
              onClick={() => {
                togglePlay();
              }}
              className="w-11 h-11 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg hover:bg-gray-200"
              aria-label={isPlaying ? "Tạm dừng" : "Phát"}
            >
              {isPlaying ? (
                <Pause size={22} className="text-black" fill="currentColor" />
              ) : (
                <Play size={22} className="text-black ml-1" fill="currentColor" />
              )}
            </button>
            <button
              type="button"
              onClick={playNext}
              className="w-9 h-9 flex items-center justify-center rounded-full text-[#a0a0a0] hover:text-white transition-colors hover:scale-105 active:scale-95"
              aria-label="Bài tiếp"
            >
              <SkipForward size={24} fill="currentColor" />
            </button>
            <button
              type="button"
              onClick={toggleRepeat}
              className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${isRepeat ? "text-[#1db954]" : "text-[#a0a0a0] hover:text-white"}`}
              aria-label="Lặp lại"
            >
              <Repeat size={18} strokeWidth={2} />
            </button>
          </div>

          <div className="flex items-center gap-3 w-full h-5 group/progress">
            <span className="text-[12px] font-medium text-[#a0a0a0] tabular-nums w-10 text-right shrink-0">
              {formatPlayerClock(currentTime)}
            </span>
            <div
              ref={progressBarRef}
              role="slider"
              tabIndex={currentSong && duration > 0 ? 0 : -1}
              aria-valuenow={Math.round(progressPct)}
              aria-valuemin={0}
              aria-valuemax={100}
              className={`relative flex-1 h-4 flex items-center ${currentSong && duration > 0 ? "cursor-pointer" : "cursor-default opacity-50"}`}
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
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 group-hover/progress:h-1.5 rounded-full bg-[#333] transition-all duration-200" />
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 h-1 group-hover/progress:h-1.5 rounded-full bg-white group-hover/progress:bg-[#1db954] pointer-events-none transition-all duration-200"
                style={{ width: `${progressPct}%` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md pointer-events-none opacity-0 group-hover/progress:opacity-100 transition-opacity duration-200"
                style={{ left: `calc(${progressPct}% - 6px)` }}
              />
            </div>
            <span className="text-[12px] font-medium text-[#a0a0a0] tabular-nums w-10 shrink-0">
              {formatPlayerClock(duration)}
            </span>
          </div>
        </div>

        {/* 3. Phải: âm lượng, lyrics */}
        <div className="hidden md:flex items-center justify-end gap-2 min-w-0 relative z-10 h-11">
          <button
            type="button"
            onClick={() => setVolume(volume > 0 ? 0 : 1)}
            className="w-9 h-9 flex items-center justify-center rounded-full text-[#a0a0a0] hover:text-white transition-colors shrink-0"
            aria-label={volume === 0 ? "Bật tiếng" : "Tắt tiếng"}
          >
            {volume === 0 ? <VolumeX size={20} strokeWidth={1.75} /> : <Volume2 size={20} strokeWidth={1.75} />}
          </button>
          
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-[96px] h-1 bg-[#333] hover:h-1.5 rounded-full appearance-none cursor-pointer hover:accent-[#1db954] accent-white transition-all"
            aria-label="Âm lượng"
          />
          
          <button
            type="button"
            disabled={!currentSong}
            onClick={() => {
              setIsLyricsOpen(!isLyricsOpen);
              if (!isLyricsOpen) setIsQueueOpen(false);
            }}
            className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors shrink-0 disabled:opacity-35 disabled:pointer-events-none ml-2 ${isLyricsOpen ? 'text-[#1db954]' : 'text-[#a0a0a0] hover:text-white'}`}
            title="Lời bài hát"
            aria-label="Xem lời bài hát"
          >
            <Mic2 size={20} strokeWidth={1.75} />
          </button>

          <button
            type="button"
            onClick={() => {
              setIsQueueOpen(!isQueueOpen);
              if (!isQueueOpen) setIsLyricsOpen(false);
            }}
            className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors shrink-0 ${isQueueOpen ? 'text-[#1db954]' : 'text-[#a0a0a0] hover:text-white'}`}
            title="Danh sách phát"
            aria-label="Danh sách phát"
          >
            <ListMusic size={20} strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </div>
  );
}
