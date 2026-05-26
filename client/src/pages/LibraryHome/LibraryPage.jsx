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
  };



  return (

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

    </div>
  );
}