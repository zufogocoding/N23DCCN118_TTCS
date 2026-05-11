import React, { useState, useRef } from 'react';
import { Music, X } from 'lucide-react';

export default function CreatePlaylistModal({ isOpen, onClose, onSuccess }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setImage(null);
    setPreviewUrl(null);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');

      // Gửi dưới dạng JSON thay vì FormData vì Backend chưa cài đặt multer cho route này và DB chưa có cột lưu ảnh cover
      const payload = {
        title: title.trim() || 'My Playlist #1',
        description: description.trim(),
        userId: user.id
      };

      const res = await fetch('http://localhost:9000/api/playlists', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          // 'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        // Tải lại danh sách playlist qua callback onSuccess
        if (onSuccess) onSuccess();
        handleClose();
      } else {
        const data = await res.json();
        alert(data.error || 'Lỗi tạo playlist');
      }
    } catch (error) {
      console.error(error);
      alert('Không thể kết nối đến server');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100]">
      <div className="bg-[#282828] w-full max-w-[500px] rounded-xl shadow-2xl relative p-6">

        {/* Nút đóng */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-[#a0a0a0] hover:text-white"
        >
          <X size={24} />
        </button>

        <h2 className="text-xl font-bold text-white text-center mb-6">Create new playlist</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* Vùng chọn ảnh */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-36 h-36 bg-[#3e3e3e] hover:bg-[#4a4a4a] rounded-lg mx-auto flex flex-col items-center justify-center cursor-pointer transition-colors shadow-lg overflow-hidden group"
          >
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <>
                <Music size={40} className="text-[#a0a0a0] group-hover:text-white mb-2" />
                <span className="text-sm text-[#a0a0a0] group-hover:text-white">Choose photo</span>
              </>
            )}
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageChange}
            accept="image/*"
            className="hidden"
          />

          {/* Input Tên Playlist */}
          <input
            type="text"
            placeholder="My Playlist #1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-[#3e3e3e] text-white placeholder-[#a0a0a0] p-3 rounded-md focus:outline-none focus:ring-1 focus:ring-[#00e6e6] text-sm font-semibold"
          />

          {/* Textarea Mô tả */}
          <textarea
            placeholder="Add a description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows="3"
            className="w-full bg-[#3e3e3e] text-white placeholder-[#a0a0a0] p-3 rounded-md focus:outline-none focus:ring-1 focus:ring-[#00e6e6] text-sm resize-none"
          />

          {/* Nút hành động */}
          <div className="flex justify-end items-center gap-4 mt-2">
            <button
              type="button"
              onClick={handleClose}
              className="text-white font-bold text-sm hover:scale-105 transition-transform"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="bg-[#1ed760] text-black px-6 py-2 rounded-full font-bold text-sm hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
            >
              {isLoading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
