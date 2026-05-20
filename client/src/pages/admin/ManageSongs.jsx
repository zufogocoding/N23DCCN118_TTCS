import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Music2, Search, RefreshCw, Trash2, Eye, EyeOff, Filter,
  ChevronLeft, ChevronRight, X, AlertTriangle, CheckCircle,
  Clock, Play, MoreVertical, Calendar, TrendingUp, Hash,
  ArrowUpDown, ArrowUp, ArrowDown, Ban, Check, BarChart2,
  SlidersHorizontal
} from 'lucide-react';

const API = 'http://localhost:9000';

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function fmtDuration(ms) {
  if (!ms) return '—';
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function fmtCount(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n ?? 0);
}

// ── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_MAP = {
  approved: { label: 'Visible', cls: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400', icon: <CheckCircle size={10} /> },
  hidden:   { label: 'Hidden',  cls: 'bg-slate-500/15 border-slate-500/40 text-slate-400',     icon: <EyeOff size={10} /> },
  pending:  { label: 'Pending', cls: 'bg-amber-500/15 border-amber-500/40 text-amber-400',     icon: <Clock size={10} /> },
  rejected: { label: 'Rejected',cls: 'bg-red-500/15 border-red-500/40 text-red-400',           icon: <Ban size={10} /> },
};

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] ?? STATUS_MAP.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${s.cls}`}>
      {s.icon}{s.label}
    </span>
  );
}

// ── Cover Image ───────────────────────────────────────────────────────────────

function CoverImage({ url, title }) {
  const [err, setErr] = useState(false);
  if (!url || err) {
    return (
      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border border-[#2a2a2a] flex items-center justify-center flex-shrink-0">
        <Music2 size={14} className="text-[#444]" />
      </div>
    );
  }
  return (
    <img
      src={`${API}${url}`}
      alt={title}
      onError={() => setErr(true)}
      className="w-10 h-10 rounded-lg object-cover flex-shrink-0 ring-1 ring-[#2a2a2a]"
    />
  );
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────

function ConfirmDialog({ open, title, message, variant = 'danger', onConfirm, onCancel, loading }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={!loading ? onCancel : undefined} />
      <div className="relative bg-[#161616] border border-[#333] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${variant === 'danger' ? 'bg-red-500/15' : 'bg-amber-500/15'}`}>
          <AlertTriangle size={22} className={variant === 'danger' ? 'text-red-400' : 'text-amber-400'} />
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
            className={`flex-1 px-4 py-2 rounded-lg text-white text-sm font-bold transition-colors flex items-center justify-center gap-2 ${variant === 'danger' ? 'bg-red-600 hover:bg-red-500' : 'bg-amber-600 hover:bg-amber-500'} disabled:opacity-60`}
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

// ── Song Detail Drawer ────────────────────────────────────────────────────────

function SongDetailDrawer({ song, onClose, onToggleVisibility, onDelete, actionLoading }) {
  if (!song) return null;

  const artistNames = song.artists?.length
    ? song.artists.map(a => a.artist?.user?.displayName || a.artist?.user?.username).filter(Boolean).join(', ')
    : (song.artistName || '—');

  const genreList = song.genres?.map(g => g.genre?.genreTag).filter(Boolean) ?? [];

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-[#141414] border-l border-[#2a2a2a] h-full overflow-y-auto shadow-2xl animate-slide-in">
        {/* Header */}
        <div className="sticky top-0 bg-[#141414]/95 backdrop-blur-sm border-b border-[#2a2a2a] px-5 py-4 flex items-center justify-between z-10">
          <h3 className="text-white font-bold text-sm">Chi tiết bài hát</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#222] text-[#666] hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Cover + Title */}
          <div className="flex gap-4 items-start">
            <CoverImage url={song.coverArtUrl} title={song.title} />
            <div className="min-w-0 flex-1">
              <p className="text-white font-bold text-base leading-tight truncate">{song.title}</p>
              <p className="text-[#00e6e6] text-sm mt-0.5 truncate">{artistNames}</p>
              <div className="mt-2">
                <StatusBadge status={song.status} />
              </div>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { label: 'Thời lượng', value: fmtDuration(song.durationMs), icon: <Play size={12} /> },
              { label: 'Lượt nghe', value: fmtCount(song.playCount), icon: <TrendingUp size={12} /> },
              { label: 'Tương tác', value: fmtCount(song._count?.interactions), icon: <BarChart2 size={12} /> },
              { label: 'Ngày tải lên', value: fmtDate(song.createdAt), icon: <Calendar size={12} /> },
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

          {/* Genres */}
          {genreList.length > 0 && (
            <div className="bg-[#1a1a1a] rounded-xl p-3 border border-[#2a2a2a]">
              <p className="text-[#555] text-[10px] uppercase tracking-wider mb-2">Thể loại</p>
              <div className="flex flex-wrap gap-1.5">
                {genreList.map(g => (
                  <span key={g} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#00e6e6]/10 border border-[#00e6e6]/20 text-[#00e6e6]">
                    {g}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Song ID */}
          <div className="bg-[#1a1a1a] rounded-xl p-3 border border-[#2a2a2a]">
            <p className="text-[#555] text-[10px] uppercase tracking-wider mb-1">Song ID</p>
            <p className="text-[#888] text-xs font-mono">#{song.id}</p>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-2 border-t border-[#2a2a2a]">
            <p className="text-[#555] text-[10px] uppercase tracking-wider mb-3">Hành động</p>
            <button
              onClick={() => onToggleVisibility(song)}
              disabled={actionLoading}
              className={`w-full flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-colors disabled:opacity-50
                ${song.status === 'approved'
                  ? 'bg-slate-500/10 border-slate-500/30 text-slate-400 hover:bg-slate-500/20'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                }`}
            >
              {song.status === 'approved' ? <EyeOff size={16} /> : <Eye size={16} />}
              {song.status === 'approved' ? 'Ẩn bài hát' : 'Hiện bài hát'}
            </button>
            <button
              onClick={() => onDelete(song)}
              disabled={actionLoading}
              className="w-full flex items-center gap-2 px-4 py-3 rounded-xl bg-red-900/20 border border-red-900/40 text-red-500 hover:bg-red-900/30 transition-colors text-sm font-medium disabled:opacity-50"
            >
              <Trash2 size={16} /> Xóa bài hát
            </button>
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

function RowActionMenu({ song, onView, onToggle, onDelete, index, total }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const openUpward = index >= total - 2;

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
        id={`song-action-${song.id}`}
      >
        <MoreVertical size={15} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className={`absolute right-0 z-40 w-44 bg-[#1e1e1e] border border-[#333] rounded-xl shadow-2xl overflow-hidden py-1 ${openUpward ? 'bottom-8' : 'top-8'}`}>
            <button
              onClick={() => { setOpen(false); onView(song); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#ccc] hover:bg-[#2a2a2a] hover:text-white transition-colors"
            >
              <Eye size={14} /> Xem chi tiết
            </button>
            <div className="border-t border-[#2a2a2a] my-1" />
            <button
              onClick={() => { setOpen(false); onToggle(song); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors
                ${song.status === 'approved' ? 'text-slate-400 hover:bg-slate-500/10' : 'text-emerald-400 hover:bg-emerald-500/10'}`}
            >
              {song.status === 'approved' ? <EyeOff size={14} /> : <Eye size={14} />}
              {song.status === 'approved' ? 'Ẩn bài hát' : 'Hiện bài hát'}
            </button>
            <div className="border-t border-[#2a2a2a] my-1" />
            <button
              onClick={() => { setOpen(false); onDelete(song); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 size={14} /> Xóa bài hát
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ManageSongs() {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [genres, setGenres] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [genreFilter, setGenreFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showFilters, setShowFilters] = useState(false);

  // UI state
  const [detailSong, setDetailSong] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Load genres once
  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${API}/api/genres`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setGenres(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchSongs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page, limit: 15,
        search, status: statusFilter,
        genreId: genreFilter,
        sortBy, sortOrder,
        dateFrom, dateTo,
      });
      const res = await fetch(`${API}/api/admin/songs?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSongs(data.songs ?? []);
        setPagination(data.pagination ?? { total: 0, page: 1, totalPages: 1 });
      } else {
        showToast('Không thể tải danh sách bài hát', 'error');
      }
    } catch {
      showToast('Lỗi kết nối server', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, genreFilter, sortBy, sortOrder, dateFrom, dateTo, showToast]);

  useEffect(() => { fetchSongs(1); }, [fetchSongs]);

  // Sort handler
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // Toggle visibility
  const handleToggleVisibility = (song) => {
    setConfirm({
      type: 'toggle',
      song,
      title: song.status === 'approved' ? 'Ẩn bài hát?' : 'Hiện bài hát?',
      message: song.status === 'approved'
        ? `Bài hát "${song.title}" sẽ bị ẩn khỏi người dùng.`
        : `Bài hát "${song.title}" sẽ hiển thị trở lại với người dùng.`,
      variant: song.status === 'approved' ? 'warning' : 'success',
    });
  };

  const handleDelete = (song) => {
    setConfirm({
      type: 'delete',
      song,
      title: 'Xóa bài hát?',
      message: `Bài hát "${song.title}" sẽ bị xóa khỏi hệ thống. Không thể hoàn tác!`,
      variant: 'danger',
    });
  };

  const executeAction = async () => {
    if (!confirm) return;
    const { type, song } = confirm;
    const token = localStorage.getItem('token');
    setActionLoading(true);
    try {
      let res;
      if (type === 'toggle') {
        res = await fetch(`${API}/api/admin/songs/${song.id}/visibility`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
        });
      } else if (type === 'delete') {
        res = await fetch(`${API}/api/admin/songs/${song.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Thao tác thành công');
        setConfirm(null);
        setDetailSong(null);
        fetchSongs(pagination.page);
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
    genreFilter !== '',
    dateFrom !== '',
    dateTo !== '',
  ].filter(Boolean).length;

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
            <h2 className="text-2xl font-bold text-white">Song Management</h2>
            <p className="text-[#666] text-sm mt-0.5">
              {loading ? '...' : `${pagination.total.toLocaleString()} bài hát`}
              {activeFilterCount > 0 && (
                <span className="text-[#00e6e6] ml-1">· {activeFilterCount} bộ lọc đang bật</span>
              )}
            </p>
          </div>
          <button
            onClick={() => fetchSongs(pagination.page)}
            id="refresh-songs-btn"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1a1a1a] border border-[#333] text-[#aaa] hover:text-white hover:border-[#555] transition-all text-sm"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Làm mới
          </button>
        </div>

        {/* ── Filter Bar ── */}
        <div className="bg-[#121212] border border-[#2a2a2a] rounded-2xl p-4 space-y-3">
          {/* Row 1: Search + Status + Toggle advanced */}
          <div className="flex flex-wrap gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-52">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
              <input
                id="song-search-input"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Tìm tên bài hát, nghệ sĩ..."
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl pl-9 pr-9 py-2.5 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#00e6e6]/50 transition-colors"
              />
              {searchInput && (
                <button onClick={() => setSearchInput('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] hover:text-[#aaa]">
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Status pills */}
            <div className="flex items-center gap-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-1">
              {[
                ['all', 'Tất cả'],
                ['approved', 'Visible'],
                ['hidden', 'Hidden'],
                ['pending', 'Pending'],
                ['rejected', 'Rejected'],
              ].map(([v, l]) => (
                <button
                  key={v}
                  id={`status-filter-${v}`}
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
              id="toggle-advanced-filters"
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

          {/* Row 2: Advanced filters (collapsible) */}
          {showFilters && (
            <div className="flex flex-wrap gap-3 pt-3 border-t border-[#1e1e1e]">
              {/* Genre filter */}
              <div className="flex items-center gap-2">
                <Hash size={13} className="text-[#555] flex-shrink-0" />
                <select
                  id="genre-filter-select"
                  value={genreFilter}
                  onChange={e => setGenreFilter(e.target.value)}
                  className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00e6e6]/50 transition-colors min-w-[140px]"
                >
                  <option value="">Tất cả thể loại</option>
                  {genres.map(g => (
                    <option key={g.id} value={g.id}>{g.genreTag}</option>
                  ))}
                </select>
              </div>

              {/* Date From */}
              <div className="flex items-center gap-2">
                <Calendar size={13} className="text-[#555] flex-shrink-0" />
                <div className="flex items-center gap-2">
                  <input
                    id="date-from-input"
                    type="date"
                    value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                    className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00e6e6]/50 transition-colors [color-scheme:dark]"
                  />
                  <span className="text-[#555] text-xs">—</span>
                  <input
                    id="date-to-input"
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
                  id="clear-filters-btn"
                  onClick={() => {
                    setStatusFilter('all');
                    setGenreFilter('');
                    setDateFrom('');
                    setDateTo('');
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-red-400 hover:bg-red-500/10 border border-red-500/20 transition-colors"
                >
                  <X size={12} /> Xoá bộ lọc
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Table ── */}
        <div className="bg-[#121212] border border-[#2a2a2a] rounded-2xl overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[56px_2.2fr_1.4fr_80px_100px_100px_90px_40px] gap-3 px-5 py-3 border-b border-[#2a2a2a] text-[10px] font-bold uppercase tracking-widest text-[#555]">
            <span>Ảnh</span>
            <div className="flex items-center gap-1.5">
              Tên bài hát
              <SortBtn field="title" current={sortBy} order={sortOrder} onClick={handleSort} />
            </div>
            <span>Nghệ sĩ</span>
            <div className="flex items-center gap-1.5">
              T/gian
              <SortBtn field="durationMs" current={sortBy} order={sortOrder} onClick={handleSort} />
            </div>
            <div className="flex items-center gap-1.5">
              Ngày tải lên
              <SortBtn field="createdAt" current={sortBy} order={sortOrder} onClick={handleSort} />
            </div>
            <div className="flex items-center gap-1.5">
              Lượt nghe
              <SortBtn field="playCount" current={sortBy} order={sortOrder} onClick={handleSort} />
            </div>
            <span>Trạng thái</span>
            <span />
          </div>

          {/* Rows */}
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <RefreshCw size={28} className="text-[#00e6e6] animate-spin" />
            </div>
          ) : songs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-[#555]">
              <Music2 size={44} className="mb-3 opacity-30" />
              <p className="text-sm">Không tìm thấy bài hát nào</p>
              {activeFilterCount > 0 && (
                <button
                  onClick={() => { setStatusFilter('all'); setGenreFilter(''); setDateFrom(''); setDateTo(''); setSearchInput(''); }}
                  className="mt-3 text-xs text-[#00e6e6] hover:underline"
                >
                  Xoá bộ lọc
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-[#1a1a1a]">
              {songs.map((song, index) => {
                const artistDisplay = song.artists?.length
                  ? song.artists.map(a => a.artist?.user?.displayName || a.artist?.user?.username).filter(Boolean).join(', ')
                  : (song.artistName || '—');

                return (
                  <div
                    key={song.id}
                    className="grid grid-cols-[56px_2.2fr_1.4fr_80px_100px_100px_90px_40px] gap-3 px-5 py-3.5 items-center hover:bg-[#161616] transition-colors group cursor-pointer"
                    onClick={() => setDetailSong(song)}
                  >
                    {/* Cover */}
                    <CoverImage url={song.coverArtUrl} title={song.title} />

                    {/* Title */}
                    <div className="min-w-0">
                      <p className="text-white text-sm font-semibold truncate group-hover:text-[#00e6e6] transition-colors">
                        {song.title}
                      </p>
                      {song.genres?.length > 0 && (
                        <p className="text-[#555] text-[10px] truncate mt-0.5">
                          {song.genres.map(g => g.genre?.genreTag).filter(Boolean).slice(0, 3).join(' · ')}
                        </p>
                      )}
                    </div>

                    {/* Artist */}
                    <p className="text-[#00e6e6] text-xs truncate">{artistDisplay}</p>

                    {/* Duration */}
                    <p className="text-[#888] text-xs font-mono">{fmtDuration(song.durationMs)}</p>

                    {/* Upload date */}
                    <p className="text-[#666] text-xs">{fmtDate(song.createdAt)}</p>

                    {/* Play count */}
                    <p className="text-[#666] text-xs font-medium">{fmtCount(song.playCount)}</p>

                    {/* Status */}
                    <div onClick={e => e.stopPropagation()}>
                      <StatusBadge status={song.status} />
                    </div>

                    {/* Actions */}
                    <div onClick={e => e.stopPropagation()}>
                      <RowActionMenu
                        song={song}
                        onView={setDetailSong}
                        onToggle={handleToggleVisibility}
                        onDelete={handleDelete}
                        index={index}
                        total={songs.length}
                      />
                    </div>
                  </div>
                );
              })}
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
                  onClick={() => fetchSongs(pagination.page - 1)}
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
                      onClick={() => fetchSongs(p)}
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
                  onClick={() => fetchSongs(pagination.page + 1)}
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
      <SongDetailDrawer
        song={detailSong}
        onClose={() => setDetailSong(null)}
        onToggleVisibility={(song) => { setDetailSong(null); handleToggleVisibility(song); }}
        onDelete={(song) => { setDetailSong(null); handleDelete(song); }}
        actionLoading={actionLoading}
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
