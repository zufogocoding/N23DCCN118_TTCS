import { useState, useEffect } from 'react';
import { Check, X, User } from 'lucide-react';
import { api, getMediaUrl } from '../../utils/api';

export default function ArtistRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  async function fetchRequests() {
    try {
      const res = await api.get('/api/artist-requests/admin/pending');
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (error) {
      console.error('Lỗi khi lấy danh sách yêu cầu:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRequests();
  }, []);

  const handleAction = async (id, action) => {
    try {
      const endpoint = action === 'approve' 
        ? `/api/artist-requests/admin/${id}/approve`
        : `/api/artist-requests/admin/${id}/reject`;

      const res = await api.put(endpoint);

      if (res.ok) {
        // Xóa request khỏi danh sách hiển thị
        setRequests(requests.filter(req => req.id !== id));
      } else {
        const errData = await res.json();
        alert(errData.error || 'Có lỗi xảy ra');
      }
    } catch {
      alert('Lỗi kết nối đến server');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00e6e6]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Yêu cầu đăng ký Nghệ sĩ</h1>
        <p className="text-[#a0a0a0]">{requests.length} yêu cầu đang chờ duyệt</p>
      </div>

      {requests.length === 0 ? (
        <div className="bg-[#121212] border border-[#333] rounded-xl p-8 text-center text-[#a0a0a0]">
          Không có yêu cầu nào đang chờ duyệt.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {requests.map(req => {
            const displayAvatar = getMediaUrl(req.user.avatarUrl);

            return (
              <div key={req.id} className="bg-[#181818] border border-[#333] rounded-xl p-5 shadow-lg flex flex-col">
                {/* Header Card: Avatar, Name, ID */}
                <div className="flex items-center gap-4 mb-6">
                  {displayAvatar ? (
                    <img src={displayAvatar} alt="Avatar" className="w-14 h-14 rounded-full object-cover" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-[#333] flex items-center justify-center">
                      <User size={24} className="text-[#a0a0a0]" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-white font-bold text-lg">{req.artistName}</h3>
                    <p className="text-xs text-[#666]">AR-{req.id}</p>
                  </div>
                </div>

                {/* ID Card Display */}
                <div className="mb-4">
                  <p className="text-xs text-[#a0a0a0] mb-2 uppercase tracking-wide">ID Card</p>
                  <div className="w-full h-32 bg-[#121212] rounded-lg overflow-hidden border border-[#333]">
                    <img 
                      src={getMediaUrl(req.idCardUrl)} 
                      alt="ID Card" 
                      className="w-full h-full object-cover" 
                      onClick={() => window.open(getMediaUrl(req.idCardUrl), '_blank')}
                      style={{ cursor: 'pointer' }}
                    />
                  </div>
                </div>

                {/* Demo Track Player */}
                <div className="mb-6 flex-1">
                  <p className="text-xs text-[#a0a0a0] mb-2 uppercase tracking-wide">Demo Track</p>
                  <audio 
                    controls 
                    className="w-full h-10" 
                    controlsList="nodownload"
                    style={{ filter: 'invert(1)' }} // Trick nhỏ để biến audio player mặc định thành dark mode
                  >
                    <source src={getMediaUrl(req.demoTrackUrl)} type="audio/mpeg" />
                    Your browser does not support the audio element.
                  </audio>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3 mt-auto">
                  <button 
                    onClick={() => handleAction(req.id, 'approve')}
                    className="flex items-center justify-center gap-2 bg-[#00e6e6] hover:bg-[#00c8c8] text-black font-bold py-2 rounded-lg transition-colors"
                  >
                    <Check size={16} /> Duyệt
                  </button>
                  <button 
                    onClick={() => handleAction(req.id, 'reject')}
                    className="flex items-center justify-center gap-2 bg-[#222] hover:bg-[#333] border border-[#444] text-white font-bold py-2 rounded-lg transition-colors"
                  >
                    <X size={16} /> Từ chối
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
