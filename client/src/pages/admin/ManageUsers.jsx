import { useState, useEffect } from 'react';
import { Search, Trash2, Loader2, AlertTriangle, User, Mail, Shield, ShieldAlert, Star } from 'lucide-react';

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, title: '' });
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:9000/api/admin/users');
      if (!res.ok) throw new Error('Không thể tải danh sách người dùng');
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error(err);
      setError('Lỗi khi tải dữ liệu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  const handleDeleteClick = (id, username) => {
    setDeleteModal({ isOpen: true, id, title: username });
  };

  const confirmDelete = async () => {
    if (!deleteModal.id) return;
    
    setIsDeleting(true);
    try {
      const res = await fetch(`http://localhost:9000/api/admin/users/${deleteModal.id}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
         const data = await res.json();
         throw new Error(data.error || 'Lỗi khi xóa người dùng');
      }

      setSuccess(`Đã xóa người dùng "${deleteModal.title}"`);
      fetchUsers();
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

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 text-white min-h-screen bg-[#121212]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Quản lý Người dùng</h1>
          <p className="text-[#a0a0a0]">Theo dõi và quản lý tài khoản người dùng trên hệ thống</p>
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
            placeholder="Tìm kiếm theo tên User hoặc Email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00e6e6]/50 transition-colors"
          />
        </div>
        <div className="text-[#a0a0a0] text-sm font-medium">
          Tổng số: {filteredUsers.length} tài khoản
        </div>
      </div>

      {/* Table */}
      <div className="bg-black border border-[#333] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#1a1a1a] text-[#a0a0a0] text-sm uppercase font-semibold border-b border-[#333]">
              <tr>
                <th className="px-6 py-4 w-24">STT</th>
                <th className="px-6 py-4">Tài khoản</th>
                <th className="px-6 py-4">Liên hệ</th>
                <th className="px-6 py-4">Vai trò</th>
                <th className="px-6 py-4">Playlists</th>
                <th className="px-6 py-4">Ngày tham gia</th>
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
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-[#666]">
                    <div className="bg-[#1a1a1a] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <User size={24} className="text-[#a0a0a0]" />
                    </div>
                    Không tìm thấy người dùng nào.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user, index) => (
                  <tr key={user.id} className="hover:bg-[#1a1a1a]/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-[#666]">#{index + 1}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-[#282828] flex-shrink-0 flex items-center justify-center">
                          {user.avatarUrl ? (
                            <img src={`http://localhost:9000${user.avatarUrl}`} alt="avatar" className="w-full h-full object-cover" />
                          ) : (
                            <User size={16} className="text-[#a0a0a0]" />
                          )}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5 w-full">
                            <span className="font-bold max-w-[150px] truncate" title={user.username}>
                              {user.username}
                            </span>
                            {user.isVerified && <div className="text-blue-400 flex-shrink-0" title="Đã xác minh"><Shield size={14} /></div>}
                          </div>
                          {user.displayName && (
                            <span className="text-xs text-[#a0a0a0] max-w-[150px] truncate" title={user.displayName}>
                              {user.displayName}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[#a0a0a0] text-sm" title={user.email}>
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <Mail size={14} className="flex-shrink-0" />
                        {user.email}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {user.isAdmin ? (
                        <span className="flex items-center gap-1.5 text-rose-400 text-xs font-bold bg-rose-400/10 px-2.5 py-1 rounded-full w-fit border border-rose-400/20">
                          <ShieldAlert size={12} /> Admin
                        </span>
                      ) : user.role === 'artist' ? (
                        <span className="flex items-center gap-1.5 text-blue-400 text-xs font-bold bg-blue-400/10 px-2.5 py-1 rounded-full w-fit border border-blue-400/20">
                          <Star size={12} /> Nghệ sĩ
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-[#a0a0a0] text-xs font-bold bg-[#282828] px-2.5 py-1 rounded-full w-fit border border-[#3e3e3e]">
                          <User size={12} /> Người dùng
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[#a0a0a0] font-bold">
                        {user._count?.playlists || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[#a0a0a0] text-sm">
                      {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => handleDeleteClick(user.id, user.username)}
                          disabled={user.isAdmin}
                          className={`p-2 rounded-lg transition-colors ${
                            user.isAdmin 
                              ? 'text-[#333] cursor-not-allowed' 
                              : 'text-[#a0a0a0] hover:text-red-400 hover:bg-red-400/10'
                          }`}
                          title={user.isAdmin ? "Không thể xóa Admin" : "Xóa người dùng"}
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

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#121212] border border-[#333] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-4 text-red-500">
                <AlertTriangle size={24} />
              </div>
              <h2 className="text-xl font-bold mb-2">Xóa Người dùng này?</h2>
              <p className="text-sm text-[#a0a0a0] mb-6">
                Bạn có chắc chắn muốn xóa user <span className="font-bold text-white">"{deleteModal.title}"</span>? Hành động này <span className="font-bold text-red-400">không thể hoàn tác</span> và toàn bộ dữ liệu (bài hát, playlist...) của họ sẽ bị xóa.
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
