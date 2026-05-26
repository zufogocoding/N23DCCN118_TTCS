import { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { getArtistName, getCoverArt } from '../../utils/songHelpers';

export default function ManageCharts() {
  const [chartType, setChartType] = useState('DAILY');
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  const fetchChart = async (type) => {
    setLoading(true);
    try {
      const res = await api.get(`/api/charts/${type}`);
      if (res.ok) {
        const data = await res.json();
        setChartData(data);
      } else {
        setChartData(null);
      }
    } catch (error) {
      console.error('Error fetching chart:', error);
      setChartData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChart(chartType);
  }, [chartType]);

  const handleSyncChart = async () => {
    setIsSyncing(true);
    setSyncMessage('');
    try {
      const res = await api.post('/api/admin/charts/sync', { chartType });
      const data = await res.json();
      if (res.ok) {
        setSyncMessage(`Thành công: Đã cập nhật bảng xếp hạng ${chartType}.`);
        fetchChart(chartType); // reload data
      } else {
        setSyncMessage(`Lỗi: ${data.error || 'Đã có lỗi xảy ra.'}`);
      }
    } catch (error) {
      console.error('Lỗi đồng bộ chart:', error);
      setSyncMessage('Lỗi: Không thể kết nối tới server.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncMessage(''), 5000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Quản Lý Bảng Xếp Hạng</h1>
        
        <div className="flex items-center gap-4">
          <select 
            value={chartType} 
            onChange={(e) => setChartType(e.target.value)}
            className="bg-[#181818] border border-[#333] text-white rounded-lg px-4 py-2 outline-none focus:border-[#00e6e6]"
          >
            <option value="DAILY">Top 50 Ngày (Daily)</option>
            <option value="WEEKLY">Top 50 Tuần (Weekly)</option>
            <option value="MONTHLY">Top 50 Tháng (Monthly)</option>
          </select>
          <button 
            onClick={handleSyncChart}
            disabled={isSyncing}
            className="bg-[#00e6e6] text-black px-6 py-2 rounded-lg font-semibold hover:bg-[#00c4c4] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSyncing ? (
              <>
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                Đang xử lý...
              </>
            ) : (
              'Cập nhật Bảng Xếp Hạng'
            )}
          </button>
        </div>
      </div>

      {syncMessage && (
        <div className={`p-4 rounded-lg ${syncMessage.includes('Lỗi') ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-[#00e6e6]/10 text-[#00e6e6] border border-[#00e6e6]/20'}`}>
          {syncMessage}
        </div>
      )}

      <div className="bg-[#121212] p-6 rounded-xl border border-[#333] shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">
            {chartType === 'DAILY' ? 'Top 50 Ngày' : chartType === 'WEEKLY' ? 'Top 50 Tuần' : 'Top 50 Tháng'}
          </h2>
          <span className="text-sm text-[#a0a0a0]">
            Cập nhật lần cuối: {chartData?.updateAt ? new Date(chartData.updateAt).toLocaleString() : 'Chưa cập nhật'}
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#00e6e6]"></div>
          </div>
        ) : chartData?.songs?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#a0a0a0]">
              <thead className="text-xs uppercase bg-[#181818] text-[#a0a0a0] border-b border-[#333]">
                <tr>
                  <th className="px-4 py-3 font-semibold rounded-tl-lg w-16 text-center">Rank</th>
                  <th className="px-4 py-3 font-semibold">Bài Hát</th>
                  <th className="px-4 py-3 font-semibold text-center">Điểm (Score)</th>
                </tr>
              </thead>
              <tbody>
                {chartData.songs.map((chartItem) => (
                  <tr key={chartItem.songId} className="border-b border-[#333] hover:bg-[#1a1a1a] transition-colors">
                    <td className="px-4 py-4 text-center font-bold text-white">{chartItem.rank}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={getCoverArt(chartItem.song)} 
                          alt="cover" 
                          className="w-10 h-10 rounded-md object-cover"
                        />
                        <div>
                          <p className="text-white font-medium">{chartItem.song.title}</p>
                          <p className="text-xs text-[#a0a0a0]">{getArtistName(chartItem.song)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center font-medium text-[#00e6e6]">
                      {chartItem.totalScore}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-[#a0a0a0]">
            Bảng xếp hạng chưa có dữ liệu. Vui lòng ấn "Cập nhật Bảng Xếp Hạng" để tạo dữ liệu.
          </div>
        )}
      </div>
    </div>
  );
}
