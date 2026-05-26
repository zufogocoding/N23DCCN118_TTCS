import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, History, UploadCloud, Plus, Play, MoreHorizontal, Edit2, Trash2 } from "lucide-react";
import { api, getMediaUrl } from "../../utils/api";
import { getCoverArt, getArtistName } from "../../utils/songHelpers";
import { usePlayer } from "../../context/PlayerContext";
import TrackEditModal from "../../components/TrackEditModal";

export default function LibraryPage() {
  const [songs, setSongs] = useState([]); // Uploaded songs
  const [likedSongs, setLikedSongs] = useState([]);
  const [recentSongs, setRecentSongs] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [genres, setGenres] = useState([]);
  const [activeTab, setActiveTab] = useState("playlists"); // 'playlists', 'liked', 'recent', 'uploaded'
  const [user, setUser] = useState({});
  const [openMenu, setOpenMenu] = useState(null);
  const [selectedSong, setSelectedSong] = useState(null);
  const [deletingSong, setDeletingSong] = useState(null);

  const navigate = useNavigate();
  const { playSong } = usePlayer();

  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
    setUser(currentUser);
    if (currentUser.id) {
      getUploadedSongs(currentUser.id);
      getLikedSongs();
      getRecentSongs();
      getPlaylists(currentUser.id);
      getGenres();
    }
  }, []);

  // Đóng dropdown menu khi click ra ngoài
  useEffect(() => {
    const handleOutsideClick = () => setOpenMenu(null);
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  async function getUploadedSongs(userId) {
    try {
      const res = await api.get(`/api/songs/user/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setSongs(data);
      }
    } catch (err) {
      console.log("Lỗi khi lấy danh sách nhạc upload:", err);
    }
  }

  async function getLikedSongs() {
    try {
      const res = await api.get(`/api/interactions/liked`);
      if (res.ok) {
        const data = await res.json();
        setLikedSongs(data);
      }
    } catch (err) {
      console.log("Lỗi khi lấy bài hát thích:", err);
    }
  }

  async function getRecentSongs() {
    try {
      const res = await api.get(`/api/interactions/recent`);
      if (res.ok) {
        const data = await res.json();
        setRecentSongs(data);
      }
    } catch (err) {
      console.log("Lỗi khi lấy bài hát nghe gần đây:", err);
    }
  }

  async function getPlaylists(userId) {
    try {
      const res = await api.get(`/api/playlists/user/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setPlaylists(data);
      }
    } catch (err) {
      console.log("Lỗi khi lấy playlist:", err);
    }
  }

  async function getGenres() {
    try {
      const res = await api.get(`/api/genres`);
      if (res.ok) {
        const data = await res.json();
        setGenres(data);
      }
    } catch (err) {
      console.log("Lỗi khi lấy thể loại:", err);
    }
  }

  const toggleMenu = (id, e) => {
    e.stopPropagation();
    setOpenMenu(openMenu === id ? null : id);
  };

  const openEdit = (song, e) => {
    e.stopPropagation();
    setSelectedSong(song);
    setOpenMenu(null);
  };

  const deleteSong = (song, e) => {
    e.stopPropagation();
    setDeletingSong(song);
    setOpenMenu(null);
  };

  const confirmDeleteSong = async () => {
    if (!deletingSong) return;
    try {
      const res = await api.delete(`/api/songs/${deletingSong.id}`);
      if (res.ok) {
        setDeletingSong(null);
        getUploadedSongs(user.id);
        getLikedSongs();
        getRecentSongs();
      } else {
        alert("Xóa bài hát thất bại!");
      }
    } catch (err) {
      console.log("Lỗi khi xóa bài hát:", err);
      alert("Xóa bài hát thất bại!");
    }
  };

  const renderSongsList = (songList, type) => {
    if (songList.length === 0) {
      return (
        <div className="text-center py-12 text-[#a0a0a0]">
          <p className="text-sm font-medium">Chưa có bài hát nào trong danh sách</p>
        </div>
      );
    }

    return songList.map((song, index) => (
      <div 
        key={song.id} 
        onClick={() => playSong(song, songList)}
        className="flex justify-between items-center bg-[#181818] hover:bg-[#282828] transition-all p-3.5 rounded-xl mb-3 cursor-pointer group"
      >
        <div className="flex gap-4 items-center flex-1 min-w-0">
          <div className="w-6 text-center text-[#a0a0a0] font-semibold text-sm">
            {index + 1}
          </div>
          <div className="relative w-12 h-12 rounded-lg overflow-hidden shadow-md shrink-0">
            <img src={getCoverArt(song) || "/default-cover.png"} className="w-full h-full object-cover" alt="cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Play fill="currentColor" className="text-white w-6 h-6" />
            </div>
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-white truncate text-sm leading-snug">{song.title}</h3>
            <p className="text-gray-400 text-xs truncate mt-0.5 font-medium">
              {getArtistName(song)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {type === 'uploaded' && (
            <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
              song.status === 'approved' 
                ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                : song.status === 'rejected' 
                  ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                  : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
            }`}>
              {song.status === 'approved' ? 'Đã duyệt' : song.status === 'rejected' ? 'Bị từ chối' : 'Chờ duyệt'}
            </span>
          )}

          {type === 'uploaded' && (
            <div className="relative">
              <button
                onClick={(e) => toggleMenu(song.id, e)}
                className="p-2 text-[#a0a0a0] hover:text-white transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 rounded-full hover:bg-white/10"
              >
                <MoreHorizontal size={18} />
              </button>

              {openMenu === song.id && (
                <div className="absolute right-0 top-full mt-1 bg-[#222] rounded-lg shadow-xl border border-[#333] w-36 z-50 py-1 overflow-hidden">
                  <button
                    className="w-full text-left px-3 py-2.5 text-xs text-[#e0e0e0] hover:bg-white/10 transition-colors flex items-center gap-2 font-medium"
                    onClick={(e) => openEdit(song, e)}
                  >
                    <Edit2 size={14} /> Chỉnh sửa
                  </button>
                  <button
                    className="w-full text-left px-3 py-2.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2 font-medium"
                    onClick={(e) => deleteSong(song, e)}
                  >
                    <Trash2 size={14} /> Xóa bài hát
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    ));
  };

  return (
    <div className="p-8 text-white max-w-7xl mx-auto space-y-10">
      
      {/* Profile Header */}
      <div className="flex items-center gap-6 bg-[#121212] p-8 rounded-2xl border border-[#222]">
        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-500 flex items-center justify-center text-3xl font-bold shadow-lg">
          {user.displayName?.charAt(0)?.toUpperCase() || user.username?.charAt(0)?.toUpperCase() || 'U'}
        </div>
        <div>
          <h1 className="text-3xl font-bold mb-2">{user.displayName || user.username || 'User'}</h1>
          <p className="text-[#a0a0a0] text-sm font-medium">Thư viện cá nhân</p>
        </div>
      </div>

      {/* Quick Access Navigation Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <button 
          onClick={() => setActiveTab('playlists')}
          className={`flex items-center gap-4 p-5 rounded-2xl transition-all text-left ${activeTab === 'playlists' ? 'bg-[#181818] border-[#00e6e6]/50 shadow-lg shadow-[#00e6e6]/5' : 'bg-[#121212] hover:bg-[#181818] border-transparent'} border-2`}
        >
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
            <Plus size={24} />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-sm">Playlists</h3>
            <p className="text-[#a0a0a0] text-xs font-medium truncate mt-0.5">{playlists.length} danh sách</p>
          </div>
        </button>

        <button 
          onClick={() => setActiveTab('liked')}
          className={`flex items-center gap-4 p-5 rounded-2xl transition-all text-left ${activeTab === 'liked' ? 'bg-[#181818] border-[#00e6e6]/50 shadow-lg shadow-[#00e6e6]/5' : 'bg-[#121212] hover:bg-[#181818] border-transparent'} border-2`}
        >
          <div className="w-12 h-12 rounded-xl bg-pink-500/10 text-pink-500 flex items-center justify-center shrink-0">
            <Heart size={24} fill="currentColor" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-sm">Yêu Thích</h3>
            <p className="text-[#a0a0a0] text-xs font-medium truncate mt-0.5">{likedSongs.length} bài hát</p>
          </div>
        </button>

        <button 
          onClick={() => setActiveTab('recent')}
          className={`flex items-center gap-4 p-5 rounded-2xl transition-all text-left ${activeTab === 'recent' ? 'bg-[#181818] border-[#00e6e6]/50 shadow-lg shadow-[#00e6e6]/5' : 'bg-[#121212] hover:bg-[#181818] border-transparent'} border-2`}
        >
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
            <History size={24} />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-sm">Nghe gần đây</h3>
            <p className="text-[#a0a0a0] text-xs font-medium truncate mt-0.5">{recentSongs.length} bài hát</p>
          </div>
        </button>

        <button 
          onClick={() => setActiveTab('uploaded')}
          className={`flex items-center gap-4 p-5 rounded-2xl transition-all text-left ${activeTab === 'uploaded' ? 'bg-[#181818] border-[#00e6e6]/50 shadow-lg shadow-[#00e6e6]/5' : 'bg-[#121212] hover:bg-[#181818] border-transparent'} border-2`}
        >
          <div className="w-12 h-12 rounded-xl bg-green-500/10 text-green-400 flex items-center justify-center shrink-0">
            <UploadCloud size={24} />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-sm">Đã tải lên</h3>
            <p className="text-[#a0a0a0] text-xs font-medium truncate mt-0.5">{songs.length} bài hát</p>
          </div>
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="bg-[#121212] p-8 rounded-2xl border border-[#222] min-h-[400px]">
        <div className="flex justify-between items-center mb-8 border-b border-[#222] pb-5">
          <h2 className="text-xl font-bold text-white">
            {activeTab === 'playlists' ? `Playlist của tôi (${playlists.length})` : 
             activeTab === 'liked' ? 'Bài hát đã thích' :
             activeTab === 'recent' ? 'Lịch sử nghe gần đây' : 'Danh sách nhạc đã upload'}
          </h2>
        </div>

        {activeTab === 'playlists' && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {/* Create Playlist Button Card */}
            <div 
              className="bg-[#181818] hover:bg-[#222] transition-colors rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer min-h-[220px] group border border-dashed border-[#333] hover:border-[#00e6e6]/50"
              onClick={() => navigate('/create-playlist')}
            >
              <div className="w-14 h-14 rounded-full bg-[#222] group-hover:bg-[#00e6e6]/15 group-hover:text-[#00e6e6] flex items-center justify-center mb-4 transition-colors">
                <Plus size={28} />
              </div>
              <p className="font-bold text-sm text-center">Tạo playlist mới</p>
            </div>

            {/* Playlist Cards */}
            {playlists.map(playlist => (
              <div 
                key={playlist.id} 
                className="bg-[#181818] hover:bg-[#222] transition-colors rounded-xl p-4 cursor-pointer group" 
                onClick={() => navigate(`/playlist/${playlist.id}`)}
              >
                <div className="relative mb-4 aspect-square rounded-lg overflow-hidden shadow-lg">
                  <img 
                    src={playlist.coverArtUrl ? getMediaUrl(playlist.coverArtUrl) : "/default-cover.png"} 
                    className="w-full h-full object-cover"
                    alt={playlist.title}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-12 h-12 bg-[#00e6e6] rounded-full flex items-center justify-center text-black shadow-xl hover:scale-105 transition-transform">
                      <Play fill="currentColor" size={22} className="ml-1" />
                    </div>
                  </div>
                </div>
                <h3 className="font-bold text-sm text-white truncate">{playlist.title}</h3>
                <p className="text-gray-400 text-xs mt-1 font-medium">{playlist.isPublic ? 'Công khai' : 'Riêng tư'}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'liked' && renderSongsList(likedSongs, 'liked')}
        {activeTab === 'recent' && renderSongsList(recentSongs, 'recent')}
        {activeTab === 'uploaded' && renderSongsList(songs, 'uploaded')}
      </div>

      {/* Reused TrackEditModal Component */}
      {selectedSong && (
        <TrackEditModal
          song={selectedSong}
          genres={genres}
          onClose={() => setSelectedSong(null)}
          onSaved={() => {
            getUploadedSongs(user.id);
            getLikedSongs();
            getRecentSongs();
          }}
        />
      )}

      {/* Custom Delete Confirmation Modal */}
      {deletingSong && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
          <div className="bg-[#181818] border border-[#333] p-8 rounded-2xl w-full max-w-sm shadow-2xl relative text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 size={32} className="text-red-500" />
            </div>
            <h2 className="text-xl font-bold mb-3 text-white">Xóa bài hát?</h2>
            <p className="text-[#a0a0a0] text-sm mb-8 leading-relaxed">
              Bạn có chắc chắn muốn xóa bài hát "<span className="text-white font-semibold">{deletingSong.title}</span>" không? Hành động này không thể hoàn tác.
            </p>
            
            <div className="flex gap-4">
              <button
                onClick={() => setDeletingSong(null)}
                className="flex-1 py-3 font-bold text-white bg-transparent border border-[#333] rounded-full hover:bg-white/10 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={confirmDeleteSong}
                className="flex-1 py-3 font-bold text-white bg-red-500 rounded-full hover:bg-red-600 transition-colors"
              >
                Xóa ngay
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}