import { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { api } from '../../utils/api';
import useClickOutside from '../../hooks/useClickOutside';

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error('Lỗi khi lấy thông báo:', error);
    }
  };

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return; // Không fetch nếu chưa đăng nhập!

    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchNotifications();

    // Polling mỗi 30 giây để kiểm tra thông báo mới
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Refetch khi mở dropdown
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (isOpen && userStr) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchNotifications();
    }
  }, [isOpen]);

  useClickOutside(dropdownRef, () => setIsOpen(false));

  const handleMarkAsRead = async (id) => {
    try {
      await api.put(`/api/notifications/${id}/read`);

      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Lỗi markAsRead:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put('/api/notifications/read-all');

      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Lỗi markAllAsRead:', error);
    }
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    return `${diffDays} ngày trước`;
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'artist_approved': return 'border-l-[#1db954]';
      case 'artist_rejected': return 'border-l-[#ff4d4f]';
      case 'new_album': return 'border-l-[#8b5cf6]';
      case 'new_song': return 'border-l-[#f59e0b]';
      default: return 'border-l-[#00e6e6]';
    }
  };

  const userStr = localStorage.getItem('user');
  if (!userStr) return null; // Ẩn luôn quả chuông nếu là khách!

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Nút Chuông */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-[#282828] text-[#a0a0a0] hover:text-white transition-colors"
      >
        <Bell size={20} />
        {/* Badge số thông báo chưa đọc */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-[#ff4d4f] rounded-full text-white text-[10px] font-bold px-1 border-2 border-black">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Menu xổ xuống */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-[#282828] border border-[#3e3e3e] rounded-md shadow-2xl py-2 z-50">
          <div className="px-4 py-2 border-b border-[#3e3e3e] flex items-center justify-between">
            <h3 className="font-bold text-white">Thông báo</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-1 text-xs text-[#00e6e6] hover:text-[#00c8c8] transition-colors font-semibold"
              >
                <CheckCheck size={14} />
                Đọc tất cả
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-[#666] text-sm">
                Chưa có thông báo nào
              </div>
            ) : (
              notifications.map((noti) => (
                <div
                  key={noti.id}
                  onClick={() => !noti.isRead && handleMarkAsRead(noti.id)}
                  className={`px-4 py-3 hover:bg-[#3e3e3e] cursor-pointer transition-colors border-b border-[#333] last:border-0 border-l-2 ${getTypeColor(noti.type)} ${!noti.isRead ? 'bg-white/5' : ''}`}
                >
                  <p className="text-sm text-[#eaeaea] leading-snug">{noti.message}</p>
                  <p className="text-[10px] text-[#a0a0a0] mt-1">{formatTime(noti.createdAt)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
