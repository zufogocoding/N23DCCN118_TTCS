import { useState, useRef, useEffect } from 'react';
import { X, Image, Loader2 } from 'lucide-react';
import { api, getMediaUrl } from '../utils/api';

export default function TrackEditModal({ song, onClose, onSaved }) {
  const [title, setTitle] = useState(song?.title || '');
  const [artistName, setArtistName] = useState(song?.artistName || '');
  const [selectedGenreIds, setSelectedGenreIds] = useState(
    (song?.genres || []).map(g => g.genre?.id || g.genreId).filter(Boolean)
  );
  const [lyrics, setLyrics] = useState(song?.lyrics || '');
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(
    song?.coverArtUrl ? getMediaUrl(song.coverArtUrl) : null
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [genres, setGenres] = useState([]);
  const coverRef = useRef(null);

  useEffect(() => {
    api.get('/api/genres')
      .then(res => res.ok ? res.json() : [])
      .then(setGenres)
      .catch(console.error);
  }, []);

  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    };
  }, [coverPreview]);

  const toggleGenre = (id) => {
    setSelectedGenreIds(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
  };

  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (file) { setCoverFile(file); setCoverPreview(URL.createObjectURL(file)); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) { setError('Tên bài hát không được trống'); return; }
    setSaving(true); setError('');
    try {
      const fd = new FormData();
      fd.append('title', title.trim());
      fd.append('artistName', artistName);
      if (lyrics.trim()) {
        fd.append('lyrics', lyrics.trim());
      } else {
        fd.append('lyrics', ''); // Clear lyrics if empty
      }
      fd.append('genreIds', JSON.stringify(selectedGenreIds));
      if (coverFile) fd.append('coverImage', coverFile);

      const res = await api.put(`/api/songs/${song.id}`, fd);
      if (res.ok) {
        const data = await res.json();
        onSaved?.(data.song);
        onClose();
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.error || 'Lỗi cập nhật');
      }
    } catch (err) { console.error(err); setError('Lỗi kết nối'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#181818] border border-[#333] rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#333] shrink-0">
          <h2 className="text-lg font-bold text-white">Chỉnh sửa bài hát</h2>
          <button type="button" onClick={onClose} className="text-[#666] hover:text-white"><X size={22} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4">
          {error && <p className="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg">{error}</p>}

          {/* Cover */}
          <div>
            <label className="block mb-2 text-sm font-medium text-[#a0a0a0]">Ảnh bìa</label>
            <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
            <div onClick={() => coverRef.current?.click()}
              className="relative border-2 border-dashed border-[#333] hover:border-[#00e6e6]/50 rounded-xl h-32 flex items-center justify-center cursor-pointer overflow-hidden group">
              {coverPreview ? (
                <>
                  <img src={coverPreview} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-sm text-white font-medium">Đổi ảnh</span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center text-[#666]">
                  <Image size={24} /><span className="text-xs mt-1">Chọn ảnh bìa</span>
                </div>
              )}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block mb-2 text-sm font-medium text-[#a0a0a0]">Tên bài hát *</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              className="w-full bg-black border border-[#333] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#00e6e6]/50" />
          </div>

          {/* Artist */}
          <div>
            <label className="block mb-2 text-sm font-medium text-[#a0a0a0]">Nghệ sĩ</label>
            <input type="text" value={artistName} onChange={e => setArtistName(e.target.value)}
              className="w-full bg-black border border-[#333] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#00e6e6]/50" />
          </div>

          {/* Genres */}
          <div>
            <label className="block mb-2 text-sm font-medium text-[#a0a0a0]">Thể loại</label>
            <div className="flex flex-wrap gap-2">
              {genres.map(g => {
                const sel = selectedGenreIds.includes(g.id);
                return (
                  <button key={g.id} type="button" onClick={() => toggleGenre(g.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${sel ? 'bg-[#00e6e6]/20 text-[#00e6e6] border border-[#00e6e6]/40' : 'bg-[#222] text-[#a0a0a0] hover:bg-[#333]'}`}>
                    {g.genreTag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lyrics */}
          <div>
            <label className="block mb-2 text-sm font-medium text-[#a0a0a0]">Lời bài hát (Tùy chọn)</label>
            <textarea value={lyrics} onChange={e => setLyrics(e.target.value)} rows="5"
              placeholder="Nhập lời bài hát của bạn tại đây..."
              className="w-full bg-black border border-[#333] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#00e6e6]/50 resize-y custom-scrollbar" />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-[#a0a0a0] text-sm">Hủy</button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-black bg-[#00e6e6] disabled:opacity-50 text-sm">
              {saving && <Loader2 size={16} className="animate-spin" />} Lưu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
