import React, { useState, useEffect } from 'react';
import { Search, Trash2, Loader2, Play, Music, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ManageSongs() {
  const [songs, setSongs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, title: '' });
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchSongs();
  }, []);

  async function fetchSongs() {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:9000/api/admin/songs');
      if (!res.ok) throw new Error('Không thể tải danh sách bài hát');
      const data = await res.json();
      setSongs(data);
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
      const res = await fetch(`http://localhost:9000/api/admin/songs/${deleteModal.id}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
         const data = await res.json();
         throw new Error(data.error || 'Lỗi khi xóa bài hát');
      }

      setSuccess(`Đã xóa bài hát "${deleteModal.title}"`);
      fetchSongs();
      setDeleteModal({ isOpen: false, id: null, title: '' });
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error(err);
      setError(err.message);
      setDeleteModal({ isOpen: false, id: null, title: '' });
      setTimeout(() => setError(''), 3000);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredSongs = songs.filter(s => {
    const artistName = s.artists?.[0]?.artist?.user?.displayName || s.artistName || '';
    return s.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
           artistName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="p-8 text-white min-h-screen bg-[#121212]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Quản lý Bài hát</h1>
          <p className="text-[#a0a0a0]">Theo dõi và quản lý kho nhạc trên hệ thống</p>
        </div>
      </div>

      {/* Thông báo thành công */}
      {success && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium animate-in fade-in slide-in-from-top-4">
          {success}
        </div>
      )}

      {/* Thông báo lỗi */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-medium animate-in fade-in slide-in-from-top-4">
          {error}
        </div>
      )}

      {/* Toolbar: Search */}
      <div className="bg-black border border-[#333] rounded-xl p-4 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" />
          <input
            type="text"
            placeholder="Tìm kiếm theo Tên bài hoặc Ca sĩ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00e6e6]/50 transition-colors"
          />
        </div>
        <div className="text-[#a0a0a0] text-sm font-medium">
          Tổng số: {filteredSongs.length} bài hát
        </div>
      </div>

      {/* Table */}
      <div className="bg-black border border-[#333] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#1a1a1a] text-[#a0a0a0] text-sm uppercase font-semibold border-b border-[#333]">
              <tr>
                <th className="px-6 py-4 w-24">STT</th>
                <th className="px-6 py-4">Bài hát</th>
                <th className="px-6 py-4">Nghệ sĩ</th>
                <th className="px-6 py-4">Thể loại</th>
                <th className="px-6 py-4">Trạng thái</th>
                <th className="px-6 py-4">Lượt nghe</th>
                <th className="px-6 py-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#333]">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-[#666]">
                    <Loader2 size={32} className="animate-spin mx-auto mb-4 text-[#00e6e6]" />
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : filteredSongs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-[#666]">
                    <div className="bg-[#1a1a1a] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Music size={24} className="text-[#a0a0a0]" />
                    </div>
                    Không tìm thấy bài hát nào.
                  </td>
                </tr>
              ) : (
                filteredSongs.map((song, index) => {
                  const artistName = song.artists?.[0]?.artist?.user?.displayName || song.artistName || 'Unknown Artist';
                  const genres = song.genres?.map(g => g.genre.genreTag).join(', ') || 'Chưa phân loại';

                  return (
                    <tr key={song.id} className="hover:bg-[#1a1a1a]/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-[#666]">#{index + 1}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-md overflow-hidden bg-[#282828] flex-shrink-0 flex items-center justify-center">
                            {song.coverArtUrl ? (
                              <img src={`http://localhost:9000${song.coverArtUrl}`} alt="cover" className="w-full h-full object-cover" />
                            ) : (
                              <Music size={16} className="text-[#a0a0a0]" />
                            )}
                          </div>
                          <span className="font-bold max-w-[200px] truncate" title={song.title}>
                            {song.title}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[#a0a0a0] font-medium max-w-[150px] truncate block" title={artistName}>
                          {artistName}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[#a0a0a0] text-sm max-w-[150px] truncate block" title={genres}>
                          {genres}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {song.status === 'approved' ? (
                          <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold bg-emerald-400/10 px-2.5 py-1 rounded-full w-fit border border-emerald-400/20">
                            <CheckCircle size={12} /> Đã duyệt
                          </span>
                        ) : song.status === 'pending' ? (
                          <span className="flex items-center gap-1.5 text-amber-400 text-xs font-bold bg-amber-400/10 px-2.5 py-1 rounded-full w-fit border border-amber-400/20">
                            <Clock size={12} /> Chờ duyệt
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-red-400 text-xs font-bold bg-red-400/10 px-2.5 py-1 rounded-full w-fit border border-red-400/20">
                            <AlertTriangle size={12} /> Từ chối
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-white font-bold bg-[#282828] px-3 py-1 rounded-full text-xs border border-[#3e3e3e]">
                          {song.playCount?.toLocaleString() || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-3">
                          <Link
                            to={`/song/${song.id}`}
                            target="_blank"
                            className="p-2 text-[#a0a0a0] hover:text-[#00e6e6] hover:bg-[#00e6e6]/10 rounded-lg transition-colors"
                            title="Nghe thử"
                          >
                            <Play size={18} />
                          </Link>
                          <button
                            onClick={() => handleDeleteClick(song.id, song.title)}
                            className="p-2 text-[#a0a0a0] hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                            title="Xóa bài hát"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#121212] border border-[#333] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-4 text-red-500">
                <AlertTriangle size={24} />
              </div>
              <h2 className="text-xl font-bold mb-2">Xóa Bài hát này?</h2>
              <p className="text-sm text-[#a0a0a0] mb-6">
                Bạn có chắc chắn muốn xóa bài hát <span className="font-bold text-white">"{deleteModal.title}"</span>? Hành động này <span className="font-bold text-red-400">không thể hoàn tác</span>.
              </p>
              
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setDeleteModal({ isOpen: false, id: null, title: '' })}
                  className="px-5 py-2.5 rounded-xl border border-[#333] text-white text-sm font-bold hover:bg-[#282828] transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="flex items-center justify-center min-w-[120px] px-5 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {isDeleting ? <Loader2 size={18} className="animate-spin" /> : 'Xóa vĩnh viễn'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
