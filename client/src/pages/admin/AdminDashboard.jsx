import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Mock Data cho biểu đồ
const chartData = [
  { date: 'Apr 7', users: 12000 },
  { date: 'Apr 8', users: 15000 },
  { date: 'Apr 9', users: 13000 },
  { date: 'Apr 10', users: 18000 },
  { date: 'Apr 11', users: 16000 },
  { date: 'Apr 12', users: 21000 },
  { date: 'Apr 13', users: 19000 },
];

// Mock Data cho bảng Reports
const recentReports = [
  { id: 'R-2847', type: 'Copyright', item: 'Song: "Midnight Dreams"', status: 'Under Review', date: '2026-04-13' },
  { id: 'R-2846', type: 'Inappropriate', item: 'Album: "Dark Nights"', status: 'Resolved', date: '2026-04-12' },
  { id: 'R-2845', type: 'Spam', item: 'User: @musicfan23', status: 'Under Review', date: '2026-04-12' },
  { id: 'R-2844', type: 'Copyright', item: 'Playlist: "Top Hits"', status: 'Dismissed', date: '2026-04-11' },
  { id: 'R-2843', type: 'Harassment', item: 'Comment on "Summer Vibes"', status: 'Resolved', date: '2026-04-11' },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSongs: 0,
    totalPlaylists: 0,
    pendingArtists: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Gọi API thực tế
      const res = await fetch('http://localhost:9000/api/dashboard/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Lỗi khi lấy dữ liệu thống kê:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, change }) => (
    <div className="bg-[#121212] p-6 rounded-xl border border-[#333] shadow-lg flex flex-col justify-between">
      <h3 className="text-sm font-semibold text-[#a0a0a0] mb-2">{title}</h3>
      <p className="text-4xl font-bold text-white mb-2">
        {loading ? '-' : value.toLocaleString()}
      </p>
      {/* Mock data thay đổi % theo tháng vì API hiện chưa hỗ trợ tính năng này */}
      <p className={`text-sm ${change.startsWith('+') ? 'text-[#00e6e6]' : 'text-[#00e6e6]'}`}>
        {change} from last month
      </p>
    </div>
  );

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Under Review':
        return <span className="px-3 py-1 rounded-full text-xs font-bold border border-yellow-500/50 text-yellow-500 bg-yellow-500/10">Under Review</span>;
      case 'Resolved':
        return <span className="px-3 py-1 rounded-full text-xs font-bold border border-[#00e6e6]/50 text-[#00e6e6] bg-[#00e6e6]/10">Resolved</span>;
      case 'Dismissed':
        return <span className="px-3 py-1 rounded-full text-xs font-bold border border-[#555]/50 text-[#a0a0a0] bg-[#333]/50">Dismissed</span>;
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div className="space-y-8 pb-10">
      
      {/* 4 Thẻ Thống kê */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Users" value={stats.totalUsers} change="+12.5%" />
        <StatCard title="Total Songs" value={stats.totalSongs} change="+3.2%" />
        <StatCard title="Total Playlists" value={stats.totalPlaylists} change="+8.7%" />
        <StatCard title="Pending Artist Requests" value={stats.pendingArtists} change="-15.4%" />
      </div>

      {/* Biểu đồ */}
      <div className="bg-[#121212] p-6 rounded-xl border border-[#333] shadow-lg">
        <h3 className="text-lg font-bold text-white mb-6">Daily Streaming Traffic</h3>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="date" stroke="#666" tick={{fill: '#a0a0a0', fontSize: 12}} tickLine={false} axisLine={false} />
              <YAxis stroke="#666" tick={{fill: '#a0a0a0', fontSize: 12}} tickLine={false} axisLine={false} tickFormatter={(value) => value > 0 ? value : 0} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#181818', borderColor: '#333', borderRadius: '8px', color: '#fff' }}
                itemStyle={{ color: '#00e6e6' }}
              />
              <Line 
                type="monotone" 
                dataKey="users" 
                stroke="#00e6e6" 
                strokeWidth={3} 
                dot={{ r: 4, fill: '#00e6e6', strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#00e6e6', stroke: '#fff', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bảng Recent Reports */}
      <div className="bg-[#121212] p-6 rounded-xl border border-[#333] shadow-lg overflow-x-auto">
        <h3 className="text-lg font-bold text-white mb-6">Recent Reports</h3>
        <table className="w-full text-left text-sm text-[#a0a0a0]">
          <thead className="text-xs uppercase bg-[#181818] text-[#a0a0a0] border-b border-[#333]">
            <tr>
              <th className="px-4 py-3 font-semibold rounded-tl-lg">ID</th>
              <th className="px-4 py-3 font-semibold">Type</th>
              <th className="px-4 py-3 font-semibold">Reported Item</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold rounded-tr-lg">Date</th>
            </tr>
          </thead>
          <tbody>
            {recentReports.map((report, index) => (
              <tr 
                key={report.id} 
                className={`border-b border-[#333] hover:bg-[#1a1a1a] transition-colors ${index === recentReports.length - 1 ? 'border-0' : ''}`}
              >
                <td className="px-4 py-4 text-white font-medium">{report.id}</td>
                <td className="px-4 py-4">{report.type}</td>
                <td className="px-4 py-4">{report.item}</td>
                <td className="px-4 py-4">
                  {getStatusBadge(report.status)}
                </td>
                <td className="px-4 py-4">{report.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
