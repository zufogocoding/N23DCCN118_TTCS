import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, User, Lock, Moon, Sun, Monitor, Info, 
  ShieldAlert, CheckCircle2, AlertTriangle, Loader2 
} from 'lucide-react';
import { api } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

export default function Settings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('account');

  // Modal states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showChangelogModal, setShowChangelogModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  
  // Error states
  const [passwordError, setPasswordError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  
  // Theme state
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  // Form states
  const [passwordForm, setPasswordForm] = useState({ old: '', new: '', confirm: '' });
  const [deletePassword, setDeletePassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    
    if (passwordForm.new !== passwordForm.confirm) {
      setPasswordError('Mật khẩu xác nhận không khớp!');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await api.put('/api/auth/change-password', {
        oldPassword: passwordForm.old,
        newPassword: passwordForm.new
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Lỗi khi đổi mật khẩu');
      }
      
      setShowPasswordModal(false);
      setPasswordForm({ old: '', new: '', confirm: '' });
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      
      setSuccessMessage({
        title: 'Thành công!',
        desc: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.',
        onClose: () => navigate('/login')
      });
      
    } catch (error) {
      setPasswordError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAccount = async (e) => {
    if (e) e.preventDefault();
    setDeleteError('');
    
    if (!deletePassword) {
      setDeleteError('Vui lòng nhập mật khẩu để xác nhận');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await api.delete('/api/auth/delete-account', {
        body: { password: deletePassword }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Lỗi khi xóa tài khoản');
      }
      
      setShowDeleteModal(false);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      
      setSuccessMessage({
        title: 'Đã xóa tài khoản',
        desc: 'Tài khoản của bạn đã được xóa vĩnh viễn thành công.',
        onClose: () => navigate('/login')
      });
      
    } catch (error) {
      setDeleteError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'light') {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
  };

  const tabs = [
    { id: 'account', label: 'Tài khoản', icon: <User size={20} /> },
    { id: 'appearance', label: 'Giao diện', icon: <Monitor size={20} /> },
    { id: 'about', label: 'Giới thiệu', icon: <Info size={20} /> },
  ];

  return (
    <div className="flex flex-col h-full bg-[#121212] text-white">
      {/* HEADER */}
      <div className="sticky top-0 bg-[#121212]/90 backdrop-blur-md z-10 p-3 border-b border-[#333] flex items-center gap-3">
        <button 
          onClick={() => navigate(-1)} 
          className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/80 flex items-center justify-center text-white transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-bold">Cài đặt</h1>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR TABS */}
        <div className="w-56 border-r border-[#333] p-3 overflow-y-auto hidden md:block bg-[#121212]">
          <nav className="space-y-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id 
                    ? 'bg-[#333] text-white' 
                    : 'text-[#a0a0a0] hover:text-white hover:bg-[#282828]'
                }`}
              >
                {React.cloneElement(tab.icon, { size: 18 })}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* MOBILE TABS */}
        <div className="md:hidden flex overflow-x-auto border-b border-[#333] p-2 hide-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors mr-2 ${
                activeTab === tab.id 
                  ? 'bg-[#333] text-white' 
                  : 'text-[#a0a0a0] bg-[#181818]'
              }`}
            >
              {React.cloneElement(tab.icon, { size: 14 })}
              {tab.label}
            </button>
          ))}
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 p-5 md:p-8 overflow-y-auto bg-[#181818]">
          <div className="max-w-2xl mx-auto">
            
            {/* TÀI KHOẢN */}
            {activeTab === 'account' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                <h2 className="text-xl font-bold mb-5">Tổng quan tài khoản</h2>
                
                <div className="bg-[#282828] rounded-xl p-5 mb-6 border border-[#3e3e3e]">
                  <h3 className="text-sm font-bold text-[#a0a0a0] uppercase tracking-wider mb-4">Hồ sơ</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <p className="text-xs text-[#a0a0a0] mb-1">Tên đăng nhập</p>
                      <p className="font-medium text-sm">{user.username}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#a0a0a0] mb-1">Email</p>
                      <p className="font-medium text-sm">{user.email}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#a0a0a0] mb-1">Vai trò</p>
                      <div className="flex items-center gap-2 mt-1">
                        {user.isAdmin && <span className="bg-red-500/20 text-red-500 px-2 py-0.5 rounded text-[10px] font-bold border border-red-500/30">ADMIN</span>}
                        {user.isArtist && <span className="bg-[#1ed760]/20 text-[#1ed760] px-2 py-0.5 rounded text-[10px] font-bold border border-[#1ed760]/30">ARTIST</span>}
                        {!user.isAdmin && !user.isArtist && <span className="bg-blue-500/20 text-blue-500 px-2 py-0.5 rounded text-[10px] font-bold border border-blue-500/30">USER</span>}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#282828] rounded-xl p-5 mb-6 border border-[#3e3e3e]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Lock size={16} /> Đổi mật khẩu
                      </h3>
                      <p className="text-xs text-[#a0a0a0] mt-1">Cập nhật mật khẩu để bảo vệ tài khoản của bạn.</p>
                    </div>
                    <button 
                      onClick={() => {
                        setPasswordError('');
                        setShowPasswordModal(true);
                      }}
                      className="px-4 py-1.5 rounded-full border border-white/30 font-bold text-xs hover:bg-white/10 transition-colors whitespace-nowrap"
                    >
                      Đổi mật khẩu
                    </button>
                  </div>
                </div>

                <div className="bg-red-500/5 rounded-xl p-5 border border-red-500/20">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-bold text-red-500 flex items-center gap-2">
                        <ShieldAlert size={16} /> Xóa tài khoản
                      </h3>
                      <p className="text-xs text-[#a0a0a0] mt-1">Hành động này sẽ xóa vĩnh viễn tài khoản và dữ liệu.</p>
                    </div>
                    <button 
                      onClick={() => {
                        setDeleteError('');
                        setShowDeleteModal(true);
                      }}
                      className="px-4 py-1.5 rounded-full bg-red-500 text-white font-bold text-xs hover:bg-red-600 transition-colors whitespace-nowrap"
                    >
                      Xóa tài khoản
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* GIAO DIỆN */}
            {activeTab === 'appearance' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                <h2 className="text-xl font-bold mb-5">Giao diện</h2>
                
                <div className="bg-[#282828] rounded-xl p-5 border border-[#3e3e3e]">
                  <h3 className="text-sm font-bold text-[#a0a0a0] uppercase tracking-wider mb-4">Chế độ hiển thị</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button 
                      onClick={() => handleThemeChange('dark')}
                      className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all relative ${
                        theme === 'dark' ? 'border-[#00e6e6] bg-[#333]' : 'border-[#3e3e3e] bg-[#222] hover:border-gray-500'
                      }`}
                    >
                      <Moon size={24} className="mb-2 text-white" />
                      <span className="font-medium text-xs text-white">Chế độ Tối</span>
                      {theme === 'dark' && <CheckCircle2 size={14} className="text-[#00e6e6] absolute top-2 right-2" />}
                    </button>
                    
                    <button 
                      disabled
                      title="Tính năng đang được phát triển"
                      className="relative flex flex-col items-center justify-center p-4 rounded-lg border-2 border-[#3e3e3e] bg-[#1a1a1a] opacity-50 cursor-not-allowed"
                    >
                      <Sun size={24} className="mb-2 text-[#666]" />
                      <span className="font-medium text-xs text-[#666]">Chế độ Sáng</span>
                    </button>

                    <button 
                      disabled
                      title="Tính năng đang được phát triển"
                      className="relative flex flex-col items-center justify-center p-4 rounded-lg border-2 border-[#3e3e3e] bg-[#1a1a1a] opacity-50 cursor-not-allowed"
                    >
                      <Monitor size={24} className="mb-2 text-[#666]" />
                      <span className="font-medium text-xs text-[#666]">Theo Hệ thống</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* GIỚI THIỆU */}
            {activeTab === 'about' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                <h2 className="text-xl font-bold mb-5">Giới thiệu</h2>
                
                <div className="bg-[#282828] rounded-xl p-6 border border-[#3e3e3e] flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#1ed760] to-[#00e6e6] rounded-full flex items-center justify-center mb-3 shadow-md">
                    <span className="text-2xl">🎵</span>
                  </div>
                  <h3 className="text-lg font-black text-white mb-1">Soundwave</h3>
                  <p className="text-[#a0a0a0] text-xs mb-3">Phiên bản 1.0.0 (Beta)</p>
                  <button 
                    onClick={() => setShowChangelogModal(true)}
                    className="mb-5 px-4 py-1.5 rounded-full border border-white/20 text-xs font-bold text-white hover:bg-white/10 transition-colors"
                  >
                    Xem thay đổi (Changelog)
                  </button>
                  
                  <div className="w-full border-t border-[#3e3e3e] pt-4 flex justify-around">
                    <a href="#" className="text-xs text-[#00e6e6] hover:underline">Điều khoản dịch vụ</a>
                    <a href="#" className="text-xs text-[#00e6e6] hover:underline">Chính sách bảo mật</a>
                    <a href="#" className="text-xs text-[#00e6e6] hover:underline">Hỗ trợ</a>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* MODAL ĐỔI MẬT KHẨU */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#121212] border border-[#333] rounded-xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-5">
              <h2 className="text-lg font-bold mb-1">Đổi mật khẩu</h2>
              <p className="text-xs text-[#a0a0a0] mb-4">Mật khẩu mới phải có ít nhất 6 ký tự.</p>
              
              {passwordError && (
                <div className="mb-4 bg-red-500/10 border border-red-500/50 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-500">{passwordError}</p>
                </div>
              )}
              
              <form onSubmit={handlePasswordSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Mật khẩu hiện tại</label>
                  <input
                    type="password"
                    required
                    value={passwordForm.old}
                    onChange={e => setPasswordForm({...passwordForm, old: e.target.value})}
                    className={`w-full bg-[#181818] border ${passwordError ? 'border-red-500/50' : 'border-[#333] focus:border-[#1ed760]'} rounded-md px-3 py-2 text-sm text-white outline-none transition-colors`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Mật khẩu mới</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={passwordForm.new}
                    onChange={e => setPasswordForm({...passwordForm, new: e.target.value})}
                    className={`w-full bg-[#181818] border ${passwordError ? 'border-red-500/50' : 'border-[#333] focus:border-[#1ed760]'} rounded-md px-3 py-2 text-sm text-white outline-none transition-colors`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Xác nhận mật khẩu mới</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={passwordForm.confirm}
                    onChange={e => setPasswordForm({...passwordForm, confirm: e.target.value})}
                    className={`w-full bg-[#181818] border ${passwordError ? 'border-red-500/50' : 'border-[#333] focus:border-[#1ed760]'} rounded-md px-3 py-2 text-sm text-white outline-none transition-colors`}
                  />
                </div>
                
                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setShowPasswordModal(false)}
                    className="px-4 py-2 rounded-full text-white text-xs font-medium hover:bg-white/10 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center justify-center min-w-[100px] px-4 py-2 rounded-full bg-[#1ed760] text-black text-xs font-bold hover:bg-[#1db954] transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Cập nhật'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XÓA TÀI KHOẢN */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#121212] border border-[#333] rounded-xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-5">
              <div className="w-10 h-10 bg-red-500/10 rounded-full flex items-center justify-center mb-3 text-red-500">
                <AlertTriangle size={20} />
              </div>
              <h2 className="text-lg font-bold mb-2">Xóa tài khoản?</h2>
              <p className="text-xs text-[#a0a0a0] mb-4">
                Hành động này <span className="font-bold text-white">KHÔNG THỂ</span> hoàn tác. Dữ liệu của bạn sẽ bị xóa vĩnh viễn.
              </p>
              
              {deleteError && (
                <div className="mb-4 bg-red-500/10 border border-red-500/50 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-500">{deleteError}</p>
                </div>
              )}
              
              <form onSubmit={handleDeleteAccount} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Mật khẩu xác nhận</label>
                  <input
                    type="password"
                    required
                    value={deletePassword}
                    onChange={e => setDeletePassword(e.target.value)}
                    placeholder="Nhập mật khẩu của bạn"
                    className={`w-full bg-[#181818] border ${deleteError ? 'border-red-500/50' : 'border-[#333] focus:border-red-500'} rounded-md px-3 py-2 text-sm text-white outline-none transition-colors`}
                  />
                </div>

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setShowDeleteModal(false)}
                    className="px-4 py-2 rounded-full border border-[#333] text-white text-xs font-medium hover:bg-white/5 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center justify-center px-4 py-2 rounded-full bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Xóa tài khoản'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS MODAL */}
      {successMessage && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#181818] border border-[#333] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 fade-in duration-300 flex flex-col items-center text-center p-8 relative">
            
            <div className="absolute inset-0 bg-gradient-to-b from-[#1ed760]/10 to-transparent pointer-events-none"></div>

            <div className="w-16 h-16 bg-[#1ed760]/20 rounded-full flex items-center justify-center mb-4 text-[#1ed760] ring-4 ring-[#1ed760]/10 animate-bounce shadow-[0_0_15px_rgba(30,215,96,0.5)]">
              <CheckCircle2 size={32} />
            </div>
            
            <h2 className="text-2xl font-black text-white mb-2 tracking-tight">{successMessage.title}</h2>
            <p className="text-sm text-[#a0a0a0] mb-8 leading-relaxed">
              {successMessage.desc}
            </p>
            
            <button
              onClick={() => {
                const closeFn = successMessage.onClose;
                setSuccessMessage(null);
                if (closeFn) closeFn();
              }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#1ed760] to-[#1db954] text-black font-bold text-sm hover:opacity-90 hover:scale-[1.02] transition-all shadow-lg"
            >
              Vui lòng đăng nhập lại
            </button>
          </div>
        </div>
      )}

      {/* CHANGELOG MODAL */}
      {showChangelogModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#181818] border border-[#333] rounded-xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
            <div className="p-5 border-b border-[#333] flex justify-between items-center bg-[#121212]">
              <h2 className="text-lg font-bold">Changelog v1.0.0 (Beta)</h2>
              <button onClick={() => setShowChangelogModal(false)} className="text-[#a0a0a0] hover:text-white">
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[#00e6e6] mb-2">🎉 Tính năng mới</h3>
                <ul className="list-disc pl-5 text-xs text-[#d0d0d0] space-y-1">
                  <li>Hệ thống tài khoản và phân quyền (Người dùng / Nghệ sĩ / Quản trị viên).</li>
                  <li>Trình phát nhạc (Player) với tính năng lặp lại, phát ngẫu nhiên, xem lời bài hát.</li>
                  <li>Tính năng tạo Playlist và yêu thích bài hát.</li>
                  <li>Giao diện Dark Mode lấy cảm hứng từ những ứng dụng nghe nhạc tốt nhất.</li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-bold text-emerald-400 mb-2">✨ Cải tiến & Sửa lỗi</h3>
                <ul className="list-disc pl-5 text-xs text-[#d0d0d0] space-y-1">
                  <li>Fix lỗi bảo mật hiển thị File CCCD trực tiếp.</li>
                  <li>Chặn auto-play audio không mong muốn ở Dashboard Admin.</li>
                  <li>Khắc phục lỗi khi lấy thông tin nghệ sĩ ở trang chi tiết.</li>
                  <li>Làm mịn giao diện Dark Mode với màu Cyan đặc trưng.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
