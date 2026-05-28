import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic2, Upload, FileAudio, CheckCircle2, AlertCircle, Clock, XCircle, Music } from 'lucide-react';
import { api } from '../../utils/api';

export default function BecomeArtist() {
  const [formData, setFormData] = useState({ artistName: '' });
  const [idCardFile, setIdCardFile] = useState(null);
  const [demoTrackFile, setDemoTrackFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [requestStatus, setRequestStatus] = useState(null); // null, 'NO_REQUEST', 'PENDING', 'APPROVED', 'REJECTED', 'IS_ARTIST'
  const [statusData, setStatusData] = useState(null);
  
  const navigate = useNavigate();

  // Kiểm tra trạng thái yêu cầu khi vào trang
  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await api.get('/api/artist-requests/my-status');

        if (res.ok) {
          const data = await res.json();
          setRequestStatus(data.status);
          setStatusData(data);
        }
      } catch (err) {
        console.error('Lỗi kiểm tra trạng thái:', err);
      } finally {
        setPageLoading(false);
      }
    }

    checkStatus();
  }, [navigate]);

  const handleIdCardChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('ID Card phải là file ảnh hợp lệ!');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('File ảnh không được vượt quá 10MB!');
        return;
      }
      setIdCardFile(file);
      setError('');
    }
  };

  const handleDemoTrackChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('audio/')) {
        setError('Demo Track phải là file âm thanh hợp lệ!');
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        setError('File âm thanh không được vượt quá 15MB!');
        return;
      }
      setDemoTrackFile(file);
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (requestStatus !== 'REJECTED') {
      if (!formData.artistName || !idCardFile || !demoTrackFile) {
        setError('Vui lòng điền đầy đủ thông tin và upload cả 2 file!');
        setLoading(false);
        return;
      }
    } else {
      if (!formData.artistName && !idCardFile && !demoTrackFile) {
        setError('Vui lòng nhập nghệ danh hoặc đính kèm file mới để nộp lại!');
        setLoading(false);
        return;
      }
    }

    try {
      const submitData = new FormData();
      if (formData.artistName) submitData.append('artistName', formData.artistName);
      if (idCardFile) submitData.append('idCard', idCardFile);
      if (demoTrackFile) submitData.append('demoTrack', demoTrackFile);

      const res = requestStatus === 'REJECTED'
        ? await api.put('/api/artist-requests/resubmit', submitData)
        : await api.post('/api/artist-requests/request', submitData);

      const resData = await res.json();

      if (res.ok) {
        setSuccess(requestStatus === 'REJECTED' 
          ? 'Đã nộp lại hồ sơ thành công! Đang chờ Quản trị viên phê duyệt.' 
          : 'Yêu cầu đã được gửi thành công! Quản trị viên sẽ xem xét sớm nhất.'
        );
        setFormData({ artistName: '' });
        setIdCardFile(null);
        setDemoTrackFile(null);
        setRequestStatus('PENDING');
      } else {
        setError(resData.error || 'Có lỗi xảy ra khi gửi yêu cầu');
      }
    } catch (err) {
      console.error(err);
      setError('Lỗi kết nối đến server');
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1db954]"></div>
      </div>
    );
  }

  // Trạng thái: Đã là nghệ sĩ
  if (requestStatus === 'IS_ARTIST') {
    return (
      <div className="max-w-3xl mx-auto py-10 px-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center p-4 bg-[#1db954]/10 rounded-full mb-4">
            <Music size={40} className="text-[#1db954]" />
          </div>
          <h1 className="text-4xl font-black text-white mb-4 tracking-tight">Bạn đã là Nghệ sĩ!</h1>
          <p className="text-[#a0a0a0] mb-2">Nghệ danh: <span className="text-[#1db954] font-bold text-lg">{statusData?.artistName}</span></p>
          <p className="text-[#666] text-sm">Bạn đã được cấp quyền nghệ sĩ và có thể upload bài hát.</p>
          
          <div className="mt-8 bg-[#181818] border border-[#1db954]/30 rounded-2xl p-6 inline-block">
            <div className="flex items-center gap-3 text-[#1db954]">
              <CheckCircle2 size={24} />
              <span className="font-bold">Trạng thái: Đã duyệt</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Trạng thái: Đang chờ duyệt
  if (requestStatus === 'PENDING') {
    return (
      <div className="max-w-3xl mx-auto py-10 px-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center p-4 bg-yellow-500/10 rounded-full mb-4">
            <Clock size={40} className="text-yellow-500" />
          </div>
          <h1 className="text-4xl font-black text-white mb-4 tracking-tight">Đang chờ duyệt</h1>
          <p className="text-[#a0a0a0] mb-2">Nghệ danh đăng ký: <span className="text-yellow-500 font-bold text-lg">{statusData?.artistName}</span></p>
          <p className="text-[#666] text-sm">Yêu cầu của bạn đang được quản trị viên xem xét. Vui lòng kiên nhẫn chờ đợi.</p>
          
          <div className="mt-8 bg-[#181818] border border-yellow-500/30 rounded-2xl p-6 inline-block">
            <div className="flex items-center gap-3 text-yellow-500">
              <Clock size={24} className="animate-pulse" />
              <span className="font-bold">Trạng thái: Đang chờ xét duyệt</span>
            </div>
            {statusData?.createdAt && (
              <p className="text-[#666] text-xs mt-2">
                Gửi lúc: {new Date(statusData.createdAt).toLocaleString('vi-VN')}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Trạng thái: Bị từ chối (cho phép gửi lại) hoặc chưa gửi
  return (
    <div className="max-w-3xl mx-auto py-10 px-6">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center p-4 bg-[#1db954]/10 rounded-full mb-4">
          <Mic2 size={40} className="text-[#1db954]" />
        </div>
        <h1 className="text-4xl font-black text-white mb-4 tracking-tight">Trở thành Nghệ sĩ</h1>
        <p className="text-[#a0a0a0]">Chia sẻ âm nhạc của bạn với hàng triệu người nghe trên toàn thế giới.</p>
      </div>

      {/* Thông báo bị từ chối trước đó */}
      {requestStatus === 'REJECTED' && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-6 rounded-2xl space-y-3 mb-8">
          <div className="flex items-center gap-3">
            <XCircle size={24} className="text-red-500" />
            <p className="font-bold text-lg">Hồ sơ đăng ký của bạn đã bị từ chối</p>
          </div>
          {statusData?.rejectionReason && (
            <div className="bg-red-950/20 border border-red-500/20 p-4 rounded-xl text-sm text-red-300">
              <strong>Lý do từ chối từ Ban quản trị:</strong>
              <p className="mt-1 leading-relaxed italic">"{statusData.rejectionReason}"</p>
            </div>
          )}
          <p className="text-xs text-[#a0a0a0]">
            Vui lòng xem kỹ lý do từ chối trên, điều chỉnh thông tin nghệ danh hoặc đính kèm các tài liệu mới bên dưới và nộp lại đơn xét duyệt. Các tài liệu cũ của bạn vẫn được lưu giữ trên hệ thống trừ khi bạn tải lên tài liệu mới để thay thế.
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-lg flex items-center gap-3 mb-8">
          <AlertCircle size={20} />
          <p>{error}</p>
        </div>
      )}
      
      {success && (
        <div className="bg-[#1db954]/10 border border-[#1db954]/50 text-[#1db954] px-4 py-3 rounded-lg flex items-center gap-3 mb-8">
          <CheckCircle2 size={20} />
          <p>{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-[#181818] p-8 rounded-2xl shadow-xl border border-[#333] space-y-8">
        <div className="space-y-3">
          <label className="block text-sm font-bold text-[#a0a0a0] uppercase tracking-wider">Tên Nghệ sĩ / Nghệ danh</label>
          <input
            type="text"
            value={formData.artistName}
            onChange={(e) => setFormData({ ...formData, artistName: e.target.value })}
            placeholder="Ví dụ: Sơn Tùng M-TP"
            className="w-full bg-[#2a2a2a] border border-[#444] rounded-lg py-4 px-4 text-white focus:outline-none focus:border-[#1db954] transition-colors text-lg"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Upload ID Card */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-[#a0a0a0] uppercase tracking-wider">Ảnh chụp CCCD / Passport</label>
            <label className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${idCardFile ? 'border-[#1db954] bg-[#1db954]/5' : 'border-[#444] bg-[#2a2a2a] hover:bg-[#333] hover:border-[#666]'}`}>
              <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                {idCardFile ? (
                  <>
                    <CheckCircle2 size={32} className="text-[#1db954] mb-3" />
                    <p className="text-sm font-semibold text-white break-all">{idCardFile.name}</p>
                    <p className="text-xs text-[#a0a0a0] mt-1">Đã chọn thành công</p>
                  </>
                ) : (
                  <>
                    <Upload size={32} className="text-[#666] mb-3" />
                    <p className="text-sm text-[#a0a0a0]"><span className="font-semibold text-white">Click để chọn</span> hoặc kéo thả</p>
                    <p className="text-xs text-[#666] mt-2">PNG, JPG (Max. 10MB)</p>
                  </>
                )}
              </div>
              <input type="file" className="hidden" accept="image/*" onChange={handleIdCardChange} required={requestStatus !== 'REJECTED'} />
            </label>
          </div>

          {/* Upload Demo Track */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-[#a0a0a0] uppercase tracking-wider">Bản thu âm Demo (Audio)</label>
            <label className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${demoTrackFile ? 'border-[#00e6e6] bg-[#00e6e6]/5' : 'border-[#444] bg-[#2a2a2a] hover:bg-[#333] hover:border-[#666]'}`}>
              <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                {demoTrackFile ? (
                  <>
                    <FileAudio size={32} className="text-[#00e6e6] mb-3" />
                    <p className="text-sm font-semibold text-white break-all">{demoTrackFile.name}</p>
                    <p className="text-xs text-[#a0a0a0] mt-1">Đã chọn thành công</p>
                  </>
                ) : (
                  <>
                    <FileAudio size={32} className="text-[#666] mb-3" />
                    <p className="text-sm text-[#a0a0a0]"><span className="font-semibold text-white">Click để chọn</span> file nhạc</p>
                    <p className="text-xs text-[#666] mt-2">MP3, WAV (Max. 15MB)</p>
                  </>
                )}
              </div>
              <input type="file" className="hidden" accept="audio/*" onChange={handleDemoTrackChange} required={requestStatus !== 'REJECTED'} />
            </label>
          </div>
        </div>

        <div className="pt-6">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1db954] hover:bg-[#1ed760] text-black font-bold py-4 px-8 rounded-full text-lg transition-transform transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-black"></div>
            ) : (
              requestStatus === 'REJECTED' ? 'Gửi lại yêu cầu xét duyệt' : 'Gửi yêu cầu xét duyệt'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
