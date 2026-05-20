import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Disc3, Search, RefreshCw, Trash2, Eye, EyeOff, Filter,
  ChevronLeft, ChevronRight, X, AlertTriangle, CheckCircle,
  Clock, MoreVertical, Calendar, Hash, ArrowUpDown, ArrowUp,
  ArrowDown, Ban, RotateCcw, Music, SlidersHorizontal, ShieldAlert,
  ShieldCheck,
} from 'lucide-react';

const API = 'http://localhost:9000';

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function fmtCount(n) {
  if (!n && n !== 0) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_MAP = {
  released:  { label: 'Released',  cls: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400', icon: <CheckCircle size={10} /> },
  scheduled: { label: 'Scheduled', cls: 'bg-amber-500/15 border-amber-500/40 text-amber-400',       icon: <Clock size={10} /> },
  draft:     { label: 'Draft',     cls: 'bg-slate-500/15 border-slate-500/40 text-slate-400',       icon: <EyeOff size={10} /> },
  hidden:    { label: 'Hidden',    cls: 'bg-slate-600/15 border-slate-600/40 text-slate-400',       icon: <EyeOff size={10} /> },
  banned:    { label: 'Banned',    cls: 'bg-red-500/15 border-red-500/40 text-red-400',             icon: <Ban size={10} /> },
};

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] ?? STATUS_MAP.draft;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${s.cls}`}>
      {s.icon}{s.label}
    </span>
  );
}

// ── Type Badge ────────────────────────────────────────────────────────────────

const TYPE_MAP = {
  Album:   'bg-purple-500/15 text-purple-400 border-purple-500/30',
  EP:      'bg-blue-500/15 text-blue-400 border-blue-500/30',
  Single:  'bg-[#00e6e6]/15 text-[#00e6e6] border-[#00e6e6]/30',
  Mixtape: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
};

function TypeBadge({ type }) {
  if (!type) return <span className="text-[#555] text-xs">—</span>;
  const cls = TYPE_MAP[type] ?? 'bg-[#222] text-[#888] border-[#333]';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${cls}`}>
      {type}
    </span>
  );
}

// ── Cover Image ───────────────────────────────────────────────────────────────

function CoverImage({ url, title }) {
  const [err, setErr] = useState(false);
  const src = url ? (url.startsWith('http') ? url : `${API}${url}`) : null;
  if (!src || err) {
    return (
      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border border-[#2a2a2a] flex items-center justify-center flex-shrink-0">
        <Disc3 size={14} className="text-[#444]" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={title}
      onError={() => setErr(true)}
      className="w-10 h-10 rounded-lg object-cover flex-shrink-0 ring-1 ring-[#2a2a2a]"
    />
  );
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────

function ConfirmDialog({ open, title, message, variant = 'danger', onConfirm, onCancel, loading }) {
  if (!open) return null;
  const isBan = variant === 'danger';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={!loading ? onCancel : undefined} />
      <div className="relative bg-[#161616] border border-[#333] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${isBan ? 'bg-red-500/15' : 'bg-emerald-500/15'}`}>
          {isBan ? <ShieldAlert size={22} className="text-red-400" /> : <ShieldCheck size={22} className="text-emerald-400" />}
        </div>
        <h3 className="text-white font-bold text-lg mb-2">{title}</h3>
        <p className="text-[#a0a0a0] text-sm mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={loading} className="flex-1 px-4 py-2 rounded-lg border border-[#444] text-[#aaa] hover:bg-[#222] transition-colors text-sm font-medium disabled:opacity-50">
            Huỷ
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 px-4 py-2 rounded-lg text-white text-sm font-bold transition-colors flex items-center justify-center gap-2 ${isBan ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500'} disabled:opacity-60`}
          >
            {loading && <RefreshCw size={14} className="animate-spin" />}
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border text-sm font-medium animate-fade-in
      ${toast.type === 'success'
        ? 'bg-emerald-900/90 border-emerald-500/50 text-emerald-300'
        : 'bg-red-900/90 border-red-500/50 text-red-300'}`}
    >
      {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
      {toast.message}
    </div>
  );
}

// ── Album Detail Drawer ────────────────────────────────────────────────────────

function AlbumDetailDrawer({ album, onClose, onTakedown, onRestore, actionLoading }) {
  if (!album) return null;
  const isBanned = album.status === 'banned';
  const isReleased = album.status === 'released';

  const tracks = album.tracks ?? [];
  const stats = album.stats ?? {};

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-[#141414] border-l border-[#2a2a2a] h-full overflow-y-auto shadow-2xl animate-slide-in">
        {/* Header */}
        <div className="sticky top-0 bg-[#141414]/95 backdrop-blur-sm border-b border-[#2a2a2a] px-5 py-4 flex items-center justify-between z-10">
          <h3 className="text-white font-bold text-sm">Chi tiết Album</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#222] text-[#666] hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Cover + Title */}
          <div className="flex gap-4 items-start">
            <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 ring-1 ring-[#2a2a2a] bg-[#1a1a2e] flex items-center justify-center">
              {album.coverArtUrl ? (
                <img
                  src={album.coverArtUrl.startsWith('http') ? album.coverArtUrl : `${API}${album.coverArtUrl}`}
                  alt={album.title}
                  className="w-full h-full object-cover"
                />
              ) : <Disc3 size={24} className="text-[#444]" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white font-bold text-base leading-tight truncate">{album.title}</p>
              <p className="text-[#00e6e6] text-sm mt-0.5 truncate">
                {album.artist?.displayName || album.artist?.username || '—'}
              </p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <StatusBadge status={album.status} />
                {album.type && <TypeBadge type={album.type} />}
              </div>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { label: 'Tổng bài hát', value: stats.total ?? album.songCount ?? 0, icon: <Music size={12} /> },
              { label: 'Đã duyệt', value: stats.approvedCount ?? '—', icon: <CheckCircle size={12} className="text-emerald-400" /> },
              { label: 'Chờ duyệt', value: stats.pendingCount ?? '—', icon: <Clock size={12} className="text-amber-400" /> },
              { label: 'Bị từ chối', value: stats.rejectedCount ?? '—', icon: <Ban size={12} className="text-red-400" /> },
            ].map(item => (
              <div key={item.label} className="bg-[#1a1a1a] rounded-xl p-3 border border-[#2a2a2a]">
                <div className="flex items-center gap-1.5 text-[#555] mb-1">
                  {item.icon}
                  <p className="text-[10px] uppercase tracking-wider">{item.label}</p>
                </div>
                <p className="text-white text-sm font-semibold">{item.value}</p>
              </div>
            ))}
          </div>

          {/* Dates */}
          <div className="bg-[#1a1a1a] rounded-xl p-3 border border-[#2a2a2a] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[#555] text-[10px] uppercase tracking-wider">Ngày tạo</span>
              <span className="text-white text-xs font-medium">{fmtDate(album.createdAt)}</span>
            </div>
            {album.releasedDate && (
              <div className="flex items-center justify-between border-t border-[#222] pt-2">
                <span className="text-[#555] text-[10px] uppercase tracking-wider">Phát hành</span>
                <span className="text-emerald-400 text-xs font-medium">{fmtDate(album.releasedDate)}</span>
              </div>
            )}
            {album.scheduledAt && (
              <div className="flex items-center justify-between border-t border-[#222] pt-2">
                <span className="text-[#555] text-[10px] uppercase tracking-wider">Lên lịch</span>
                <span className="text-amber-400 text-xs font-medium">{fmtDate(album.scheduledAt)}</span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-[#222] pt-2">
              <span className="text-[#555] text-[10px] uppercase tracking-wider">Album ID</span>
              <span className="text-[#888] text-xs font-mono">#{album.id}</span>
            </div>
          </div>

          {/* Track list */}
          {tracks.length > 0 && (
            <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] overflow-hidden">
              <p className="text-[#555] text-[10px] uppercase tracking-wider px-3 pt-3 pb-2">Danh sách bài hát</p>
              <div className="divide-y divide-[#222]">
                {tracks.map((track, idx) => (
                  <div key={track.id} className="flex items-center gap-2 px-3 py-2">
                    <span className="text-[#555] text-xs w-5 text-right flex-shrink-0">{idx + 1}</span>
                    <p className="text-white text-xs font-medium flex-1 truncate">{track.title}</p>
                    <StatusBadge status={track.status} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2 pt-2 border-t border-[#2a2a2a]">
            <p className="text-[#555] text-[10px] uppercase tracking-wider mb-3">Hành động Admin</p>
            {isBanned ? (
              <button
                onClick={() => onRestore(album)}
                disabled={actionLoading}
                className="w-full flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-colors text-sm font-medium disabled:opacity-50"
              >
                <RotateCcw size={16} />
                Khôi phục Album
              </button>
            ) : (
              <button
                onClick={() => onTakedown(album)}
                disabled={actionLoading}
                className="w-full flex items-center gap-2 px-4 py-3 rounded-xl bg-red-900/20 border border-red-900/40 text-red-400 hover:bg-red-900/30 transition-colors text-sm font-medium disabled:opacity-50"
              >
                <ShieldAlert size={16} />
                Gỡ bỏ Album (Takedown)
              </button>
            )}
            <p className="text-[#555] text-[10px] mt-1">
              {isBanned
                ? '⤷ Khôi phục sẽ đưa album trở lại trạng thái released.'
                : '⤷ Gỡ bỏ sẽ ẩn album khỏi mọi người dùng. Không xóa dữ liệu.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sort Button ───────────────────────────────────────────────────────────────

function SortBtn({ field, current, order, onClick }) {
  const active = current === field;
  return (
    <button onClick={() => onClick(field)} className="flex items-center gap-0.5 group">
      {active
        ? (order === 'asc' ? <ArrowUp size={12} className="text-[#00e6e6]" /> : <ArrowDown size={12} className="text-[#00e6e6]" />)
        : <ArrowUpDown size={12} className="text-[#444] group-hover:text-[#666] transition-colors" />
      }
    </button>
  );
}

// ── Row Action Menu ───────────────────────────────────────────────────────────

function RowActionMenu({ album, onView, onHide, onBan, onRestore, index, total }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  // Chỉ mở upward nếu đủ điều kiện: có nhiều hơn 4 hàng VÀ gần cuối danh sách
  const openUpward = total > 4 && index >= total - 2;

  const isBanned = album.status === 'banned';
  const isHidden = album.status === 'hidden';
  const canRestore = isBanned || isHidden; // Có thể khôi phục
  const canHide = !isBanned && !isHidden;  // Chưa bị ẩn/ban
  const canBan  = !isBanned;               // Chưa bị ban

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(!open); }}
        className="p-1.5 rounded-lg hover:bg-[#2a2a2a] text-[#555] hover:text-white transition-colors"
        id={`album-action-${album.id}`}
      >
        <MoreVertical size={15} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className={`absolute right-0 z-40 w-52 bg-[#1e1e1e] border border-[#333] rounded-xl shadow-2xl overflow-hidden py-1 ${openUpward ? 'bottom-8' : 'top-8'}`}>
            {/* Xem chi tiết */}
            <button
              onClick={() => { setOpen(false); onView(album); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#ccc] hover:bg-[#2a2a2a] hover:text-white transition-colors"
            >
              <Eye size={14} /> Xem chi tiết
            </button>

            <div className="border-t border-[#2a2a2a] my-1" />

            {/* Ẩn album (soft hide) */}
            {canHide && (
              <button
                onClick={() => { setOpen(false); onHide(album); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-400 hover:bg-slate-500/10 transition-colors"
              >
                <EyeOff size={14} /> Ẩn album
              </button>
            )}

            {/* Ban album (hard ban) */}
            {canBan && (
              <button
                onClick={() => { setOpen(false); onBan(album); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <Ban size={14} /> Ban album
              </button>
            )}

            {/* Khôi phục (nếu đang hidden hoặc banned) */}
            {canRestore && (
              <>
                <div className="border-t border-[#2a2a2a] my-1" />
                <button
                  onClick={() => { setOpen(false); onRestore(album); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                >
                  <RotateCcw size={14} /> Khôi phục
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AdminAlbums() {
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showFilters, setShowFilters] = useState(false);

  // UI state
  const [detailAlbum, setDetailAlbum] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchAlbums = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page, limit: 15,
        search, status: statusFilter, type: typeFilter,
        sortBy, sortOrder, dateFrom, dateTo,
      });
      const res = await fetch(`${API}/api/admin/albums?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAlbums(data.albums ?? []);
        setPagination(data.pagination ?? { total: 0, page: 1, totalPages: 1 });
      } else {
        showToast('Không thể tải danh sách album', 'error');
      }
    } catch {
      showToast('Lỗi kết nối server', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, typeFilter, sortBy, sortOrder, dateFrom, dateTo, showToast]);

  useEffect(() => { fetchAlbums(1); }, [fetchAlbums]);

  // Sort handler
  const handleSort = (field) => {
    if (sortBy === field) setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortOrder('desc'); }
  };

  // Load full detail for drawer
  const openDetail = async (album) => {
    setDetailAlbum({ ...album, tracks: [], stats: {} });
    setDetailLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/api/admin/albums/${album.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDetailAlbum({ ...data.album, tracks: data.tracks, stats: data.stats });
      }
    } catch { } finally {
      setDetailLoading(false);
    }
  };

  // Takedown (status → banned)
  const handleTakedown = (album) => {
    setConfirm({
      type: 'takedown',
      album,
      title: 'Gỡ bỏ Album?',
      message: `Album "${album.title}" sẽ bị ẩn khỏi toàn bộ người dùng. Dữ liệu vẫn được giữ nguyên và có thể khôi phục sau.`,
      variant: 'danger',
    });
  };

  // Restore (status → released)
  const handleRestore = (album) => {
    setConfirm({
      type: 'restore',
      album,
      title: 'Khôi phục Album?',
      message: `Album "${album.title}" sẽ được hiển thị trở lại với người dùng.`,
      variant: 'success',
    });
  };

  const executeAction = async () => {
    if (!confirm) return;
    const { type, album } = confirm;
    const token = localStorage.getItem('token');
    setActionLoading(true);
    try {
      const endpoint = type === 'takedown'
        ? `${API}/api/admin/albums/${album.id}/takedown`
        : `${API}/api/admin/albums/${album.id}/restore`;

      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Thao tác thành công');
        setConfirm(null);
        setDetailAlbum(null);
        fetchAlbums(pagination.page);
      } else {
        showToast(data.error || 'Thao tác thất bại', 'error');
      }
    } catch {
      showToast('Lỗi kết nối server', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const activeFilterCount = [
    statusFilter !== 'all',
    typeFilter !== 'all',
    dateFrom !== '',
    dateTo !== '',
  ].filter(Boolean).length;

  const ALBUM_TYPES = ['Single', 'EP', 'Album', 'Mixtape'];

  return (
    <>
      <style>{`
        @keyframes slide-in { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes fade-in  { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slide-in { animation: slide-in 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-fade-in  { animation: fade-in 0.2s ease; }
      `}</style>

      <div className="space-y-5 pb-10">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Album Management</h2>
            <p className="text-[#666] text-sm mt-0.5">
              {loading ? '...' : `${pagination.total.toLocaleString()} albums`}
              {activeFilterCount > 0 && (
                <span className="text-[#00e6e6] ml-1">· {activeFilterCount} bộ lọc đang bật</span>
              )}
            </p>
          </div>
          <button
            onClick={() => fetchAlbums(pagination.page)}
            id="refresh-albums-btn"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1a1a1a] border border-[#333] text-[#aaa] hover:text-white hover:border-[#555] transition-all text-sm"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Làm mới
          </button>
        </div>

        {/* ── Filter Bar ── */}
        <div className="bg-[#121212] border border-[#2a2a2a] rounded-2xl p-4 space-y-3">
          {/* Row 1: Search + Status + Toggle */}
          <div className="flex flex-wrap gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-52">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
              <input
                id="album-search-input"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Tìm tên album, tên nghệ sĩ..."
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl pl-9 pr-9 py-2.5 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#00e6e6]/50 transition-colors"
              />
              {searchInput && (
                <button onClick={() => setSearchInput('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] hover:text-[#aaa]">
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Status pills */}
            <div className="flex items-center gap-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-1 flex-wrap">
              {[
                ['all', 'Tất cả'],
                ['released', 'Released'],
                ['scheduled', 'Scheduled'],
                ['draft', 'Draft'],
                ['banned', 'Banned'],
              ].map(([v, l]) => (
                <button
                  key={v}
                  id={`album-status-${v}`}
                  onClick={() => setStatusFilter(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap
                    ${statusFilter === v ? 'bg-[#00e6e6]/15 text-[#00e6e6] border border-[#00e6e6]/30' : 'text-[#666] hover:text-[#aaa]'}`}
                >
                  {l}
                </button>
              ))}
            </div>

            {/* Toggle advanced filters */}
            <button
              id="toggle-album-filters"
              onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all
                ${showFilters || activeFilterCount > 0
                  ? 'bg-[#00e6e6]/10 border-[#00e6e6]/30 text-[#00e6e6]'
                  : 'bg-[#1a1a1a] border-[#2a2a2a] text-[#666] hover:text-[#aaa]'}`}
            >
              <SlidersHorizontal size={13} />
              Bộ lọc
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#00e6e6] text-black text-[9px] font-black flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Row 2: Advanced filters */}
          {showFilters && (
            <div className="flex flex-wrap gap-3 pt-3 border-t border-[#1e1e1e]">
              {/* Type filter */}
              <div className="flex items-center gap-2">
                <Hash size={13} className="text-[#555] flex-shrink-0" />
                <select
                  id="album-type-filter"
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value)}
                  className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00e6e6]/50 transition-colors min-w-[140px]"
                >
                  <option value="all">Tất cả loại</option>
                  {ALBUM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Date range */}
              <div className="flex items-center gap-2">
                <Calendar size={13} className="text-[#555] flex-shrink-0" />
                <div className="flex items-center gap-2">
                  <input
                    id="album-date-from"
                    type="date"
                    value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                    className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00e6e6]/50 transition-colors [color-scheme:dark]"
                  />
                  <span className="text-[#555] text-xs">—</span>
                  <input
                    id="album-date-to"
                    type="date"
                    value={dateTo}
                    onChange={e => setDateTo(e.target.value)}
                    className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00e6e6]/50 transition-colors [color-scheme:dark]"
                  />
                </div>
              </div>

              {/* Clear filters */}
              {activeFilterCount > 0 && (
                <button
                  id="clear-album-filters"
                  onClick={() => { setStatusFilter('all'); setTypeFilter('all'); setDateFrom(''); setDateTo(''); }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-red-400 hover:bg-red-500/10 border border-red-500/20 transition-colors"
                >
                  <X size={12} /> Xoá bộ lọc
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Table ── */}
        <div className="bg-[#121212] border border-[#2a2a2a] rounded-2xl">
          {/* Table header */}
          <div className="grid grid-cols-[56px_2.2fr_1.4fr_90px_80px_110px_95px_40px] gap-3 px-5 py-3 border-b border-[#2a2a2a] text-[10px] font-bold uppercase tracking-widest text-[#555] rounded-t-2xl overflow-hidden">
            <span>Ảnh</span>
            <div className="flex items-center gap-1.5">
              Tên Album
              <SortBtn field="title" current={sortBy} order={sortOrder} onClick={handleSort} />
            </div>
            <span>Nghệ sĩ</span>
            <span>Loại</span>
            <span># Bài</span>
            <div className="flex items-center gap-1.5">
              Ngày tạo
              <SortBtn field="createdAt" current={sortBy} order={sortOrder} onClick={handleSort} />
            </div>
            <span>Trạng thái</span>
            <span />
          </div>

          {/* Rows */}
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <RefreshCw size={28} className="text-[#00e6e6] animate-spin" />
            </div>
          ) : albums.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-[#555]">
              <Disc3 size={44} className="mb-3 opacity-30" />
              <p className="text-sm">Không tìm thấy album nào</p>
              {activeFilterCount > 0 && (
                <button
                  onClick={() => { setStatusFilter('all'); setTypeFilter('all'); setDateFrom(''); setDateTo(''); setSearchInput(''); }}
                  className="mt-3 text-xs text-[#00e6e6] hover:underline"
                >
                  Xoá bộ lọc
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-[#1a1a1a]">
              {albums.map((album, index) => (
                <div
                  key={album.id}
                  className="grid grid-cols-[56px_2.2fr_1.4fr_90px_80px_110px_95px_40px] gap-3 px-5 py-3.5 items-center hover:bg-[#161616] transition-colors group cursor-pointer"
                  onClick={() => openDetail(album)}
                >
                  {/* Cover */}
                  <CoverImage url={album.coverArtUrl} title={album.title} />

                  {/* Title */}
                  <div className="min-w-0">
                    <p className="text-white text-sm font-semibold truncate group-hover:text-[#00e6e6] transition-colors">
                      {album.title}
                    </p>
                    {album.releasedDate && (
                      <p className="text-[#555] text-[10px] truncate mt-0.5">
                        Released {fmtDate(album.releasedDate)}
                      </p>
                    )}
                    {album.scheduledAt && !album.releasedDate && (
                      <p className="text-amber-500/70 text-[10px] truncate mt-0.5">
                        Scheduled {fmtDate(album.scheduledAt)}
                      </p>
                    )}
                  </div>

                  {/* Artist */}
                  <p className="text-[#00e6e6] text-xs truncate">
                    {album.artist?.displayName || album.artist?.username || '—'}
                  </p>

                  {/* Type */}
                  <div><TypeBadge type={album.type} /></div>

                  {/* Song count */}
                  <div className="flex items-center gap-1 text-[#888] text-xs">
                    <Music size={11} className="text-[#555]" />
                    {album.songCount ?? 0}
                  </div>

                  {/* Created At */}
                  <p className="text-[#666] text-xs">{fmtDate(album.createdAt)}</p>

                  {/* Status */}
                  <div onClick={e => e.stopPropagation()}>
                    <StatusBadge status={album.status} />
                  </div>

                  {/* Actions */}
                  <div onClick={e => e.stopPropagation()}>
                    <RowActionMenu
                      album={album}
                      onView={openDetail}
                      onTakedown={handleTakedown}
                      onRestore={handleRestore}
                      index={index}
                      total={albums.length}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="border-t border-[#2a2a2a] px-5 py-4 flex items-center justify-between">
              <p className="text-[#555] text-xs">
                Trang {pagination.page} / {pagination.totalPages} &nbsp;·&nbsp; {pagination.total.toLocaleString()} kết quả
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => fetchAlbums(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="p-1.5 rounded-lg border border-[#2a2a2a] text-[#666] hover:text-white hover:border-[#444] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: Math.min(pagination.totalPages, 7) }, (_, i) => {
                  const start = Math.max(1, Math.min(pagination.page - 3, pagination.totalPages - 6));
                  const p = start + i;
                  if (p > pagination.totalPages) return null;
                  return (
                    <button
                      key={p}
                      onClick={() => fetchAlbums(p)}
                      className={`w-8 h-8 rounded-lg text-xs font-medium transition-all
                        ${p === pagination.page
                          ? 'bg-[#00e6e6]/15 border border-[#00e6e6]/40 text-[#00e6e6]'
                          : 'border border-[#2a2a2a] text-[#666] hover:text-white hover:border-[#444]'
                        }`}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  onClick={() => fetchAlbums(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="p-1.5 rounded-lg border border-[#2a2a2a] text-[#666] hover:text-white hover:border-[#444] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Detail Drawer ── */}
      <AlbumDetailDrawer
        album={detailAlbum}
        onClose={() => setDetailAlbum(null)}
        onTakedown={(album) => { setDetailAlbum(null); handleTakedown(album); }}
        onRestore={(album) => { setDetailAlbum(null); handleRestore(album); }}
        actionLoading={actionLoading || detailLoading}
      />

      {/* ── Confirm Dialog ── */}
      {confirm && (
        <ConfirmDialog
          open={!!confirm}
          title={confirm.title}
          message={confirm.message}
          variant={confirm.variant}
          loading={actionLoading}
          onConfirm={executeAction}
          onCancel={() => !actionLoading && setConfirm(null)}
        />
      )}

      {/* ── Toast ── */}
      <Toast toast={toast} />
    </>
  );
}
