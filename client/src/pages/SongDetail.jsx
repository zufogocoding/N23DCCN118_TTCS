/* eslint-disable react-hooks/set-state-in-effect */
import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { Play, Heart } from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import AddToPlaylistMenu from "../components/AddToPlaylistMenu";
import CreatePlaylistModal from "../components/CreatePlaylistModal";

// Helper: lấy tên artist
function getArtistName(song) {
  if (song.artists && song.artists.length > 0) {
    return song.artists.map(a => a.artist?.artistName || a.artist?.user?.username || 'Unknown').join(', ');
  }
  return 'Unknown Artist';
}

// Helper: cover art URL
function getCoverArt(song) {
  if (song.coverArtUrl) {
    return song.coverArtUrl.startsWith('http') ? song.coverArtUrl : `http://localhost:9000${song.coverArtUrl}`;
  }
  const fallbacks = [
    'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=600&auto=format&fit=crop',
  ];
  return fallbacks[(song.id - 1) % fallbacks.length];
}

// Format duration
function formatDuration(ms) {
  if (!ms) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

const SongDetail = () => {
  const { id } = useParams();
  const { playSong } = usePlayer();
  const [song, setSong] = useState(null);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);

  useEffect(() => {
    async function fetchSong() {
      try {
        const res = await fetch(`http://localhost:9000/api/songs/${id}`);
        if (res.ok) {
          const data = await res.json();
          setSong(data);

          // Kiểm tra trạng thái like
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          if (user.id) {
            const likeRes = await fetch(`http://localhost:9000/api/interactions/like/${user.id}/${id}`);
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
    const playerSong = {
      id: song.id,
      title: song.title,
      artist: { name: getArtistName(song) },
      coverImage: getCoverArt(song),
    };
    playSong(playerSong, [playerSong]);
  };

  const handleToggleLike = async () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user.id) return;

    try {
      const res = await fetch('http://localhost:9000/api/interactions/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, songId: song.id })
      });
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
  const colors = ['from-pink-900', 'from-cyan-900', 'from-purple-900', 'from-emerald-900', 'from-amber-900'];
  const gradientColor = colors[(song.id - 1) % colors.length];

  return (
    <div className={`bg-gradient-to-b ${gradientColor} to-[#121212] rounded-xl -mx-6 -mt-6 overflow-hidden`}>
      {/* Modal */}
      <CreatePlaylistModal
        isOpen={isPlaylistModalOpen}
        onClose={() => setIsPlaylistModalOpen(false)}
      />

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
            <span className="font-bold">{artistName}</span>
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
          <Play fill="black" color="black" size={32} className="ml-1" />
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

        {/* Add to Playlist */}
        <AddToPlaylistMenu
          songId={song.id}
          onCreatePlaylist={() => setIsPlaylistModalOpen(true)}
        />
      </div>

      {/* Song info section */}
      <div className="px-10 py-8">
        <div className="bg-white/5 p-6 rounded-xl max-w-lg">
          <h3 className="font-bold text-lg mb-2">Thông tin bài hát</h3>
          <div className="space-y-2 text-sm text-gray-300">
            <p><span className="text-gray-500">Tiêu đề:</span> {song.title}</p>
            <p><span className="text-gray-500">Nghệ sĩ:</span> {artistName}</p>
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