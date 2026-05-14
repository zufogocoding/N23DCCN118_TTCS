import { useState } from 'react';
import { ChevronLeft, ChevronRight, Search as SearchIcon, Play, Heart } from 'lucide-react';

export default function Search() {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Khởi tạo state trống, chuẩn bị sẵn để fetch từ DB sau này
  const [suggestions] = useState([]);
  const [searchResults] = useState({
    songs: [],
    albums: [],
    artists: []
  });

  const hasResults = searchResults.songs.length > 0 || searchResults.albums.length > 0 || searchResults.artists.length > 0;

  return (
    <div className="flex flex-col h-full">
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
      <div className="p-6 pt-4 flex-1 overflow-y-auto">
        
        {!searchQuery ? (
          /* TRẠNG THÁI GỢI Ý (KHI CHƯA NHẬP TỪ KHÓA) */
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Duyệt tìm tất cả</h2>
            {suggestions.length === 0 ? (
              <div className="p-8 border border-dashed border-[#333] rounded-xl text-center">
                <p className="text-[#a0a0a0] font-medium">Chưa có dữ liệu gợi ý thể loại. (Sẽ hiển thị khi có dữ liệu từ Database)</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {suggestions.map((item, index) => (
                  <div key={index} className="bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg p-4 h-48 relative overflow-hidden cursor-pointer hover:scale-105 transition-transform">
                    <h3 className="font-bold text-xl text-white">{item.title}</h3>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* TRẠNG THÁI TÌM KIẾM (KHI CÓ TỪ KHÓA) */
          <div>
            {!hasResults ? (
              <div className="flex flex-col items-center justify-center h-64 text-center mt-10">
                <h3 className="text-2xl font-bold text-white mb-4">Không tìm thấy kết quả cho "{searchQuery}"</h3>
                <p className="text-[#a0a0a0] text-sm">Vui lòng kiểm tra lại chính tả hoặc dùng từ khóa khác.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-10">
                {/* BÀI HÁT */}
                {searchResults.songs.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-4">Bài hát</h2>
                    <div className="flex flex-col gap-2">
                      {searchResults.songs.map((song, index) => (
                        <div key={index} className="flex items-center justify-between p-3 rounded-md hover:bg-[#282828] group transition-colors cursor-pointer">
                          <div className="flex items-center gap-4">
                            <img src={song.cover} alt="cover" className="w-12 h-12 rounded-sm" />
                            <div>
                              <h4 className="text-white font-semibold group-hover:underline">{song.title}</h4>
                              <p className="text-sm text-[#a0a0a0] hover:underline">{song.artist}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Heart size={20} className="text-[#a0a0a0] hover:text-white" />
                            <button className="w-10 h-10 rounded-full bg-[#1ed760] flex items-center justify-center text-black hover:scale-105 transition-transform">
                              <Play size={20} fill="currentColor" className="ml-1" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* NGHỆ SĨ */}
                {searchResults.artists.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-4">Nghệ sĩ</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-5">
                      {searchResults.artists.map((artist, index) => (
                        <div key={index} className="bg-[#181818] p-4 rounded-xl hover:bg-[#282828] transition-colors cursor-pointer flex flex-col items-center text-center group">
                          <img src={artist.avatar} alt="avatar" className="w-32 h-32 rounded-full object-cover mb-4 shadow-lg" />
                          <h3 className="font-bold text-white truncate w-full mb-1">{artist.name}</h3>
                          <p className="text-sm text-[#a0a0a0]">Nghệ sĩ</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ALBUM */}
                {searchResults.albums.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-4">Album</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-5">
                      {searchResults.albums.map((album, index) => (
                        <div key={index} className="bg-[#181818] p-4 rounded-xl hover:bg-[#282828] transition-colors cursor-pointer group">
                          <img src={album.cover} alt="cover" className="w-full aspect-square object-cover rounded-md mb-4 shadow-lg" />
                          <h3 className="font-bold text-white truncate text-base mb-1">{album.title}</h3>
                          <p className="text-sm text-[#a0a0a0] truncate">{album.artist}</p>
                        </div>
                      ))}
                    </div>
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
