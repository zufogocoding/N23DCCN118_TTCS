import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Plus, GripVertical, Pencil, Trash2, Loader2, Image, Clock, Rocket, X, Music, CalendarClock } from 'lucide-react';
import TrackEditModal from '../../components/TrackEditModal';

const ALBUM_TYPES = ['Single', 'EP', 'Album', 'Mixtape'];

function getCover(url) {
  if (!url) return null;
  return url.startsWith('http') ? url : `http://localhost:9000${url}`;
}

function formatDuration(ms) {
  if (!ms) return '0:00';
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function ReleaseManager() {
  const { albumId } = useParams();
  const navigate = useNavigate();
  const isNew = !albumId;
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  const [album, setAlbum] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [genres, setGenres] = useState([]);
  const [myUploads, setMyUploads] = useState([]);
  const [showAddTracks, setShowAddTracks] = useState(false);
  const [editingSong, setEditingSong] = useState(null);
  const [actionBusy, setActionBusy] = useState('');

  // Form state
  const [title, setTitle] = useState('');
  const [type, setType] = useState('');
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [scheduledAt, setScheduledAt] = useState('');
  const coverRef = useRef(null);

  // Drag state
  const dragItem = useRef(null);
  const dragOver = useRef(null);

  const token = localStorage.getItem('token');
  const authH = token ? { Authorization: `Bearer ${token}` } : {};

  const location = useLocation();

  // Open add‑tracks modal automatically when URL contains ?add=true (after creating a new album)
  useEffect(() => {
    if (album && location.search.includes('add=true')) {
      setShowAddTracks(true);
    }
  }, [album, location.search]);

  // Load genres
  useEffect(() => {
    fetch('http://localhost:9000/api/genres').then(r => r.json()).then(setGenres).catch(() => {});
  }, []);

  // Load my uploads
  useEffect(() => {
    if (!currentUser.id) return;
    fetch('http://localhost:9000/api/songs/my-uploaded', { headers: authH })
      .then(r => r.ok ? r.json() : []).then(setMyUploads).catch(() => {});
  }, [currentUser.id]);

  // Load album data
  const loadAlbum = useCallback(async () => {
    if (isNew) return;
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:9000/api/albums/${albumId}/manage`, { headers: authH });
      if (res.ok) {
        const data = await res.json();
        setAlbum(data.album);
        setTracks(data.tracks || []);
        setTitle(data.album.title || '');
        setType(data.album.type || '');
        setCoverPreview(getCover(data.album.coverArtUrl));
        setScheduledAt(data.album.scheduledAt ? new Date(data.album.scheduledAt).toISOString().slice(0, 16) : '');
      } else {
        navigate('/');
      }
    } catch { navigate('/'); }
    finally { setLoading(false); }
  }, [albumId, isNew]);

  useEffect(() => { loadAlbum(); }, [loadAlbum]);

  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (file) { setCoverFile(file); setCoverPreview(URL.createObjectURL(file)); }
  };

  // Save (create or update) album metadata
  const handleSave = async () => {
    if (!title.trim()) { alert('Vui lòng nhập tên album'); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', title.trim());
      fd.append('type', type);
      if (coverFile) fd.append('coverImage', coverFile);
      if (scheduledAt) fd.append('scheduledAt', scheduledAt);

      const url = isNew ? 'http://localhost:9000/api/albums' : `http://localhost:9000/api/albums/${albumId}`;
      const method = isNew ? 'POST' : 'PUT';
      const res = await fetch(url, { method, headers: authH, body: fd });

      if (res.ok) {
        const data = await res.json();
        if (isNew && data.album?.id) {
          navigate(`/release/${data.album.id}?add=true`, { replace: true });
        } else {
          setAlbum(data.album);
          setCoverFile(null);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Lỗi lưu album');
      }
    } catch { alert('Lỗi kết nối'); }
    finally { setSaving(false); }
  };

  // Add track
  const handleAddTrack = async (songId) => {
    try {
      const res = await fetch(`http://localhost:9000/api/albums/${album.id}/songs`, {
        method: 'POST', headers: { ...authH, 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId }),
      });
      if (res.ok) { loadAlbum(); setShowAddTracks(false); }
    } catch {}
  };

  // Remove track
  const handleRemoveTrack = async (songId) => {
    if (!confirm('Gỡ bài này khỏi album?')) return;
    try {
      await fetch(`http://localhost:9000/api/albums/${album.id}/songs/${songId}`, {
        method: 'DELETE', headers: authH,
      });
      loadAlbum();
    } catch {}
  };

  // Drag & drop reorder
  const handleDragStart = (index) => { dragItem.current = index; };
  const handleDragEnter = (index) => { dragOver.current = index; };
  const handleDragEnd = async () => {
    if (dragItem.current === null || dragOver.current === null || dragItem.current === dragOver.current) return;
    const items = [...tracks];
    const [dragged] = items.splice(dragItem.current, 1);
    items.splice(dragOver.current, 0, dragged);
    setTracks(items);
    dragItem.current = null;
    dragOver.current = null;

    // Persist order
    try {
      await fetch(`http://localhost:9000/api/albums/${album.id}/reorder`, {
        method: 'PUT', headers: { ...authH, 'Content-Type': 'application/json' },
        body: JSON.stringify({ songIds: items.map(t => t.id) }),
      });
    } catch {}
  };

  // Release now
  const handleRelease = async () => {
    if (!confirm('Phát hành album ngay bây giờ?')) return;
    setActionBusy('release');
    try {
      const res = await fetch(`http://localhost:9000/api/albums/${album.id}/release`, {
        method: 'POST', headers: authH,
      });
      if (res.ok) { loadAlbum(); alert('Album đã được phát hành!'); }
      else { const e = await res.json().catch(() => ({})); alert(e.error || 'Lỗi'); }
    } catch {} finally { setActionBusy(''); }
  };

  // Schedule
  const handleSchedule = async () => {
    if (!scheduledAt) { alert('Chọn thời gian phát hành'); return; }
    setActionBusy('schedule');
    try {
      const res = await fetch(`http://localhost:9000/api/albums/${album.id}/schedule`, {
        method: 'POST', headers: { ...authH, 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledAt }),
      });
      if (res.ok) { loadAlbum(); }
      else { const e = await res.json().catch(() => ({})); alert(e.error || 'Lỗi'); }
    } catch {} finally { setActionBusy(''); }
  };

  // Unschedule
  const handleUnschedule = async () => {
    setActionBusy('unschedule');
    try {
      const res = await fetch(`http://localhost:9000/api/albums/${album.id}/unschedule`, {
        method: 'POST', headers: authH,
      });
      if (res.ok) { loadAlbum(); }
    } catch {} finally { setActionBusy(''); }
  };

  // Delete album
  const handleDelete = async () => {
    if (!confirm('Xóa album này? Các bài hát vẫn còn trên hệ thống.')) return;
    try {
      const res = await fetch(`http://localhost:9000/api/albums/${album.id}`, {
        method: 'DELETE', headers: authH,
      });
      if (res.ok) navigate(`/artist/${currentUser.id}`);
    } catch {}
  };

  const trackIds = new Set(tracks.map(t => t.id));
  const addableSongs = myUploads.filter(s =>
    !trackIds.has(s.id) && !(s.albums || []).some(a => a.album && a.album.id !== album?.id)
  );

  const isReleased = album?.status === 'released';
  const isScheduled = album?.status === 'scheduled';
  const isDraft = !album || album?.status === 'draft';

  if (loading) {
    return (
      <div className="flex-1 bg-[#0a0a0a] flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-[#00e6e6]" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white px-6 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-[#a0a0a0] hover:text-white mb-6 text-sm">
          <ArrowLeft size={18} /> Quay lại
        </button>

        <h1 className="text-3xl font-bold mb-1">
          <span className="text-[#00e6e6]">{isNew ? 'Tạo' : 'Quản lý'}</span> Release
        </h1>

        {album && (
          <div className="flex items-center gap-2 mb-6">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              isReleased ? 'bg-emerald-500/20 text-emerald-400' :
              isScheduled ? 'bg-amber-500/20 text-amber-400' :
              'bg-[#333] text-[#a0a0a0]'
            }`}>
              {isReleased ? '✓ Đã phát hành' : isScheduled ? '⏳ Đã lên lịch' : '📝 Bản nháp'}
            </span>
          </div>
        )}

        {/* Album Info Card */}
        <div className="bg-[#121212] border border-[#222] rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">Thông tin album</h2>
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6">
            {/* Cover */}
            <div>
              <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
              <div onClick={() => !isReleased && coverRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl aspect-square flex items-center justify-center overflow-hidden group ${
                  isReleased ? 'border-[#222] cursor-default' : 'border-[#333] hover:border-[#00e6e6]/50 cursor-pointer'
                }`}>
                {coverPreview ? (
                  <>
                    <img src={coverPreview} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    {!isReleased && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-sm font-medium">Đổi ảnh</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center text-[#666]">
                    <Image size={32} /><span className="text-xs mt-2">Ảnh bìa album</span>
                  </div>
                )}
              </div>
            </div>

            {/* Fields */}
            <div className="space-y-4">
              <div>
                <label className="block mb-1.5 text-sm font-medium text-[#a0a0a0]">Tên album *</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} disabled={isReleased}
                  className="w-full bg-black border border-[#333] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#00e6e6]/50 disabled:opacity-50" />
              </div>
              <div>
                <label className="block mb-1.5 text-sm font-medium text-[#a0a0a0]">Loại</label>
                <select value={type} onChange={e => setType(e.target.value)} disabled={isReleased}
                  className="w-full bg-black border border-[#333] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#00e6e6]/50 disabled:opacity-50">
                  <option value="">— Chọn loại —</option>
                  {ALBUM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              {!isReleased && (
                <div>
                  <label className="block mb-1.5 text-sm font-medium text-[#a0a0a0]">
                    <CalendarClock size={14} className="inline mr-1" /> Lên lịch phát hành (tùy chọn)
                  </label>
                  <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
                    className="w-full bg-black border border-[#333] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#00e6e6]/50" />
                </div>
              )}
              {!isReleased && (
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-black bg-[#00e6e6] disabled:opacity-50 text-sm">
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  {isNew ? 'Tạo album' : 'Lưu thay đổi'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Track List — only after album created */}
        {album && (
          <div className="bg-[#121212] border border-[#222] rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Danh sách bài hát ({tracks.length})</h2>
              {!isReleased && (
                <button onClick={() => setShowAddTracks(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#00e6e6]/10 text-[#00e6e6] text-sm font-semibold hover:bg-[#00e6e6]/20">
                  <Plus size={16} /> Thêm bài
                </button>
              )}
            </div>

            {tracks.length === 0 ? (
              <div className="text-center py-12 text-[#666]">
                <Music size={40} className="mx-auto mb-3 opacity-50" />
                <p>Chưa có bài hát nào. Thêm bài hát vào album.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {tracks.map((song, index) => (
                  <div key={song.id}
                    draggable={!isReleased}
                    onDragStart={() => handleDragStart(index)}
                    onDragEnter={() => handleDragEnter(index)}
                    onDragEnd={handleDragEnd}
                    onDragOver={e => e.preventDefault()}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#1a1a1a] group transition-colors">
                    {/* Drag handle */}
                    {!isReleased && (
                      <GripVertical size={16} className="text-[#444] cursor-grab shrink-0 opacity-0 group-hover:opacity-100" />
                    )}
                    <span className="text-[#666] text-sm w-6 text-right shrink-0">{index + 1}</span>
                    <img src={getCover(song.coverArtUrl) || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>'} alt=""
                      className="w-10 h-10 rounded object-cover bg-[#222] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{song.title}</p>
                      <p className="text-xs text-[#666] truncate">{song.artistName || 'Unknown Artist'}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      song.status === 'approved' ? 'bg-emerald-500/15 text-emerald-400' :
                      song.status === 'pending' ? 'bg-amber-500/15 text-amber-400' :
                      'bg-red-500/15 text-red-400'
                    }`}>{song.status}</span>
                    <span className="text-xs text-[#666] w-12 text-right">{formatDuration(song.durationMs)}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 shrink-0">
                      <button onClick={() => setEditingSong(song)} className="p-1.5 rounded hover:bg-white/10 text-[#a0a0a0]" title="Sửa">
                        <Pencil size={14} />
                      </button>
                      {!isReleased && (
                        <button onClick={() => handleRemoveTrack(song.id)} className="p-1.5 rounded hover:bg-white/10 text-red-400" title="Gỡ">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {album && !isReleased && tracks.length === 0 && (
            <div className="mb-4 text-center">
              <button onClick={() => setShowAddTracks(true)}
                className="px-4 py-2 rounded-full bg-[#00e6e6]/10 text-[#00e6e6] hover:bg-[#00e6e6]/20">
                Thêm bài hát vào album
              </button>
            </div>
          )}

        {/* Release Actions */}
        {album && !isReleased && (
          <div className="bg-[#121212] border border-[#222] rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-bold mb-4">Phát hành</h2>
            <div className="flex flex-wrap gap-3">
              <button onClick={handleRelease} disabled={!!actionBusy || tracks.length === 0}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-[#00e6e6] to-[#00b8d4] text-black disabled:opacity-40 text-sm hover:shadow-lg hover:shadow-[#00e6e6]/20">
                {actionBusy === 'release' ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />}
                Phát hành ngay
              </button>
              {isDraft && scheduledAt && (
                <button onClick={handleSchedule} disabled={!!actionBusy || tracks.length === 0}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold border border-amber-500/50 text-amber-400 disabled:opacity-40 text-sm hover:bg-amber-500/10">
                  {actionBusy === 'schedule' ? <Loader2 size={16} className="animate-spin" /> : <Clock size={16} />}
                  Lên lịch phát hành
                </button>
              )}
              {isScheduled && (
                <button onClick={handleUnschedule} disabled={!!actionBusy}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold border border-[#444] text-[#a0a0a0] text-sm hover:bg-white/5">
                  {actionBusy === 'unschedule' ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
                  Hủy lịch (về bản nháp)
                </button>
              )}
              <button onClick={handleDelete} className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold border border-red-500/30 text-red-400 text-sm hover:bg-red-500/10">
                <Trash2 size={16} /> Xóa album
              </button>
            </div>
            {tracks.length === 0 && (
              <p className="text-xs text-[#666] mt-3">* Thêm ít nhất 1 bài hát để phát hành</p>
            )}
          </div>
        )}
      </div>

      {/* Add tracks modal */}
      {showAddTracks && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#181818] border border-[#333] rounded-2xl w-full max-w-md max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#333] shrink-0">
              <h2 className="text-lg font-bold">Thêm bài hát</h2>
              <button onClick={() => setShowAddTracks(false)} className="text-[#666] hover:text-white"><X size={22} /></button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {addableSongs.length === 0 ? (
                <p className="text-[#666] text-sm text-center py-8">Không còn bài hát để thêm.</p>
              ) : (
                <div className="space-y-2">
                  {addableSongs.map(s => (
                    <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#222]">
                      <img src={getCover(s.coverArtUrl) || ''} alt="" className="w-10 h-10 rounded object-cover bg-[#222]" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{s.title}</p>
                        <p className="text-xs text-[#666]">{s.artistName || 'Unknown'} • {s.status}</p>
                      </div>
                      <button onClick={() => handleAddTrack(s.id)}
                        className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-full bg-[#00e6e6] text-black hover:bg-[#00d0d0]">
                        Thêm
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Track edit modal */}
      {editingSong && (
        <TrackEditModal song={editingSong} genres={genres} onClose={() => setEditingSong(null)} onSaved={() => loadAlbum()} />
      )}
    </div>
  );
}
