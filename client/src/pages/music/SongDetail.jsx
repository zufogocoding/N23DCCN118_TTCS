import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Play, Pause, Heart, MoreHorizontal, Flag } from "lucide-react";
import { usePlayer } from "../../context/PlayerContext";
import AddToPlaylistMenu from "../../components/AddToPlaylistMenu";
import CreatePlaylistModal from "../../components/CreatePlaylistModal";
import ReportModal from "../../components/ReportModal";
import useClickOutside from "../../hooks/useClickOutside";
import { getPrimaryArtistUserId } from "../../utils/artistNav";
import { api } from "../../utils/api";
import { getArtistName, getCoverArt, formatDuration } from "../../utils/songHelpers";



const SongDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { playSong, currentSong, isPlaying, togglePlay } = usePlayer();
  const [song, setSong] = useState(null);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(true);
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

          // Kiểm tra trạng thái like
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          if (user.id) {
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
  }, [id]);

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
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user.id || !song) return;

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

  const artistName = getArtistName(song);
  const coverArt = getCoverArt(song);
  const artistUserId = getPrimaryArtistUserId(song);
  const colors = ['from-pink-900', 'from-cyan-900', 'from-purple-900', 'from-emerald-900', 'from-amber-900'];
  const gradientColor = colors[(song.id - 1) % colors.length];

  return (
    <div className={`bg-gradient-to-b ${gradientColor} to-[#121212] rounded-xl -mx-6 -mt-6 overflow-hidden`}>
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
      <div className="px-10 pt-16 pb-10 flex flex-col md:flex-row items-center md:items-end gap-8 min-h-[340px]">
        <img
          src={coverArt}
          alt={song.title}
          className="w-60 h-60 rounded-md object-cover shadow-2xl"
        />
        <div className="text-center md:text-left">
          <p className="uppercase text-sm mb-3 font-bold text-white/70">Song</p>
          <h1 className="text-4xl md:text-6xl font-black leading-tight mb-4">{song.title}</h1>
          <div className="flex items-center gap-2 text-gray-200 justify-center md:justify-start flex-wrap">
            {artistUserId ? (
              <button
                type="button"
                onClick={() => navigate(`/artist/${artistUserId}`)}
                className="font-bold hover:underline text-left"
              >
                {artistName}
              </button>
            ) : (
              <span className="font-bold">{artistName}</span>
            )}
            <span>•</span>
            <span>{formatDuration(song.durationMs)}</span>
            {song.playCount > 0 && (
              <>
                <span>•</span>
                <span>{song.playCount.toLocaleString()} plays</span>
              </>
            )}
          </div>
          {/* Genres */}
          {song.genres && song.genres.length > 0 && (
            <div className="flex gap-2 mt-3 justify-center md:justify-start">
              {song.genres.map(sg => (
                <span key={sg.genre.id} className="px-3 py-1 bg-white/10 rounded-full text-xs font-medium">
                  {sg.genre.genreTag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ACTION BAR */}
      <div className="px-10 py-6 flex items-center gap-6 bg-black/20">
        <button
          onClick={handlePlay}
          className="bg-[#1ed760] w-16 h-16 rounded-full flex items-center justify-center hover:scale-105 transition shadow-xl"
        >
          {currentSong?.id === song.id && isPlaying ? (
            <Pause fill="black" color="black" size={32} />
          ) : (
            <Play fill="black" color="black" size={32} className="ml-1" />
          )}
        </button>

        {/* Like */}
        <button onClick={handleToggleLike} title={liked ? "Bỏ thích" : "Thích"}>
          <Heart
            size={32}
            className={`transition-colors ${
              liked ? 'text-red-500 fill-red-500' : 'text-gray-300 hover:text-white'
            }`}
          />
        </button>

        {/* Context Menu (3 chấm) */}
        <div className="relative" ref={contextMenuRef}>
          <button 
            onClick={() => setIsContextMenuOpen(!isContextMenuOpen)}
            className="p-2 rounded-full hover:bg-white/10 text-gray-300 hover:text-white transition"
          >
            <MoreHorizontal size={32} />
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
                className="w-full px-4 py-2 flex items-center gap-3 text-sm text-gray-200 hover:bg-white/10 transition-colors"
              >
                <Flag size={18} />
                <span>Báo cáo bài hát</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Song info section */}
      <div className="px-10 py-8">
        <div className="bg-white/5 p-6 rounded-xl max-w-lg">
          <h3 className="font-bold text-lg mb-2">Thông tin bài hát</h3>
          <div className="space-y-2 text-sm text-gray-300">
            <p><span className="text-gray-500">Tiêu đề:</span> {song.title}</p>
            <p>
              <span className="text-gray-500">Nghệ sĩ:</span>{' '}
              {artistUserId ? (
                <button type="button" className="text-white hover:underline" onClick={() => navigate(`/artist/${artistUserId}`)}>
                  {artistName}
                </button>
              ) : (
                artistName
              )}
            </p>
            <p><span className="text-gray-500">Thời lượng:</span> {formatDuration(song.durationMs)}</p>
            {song.playCount > 0 && (
              <p><span className="text-gray-500">Lượt nghe:</span> {song.playCount.toLocaleString()}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SongDetail;