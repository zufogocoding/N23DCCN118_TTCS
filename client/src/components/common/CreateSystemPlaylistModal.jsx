import { useState, useEffect } from 'react';
import { X, Upload, Search, Check } from 'lucide-react';
import { api, getMediaUrl } from '../../utils/api';

export default function CreateSystemPlaylistModal({ isOpen, onClose, onSuccess }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cover, setCover] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [songs, setSongs] = useState([]);
  const [selectedSongs, setSelectedSongs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchSongs();
      // Reset form
      setTitle('');
      setDescription('');
      setCover(null);
      setCoverPreview(null);
      setSelectedSongs([]);
      setSearchQuery('');
    }
  }, [isOpen]);

  const fetchSongs = async () => {
    try {
      const res = await api.get('/api/songs');
      if (res.ok) {
        const data = await res.json();
        setSongs(Array.isArray(data) ? data : data.songs || []);
      }
    } catch (error) {
      console.error("Lỗi khi tải danh sách bài hát:", error);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCover(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleSongSelection = (songId) => {
    if (selectedSongs.includes(songId)) {
      setSelectedSongs(selectedSongs.filter(id => id !== songId));
    } else {
      setSelectedSongs([...selectedSongs, songId]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('isPublic', 'false'); // Mới tạo luôn ở trạng thái ẩn
      if (cover) {
        formData.append('cover', cover);
      }
      if (selectedSongs.length > 0) {
        formData.append('songIds', JSON.stringify(selectedSongs));
      }

      const res = await api.post('/api/admin/playlists', formData);

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Lỗi khi tạo playlist');
      }
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Lỗi tạo playlist:", error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredSongs = songs.filter(song => 
    song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (song.artistName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-surface-hover flex justify-between items-center shrink-0">
          <h2 className="text-xl font-bold text-white">Tạo System Playlist</h2>
          <button onClick={onClose} className="p-2 text-text-secondary hover:text-white rounded-full hover:bg-surface-hover">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 flex flex-col">
          <div className="flex flex-col md:flex-row gap-8 flex-1 min-h-0">
            
            {/* Cột trái: Ảnh bìa, Tên, Mô tả */}
            <div className="w-full md:w-[280px] flex flex-col gap-5 shrink-0">
              <div 
                className="w-full aspect-video bg-surface-hover rounded-xl flex flex-col items-center justify-center cursor-pointer overflow-hidden border-2 border-transparent hover:border-primary transition-colors relative group"
                onClick={() => document.getElementById('playlist-cover').click()}
              >
                {coverPreview ? (
                  <>
                    <img src={coverPreview} alt="Cover Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Upload size={24} className="text-white mb-2" />
                      <span className="text-white text-sm font-medium">Thay đổi ảnh</span>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-surface-hover flex flex-col items-center justify-center">
                    <Upload size={32} className="text-text-secondary mb-2 group-hover:text-primary transition-colors" />
                    <span className="text-text-secondary text-sm group-hover:text-primary transition-colors text-center px-4">Tải ảnh bìa lên</span>
                  </div>
                )}
              </div>
              <input 
                id="playlist-cover"
                type="file" 
                accept="image/*" 
                onChange={handleImageChange}
                className="hidden"
              />
              
              <div>
                <label className="block text-sm font-bold text-text-secondary mb-2">Tên Playlist <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-surface border border-surface-hover rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary"
                  placeholder="Nhập tên playlist..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-text-secondary mb-2">Mô tả</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-surface border border-surface-hover rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary h-28 resize-none"
                  placeholder="Thêm mô tả cho playlist..."
                />
              </div>
            </div>

            {/* Cột phải: Chọn bài hát */}
            <div className="flex-1 flex flex-col min-h-0 bg-surface border border-surface-hover rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-white">Chọn Bài Hát</h3>
                  <p className="text-sm font-medium text-primary">Đã chọn: {selectedSongs.length} bài</p>
                </div>
                <div className="relative w-48">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm kiếm bài hát..."
                    className="w-full bg-surface-hover rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-2 custom-scrollbar">
                {filteredSongs.map(song => {
                  const isSelected = selectedSongs.includes(song.id);
                  return (
                    <div 
                      key={song.id} 
                      onClick={() => toggleSongSelection(song.id)}
                      className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-colors border ${isSelected ? 'bg-primary/5 border-primary shadow-[0_0_10px_rgba(0,255,255,0.1)]' : 'bg-transparent border-transparent hover:bg-surface-hover'}`}
                    >
                      <div className={`w-5 h-5 rounded flex shrink-0 items-center justify-center border ${isSelected ? 'bg-primary border-primary' : 'bg-surface-hover border-text-secondary'}`}>
                        {isSelected && <Check size={14} className="text-black" strokeWidth={3} />}
                      </div>
                      <img src={getMediaUrl(song.coverArtUrl)} alt={song.title} className="w-12 h-12 rounded-md object-cover shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold line-clamp-1">{song.title}</p>
                        <p className="text-text-secondary text-xs line-clamp-1 mt-0.5">{song.artistName || 'Unknown Artist'}</p>
                      </div>
                    </div>
                  );
                })}
                {filteredSongs.length === 0 && (
                  <div className="text-center text-text-secondary py-8 text-sm">
                    Không tìm thấy bài hát nào
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-6 mt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-2.5 rounded-full font-bold text-white border border-surface-hover hover:bg-surface-hover transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading || !title}
              className="px-6 py-2.5 rounded-full font-bold text-black bg-primary hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center min-w-[120px]"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  Đang tạo...
                </div>
              ) : (
                'Tạo Playlist'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}