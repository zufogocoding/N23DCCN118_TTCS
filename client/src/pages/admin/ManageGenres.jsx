import { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, X, Loader2 } from 'lucide-react';
import { api } from '../../utils/api';

export default function ManageGenres() {
  const [genres, setGenres] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [editingId, setEditingId] = useState(null);
  const [genreNameInput, setGenreNameInput] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchGenres();
  }, []);

  async function fetchGenres() {
    setLoading(true);
    try {
      const res = await api.get('/api/genres');
      if (!res.ok) throw new Error('Không thể tải danh sách thể loại');
      const data = await res.json();
      setGenres(data);
    } catch (err) {
      console.error(err);
      setError('Lỗi khi tải dữ liệu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa thể loại "${name}"?`)) return;

    try {
      const res = await api.delete(`/api/genres/${id}`);
      
      if (!res.ok) {
         const data = await res.json();
         throw new Error(data.error || 'Lỗi khi xóa thể loại');
      }

      setSuccess(`Đã xóa thể loại "${name}"`);
      fetchGenres();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  const openAddModal = () => {
    setModalMode('add');
    setGenreNameInput('');
    setEditingId(null);
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (genre) => {
    setModalMode('edit');
    setGenreNameInput(genre.genreTag);
    setEditingId(genre.id);
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!genreNameInput.trim()) {
      setError('Tên thể loại không được để trống');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const url = modalMode === 'add' 
        ? '/api/genres' 
        : `/api/genres/${editingId}`;
        
      const res = modalMode === 'add'
        ? await api.post(url, { name: genreNameInput })
        : await api.put(url, { name: genreNameInput });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra');
      }

      setSuccess(modalMode === 'add' ? 'Thêm thể loại thành công' : 'Cập nhật thành công');
      setIsModalOpen(false);
      fetchGenres();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredGenres = genres.filter(g => 
    g.genreTag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 text-white min-h-screen bg-[#121212]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Quản lý Thể loại</h1>
          <p className="text-[#a0a0a0]">Thêm, sửa, xóa các thể loại nhạc trên hệ thống</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-[#00e6e6] text-black font-bold px-5 py-2.5 rounded-full hover:bg-[#00d0d0] transition-colors"
        >
          <Plus size={20} />
          Thêm thể loại
        </button>
      </div>

      {/* Thông báo thành công */}
      {success && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium">
          {success}
        </div>
      )}

      {/* Toolbar: Search */}
      <div className="bg-black border border-[#333] rounded-xl p-4 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" />
          <input
            type="text"
            placeholder="Tìm kiếm thể loại..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00e6e6]/50 transition-colors"
          />
        </div>
        <div className="text-[#a0a0a0] text-sm font-medium">
          Tổng số: {filteredGenres.length} thể loại
        </div>
      </div>

      {/* Table */}
      <div className="bg-black border border-[#333] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#1a1a1a] text-[#a0a0a0] text-sm uppercase font-semibold border-b border-[#333]">
              <tr>
                <th className="px-6 py-4 w-24">ID</th>
                <th className="px-6 py-4">Tên thể loại</th>
                <th className="px-6 py-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#333]">
              {loading ? (
                <tr>
                  <td colSpan="3" className="px-6 py-8 text-center text-[#666]">
                    <Loader2 size={24} className="animate-spin mx-auto mb-2" />
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : filteredGenres.length === 0 ? (
                <tr>
                  <td colSpan="3" className="px-6 py-8 text-center text-[#666]">
                    Không tìm thấy thể loại nào.
                  </td>
                </tr>
              ) : (
                filteredGenres.map((genre) => (
                  <tr key={genre.id} className="hover:bg-[#1a1a1a]/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-[#666]">#{genre.id}</td>
                    <td className="px-6 py-4 font-bold">{genre.genreTag}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => openEditModal(genre)}
                          className="p-2 text-[#a0a0a0] hover:text-[#00e6e6] hover:bg-[#00e6e6]/10 rounded-lg transition-colors"
                          title="Sửa"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(genre.id, genre.genreTag)}
                          className="p-2 text-[#a0a0a0] hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                          title="Xóa"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Thêm/Sửa */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#121212] border border-[#333] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#333] bg-black/50">
              <h2 className="text-xl font-bold">
                {modalMode === 'add' ? 'Thêm Thể Loại Mới' : 'Sửa Thể Loại'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#666] hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}
              
              <div className="mb-6">
                <label className="block mb-2 text-sm font-medium text-[#a0a0a0]">
                  Tên thể loại <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={genreNameInput}
                  onChange={(e) => setGenreNameInput(e.target.value)}
                  placeholder="Nhập tên thể loại (VD: Pop, Rock...)"
                  className="w-full bg-black border border-[#333] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00e6e6]/50 transition-colors placeholder-[#444]"
                  autoFocus
                />
              </div>
              
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl font-medium text-[#a0a0a0] hover:text-white hover:bg-[#333] transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-black transition-colors ${
                    submitting 
                      ? 'bg-[#333] text-[#666] cursor-not-allowed' 
                      : 'bg-[#00e6e6] hover:bg-[#00d0d0]'
                  }`}
                >
                  {submitting && <Loader2 size={18} className="animate-spin" />}
                  {modalMode === 'add' ? 'Thêm mới' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
