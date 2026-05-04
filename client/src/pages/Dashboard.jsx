import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Users, Mic2, Music, Disc, 
  ListMusic, Tags, Flag, Bell 
} from 'lucide-react';

// --- COMPONENT: THẺ THỐNG KÊ (AN TOÀN TUYỆT ĐỐI) ---
const StatCard = ({ title, value, change, isNegative, isLoading }) => {
  // Ép kiểu mọi thứ về số (Number), nếu lỗi thì mặc định là 0. Chống sập web 100%
  const safeValue = Number(value) || 0;

  return (
    <div className="bg-[#1a1a1a] p-6 rounded-lg border border-[#333] flex-1 min-w-[200px] transition-colors hover:bg-[#222]">
      <h3 className="text-[#a0a0a0] text-sm font-normal mb-4">
        {title}
      </h3>
      <div className="text-white text-3xl font-bold mb-2">
        {isLoading ? "..." : safeValue.toLocaleString('en-US')} 
      </div>
      <div className={`text-sm ${isNegative ? 'text-[#ff4d4f]' : 'text-[#00e6e6]'}`}>
        {change}
      </div>
    </div>
  );
};

// --- COMPONENT CHÍNH: DASHBOARD ---
export default function Dashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSongs: 0,
    totalPlaylists: 0,
    pendingArtists: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  // GỌI API TỪ BACKEND
  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const response = await fetch('http://localhost:9000/api/dashboard/stats');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        } else {
          console.error("Lỗi API, Backend không trả về dữ liệu đúng chuẩn.");
        }
      } catch (error) {
        console.error("Lỗi kết nối Server. Bạn đã bật Backend (cổng 9000) chưa?", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardStats();
  }, []);

  const menuItems = [
    { icon: Users, label: 'Users' },
    { icon: Mic2, label: 'Artists' },
    { icon: Music, label: 'Songs' },
    { icon: Disc, label: 'Albums' },
    { icon: ListMusic, label: 'Playlists' },
    { icon: Tags, label: 'Genres' },
    { icon: Flag, label: 'Reports' },
  ];

  return (
    <div className="flex h-screen bg-[#0f0f0f] text-white font-sans overflow-hidden">
      
      {/* 1. SIDEBAR (THANH MENU TRÁI) */}
      <div className="w-[250px] bg-[#141414] border-r border-[#222] flex flex-col shrink-0">
        <div className="p-6 text-xl font-bold text-[#00e6e6]">
          System Manager
        </div>
        <nav className="flex flex-col gap-2 px-4">
          <div className="flex items-center gap-3 px-4 py-3 bg-[#00e6e6]/10 border-r-[3px] border-[#00e6e6] text-[#00e6e6] cursor-pointer rounded-l transition-all">
            <LayoutDashboard size={20} /> 
            <span className="font-medium">Dashboard</span>
          </div>
          {menuItems.map((item, index) => (
            <div key={index} className="flex items-center gap-3 px-4 py-3 text-[#a0a0a0] hover:text-white hover:bg-white/5 cursor-pointer rounded transition-all">
              <item.icon size={20} /> 
              <span>{item.label}</span>
            </div>
          ))}
        </nav>
      </div>

      {/* 2. MAIN CONTENT (NỘI DUNG CHÍNH) */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-semibold m-0">Dashboard Overview</h1>
          <div className="flex items-center gap-6 text-[#a0a0a0]">
            <span className="text-sm">Monday, April 13, 2026</span>
            <div className="p-2 bg-[#1a1a1a] rounded-full text-[#00e6e6] cursor-pointer hover:bg-[#222] transition-colors border border-[#333]">
              <Bell size={20} />
            </div>
          </div>
        </div>

        {/* 4 THẺ THỐNG KÊ */}
        <div className="flex gap-6 flex-wrap mb-8">
          <StatCard title="Total Users" value={stats.totalUsers} change="+12.5% from last month" isLoading={isLoading} />
          <StatCard title="Total Songs" value={stats.totalSongs} change="+3.2% from last month" isLoading={isLoading} />
          <StatCard title="Total Playlists" value={stats.totalPlaylists} change="+8.7% from last month" isLoading={isLoading} />
          <StatCard title="Pending Artist Requests" value={stats.pendingArtists} change="-15.4% from last month" isNegative={true} isLoading={isLoading} /> 
        </div>

        <div className="h-[300px] bg-[#1a1a1a] rounded-lg border border-[#333] flex items-center justify-center text-[#666]">
          (Khu vực Biểu đồ - Dành cho Part 2)
        </div>
      </div>
    </div>
  );
}