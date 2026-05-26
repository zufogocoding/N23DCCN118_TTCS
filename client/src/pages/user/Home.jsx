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

  const [albums, setAlbums] = useState([]);

  const [dailyChart, setDailyChart] = useState([]);
  const [weeklyChart, setWeeklyChart] = useState([]);
  const [monthlyChart, setMonthlyChart] = useState([]);

  const [loading, setLoading] = useState(true);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);

  const [recommendedSongs, setRecommendedSongs] = useState([]);
  const [recentSongs, setRecentSongs] = useState([]);
  const [recentPlaylists, setRecentPlaylists] = useState([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('recentSearches')) || [];
    } catch { return []; }
  });

  const handleRecentSearchClick = (q) => {
    setSearchQuery(q);
    setIsSearchFocused(false);
  };

  const filteredRecent = recentSearches.filter(q => q.toLowerCase().includes(searchQuery.toLowerCase()));

  // Fetch songs từ API (chỉ lấy bài đã approved)
  useEffect(() => {
    async function fetchData() {
      try {

        const [songsRes, playlistsRes, albumsRes] = await Promise.all([
          fetch('http://localhost:9000/api/songs'),
          user.id ? fetch(`http://localhost:9000/api/playlists/user/${user.id}`) : Promise.resolve(null),
          fetch('http://localhost:9000/api/albums')

        const [songsRes, playlistsRes, dailyRes, weeklyRes, monthlyRes, recRes, recentRes] = await Promise.all([
          api.get('/api/songs'),
          user.id ? api.get(`/api/playlists/user/${user.id}`) : Promise.resolve(null),
          api.get('/api/charts/DAILY'),
          api.get('/api/charts/WEEKLY'),
          api.get('/api/charts/MONTHLY'),
          user.id ? api.get('/api/recommendations') : Promise.resolve(null),
          user.id ? api.get('/api/interactions/recent') : Promise.resolve(null)

        ]);

        let fetchedSongs = [];
        if (songsRes.ok) {
          const data = await songsRes.json();
          fetchedSongs = data;
          setSongs(data);
        }

        if (playlistsRes && playlistsRes.ok) {
          const plData = await playlistsRes.json();
          setUserPlaylists(plData);
        }


        if (albumsRes && albumsRes.ok) {
          const alData = await albumsRes.json();
          setAlbums(alData);
        }

        if (dailyRes && dailyRes.ok) {
          const data = await dailyRes.json();
          setDailyChart(data?.songs || []);
        }

        if (weeklyRes && weeklyRes.ok) {
          const data = await weeklyRes.json();
          setWeeklyChart(data?.songs || []);
        }

        if (monthlyRes && monthlyRes.ok) {
          const data = await monthlyRes.json();
          setMonthlyChart(data?.songs || []);
        }

        // Set recommendations
        if (recRes && recRes.ok) {
          const recData = await recRes.json();
          setRecommendedSongs(recData);
        } else {
          // Guest or Cold Start fallback
          setRecommendedSongs(fetchedSongs.slice(0, 10));
        }

        // Set recent history
        if (recentRes && recentRes.ok) {
          const recentData = await recentRes.json();
          setRecentSongs(recentData);
        } else {
          // Read from localStorage for guest
          setRecentSongs(JSON.parse(localStorage.getItem('guest_recent_songs') || '[]'));
        }
        
        // Always read recent playlists from localStorage
        setRecentPlaylists(JSON.parse(localStorage.getItem('guest_recent_playlists') || '[]'));


      } catch (err) {
        console.error('Lỗi khi tải dữ liệu:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lắng nghe sự kiện cập nhật lịch sử nghe nhạc của khách
  useEffect(() => {
    const handleUpdate = () => {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      if (!currentUser.id) {
        setRecentSongs(JSON.parse(localStorage.getItem('guest_recent_songs') || '[]'));
        setRecentPlaylists(JSON.parse(localStorage.getItem('guest_recent_playlists') || '[]'));
      }
    };
    window.addEventListener('guestHistoryUpdated', handleUpdate);
    return () => window.removeEventListener('guestHistoryUpdated', handleUpdate);
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

  const filteredAlbums = albums.filter(al =>
    al.title.toLowerCase().includes(searchQuery.toLowerCase())
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
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              className="w-full py-2 pl-10 pr-4 rounded-full bg-white text-black text-sm outline-none font-medium"
            />
            {isSearchFocused && filteredRecent.length > 0 && (
              <div className="absolute top-full left-0 w-full mt-2 bg-[#282828] rounded-xl shadow-2xl py-2 z-50">
                <div className="px-4 py-2 flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-[#a0a0a0] uppercase tracking-wider">Tìm kiếm gần đây</span>
                  <button 
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setRecentSearches([]);
                      localStorage.removeItem('recentSearches');
                    }}
                    className="text-xs font-semibold text-[#a0a0a0] hover:text-white"
                  >
                    Xóa
                  </button>
                </div>
                {filteredRecent.map((q, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleRecentSearchClick(q)}
                    className="px-4 py-2.5 hover:bg-[#3e3e3e] cursor-pointer flex items-center text-sm text-white"
                  >
                    <Search size={16} className="mr-3 text-[#a0a0a0]" />
                    {q}
                  </div>
                ))}
              </div>
            )}
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

            {filteredPlaylists.length === 0 && filteredSongs.length === 0 && filteredAlbums.length === 0 ? (
              <div className="p-8 border border-dashed border-[#333] rounded-xl text-center">
                <p className="text-[#a0a0a0] font-medium">Không tìm thấy bài hát, playlist, hay album nào phù hợp.</p>
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

                {/* Lọc Albums */}
                {filteredAlbums.length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold text-[#b83280] mb-4">Albums</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                      {filteredAlbums.map(al => (
                        <div
                          key={al.id}
                          onClick={() => navigate(`/album/${al.id}`)}
                          className="bg-[#181818] p-4 rounded-xl hover:bg-[#282828] transition-colors cursor-pointer group"
                        >
                          <div className="w-full aspect-square bg-gradient-to-br from-[#00e6e6]/20 to-[#333] rounded-md mb-4 shadow-lg flex items-center justify-center overflow-hidden">
                            {al.coverArtUrl ? (
                              <img src={`http://localhost:9000${al.coverArtUrl}`} alt="cover" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-4xl">🎵</span>
                            )}
                          </div>
                          <h3 className="font-bold truncate text-white">{al.title}</h3>
                          <p className="text-xs text-[#a0a0a0] mt-1">{al.artist?.artistName || al.artist?.user?.displayName || al.artist?.user?.username || 'Unknown Artist'}</p>
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

            {/* Section: Có thể bạn sẽ thích */}
            {recommendedSongs.length > 0 && (
              <div className="mb-10">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#00e6e6] to-[#008080] tracking-tight">
                    Có thể bạn sẽ thích
                  </h2>
                  <span className="text-xs text-[#a0a0a0] font-semibold uppercase tracking-wider bg-white/5 px-3 py-1 rounded-full border border-white/5">
                    Đề xuất thông minh
                  </span>
                </div>
                <div className="flex overflow-x-auto gap-6 pb-4 custom-scrollbar">
                  {recommendedSongs.map(song => (
                    <div
                      key={song.id}
                      className="bg-[#181818] p-4 rounded-xl hover:bg-[#282828] transition-all duration-300 cursor-pointer group relative w-[200px] flex-shrink-0 hover:scale-103 shadow-lg"
                    >
                      <div className="relative mb-4 overflow-hidden rounded-md" onClick={() => handlePlaySong(song, recommendedSongs)}>
                        <img
                          src={getCoverArt(song)}
                          className="w-full aspect-square object-cover shadow-lg transition-transform duration-500 group-hover:scale-110"
                          alt={song.title}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button className="w-12 h-12 rounded-full bg-[#00e6e6] text-black flex items-center justify-center shadow-2xl transform translate-y-3 group-hover:translate-y-0 transition-all duration-300 hover:scale-105">
                            <Play size={24} fill="currentColor" className="ml-1" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1" onClick={() => handlePlaySong(song, recommendedSongs)}>
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
                        <AddToPlaylistMenu
                          songId={song.id}
                          onCreatePlaylist={() => setIsPlaylistModalOpen(true)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Các Bảng Xếp Hạng Nổi Bật */}
            {(dailyChart.length > 0 || weeklyChart.length > 0 || monthlyChart.length > 0) && (
              <div className="mb-10">
                <h2 className="text-2xl font-bold text-white mb-4">Bảng xếp hạng nổi bật</h2>
                <div className="flex overflow-x-auto gap-6 pb-4 custom-scrollbar">
                  
                  {/* Top 50 Ngày */}
                  <div 
                    className="bg-[#181818] p-4 rounded-xl hover:bg-[#282828] transition-colors cursor-pointer group relative w-[200px] flex-shrink-0" 
                    onClick={() => navigate('/chart/DAILY')}
                  >
                    <div className="relative mb-4">
                      <div className="w-full aspect-square rounded-md shadow-lg flex items-center justify-center bg-gradient-to-br from-[#8A2387] via-[#E94057] to-[#F27121]">
                          <h3 className="text-white font-bold text-3xl text-center px-2">Top 50<br/>Ngày</h3>
                      </div>
                      <button 
                        className="absolute bottom-2 right-2 w-12 h-12 rounded-full bg-[#1ed760] flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0"
                        onClick={(e) => {
                           e.stopPropagation();
                           if(dailyChart.length > 0) handlePlaySong(dailyChart[0].song, dailyChart.map(c => c.song));
                        }}
                      >
                        <Play size={24} fill="black" color="black" className="ml-1" />
                      </button>
                    </div>
                    <div>
                      <p className="text-sm text-[#a0a0a0] line-clamp-2">Cập nhật hằng ngày những bản nhạc thịnh hành nhất.</p>
                    </div>
                  </div>

                  {/* Top 50 Tuần */}
                  <div 
                    className="bg-[#181818] p-4 rounded-xl hover:bg-[#282828] transition-colors cursor-pointer group relative w-[200px] flex-shrink-0" 
                    onClick={() => navigate('/chart/WEEKLY')}
                  >
                    <div className="relative mb-4">
                      <div className="w-full aspect-square rounded-md shadow-lg flex items-center justify-center bg-gradient-to-br from-[#00C9FF] to-[#92FE9D]">
                          <h3 className="text-white font-bold text-3xl text-center px-2">Top 50<br/>Tuần</h3>
                      </div>
                      <button 
                        className="absolute bottom-2 right-2 w-12 h-12 rounded-full bg-[#1ed760] flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0"
                        onClick={(e) => {
                           e.stopPropagation();
                           if(weeklyChart.length > 0) handlePlaySong(weeklyChart[0].song, weeklyChart.map(c => c.song));
                        }}
                      >
                        <Play size={24} fill="black" color="black" className="ml-1" />
                      </button>
                    </div>
                    <div>
                      <p className="text-sm text-[#a0a0a0] line-clamp-2">Cập nhật hằng tuần những bản nhạc thịnh hành nhất.</p>
                    </div>
                  </div>

                  {/* Top 50 Tháng */}
                  <div 
                    className="bg-[#181818] p-4 rounded-xl hover:bg-[#282828] transition-colors cursor-pointer group relative w-[200px] flex-shrink-0" 
                    onClick={() => navigate('/chart/MONTHLY')}
                  >
                    <div className="relative mb-4">
                      <div className="w-full aspect-square rounded-md shadow-lg flex items-center justify-center bg-gradient-to-br from-[#11998e] to-[#38ef7d]">
                          <h3 className="text-white font-bold text-3xl text-center px-2">Top 50<br/>Tháng</h3>
                      </div>
                      <button 
                        className="absolute bottom-2 right-2 w-12 h-12 rounded-full bg-[#1ed760] flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0"
                        onClick={(e) => {
                           e.stopPropagation();
                           if(monthlyChart.length > 0) handlePlaySong(monthlyChart[0].song, monthlyChart.map(c => c.song));
                        }}
                      >
                        <Play size={24} fill="black" color="black" className="ml-1" />
                      </button>
                    </div>
                    <div>
                      <p className="text-sm text-[#a0a0a0] line-clamp-2">Cập nhật hằng tháng những bản nhạc thịnh hành nhất.</p>
                    </div>
                  </div>

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

            {/* Section: Lịch sử nghe nhạc */}
            {(recentSongs.length > 0 || recentPlaylists.length > 0) && (
              <div className="mb-10 mt-6 border-t border-[#222] pt-8">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  <span>⏱️ Trải nghiệm gần đây của bạn</span>
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* CỘT 1: BÀI HÁT GẦN ĐÂY */}
                  {recentSongs.length > 0 && (
                    <div className="bg-white/5 border border-white/5 p-5 rounded-2xl backdrop-blur-md">
                      <h3 className="text-lg font-bold text-[#00e6e6] mb-4">Bài hát vừa phát</h3>
                      <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                        {recentSongs.slice(0, 5).map((song) => (
                          <div
                            key={song.id}
                            onClick={() => handlePlaySong(song, recentSongs)}
                            className="flex items-center gap-4 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors group"
                          >
                            <img src={getCoverArt(song)} className="w-12 h-12 object-cover rounded shadow" alt="cover" />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-white text-sm truncate group-hover:text-[#00e6e6] transition-colors">{song.title}</h4>
                              <p className="text-xs text-[#a0a0a0] truncate">{getArtistName(song)}</p>
                            </div>
                            <span className="text-[10px] text-gray-500 bg-white/5 px-2 py-1 rounded">Vừa xong</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* CỘT 2: PLAYLIST GẦN ĐÂY */}
                  {recentPlaylists.length > 0 && (
                    <div className="bg-white/5 border border-white/5 p-5 rounded-2xl backdrop-blur-md">
                      <h3 className="text-lg font-bold text-[#b83280] mb-4">Playlist đã xem</h3>
                      <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                        {recentPlaylists.slice(0, 5).map((pl) => (
                          <div
                            key={pl.id}
                            onClick={() => navigate(`/playlist/${pl.id}`)}
                            className="flex items-center gap-4 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors group"
                          >
                            <div className="w-12 h-12 rounded bg-gradient-to-br from-[#b83280] to-[#333] flex items-center justify-center overflow-hidden">
                              {pl.coverArtUrl ? (
                                <img src={getMediaUrl(pl.coverArtUrl)} className="w-full h-full object-cover" alt="cover" />
                              ) : (
                                <span className="text-lg">🎵</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-white text-sm truncate group-hover:text-[#b83280] transition-colors">{pl.title}</h4>
                              <p className="text-xs text-[#a0a0a0] truncate">{pl.songCount || 0} bài hát</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}