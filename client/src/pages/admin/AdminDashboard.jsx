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

  // Trạng thái kích hoạt huấn luyện hệ thống AI
  const [trainingState, setTrainingState] = useState({
    loading: false,
    success: false,
    error: ''
  });

  const [mlStatus, setMlStatus] = useState('idle'); // 'idle', 'training', 'success', 'failed'
  
  // Chi tiết trạng thái huấn luyện (bao gồm lần cuối train, kết quả...)
  const [mlData, setMlData] = useState({
    status: 'idle',
    is_training: false,
    last_error: null,
    last_trained: null,
    last_status: 'none'
  });

  const formatVietnamTime = (isoString) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(date);
    } catch (e) {
      return isoString;
    }
  };

  // Fetch trạng thái huấn luyện thời gian thực từ ML Service
  const fetchMLStatus = async () => {
    try {
      const res = await api.get('/api/admin/recommendations/train/status');
      if (res.ok) {
        const data = await res.json();
        setMlStatus(data.status || 'idle');
        setMlData(data);
        if (data.status === 'success' || data.status === 'failed' || data.status === 'idle') {
          setTrainingState(prev => ({ ...prev, loading: false }));
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        setMlStatus('failed');
        setTrainingState({
          loading: false,
          success: false,
          error: errData.error || `Lỗi lấy trạng thái ML (HTTP ${res.status})`
        });
      }
    } catch (err) {
      console.error('Lỗi khi lấy trạng thái ML:', err);
      setMlStatus('failed');
      setTrainingState({
        loading: false,
        success: false,
        error: 'Lỗi kết nối khi lấy trạng thái ML'
      });
    }
  };

  // Gửi lệnh huấn luyện tới máy chủ ML
  const handleTrainModel = async () => {
    setTrainingState({ loading: true, success: false, error: '' });
    setMlStatus('training');
    try {
      const res = await api.post('/api/admin/recommendations/train');
      if (res.ok) {
        setTrainingState({ loading: true, success: true, error: '' });
        // Bắt đầu check trạng thái ngay lập tức
        fetchMLStatus();
      } else {
        const err = await res.json().catch(() => ({}));
        setTrainingState({ loading: false, success: false, error: err.error || 'Huấn luyện thất bại' });
        setMlStatus('failed');
      }
    } catch (err) {
      console.error(err);
      setTrainingState({ loading: false, success: false, error: 'Lỗi kết nối tới máy chủ ML' });
      setMlStatus('failed');
    }
  };

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
    fetchMLStatus(); // Kiểm tra trạng thái lúc tải trang
  }, []);

  // Polling check trạng thái huấn luyện khi đang trong tiến trình 'training'
  useEffect(() => {
    if (mlStatus === 'training') {
      const interval = setInterval(async () => {
        await fetchMLStatus();
      }, 1500); // Poll mỗi 1.5s thay vì 3s để phản hồi nhanh hơn
      return () => clearInterval(interval);
    }
    // Khi train vừa xong (success/failed), refresh lại toàn bộ stats
    if (mlStatus === 'success' || mlStatus === 'failed') {
      fetchStats();
      fetchStreamingStats();
    }
  }, [mlStatus]);

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

      {/* Bảng điều khiển kích hoạt Huấn Luyện AI */}
      <div className="bg-[#121212] p-6 rounded-xl border border-[#333] shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span>🤖 Trí tuệ nhân tạo & Đề xuất (AI Engine)</span>
            <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
              mlStatus === 'training' 
                ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30' 
                : mlStatus === 'success' 
                  ? 'bg-green-500/15 text-green-400 border border-green-500/30' 
                  : mlStatus === 'failed' 
                    ? 'bg-red-500/15 text-red-400 border border-red-500/30' 
                    : 'bg-white/5 text-[#a0a0a0] border border-white/10'
            }`}>
              {mlStatus === 'training' ? '● Đang chạy ngầm...' : mlStatus === 'success' ? '● Hoàn thành' : mlStatus === 'failed' ? '● Thất bại' : '● Sẵn sàng'}
            </span>
          </h3>
          <p className="text-[#a0a0a0] text-sm">
            Cập nhật ma trận tương tác Collaborative Filtering (ALS) & pgvector content nhúng ngầm qua Python FastAPI.
          </p>
          {mlStatus === 'training' && (
            <p className="text-yellow-400 text-xs font-bold animate-pulse mt-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-ping" />
              Tiến trình đang được tính toán trên máy chủ Python ML. Hệ thống vẫn hoạt động bình thường...
            </p>
          )}
          {mlStatus === 'success' && (
            <p className="text-green-400 text-xs font-bold mt-2 animate-bounce">
              ✅ Huấn luyện hoàn tất! Các gợi ý cá nhân hóa và tương đồng đã được cập nhật thành công.
            </p>
          )}
          {trainingState.error && (
            <p className="text-red-400 text-xs font-bold mt-2">
              ❌ {trainingState.error}
            </p>
          )}
          {mlData.last_trained && (
            <div className="mt-3 p-3 bg-white/5 border border-white/10 rounded-lg text-xs text-[#a0a0a0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 max-w-xl">
              <div>
                <span className="font-semibold text-white">Lần cuối cập nhật:</span>{' '}
                <span className="text-gray-300">{formatVietnamTime(mlData.last_trained)}</span>
              </div>
              <div className="flex items-center gap-1.5 font-bold">
                <span>Kết quả:</span>
                <span className={mlData.last_status === 'success' ? 'text-green-400' : 'text-red-400'}>
                  {mlData.last_status === 'success' ? 'Thành công' : mlData.last_status === 'failed' ? 'Thất bại' : 'Chưa rõ'}
                </span>
              </div>
            </div>
          )}
        </div>
        <button
          onClick={handleTrainModel}
          disabled={mlStatus === 'training'}
          className={`px-6 py-3.5 rounded-xl font-bold text-sm transition-all duration-300 flex items-center gap-2 shrink-0 ${
            mlStatus === 'training'
              ? 'bg-[#222] text-[#666] cursor-not-allowed border border-[#333]'
              : 'bg-transparent text-[#00e6e6] hover:bg-[#00e6e6]/10 border border-[#00e6e6]/30 hover:border-[#00e6e6] hover:shadow-lg hover:shadow-[#00e6e6]/5'
          }`}
        >
          {mlStatus === 'training' ? (
            <>
              <div className="w-4 h-4 border-2 border-gray-600 border-t-gray-400 rounded-full animate-spin" />
              <span>Đang huấn luyện...</span>
            </>
          ) : (
            <span>Kích hoạt Huấn luyện</span>
          )}
        </button>
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
