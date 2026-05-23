import { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Search, Heart, Play } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import AddToPlaylistMenu from '../../components/AddToPlaylistMenu';
import CreatePlaylistModal from '../../components/CreatePlaylistModal';
import UploadButton from "../../components/layout/UploadButton";
import { getPrimaryArtistUserId } from '../../utils/artistNav';
import { api, getMediaUrl } from '../../utils/api';
import { getArtistName, getCoverArt } from '../../utils/songHelpers';




export default function Home() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const navigate = useNavigate();
  const { playSong } = usePlayer();

  const [songs, setSongs] = useState([]);
  const [userPlaylists, setUserPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');

  // Fetch songs từ API (chỉ lấy bài đã approved)
  useEffect(() => {
    async function fetchData() {
      try {
        const [songsRes, playlistsRes] = await Promise.all([
          api.get('/api/songs'),
          user.id ? api.get(`/api/playlists/user/${user.id}`) : Promise.resolve(null)
        ]);

        if (songsRes.ok) {
          const data = await songsRes.json();
          setSongs(data);
        }

        if (playlistsRes && playlistsRes.ok) {
          const plData = await playlistsRes.json();
          setUserPlaylists(plData);
        }
      } catch (err) {
        console.error('Lỗi khi tải dữ liệu:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePlaySong = (song, queueList) => {
    const playerSong = {
      id: song.id,
      title: song.title,
      artist: { name: getArtistName(song) },
      coverImage: getCoverArt(song),
    };
    const playerQueue = (queueList || songs).map(s => ({
      id: s.id,
      title: s.title,
      artist: { name: getArtistName(s) },
      coverImage: getCoverArt(s),
    }));
    playSong(playerSong, playerQueue);
  };

  // Lọc local cho trang chủ
  const filteredSongs = songs.filter(song =>
    song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    getArtistName(song).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPlaylists = userPlaylists.filter(pl =>
    pl.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {/* Modal tạo playlist */}
      <CreatePlaylistModal
        isOpen={isPlaylistModalOpen}
        onClose={() => setIsPlaylistModalOpen(false)}
      />

      {/* HEADER BÊN TRONG CỘT GIỮA */}
      <div className="sticky top-0 bg-[#121212]/90 backdrop-blur-md z-10 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (searchQuery.trim()) setSearchQuery('');
                else navigate(-1);
              }}
              className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-white hover:bg-[#333] transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <button className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-[#a0a0a0] cursor-not-allowed">
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="relative w-[300px] hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black" size={18} />
            <input
              type="text"
              placeholder="What do you want to listen to?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full py-2 pl-10 pr-4 rounded-full bg-white text-black text-sm outline-none font-medium"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <UploadButton />
        </div>
      </div>

      {/* CONTENT */}
      <div className="p-6 pt-0 flex-1 overflow-y-auto">

        {searchQuery.trim() ? (
          <div className="mt-8 mb-10">
            <h2 className="text-2xl font-bold text-white mb-6">Kết quả cho "{searchQuery}"</h2>

            {filteredPlaylists.length === 0 && filteredSongs.length === 0 ? (
              <div className="p-8 border border-dashed border-[#333] rounded-xl text-center">
                <p className="text-[#a0a0a0] font-medium">Không tìm thấy bài hát hay playlist nào phù hợp.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-10">
                {/* Lọc Playlists */}
                {filteredPlaylists.length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold text-[#b83280] mb-4">Playlists</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                      {filteredPlaylists.map(pl => (
                        <div
                          key={pl.id}
                          onClick={() => navigate(`/playlist/${pl.id}`)}
                          className="bg-[#181818] p-4 rounded-xl hover:bg-[#282828] transition-colors cursor-pointer group"
                        >
                          <div className="w-full aspect-square bg-gradient-to-br from-[#00e6e6]/20 to-[#333] rounded-md mb-4 shadow-lg flex items-center justify-center overflow-hidden">
                            {pl.coverArtUrl ? (
                              <img src={getMediaUrl(pl.coverArtUrl)} alt="cover" className="w-full h-full object-cover" />
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

                {/* Lọc Songs */}
                {filteredSongs.length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold text-white mb-4">Bài hát</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-5">
                      {filteredSongs.map(song => (
                        <div
                          key={song.id}
                          className="bg-[#181818] p-4 rounded-xl hover:bg-[#282828] transition-colors cursor-pointer group relative"
                        >
                          <div className="relative mb-4" onClick={() => handlePlaySong(song, filteredSongs)}>
                            <img src={getCoverArt(song)} className="w-full aspect-square object-cover rounded-md shadow-lg" alt={song.title} />
                            <button className="absolute bottom-2 right-2 w-12 h-12 rounded-full bg-[#1ed760] flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                              <Play size={24} fill="black" color="black" className="ml-0.5" />
                            </button>
                          </div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1" onClick={() => handlePlaySong(song, filteredSongs)}>
                              <h3 className="font-bold text-white truncate text-base mb-1">{song.title}</h3>
                              <p
                                className={`text-sm text-[#a0a0a0] truncate ${getPrimaryArtistUserId(song) ? 'hover:text-white hover:underline cursor-pointer' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const uid = getPrimaryArtistUserId(song);
                                  if (uid) navigate(`/artist/${uid}`);
                                }}
                              >
                                {getArtistName(song)}
                              </p>
                            </div>
                            <AddToPlaylistMenu songId={song.id} onCreatePlaylist={() => setIsPlaylistModalOpen(true)} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* TRẠNG THÁI BÌNH THƯỜNG */
          <>
            {/* Greeting */}
            <div className="mt-8 mb-6">
              <h1 className="text-4xl font-black text-[#5e9ca0] mb-1 uppercase tracking-wider">
                {user.username ? 'Welcome Back' : 'Welcome to Soundwave'}
              </h1>
              {user.username && <h2 className="text-xl font-bold">{user.artistName || user.displayName || user.username}</h2>}
            </div>

            {/* Section: My Library - User Playlists từ DB */}
            {user.id && (
              <div className="mb-10">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-[#b83280]">My Library</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {/* Liked Songs Card */}
                  <div
                    onClick={() => navigate('/playlist/liked')}
                    className="bg-[#181818] p-4 rounded-xl hover:bg-[#282828] transition-colors cursor-pointer group"
                  >
                    <div className="w-full aspect-square bg-gradient-to-br from-indigo-600 to-purple-800 rounded-md mb-4 shadow-lg flex items-center justify-center">
                      <Heart size={48} className="text-white fill-current" />
                    </div>
                    <h3 className="font-bold truncate text-white">Liked Songs</h3>
                  </div>

                  {/* User playlists từ DB */}
                  {userPlaylists.map(pl => (
                    <div
                      key={pl.id}
                      onClick={() => navigate(`/playlist/${pl.id}`)}
                      className="bg-[#181818] p-4 rounded-xl hover:bg-[#282828] transition-colors cursor-pointer group"
                    >
                      <div className="w-full aspect-square bg-gradient-to-br from-[#00e6e6]/20 to-[#333] rounded-md mb-4 shadow-lg flex items-center justify-center overflow-hidden">
                        {pl.coverArtUrl ? (
                          <img src={getMediaUrl(pl.coverArtUrl)} alt="cover" className="w-full h-full object-cover" />
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

            {/* Section: All Songs (từ DB - chỉ hiện bài approved) */}
            <div className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white">
                  {songs.length > 0 ? 'Trending Songs' : 'Bài hát'}
                </h2>
              </div>

              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#00e6e6]"></div>
                </div>
              ) : songs.length === 0 ? (
                <div className="p-8 border border-dashed border-[#333] rounded-xl text-center">
                  <p className="text-[#a0a0a0] font-medium">Chưa có bài hát nào trong hệ thống.</p>
                  <p className="text-xs text-[#666] mt-2">Hãy upload bài hát qua trang Upload.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-5">
                  {songs.map(song => (
                    <div
                      key={song.id}
                      className="bg-[#181818] p-4 rounded-xl hover:bg-[#282828] transition-colors cursor-pointer group relative"
                    >
                      {/* Cover image + Play overlay */}
                      <div className="relative mb-4" onClick={() => handlePlaySong(song, songs)}>
                        <img
                          src={getCoverArt(song)}
                          className="w-full aspect-square object-cover rounded-md shadow-lg"
                          alt={song.title}
                        />
                        <button className="absolute bottom-2 right-2 w-12 h-12 rounded-full bg-[#1ed760] flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                          <Play size={24} fill="black" color="black" className="ml-0.5" />
                        </button>
                      </div>

                      {/* Song info */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1" onClick={() => handlePlaySong(song, songs)}>
                          <h3 className="font-bold text-white truncate text-base mb-1">{song.title}</h3>
                          <p
                            role={getPrimaryArtistUserId(song) ? 'link' : undefined}
                            className={`text-sm text-[#a0a0a0] truncate ${getPrimaryArtistUserId(song) ? 'hover:text-white hover:underline cursor-pointer' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              const uid = getPrimaryArtistUserId(song);
                              if (uid) navigate(`/artist/${uid}`);
                            }}
                          >
                            {getArtistName(song)}
                          </p>
                        </div>
                        <AddToPlaylistMenu
                          songId={song.id}
                          onCreatePlaylist={() => setIsPlaylistModalOpen(true)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  );
}