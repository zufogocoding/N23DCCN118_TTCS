import { useState, useEffect } from 'react';
import { Search, Trash2, Loader2, Play, Plus } from 'lucide-react';
import { api, getMediaUrl } from '../../utils/api';
import CreateSystemPlaylistModal from '../../components/common/CreateSystemPlaylistModal';

export default function ManagePlaylists() {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, title: '' });
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    fetchPlaylists();
  }, []);

  async function fetchPlaylists() {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/playlists');
      if (!res.ok) throw new Error('Không thể tải danh sách playlist');
      const data = await res.json();
      setPlaylists(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Lỗi khi tải dữ liệu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  const handleDeleteClick = (id, title) => {
    setDeleteModal({ isOpen: true, id, title });
  };

  const confirmDelete = async () => {
    if (!deleteModal.id) return;
    
    setIsDeleting(true);
    try {
      const res = await api.delete(`/api/admin/playlists/${deleteModal.id}`);
      
      if (!res.ok) {
         const data = await res.json();
         throw new Error(data.error || 'Không thể xóa playlist');
      }

      setPlaylists(playlists.filter(p => p.id !== deleteModal.id));
      setDeleteModal({ isOpen: false, id: null, title: '' });
    } catch (err) {
      alert(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleVisibility = async (id, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      // Optimistic update
      setPlaylists(playlists.map(p => p.id === id ? { ...p, isPublic: newStatus } : p));
      
      const res = await api.patch(`/api/admin/playlists/${id}/toggle-visibility`, {
        isPublic: newStatus
      });
      
      if (!res.ok) {
        // Revert on failure
        setPlaylists(playlists.map(p => p.id === id ? { ...p, isPublic: currentStatus } : p));
        throw new Error('Lỗi khi cập nhật trạng thái hiển thị');
      }
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  };

  const filteredPlaylists = playlists.filter(playlist => 
    playlist.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-8 pb-0">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-white">Playlist Management</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar">
        <div className="bg-surface rounded-xl border border-surface-hover overflow-hidden flex flex-col min-h-[500px]">
          
          <div className="p-6 border-b border-surface-hover flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={20} />
              <input 
                type="text"
                placeholder="Tìm kiếm theo tên Playlist..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface-hover rounded-lg pl-10 pr-4 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2.5 bg-primary text-black font-bold rounded-lg hover:scale-105 transition-transform flex items-center justify-center gap-2 min-w-[160px]"
            >
              <Plus size={20} /> Tạo Playlist mới
            </button>
          </div>

          <div className="flex-1 overflow-x-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full text-text-secondary min-h-[300px]">
                <Loader2 size={32} className="animate-spin mb-4 text-primary" />
                <p>Đang tải dữ liệu...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full text-text-secondary min-h-[300px]">
                <p className="text-red-500 mb-2">{error}</p>
                <button 
                  onClick={fetchPlaylists}
                  className="px-4 py-2 bg-surface-hover rounded-full hover:text-white transition-colors"
                >
                  Thử lại
                </button>
              </div>
            ) : filteredPlaylists.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-text-secondary min-h-[300px]">
                <div className="w-16 h-16 rounded-full bg-surface-hover flex items-center justify-center mb-4">
                  <Search size={24} />
                </div>
                <p className="text-lg font-medium text-white mb-1">Không tìm thấy Playlist nào</p>
                <p className="text-sm">Hãy thử thay đổi từ khóa tìm kiếm</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="border-b border-surface-hover text-xs uppercase tracking-wider text-text-secondary">
                    <th className="px-6 py-4 font-medium w-16 text-center">ID</th>
                    <th className="px-6 py-4 font-medium">TÊN PLAYLIST</th>
                    <th className="px-6 py-4 font-medium text-center">SỐ BÀI HÁT</th>
                    <th className="px-6 py-4 font-medium text-center">HIỂN THỊ</th>
                    <th className="px-6 py-4 font-medium text-center">NGÀY TẠO</th>
                    <th className="px-6 py-4 font-medium text-center w-32">HÀNH ĐỘNG</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {filteredPlaylists.map((playlist, index) => (
                    <tr 
                      key={playlist.id} 
                      className="border-b border-surface-hover hover:bg-surface-hover/50 transition-colors group"
                    >
                      <td className="px-6 py-4 text-text-secondary text-center">
                        #{index + 1}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded bg-surface-hover flex flex-shrink-0 items-center justify-center overflow-hidden relative">
                            {playlist.coverArtUrl ? (
                              <img 
                                src={getMediaUrl(playlist.coverArtUrl)} 
                                alt={playlist.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-surface-hover flex items-center justify-center">
                                <span className="text-text-secondary font-bold text-lg">
                                  {playlist.title.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                              <Play size={16} className="text-white fill-current" />
                            </div>
                          </div>
                          <div>
                            <p className="text-white font-medium line-clamp-1">{playlist.title}</p>
                            {playlist.description && (
                              <p className="text-text-secondary text-xs line-clamp-1 mt-0.5">{playlist.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-medium bg-surface-hover text-text-secondary">
                          {playlist._count?.songs || 0} bài
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <label className="relative inline-flex items-center cursor-pointer justify-center">
                          <input
                            type="checkbox"
                            checked={playlist.isPublic}
                            onChange={() => handleToggleVisibility(playlist.id, playlist.isPublic)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-surface-hover peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                      </td>
                      <td className="px-6 py-4 text-text-secondary text-center">
                        {new Date(playlist.createdAt).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-3">
                          <button 
                            className="p-1.5 text-text-secondary hover:text-white rounded transition-colors tooltip-trigger relative"
                            title="Nghe playlist"
                          >
                            <Play size={18} />
                          </button>
                          <button 
                            onClick={() => handleDeleteClick(playlist.id, playlist.title)}
                            className="p-1.5 text-text-secondary hover:text-red-500 rounded transition-colors tooltip-trigger relative"
                            title="Xóa playlist"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          
          <div className="p-4 border-t border-surface-hover text-center text-xs text-text-secondary shrink-0">
            Hiển thị {filteredPlaylists.length} / {playlists.length} playlists
          </div>
        </div>
      </div>

      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-surface border border-surface-hover rounded-xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">Xóa Playlist</h3>
            <p className="text-text-secondary mb-6">
              Bạn có chắc chắn muốn xóa playlist <span className="text-white font-medium">"{deleteModal.title}"</span>? 
              Hành động này không thể hoàn tác.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setDeleteModal({ isOpen: false, id: null, title: '' })}
                disabled={isDeleting}
                className="px-4 py-2 rounded-full font-medium text-white hover:bg-surface-hover transition-colors"
              >
                Hủy
              </button>
              <button 
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-6 py-2 rounded-full font-bold text-white bg-red-500 hover:bg-red-600 hover:scale-105 transition-all flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Đang xóa...
                  </>
                ) : (
                  'Xóa Playlist'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <CreateSystemPlaylistModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onSuccess={fetchPlaylists} 
      />
    </div>
  );
}
