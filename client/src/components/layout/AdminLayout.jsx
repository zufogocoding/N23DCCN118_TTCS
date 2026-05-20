/* eslint-disable react-hooks/set-state-in-effect */
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Mic2, Music, Disc, ListMusic, Tags, Flag, Bell, ArrowLeft, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [pendingCount, setPendingCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  // Fetch pending count
  const fetchPendingCount = async () => {
    try {
      const res = await fetch('http://localhost:9000/api/admin/songs/pending/count');
      if (res.ok) {
        const data = await res.json();
        setPendingCount(data.count);
      }
    } catch (err) {
      console.error('Error fetching pending count:', err);
    }
  };

  useEffect(() => {
    fetchPendingCount();
    // Poll mỗi 30 giây
    const interval = setInterval(fetchPendingCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Refresh count khi navigate giữa các trang admin
  useEffect(() => {
    fetchPendingCount();
  }, [location.pathname]);

  // Tính page title dựa trên route
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('pending-songs')) return 'Pending Songs Review';
    if (path.includes('dashboard')) return 'Dashboard Overview';
    if (path.includes('users')) return 'User Management';
    if (path.includes('artists')) return 'Artist Requests';
    if (path.includes('songs')) return 'Song Management';
    if (path.includes('albums')) return 'Album Management';
    if (path.includes('playlists')) return 'Playlist Management';
    if (path.includes('genres')) return 'Genre Management';
    if (path.includes('reports')) return 'Reports';
    return 'Dashboard Overview';
  };

  const navItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Users', path: '/admin/users', icon: <Users size={20} /> },
    { name: 'Artists', path: '/admin/artists', icon: <Mic2 size={20} /> },
    { name: 'Songs', path: '/admin/songs', icon: <Music size={20} /> },
    { 
      name: 'Pending Songs', 
      path: '/admin/pending-songs', 
      icon: <Clock size={20} />,
      badge: pendingCount
    },
    { name: 'Albums', path: '/admin/albums', icon: <Disc size={20} /> },
    { name: 'Playlists', path: '/admin/playlists', icon: <ListMusic size={20} /> },
    { name: 'Genres', path: '/admin/genres', icon: <Tags size={20} /> },
    { name: 'Reports', path: '/admin/reports', icon: <Flag size={20} /> },
  ];

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-[#eaeaea] font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-[#121212] border-r border-[#333] flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-[#00e6e6]">System Manager</h1>
        </div>
        
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) => 
                `flex items-center gap-4 px-4 py-3 rounded-md transition-all duration-200 relative ${
                  isActive 
                    ? 'bg-[#1a2f2f] text-[#00e6e6] border-r-4 border-[#00e6e6] shadow-lg shadow-[#00e6e6]/5' 
                    : 'text-[#a0a0a0] hover:text-white hover:bg-[#1f1f1f]'
                }`
              }
            >
              {item.icon}
              <span className="font-semibold text-sm">{item.name}</span>
              {/* Badge */}
              {item.badge > 0 && (
                <span className="absolute right-3 min-w-[22px] h-[22px] flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold px-1.5 animate-pulse">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-[#333]">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-3 text-[#a0a0a0] hover:text-white px-4 py-2 w-full transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="font-semibold text-sm">Quay về App</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-[#333] flex items-center justify-between px-8 bg-[#121212]/80 backdrop-blur-sm z-10">
          <h2 className="text-xl font-bold text-white">
            {getPageTitle()}
          </h2>
          
          <div className="flex items-center gap-6 text-sm text-[#a0a0a0]">
            <span>
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
              })}
            </span>

            {/* Bell Notification Button */}
            <div className="relative">
              <button 
                onClick={() => {
                  if (pendingCount > 0) {
                    navigate('/admin/pending-songs');
                  }
                  setShowNotifDropdown(!showNotifDropdown);
                }}
                className="relative p-2 rounded-full hover:bg-[#222] text-[#00e6e6] transition-colors"
              >
                <Bell size={20} />
                {pendingCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 animate-pulse">
                    {pendingCount}
                  </span>
                )}
              </button>

              {/* Dropdown */}
              {showNotifDropdown && (
                <div className="absolute right-0 top-12 w-72 bg-[#1a1a1a] border border-[#333] rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="p-4 border-b border-[#333]">
                    <h3 className="font-bold text-white text-sm">Thông báo</h3>
                  </div>
                  <div className="p-4">
                    {pendingCount > 0 ? (
                      <button
                        onClick={() => {
                          navigate('/admin/pending-songs');
                          setShowNotifDropdown(false);
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-lg bg-[#00e6e6]/10 border border-[#00e6e6]/20 hover:bg-[#00e6e6]/20 transition-colors text-left"
                      >
                        <div className="w-10 h-10 rounded-full bg-[#00e6e6]/20 flex items-center justify-center flex-shrink-0">
                          <Music size={18} className="text-[#00e6e6]" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {pendingCount} bài hát chờ duyệt
                          </p>
                          <p className="text-xs text-[#a0a0a0] mt-0.5">
                            Click để review ngay
                          </p>
                        </div>
                      </button>
                    ) : (
                      <p className="text-sm text-[#666] text-center py-4">
                        Không có thông báo mới
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </div>
      </main>

      {/* Click outside to close dropdown */}
      {showNotifDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowNotifDropdown(false)}
        />
      )}
    </div>
  );
}
