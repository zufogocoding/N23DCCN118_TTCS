import { useState, useEffect, useCallback } from 'react';
import {
  Users, Search, Filter, Shield, ShieldOff, ShieldCheck,
  Trash2, Ban, CheckCircle, ChevronLeft, ChevronRight,
  Music2, ListMusic, X, AlertTriangle, Crown, UserCircle2,
  RefreshCw, Eye, MoreVertical
} from 'lucide-react';

const API = 'http://localhost:9000';

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function Avatar({ url, name, size = 9 }) {
  const initials = (name || '?').slice(0, 2).toUpperCase();
  return url
    ? <img src={`${API}${url}`} alt={name} className={`w-${size} h-${size} rounded-full object-cover ring-2 ring-[#333]`} />
    : (
      <div className={`w-${size} h-${size} rounded-full bg-gradient-to-br from-[#00e6e6]/30 to-[#006666]/30 border border-[#00e6e6]/30 flex items-center justify-center text-[#00e6e6] text-xs font-bold select-none`}>
        {initials}
      </div>
    );
}

function RoleBadge({ user }) {
  if (user.isAdmin) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 border border-amber-500/40 text-amber-400">
      <Crown size={10} /> Admin
    </span>
  );
  if (user.artist) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 border border-purple-500/40 text-purple-400">
      <Music2 size={10} /> Artist
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#333]/60 border border-[#444] text-[#888]">
      <UserCircle2 size={10} /> User
    </span>
  );
}

function StatusBadge({ isActive }) {
  return isActive
    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/40 text-emerald-400"><CheckCircle size={10} />Active</span>
    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 border border-red-500/40 text-red-400"><Ban size={10} />Banned</span>;
}

// ── Confirm Dialog ──────────────────────────────────────────────────────────

function ConfirmDialog({ open, title, message, variant = 'danger', onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-[#161616] border border-[#333] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${variant === 'danger' ? 'bg-red-500/15' : 'bg-amber-500/15'}`}>
          <AlertTriangle size={22} className={variant === 'danger' ? 'text-red-400' : 'text-amber-400'} />
        </div>
        <h3 className="text-white font-bold text-lg mb-2">{title}</h3>
        <p className="text-[#a0a0a0] text-sm mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2 rounded-lg border border-[#444] text-[#aaa] hover:bg-[#222] transition-colors text-sm font-medium">
            Huỷ
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2 rounded-lg text-white text-sm font-bold transition-colors ${variant === 'danger' ? 'bg-red-600 hover:bg-red-500' : 'bg-amber-600 hover:bg-amber-500'}`}
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}

// ── User Detail Drawer ──────────────────────────────────────────────────────

function UserDetailDrawer({ userId, onClose, onAction }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    const token = localStorage.getItem('token');
    fetch(`${API}/api/admin/users/${userId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setUser(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [userId]);

  if (!userId) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#141414] border-l border-[#2a2a2a] h-full overflow-y-auto shadow-2xl animate-slide-in">
        <div className="sticky top-0 bg-[#141414]/95 backdrop-blur-sm border-b border-[#2a2a2a] px-6 py-4 flex items-center justify-between z-10">
          <h3 className="text-white font-bold text-base">Chi tiết người dùng</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#222] text-[#666] hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw size={24} className="text-[#00e6e6] animate-spin" />
          </div>
        ) : user && !user.error ? (
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-start gap-4">
              <Avatar url={user.avatarUrl} name={user.username} size={16} />
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-lg truncate">{user.displayName || user.username}</p>
                <p className="text-[#666] text-sm truncate">@{user.username}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <RoleBadge user={user} />
                  <StatusBadge isActive={user.isActive} />
                </div>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Email', value: user.email },
                { label: 'Quốc gia', value: user.country || '—' },
                { label: 'Ngày sinh', value: fmtDate(user.dob) },
                { label: 'Tham gia', value: fmtDate(user.createdAt) },
                { label: 'Đăng nhập gần nhất', value: fmtDate(user.lastLogin) },
                { label: 'Xác thực', value: user.isVerified ? 'Đã xác thực' : 'Chưa xác thực' },
              ].map(item => (
                <div key={item.label} className="bg-[#1a1a1a] rounded-xl p-3 border border-[#2a2a2a]">
                  <p className="text-[#666] text-[10px] uppercase tracking-wider mb-1">{item.label}</p>
                  <p className="text-white text-sm font-medium truncate">{item.value}</p>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a]">
              <p className="text-[#666] text-xs uppercase tracking-wider mb-3">Thống kê hoạt động</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Playlist', value: user._count?.playlists ?? 0, icon: <ListMusic size={14} /> },
                  { label: 'Tương tác', value: user._count?.interactions ?? 0, icon: <Music2 size={14} /> },
                  { label: 'Đang follow', value: user._count?.follows ?? 0, icon: <Users size={14} /> },
                  { label: 'Follower', value: user._count?.followedBy ?? 0, icon: <Users size={14} /> },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-2">
                    <span className="text-[#00e6e6]">{s.icon}</span>
                    <div>
                      <p className="text-white font-bold text-base leading-none">{s.value.toLocaleString()}</p>
                      <p className="text-[#666] text-[10px] mt-0.5">{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Artist Info */}
            {user.artist && (
              <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4">
                <p className="text-purple-400 text-xs uppercase tracking-wider font-bold mb-3">Thông tin Artist</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#888]">Trạng thái</span>
                    <span className="text-white capitalize">{user.artist.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#888]">Followers</span>
                    <span className="text-white">{(user.artist.followerCount || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#888]">Verified Tick</span>
                    <span className={user.artist.verifiedTick ? 'text-[#00e6e6]' : 'text-[#666]'}>
                      {user.artist.verifiedTick ? '✓ Có' : 'Không'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Bio */}
            {user.bio && (
              <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a]">
                <p className="text-[#666] text-[10px] uppercase tracking-wider mb-2">Bio</p>
                <p className="text-[#ccc] text-sm leading-relaxed">{user.bio}</p>
              </div>
            )}

            {/* Actions */}
            {!user.isAdmin && (
              <div className="space-y-2 pt-2 border-t border-[#2a2a2a]">
                <p className="text-[#666] text-xs uppercase tracking-wider mb-3">Hành động</p>
                {user.isActive ? (
                  <button
                    onClick={() => onAction('ban', user)}
                    className="w-full flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors text-sm font-medium"
                  >
                    <Ban size={16} /> Ban tài khoản này
                  </button>
                ) : (
                  <button
                    onClick={() => onAction('unban', user)}
                    className="w-full flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-colors text-sm font-medium"
                  >
                    <CheckCircle size={16} /> Unban tài khoản này
                  </button>
                )}
                <button
                  onClick={() => onAction('promote', user)}
                  className="w-full flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-colors text-sm font-medium"
                >
                  <Crown size={16} /> Cấp quyền Admin
                </button>
                <button
                  onClick={() => onAction('delete', user)}
                  className="w-full flex items-center gap-2 px-4 py-3 rounded-xl bg-red-900/20 border border-red-900/40 text-red-500 hover:bg-red-900/30 transition-colors text-sm font-medium"
                >
                  <Trash2 size={16} /> Xóa vĩnh viễn
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-[#666]">Không tìm thấy dữ liệu</div>
        )}
      </div>
    </div>
  );
}

// ── Row Action Menu ─────────────────────────────────────────────────────────

function ActionMenu({ user, onAction, onViewDetail, index, total }) {
  const [open, setOpen] = useState(false);
  const openUpward = total === 1 ? true : (index >= total - 2);

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="p-1.5 rounded-lg hover:bg-[#2a2a2a] text-[#666] hover:text-white transition-colors"
      >
        <MoreVertical size={16} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className={`absolute right-0 z-40 w-44 bg-[#1e1e1e] border border-[#333] rounded-xl shadow-2xl overflow-hidden py-1 ${openUpward ? 'bottom-8' : 'top-8'}`}>
            <button
              onClick={() => { setOpen(false); onViewDetail(user.id); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#ccc] hover:bg-[#2a2a2a] hover:text-white transition-colors"
            >
              <Eye size={14} /> Xem chi tiết
            </button>

            {!user.isAdmin && (
              <>
                <div className="border-t border-[#2a2a2a] my-1" />
                {user.isActive ? (
                  <button
                    onClick={() => { setOpen(false); onAction('ban', user); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Ban size={14} /> Ban
                  </button>
                ) : (
                  <button
                    onClick={() => { setOpen(false); onAction('unban', user); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                  >
                    <CheckCircle size={14} /> Unban
                  </button>
                )}
                <button
                  onClick={() => { setOpen(false); onAction('promote', user); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-amber-400 hover:bg-amber-500/10 transition-colors"
                >
                  <Crown size={14} /> Cấp Admin
                </button>
                <div className="border-t border-[#2a2a2a] my-1" />
                <button
                  onClick={() => { setOpen(false); onAction('delete', user); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 size={14} /> Xóa
                </button>
              </>
            )}

            {user.isAdmin && (
              <>
                <div className="border-t border-[#2a2a2a] my-1" />
                <button
                  onClick={() => { setOpen(false); onAction('demote', user); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-amber-400 hover:bg-amber-500/10 transition-colors"
                >
                  <ShieldOff size={14} /> Thu hồi Admin
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Toast ───────────────────────────────────────────────────────────────────

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border text-sm font-medium animate-fade-in
      ${toast.type === 'success' ? 'bg-emerald-900/90 border-emerald-500/50 text-emerald-300' : 'bg-red-900/90 border-red-500/50 text-red-300'}`}
    >
      {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
      {toast.message}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');

  const [detailUserId, setDetailUserId] = useState(null);
  const [confirm, setConfirm] = useState(null); // { action, user }
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page, limit: 15,
        search, status: statusFilter, role: roleFilter,
      });
      const res = await fetch(`${API}/api/admin/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error(err);
      showToast('Không thể tải danh sách người dùng', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, roleFilter]);

  useEffect(() => { fetchUsers(1); }, [fetchUsers]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleAction = (action, user) => {
    setConfirm({ action, user });
  };

  const confirmMessages = {
    ban: { title: 'Ban tài khoản?', msg: (u) => `Tài khoản "${u.username}" sẽ không thể đăng nhập cho đến khi được unban.`, variant: 'danger' },
    unban: { title: 'Unban tài khoản?', msg: (u) => `Khôi phục quyền truy cập cho "${u.username}".`, variant: 'warning' },
    delete: { title: 'Xóa vĩnh viễn?', msg: (u) => `Toàn bộ dữ liệu của "${u.username}" sẽ bị xóa. Không thể hoàn tác!`, variant: 'danger' },
    promote: { title: 'Cấp quyền Admin?', msg: (u) => `"${u.username}" sẽ có toàn quyền quản trị hệ thống.`, variant: 'warning' },
    demote: { title: 'Thu hồi quyền Admin?', msg: (u) => `"${u.username}" sẽ trở về quyền người dùng thông thường.`, variant: 'warning' },
  };

  const executeAction = async () => {
    if (!confirm) return;
    const { action, user } = confirm;
    const token = localStorage.getItem('token');
    setActionLoading(true);

    const actionMap = {
      ban: { method: 'PUT', url: `/api/admin/users/${user.id}/ban` },
      unban: { method: 'PUT', url: `/api/admin/users/${user.id}/unban` },
      delete: { method: 'DELETE', url: `/api/admin/users/${user.id}` },
      promote: { method: 'PUT', url: `/api/admin/users/${user.id}/promote` },
      demote: { method: 'PUT', url: `/api/admin/users/${user.id}/demote` },
    };

    try {
      const { method, url } = actionMap[action];
      const res = await fetch(`${API}${url}`, { method, headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Thao tác thành công');
        setConfirm(null);
        if (detailUserId === user.id) setDetailUserId(null);
        fetchUsers(pagination.page);
      } else {
        showToast(data.error || 'Thao tác thất bại', 'error');
      }
    } catch (err) {
      showToast('Lỗi kết nối server', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const totalFiltered = pagination.total;
  const activeFilters = [statusFilter !== 'all', roleFilter !== 'all', search !== ''].filter(Boolean).length;

  return (
    <>
      <style>{`
        @keyframes slide-in { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slide-in { animation: slide-in 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-fade-in { animation: fade-in 0.2s ease; }
      `}</style>

      <div className="space-y-5 pb-10">

        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">User Management</h2>
            <p className="text-[#666] text-sm mt-0.5">
              {loading ? '...' : `${totalFiltered.toLocaleString()} người dùng`}
              {activeFilters > 0 && <span className="text-[#00e6e6] ml-1">· {activeFilters} bộ lọc đang bật</span>}
            </p>
          </div>
          <button
            onClick={() => fetchUsers(pagination.page)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1a1a1a] border border-[#333] text-[#aaa] hover:text-white hover:border-[#555] transition-all text-sm"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Làm mới
          </button>
        </div>

        {/* Filter Bar */}
        <div className="bg-[#121212] border border-[#2a2a2a] rounded-2xl p-4 flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-52">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Tìm theo tên, email..."
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#00e6e6]/50 transition-colors"
            />
            {searchInput && (
              <button onClick={() => setSearchInput('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] hover:text-[#aaa]">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-1">
            {[['all', 'Tất cả'], ['active', 'Active'], ['banned', 'Banned']].map(([v, l]) => (
              <button
                key={v}
                onClick={() => setStatusFilter(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${statusFilter === v ? 'bg-[#00e6e6]/15 text-[#00e6e6] border border-[#00e6e6]/30' : 'text-[#666] hover:text-[#aaa]'}`}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-1">
            {[['all', 'Tất cả'], ['user', 'User'], ['artist', 'Artist'], ['admin', 'Admin']].map(([v, l]) => (
              <button
                key={v}
                onClick={() => setRoleFilter(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${roleFilter === v ? 'bg-[#00e6e6]/15 text-[#00e6e6] border border-[#00e6e6]/30' : 'text-[#666] hover:text-[#aaa]'}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-[#121212] border border-[#2a2a2a] rounded-2xl">
          {/* Table Header */}
          <div className="grid grid-cols-[2.5fr_2fr_1fr_1fr_1fr_1fr_40px] gap-3 px-5 py-3 border-b border-[#2a2a2a] text-[10px] font-bold uppercase tracking-widest text-[#555] rounded-t-2xl">
            <span>Người dùng</span>
            <span>Email</span>
            <span>Vai trò</span>
            <span>Trạng thái</span>
            <span>Tham gia</span>
            <span>Playlist</span>
            <span />
          </div>

          {/* Rows */}
          {loading ? (
            <div className="flex items-center justify-center py-20 rounded-b-2xl">
              <RefreshCw size={28} className="text-[#00e6e6] animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-[#555] rounded-b-2xl">
              <Users size={40} className="mb-3 opacity-40" />
              <p className="text-sm">Không tìm thấy người dùng nào</p>
            </div>
          ) : (
            <div className="divide-y divide-[#1e1e1e]">
              {users.map((user, index) => (
                <div
                  key={user.id}
                  className={`grid grid-cols-[2.5fr_2fr_1fr_1fr_1fr_1fr_40px] gap-3 px-5 py-3.5 items-center hover:bg-[#161616] transition-colors group ${
                    index === users.length - 1 && pagination.totalPages <= 1 ? 'rounded-b-2xl' : ''
                  }`}
                >
                  {/* User info */}
                  <div
                    className="flex items-center gap-3 min-w-0 cursor-pointer"
                    onClick={() => setDetailUserId(user.id)}
                  >
                    <Avatar url={user.avatarUrl} name={user.username} size={9} />
                    <div className="min-w-0">
                      <p className="text-white text-sm font-semibold truncate group-hover:text-[#00e6e6] transition-colors">
                        {user.displayName || user.username}
                      </p>
                      <p className="text-[#555] text-xs truncate">@{user.username}</p>
                    </div>
                  </div>

                  <p className="text-[#888] text-xs truncate">{user.email}</p>
                  <div><RoleBadge user={user} /></div>
                  <div><StatusBadge isActive={user.isActive} /></div>
                  <p className="text-[#666] text-xs">{fmtDate(user.createdAt)}</p>
                  <p className="text-[#666] text-xs">{user._count?.playlists ?? 0}</p>

                  <ActionMenu
                    user={user}
                    onAction={handleAction}
                    onViewDetail={setDetailUserId}
                    index={index}
                    total={users.length}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="border-t border-[#2a2a2a] px-5 py-4 flex items-center justify-between rounded-b-2xl">
              <p className="text-[#555] text-xs">
                Trang {pagination.page} / {pagination.totalPages} &nbsp;·&nbsp; {pagination.total.toLocaleString()} kết quả
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => fetchUsers(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="p-1.5 rounded-lg border border-[#2a2a2a] text-[#666] hover:text-white hover:border-[#444] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                  const p = Math.max(1, pagination.page - 2) + i;
                  if (p > pagination.totalPages) return null;
                  return (
                    <button
                      key={p}
                      onClick={() => fetchUsers(p)}
                      className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${p === pagination.page ? 'bg-[#00e6e6]/15 border border-[#00e6e6]/40 text-[#00e6e6]' : 'border border-[#2a2a2a] text-[#666] hover:text-white hover:border-[#444]'}`}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  onClick={() => fetchUsers(pagination.page + 1)}
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

      {/* Detail Drawer */}
      <UserDetailDrawer
        userId={detailUserId}
        onClose={() => setDetailUserId(null)}
        onAction={(action, user) => {
          setDetailUserId(null);
          handleAction(action, user);
        }}
      />

      {/* Confirm Dialog */}
      {confirm && (
        <ConfirmDialog
          open={!!confirm}
          title={confirmMessages[confirm.action]?.title}
          message={confirmMessages[confirm.action]?.msg(confirm.user)}
          variant={confirmMessages[confirm.action]?.variant}
          onConfirm={executeAction}
          onCancel={() => !actionLoading && setConfirm(null)}
        />
      )}

      {/* Toast */}
      <Toast toast={toast} />
    </>
  );
}