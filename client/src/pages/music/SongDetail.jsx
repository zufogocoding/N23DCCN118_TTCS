import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Play, Pause, Heart, MoreHorizontal, Flag, Loader2 } from "lucide-react";
import { usePlayer } from "../../context/PlayerContext";
import { useAuth } from "../../context/AuthContext";
import AddToPlaylistMenu from "../../components/common/AddToPlaylistMenu";
import CreatePlaylistModal from "../../components/common/CreatePlaylistModal";
import ReportModal from "../../components/common/ReportModal";
import useClickOutside from "../../hooks/useClickOutside";
import { getPrimaryArtistUserId } from "../../utils/artistNav";
import { api, getMediaUrl } from "../../utils/api";
import { getArtistName, getCoverArt, formatDuration } from "../../utils/songHelpers";

function displayArtistName(profile) {
  if (!profile) return 'Nghệ sĩ';
  return profile?.artist?.artistName || profile?.displayName || profile?.username || 'Nghệ sĩ';
}

const SongDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { playSong, currentSong, isPlaying, togglePlay } = usePlayer();
  const { user } = useAuth();
  const [song, setSong] = useState(null);
  const [artistProfile, setArtistProfile] = useState(null);
  const [artistTopSongs, setArtistTopSongs] = useState([]);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [followBusy, setFollowBusy] = useState(false);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const contextMenuRef = useRef(null);
  
  useClickOutside(contextMenuRef, () => setIsContextMenuOpen(false));

  useEffect(() => {
    async function fetchSong() {
      try {
        const res = await api.get(`/api/songs/${id}`);
        if (res.ok) {
          const data = await res.json();
          setSong(data);

          const primaryArtistId = getPrimaryArtistUserId(data);
          if (primaryArtistId) {
            try {
              const artistRes = await api.get(`/api/artists/${primaryArtistId}`);
              if (artistRes.ok) {
                const artistData = await artistRes.json();
                setArtistProfile(artistData.profile);
                setArtistTopSongs((artistData.topSongs || []).filter(s => s.id !== data.id).slice(0, 5));
              }
            } catch (err) {
              console.error('Lỗi khi lấy thông tin nghệ sĩ:', err);
            }
          }

          // Kiểm tra trạng thái like
          if (user && user.id) {
            const likeRes = await api.get(`/api/interactions/like-status/${id}`);
            if (likeRes.ok) {
              const likeData = await likeRes.json();
              setLiked(likeData.isLiked);
            }
          }
        }
      } catch (err) {
        console.error('Lỗi khi lấy thông tin bài hát:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchSong();
  }, [id, user]);

  const handlePlay = () => {
    if (!song) return;
    if (currentSong?.id === song.id) {
      togglePlay();
    } else {
      const playerSong = {
        id: song.id,
        title: song.title,
        artist: { name: getArtistName(song) },
        coverImage: getCoverArt(song),
      };
      playSong(playerSong, [playerSong]);
    }
  };

  const handleToggleLike = async () => {
    if (!user || !user.id || !song) return;

    try {
      const res = await api.post('/api/interactions/like', { songId: song.id });
      if (res.ok) {
        const data = await res.json();
        setLiked(data.isLiked);
      }
    } catch (err) {
      console.error('Lỗi khi toggle like:', err);
    }
  };

  const handleFollowToggle = async (e) => {
    e.stopPropagation();
    if (!user || !user.id) {
      navigate('/login');
      return;
    }
    const primaryId = getPrimaryArtistUserId(song);
    if (!artistProfile || !primaryId || user.id === parseInt(primaryId, 10)) return;
    
    setFollowBusy(true);
    try {
      const method = artistProfile.isFollowing ? 'DELETE' : 'POST';
      const res = method === 'DELETE'
        ? await api.delete(`/api/artists/${primaryId}/follow`)
        : await api.post(`/api/artists/${primaryId}/follow`, {});
      if (res.ok) {
        setArtistProfile((prev) => prev ? {
          ...prev,
          isFollowing: !prev.isFollowing,
          followerCount: (prev.followerCount || 0) + (prev.isFollowing ? -1 : 1),
        } : prev);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFollowBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00e6e6]"></div>
      </div>
    );
  }

  if (!song) {
    return (
      <div className="text-white p-10">
        Không tìm thấy bài hát
      </div>
    );
  }

  const baseArtistName = getArtistName(song);
  const artistName = artistProfile ? displayArtistName(artistProfile) : baseArtistName;
  const coverArt = getCoverArt(song);
  const artistUserId = getPrimaryArtistUserId(song);
  const avatarImgUrl = artistProfile ? (artistProfile.artist?.avatarUrl || artistProfile.avatarUrl) : song.artists?.[0]?.user?.avatarUrl;
  const avatarUrl = avatarImgUrl ? getMediaUrl(avatarImgUrl) : `https://ui-avatars.com/api/?name=${encodeURIComponent(artistName)}&background=282828&color=fff&size=150`;
  const colors = ['from-pink-700', 'from-cyan-700', 'from-purple-700', 'from-emerald-700', 'from-amber-700'];
  const gradientColor = colors[(song.id - 1) % colors.length];

  return (
    <div className={`bg-gradient-to-b ${gradientColor} via-[#121212]/80 to-[#121212] rounded-xl -mx-6 -mt-6 overflow-hidden min-h-full`}>
      {/* Modals */}
      <CreatePlaylistModal
        isOpen={isPlaylistModalOpen}
        onClose={() => setIsPlaylistModalOpen(false)}
      />
      
      {song && (
        <ReportModal 
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          targetType="SONG"
          targetId={song.id}
        />
      )}

      {/* HERO Section */}
      <div className="px-10 pt-20 pb-10 flex flex-col md:flex-row items-center md:items-end gap-8 min-h-[380px]">
        <img
          src={coverArt}
          alt={song.title}
          className="w-64 h-64 rounded-md object-cover shadow-[0_12px_24px_rgba(0,0,0,0.5)] border-4 border-transparent"
        />
        <div className="text-center md:text-left flex-1 min-w-0">
          <p className="uppercase text-sm mb-3 font-bold text-white/80 tracking-wider">Song</p>
          <h1 className="text-5xl md:text-8xl font-black leading-tight mb-6 truncate">{song.title}</h1>
          <div className="flex items-center gap-3 text-white justify-center md:justify-start flex-wrap font-bold text-sm">
            {artistUserId ? (
              <button
                type="button"
                onClick={() => navigate(`/artist/${artistUserId}`)}
                className="hover:underline flex items-center gap-2"
              >
                {/* Optional: mini artist avatar could go here */}
                {artistName}
              </button>
            ) : (
              <span>{artistName}</span>
            )}
            <span className="text-white/70">•</span>
            <span className="text-white/70">{formatDuration(song.durationMs)}</span>
            {song.playCount > 0 && (
              <>
                <span className="text-white/70">•</span>
                <span className="text-white/70">{song.playCount.toLocaleString()} plays</span>
              </>
            )}
          </div>
          {/* Genres */}
          {song.genres && song.genres.length > 0 && (
            <div className="flex gap-2 mt-4 justify-center md:justify-start">
              {song.genres.map(sg => (
                <span key={sg.genre.id} className="px-3 py-1 bg-white/10 hover:bg-white/20 transition-colors cursor-pointer rounded-full text-xs font-bold text-white">
                  {sg.genre.genreTag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ACTION BAR */}
      <div className="px-10 py-6 flex items-center gap-8 bg-black/20 backdrop-blur-sm">
        <button
          onClick={handlePlay}
          className="bg-[#00e6e6] w-16 h-16 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-xl"
        >
          {currentSong?.id === song.id && isPlaying ? (
            <Pause fill="black" color="black" size={32} />
          ) : (
            <Play fill="black" color="black" size={32} className="ml-1" />
          )}
        </button>

        {/* Like */}
        <button onClick={handleToggleLike} title={liked ? "Bỏ thích" : "Thích"} className="hover:scale-105 active:scale-95 transition-transform">
          <Heart
            size={36}
            className={`transition-colors ${
              liked ? 'text-[#00e6e6] fill-[#00e6e6]' : 'text-[#a0a0a0] hover:text-white'
            }`}
          />
        </button>

        {/* Context Menu (3 chấm) */}
        <div className="relative" ref={contextMenuRef}>
          <button 
            onClick={() => setIsContextMenuOpen(!isContextMenuOpen)}
            className="p-2 rounded-full text-[#a0a0a0] hover:text-white transition-colors"
          >
            <MoreHorizontal size={36} />
          </button>
          
          {isContextMenuOpen && (
            <div className="absolute left-0 top-full mt-2 w-56 bg-[#282828] rounded-md shadow-2xl border border-[#333] py-1 z-50">
              <AddToPlaylistMenu
                songId={song.id}
                onCreatePlaylist={() => {
                  setIsContextMenuOpen(false);
                  setIsPlaylistModalOpen(true);
                }}
                asMenuItem={true}
              />
              
              <button 
                onClick={() => {
                  setIsContextMenuOpen(false);
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

      {/* 2 Cột: Lời bài hát & Thông tin Nghệ sĩ */}
      <div className="px-10 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8 pb-32">
        
        {/* Cột trái: Lyrics */}
        <div className="lg:col-span-2">
          <div className="bg-[#181818] rounded-xl p-8 h-[450px] overflow-y-auto custom-scrollbar shadow-lg">
            <h2 className="text-2xl font-black text-white mb-8">Lời bài hát</h2>
            {song.lyrics ? (
              <div className="text-lg font-bold text-[#a0a0a0] whitespace-pre-wrap leading-relaxed hover:text-white transition-colors duration-300">
                {song.lyrics}
              </div>
            ) : (
              <div className="text-xl font-bold text-[#666] italic">
                Nghệ sĩ chưa cập nhật lời bài hát.
              </div>
            )}
          </div>
        </div>

        {/* Cột phải: Nghệ sĩ */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div 
            onClick={() => artistUserId && navigate(`/artist/${artistUserId}`)}
            className="bg-[#181818] hover:bg-[#282828] transition-colors duration-300 cursor-pointer rounded-xl p-6 flex flex-col gap-4 group shadow-lg"
          >
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-[#333] flex items-center justify-center overflow-hidden shadow-lg group-hover:scale-105 transition-transform duration-300 shrink-0">
                <img src={avatarUrl} alt={artistName} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[#a0a0a0] font-bold uppercase tracking-wider mb-1">Nghệ sĩ</p>
                <h3 className="text-xl font-bold text-white group-hover:underline line-clamp-1">{artistName}</h3>
              </div>
              {artistProfile && user?.id !== parseInt(artistUserId, 10) && (
                <button
                  type="button"
                  onClick={handleFollowToggle}
                  disabled={followBusy}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 ${
                    artistProfile.isFollowing
                      ? 'border border-white/40 text-white hover:border-white hover:bg-white/10'
                      : 'bg-[#1ed760] text-black hover:scale-105'
                  }`}
                >
                  {followBusy ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : artistProfile.isFollowing ? (
                    'Đang theo dõi'
                  ) : (
                    'Theo dõi'
                  )}
                </button>
              )}
            </div>
          </div>

          <div className="bg-[#181818] rounded-xl p-6 flex-1 shadow-lg">
            <h3 className="text-base font-bold text-white mb-4 line-clamp-1">Thêm từ {artistName}</h3>
            {artistTopSongs && artistTopSongs.length > 0 ? (
              <div className="flex flex-col gap-3">
                {artistTopSongs.map(s => (
                  <div key={s.id} onClick={() => navigate(`/song/${s.id}`)} className="flex items-center gap-3 group cursor-pointer p-2 -mx-2 rounded-lg hover:bg-white/10 transition-colors">
                    <img src={getCoverArt(s)} alt={s.title} className="w-10 h-10 rounded object-cover shadow-md group-hover:scale-105 transition-transform" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate group-hover:text-[#1ed760] transition-colors">{s.title}</p>
                      <p className="text-xs text-[#a0a0a0] truncate">{getArtistName(s)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-[#a0a0a0] italic">
                Danh sách bài hát đang trống hoặc đang cập nhật...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SongDetail;