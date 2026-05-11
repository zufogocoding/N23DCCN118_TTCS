import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic2, Upload, FileAudio, CheckCircle2, AlertCircle } from 'lucide-react';

export default function BecomeArtist() {
  const [formData, setFormData] = useState({ artistName: '' });
  const [idCardFile, setIdCardFile] = useState(null);
  const [demoTrackFile, setDemoTrackFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const navigate = useNavigate();

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

    if (!formData.artistName || !idCardFile || !demoTrackFile) {
      setError('Vui lòng điền đầy đủ thông tin và upload cả 2 file!');
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const submitData = new FormData();
      submitData.append('artistName', formData.artistName);
      submitData.append('idCard', idCardFile);
      submitData.append('demoTrack', demoTrackFile);

      const res = await fetch('http://localhost:9000/api/artist-requests/request', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: submitData
      });

      const resData = await res.json();

      if (res.ok) {
        setSuccess('Yêu cầu đã được gửi thành công! Quản trị viên sẽ xem xét sớm nhất.');
        setFormData({ artistName: '' });
        setIdCardFile(null);
        setDemoTrackFile(null);
      } else {
        setError(resData.error || 'Có lỗi xảy ra khi gửi yêu cầu');
      }
    } catch (err) {
      setError('Lỗi kết nối đến server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-10 px-6">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center p-4 bg-[#1db954]/10 rounded-full mb-4">
          <Mic2 size={40} className="text-[#1db954]" />
        </div>
        <h1 className="text-4xl font-black text-white mb-4 tracking-tight">Trở thành Nghệ sĩ</h1>
        <p className="text-[#a0a0a0]">Chia sẻ âm nhạc của bạn với hàng triệu người nghe trên toàn thế giới.</p>
      </div>

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
              <input type="file" className="hidden" accept="image/*" onChange={handleIdCardChange} required />
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
              <input type="file" className="hidden" accept="audio/*" onChange={handleDemoTrackChange} required />
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
              'Gửi yêu cầu xét duyệt'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
