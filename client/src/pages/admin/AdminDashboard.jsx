/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../../utils/api';

const StatCard = ({ title, value, loading }) => (
  <div className="bg-[#121212] p-6 rounded-xl border border-[#333] shadow-lg flex flex-col justify-between">
    <h3 className="text-sm font-semibold text-[#a0a0a0] mb-2">{title}</h3>
    <p className="text-4xl font-bold text-white mb-2">
      {loading ? (
        <span className="inline-block w-24 h-9 bg-[#333] animate-pulse rounded" />
      ) : (
        typeof value === 'number' ? value.toLocaleString() : value
      )}
    </p>
  </div>
);

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSongs: 0,
    totalPlaylists: 0,
    pendingArtists: 0
  });
  const [chartData, setChartData] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [activitiesLoading, setActivitiesLoading] = useState(true);

  // Fetch thống kê tổng quan
  const fetchStats = async () => {
    try {
      const res = await api.get('/api/dashboard/stats');
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

  // Fetch dữ liệu streaming theo ngày (7 ngày gần nhất)
  const fetchStreamingStats = async () => {
    try {
      const res = await api.get('/api/dashboard/streaming-stats?days=7');
      if (res.ok) {
        const data = await res.json();
        setChartData(data);
      }
    } catch (error) {
      console.error('Lỗi khi lấy dữ liệu streaming:', error);
    } finally {
      setChartLoading(false);
    }
  };

  // Fetch các hoạt động cần xem xét gần đây
  const fetchRecentActivities = async () => {
    try {
      const res = await api.get('/api/dashboard/recent-activities');
      if (res.ok) {
        const data = await res.json();
        setRecentActivities(data);
      }
    } catch (error) {
      console.error('Lỗi khi lấy hoạt động gần đây:', error);
    } finally {
      setActivitiesLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchStreamingStats();
    fetchRecentActivities();
  }, []);

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
        <StatCard title="Total Users" value={stats.totalUsers} loading={loading} />
        <StatCard title="Total Songs" value={stats.totalSongs} loading={loading} />
        <StatCard title="Total Playlists" value={stats.totalPlaylists} loading={loading} />
        <StatCard title="Pending Artist Requests" value={stats.pendingArtists} loading={loading} />
      </div>

      {/* Biểu đồ streaming theo ngày */}
      <div className="bg-[#121212] p-6 rounded-xl border border-[#333] shadow-lg">
        <h3 className="text-lg font-bold text-white mb-6">Daily Streaming Traffic</h3>
        <div className="h-80 w-full">
          {chartLoading ? (
            <div className="h-full flex items-center justify-center text-[#a0a0a0]">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-[#00e6e6] border-t-transparent rounded-full animate-spin" />
                <span>Đang tải dữ liệu...</span>
              </div>
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-[#a0a0a0]">
              Chưa có dữ liệu streaming
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="date" stroke="#666" tick={{fill: '#a0a0a0', fontSize: 12}} tickLine={false} axisLine={false} />
                <YAxis stroke="#666" tick={{fill: '#a0a0a0', fontSize: 12}} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#181818', borderColor: '#333', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#00e6e6' }}
                  formatter={(value) => [value.toLocaleString(), 'Lượt stream']}
                />
                <Line
                  type="monotone"
                  dataKey="streams"
                  stroke="#00e6e6"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#00e6e6', strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#00e6e6', stroke: '#fff', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Bảng Recent Activities (Pending Songs + Artist Requests) */}
      <div className="bg-[#121212] p-6 rounded-xl border border-[#333] shadow-lg overflow-x-auto">
        <h3 className="text-lg font-bold text-white mb-6">Recent Activities</h3>
        {activitiesLoading ? (
          <div className="flex items-center justify-center py-12 text-[#a0a0a0]">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-[#00e6e6] border-t-transparent rounded-full animate-spin" />
              <span>Đang tải...</span>
            </div>
          </div>
        ) : recentActivities.length === 0 ? (
          <div className="text-center py-12 text-[#a0a0a0]">
            Không có hoạt động nào cần xem xét
          </div>
        ) : (
          <table className="w-full text-left text-sm text-[#a0a0a0]">
            <thead className="text-xs uppercase bg-[#181818] text-[#a0a0a0] border-b border-[#333]">
              <tr>
                <th className="px-4 py-3 font-semibold rounded-tl-lg">ID</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Item</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold rounded-tr-lg">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentActivities.map((activity, index) => (
                <tr
                  key={activity.id}
                  className={`border-b border-[#333] hover:bg-[#1a1a1a] transition-colors ${index === recentActivities.length - 1 ? 'border-0' : ''}`}
                >
                  <td className="px-4 py-4 text-white font-medium">{activity.id}</td>
                  <td className="px-4 py-4">{activity.type}</td>
                  <td className="px-4 py-4">{activity.item}</td>
                  <td className="px-4 py-4">
                    {getStatusBadge(activity.status)}
                  </td>
                  <td className="px-4 py-4">{activity.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
