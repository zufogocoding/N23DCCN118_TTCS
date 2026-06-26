import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ListPlus, Plus, Check, Search, Loader2 } from 'lucide-react';
import { api } from '../../utils/api';
import CreatePlaylistModal from './CreatePlaylistModal';

/**
 * AddToPlaylistMenu - Dropdown menu để thêm bài hát vào playlist
 * Sử dụng React Portal + fixed positioning để tránh bị cắt bởi
 * overflow-x-auto / overflow-y-auto của container cha.
 *
 * Props:
 *   - songId: ID bài hát cần thêm
 *   - onCreatePlaylist: callback khi user muốn tạo playlist mới (mở modal)
 *   - asMenuItem: hiển thị dạng menu item thay vì icon button
 */
export default function AddToPlaylistMenu({ songId, onCreatePlaylist, asMenuItem = false }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [addedTo, setAddedTo] = useState(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Vị trí fixed tính bằng px (thay vì Tailwind class)
  const [menuStyle, setMenuStyle] = useState({});

  const triggerRef = useRef(null);  // Nút bấm trigger
  const dropdownRef = useRef(null); // Dropdown panel (rendered via Portal)
  const searchRef = useRef(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAddedTo(new Set());
    setSearchText('');
    setIsOpen(false);
  }, [songId]);

  // ── Tính toán vị trí dropdown dựa trên viewport ──
  const calculatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return {};

    const rect = trigger.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const MENU_WIDTH = 256;  // w-64 = 16rem = 256px
    const MENU_HEIGHT = 320; // Ước tính chiều cao tối đa
    const GAP = 8;           // Khoảng cách giữa trigger và dropdown

    let top, left;

    if (asMenuItem) {
      // ── Chế độ asMenuItem: bung ra cạnh bên ──
      // Ưu tiên bung sang phải
      if (viewportWidth - rect.right >= MENU_WIDTH + GAP) {
        left = rect.right + 4;
      } else {
        // Bung sang trái
        left = rect.left - MENU_WIDTH - 4;
      }
      top = rect.top;
    } else {
      // ── Chế độ bình thường: bung xuống/lên ──

      // Chiều dọc: ưu tiên bung xuống dưới
      if (viewportHeight - rect.bottom >= MENU_HEIGHT + GAP) {
        top = rect.bottom + GAP;
      } else {
        // Bung lên trên
        top = rect.top - MENU_HEIGHT - GAP;
      }

      // Chiều ngang: ưu tiên căn lề phải (bung trái), fallback căn lề trái
      if (rect.right >= MENU_WIDTH) {
        // Đủ chỗ bung sang trái → căn lề phải của trigger
        left = rect.right - MENU_WIDTH;
      } else {
        // Sát mép trái → căn lề trái của trigger
        left = rect.left;
      }
    }

    // Clamp để không bao giờ bị ra ngoài viewport
    left = Math.max(8, Math.min(left, viewportWidth - MENU_WIDTH - 8));
    top = Math.max(8, Math.min(top, viewportHeight - MENU_HEIGHT - 8));

    return {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      width: `${MENU_WIDTH}px`,
      zIndex: 9999,
    };
  }, [asMenuItem]);

  // ── Click outside detection (thay useClickOutside vì dropdown ở portal) ──
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      const trigger = triggerRef.current;
      const dropdown = dropdownRef.current;
      if (
        trigger && !trigger.contains(e.target) &&
        dropdown && !dropdown.contains(e.target)
      ) {
        setIsOpen(false);
        setSearchText('');
      }
    };

    // Đóng dropdown khi scroll hoặc resize (trigger sẽ di chuyển)
    const handleScrollOrResize = () => {
      setIsOpen(false);
      setSearchText('');
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleScrollOrResize);
    // Bắt scroll trên capturing phase để detect scroll ở mọi container
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen]);

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

    // Tính vị trí trước khi mở
    setMenuStyle(calculatePosition());
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

  // ── Nội dung dropdown (render qua Portal) ──
  const dropdownContent = isOpen
    ? createPortal(
        <div
          ref={dropdownRef}
          style={menuStyle}
          className="bg-[#282828] rounded-lg shadow-2xl border border-[#333] py-2"
        >
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
                    <Check size={16} className="text-[#00e6e6] shrink-0 ml-2" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>,
        document.body
      )
    : null;

  return (
    <div ref={triggerRef} className="relative">
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

      {dropdownContent}

      {/* Modal tạo playlist tích hợp sẵn */}
      <CreatePlaylistModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handlePlaylistCreated}
      />
    </div>
  );
}
