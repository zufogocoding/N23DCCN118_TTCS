/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { Camera, Edit2, Save, User as UserIcon, Calendar, MapPin, Mail, AlertCircle, CheckCircle2, Music } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [previewImage, setPreviewImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const navigate = useNavigate();

  async function fetchProfile() {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const res = await fetch('http://localhost:9000/api/users/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data);
        setFormData({
          displayName: data.displayName || data.username || '',
          dob: data.dob ? new Date(data.dob).toISOString().split('T')[0] : '',
          country: data.country || ''
        });
        
        // Cập nhật lại localStorage
        const lsUser = JSON.parse(localStorage.getItem('user') || '{}');
        localStorage.setItem('user', JSON.stringify({
          ...lsUser,
          username: data.username,
          displayName: data.displayName,
          avatarUrl: data.avatarUrl,
          isArtist: data.isArtist,
          artistName: data.artistName
        }));
      } else {
        const errorData = await res.json();
        if (res.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
        }
        setError(errorData.error || 'Không thể lấy thông tin profile');
      }
    } catch (err) { console.error(err);
      setError('Lỗi kết nối đến server');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Vui lòng chọn file ảnh hợp lệ');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('Kích thước ảnh không được vượt quá 5MB');
        return;
      }
      setSelectedFile(file);
      setPreviewImage(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const submitData = new FormData();
      submitData.append('displayName', formData.displayName);
      if (formData.dob) submitData.append('dob', formData.dob);
      if (formData.country) submitData.append('country', formData.country);
      if (selectedFile) submitData.append('avatar', selectedFile);

      const res = await fetch('http://localhost:9000/api/users/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: submitData
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setSuccess('Cập nhật thông tin thành công!');
        setIsEditing(false);
        setSelectedFile(null);
        
        // Dispatch custom event để các component khác (như UserDropdown) cập nhật UI
        window.dispatchEvent(new Event('profileUpdated'));
        
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'Cập nhật thất bại');
      }
    } catch (err) { console.error(err);
      setError('Lỗi kết nối đến server');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setPreviewImage(null);
    setSelectedFile(null);
    setFormData({
      displayName: user.displayName || user.username || '',
      dob: user.dob ? new Date(user.dob).toISOString().split('T')[0] : '',
      country: user.country || ''
    });
    setError('');
  };

  if (loading && !user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00e6e6]"></div>
      </div>
    );
  }

  const displayAvatar = previewImage || (user?.avatarUrl ? `http://localhost:9000${user.avatarUrl}` : "https://i.pravatar.cc/150?u=default");

  return (
    <div className="max-w-4xl mx-auto py-10 px-6">
      {/* Header Profile */}
      <div className="flex flex-col md:flex-row items-center md:items-end gap-8 mb-12">
        <div className="relative group">
          <img 
            src={displayAvatar} 
            alt="Profile Avatar" 
            className="w-48 h-48 rounded-full object-cover shadow-2xl border-4 border-[#333]"
          />
          {isEditing && (
            <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera size={32} className="text-white mb-2" />
              <input 
                type="file" 
                className="hidden" 
                accept="image/*"
                onChange={handleImageChange}
              />
            </label>
          )}
        </div>
        
        <div className="flex-1 text-center md:text-left">
          <h4 className="uppercase text-xs font-bold tracking-[0.2em] text-[#a0a0a0] mb-2">Hồ sơ người dùng</h4>
          <div className="flex items-center justify-center md:justify-start gap-3 mb-6">
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-[#a0a0a0]">
              {user?.artistName || user?.displayName || user?.username}
            </h1>
            {user?.isArtist && (
              <div className="flex items-center gap-1.5 bg-[#1db954]/10 border border-[#1db954]/30 px-3 py-1.5 rounded-full self-center">
                <Music size={16} className="text-[#1db954]" />
                <span className="text-[#1db954] text-xs font-bold">Nghệ sĩ</span>
              </div>
            )}
          </div>
          <div className="flex items-center justify-center md:justify-start gap-4 text-sm font-semibold">
            <span className="text-white">{user?.email}</span>
            <span className="text-[#a0a0a0]">•</span>
            <span className="text-[#a0a0a0]">Thành viên từ {new Date(user?.createdAt).getFullYear()}</span>
          </div>
        </div>

        {!isEditing && (
          <button 
            onClick={() => setIsEditing(true)}
            className="mt-6 md:mt-0 flex items-center gap-2 bg-[#1db954] hover:bg-[#1ed760] text-black font-bold py-3 px-6 rounded-full transition-all transform hover:scale-105"
          >
            <Edit2 size={18} /> Chỉnh sửa hồ sơ
          </button>
        )}
      </div>

      {/* Thông báo lỗi / thành công */}
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

      {/* Form chỉnh sửa hoặc Hiển thị thông tin */}
      <div className="bg-[#181818] p-8 rounded-2xl shadow-xl border border-[#333]">
        {isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#a0a0a0]">Tên hiển thị</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-3.5 text-[#666]" size={18} />
                  <input
                    type="text"
                    name="displayName"
                    value={formData.displayName}
                    onChange={handleInputChange}
                    className="w-full bg-[#2a2a2a] border border-[#444] rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-[#1db954] transition-colors"
                    placeholder="Nhập tên hiển thị"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-[#a0a0a0]">Tên đăng nhập (Không thể thay đổi)</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-3.5 text-[#666]" size={18} />
                  <input
                    type="text"
                    value={user?.username}
                    disabled
                    className="w-full bg-[#222] border border-[#333] rounded-lg py-3 pl-10 pr-4 text-[#666] cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-[#a0a0a0]">Ngày sinh</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3.5 text-[#666]" size={18} />
                  <input
                    type="date"
                    name="dob"
                    value={formData.dob}
                    onChange={handleInputChange}
                    className="w-full bg-[#2a2a2a] border border-[#444] rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-[#1db954] transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-[#a0a0a0]">Quốc gia</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3.5 text-[#666]" size={18} />
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    className="w-full bg-[#2a2a2a] border border-[#444] rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-[#1db954] transition-colors"
                    placeholder="Ví dụ: Việt Nam"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#a0a0a0]">Email (Không thể thay đổi)</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 text-[#666]" size={18} />
                  <input
                    type="email"
                    value={user?.email}
                    disabled
                    className="w-full bg-[#222] border border-[#333] rounded-lg py-3 pl-10 pr-4 text-[#666] cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-[#333]">
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-3 rounded-full font-bold text-white hover:text-[#a0a0a0] transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 bg-white hover:bg-gray-200 text-black font-bold py-3 px-8 rounded-full transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-black"></div>
                ) : (
                  <>
                    <Save size={18} /> Lưu thay đổi
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-[#222] p-6 rounded-xl flex items-center gap-4">
              <div className="bg-[#333] p-3 rounded-full text-[#1db954]">
                <Mail size={24} />
              </div>
              <div>
                <p className="text-xs text-[#a0a0a0] uppercase tracking-wider font-bold mb-1">Email</p>
                <p className="font-semibold text-lg text-white truncate">{user?.email}</p>
              </div>
            </div>

            <div className="bg-[#222] p-6 rounded-xl flex items-center gap-4">
              <div className="bg-[#333] p-3 rounded-full text-[#00e6e6]">
                <Calendar size={24} />
              </div>
              <div>
                <p className="text-xs text-[#a0a0a0] uppercase tracking-wider font-bold mb-1">Ngày sinh</p>
                <p className="font-semibold text-lg text-white">
                  {user?.dob ? new Date(user.dob).toLocaleDateString('vi-VN') : 'Chưa cập nhật'}
                </p>
              </div>
            </div>

            <div className="bg-[#222] p-6 rounded-xl flex items-center gap-4 md:col-span-2">
              <div className="bg-[#333] p-3 rounded-full text-[#ff4b4b]">
                <MapPin size={24} />
              </div>
              <div>
                <p className="text-xs text-[#a0a0a0] uppercase tracking-wider font-bold mb-1">Quốc gia</p>
                <p className="font-semibold text-lg text-white">
                  {user?.country || 'Chưa cập nhật'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
