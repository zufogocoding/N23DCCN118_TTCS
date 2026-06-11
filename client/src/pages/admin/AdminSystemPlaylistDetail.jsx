import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, getMediaUrl } from '../../utils/api';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  ArrowLeft, Search, Plus, X, GripVertical, Image as ImageIcon,
  Music2, RefreshCw, CheckCircle, AlertTriangle, Save, Loader2, Home, Trash2
} from 'lucide-react';

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

// ── Cover Image ───────────────────────────────────────────────────────────────
function CoverImage({ url, title, size = 'sm' }) {
  const [err, setErr] = useState(false);
  const cls = size === 'sm' ? 'w-10 h-10 rounded-lg' : 'w-12 h-12 rounded-xl';
  if (!url || err) {
    return (
      <div className={`${cls} bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border border-[#2a2a2a] flex items-center justify-center flex-shrink-0`}>
        <Music2 size={14} className="text-[#444]" />
      </div>
    );
  }
  return (
    <img src={getMediaUrl(url)} alt={title} onError={() => setErr(true)}
      className={`${cls} object-cover flex-shrink-0 ring-1 ring-[#2a2a2a]`} />
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AdminSystemPlaylistDetail() {
  const { id } = useParams();
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // Form state
  const [form, setForm] = useState({ title: '', description: '', coverArtUrl: '', isOnHomepage: false, displayOrder: 0, category: 'Nổi bật' });
  const [coverFile, setCoverFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  // Songs state
  const [songs, setSongs] = useState([]);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addingId, setAddingId] = useState(null);
  const [removingId, setRemovingId] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Fetch playlist data
  const fetchPlaylist = useCallback(async () => {
    try {
      const res = await api.get(`/api/admin/system-playlists/${id}`);
      const data = await res.json();
      if (data?.success) {
        const p = data.data;
        setPlaylist(p);
        setForm({
          title: p.title || '',
          description: p.description || '',
          coverArtUrl: p.coverArtUrl || '',
          isOnHomepage: p.isOnHomepage || false,
          displayOrder: p.displayOrder || 0,
          category: p.category || 'Nổi bật'
        });
        setPreviewUrl(p.coverArtUrl ? getMediaUrl(p.coverArtUrl) : null);
        setSongs([...(p.songs || [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));
      }
    } catch (err) {
      showToast('Lỗi tải dữ liệu', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => { fetchPlaylist(); }, [fetchPlaylist]);

  // Auto-search with debounce
  useEffect(() => {
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
  }, [searchQuery]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCoverFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setForm(f => ({ ...f, coverArtUrl: '' }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('description', form.description);
      fd.append('isOnHomepage', String(form.isOnHomepage));
      fd.append('displayOrder', form.displayOrder);
      fd.append('category', form.category);
      if (coverFile) {
        fd.append('cover', coverFile);
      } else if (form.coverArtUrl) {
        fd.append('coverArtUrl', form.coverArtUrl);
      }

      const res = await api.put(`/api/admin/system-playlists/${id}`, fd);
      const data = await res.json();
      if (data?.success) {
        showToast('Cập nhật thành công!');
        setCoverFile(null);
        fetchPlaylist();
      } else {
        showToast(data?.error || 'Lỗi cập nhật', 'error');
      }
    } catch {
      showToast('Lỗi kết nối server', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddSong = async (song) => {
    const alreadyIn = songs.find(s => s.songId === song.id || s.song?.id === song.id);
    if (alreadyIn) { showToast('Bài hát đã có trong playlist', 'error'); return; }
    setAddingId(song.id);
    try {
      const res = await api.post(`/api/admin/system-playlists/${id}/songs`, { songId: song.id });
      const data = await res.json();
      if (data?.success) {
        showToast('Đã thêm bài hát');
        fetchPlaylist();
      } else {
        showToast(data?.error || 'Lỗi thêm bài hát', 'error');
      }
    } catch { showToast('Lỗi kết nối server', 'error'); }
    finally { setAddingId(null); }
  };

  const handleRemoveSong = async (songId) => {
    setRemovingId(songId);
    try {
      const res = await api.delete(`/api/admin/system-playlists/${id}/songs/${songId}`);
      const data = await res.json();
      if (data?.success) {
        setSongs(prev => prev.filter(ps => (ps.songId ?? ps.song?.id) !== songId));
        showToast('Đã xoá bài hát');
      }
    } catch { showToast('Lỗi xoá bài hát', 'error'); }
    finally { setRemovingId(null); }
  };

  const onDragEnd = async (result) => {
    if (!result.destination || result.source.index === result.destination.index) return;
    const items = Array.from(songs);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    setSongs(items);
    try {
      const orderedSongIds = items.map(s => s.songId ?? s.song?.id);
      await api.put(`/api/admin/system-playlists/${id}/songs/reorder`, { orderedSongIds });
      showToast('Đã cập nhật thứ tự');
    } catch { showToast('Lỗi cập nhật thứ tự', 'error'); fetchPlaylist(); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <RefreshCw size={28} className="text-[#00e6e6] animate-spin" />
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-[#555]">
        <Music2 size={44} className="mb-3 opacity-30" />
        <p className="text-sm">Không tìm thấy playlist</p>
        <Link to="/admin/system-playlists" className="mt-3 text-xs text-[#00e6e6] hover:underline">← Quay lại</Link>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-5 pb-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/admin/system-playlists"
              className="p-2 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-[#888] hover:text-white hover:border-[#444] transition-all">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h2 className="text-2xl font-bold text-white">{playlist.title}</h2>
              <p className="text-[#666] text-sm mt-0.5">Chi tiết System Playlist · ID #{id}</p>
            </div>
          </div>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00e6e6] hover:bg-[#00cccc] text-black font-bold text-sm transition-colors disabled:opacity-60">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Left: Info form */}
          <div className="bg-[#121212] border border-[#2a2a2a] rounded-2xl p-5 space-y-5">
            <h3 className="text-white font-bold text-sm uppercase tracking-wider">Thông tin chung</h3>

            {/* Cover Upload */}
            <div>
              <label className="block text-xs font-semibold text-[#888] uppercase tracking-wider mb-2">Ảnh bìa</label>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()}
                className="relative w-full h-44 rounded-xl border-2 border-dashed border-[#2a2a2a] hover:border-[#00e6e6]/50 bg-[#1a1a1a] hover:bg-[#1e1e1e] transition-all overflow-hidden group">
                {previewUrl ? (
                  <>
                    <img src={previewUrl} alt="cover" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                      <ImageIcon size={22} className="text-white" />
                      <span className="text-white text-xs font-medium">Đổi ảnh</span>
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
              <label className="block text-xs font-semibold text-[#888] uppercase tracking-wider mb-2">Tên playlist</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00e6e6]/50 transition-colors" />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-[#888] uppercase tracking-wider mb-2">Mô tả</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3} className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00e6e6]/50 transition-colors resize-none" />
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
                <label className="block text-xs font-semibold text-[#888] uppercase tracking-wider mb-2">Thứ tự</label>
                <input type="number" min={0} value={form.displayOrder} onChange={e => setForm(f => ({ ...f, displayOrder: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00e6e6]/50 transition-colors" />
              </div>
            </div>

            {/* Homepage toggle */}
            <div className="flex items-center justify-between p-4 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a]">
              <div className="flex items-center gap-3">
                <Home size={18} className={form.isOnHomepage ? 'text-[#00e6e6]' : 'text-[#555]'} />
                <div>
                  <p className="text-white text-sm font-medium">Hiển thị trang chủ</p>
                  <p className="text-[#555] text-xs">Hiện playlist này cho người dùng trên trang chủ</p>
                </div>
              </div>
              <button onClick={() => setForm(f => ({ ...f, isOnHomepage: !f.isOnHomepage }))}
                className={`relative w-11 h-6 rounded-full transition-colors ${form.isOnHomepage ? 'bg-[#00e6e6]' : 'bg-[#333]'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.isOnHomepage ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>

          {/* Right: Song management */}
          <div className="bg-[#121212] border border-[#2a2a2a] rounded-2xl p-5 space-y-4 flex flex-col">
            <h3 className="text-white font-bold text-sm uppercase tracking-wider flex-shrink-0">
              Quản lý bài hát <span className="text-[#555] font-normal ml-1">({songs.length})</span>
            </h3>

            {/* Search */}
            <div className="relative flex-shrink-0">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Tìm bài hát để thêm vào..."
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#00e6e6]/50 transition-colors" />
              {isSearching && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#00e6e6] animate-spin" />}
            </div>

            {/* Search results */}
            {searchResults.length > 0 && (
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden max-h-40 overflow-y-auto flex-shrink-0">
                {searchResults.map(song => {
                  const artist = song.artists?.[0]?.artist?.user?.displayName || song.artistName || 'Unknown';
                  const isIn = songs.find(s => (s.songId ?? s.song?.id) === song.id);
                  return (
                    <div key={song.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#222] border-b border-[#222] last:border-0 transition-colors">
                      <CoverImage url={song.coverArtUrl} title={song.title} />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{song.title}</p>
                        <p className="text-[#666] text-xs truncate">{artist}</p>
                      </div>
                      {isIn ? (
                        <span className="text-[10px] text-[#00e6e6] border border-[#00e6e6]/30 px-2 py-0.5 rounded-full flex-shrink-0">Đã có</span>
                      ) : (
                        <button onClick={() => handleAddSong(song)} disabled={addingId === song.id}
                          className="p-1.5 rounded-lg bg-[#00e6e6]/10 hover:bg-[#00e6e6]/20 text-[#00e6e6] transition-colors disabled:opacity-50 flex-shrink-0">
                          {addingId === song.id ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tracklist */}
            <div className="flex-1 overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-[#555] uppercase tracking-wider font-semibold">Danh sách ({songs.length})</p>
                {songs.length > 1 && <p className="text-xs text-[#444]">Kéo thả để sắp xếp</p>}
              </div>

              {songs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-[#555]">
                  <Music2 size={36} className="mb-3 opacity-30" />
                  <p className="text-sm">Playlist trống. Tìm và thêm bài hát bên trên.</p>
                </div>
              ) : (
                <DragDropContext onDragEnd={onDragEnd}>
                  <Droppable droppableId="songs">
                    {(provided) => (
                      <div ref={provided.innerRef} {...provided.droppableProps}
                        className="space-y-1 overflow-y-auto max-h-[360px] pr-1">
                        {songs.map((ps, index) => {
                          const song = ps.song || ps;
                          const songId = ps.songId ?? song.id;
                          const artist = song.artists?.[0]?.artist?.user?.displayName || song.artistName || 'Unknown';
                          return (
                            <Draggable key={String(songId)} draggableId={String(songId)} index={index}>
                              {(prov, snapshot) => (
                                <div ref={prov.innerRef} {...prov.draggableProps}
                                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${snapshot.isDragging ? 'bg-[#1e2a2a] border-[#00e6e6]/30 shadow-xl' : 'bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#333]'}`}>
                                  <div {...prov.dragHandleProps} className="text-[#444] hover:text-[#888] cursor-grab active:cursor-grabbing flex-shrink-0">
                                    <GripVertical size={16} />
                                  </div>
                                  <span className="text-[#444] text-xs w-5 text-center flex-shrink-0">{index + 1}</span>
                                  <CoverImage url={song.coverArtUrl} title={song.title} />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-white text-sm font-medium truncate">{song.title}</p>
                                    <p className="text-[#666] text-xs truncate">{artist}</p>
                                  </div>
                                  <button onClick={() => handleRemoveSong(songId)} disabled={removingId === songId}
                                    className="p-1.5 rounded-lg text-[#555] hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50 flex-shrink-0">
                                    {removingId === songId ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                  </button>
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              )}
            </div>
          </div>
        </div>
      </div>

      <Toast toast={toast} />
    </>
  );
}
