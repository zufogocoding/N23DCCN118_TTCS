/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, LogIn, UserPlus } from 'lucide-react';

export default function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

const [user, setUser] = useState({});
  const isLoggedIn = !!user.username || !!user.email;
  
  const loadUser = () => {
    const userStr = localStorage.getItem('user');
    setUser(userStr ? JSON.parse(userStr) : {});
  };

  useEffect(() => {
    loadUser();
    
    // Lắng nghe sự kiện cập nhật profile để render lại dropdown
    window.addEventListener('profileUpdated', loadUser);
    
    return () => {
      window.removeEventListener('profileUpdated', loadUser);
    };
  }, []);

  const getInitial = () => {
    if (user.username) return user.username.charAt(0).toUpperCase();
    if (user.email) return user.email.charAt(0).toUpperCase();
    return '?';
  };

  // Đóng menu khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setIsOpen(false);
    navigate('/login');
  };

  if (!user || (!user.username && !user.email)) {
    return (
      <div className="flex items-center gap-4">
        <Link 
          to="/register" 
          className="text-[#a0a0a0] hover:text-white font-bold py-2 px-4 transition-colors"
        >
          Đăng ký
        </Link>
        <Link 
          to="/login" 
          className="bg-white text-black hover:scale-105 font-bold py-2 px-6 rounded-full transition-transform"
        >
          Đăng nhập
        </Link>
      </div>
    );
  }

  const displayAvatar = user.avatarUrl 
    ? (user.avatarUrl.startsWith('http') ? user.avatarUrl : `http://localhost:9000${user.avatarUrl}`)
    : null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Nút Avatar hiện chữ cái đầu tiên (vd: H) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-9 h-9 rounded-full bg-[#1ed760] hover:scale-105 transition-transform focus:outline-none overflow-hidden border-4 border-black"
      >
        {displayAvatar ? (
          <img src={displayAvatar} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <span className="text-black font-bold text-sm">
            {isLoggedIn ? getInitial() : <User size={18} className="text-black" />}
          </span>
        )}
      </button>

      {/* Menu Dropdown - Tự động đổi nội dung dựa trên isLoggedIn */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-[#282828] text-[#eaeaea] font-semibold text-sm rounded-md shadow-2xl py-1 z-50">

          {isLoggedIn ? (
            <>
              {/* Trạng thái 1: ĐÃ ĐĂNG NHẬP */}
              <div className="px-4 py-3 border-b border-[#3e3e3e] mb-1">
                <p className="text-white truncate text-base">{user.username}</p>
                <p className="text-xs text-[#a0a0a0] font-normal truncate">{user.email}</p>
              </div>

              {user.isAdmin && (
                <Link
                  to="/admin/dashboard"
                  onClick={() => setIsOpen(false)}
                  className="flex justify-between items-center px-4 py-3 hover:bg-[#3e3e3e] transition-colors text-[#00e6e6]"
                >
                  Quản lý hệ thống
                </Link>
              )}

              <Link
                to="/profile"
                onClick={() => setIsOpen(false)}
                className="flex justify-between items-center px-4 py-3 hover:bg-[#3e3e3e] transition-colors"
              >
                Hồ sơ
              </Link>
              
              {!user.isAdmin && (
                <Link
                  to="/register-artist"
                  onClick={() => setIsOpen(false)}
                  className="flex justify-between items-center px-4 py-3 hover:bg-[#3e3e3e] transition-colors text-[#1db954]"
                >
                  Trở thành Nghệ sĩ
                </Link>
              )}

              <Link
                to="/settings"
                onClick={() => setIsOpen(false)}
                className="flex justify-between items-center px-4 py-3 hover:bg-[#3e3e3e] transition-colors"
              >
                Cài đặt
              </Link>

              <div className="border-t border-[#3e3e3e] mt-1">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-3 hover:bg-[#3e3e3e] transition-colors"
                >
                  Đăng xuất
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Trạng thái 2: CHƯA ĐĂNG NHẬP */}
              <Link
                to="/login"
                onClick={() => setIsOpen(false)}
                className="flex items-center px-4 py-3 hover:bg-[#3e3e3e] transition-colors"
              >
                <LogIn size={18} className="mr-3" />
                Đăng nhập
              </Link>

              <Link
                to="/register"
                onClick={() => setIsOpen(false)}
                className="flex items-center px-4 py-3 hover:bg-[#3e3e3e] transition-colors"
              >
                <UserPlus size={18} className="mr-3" />
                Đăng ký tài khoản
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
