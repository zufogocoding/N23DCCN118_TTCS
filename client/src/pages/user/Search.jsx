import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Search as SearchIcon, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import VirtualSongList from '../../components/VirtualSongList';
import { api, getMediaUrl } from '../../utils/api';
import useDebounce from '../../hooks/useDebounce';

export default function Search() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Genre browse state
  const [genres, setGenres] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState(null); // { id, title }
  const [genreSongs, setGenreSongs] = useState([]);
  const [genrePage, setGenrePage] = useState(1);
  const [genreHasNext, setGenreHasNext] = useState(false);
  const [genreLoading, setGenreLoading] = useState(false);

  // Search state
  const [searchResults, setSearchResults] = useState({
    songs: [],
    playlists: [],
    artists: [],
    albums: []
  });

  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('recentSearches')) || [];
    } catch { return []; }
  });

  const addRecentSearch = (query) => {
    if (!query.trim()) return;
    setRecentSearches(prev => {
      const filtered = prev.filter(q => q.toLowerCase() !== query.toLowerCase());
      const updated = [query.trim(), ...filtered].slice(0, 10);
      localStorage.setItem('recentSearches', JSON.stringify(updated));
      return updated;
    });
  };

  const handleRecentSearchClick = (q) => {
    setSearchQuery(q);
    setIsSearchFocused(false);
  };

  const filteredRecent = recentSearches.filter(q =>
    q.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const navigate = useNavigate();

  // Fetch genres list
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const response = await api.get('/api/genres');
        if (response.ok) {
          const data = await response.json();
          setGenres(data.map(g => ({ title: g.genreTag, id: g.id })));
        }
      } catch (error) {
        console.error('Lỗi lấy genres:', error);
      }
    };
    fetchGenres();
  }, []);

  // Fetch songs by genre
  const fetchGenreSongs = useCallback(async (genreId, pageNum, isReset = false) => {
    setGenreLoading(true);
    try {
      const response = await api.get(`/api/browse/genre/${genreId}?page=${pageNum}&limit=20`);
      if (response.ok) {
        const data = await response.json();
        setGenreHasNext(data.hasNextPage);
        if (isReset) {
          setGenreSongs(data.songs || []);
        } else {
          setGenreSongs(prev => [...prev, ...(data.songs || [])]);
        }
      }
    } catch (error) {
      console.error('Lỗi lấy bài theo genre:', error);
    } finally {
      setGenreLoading(false);
    }
  }, []);

  const handleGenreClick = (genre) => {
    setSelectedGenre(genre);
    setGenrePage(1);
    fetchGenreSongs(genre.id, 1, true);
  };

  const handleBackToBrowse = () => {
    setSelectedGenre(null);
    setGenreSongs([]);
  };

  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  useEffect(() => {
    if (debouncedSearchQuery.trim() !== '') {
      setPage(1);
      fetchSearchResults(debouncedSearchQuery, 1, true);
    } else {
      setSearchResults({ songs: [], playlists: [], artists: [], albums: [] });
    }
  }, [debouncedSearchQuery]);

  async function fetchSearchResults(query, pageNum, isReset = false) {
    setIsLoading(true);
    try {
      const response = await api.get(
        `/api/search?q=${encodeURIComponent(query)}&page=${pageNum}&limit=20`
      );
      if (response.ok) {
        const data = await response.json();
        setHasNextPage(data.hasNextPage);
        if (isReset) {
          setSearchResults({
            songs: data.songs || [],
            artists: data.artists || [],
            playlists: data.playlists || [],
            albums: data.albums || []
          });
          if (
            data.songs?.length > 0 ||
            data.artists?.length > 0 ||
            data.playlists?.length > 0 ||
            data.albums?.length > 0
          ) {
            addRecentSearch(query);
          }
        } else {
          setSearchResults(prev => ({
            songs: [...prev.songs, ...(data.songs || [])],
            artists: [...prev.artists, ...(data.artists || [])],
            playlists: [...prev.playlists, ...(data.playlists || [])],
            albums: [...prev.albums, ...(data.albums || [])]
          }));
        }
      }
    } catch (error) {
      console.error('Lỗi khi tìm kiếm:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const loadMore = () => {
    if (!isLoading && hasNextPage) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchSearchResults(debouncedSearchQuery, nextPage, false);
    }
  };

  const loadMoreGenre = () => {
    if (!genreLoading && genreHasNext && selectedGenre) {
      const nextPage = genrePage + 1;
      setGenrePage(nextPage);
      fetchGenreSongs(selectedGenre.id, nextPage, false);
    }
  };

  const hasResults =
    searchResults.songs.length > 0 ||
    searchResults.playlists.length > 0 ||
    searchResults.artists.length > 0 ||
    searchResults.albums.length > 0;

  return (
    <div className="flex flex-col h-full relative">
      {/* HEADER */}
      <div className="sticky top-0 bg-[#121212]/90 backdrop-blur-md z-10 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4 w-full">
          <div className="flex gap-2">
            <button
              onClick={() => navigate(-1)}
              className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-white hover:bg-[#333] transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <button className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-[#a0a0a0] cursor-not-allowed">
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="relative w-full max-w-[400px]">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-black" size={20} />
            <input
              type="text"
              placeholder="Bạn muốn nghe gì?"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                // Khi gõ tìm kiếm, thoát khỏi chế độ browse genre
                if (e.target.value) setSelectedGenre(null);
              }}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              className="w-full py-3 pl-12 pr-4 rounded-full bg-white text-black text-sm outline-none font-medium focus:ring-2 focus:ring-white border-2 border-transparent transition-all"
            />
            {isSearchFocused && filteredRecent.length > 0 && (
              <div className="absolute top-full left-0 w-full mt-2 bg-[#282828] rounded-xl shadow-2xl py-2 z-50">
                <div className="px-4 py-2 flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-[#a0a0a0] uppercase tracking-wider">
                    Tìm kiếm gần đây
                  </span>
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
                    <SearchIcon size={16} className="mr-3 text-[#a0a0a0]" />
                    {q}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div
        id="search-scroll-container"
        className="p-6 pt-4 flex-1 overflow-y-auto"
        onScroll={(e) => {
          const { scrollTop, scrollHeight, clientHeight } = e.target;
          if (scrollHeight - scrollTop <= clientHeight + 100) {
            if (searchQuery) loadMore();
            else if (selectedGenre) loadMoreGenre();
          }
        }}
      >
        {searchQuery ? (
          /* ─── TRẠNG THÁI TÌM KIẾM ─── */
          <div>
            {!hasResults && !isLoading ? (
              <div className="flex flex-col items-center justify-center h-64 text-center mt-10">
                <h3 className="text-2xl font-bold text-white mb-4">
                  Không tìm thấy kết quả cho &ldquo;{searchQuery}&rdquo;
                </h3>
                <p className="text-[#a0a0a0] text-sm">
                  Vui lòng kiểm tra lại chính tả hoặc dùng từ khóa khác.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-10">
                {/* NGHỆ SĨ */}
                {searchResults.artists.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-4">Nghệ sĩ</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-5">
                      {searchResults.artists.map((artist) => (
                        <div
                          key={artist.userId}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') navigate(`/artist/${artist.userId}`);
                          }}
                          onClick={() => navigate(`/artist/${artist.userId}`)}
                          className="bg-[#181818] p-4 rounded-xl hover:bg-[#282828] transition-colors cursor-pointer flex flex-col items-center text-center group"
                        >
                          <img
                            src={artist.avatarUrl ? getMediaUrl(artist.avatarUrl) : '/default-avatar.png'}
                            alt="avatar"
                            className="w-32 h-32 rounded-full object-cover mb-4 shadow-lg"
                          />
                          <h3 className="font-bold text-white truncate w-full mb-1">
                            {artist.artistName || artist.user?.displayName || artist.user?.username}
                          </h3>
                          <p className="text-sm text-[#a0a0a0]">Nghệ sĩ</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ALBUMS */}
                {searchResults.albums.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-4">Albums</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-5">
                      {searchResults.albums.map((album, index) => (
                        <div
                          key={index}
                          className="bg-[#181818] p-4 rounded-xl hover:bg-[#282828] transition-colors cursor-pointer group"
                          onClick={() => navigate(`/album/${album.id}`)}
                        >
                          <img
                            src={album.coverArtUrl ? getMediaUrl(album.coverArtUrl) : '/default-cover.png'}
                            alt="cover"
                            className="w-full aspect-square object-cover rounded-md mb-4 shadow-lg"
                          />
                          <h3 className="font-bold text-white truncate text-base mb-1">{album.title}</h3>
                          <p className="text-sm text-[#a0a0a0] truncate">
                            {album.artist?.artistName || album.artist?.user?.displayName || album.artist?.user?.username}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* PLAYLISTS */}
                {searchResults.playlists.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-4">Playlists</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-5">
                      {searchResults.playlists.map((playlist, index) => (
                        <div
                          key={index}
                          className="bg-[#181818] p-4 rounded-xl hover:bg-[#282828] transition-colors cursor-pointer group"
                          onClick={() => navigate(`/playlist/${playlist.id}`)}
                        >
                          <img
                            src={playlist.coverArtUrl ? getMediaUrl(playlist.coverArtUrl) : '/default-cover.png'}
                            alt="cover"
                            className="w-full aspect-square object-cover rounded-md mb-4 shadow-lg"
                          />
                          <h3 className="font-bold text-white truncate text-base mb-1">{playlist.title}</h3>
                          <p className="text-sm text-[#a0a0a0] truncate">
                            {playlist.user?.displayName || playlist.user?.username}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* BÀI HÁT */}
                {searchResults.songs.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-4">Bài hát</h2>
                    <div className="flex flex-col gap-2 min-h-[400px]">
                      <VirtualSongList
                        songs={searchResults.songs}
                        scrollContainerId="search-scroll-container"
                      />
                    </div>
                  </div>
                )}

                {isLoading && (
                  <div className="flex justify-center py-4">
                    <div className="w-6 h-6 border-2 border-[#1ed760] border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
            )}
          </div>
        ) : selectedGenre ? (
          /* ─── TRẠNG THÁI BROWSE THEO GENRE ─── */
          <div>
            <button
              onClick={handleBackToBrowse}
              className="flex items-center gap-2 text-[#a0a0a0] hover:text-white transition-colors text-sm font-medium mb-5"
            >
              <ArrowLeft size={16} />
              Tất cả thể loại
            </button>
            <h2 className="text-3xl font-bold text-white mb-6">{selectedGenre.title}</h2>

            {genreLoading && genreSongs.length === 0 ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-2 border-[#1ed760] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : genreSongs.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-[#a0a0a0]">Chưa có bài hát nào trong thể loại này.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <VirtualSongList songs={genreSongs} scrollContainerId="search-scroll-container" />
              </div>
            )}

            {genreLoading && genreSongs.length > 0 && (
              <div className="flex justify-center py-4">
                <div className="w-6 h-6 border-2 border-[#1ed760] border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        ) : (
          /* ─── TRẠNG THÁI BROWSE ALL (mặc định khi chưa search) ─── */
          <div>
            <h2 className="text-2xl font-bold text-white mb-5">Duyệt tìm tất cả</h2>
            {genres.length === 0 ? (
              <p className="text-[#a0a0a0] text-sm">Chưa có thể loại nào.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {genres.map((genre) => (
                  <button
                    key={genre.id}
                    onClick={() => handleGenreClick(genre)}
                    className="px-4 py-2 rounded-full bg-[#282828] hover:bg-[#3e3e3e] active:scale-95 text-white text-sm font-medium transition-all border border-[#3a3a3a] hover:border-[#555]"
                  >
                    {genre.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
