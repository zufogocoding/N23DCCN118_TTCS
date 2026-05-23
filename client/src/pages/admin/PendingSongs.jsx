import { useEffect, useState, useRef } from "react";
import { 
  Play, Pause, CheckCircle, XCircle, Music, Clock, 
  Search, Volume2, VolumeX 
} from "lucide-react";
import { api, getMediaUrl } from "../../utils/api";

// Helper: lấy tên artist
function getArtistName(song) {
  if (song.artists && song.artists.length > 0) {
    return song.artists.map(a => a.artist?.artistName || a.artist?.user?.displayName || a.artist?.user?.username || 'Unknown').join(', ');
  }
  if (song.artistName) return song.artistName;
  return 'Unknown Artist';
}

// Helper: format duration
function formatDuration(ms) {
  if (!ms) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

// Helper: format time from seconds
function formatTime(seconds) {
  if (isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Helper: get cover art URL
function getCoverArt(song) {
  if (song.coverArtUrl) {
    return getMediaUrl(song.coverArtUrl);
  }
  return null;
}

export default function PendingSongs() {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [approvedCount, setApprovedCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);

  // Audio player state
  const [playingSongId, setPlayingSongId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef(new Audio());

  // Confirmation modal
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'approve' | 'reject', songId, songTitle }

  // Setup audio events
  useEffect(() => {
    const audio = audioRef.current;
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedData = () => setAudioDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadeddata', handleLoadedData);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
    };
  }, []);

  // Update volume
  useEffect(() => {
    audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  async function fetchPendingSongs() {
    try {
      setLoading(true);
      const res = await api.get("/api/admin/songs/pending");
      const data = await res.json();
      setSongs(data);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  }

  // Fetch pending songs
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPendingSongs();
  }, []);

  // Play/Pause song
  const togglePlaySong = (songId) => {
    const audio = audioRef.current;

    if (playingSongId === songId) {
      // Toggle play/pause for current song
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        audio.play();
        setIsPlaying(true);
      }
    } else {
      // Play new song
      audio.pause();
      audio.src = `/api/songs/${songId}/stream`;
      audio.play().catch(() => console.warn('Cannot play this song'));
      setPlayingSongId(songId);
      setIsPlaying(true);
      setCurrentTime(0);
    }
  };

  // Seek
  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * audioDuration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Approve song
  const handleApprove = async (id) => {
    try {
      await api.patch(`/api/admin/song/${id}/approve`);
      setSongs(songs.filter((song) => song.id !== id));
      setApprovedCount(prev => prev + 1);
      if (playingSongId === id) {
        audioRef.current.pause();
        setPlayingSongId(null);
        setIsPlaying(false);
      }
    } catch (err) {
      console.error(err);
    }
    setConfirmAction(null);
  };

  // Reject song
  const handleReject = async (id) => {
    try {
      await api.patch(`/api/admin/song/${id}/reject`);
      setSongs(songs.filter((song) => song.id !== id));
      setRejectedCount(prev => prev + 1);
      if (playingSongId === id) {
        audioRef.current.pause();
        setPlayingSongId(null);
        setIsPlaying(false);
      }
    } catch (err) {
      console.error(err);
    }
    setConfirmAction(null);
  };

  // Filtered songs
  const filteredSongs = songs.filter(song =>
    song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    getArtistName(song).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-10">

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Pending */}
        <div className="relative overflow-hidden bg-[#121212] p-6 rounded-xl border border-[#333] shadow-lg group hover:border-[#00e6e6]/30 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#00e6e6]/5 rounded-full -translate-y-8 translate-x-8" />
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-[#00e6e6]/10 flex items-center justify-center">
              <Clock size={20} className="text-[#00e6e6]" />
            </div>
            <p className="text-sm font-semibold text-[#a0a0a0]">Pending Review</p>
          </div>
          <h2 className="text-4xl font-bold text-[#00e6e6]">{songs.length}</h2>
          <p className="text-xs text-[#666] mt-1">bài hát đang chờ duyệt</p>
        </div>

        {/* Approved Today */}
        <div className="relative overflow-hidden bg-[#121212] p-6 rounded-xl border border-[#333] shadow-lg group hover:border-emerald-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -translate-y-8 translate-x-8" />
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle size={20} className="text-emerald-400" />
            </div>
            <p className="text-sm font-semibold text-[#a0a0a0]">Approved (Session)</p>
          </div>
          <h2 className="text-4xl font-bold text-emerald-400">{approvedCount}</h2>
          <p className="text-xs text-[#666] mt-1">bài đã duyệt trong phiên này</p>
        </div>

        {/* Rejected Today */}
        <div className="relative overflow-hidden bg-[#121212] p-6 rounded-xl border border-[#333] shadow-lg group hover:border-red-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full -translate-y-8 translate-x-8" />
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <XCircle size={20} className="text-red-400" />
            </div>
            <p className="text-sm font-semibold text-[#a0a0a0]">Rejected (Session)</p>
          </div>
          <h2 className="text-4xl font-bold text-red-400">{rejectedCount}</h2>
          <p className="text-xs text-[#666] mt-1">bài đã từ chối trong phiên này</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#666]" size={18} />
        <input
          type="text"
          placeholder="Tìm kiếm bài hát theo tên hoặc nghệ sĩ..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#121212] border border-[#333] rounded-xl pl-12 pr-4 py-3.5 text-sm text-white placeholder-[#666] outline-none focus:border-[#00e6e6]/50 transition-colors"
        />
      </div>

      {/* Song List */}
      <div className="bg-[#121212] border border-[#333] rounded-xl overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[60px_1fr_160px_100px_100px_180px] gap-4 px-6 py-4 border-b border-[#333] text-xs uppercase tracking-wider text-[#666] font-semibold bg-[#0d0d0d]">
          <span></span>
          <span>Bài hát</span>
          <span>Ngày upload</span>
          <span>Thời lượng</span>
          <span>Nghe trước</span>
          <span className="text-right">Hành động</span>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#00e6e6]"></div>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredSongs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-[#666]">
            <Music size={48} className="mb-4 text-[#333]" />
            <p className="text-lg font-semibold text-[#a0a0a0]">
              {searchQuery ? 'Không tìm thấy bài hát' : 'Không có bài hát chờ duyệt'}
            </p>
            <p className="text-sm mt-1">
              {searchQuery ? 'Thử từ khóa khác' : 'Tất cả bài hát đã được xử lý!'}
            </p>
          </div>
        )}

        {/* Song Rows */}
        {!loading && filteredSongs.map((song, index) => {
          const isCurrentlyPlaying = playingSongId === song.id;
          const progress = isCurrentlyPlaying && audioDuration > 0 
            ? (currentTime / audioDuration) * 100 
            : 0;

          return (
            <div
              key={song.id}
              className={`grid grid-cols-[60px_1fr_160px_100px_100px_180px] gap-4 px-6 py-4 items-center border-b border-[#222] hover:bg-[#1a1a1a] transition-all duration-200 group ${
                isCurrentlyPlaying ? 'bg-[#1a2f2f]/50' : ''
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Cover Image */}
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#222] flex items-center justify-center flex-shrink-0">
                {getCoverArt(song) ? (
                  <img 
                    src={getCoverArt(song)} 
                    alt={song.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Music size={20} className="text-[#666]" />
                )}
              </div>

              {/* Song Info */}
              <div className="min-w-0">
                <h3 className={`font-semibold truncate text-sm ${isCurrentlyPlaying ? 'text-[#00e6e6]' : 'text-white'}`}>
                  {song.title}
                </h3>
                <p className="text-xs text-[#a0a0a0] truncate mt-0.5">
                  {getArtistName(song)}
                </p>
                {/* Mini progress bar khi đang phát */}
                {isCurrentlyPlaying && (
                  <div 
                    className="mt-2 h-1 bg-[#333] rounded-full cursor-pointer overflow-hidden"
                    onClick={handleSeek}
                  >
                    <div 
                      className="h-full bg-gradient-to-r from-[#00e6e6] to-[#00b8d4] rounded-full transition-all duration-100"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
                {isCurrentlyPlaying && (
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-[#666]">{formatTime(currentTime)}</span>
                    <span className="text-[10px] text-[#666]">{formatTime(audioDuration)}</span>
                  </div>
                )}
              </div>

              {/* Upload Date */}
              <div className="text-sm text-[#a0a0a0]">
                {new Date(song.createdAt).toLocaleDateString('vi-VN', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                })}
              </div>

              {/* Duration */}
              <div className="text-sm text-[#a0a0a0]">
                {formatDuration(song.durationMs)}
              </div>

              {/* Play Button */}
              <div>
                <button
                  onClick={() => togglePlaySong(song.id)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
                    isCurrentlyPlaying && isPlaying
                      ? 'bg-[#00e6e6] text-black shadow-lg shadow-[#00e6e6]/30'
                      : 'bg-[#222] text-white hover:bg-[#00e6e6] hover:text-black hover:shadow-lg hover:shadow-[#00e6e6]/20'
                  }`}
                >
                  {isCurrentlyPlaying && isPlaying ? (
                    <Pause size={16} fill="currentColor" />
                  ) : (
                    <Play size={16} fill="currentColor" className="ml-0.5" />
                  )}
                </button>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setConfirmAction({ type: 'approve', songId: song.id, songTitle: song.title })}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all duration-200"
                >
                  <CheckCircle size={14} />
                  Duyệt
                </button>
                <button
                  onClick={() => setConfirmAction({ type: 'reject', songId: song.id, songTitle: song.title })}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-semibold hover:bg-red-500/20 hover:border-red-500/40 transition-all duration-200"
                >
                  <XCircle size={14} />
                  Từ chối
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Audio Player Bar (hiển thị khi đang phát) */}
      {playingSongId && (
        <div className="fixed bottom-0 left-64 right-0 h-16 bg-[#181818] border-t border-[#333] flex items-center px-6 gap-4 z-50">
          {/* Song info */}
          <div className="flex items-center gap-3 min-w-0 w-60">
            <div className="w-10 h-10 rounded bg-[#222] flex items-center justify-center flex-shrink-0 overflow-hidden">
              {(() => {
                const song = songs.find(s => s.id === playingSongId);
                const cover = song ? getCoverArt(song) : null;
                return cover 
                  ? <img src={cover} alt="" className="w-full h-full object-cover" />
                  : <Music size={16} className="text-[#666]" />;
              })()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {songs.find(s => s.id === playingSongId)?.title || 'Unknown'}
              </p>
              <p className="text-xs text-[#a0a0a0] truncate">
                {getArtistName(songs.find(s => s.id === playingSongId) || {})}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => togglePlaySong(playingSongId)}
              className="w-9 h-9 rounded-full bg-[#00e6e6] text-black flex items-center justify-center hover:scale-105 transition-transform"
            >
              {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
            </button>
          </div>

          {/* Progress */}
          <div className="flex-1 flex items-center gap-3">
            <span className="text-xs text-[#a0a0a0] w-10 text-right">{formatTime(currentTime)}</span>
            <div 
              className="flex-1 h-1.5 bg-[#333] rounded-full cursor-pointer group"
              onClick={handleSeek}
            >
              <div 
                className="h-full bg-[#00e6e6] rounded-full relative transition-all duration-75"
                style={{ width: `${audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
            <span className="text-xs text-[#a0a0a0] w-10">{formatTime(audioDuration)}</span>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-2 w-32">
            <button 
              onClick={() => setIsMuted(!isMuted)}
              className="text-[#a0a0a0] hover:text-white transition-colors"
            >
              {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolume(parseFloat(e.target.value));
                setIsMuted(false);
              }}
              className="flex-1 accent-[#00e6e6] h-1"
            />
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmAction(null)} />
          <div className="relative bg-[#1a1a1a] border border-[#333] rounded-2xl p-8 w-full max-w-md shadow-2xl transform transition-all">
            <div className={`w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center ${
              confirmAction.type === 'approve' ? 'bg-emerald-500/10' : 'bg-red-500/10'
            }`}>
              {confirmAction.type === 'approve' 
                ? <CheckCircle size={32} className="text-emerald-400" />
                : <XCircle size={32} className="text-red-400" />
              }
            </div>
            
            <h3 className="text-xl font-bold text-white text-center mb-2">
              {confirmAction.type === 'approve' ? 'Duyệt bài hát?' : 'Từ chối bài hát?'}
            </h3>
            <p className="text-sm text-[#a0a0a0] text-center mb-6">
              {confirmAction.type === 'approve' 
                ? <>Bài hát <span className="text-white font-semibold">"{confirmAction.songTitle}"</span> sẽ được hiển thị trên trang chủ.</>
                : <>Bài hát <span className="text-white font-semibold">"{confirmAction.songTitle}"</span> sẽ bị từ chối và không được phát hành.</>
              }
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="flex-1 py-3 rounded-xl bg-[#222] text-[#a0a0a0] font-semibold hover:bg-[#333] transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  if (confirmAction.type === 'approve') {
                    handleApprove(confirmAction.songId);
                  } else {
                    handleReject(confirmAction.songId);
                  }
                }}
                className={`flex-1 py-3 rounded-xl font-semibold transition-colors ${
                  confirmAction.type === 'approve'
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                    : 'bg-red-500 text-white hover:bg-red-600'
                }`}
              >
                {confirmAction.type === 'approve' ? 'Xác nhận duyệt' : 'Xác nhận từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}