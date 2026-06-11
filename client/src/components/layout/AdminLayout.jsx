import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Mic2, Music, Disc, ListMusic, Tags, Flag, Bell, ArrowLeft, Clock, BarChart, Settings } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { api } from '../../utils/api';
import useClickOutside from '../../hooks/useClickOutside';
import NotificationDropdown from '../common/NotificationDropdown';

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [pendingCount, setPendingCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const dropdownRef = useRef(null);
  
  useClickOutside(dropdownRef, () => setShowNotifDropdown(false));

  // Fetch pending count
  const fetchPendingCount = async () => {
    try {
      const res = await api.get('/api/admin/songs/pending/count');
      if (res.ok) {
        const data = await res.json();
        setPendingCount(data.count);
      }
    } catch (err) {
      console.error('Error fetching pending count:', err);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPendingCount();
    // Poll mỗi 30 giây
    const interval = setInterval(fetchPendingCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Refresh count khi navigate giữa các trang admin
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    if (path.includes('system-playlists')) return 'System Playlists';
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
    { name: 'System Playlists', path: '/admin/system-playlists', icon: <Settings size={20} /> },
    { name: 'Genres', path: '/admin/genres', icon: <Tags size={20} /> },
    { name: 'Charts', path: '/admin/charts', icon: <BarChart size={20} /> },
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

            <NotificationDropdown />
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
