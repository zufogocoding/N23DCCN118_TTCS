import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ListMusic, Plus, Search, RefreshCw, Trash2, Edit3,
  Home, Music2, X, CheckCircle, AlertTriangle, ChevronRight,
  Image as ImageIcon, Loader2, GripVertical
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { api, getMediaUrl } from '../../utils/api';

const CATEGORIES = ['Nổi bật', 'Thư giãn', 'Tập trung', 'Năng lượng', 'Buồn', 'Vui', 'Khác'];


// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border text-sm font-medium
      ${toast.type === 'success'
        ? 'bg-emerald-900/90 border-emerald-500/50 text-emerald-300'
        : 'bg-red-900/90 border-red-500/50 text-red-300'}`}
    >
      {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
      {toast.message}
    </div>
  );
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────
function ConfirmDialog({ open, title, message, onConfirm, onCancel, loading }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={!loading ? onCancel : undefined} />
      <div className="relative bg-[#161616] border border-[#333] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-red-500/15">
          <AlertTriangle size={22} className="text-red-400" />
        </div>
        <h3 className="text-white font-bold text-lg mb-2">{title}</h3>
        <p className="text-[#a0a0a0] text-sm mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={loading} className="flex-1 px-4 py-2 rounded-lg border border-[#444] text-[#aaa] hover:bg-[#222] transition-colors text-sm font-medium disabled:opacity-50">
            Huỷ
          </button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
            {loading && <RefreshCw size={14} className="animate-spin" />}
            Xoá
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Cover Image ───────────────────────────────────────────────────────────────
function CoverImage({ url, title, size = 'md' }) {
  const [err, setErr] = useState(false);
  const cls = size === 'sm' ? 'w-10 h-10 rounded-lg' : 'w-12 h-12 rounded-xl';
  if (!url || err) {
    return (
      <div className={`${cls} bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border border-[#2a2a2a] flex items-center justify-center flex-shrink-0`}>
        <ListMusic size={size === 'sm' ? 14 : 18} className="text-[#444]" />
      </div>
    );
  }
  return (
    <img src={getMediaUrl(url)} alt={title} onError={() => setErr(true)}
      className={`${cls} object-cover flex-shrink-0 ring-1 ring-[#2a2a2a]`} />
  );
}

// ── Create Playlist Modal ─────────────────────────────────────────────────────
function CreatePlaylistModal({ onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ title: '', description: '', category: 'Nổi bật', displayOrder: 0 });
  const [coverFile, setCoverFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedSongs, setSelectedSongs] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCoverFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  // Auto-search debounce
  useEffect(() => {
    if (step !== 2) return;
    const fetchSongs = async (q) => {
      setIsSearching(true);
      try {
        const url = q.trim() ? `/api/search?q=${encodeURIComponent(q)}&limit=30` : '/api/search?q=a&limit=30';
        const res = await api.get(url);
        const data = await res.json();
        setSearchResults(data.songs || []);
      } catch { /* ignore */ } finally { setIsSearching(false); }
    };
    const t = setTimeout(() => fetchSongs(searchQuery), 350);
    return () => clearTimeout(t);
  }, [searchQuery, step]);

  const toggleSong = (song) => {
    setSelectedSongs(prev =>
      prev.find(s => s.id === song.id) ? prev.filter(s => s.id !== song.id) : [...prev, song]
    );
  };

  const handleSubmit = async (withSongs = true) => {
    if (!form.title.trim()) { alert('Vui lòng nhập tên playlist!'); return; }
    setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title.trim());
      fd.append('description', form.description.trim());
      fd.append('category', form.category);
      fd.append('displayOrder', form.displayOrder);
      if (coverFile) fd.append('cover', coverFile);

      const res = await api.post('/api/admin/system-playlists', fd);
      const data = await res.json();
      if (!data?.success) { alert(data?.error || 'Lỗi khi tạo playlist'); return; }

      const newId = data.data.id;
      if (withSongs && selectedSongs.length > 0) {
        await Promise.all(selectedSongs.map(s =>
          api.post(`/api/admin/system-playlists/${newId}/songs`, { songId: s.id })
        ));
      }
      onSuccess();
      onClose();
    } catch (err) {
      alert(`Lỗi: ${err.message}`);
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#141414] border border-[#2a2a2a] rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a] flex-shrink-0">
          <div>
            <h2 className="text-white font-bold text-lg">Tạo Playlist Hệ Thống</h2>
            <div className="flex items-center gap-2 mt-1">
              {[1, 2].map(s => (
                <div key={s} className={`h-1 w-12 rounded-full transition-colors ${step >= s ? 'bg-[#00e6e6]' : 'bg-[#2a2a2a]'}`} />
              ))}
              <span className="text-[#555] text-xs ml-1">Bước {step}/2</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#222] text-[#666] hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {step === 1 ? (
            <div className="p-6 space-y-5">
              {/* Image upload */}
              <div>
                <label className="block text-xs font-semibold text-[#888] uppercase tracking-wider mb-2">Ảnh bìa</label>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()}
                  className="relative w-full h-40 rounded-xl border-2 border-dashed border-[#2a2a2a] hover:border-[#00e6e6]/50 bg-[#1a1a1a] hover:bg-[#1e1e1e] transition-all overflow-hidden group">
                  {previewUrl ? (
                    <>
                      <img src={previewUrl} alt="preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ImageIcon size={24} className="text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-[#555]">
                      <ImageIcon size={32} />
                      <span className="text-sm">Click để tải ảnh lên</span>
                      <span className="text-xs">JPG, PNG, WEBP</span>
                    </div>
                  )}
                </button>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-[#888] uppercase tracking-wider mb-2">Tên playlist <span className="text-red-400">*</span></label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Nhập tên playlist..."
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#00e6e6]/50 transition-colors" />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-[#888] uppercase tracking-wider mb-2">Mô tả</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Mô tả ngắn về playlist..."
                  rows={3}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#00e6e6]/50 transition-colors resize-none" />
              </div>

              {/* Category + Order */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#888] uppercase tracking-wider mb-2">Danh mục</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00e6e6]/50 transition-colors">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#888] uppercase tracking-wider mb-2">Thứ tự hiển thị</label>
                  <input type="number" min={0} value={form.displayOrder} onChange={e => setForm(f => ({ ...f, displayOrder: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00e6e6]/50 transition-colors" />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              <p className="text-[#888] text-sm">Tìm và thêm bài hát ban đầu cho playlist. Bạn có thể bỏ qua và thêm sau.</p>

              {/* Search input */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Tìm bài hát theo tên, nghệ sĩ..."
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#00e6e6]/50 transition-colors" />
                {isSearching && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#00e6e6] animate-spin" />}
              </div>

              {/* Search results */}
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                {searchResults.length === 0 && !isSearching ? (
                  <div className="flex items-center justify-center py-8 text-[#555] text-sm gap-2">
                    <Music2 size={16} /> Không tìm thấy bài hát
                  </div>
                ) : (
                  searchResults.map(song => {
                    const isSelected = selectedSongs.find(s => s.id === song.id);
                    const artist = song.artists?.[0]?.artist?.user?.displayName || song.artistName || 'Unknown';
                    return (
                      <button key={song.id} onClick={() => toggleSong(song)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#222] transition-colors text-left border-b border-[#222] last:border-0 ${isSelected ? 'bg-[#00e6e6]/5' : ''}`}>
                        <CoverImage url={song.coverArtUrl} title={song.title} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{song.title}</p>
                          <p className="text-[#666] text-xs truncate">{artist}</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'bg-[#00e6e6] border-[#00e6e6]' : 'border-[#444]'}`}>
                          {isSelected && <CheckCircle size={12} className="text-black" />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Selected songs */}
              {selectedSongs.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-[#888] uppercase tracking-wider mb-2">Đã chọn ({selectedSongs.length} bài hát)</p>
                  <div className="space-y-1">
                    {selectedSongs.map(song => (
                      <div key={song.id} className="flex items-center gap-3 bg-[#1a1a1a] rounded-xl px-3 py-2 border border-[#2a2a2a]">
                        <CoverImage url={song.coverArtUrl} title={song.title} size="sm" />
                        <p className="flex-1 text-sm text-white truncate">{song.title}</p>
                        <button onClick={() => toggleSong(song)} className="p-1 text-[#555] hover:text-red-400 transition-colors">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#2a2a2a] flex items-center justify-between flex-shrink-0">
          {step === 1 ? (
            <>
              <button onClick={onClose} className="px-4 py-2 rounded-xl border border-[#333] text-[#aaa] hover:bg-[#222] transition-colors text-sm">
                Huỷ
              </button>
              <button onClick={() => { if (!form.title.trim()) { alert('Vui lòng nhập tên playlist!'); return; } setStep(2); }}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#00e6e6] hover:bg-[#00cccc] text-black font-bold text-sm transition-colors">
                Tiếp theo <ChevronRight size={16} />
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setStep(1)} className="px-4 py-2 rounded-xl border border-[#333] text-[#aaa] hover:bg-[#222] transition-colors text-sm">
                ← Quay lại
              </button>
              <div className="flex gap-2">
                <button onClick={() => handleSubmit(false)} disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl border border-[#333] text-[#aaa] hover:bg-[#222] transition-colors text-sm disabled:opacity-50">
                  {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : 'Tạo không có bài hát'}
                </button>
                <button onClick={() => handleSubmit(true)} disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#00e6e6] hover:bg-[#00cccc] text-black font-bold text-sm transition-colors disabled:opacity-50">
                  {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : `Tạo${selectedSongs.length > 0 ? ` với ${selectedSongs.length} bài` : ''}`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AdminSystemPlaylists() {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const fetchPlaylists = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/system-playlists');
      const data = await res.json();
      setPlaylists(data?.success ? data.data : []);
    } catch { showToast('Lỗi kết nối server', 'error'); }
    finally { setLoading(false); }
  }, [showToast]);

  useEffect(() => { fetchPlaylists(); }, [fetchPlaylists]);

  const onDragEnd = useCallback(async (result) => {
    if (!result.destination || result.source.index === result.destination.index) return;

    const items = Array.from(playlists);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);

    // Cập nhật UI ngay lập tức
    setPlaylists(items.map((p, i) => ({ ...p, displayOrder: i + 1 })));

    try {
      const orderedIds = items.map(p => p.id);
      const res = await api.put('/api/admin/system-playlists/reorder', { orderedIds });
      const data = await res.json();
      if (data?.success) {
        showToast('Dạ sắp xếp đã được lưu!');
      } else {
        showToast(data?.error || 'Lỗi lưu thứ tự', 'error');
        fetchPlaylists(); // revert
      }
    } catch {
      showToast('Lỗi kết nối server', 'error');
      fetchPlaylists();
    }
  }, [playlists, showToast, fetchPlaylists]);

  const handleToggleHomepage = async (playlist) => {
    try {
      const fd = new FormData();
      fd.append('title', playlist.title);
      fd.append('description', playlist.description || '');
      fd.append('isOnHomepage', String(!playlist.isOnHomepage));
      fd.append('displayOrder', playlist.displayOrder ?? 0);
      fd.append('category', playlist.category || 'Nổi bật');
      if (playlist.coverArtUrl) fd.append('coverArtUrl', playlist.coverArtUrl);

      const res = await api.put(`/api/admin/system-playlists/${playlist.id}`, fd);
      const data = await res.json();
      if (data?.success) {
        setPlaylists(prev => prev.map(p => p.id === playlist.id ? { ...p, isOnHomepage: !p.isOnHomepage } : p));
        showToast(data.data.isOnHomepage ? 'Đã bật hiển thị trang chủ' : 'Đã tắt hiển thị trang chủ');
      }
    } catch { showToast('Lỗi cập nhật', 'error'); }
  };

  const handleDelete = async () => {
    if (!confirm) return;
    setActionLoading(true);
    try {
      const res = await api.delete(`/api/admin/system-playlists/${confirm.id}`);
      const data = await res.json();
      if (data?.success || res.ok) {
        setPlaylists(prev => prev.filter(p => p.id !== confirm.id));
        showToast('Đã xoá playlist');
        setConfirm(null);
      } else {
        showToast(data?.error || 'Lỗi xoá playlist', 'error');
      }
    } catch { showToast('Lỗi kết nối server', 'error'); }
    finally { setActionLoading(false); }
  };

  return (
    <>
      <div className="space-y-5 pb-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">System Playlists</h2>
            <p className="text-[#666] text-sm mt-0.5">
              {loading ? '...' : `${playlists.length} playlist hệ thống`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchPlaylists}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1a1a1a] border border-[#333] text-[#aaa] hover:text-white hover:border-[#555] transition-all text-sm">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Làm mới
            </button>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00e6e6] hover:bg-[#00cccc] text-black font-bold text-sm transition-colors">
              <Plus size={16} /> Tạo mới
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-[#121212] border border-[#2a2a2a] rounded-2xl overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[28px_40px_56px_1fr_100px_80px_100px_80px_96px] gap-3 px-5 py-3 border-b border-[#2a2a2a] text-[10px] font-bold uppercase tracking-widest text-[#555]">
            <span />
            <span className="text-center">#</span>
            <span>Ảnh</span>
            <span>Tên playlist</span>
            <span>Danh mục</span>
            <span className="text-center">Bài hát</span>
            <span className="text-center">Trang chủ</span>
            <span className="text-center">Thứ tự</span>
            <span className="text-right">Hành động</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <RefreshCw size={28} className="text-[#00e6e6] animate-spin" />
            </div>
          ) : playlists.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-[#555]">
              <ListMusic size={44} className="mb-3 opacity-30" />
              <p className="text-sm">Chưa có playlist hệ thống nào</p>
              <button onClick={() => setShowCreate(true)} className="mt-3 text-xs text-[#00e6e6] hover:underline">
                Tạo playlist đầu tiên
              </button>
            </div>
          ) : (
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="system-playlists">
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="divide-y divide-[#1a1a1a]">
                    {playlists.map((pl, index) => (
                      <Draggable key={String(pl.id)} draggableId={String(pl.id)} index={index}>
                        {(prov, snapshot) => (
                          <div
                            ref={prov.innerRef}
                            {...prov.draggableProps}
                            className={`grid grid-cols-[28px_40px_56px_1fr_100px_80px_100px_80px_96px] gap-3 px-5 py-3.5 items-center transition-all group ${
                              snapshot.isDragging
                                ? 'bg-[#1e2a2a] border border-[#00e6e6]/20 rounded-xl shadow-xl'
                                : 'hover:bg-[#161616]'
                            }`}
                          >
                            {/* Drag handle */}
                            <div {...prov.dragHandleProps} className="text-[#333] hover:text-[#888] cursor-grab active:cursor-grabbing">
                              <GripVertical size={16} />
                            </div>

                            {/* Position badge */}
                            <div className="flex justify-center">
                              <span className="w-6 h-6 rounded-md bg-[#1a1a1a] border border-[#2a2a2a] text-[#555] text-[11px] font-mono flex items-center justify-center">
                                {index + 1}
                              </span>
                            </div>

                            <CoverImage url={pl.coverArtUrl} title={pl.title} />
                            <div className="min-w-0">
                              <p className="text-white text-sm font-semibold truncate group-hover:text-[#00e6e6] transition-colors">{pl.title}</p>
                              {pl.description && <p className="text-[#555] text-xs truncate mt-0.5">{pl.description}</p>}
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#00e6e6]/10 border border-[#00e6e6]/20 text-[#00e6e6] w-fit">
                              {pl.category || '—'}
                            </span>
                            <p className="text-[#888] text-xs text-center">{pl._count?.songs ?? 0} bài</p>
                            <div className="flex justify-center">
                              <button onClick={() => handleToggleHomepage(pl)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  pl.isOnHomepage
                                    ? 'text-[#00e6e6] bg-[#00e6e6]/10 hover:bg-[#00e6e6]/20'
                                    : 'text-[#444] hover:text-[#888] hover:bg-[#222]'
                                }`}
                                title={pl.isOnHomepage ? 'Đang hiển thị trang chủ' : 'Không hiển thị trang chủ'}>
                                <Home size={16} />
                              </button>
                            </div>
                            <p className="text-[#555] text-[10px] text-center italic">Kéo để đổi</p>
                            <div className="flex items-center justify-end gap-1">
                              <Link to={`/admin/system-playlists/${pl.id}`}
                                className="p-1.5 rounded-lg text-[#555] hover:text-white hover:bg-[#222] transition-colors" title="Chỉnh sửa">
                                <Edit3 size={15} />
                              </Link>
                              <button onClick={() => setConfirm({ id: pl.id, title: pl.title })}
                                className="p-1.5 rounded-lg text-[#555] hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Xoá">
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </div>
      </div>

      {showCreate && (
        <CreatePlaylistModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => { fetchPlaylists(); showToast('Tạo playlist thành công!'); }}
        />
      )}

      <ConfirmDialog
        open={!!confirm}
        title="Xoá playlist?"
        message={`Playlist "${confirm?.title}" sẽ bị xoá vĩnh viễn. Không thể hoàn tác!`}
        loading={actionLoading}
        onConfirm={handleDelete}
        onCancel={() => !actionLoading && setConfirm(null)}
      />

      <Toast toast={toast} />
    </>
  );
}
