import { useState, useEffect, useRef } from 'react';
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Search, Heart, Play, Info } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import { useAuth } from '../../context/AuthContext';
import AddToPlaylistMenu from '../../components/common/AddToPlaylistMenu';
import CreatePlaylistModal from '../../components/common/CreatePlaylistModal';
import UploadButton from "../../components/layout/UploadButton";
import { getPrimaryArtistUserId } from '../../utils/artistNav';
import { api, getMediaUrl } from '../../utils/api';
import { getArtistName, getCoverArt } from '../../utils/songHelpers';

export default function Home() {
  const { user } = useAuth();
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

  // Refs for slide containers
  const recommendedRef = useRef(null);
  const chartsRef = useRef(null);
  const songsRef = useRef(null);

  const [systemPlaylists, setSystemPlaylists] = useState({ featured: [], context: [], genre: [] });
  const sysFeaturedRef = useRef(null);
  const sysContextRef = useRef(null);
  const sysGenreRef = useRef(null);

  const getContextTitle = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return "Chào buổi sáng đầy năng lượng";
    if (hour >= 11 && hour < 14) return "Nhạc trưa thư giãn";
    if (hour >= 14 && hour < 17) return "Nhạc chill buổi chiều";
    if (hour >= 17 && hour < 22) return "Giai điệu buổi tối";
    return "Nhạc ngủ ngon";
  };

  const scrollContainer = (ref, direction) => {
    if (ref.current) {
      const scrollAmount = direction === 'left' ? -640 : 640;
      ref.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

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

        const [songsRes, playlistsRes, albumsRes, dailyRes, weeklyRes, monthlyRes, recRes, recentRes, systemRes] = await Promise.all([
          api.get('/api/songs'),
          user.id ? api.get(`/api/playlists/user/${user.id}`) : Promise.resolve(null),
          api.get('/api/albums'),
          api.get('/api/charts/DAILY'),
          api.get('/api/charts/WEEKLY'),
          api.get('/api/charts/MONTHLY'),
          user.id ? api.get('/api/recommendations') : Promise.resolve(null),
          user.id ? api.get('/api/interactions/recent') : Promise.resolve(null),
          api.get('/api/system-playlists/home')
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

        if (systemRes && systemRes.ok) {
          const sysData = await systemRes.json();
          if (sysData.success && sysData.data) {
             const grouped = { featured: [], context: [], genre: [] };
             sysData.data.forEach(p => {
               if (p.category === 'Nổi bật') grouped.featured.push(p);
               else if (p.category === 'Theo ngữ cảnh') grouped.context.push(p);
               else if (p.category === 'Theo thể loại') grouped.genre.push(p);
               else grouped.featured.push(p);
             });
             setSystemPlaylists(grouped);
          }
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

  // Lắng nghe sự kiện cập nhật lịch sử nghe nhạc của khách
  useEffect(() => {
    const handleUpdate = () => {
      if (!user?.id) {
        setRecentSongs(JSON.parse(localStorage.getItem('guest_recent_songs') || '[]'));
        setRecentPlaylists(JSON.parse(localStorage.getItem('guest_recent_playlists') || '[]'));
      }
    };
    window.addEventListener('guestHistoryUpdated', handleUpdate);
    return () => window.removeEventListener('guestHistoryUpdated', handleUpdate);
  }, [user?.id]);

  const handlePlaySong = (song, queueList) => {
    playSong(song, queueList || songs);
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
      <div className="sticky top-0 z-10 p-4 flex items-center justify-between bg-transparent pointer-events-none">
        <div className="flex items-center gap-4 pointer-events-auto">
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (searchQuery.trim()) setSearchQuery('');
                else navigate(-1);
              }}
              className="w-8 h-8 rounded-full bg-surface-hover flex items-center justify-center text-text hover:bg-border transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <button className="w-8 h-8 rounded-full bg-surface-hover flex items-center justify-center text-text-muted cursor-not-allowed">
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="relative w-[300px] hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
            <input
              type="text"
              placeholder="What do you want to listen to?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              className="w-full py-2.5 pl-11 pr-4 rounded-full bg-surface/40 backdrop-blur-xl text-text text-sm outline-none font-medium border border-white/5 focus:border-primary/50 focus:bg-surface/60 transition-all shadow-inner"
            />
            {isSearchFocused && filteredRecent.length > 0 && (
              <div className="absolute top-full left-0 w-full mt-2 bg-surface rounded-xl shadow-2xl py-2 z-50 border border-border">
                <div className="px-4 py-2 flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Tìm kiếm gần đây</span>
                  <button 
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setRecentSearches([]);
                      localStorage.removeItem('recentSearches');
                    }}
                    className="text-xs font-semibold text-text-muted hover:text-text"
                  >
                    Xóa
                  </button>
                </div>
                {filteredRecent.map((q) => (
                  <div
                    key={q}
                    onClick={() => handleRecentSearchClick(q)}
                    className="px-4 py-2.5 hover:bg-surface-hover cursor-pointer flex items-center text-sm text-text"
                  >
                    <Search size={16} className="mr-3 text-text-muted" />
                    {q}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 pointer-events-auto">
          <UploadButton />
        </div>
      </div>

      {/* CONTENT */}
      <div className="p-6 pt-0 flex-1 overflow-y-auto">

        {searchQuery.trim() ? (
          <div className="mt-8 mb-10">
            <h2 className="text-2xl font-bold text-text mb-6">Kết quả cho "{searchQuery}"</h2>

            {filteredPlaylists.length === 0 && filteredSongs.length === 0 && filteredAlbums.length === 0 ? (
              <div className="p-8 border border-dashed border-border rounded-xl text-center">
                <p className="text-text-muted font-medium">Không tìm thấy bài hát, playlist, hay album nào phù hợp.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-10">
                {/* Lọc Playlists */}
                {filteredPlaylists.length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold text-primary mb-4">Playlists</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                      {filteredPlaylists.map(pl => (
                        <div
                          key={pl.id}
                          onClick={() => navigate(`/playlist/${pl.id}`)}
                          className="bg-surface/30 backdrop-blur-md border border-white/5 p-4 rounded-2xl hover:bg-surface/50 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 cursor-pointer group"
                        >
                          <div className="w-full aspect-square bg-gradient-to-br from-primary/20 to-border rounded-md mb-4 shadow-lg flex items-center justify-center overflow-hidden">
                            {pl.coverArtUrl ? (
                              <img src={getMediaUrl(pl.coverArtUrl)} alt="cover" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-4xl">🎵</span>
                            )}
                          </div>
                          <h3 className="font-bold truncate text-text">{pl.title}</h3>
                          <p className="text-xs text-text-muted mt-1">{pl._count?.songs || 0} bài hát</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Lọc Albums */}
                {filteredAlbums.length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold text-primary mb-4">Albums</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                      {filteredAlbums.map(al => (
                        <div
                          key={al.id}
                          onClick={() => navigate(`/album/${al.id}`)}
                          className="bg-surface/30 backdrop-blur-md border border-white/5 p-4 rounded-2xl hover:bg-surface/50 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 cursor-pointer group"
                        >
                          <div className="w-full aspect-square bg-gradient-to-br from-primary/20 to-border rounded-md mb-4 shadow-lg flex items-center justify-center overflow-hidden">
                            {al.coverArtUrl ? (
                              <img src={getMediaUrl(al.coverArtUrl)} alt="cover" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-4xl">🎵</span>
                            )}
                          </div>
                          <h3 className="font-bold truncate text-text">{al.title}</h3>
                          <p className="text-xs text-text-muted mt-1">{al.artist?.artistName || al.artist?.user?.displayName || al.artist?.user?.username || 'Unknown Artist'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Lọc Songs */}
                {filteredSongs.length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold text-text mb-4">Bài hát</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-5">
                      {filteredSongs.map(song => (
                        <div
                          key={song.id}
                          className="bg-surface/30 backdrop-blur-md border border-white/5 p-4 rounded-2xl hover:bg-surface/50 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 cursor-pointer group relative"
                        >
                          <div className="relative mb-4" onClick={() => handlePlaySong(song, filteredSongs)}>
                            <img src={getCoverArt(song)} className="w-full aspect-square object-cover rounded-md shadow-lg" alt={song.title} />
                            <button className="absolute bottom-2 right-2 w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                              <Play size={24} fill="white" color="white" className="ml-0.5" />
                            </button>
                          </div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1" onClick={() => handlePlaySong(song, filteredSongs)}>
                              <h3 className="font-bold text-text truncate text-base mb-1">{song.title}</h3>
                              <p
                                className={`text-sm text-text-muted truncate ${getPrimaryArtistUserId(song) ? 'hover:text-primary hover:underline cursor-pointer' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const uid = getPrimaryArtistUserId(song);
                                  if (uid) navigate(`/artist/${uid}`);
                                }}
                              >
                                {getArtistName(song)}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={(e) => { e.stopPropagation(); navigate(`/song/${song.id}`); }}
                                className="p-2 rounded-full hover:bg-white/10 text-[#a0a0a0] hover:text-white transition-colors"
                                title="Chi tiết bài hát"
                              >
                                <Info size={20} />
                              </button>
                              <AddToPlaylistMenu songId={song.id} onCreatePlaylist={() => setIsPlaylistModalOpen(true)} />
                            </div>
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
              <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-hover mb-1 uppercase tracking-wider">
                {user.username ? 'Welcome Back' : 'Welcome to Soundwave'}
              </h1>
              {user.username && <h2 className="text-xl font-bold text-text">{user.artistName || user.displayName || user.username}</h2>}
            </div>

            {/* System Playlists - Nổi bật */}
            {systemPlaylists.featured.length > 0 && (
              <div className="mb-10 animate-fade-in">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-hover tracking-tight">
                    Danh sách phát nổi bật
                  </h2>
                  <div className="flex gap-1.5">
                    <button onClick={() => scrollContainer(sysFeaturedRef, 'left')}
                      className="w-8 h-8 rounded-full bg-surface-hover border border-white/5 flex items-center justify-center text-text hover:bg-border hover:text-white active:scale-95 transition-all">
                      <ChevronLeft size={16} />
                    </button>
                    <button onClick={() => scrollContainer(sysFeaturedRef, 'right')}
                      className="w-8 h-8 rounded-full bg-surface-hover border border-white/5 flex items-center justify-center text-text hover:bg-border hover:text-white active:scale-95 transition-all">
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
                <div ref={sysFeaturedRef} className="flex overflow-x-auto gap-5 pb-4 no-scrollbar scroll-smooth">
                  {systemPlaylists.featured.map(pl => (
                    <div key={pl.id} onClick={() => navigate(`/playlist/${pl.id}`)}
                      className="relative bg-surface/30 backdrop-blur-md border border-white/5 rounded-2xl hover:bg-surface/50 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-primary/20 transition-all duration-300 cursor-pointer overflow-hidden group w-[220px] h-[220px] flex-shrink-0 flex items-end">
                      <div className="absolute inset-0">
                        {pl.coverArtUrl ? (
                          <img src={getMediaUrl(pl.coverArtUrl)} alt="cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/40 to-black" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90" />
                      </div>
                      <div className="relative z-10 w-full p-4">
                        <h3 className="font-bold text-white text-lg truncate mb-0.5">{pl.title}</h3>
                        {pl.description && <p className="text-xs text-gray-300 line-clamp-2">{pl.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* System Playlists - Theo ngữ cảnh */}
            {systemPlaylists.context.length > 0 && (
              <div className="mb-10 animate-fade-in">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-text">{getContextTitle()}</h2>
                  <div className="flex gap-1.5">
                    <button onClick={() => scrollContainer(sysContextRef, 'left')}
                      className="w-8 h-8 rounded-full bg-surface-hover border border-white/5 flex items-center justify-center text-text hover:bg-border hover:text-white active:scale-95 transition-all">
                      <ChevronLeft size={16} />
                    </button>
                    <button onClick={() => scrollContainer(sysContextRef, 'right')}
                      className="w-8 h-8 rounded-full bg-surface-hover border border-white/5 flex items-center justify-center text-text hover:bg-border hover:text-white active:scale-95 transition-all">
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
                <div ref={sysContextRef} className="flex overflow-x-auto gap-5 pb-4 no-scrollbar scroll-smooth">
                  {systemPlaylists.context.map(pl => (
                    <div key={pl.id} onClick={() => navigate(`/playlist/${pl.id}`)}
                      className="bg-surface/30 backdrop-blur-md border border-white/5 p-4 rounded-2xl hover:bg-surface/50 hover:-translate-y-1.5 hover:shadow-2xl transition-all duration-300 cursor-pointer group shadow-lg w-[200px] flex-shrink-0">
                      <div className="w-full aspect-square rounded-md mb-4 shadow-lg overflow-hidden relative">
                        {pl.coverArtUrl ? (
                          <img src={getMediaUrl(pl.coverArtUrl)} alt="cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-indigo-600 to-purple-800 flex items-center justify-center text-4xl">🎵</div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-xl transform translate-y-2 group-hover:translate-y-0 transition-all">
                            <Play size={24} fill="white" color="white" className="ml-1" />
                          </button>
                        </div>
                      </div>
                      <h3 className="font-bold truncate text-text">{pl.title}</h3>
                      <p className="text-xs text-text-muted mt-1 truncate">{pl.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* System Playlists - Theo thể loại */}
            {systemPlaylists.genre.length > 0 && (
              <div className="mb-10 animate-fade-in">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-text">Khám phá theo Thể Loại</h2>
                  <div className="flex gap-1.5">
                    <button onClick={() => scrollContainer(sysGenreRef, 'left')}
                      className="w-8 h-8 rounded-full bg-surface-hover border border-white/5 flex items-center justify-center text-text hover:bg-border hover:text-white active:scale-95 transition-all">
                      <ChevronLeft size={16} />
                    </button>
                    <button onClick={() => scrollContainer(sysGenreRef, 'right')}
                      className="w-8 h-8 rounded-full bg-surface-hover border border-white/5 flex items-center justify-center text-text hover:bg-border hover:text-white active:scale-95 transition-all">
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
                <div ref={sysGenreRef} className="flex overflow-x-auto gap-5 pb-4 no-scrollbar scroll-smooth">
                  {systemPlaylists.genre.map(pl => (
                    <div key={pl.id} onClick={() => navigate(`/playlist/${pl.id}`)}
                      className="bg-surface/30 backdrop-blur-md border border-white/5 p-4 rounded-2xl hover:bg-surface/50 hover:-translate-y-1.5 hover:shadow-2xl transition-all duration-300 cursor-pointer group shadow-lg w-[200px] flex-shrink-0">
                      <div className="w-full aspect-square rounded-md mb-4 shadow-lg overflow-hidden">
                        {pl.coverArtUrl ? (
                          <img src={getMediaUrl(pl.coverArtUrl)} alt="cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-pink-600 to-rose-800 flex items-center justify-center text-4xl">🎵</div>
                        )}
                      </div>
                      <h3 className="font-bold truncate text-text">{pl.title}</h3>
                      {pl.description && <p className="text-xs text-text-muted mt-1 truncate">{pl.description}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section: My Library - User Playlists từ DB */}
            {user.id && (
              <div className="mb-10">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-primary">My Library</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {/* Liked Songs Card */}
                  <div
                    onClick={() => navigate('/playlist/liked')}
                    className="bg-surface/30 backdrop-blur-md border border-white/5 p-4 rounded-2xl hover:bg-surface/50 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 cursor-pointer group shadow-lg"
                  >
                    <div className="w-full aspect-square bg-gradient-to-br from-indigo-600 to-purple-800 rounded-md mb-4 shadow-lg flex items-center justify-center">
                      <Heart size={48} className="text-white fill-current" />
                    </div>
                    <h3 className="font-bold truncate text-text">Liked Songs</h3>
                  </div>

                  {/* User playlists từ DB */}
                  {userPlaylists.map(pl => (
                    <div
                      key={pl.id}
                      onClick={() => navigate(`/playlist/${pl.id}`)}
                      className="bg-surface/30 backdrop-blur-md border border-white/5 p-4 rounded-2xl hover:bg-surface/50 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 cursor-pointer group shadow-lg"
                    >
                      <div className="w-full aspect-square bg-gradient-to-br from-primary/20 to-border rounded-md mb-4 shadow-lg flex items-center justify-center overflow-hidden">
                        {pl.coverArtUrl ? (
                          <img src={getMediaUrl(pl.coverArtUrl)} alt="cover" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-4xl">🎵</span>
                        )}
                      </div>
                      <h3 className="font-bold truncate text-text">{pl.title}</h3>
                      <p className="text-xs text-text-muted mt-1">{pl._count?.songs || 0} bài hát</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section: Có thể bạn sẽ thích */}
            {recommendedSongs.length > 0 && (
              <div className="mb-10 animate-fade-in">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-hover tracking-tight">
                    Có thể bạn sẽ thích
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-muted font-semibold uppercase tracking-wider bg-surface-hover px-3 py-1 rounded-full border border-border mr-2 hidden sm:inline-block">
                      Đề xuất thông minh
                    </span>
                    <div className="flex gap-1.5">
                      <button 
                        onClick={() => scrollContainer(recommendedRef, 'left')}
                        className="w-8 h-8 rounded-full bg-surface-hover border border-white/5 flex items-center justify-center text-text hover:bg-border hover:text-white active:scale-95 transition-all"
                        title="Trượt sang trái"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button 
                        onClick={() => scrollContainer(recommendedRef, 'right')}
                        className="w-8 h-8 rounded-full bg-surface-hover border border-white/5 flex items-center justify-center text-text hover:bg-border hover:text-white active:scale-95 transition-all"
                        title="Trượt sang phải"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
                <div ref={recommendedRef} className="flex overflow-x-auto gap-6 pb-4 no-scrollbar scroll-smooth">
                  {recommendedSongs.map(song => (
                    <div
                      key={song.id}
                      className="bg-surface/30 backdrop-blur-md border border-white/5 p-4 rounded-2xl hover:bg-surface/50 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 cursor-pointer group relative w-[200px] flex-shrink-0"
                    >
                      <div className="relative mb-4 overflow-hidden rounded-md" onClick={() => handlePlaySong(song, recommendedSongs)}>
                        <img
                          src={getCoverArt(song)}
                          className="w-full aspect-square object-cover shadow-lg transition-transform duration-500 group-hover:scale-110"
                          alt={song.title}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center shadow-2xl transform translate-y-3 group-hover:translate-y-0 transition-all duration-300 hover:scale-105">
                            <Play size={24} fill="currentColor" className="ml-1" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1" onClick={() => handlePlaySong(song, recommendedSongs)}>
                          <h3 className="font-bold text-text truncate text-base mb-1">{song.title}</h3>
                          <p
                            className={`text-sm text-text-muted truncate ${getPrimaryArtistUserId(song) ? 'hover:text-primary hover:underline cursor-pointer' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              const uid = getPrimaryArtistUserId(song);
                              if (uid) navigate(`/artist/${uid}`);
                            }}
                          >
                            {getArtistName(song)}
                          </p>
                          {song.recommend_reason && (
                            <span className="text-[10px] text-[#00e6e6] mt-2 block font-semibold truncate bg-[#00e6e6]/10 px-2 py-0.5 rounded border border-[#00e6e6]/10 w-fit">
                              💡 {song.recommend_reason}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={(e) => { e.stopPropagation(); navigate(`/song/${song.id}`); }}
                            className="p-2 rounded-full hover:bg-white/10 text-[#a0a0a0] hover:text-white transition-colors"
                            title="Chi tiết bài hát"
                          >
                            <Info size={20} />
                          </button>
                          <AddToPlaylistMenu
                            songId={song.id}
                            onCreatePlaylist={() => setIsPlaylistModalOpen(true)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Các Bảng Xếp Hạng Nổi Bật */}
            {(dailyChart.length > 0 || weeklyChart.length > 0 || monthlyChart.length > 0) && (
              <div className="mb-10 animate-fade-in">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-text">Bảng xếp hạng nổi bật</h2>
                  <div className="flex gap-1.5">
                    <button 
                      onClick={() => scrollContainer(chartsRef, 'left')}
                      className="w-8 h-8 rounded-full bg-surface-hover border border-white/5 flex items-center justify-center text-text hover:bg-border hover:text-white active:scale-95 transition-all"
                      title="Trượt sang trái"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button 
                      onClick={() => scrollContainer(chartsRef, 'right')}
                      className="w-8 h-8 rounded-full bg-surface-hover border border-white/5 flex items-center justify-center text-text hover:bg-border hover:text-white active:scale-95 transition-all"
                      title="Trượt sang phải"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
                <div ref={chartsRef} className="flex overflow-x-auto gap-6 pb-4 no-scrollbar scroll-smooth">
                  
                  {/* Top 50 Ngày */}
                  <div 
                    className="bg-surface/30 backdrop-blur-md border border-white/5 p-4 rounded-2xl hover:bg-surface/50 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 cursor-pointer group relative w-[200px] flex-shrink-0" 
                    onClick={() => navigate('/chart/DAILY')}
                  >
                    <div className="relative mb-4">
                      <div className="w-full aspect-square rounded-xl shadow-lg flex items-center justify-center bg-gradient-to-br from-primary/20 to-transparent border border-primary/20 backdrop-blur-xl">
                          <h3 className="text-white font-bold text-3xl text-center px-2">Top 50<br/>Ngày</h3>
                      </div>
                      <button 
                        className="absolute bottom-2 right-2 w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0"
                        onClick={(e) => {
                           e.stopPropagation();
                           if(dailyChart.length > 0) handlePlaySong(dailyChart[0].song, dailyChart.map(c => c.song));
                        }}
                      >
                        <Play size={24} fill="white" color="white" className="ml-1" />
                      </button>
                    </div>
                    <div>
                      <p className="text-sm text-text-muted line-clamp-2">Cập nhật hằng ngày những bản nhạc thịnh hành nhất.</p>
                    </div>
                  </div>

                  {/* Top 50 Tuần */}
                  <div 
                    className="bg-surface/30 backdrop-blur-md border border-white/5 p-4 rounded-2xl hover:bg-surface/50 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 cursor-pointer group relative w-[200px] flex-shrink-0" 
                    onClick={() => navigate('/chart/WEEKLY')}
                  >
                    <div className="relative mb-4">
                      <div className="w-full aspect-square rounded-xl shadow-lg flex items-center justify-center bg-gradient-to-br from-indigo-500/20 to-transparent border border-indigo-500/20 backdrop-blur-xl">
                          <h3 className="text-white font-bold text-3xl text-center px-2">Top 50<br/>Tuần</h3>
                      </div>
                      <button 
                        className="absolute bottom-2 right-2 w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0"
                        onClick={(e) => {
                           e.stopPropagation();
                           if(weeklyChart.length > 0) handlePlaySong(weeklyChart[0].song, weeklyChart.map(c => c.song));
                        }}
                      >
                        <Play size={24} fill="white" color="white" className="ml-1" />
                      </button>
                    </div>
                    <div>
                      <p className="text-sm text-text-muted line-clamp-2">Cập nhật hằng tuần những bản nhạc thịnh hành nhất.</p>
                    </div>
                  </div>

                  {/* Top 50 Tháng */}
                  <div 
                    className="bg-surface/30 backdrop-blur-md border border-white/5 p-4 rounded-2xl hover:bg-surface/50 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 cursor-pointer group relative w-[200px] flex-shrink-0" 
                    onClick={() => navigate('/chart/MONTHLY')}
                  >
                    <div className="relative mb-4">
                      <div className="w-full aspect-square rounded-xl shadow-lg flex items-center justify-center bg-gradient-to-br from-emerald-500/20 to-transparent border border-emerald-500/20 backdrop-blur-xl">
                          <h3 className="text-white font-bold text-3xl text-center px-2">Top 50<br/>Tháng</h3>
                      </div>
                      <button 
                        className="absolute bottom-2 right-2 w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0"
                        onClick={(e) => {
                           e.stopPropagation();
                           if(monthlyChart.length > 0) handlePlaySong(monthlyChart[0].song, monthlyChart.map(c => c.song));
                        }}
                      >
                        <Play size={24} fill="white" color="white" className="ml-1" />
                      </button>
                    </div>
                    <div>
                      <p className="text-sm text-text-muted line-clamp-2">Cập nhật hằng tháng những bản nhạc thịnh hành nhất.</p>
                    </div>
                  </div>

                </div>
              </div>
            )}

            
            {/* Section: All Songs (từ DB - chỉ hiện bài approved) */}
            <div className="mb-10 animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-text">
                  {songs.length > 0 ? 'Trending Songs' : 'Bài hát'}
                </h2>
                {songs.length > 0 && (
                  <div className="flex gap-1.5">
                    <button 
                      onClick={() => scrollContainer(songsRef, 'left')}
                      className="w-8 h-8 rounded-full bg-surface-hover border border-white/5 flex items-center justify-center text-text hover:bg-border hover:text-white active:scale-95 transition-all"
                      title="Trượt sang trái"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button 
                      onClick={() => scrollContainer(songsRef, 'right')}
                      className="w-8 h-8 rounded-full bg-surface-hover border border-white/5 flex items-center justify-center text-text hover:bg-border hover:text-white active:scale-95 transition-all"
                      title="Trượt sang phải"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>

              {loading ? (
                <div className="flex overflow-x-auto gap-5 pb-4 no-scrollbar">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="bg-surface/30 backdrop-blur-md border border-white/5 p-4 rounded-2xl w-[200px] flex-shrink-0 animate-pulse">
                      <div className="w-full aspect-square bg-white/5 rounded-md mb-4" />
                      <div className="h-4 bg-white/5 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-white/5 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : songs.length === 0 ? (
                <div className="p-8 border border-dashed border-border rounded-xl text-center">
                  <p className="text-text-muted font-medium">Chưa có bài hát nào trong hệ thống.</p>
                  <p className="text-xs text-text-muted mt-2">Hãy upload bài hát qua trang Upload.</p>
                </div>
              ) : (
                <div ref={songsRef} className="flex overflow-x-auto gap-5 pb-4 no-scrollbar scroll-smooth">
                  {songs.map(song => (
                    <div
                      key={song.id}
                      className="bg-surface/30 backdrop-blur-md border border-white/5 p-4 rounded-2xl hover:bg-surface/50 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 cursor-pointer group relative w-[200px] flex-shrink-0"
                    >
                      {/* Cover image + Play overlay */}
                      <div className="relative mb-4" onClick={() => handlePlaySong(song, songs)}>
                        <img
                          src={getCoverArt(song)}
                          className="w-full aspect-square object-cover rounded-md shadow-lg"
                          alt={song.title}
                        />
                        <button className="absolute bottom-2 right-2 w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                          <Play size={24} fill="white" color="white" className="ml-0.5" />
                        </button>
                      </div>

                      {/* Song info */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1" onClick={() => handlePlaySong(song, songs)}>
                          <h3 className="font-bold text-text truncate text-base mb-1">{song.title}</h3>
                          <p
                            role={getPrimaryArtistUserId(song) ? 'link' : undefined}
                            className={`text-sm text-text-muted truncate ${getPrimaryArtistUserId(song) ? 'hover:text-primary hover:underline cursor-pointer' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              const uid = getPrimaryArtistUserId(song);
                              if (uid) navigate(`/artist/${uid}`);
                            }}
                          >
                            {getArtistName(song)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={(e) => { e.stopPropagation(); navigate(`/song/${song.id}`); }}
                            className="p-2 rounded-full hover:bg-white/10 text-[#a0a0a0] hover:text-white transition-colors"
                            title="Chi tiết bài hát"
                          >
                            <Info size={20} />
                          </button>
                          <AddToPlaylistMenu
                            songId={song.id}
                            onCreatePlaylist={() => setIsPlaylistModalOpen(true)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section: Lịch sử nghe nhạc */}
            {(recentSongs.length > 0 || recentPlaylists.length > 0) && (
              <div className="mb-10 mt-6 border-t border-border pt-8">
                <h2 className="text-2xl font-bold text-text mb-6 flex items-center gap-2">
                  <span>⏱️ Trải nghiệm gần đây của bạn</span>
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* CỘT 1: BÀI HÁT GẦN ĐÂY */}
                  {recentSongs.length > 0 && (
                    <div className="bg-surface/30 backdrop-blur-md border border-white/5 p-5 rounded-3xl shadow-2xl">
                      <h3 className="text-lg font-bold text-primary mb-4">Bài hát vừa phát</h3>
                      <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto no-scrollbar">
                        {recentSongs.slice(0, 5).map((song) => (
                          <div
                            key={song.id}
                            onClick={() => handlePlaySong(song, recentSongs)}
                            className="flex items-center gap-4 p-2 rounded-lg hover:bg-surface-hover cursor-pointer transition-colors group"
                          >
                            <img src={getCoverArt(song)} className="w-12 h-12 object-cover rounded shadow" alt="cover" />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-text text-sm truncate group-hover:text-primary transition-colors">{song.title}</h4>
                              <p className="text-xs text-text-muted truncate">{getArtistName(song)}</p>
                            </div>
                            <span className="text-[10px] text-text-muted bg-surface-hover px-2 py-1 rounded">Vừa xong</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* CỘT 2: PLAYLIST GẦN ĐÂY */}
                  {recentPlaylists.length > 0 && (
                    <div className="bg-surface/30 backdrop-blur-md border border-white/5 p-5 rounded-3xl shadow-2xl">
                      <h3 className="text-lg font-bold text-primary mb-4">Playlist đã xem</h3>
                      <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto no-scrollbar">
                        {recentPlaylists.slice(0, 5).map((pl) => (
                          <div
                            key={pl.id}
                            onClick={() => navigate(`/playlist/${pl.id}`)}
                            className="flex items-center gap-4 p-2 rounded-lg hover:bg-surface-hover cursor-pointer transition-colors group"
                          >
                            <div className="w-12 h-12 rounded bg-gradient-to-br from-primary to-surface-hover flex items-center justify-center overflow-hidden">
                              {pl.coverArtUrl ? (
                                <img src={getMediaUrl(pl.coverArtUrl)} className="w-full h-full object-cover" alt="cover" />
                              ) : (
                                <span className="text-lg">🎵</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-text text-sm truncate group-hover:text-primary transition-colors">{pl.title}</h4>
                              <p className="text-xs text-text-muted truncate">{pl.songCount || 0} bài hát</p>
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