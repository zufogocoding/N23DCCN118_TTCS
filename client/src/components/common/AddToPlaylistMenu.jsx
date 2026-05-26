import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ListPlus, Plus, Check, Search, Loader2 } from 'lucide-react';
import { api } from '../../utils/api';
import useClickOutside from '../../hooks/useClickOutside';
import CreatePlaylistModal from './CreatePlaylistModal';

/**
 * AddToPlaylistMenu - Dropdown menu để thêm bài hát vào playlist
 * Props:
 *   - songId: ID bài hát cần thêm
 *   - onCreatePlaylist: callback khi user muốn tạo playlist mới (mở modal)
 */
export default function AddToPlaylistMenu({ songId, onCreatePlaylist, asMenuItem = false }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [addedTo, setAddedTo] = useState(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [positionClass, setPositionClass] = useState('right-0 top-full mt-2');
  const menuRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAddedTo(new Set());
    setSearchText('');
    setIsOpen(false);
  }, [songId]);

  useClickOutside(menuRef, () => {
    setIsOpen(false);
    setSearchText('');
  });

  // Auto-focus search khi mở
  useEffect(() => {
    if (isOpen && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Fetch playlists khi mở menu
  const handleToggle = async () => {
    if (isOpen) {
      setIsOpen(false);
      setSearchText('');
      return;
    }

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user.id) {
      navigate('/login');
      return;
    }

    // Đo vị trí viewport để tự động điều chỉnh hướng mở của dropdown, chống tràn viền / cắt góc
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let horizontal = 'right-0'; // Mặc định căn lề phải (bung sang trái)
      let vertical = 'top-full mt-2'; // Mặc định bung xuống dưới

      // Nếu nút nằm quá sát mép trái (< 256px), căn lề trái (bung sang phải)
      if (rect.left < 256) {
        horizontal = 'left-0';
      }

      // Nếu nút nằm quá sát mép dưới (< 320px), bung ngược lên trên
      if (viewportHeight - rect.bottom < 320) {
        vertical = 'bottom-full mb-2';
      }

      // Nếu menu nằm trong menu dọc / ngang side-by-side
      if (asMenuItem) {
        // Nếu nút nằm sát mép phải (< 256px), bung sang trái
        if (viewportWidth - rect.right < 256) {
          horizontal = 'right-full mr-1 top-0';
        } else {
          horizontal = 'left-full ml-1 top-0';
        }
        vertical = '';
      }

      setPositionClass(`${horizontal} ${vertical}`);
    }

    setIsOpen(true);
    setLoading(true);

    try {
      const res = await api.get(`/api/playlists/user/${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setPlaylists(data);
        try {
          const memRes = await api.get(
            `/api/playlists/user/${user.id}/song/${songId}/memberships`
          );
          if (memRes.ok) {
            const { playlistIds } = await memRes.json();
            setAddedTo(new Set(Array.isArray(playlistIds) ? playlistIds : []));
          }
        } catch {
          /* bỏ qua — UI vẫn dùng được */
        }
      } else {
        console.error('Failed to fetch playlists:', res.status);
        setPlaylists([]);
      }
    } catch (err) {
      console.error('Lỗi khi lấy playlist:', err);
      setPlaylists([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaylistCreated = async () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.id) {
      try {
        const res = await api.get(`/api/playlists/user/${user.id}`);
        if (res.ok) {
          const data = await res.json();
          setPlaylists(data);
        }
      } catch (err) {
        console.error('Lỗi khi lấy playlist sau khi tạo:', err);
      }
    }
  };

  const handleAddToPlaylist = async (playlistId) => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user.id) {
      navigate('/login');
      return;
    }
    try {
      const res = await api.post(`/api/playlists/${playlistId}/songs`, { songId });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setAddedTo(prev => new Set([...prev, playlistId]));
        setPlaylists(prev =>
          prev.map(pl =>
            pl.id === playlistId
              ? { ...pl, _count: { ...pl._count, songs: (pl._count?.songs ?? 0) + (data.alreadyInPlaylist ? 0 : 1) } }
              : pl
          )
        );
        return;
      }

      const errMsg = typeof data.error === 'string' ? data.error : '';
      if (/đã có|trùng|duplicate|already/i.test(errMsg)) {
        setAddedTo(prev => new Set([...prev, playlistId]));
      } else {
        alert(errMsg || 'Không thể thêm bài hát');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối server');
    }
  };

  // Lọc playlist theo search text
  const filteredPlaylists = playlists.filter(pl =>
    pl.title.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div ref={menuRef} className="relative">
      {asMenuItem ? (
        <button
          onClick={(e) => { e.stopPropagation(); handleToggle(); }}
          className="w-full px-4 py-2 flex items-center gap-3 text-sm text-gray-200 hover:bg-white/10 transition-colors"
        >
          <ListPlus size={18} />
          <span>Thêm vào Playlist</span>
        </button>
      ) : (
        <button
          onClick={(e) => { e.stopPropagation(); handleToggle(); }}
          className="p-2 rounded-full hover:bg-white/10 text-[#a0a0a0] hover:text-white transition-colors"
          title="Thêm vào Playlist"
        >
          <ListPlus size={20} />
        </button>
      )}

      {isOpen && (
        <div className={`absolute ${positionClass} w-64 bg-[#282828] rounded-lg shadow-2xl border border-[#333] py-2 z-[60]`}>
          <p className="px-4 py-2 text-xs font-bold text-[#a0a0a0] uppercase tracking-wider">
            Thêm vào Playlist
          </p>

          {/* Nút tạo playlist mới */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
              setSearchText('');
              if (onCreatePlaylist) {
                onCreatePlaylist();
              } else {
                setIsModalOpen(true);
              }
            }}
            className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-white hover:bg-white/10 transition-colors"
          >
            <Plus size={16} className="text-[#00e6e6] shrink-0" />
            Tạo Playlist mới
          </button>

          <div className="border-t border-[#333] my-1" />

          {/* Thanh tìm kiếm */}
          {!loading && playlists.length > 0 && (
            <div className="px-3 py-2">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#666]" />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Tìm playlist..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full py-1.5 pl-8 pr-3 rounded-md bg-[#3e3e3e] text-white text-xs outline-none placeholder-[#888] focus:ring-1 focus:ring-[#00e6e6]/50"
                />
              </div>
            </div>
          )}

          {/* Danh sách playlist */}
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 size={18} className="animate-spin text-[#a0a0a0]" />
              <span className="ml-2 text-xs text-[#a0a0a0]">Đang tải...</span>
            </div>
          ) : playlists.length === 0 ? (
            <p className="px-4 py-3 text-xs text-[#666]">Chưa có playlist nào. Hãy tạo mới!</p>
          ) : filteredPlaylists.length === 0 ? (
            <p className="px-4 py-3 text-xs text-[#666]">Không tìm thấy playlist &quot;{searchText}&quot;</p>
          ) : (
            <div className="max-h-48 overflow-y-auto scrollbar-thin">
              {filteredPlaylists.map(pl => (
                <button
                  key={pl.id}
                  onClick={(e) => { e.stopPropagation(); handleAddToPlaylist(pl.id); }}
                  className="w-full px-4 py-2.5 flex items-center justify-between text-sm text-white hover:bg-white/10 transition-colors"
                >
                  <div className="min-w-0 flex-1 text-left">
                    <span className="truncate block">{pl.title}</span>
                    <span className="text-[10px] text-[#888]">{pl._count?.songs || 0} bài hát</span>
                  </div>
                  {addedTo.has(pl.id) && (
                    <Check size={16} className="text-[#1ed760] shrink-0 ml-2" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal tạo playlist tích hợp sẵn */}
      <CreatePlaylistModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handlePlaylistCreated}
      />
    </div>
  );
}
