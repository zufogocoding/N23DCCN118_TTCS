import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3, ArrowLeft, Play, AlertCircle, TrendingUp, Music, Percent,
  Activity, Award, Clock
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { api, getMediaUrl } from '../../utils/api';

export default function AnalyticsDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await api.get('/api/artists/analytics');
        if (res.ok) {
          const resData = await res.json();
          setData(resData);
        } else {
          const errData = await res.json();
          setError(errData.error || 'Không thể lấy dữ liệu thống kê');
        }
      } catch (err) {
        console.error(err);
        setError('Lỗi kết nối đến máy chủ');
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#121212] text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00e6e6]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-10 px-6 text-center text-white">
        <div className="inline-flex items-center justify-center p-4 bg-red-500/10 rounded-full mb-4">
          <AlertCircle size={40} className="text-red-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Đã xảy ra lỗi</h1>
        <p className="text-[#a0a0a0] mb-6">{error}</p>
        <button
          onClick={() => navigate(-1)}
          className="bg-[#222] hover:bg-[#333] border border-[#444] text-white font-bold py-2.5 px-6 rounded-full transition-colors flex items-center gap-2 mx-auto"
        >
          <ArrowLeft size={16} /> Quay lại
        </button>
      </div>
    );
  }

  const {
    playTrend,
    averageCompletionRate,
    skipRate,
    topSongs,
    totalSongs,
    totalPlays
  } = data || {
    playTrend: [],
    averageCompletionRate: 0,
    skipRate: 0,
    topSongs: [],
    totalSongs: 0,
    totalPlays: 0
  };

  // Định dạng hiển thị tỷ lệ
  const formatPercent = (val) => `${(val * 100).toFixed(1)}%`;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 md:px-8 text-white space-y-8 min-h-screen pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors border border-white/10"
            title="Quay lại"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl md:text-4xl font-black tracking-tight flex items-center gap-3">
              <BarChart3 className="text-[#00e6e6]" />
              Thống Kê Hiệu Năng
            </h1>
            <p className="text-[#a0a0a0] text-sm mt-1">Phân tích số liệu và xu hướng phát nhạc của bạn</p>
          </div>
        </div>
      </div>

      {/* Grid thẻ số liệu tổng hợp */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tổng bài hát */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-4 hover:border-white/20 transition-all backdrop-blur-md">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 shrink-0">
            <Music size={24} />
          </div>
          <div>
            <p className="text-[#a0a0a0] text-xs font-bold uppercase tracking-wider">Tổng Tác Phẩm</p>
            <h3 className="text-2xl font-black mt-1">{totalSongs}</h3>
          </div>
        </div>

        {/* Tổng lượt nghe */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-4 hover:border-white/20 transition-all backdrop-blur-md">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
            <Play size={24} />
          </div>
          <div>
            <p className="text-[#a0a0a0] text-xs font-bold uppercase tracking-wider">Lượt Nghe</p>
            <h3 className="text-2xl font-black mt-1">{totalPlays.toLocaleString()}</h3>
          </div>
        </div>

        {/* Tỷ lệ giữ chân người nghe */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-4 hover:border-white/20 transition-all backdrop-blur-md" title="Mức độ nghe hết bài của khán giả trên các lượt phát không bị skip.">
          <div className="w-12 h-12 rounded-xl bg-[#00e6e6]/10 flex items-center justify-center text-[#00e6e6] shrink-0">
            <Percent size={24} />
          </div>
          <div>
            <p className="text-[#a0a0a0] text-xs font-bold uppercase tracking-wider">Giữ Chân Khán Giả</p>
            <h3 className="text-2xl font-black mt-1">{formatPercent(averageCompletionRate)}</h3>
          </div>
        </div>

        {/* Tỷ lệ bỏ qua */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-4 hover:border-white/20 transition-all backdrop-blur-md" title="Tỷ lệ người dùng nhấn Next qua bài hát của bạn trước khi nghe đủ 30 giây.">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400 shrink-0">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-[#a0a0a0] text-xs font-bold uppercase tracking-wider">Tỷ Lệ Bỏ Qua (Skip)</p>
            <h3 className="text-2xl font-black mt-1">{formatPercent(skipRate)}</h3>
          </div>
        </div>
      </div>

      {/* Biểu đồ xu hướng phát nhạc */}
      <div className="bg-[#181818] border border-white/5 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="text-[#00e6e6]" size={20} />
          <h2 className="text-lg font-bold">Lượt Phát Trong 30 Ngày Qua</h2>
        </div>
        <div className="w-full h-80">
          {playTrend.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-gray-500 italic">
              Không có dữ liệu lượt nghe trong thời gian này
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={playTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPlays" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00e6e6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#00e6e6" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="date" stroke="#666" fontSize={11} tickLine={false} />
                <YAxis stroke="#666" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#222', border: '1px solid #444', borderRadius: '8px' }}
                  labelClassName="text-gray-400 text-xs font-bold"
                  itemStyle={{ color: '#00e6e6', fontSize: '13px' }}
                />
                <Area type="monotone" dataKey="count" name="Lượt nghe" stroke="#00e6e6" strokeWidth={2} fillOpacity={1} fill="url(#colorPlays)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top 5 bài hát thịnh hành */}
      <div className="bg-[#181818] border border-white/5 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-6">
          <Award className="text-yellow-500" size={20} />
          <h2 className="text-lg font-bold">Top 5 Bài Hát Thịnh Hành</h2>
        </div>

        {topSongs.length === 0 ? (
          <div className="py-8 text-center text-gray-500 italic">Bạn chưa có tác phẩm nào được duyệt</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-white/5 text-gray-400 text-xs uppercase tracking-wider">
                  <th className="py-3 px-4"># Tác phẩm</th>
                  <th className="py-3 px-4 text-right">Lượt Nghe</th>
                  <th className="py-3 px-4 text-center">Giữ chân khán giả</th>
                  <th className="py-3 px-4 text-center">Tỷ lệ bỏ qua</th>
                </tr>
              </thead>
              <tbody>
                {topSongs.map((song, idx) => (
                  <tr key={song.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-4 px-4 flex items-center gap-3">
                      <span className="font-bold text-gray-500 w-4">{idx + 1}</span>
                      <img
                        src={getMediaUrl(song.coverArtUrl) || 'https://images.unsplash.com/photo-1598387993441-a364f854c3e1?q=80&w=150'}
                        alt=""
                        className="w-10 h-10 rounded object-cover shadow"
                      />
                      <span className="font-bold text-white max-w-[200px] truncate">{song.title}</span>
                    </td>
                    <td className="py-4 px-4 text-right font-semibold text-emerald-400">
                      {song.playCount.toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="inline-flex items-center gap-2">
                        <span className="text-xs font-medium text-[#00e6e6]">{formatPercent(song.averageCompletionRate)}</span>
                        <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden hidden sm:block">
                          <div
                            className="bg-[#00e6e6] h-full rounded-full"
                            style={{ width: `${song.averageCompletionRate * 100}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="inline-flex items-center gap-2">
                        <span className="text-xs font-medium text-red-400">{formatPercent(song.skipRate)}</span>
                        <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden hidden sm:block">
                          <div
                            className="bg-red-500 h-full rounded-full"
                            style={{ width: `${song.skipRate * 100}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
