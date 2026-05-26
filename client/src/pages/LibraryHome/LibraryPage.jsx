import { useEffect, useState } from "react";

import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Heart, MoreHorizontal, Edit2, Trash2 } from "lucide-react";

export default function LibraryPage() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const navigate = useNavigate();
  const [songs, setSongs] = useState([]);
  const [userPlaylists, setUserPlaylists] = useState([]);
  const [openMenu, setOpenMenu] = useState(null);
  const [selectedSong, setSelectedSong] = useState(null);
  const [deletingSong, setDeletingSong] = useState(null);

  useEffect(() => {
    if (user.id) {
      getUploadedSongs();
      fetchPlaylists();
    }
  }, []);

  async function fetchPlaylists() {
    try {
      const res = await fetch(`http://localhost:9000/api/playlists/user/${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setUserPlaylists(data);
      }
    } catch (err) {
      console.error("Lỗi khi lấy playlist:", err);
    }
  }

  async function getUploadedSongs() {
    try {
      const res = await axios.get(
        `http://localhost:9000/api/songs/user/${user.id}`
      );

      setSongs(res.data);

    } catch (err) {
      console.log("Lỗi:", err);
    }
  };

    
  const toggleMenu = (id) => {

    setOpenMenu(
      openMenu === id ? null : id
    );

  };



  const openEdit = (song) => {
    setSelectedSong({
      ...song,
      artistName: song.artistName || "",
      genre: song.genre || "",
      description: song.description || ""
    });
    setOpenMenu(null);
  };

  const updateSong = async () => {
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("title", selectedSong.title || "");
      formData.append("artistName", selectedSong.artistName || "");
      formData.append("genreIds", selectedSong.genre || "");
      
      await axios.put(`http://localhost:9000/api/songs/${selectedSong.id}`, formData, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        }
      });
      setSelectedSong(null);
      getUploadedSongs();
    } catch(err) {
      console.log("Lỗi update:", err);
      alert("Chỉnh sửa bài hát thất bại!");
    }
  };

  const deleteSong = (song) => {
    setOpenMenu(null);
    setDeletingSong(song);
  };

  const confirmDeleteSong = async () => {
    if (!deletingSong) return;
    try {
      await axios.delete(`http://localhost:9000/api/songs/${deletingSong.id}`);
      setDeletingSong(null);
      getUploadedSongs();
    } catch (err) {
      console.log(err);
      alert("Xóa bài hát thất bại!");
    }
import { api } from "../../utils/api";
import { getCoverArt } from "../../utils/songHelpers";
import { Heart, History, UploadCloud, Plus, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePlayer } from "../../context/PlayerContext";

export default function LibraryPage() {
  const [songs, setSongs] = useState([]); // Uploaded songs
  const [likedSongs, setLikedSongs] = useState([]);
  const [recentSongs, setRecentSongs] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [activeTab, setActiveTab] = useState("playlists"); // 'playlists', 'liked', 'recent', 'uploaded'
  const [user, setUser] = useState({});

  const navigate = useNavigate();
  const { playSong } = usePlayer();

  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
    setUser(currentUser);
    getUploadedSongs(currentUser.id);
    getLikedSongs();
    getRecentSongs();
    getPlaylists(currentUser.id);
  }, []);

  async function getUploadedSongs(userId) {
    try {
      const res = await api.get(`/api/songs/user/${userId || 1}`);
      if (res.ok) {
        const data = await res.json();
        setSongs(data);
      }
    } catch (err) {
      console.log("Lỗi:", err);
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
      console.log("Lỗi:", err);
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
      console.log("Lỗi:", err);
    }
  }

  async function getPlaylists(userId) {
    try {
      const res = await api.get(`/api/playlists/user/${userId || 1}`);
      if (res.ok) {
        const data = await res.json();
        setPlaylists(data);
      }
    } catch (err) {
      console.log("Lỗi:", err);
    }
  }



  const renderSongsList = (songList, type) => {
    if (songList.length === 0) {
      return (
        <div className="text-center py-10 text-gray-400">
          <p>Chưa có bài hát nào</p>
        </div>
      );
    }

    return songList.map((song) => (
      <div 
        key={song.id} 
        onClick={() => playSong(song, songList)}
        className="flex justify-between items-center bg-[#1e1e1e] hover:bg-[#2a2a2a] transition-colors p-4 rounded-lg mb-3 cursor-pointer group"
      >
        <div className="flex gap-4 items-center">
          <div className="relative w-16 h-16 rounded overflow-hidden">
            <img src={getCoverArt(song) || "/default-cover.png"} className="w-full h-full object-cover" alt="cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Play fill="currentColor" className="text-white w-8 h-8" />
            </div>
          </div>
          <div>
            <h3 className="font-bold">{song.title}</h3>
            <p className="text-gray-400 text-sm">
              {song.artists?.map(a => a.artist?.user?.displayName || a.artist?.user?.username).join(", ") || "Unknown Artist"}
            </p>
            {type === 'uploaded' && (
              <span className="text-xs bg-gray-700 px-2 py-1 rounded mt-1 inline-block">
                {song.status}
              </span>
            )}
          </div>
        </div>

      </div>
    ));

  };

  return (
    <div className="p-8 text-white max-w-7xl mx-auto">
      {/* Profile Header section similar to NCT */}
      <div className="flex items-center gap-6 mb-10">
        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-500 flex items-center justify-center text-3xl font-bold shadow-lg">
          {user.displayName?.charAt(0)?.toUpperCase() || user.username?.charAt(0)?.toUpperCase() || 'U'}
        </div>
        <div>
          <h1 className="text-3xl font-bold mb-2">{user.displayName || user.username || 'User'}</h1>
          <p className="text-gray-400 text-sm">Thư viện cá nhân</p>
        </div>
      </div>


    <div className="p-8 text-white h-full overflow-y-auto">

      <h1 className="text-4xl font-bold mb-8">
        Thư viện của tôi
      </h1>

      {user.id && (
        <div className="mb-10">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            <div
              onClick={() => navigate('/playlist/liked')}
              className="bg-[#181818] p-4 rounded-xl hover:bg-[#282828] transition-colors cursor-pointer group"
            >
              <div className="w-full aspect-square bg-gradient-to-br from-indigo-600 to-purple-800 rounded-md mb-4 shadow-lg flex items-center justify-center">
                <Heart size={48} className="text-white fill-current" />
              </div>
              <h3 className="font-bold truncate text-white">Bài hát đã thích</h3>
            </div>

            {userPlaylists.map(pl => (
              <div
                key={pl.id}
                onClick={() => navigate(`/playlist/${pl.id}`)}
                className="bg-[#181818] p-4 rounded-xl hover:bg-[#282828] transition-colors cursor-pointer group"
              >
                <div className="w-full aspect-square bg-gradient-to-br from-[#00e6e6]/20 to-[#333] rounded-md mb-4 shadow-lg flex items-center justify-center overflow-hidden">
                  {pl.coverArtUrl ? (
                    <img src={`http://localhost:9000${pl.coverArtUrl}`} alt="cover" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl">🎵</span>
                  )}
                </div>
                <h3 className="font-bold truncate text-white">{pl.title}</h3>
                <p className="text-xs text-[#a0a0a0] mt-1">{pl._count?.songs || 0} bài hát</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="text-2xl mb-5 mt-10 border-t border-[#333] pt-6">
        Bài hát đã upload
      </h2>


      {songs.length === 0 ? (
        <div className="p-8 border border-dashed border-[#333] rounded-xl text-center mt-4">
          <p className="text-[#a0a0a0] font-medium">Chưa có bài hát nào được upload.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 mt-4 pb-20">
          {songs.map((song, index) => (
            <div
              key={song.id}
              className="flex items-center justify-between bg-[#181818] hover:bg-[#282828] p-3 rounded-xl transition-colors group"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="w-8 text-center text-[#a0a0a0] font-medium text-sm">
                  {index + 1}
                </div>
                <img
                  src={song.coverArtUrl ? (song.coverArtUrl.startsWith('http') ? song.coverArtUrl : `http://localhost:9000${song.coverArtUrl}`) : "https://images.unsplash.com/photo-1598387993441-a364f854c3e1?q=80&w=400&auto=format&fit=crop"}
                  className="w-12 h-12 rounded object-cover shadow-md"
                  alt="cover"
                />
                <div className="flex flex-col min-w-0 pr-4">
                  <h3 className="font-bold text-white truncate text-sm">{song.title}</h3>
                  <p className="text-xs text-[#a0a0a0] truncate mt-1">{song.artistName || "Unknown Artist"}</p>
                </div>
              </div>

              <div className="flex items-center gap-6 pr-2">
                <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${song.status === 'approved' ? 'bg-green-500/20 text-green-400' : song.status === 'rejected' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                  {song.status === 'approved' ? 'Đã duyệt' : song.status === 'rejected' ? 'Bị từ chối' : 'Chờ duyệt'}
                </span>

                <div className="relative">
                  <button
                    onClick={() => toggleMenu(song.id)}
                    className="p-2 text-[#a0a0a0] hover:text-white transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 rounded-full hover:bg-white/10"
                  >
                    <MoreHorizontal size={20} />
                  </button>

                  {openMenu === song.id && (
                    <div className="absolute right-0 top-full mt-1 bg-[#282828] rounded-lg shadow-xl border border-[#333] w-44 z-50 py-1 overflow-hidden">
                      <button
                        className="w-full text-left px-4 py-2.5 text-sm text-[#e0e0e0] hover:bg-white/10 transition-colors flex items-center gap-3 font-medium"
                        onClick={() => openEdit(song)}
                      >
                        <Edit2 size={16} /> Chỉnh sửa
                      </button>
                      <button
                        className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-3 font-medium"
                        onClick={() => deleteSong(song)}
                      >
                        <Trash2 size={16} /> Xóa bài hát
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedSong && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-[#181818] border border-[#333] p-8 rounded-2xl w-full max-w-md shadow-2xl relative">
            <h2 className="text-2xl font-black mb-6 text-white tracking-tight">Chỉnh sửa bài hát</h2>
            
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#a0a0a0] mb-2">Tên bài hát</label>
                <input
                  className="w-full p-3.5 bg-[#222] border border-[#333] rounded-xl text-white focus:outline-none focus:border-[#00e6e6] transition-colors text-sm font-medium"
                  value={selectedSong.title}
                  onChange={(e) => setSelectedSong({ ...selectedSong, title: e.target.value })}
                  placeholder="Nhập tên bài hát"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#a0a0a0] mb-2">Nghệ sĩ</label>
                <input
                  className="w-full p-3.5 bg-[#222] border border-[#333] rounded-xl text-white focus:outline-none focus:border-[#00e6e6] transition-colors text-sm font-medium"
                  value={selectedSong.artistName}
                  onChange={(e) => setSelectedSong({ ...selectedSong, artistName: e.target.value })}
                  placeholder="Tên nghệ sĩ"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#a0a0a0] mb-2">Thể loại</label>
                <input
                  className="w-full p-3.5 bg-[#222] border border-[#333] rounded-xl text-white focus:outline-none focus:border-[#00e6e6] transition-colors text-sm font-medium"
                  value={selectedSong.genre}
                  onChange={(e) => setSelectedSong({ ...selectedSong, genre: e.target.value })}
                  placeholder="Pop, Rock, Rap..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#a0a0a0] mb-2">Mô tả</label>
                <textarea
                  className="w-full p-3.5 bg-[#222] border border-[#333] rounded-xl text-white focus:outline-none focus:border-[#00e6e6] transition-colors resize-none h-28 text-sm font-medium"
                  value={selectedSong.description}
                  onChange={(e) => setSelectedSong({ ...selectedSong, description: e.target.value })}
                  placeholder="Thêm mô tả cho bài hát..."
                />
              </div>
            </div>

            <div className="flex gap-4 mt-8 pt-6 border-t border-[#333]">
              <button
                onClick={() => setSelectedSong(null)}
                className="flex-1 py-3.5 font-bold text-white bg-transparent border border-[#555] rounded-full hover:bg-white/10 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={updateSong}
                className="flex-1 py-3.5 font-black text-black bg-[#00e6e6] rounded-full hover:scale-[1.02] active:scale-[0.98] transition-transform"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingSong && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-[#181818] border border-[#333] p-8 rounded-2xl w-full max-w-sm shadow-2xl relative text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 size={32} className="text-red-500" />
            </div>
            <h2 className="text-xl font-bold mb-3 text-white">Xóa bài hát?</h2>
            <p className="text-[#a0a0a0] text-sm mb-8">
              Bạn có chắc chắn muốn xóa bài hát "<span className="text-white font-medium">{deletingSong.title}</span>" không? Hành động này không thể hoàn tác.
            </p>
            
            <div className="flex gap-4">
              <button
                onClick={() => setDeletingSong(null)}
                className="flex-1 py-3 font-bold text-white bg-transparent border border-[#555] rounded-full hover:bg-white/10 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={confirmDeleteSong}
                className="flex-1 py-3 font-black text-white bg-red-500 rounded-full hover:bg-red-600 transition-colors"
              >
                Xóa ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <button 
          onClick={() => setActiveTab('liked')}
          className={`flex items-center gap-4 p-4 rounded-xl transition-all ${activeTab === 'liked' ? 'bg-[#2a2a2a] border-cyan-500' : 'bg-[#181818] hover:bg-[#222] border-transparent'} border-2`}
        >
          <div className="w-12 h-12 rounded bg-pink-500/20 text-pink-500 flex items-center justify-center">
            <Heart size={24} fill="currentColor" />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-lg">Yêu Thích</h3>
            <p className="text-gray-400 text-sm">{likedSongs.length} bài hát</p>
          </div>
        </button>

        <button 
          onClick={() => setActiveTab('recent')}
          className={`flex items-center gap-4 p-4 rounded-xl transition-all ${activeTab === 'recent' ? 'bg-[#2a2a2a] border-cyan-500' : 'bg-[#181818] hover:bg-[#222] border-transparent'} border-2`}
        >
          <div className="w-12 h-12 rounded bg-blue-500/20 text-blue-500 flex items-center justify-center">
            <History size={24} />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-lg">Nghe gần đây</h3>
            <p className="text-gray-400 text-sm">{recentSongs.length} bài hát</p>
          </div>
        </button>

        <button 
          onClick={() => setActiveTab('uploaded')}
          className={`flex items-center gap-4 p-4 rounded-xl transition-all ${activeTab === 'uploaded' ? 'bg-[#2a2a2a] border-cyan-500' : 'bg-[#181818] hover:bg-[#222] border-transparent'} border-2`}
        >
          <div className="w-12 h-12 rounded bg-green-500/20 text-green-500 flex items-center justify-center">
            <UploadCloud size={24} />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-lg">Đã tải lên</h3>
            <p className="text-gray-400 text-sm">{songs.length} bài hát</p>
          </div>
        </button>
      </div>

      {/* Main Content Area Based on Active Tab */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">
            {activeTab === 'playlists' ? "Playlist đã tạo (" + playlists.length + ")" : 
             activeTab === 'liked' ? 'Bài hát Yêu Thích' :
             activeTab === 'recent' ? 'Nghe gần đây' : 'Bài hát đã upload'}
          </h2>
          
          {activeTab !== 'playlists' && (
            <button onClick={() => setActiveTab('playlists')} className="text-cyan-500 hover:underline text-sm font-medium">
              Xem Playlists
            </button>
          )}
        </div>

        {activeTab === 'playlists' && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {/* Create Playlist Card */}
            <div 
              className="bg-[#181818] hover:bg-[#222] transition-colors rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer min-h-[240px] group border border-dashed border-gray-600 hover:border-cyan-500"
              onClick={() => navigate('/create-playlist')} // Ensure this route exists or update it
            >
              <div className="w-16 h-16 rounded-full bg-[#2a2a2a] group-hover:bg-cyan-500/20 group-hover:text-cyan-500 flex items-center justify-center mb-4 transition-colors">
                <Plus size={32} />
              </div>
              <p className="font-bold text-center">Tạo playlist mới</p>
            </div>

            {playlists.map(playlist => (
              <div key={playlist.id} className="bg-[#181818] hover:bg-[#222] transition-colors rounded-xl p-4 cursor-pointer group" onClick={() => navigate(`/playlist/${playlist.id}`)}>
                <div className="relative mb-4 aspect-square">
                  <img 
                    src={playlist.coverUrl ? "http://localhost:5000" + playlist.coverUrl : "/default-cover.png"} 
                    className="w-full h-full object-cover rounded-lg shadow-lg"
                    alt={playlist.title}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                    <div className="w-12 h-12 bg-cyan-500 rounded-full flex items-center justify-center text-white shadow-xl hover:scale-105 transition-transform">
                      <Play fill="currentColor" size={24} className="ml-1" />
                    </div>
                  </div>
                </div>
                <h3 className="font-bold truncate">{playlist.title}</h3>
                <p className="text-gray-400 text-sm mt-1">{playlist.isPublic ? 'Công khai' : 'Riêng tư'}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'liked' && renderSongsList(likedSongs, 'liked')}
        {activeTab === 'recent' && renderSongsList(recentSongs, 'recent')}
        {activeTab === 'uploaded' && renderSongsList(songs, 'uploaded')}
      </div>


    </div>
  );
}