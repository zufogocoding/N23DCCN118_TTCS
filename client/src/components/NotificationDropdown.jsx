import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Dữ liệu mẫu thông báo
  const notifications = [
    { id: 1, text: "Nghệ sĩ Sơn Tùng M-TP vừa ra mắt bài hát mới.", time: "2 phút trước", isUnread: true },
    { id: 2, text: "Playlist 'Chill Vibes' của bạn có thêm người theo dõi.", time: "1 giờ trước", isUnread: true },
    { id: 3, text: "Chào mừng bạn quay trở lại Soundwave!", time: "5 giờ trước", isUnread: false },
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Nút Chuông */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-[#282828] text-[#a0a0a0] hover:text-white transition-colors"
      >
        <Bell size={20} />
        {/* Chấm đỏ báo hiệu có thông báo mới */}
        <span className="absolute top-2 right-2 w-2 h-2 bg-[#ff4d4f] rounded-full border-2 border-black"></span>
      </button>

      {/* Menu xổ xuống */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-[#282828] border border-[#3e3e3e] rounded-md shadow-2xl py-2 z-50">
          <div className="px-4 py-2 border-b border-[#3e3e3e]">
            <h3 className="font-bold text-white">Thông báo</h3>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.map((noti) => (
              <div
                key={noti.id}
                className={`px-4 py-3 hover:bg-[#3e3e3e] cursor-pointer transition-colors border-b border-[#333] last:border-0 ${noti.isUnread ? 'bg-white/5' : ''}`}
              >
                <p className="text-sm text-[#eaeaea] leading-snug">{noti.text}</p>
                <p className="text-[10px] text-[#a0a0a0] mt-1">{noti.time}</p>
              </div>
            ))}
          </div>

          <div className="px-4 py-2 text-center border-t border-[#3e3e3e]">
            <button className="text-xs text-[#00e6e6] hover:underline font-bold">Xem tất cả</button>
          </div>
        </div>
      )}
    </div>
  );
}
