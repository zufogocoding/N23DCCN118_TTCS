import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Search as SearchIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getPrimaryArtistUserId } from '../../utils/artistNav';
import VirtualSongList from '../../components/VirtualSongList';

export default function Search() {
  const [searchQuery, setSearchQuery] = useState('');
  
  const [suggestions, setSuggestions] = useState([]);
  const [searchResults, setSearchResults] = useState({
    songs: [],
    playlists: [],
    artists: []
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const response = await fetch('http://localhost:9000/api/genres');
        if (response.ok) {
          const data = await response.json();
          setSuggestions(data.map(g => ({ title: g.genreTag, id: g.id })));
        }
      } catch (error) {
        console.error("Lỗi lấy genres:", error);
      }
    };
    fetchGenres();
  }, []);

  // Reset page when query changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim() !== '') {
        setPage(1);
        fetchSearchResults(1, true);
      } else {
        setSearchResults({ songs: [], playlists: [], artists: [] });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchSearchResults = async (pageNum, isReset = false) => {
    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:9000/api/search?q=${encodeURIComponent(searchQuery)}&page=${pageNum}&limit=20`);
      if (response.ok) {
        const data = await response.json();
        setHasNextPage(data.hasNextPage);
        
        if (isReset) {
          setSearchResults({
            songs: data.songs || [],
            artists: data.artists || [],
            playlists: data.playlists || []
          });
        } else {
          setSearchResults(prev => ({
            songs: [...prev.songs, ...(data.songs || [])],
            artists: [...prev.artists, ...(data.artists || [])],
            playlists: [...prev.playlists, ...(data.playlists || [])]
          }));
        }
      }
    } catch (error) {
      console.error("Lỗi khi tìm kiếm:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMore = () => {
    if (!isLoading && hasNextPage) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchSearchResults(nextPage, false);
    }
  };

  const hasResults = searchResults.songs.length > 0 || searchResults.playlists.length > 0 || searchResults.artists.length > 0;

  return (
    <div className="flex flex-col h-full relative">
      {/* HEADER TÌM KIẾM */}
      <div className="sticky top-0 bg-[#121212]/90 backdrop-blur-md z-10 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4 w-full">
          <div className="flex gap-2">
            <button className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-[#a0a0a0] cursor-not-allowed">
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
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full py-3 pl-12 pr-4 rounded-full bg-white text-black text-sm outline-none font-medium focus:ring-2 focus:ring-white border-2 border-transparent transition-all"
            />
          </div>
        </div>
      </div>

      {/* NỘI DUNG CUỘN */}
      <div 
        id="search-scroll-container" 
        className="p-6 pt-4 flex-1 overflow-y-auto"
        onScroll={(e) => {
          const { scrollTop, scrollHeight, clientHeight } = e.target;
          if (scrollHeight - scrollTop <= clientHeight + 100) {
            loadMore();
          }
        }}
      >
        
        {!searchQuery ? (
          /* TRẠNG THÁI GỢI Ý */
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Duyệt tìm tất cả</h2>
            {suggestions.length === 0 ? (
              <div className="p-8 border border-dashed border-[#333] rounded-xl text-center">
                <p className="text-[#a0a0a0] font-medium">Chưa có dữ liệu gợi ý thể loại. (Sẽ hiển thị khi có dữ liệu từ Database)</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {suggestions.map((item, index) => (
                  <div 
                    key={index} 
                    className="bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg p-4 h-48 relative overflow-hidden cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => setSearchQuery(item.title)}
                  >
                    <h3 className="font-bold text-xl text-white">{item.title}</h3>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* TRẠNG THÁI TÌM KIẾM */
          <div>
            {!hasResults && !isLoading ? (
              <div className="flex flex-col items-center justify-center h-64 text-center mt-10">
                <h3 className="text-2xl font-bold text-white mb-4">Không tìm thấy kết quả cho "{searchQuery}"</h3>
                <p className="text-[#a0a0a0] text-sm">Vui lòng kiểm tra lại chính tả hoặc dùng từ khóa khác.</p>
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
                          <img src={artist.avatarUrl ? `http://localhost:9000${artist.avatarUrl}` : '/default-avatar.png'} alt="avatar" className="w-32 h-32 rounded-full object-cover mb-4 shadow-lg" />
                          <h3 className="font-bold text-white truncate w-full mb-1">{artist.artistName || artist.user?.displayName || artist.user?.username}</h3>
                          <p className="text-sm text-[#a0a0a0]">Nghệ sĩ</p>
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
                        <div key={index} className="bg-[#181818] p-4 rounded-xl hover:bg-[#282828] transition-colors cursor-pointer group" onClick={() => navigate(`/playlist/${playlist.id}`)}>
                          <img src={playlist.coverArtUrl ? `http://localhost:9000${playlist.coverArtUrl}` : '/default-cover.png'} alt="cover" className="w-full aspect-square object-cover rounded-md mb-4 shadow-lg" />
                          <h3 className="font-bold text-white truncate text-base mb-1">{playlist.title}</h3>
                          <p className="text-sm text-[#a0a0a0] truncate">{playlist.user?.displayName || playlist.user?.username}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* BÀI HÁT (ẢO HÓA DOM) */}
                {searchResults.songs.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-4">Bài hát</h2>
                    <div className="flex flex-col gap-2 min-h-[400px]">
                      <VirtualSongList 
                        songs={searchResults.songs} 
                        scrollContainerId="search-scroll-container"
                        // loadMore={loadMore} // Đã dùng onScroll của div tổng
                        // hasMore={hasNextPage}
                      />
                    </div>
                  </div>
                )}
                
                {isLoading && (
                  <div className="flex justify-center py-4">
                    <div className="w-6 h-6 border-2 border-[#1ed760] border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}

              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
