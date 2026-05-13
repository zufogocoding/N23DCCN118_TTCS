import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Mic2, Music, Disc, ListMusic, Tags, Flag, Bell, ArrowLeft } from 'lucide-react';

export default function AdminLayout() {
  const navigate = useNavigate();

  const navItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Users', path: '/admin/users', icon: <Users size={20} /> },
    { name: 'Artists', path: '/admin/artists', icon: <Mic2 size={20} /> },
    { name: 'Songs', path: '/admin/songs', icon: <Music size={20} /> },
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
        
        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) => 
                `flex items-center gap-4 px-4 py-3 rounded-md transition-colors ${
                  isActive 
                    ? 'bg-[#1a2f2f] text-[#00e6e6] border-r-4 border-[#00e6e6]' 
                    : 'text-[#a0a0a0] hover:text-white hover:bg-[#1f1f1f]'
                }`
              }
            >
              {item.icon}
              <span className="font-semibold text-sm">{item.name}</span>
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
            {/* Tên page có thể truyền qua context hoặc match route, tạm thời để tĩnh */}
            Dashboard Overview
          </h2>
          
          <div className="flex items-center gap-6 text-sm text-[#a0a0a0]">
            <span>
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
              })}
            </span>
            <button className="relative p-2 rounded-full hover:bg-[#222] text-[#00e6e6] transition-colors">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
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
