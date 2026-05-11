import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Settings, LogOut, Mic } from 'lucide-react';

export default function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Lấy thông tin user từ localStorage (đã lưu lúc login)
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  // Xử lý đóng dropdown khi click ra ngoài
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
    navigate('/login');
  };

  if (!user) {
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

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Nút Avatar */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-[#1a1a1a] border border-[#333] hover:border-[#00e6e6] transition-colors focus:outline-none overflow-hidden"
      >
        {user.avatar ? (
          <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <User size={20} className="text-[#ccc]" />
        )}
      </button>

      {/* Menu Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-56 bg-[#0f0f0f] border border-[#333] rounded-lg shadow-xl py-2 z-50">

          {/* Thông tin User */}
          <div className="px-4 py-3 border-b border-[#333]">
            <p className="text-sm font-bold text-white truncate">{user.username || 'Người dùng'}</p>
            <p className="text-xs text-[#888] truncate">{user.email || ''}</p>
          </div>

          {/* Các tùy chọn */}
          <div className="py-2">
            <Link
              to="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center px-4 py-2 text-sm text-[#ccc] hover:bg-[#1a1a1a] hover:text-white transition-colors"
            >
              <User size={16} className="mr-3" />
              Hồ sơ cá nhân
            </Link>

            <Link
              to="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center px-4 py-2 text-sm text-[#ccc] hover:bg-[#1a1a1a] hover:text-white transition-colors"
            >
              <Settings size={16} className="mr-3" />
              Chỉnh sửa thông tin
            </Link>

            <Link
              to="/register-artist"
              onClick={() => setIsOpen(false)}
              className="flex items-center px-4 py-2 text-sm text-[#00e6e6] hover:bg-[#1a1a1a] transition-colors"
            >
              <Mic size={16} className="mr-3" />
              Trở thành nghệ sĩ
            </Link>
          </div>

          {/* Đăng xuất */}
          <div className="border-t border-[#333] py-2 pb-0">
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-2 text-sm text-[#ff4d4f] hover:bg-[#1a1a1a] transition-colors text-left"
            >
              <LogOut size={16} className="mr-3" />
              Đăng xuất
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
