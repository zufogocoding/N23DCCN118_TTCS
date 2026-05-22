import { useEffect, useState } from "react";
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