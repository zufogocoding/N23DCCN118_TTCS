/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Plus, GripVertical, Pencil, Trash2, Loader2, Image, Clock, Rocket, X, Music, CalendarClock, Upload, CheckCircle } from 'lucide-react';
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

  // Upload Modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadAudioFile, setUploadAudioFile] = useState(null);
  const [uploadCoverFile, setUploadCoverFile] = useState(null);
  const [uploadCoverPreview, setUploadCoverPreview] = useState(null);
  const [songTitle, setSongTitle] = useState('');
  const [songArtistName, setSongArtistName] = useState('');
  const [songGenreIds, setSongGenreIds] = useState([]);
  const [songDescription, setSongDescription] = useState('');
  const [songDurationMs, setSongDurationMs] = useState(0);
  const [songIsOriginal, setSongIsOriginal] = useState(true);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [audioUploadProgress, setAudioUploadProgress] = useState(0);
  const [genreDropdownOpen, setGenreDropdownOpen] = useState(false);
  const genreRef = useRef(null);
  const uploadAudioInputRef = useRef(null);
  const uploadCoverInputRef = useRef(null);

  // Search state for Add Tracks modal
  const [searchQuery, setSearchQuery] = useState('');

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
    fetch('http://localhost:9000/api/genres').then(r => r.json()).then(setGenres).catch(() => { });
  }, []);

  // Load my uploads
  useEffect(() => {
    if (!currentUser.id) return;
    fetch('http://localhost:9000/api/songs/my-uploaded', { headers: authH })
      .then(r => r.ok ? r.json() : []).then(setMyUploads).catch(() => { });
  }, [currentUser.id]);

  // Đóng dropdown genre khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (genreRef.current && !genreRef.current.contains(e.target)) {
        setGenreDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // Add track (existing)
  const handleAddTrack = async (songId) => {
    try {
      const res = await fetch(`http://localhost:9000/api/albums/${album.id}/songs`, {
        method: 'POST', headers: { ...authH, 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId }),
      });
      if (res.ok) { loadAlbum(); setShowAddTracks(false); }
    } catch (err) {
      console.error('Error adding track:', err);
    }
  };

  // --- Upload Modal helpers ---

  const resetUploadModal = () => {
    setUploadAudioFile(null);
    setUploadCoverFile(null);
    setUploadCoverPreview(null);
    setSongTitle('');
    setSongArtistName(currentUser.displayName || currentUser.username || '');
    setSongGenreIds([]);
    setSongDescription('');
    setSongDurationMs(0);
    setSongIsOriginal(true);
    setAudioUploadProgress(0);
    if (uploadAudioInputRef.current) uploadAudioInputRef.current.value = '';
    if (uploadCoverInputRef.current) uploadCoverInputRef.current.value = '';
  };

  const openUploadModal = () => {
    setSongArtistName(currentUser.displayName || currentUser.username || '');
    setSongIsOriginal(true);
    setShowUploadModal(true);
  };

  const closeUploadModal = () => {
    setShowUploadModal(false);
    resetUploadModal();
  };

  const handleUploadAudioChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadAudioFile(file);
    // Tự động detect duration
    const audio = new Audio();
    audio.src = URL.createObjectURL(file);
    audio.addEventListener('loadedmetadata', () => {
      setSongDurationMs(Math.round(audio.duration * 1000));
    });
    // Tên mặc định từ tên file
    const defaultTitle = file.name.replace(/\.[^/.]+$/, '');
    setSongTitle(defaultTitle);
  };

  const handleUploadCoverChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadCoverFile(file);
      setUploadCoverPreview(URL.createObjectURL(file));
    }
  };

  const toggleSongGenre = (id) => {
    setSongGenreIds(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };

  const removeSongGenre = (id) => {
    setSongGenreIds(prev => prev.filter(g => g !== id));
  };

  // Upload from modal
  const handleModalUpload = async () => {
    if (!uploadAudioFile) { alert('Vui lòng chọn file nhạc!'); return; }
    if (!songTitle.trim()) { alert('Vui lòng nhập tên bài hát!'); return; }

    setIsUploadingAudio(true);
    setAudioUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('audioFile', uploadAudioFile);
      if (uploadCoverFile) formData.append('coverImage', uploadCoverFile);
      formData.append('title', songTitle.trim());
      formData.append('artistName', songArtistName || currentUser.displayName || currentUser.username || 'Unknown Artist');
      formData.append('durationMs', songDurationMs.toString());
      if (songGenreIds.length > 0) {
        formData.append('genreIds', JSON.stringify(songGenreIds));
      }
      formData.append('isOriginal', songIsOriginal);
      if (songDescription.trim()) {
        formData.append('description', songDescription.trim());
      }

      // XMLHttpRequest để lấy progress
      const xhr = new XMLHttpRequest();
      const uploadedSong = await new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (ev) => {
          if (ev.lengthComputable) setAudioUploadProgress(Math.round((ev.loaded / ev.total) * 100));
        });
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText));
          else reject(new Error('Upload thất bại'));
        });
        xhr.addEventListener('error', () => reject(new Error('Lỗi kết nối')));
        xhr.open('POST', 'http://localhost:9000/api/songs/upload');
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.send(formData);
      });

      // Nối bài hát vừa tạo vào album
      await fetch(`http://localhost:9000/api/albums/${album.id}/songs`, {
        method: 'POST',
        headers: { ...authH, 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId: uploadedSong.song?.id || uploadedSong.id }),
      });

      // Làm mới dữ liệu album
      loadAlbum();
      closeUploadModal();
      alert('Upload bài hát thành công!');
    } catch (err) {
      alert(err.message || 'Lỗi upload');
    } finally {
      setIsUploadingAudio(false);
    }
  };

  // Remove track
  const handleRemoveTrack = async (songId) => {
    if (!confirm('Gỡ bài này khỏi album?')) return;
    try {
      await fetch(`http://localhost:9000/api/albums/${album.id}/songs/${songId}`, {
        method: 'DELETE', headers: authH,
      });
      loadAlbum();
    } catch (err) {
      console.error('Error removing track:', err);
    }
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
    } catch (err) {
      console.error('Error persisting order:', err);
    }
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
    } catch (err) {
      console.error('Error releasing album:', err);
    } finally { setActionBusy(''); }
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
    } catch (err) {
      console.error('Error scheduling album:', err);
    } finally { setActionBusy(''); }
  };

  // Unschedule
  const handleUnschedule = async () => {
    setActionBusy('unschedule');
    try {
      const res = await fetch(`http://localhost:9000/api/albums/${album.id}/unschedule`, {
        method: 'POST', headers: authH,
      });
      if (res.ok) { loadAlbum(); }
    } catch (err) {
      console.error('Error unscheduling album:', err);
    } finally { setActionBusy(''); }
  };

  // Delete album
  const handleDelete = async () => {
    if (!confirm('Xóa album này? Các bài hát vẫn còn trên hệ thống.')) return;
    try {
      const res = await fetch(`http://localhost:9000/api/albums/${album.id}`, {
        method: 'DELETE', headers: authH,
      });
      if (res.ok) navigate(`/artist/${currentUser.id}`);
    } catch (err) {
      console.error('Error deleting album:', err);
    }
  };

  const trackIds = new Set(tracks.map(t => t.id));
  const addableSongs = myUploads.filter(s =>
    !trackIds.has(s.id) && 
    !(s.albums || []).some(a => a.album && a.album.id !== album?.id) &&
    s.status !== 'rejected'
  );

  const filteredAddableSongs = addableSongs.filter(s =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
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
        <button onClick={() => navigate(currentUser.id ? `/artist/${currentUser.id}` : '/')} className="flex items-center gap-2 text-[#a0a0a0] hover:text-white mb-6 text-sm">
          <ArrowLeft size={18} /> Quay lại
        </button>

        <h1 className="text-3xl font-bold mb-1">
          <span className="text-[#00e6e6]">{isNew ? 'Tạo' : 'Quản lý'}</span> Release
        </h1>

        {album && (
          <div className="flex items-center gap-2 mb-6">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isReleased ? 'bg-emerald-500/20 text-emerald-400' :
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
                className={`relative border-2 border-dashed rounded-xl aspect-square flex items-center justify-center overflow-hidden group ${isReleased ? 'border-[#222] cursor-default' : 'border-[#333] hover:border-[#00e6e6]/50 cursor-pointer'
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
                <div className="flex items-center gap-2">
                  <button onClick={openUploadModal} disabled={isUploadingAudio}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/20 disabled:opacity-50">
                    <Upload size={16} /> Upload nhạc
                  </button>
                  <button onClick={() => setShowAddTracks(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#00e6e6]/10 text-[#00e6e6] text-sm font-semibold hover:bg-[#00e6e6]/20">
                    <Plus size={16} /> Chọn bài
                  </button>
                </div>
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
                    <span className={`text-xs px-2 py-0.5 rounded-full ${song.status === 'approved' ? 'bg-emerald-500/15 text-emerald-400' :
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
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Tìm kiếm bài hát..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#222] border border-[#333] rounded-lg px-4 py-2.5 text-sm text-white outline-none focus:border-[#00e6e6]/50"
                />
              </div>
              {filteredAddableSongs.length === 0 ? (
                <p className="text-[#666] text-sm text-center py-8">
                  {searchQuery ? 'Không tìm thấy bài hát nào.' : 'Không còn bài hát để thêm.'}
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredAddableSongs.map(s => (
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

      {/* Upload Song Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#181818] border border-[#333] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#333] sticky top-0 bg-[#181818] z-10">
              <h2 className="text-lg font-bold">Upload bài hát vào album</h2>
              <button onClick={closeUploadModal} disabled={isUploadingAudio} className="text-[#666] hover:text-white">
                <X size={22} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Audio file */}
              <div>
                <input
                  ref={uploadAudioInputRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={handleUploadAudioChange}
                />
                <label className="block mb-1.5 text-sm font-semibold text-[#a0a0a0]">File nhạc <span className="text-red-400">*</span></label>
                <div
                  onClick={() => uploadAudioInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all ${uploadAudioFile
                    ? 'border-emerald-500/50 bg-emerald-500/5'
                    : 'border-[#333] hover:border-[#00e6e6]/50 hover:bg-[#00e6e6]/5'
                    }`}
                >
                  {uploadAudioFile ? (
                    <>
                      <CheckCircle size={28} className="text-emerald-400 mb-2" />
                      <p className="text-sm font-medium text-emerald-400">File đã chọn</p>
                      <p className="text-xs text-[#a0a0a0] mt-1 truncate max-w-full">{uploadAudioFile.name}</p>
                      {songDurationMs > 0 && (
                        <p className="text-[#666] text-xs mt-1">
                          Thời lượng: {Math.floor(songDurationMs / 60000)}:{String(Math.floor((songDurationMs % 60000) / 1000)).padStart(2, '0')}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <Music size={28} className="text-[#00e6e6] mb-2" />
                      <p className="text-sm font-medium">Chọn file nhạc</p>
                      <p className="text-xs text-[#666] mt-1">MP3, WAV, ...</p>
                    </>
                  )}
                </div>
              </div>

              {/* Cover image */}
              <div>
                <input
                  ref={uploadCoverInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleUploadCoverChange}
                />
                <label className="block mb-1.5 text-sm font-semibold text-[#a0a0a0]">Ảnh bìa (tùy chọn)</label>
                <div
                  onClick={() => uploadCoverInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all ${uploadCoverPreview
                    ? 'border-[#00e6e6]/50'
                    : 'border-[#333] hover:border-[#00e6e6]/50 hover:bg-[#00e6e6]/5'
                    }`}
                >
                  {uploadCoverPreview ? (
                    <div className="relative w-full flex items-center gap-3">
                      <img src={uploadCoverPreview} alt="" className="w-16 h-16 rounded-lg object-cover" />
                      <div>
                        <p className="text-sm font-medium text-[#00e6e6]">Đã chọn ảnh bìa</p>
                        <p className="text-xs text-[#666]">Click để đổi</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Image size={24} className="text-[#00e6e6] mb-1" />
                      <p className="text-sm font-medium">Chọn ảnh bìa</p>
                      <p className="text-xs text-[#666] mt-1">PNG, JPG (tùy chọn)</p>
                    </>
                  )}
                </div>
              </div>

              {/* Song title */}
              <div>
                <label className="block mb-1.5 text-sm font-semibold text-[#a0a0a0]">Tên bài hát <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  placeholder="Nhập tên bài hát"
                  value={songTitle}
                  onChange={e => setSongTitle(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#00e6e6]/50 placeholder-[#444]"
                />
              </div>

              {/* Artist */}
              <div>
                <label className="block mb-1.5 text-sm font-semibold text-[#a0a0a0]">Nghệ sĩ</label>
                <label className="flex items-center gap-2 mb-3 cursor-pointer w-fit">
                  <input
                    type="checkbox"
                    checked={songIsOriginal}
                    onChange={(e) => {
                      setSongIsOriginal(e.target.checked);
                      if (e.target.checked) {
                        setSongArtistName(currentUser.displayName || currentUser.username || '');
                      }
                    }}
                    className="w-4 h-4 rounded border-[#333] bg-[#0a0a0a] text-[#00e6e6] focus:ring-[#00e6e6]"
                  />
                  <span className="text-sm text-white">Tôi là tác giả gốc (OG)</span>
                </label>
                <input
                  type="text"
                  placeholder="Nhập tên nghệ sĩ"
                  value={songIsOriginal ? (songArtistName || currentUser.displayName || currentUser.username || 'Tên nghệ sĩ') : songArtistName}
                  onChange={e => setSongArtistName(e.target.value)}
                  disabled={songIsOriginal}
                  className={`w-full border rounded-xl px-4 py-3 text-sm outline-none placeholder-[#444] ${songIsOriginal
                    ? 'bg-[#1a1a1a] border-[#333] text-[#666] cursor-not-allowed'
                    : 'bg-[#0a0a0a] border-[#333] focus:border-[#00e6e6]/50 text-white'
                    }`}
                />
              </div>

              {/* Genre - Multi Select */}
              <div ref={genreRef} className="relative">
                <label className="block mb-1.5 text-sm font-semibold text-[#a0a0a0]">Thể loại</label>
                <div
                  onClick={() => setGenreDropdownOpen(prev => !prev)}
                  className={`w-full min-h-[48px] bg-[#0a0a0a] border rounded-xl px-3 py-2 flex flex-wrap items-center gap-2 cursor-pointer transition-colors ${genreDropdownOpen ? 'border-[#00e6e6]/50' : 'border-[#333]'
                    }`}
                >
                  {songGenreIds.length === 0 && (
                    <span className="text-[#444] text-sm">Chọn thể loại...</span>
                  )}
                  {songGenreIds.map(id => {
                    const g = genres.find(x => x.id === id);
                    if (!g) return null;
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 bg-[#00e6e6]/15 text-[#00e6e6] text-xs font-semibold px-2.5 py-1 rounded-lg"
                      >
                        {g.genreTag}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeSongGenre(id); }}
                          className="hover:text-white transition-colors ml-0.5"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    );
                  })}
                  <svg
                    className={`ml-auto w-4 h-4 text-[#666] transition-transform flex-shrink-0 ${genreDropdownOpen ? 'rotate-180' : ''
                      }`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {genreDropdownOpen && (
                  <div className="absolute z-50 mt-2 w-full max-h-60 overflow-y-auto bg-[#1a1a1a] border border-[#333] rounded-xl shadow-2xl py-1">
                    {genres.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-[#666]">Đang tải...</div>
                    ) : (
                      genres.map(g => {
                        const isSelected = songGenreIds.includes(g.id);
                        return (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => toggleSongGenre(g.id)}
                            className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors ${isSelected
                              ? 'bg-[#00e6e6]/10 text-[#00e6e6]'
                              : 'text-white hover:bg-[#222]'
                              }`}
                          >
                            <span>{g.genreTag}</span>
                            {isSelected && (
                              <svg className="w-4 h-4 text-[#00e6e6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block mb-1.5 text-sm font-semibold text-[#a0a0a0]">Mô tả (tùy chọn)</label>
                <textarea
                  rows="3"
                  placeholder="Viết gì đó về bài hát..."
                  value={songDescription}
                  onChange={e => setSongDescription(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#00e6e6]/50 placeholder-[#444] resize-none"
                />
              </div>

              {/* Progress bar */}
              {isUploadingAudio && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#a0a0a0]">Đang upload...</span>
                    <span className="text-[#00e6e6] font-semibold">{audioUploadProgress}%</span>
                  </div>
                  <div className="h-2 bg-[#222] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#00e6e6] to-[#00b8d4] rounded-full transition-all duration-300"
                      style={{ width: `${audioUploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Submit button */}
              <button
                onClick={handleModalUpload}
                disabled={isUploadingAudio || !uploadAudioFile || !songTitle.trim()}
                className={`w-full flex items-center justify-center gap-3 font-bold text-base px-6 py-3.5 rounded-xl transition-all ${isUploadingAudio
                  ? 'bg-[#333] text-[#666] cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#00e6e6] to-[#00b8d4] text-black hover:shadow-lg hover:shadow-[#00e6e6]/20'
                  }`}
              >
                {isUploadingAudio ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Đang upload...
                  </>
                ) : (
                  <>
                    <Upload size={20} />
                    Upload & thêm vào album
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}