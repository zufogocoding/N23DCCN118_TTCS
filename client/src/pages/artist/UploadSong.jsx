/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useRef, useEffect } from "react";
import { Image, Music, Upload, CheckCircle, Loader2, ArrowLeft, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../../utils/api";

export default function UploadSong() {
  const navigate = useNavigate();
  const [coverImage, setCoverImage] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [title, setTitle] = useState("");
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isArtistUser = !!currentUser.isArtist;

  const [artistName, setArtistName] = useState(isArtistUser ? (currentUser.displayName || currentUser.username || "") : "");
  const [selectedGenreIds, setSelectedGenreIds] = useState([]);
  const [genres, setGenres] = useState([]);
  const [genreDropdownOpen, setGenreDropdownOpen] = useState(false);
  const genreRef = useRef(null);
  const [description, setDescription] = useState("");
  const [isOriginal, setIsOriginal] = useState(isArtistUser);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState("");
  const [myAlbums, setMyAlbums] = useState([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState("");

  // Duration detection
  const [durationMs, setDurationMs] = useState(0);

  // Fetch genres từ API
  useEffect(() => {
    api.get('/api/genres')
      .then(res => res.ok ? res.json() : [])
      .then(data => setGenres(data))
      .catch(err => console.error('Lỗi lấy genres:', err));
  }, []);

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    if (!u.id || !u.isArtist) {
      setMyAlbums([]);
      return;
    }
    api.get(`/api/artists/${u.id}/albums`)
      .then((r) => (r.ok ? r.json() : { albums: [] }))
      .then((data) => setMyAlbums(data.albums || []))
      .catch(() => setMyAlbums([]));
  }, []);

  // Đóng dropdown khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (genreRef.current && !genreRef.current.contains(e.target)) {
        setGenreDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleGenre = (id) => {
    setSelectedGenreIds(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };

  const removeGenre = (id) => {
    setSelectedGenreIds(prev => prev.filter(g => g !== id));
  };

  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCoverImage(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleAudioChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAudioFile(file);

      // Tự động detect duration
      const audio = new Audio();
      audio.src = URL.createObjectURL(file);
      audio.addEventListener('loadedmetadata', () => {
        setDurationMs(Math.round(audio.duration * 1000));
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!audioFile) {
      setError("Vui lòng chọn file nhạc!");
      return;
    }
    if (!title.trim()) {
      setError("Vui lòng nhập tên bài hát!");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("audioFile", audioFile);
      if (coverImage) formData.append("coverImage", coverImage);
      formData.append("title", title);
      formData.append("artistName", artistName);
      if (selectedGenreIds.length > 0) {
        formData.append("genreIds", JSON.stringify(selectedGenreIds));
      }
      formData.append("durationMs", durationMs.toString());
      if (selectedAlbumId) {
        formData.append("albumId", selectedAlbumId);
      }
      formData.append("isOriginal", isOriginal);

      // Sử dụng XMLHttpRequest để theo dõi progress
      const xhr = new XMLHttpRequest();

      await new Promise((resolve, reject) => {
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(percent);
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error("Upload thất bại"));
          }
        });

        xhr.addEventListener("error", () => reject(new Error("Lỗi kết nối")));

        const token = localStorage.getItem("token");
        xhr.open("POST", "/api/songs/upload");
        if (token) {
          xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        }
        xhr.send(formData);
      });

      setUploadSuccess(true);
    } catch (err) {
      console.error(err);
      setError(err.message || "Upload thất bại. Vui lòng thử lại.");
    } finally {
      setUploading(false);
    }
  };

  // Success state
  if (uploadSuccess) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold mb-3">Upload thành công!</h1>
          <p className="text-[#a0a0a0] mb-8">
            Bài hát <span className="text-white font-semibold">"{title}"</span> đã được gửi và đang chờ admin duyệt. 
            Bạn sẽ nhận được thông báo khi bài hát được phê duyệt.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setUploadSuccess(false);
                setTitle("");
                setArtistName(isArtistUser ? (currentUser.displayName || currentUser.username || "") : "");
                setSelectedGenreIds([]);
                setDescription("");
                setCoverImage(null);
                setCoverPreview(null);
                setAudioFile(null);
                setDurationMs(0);
                setUploadProgress(0);
                setSelectedAlbumId("");
                setIsOriginal(isArtistUser);
              }}
              className="px-6 py-3 rounded-full bg-[#222] text-white font-semibold hover:bg-[#333] transition-colors"
            >
              Upload thêm
            </button>
            <button
              onClick={() => navigate("/")}
              className="px-6 py-3 rounded-full bg-[#00e6e6] text-black font-bold hover:bg-[#00d0d0] transition-colors"
            >
              Về trang chủ
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex justify-center px-6 py-10">
      <div className="w-full max-w-3xl flex flex-col">

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[#a0a0a0] hover:text-white mb-6 w-fit transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="text-sm font-medium">Quay lại</span>
        </button>

        {/* TITLE */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            <span className="text-[#00e6e6]">Upload</span> bài hát
          </h1>
          <p className="text-[#a0a0a0] text-base">
            Chia sẻ âm nhạc của bạn với cộng đồng. Bài hát sẽ được duyệt trước khi xuất bản.
          </p>
        </div>

        {/* FORM */}
        <form
          onSubmit={handleSubmit}
          className="bg-[#121212] border border-[#222] rounded-2xl p-8 space-y-6"
        >
          {/* Error */}
          {error && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <X size={18} />
              {error}
            </div>
          )}

          {/* UPLOAD BOX */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* COVER */}
            <label className={`relative border-2 border-dashed rounded-2xl h-[200px] flex flex-col items-center justify-center cursor-pointer transition-all duration-300 overflow-hidden ${
              coverPreview 
                ? 'border-[#00e6e6]/50' 
                : 'border-[#2a2a2a] hover:border-[#00e6e6]/50 hover:bg-[#00e6e6]/5'
            }`}>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCoverChange}
              />

              {coverPreview ? (
                <>
                  <img src={coverPreview} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <p className="text-sm font-semibold text-white">Đổi ảnh bìa</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-full bg-[#00e6e6]/10 flex items-center justify-center mb-3">
                    <Image size={24} className="text-[#00e6e6]" />
                  </div>
                  <h3 className="text-lg font-bold mb-1">Ảnh bìa</h3>
                  <p className="text-[#666] text-sm">PNG, JPG (tùy chọn)</p>
                </>
              )}
            </label>

            {/* AUDIO */}
            <label className={`border-2 border-dashed rounded-2xl h-[200px] flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
              audioFile 
                ? 'border-emerald-500/50 bg-emerald-500/5' 
                : 'border-[#2a2a2a] hover:border-[#00e6e6]/50 hover:bg-[#00e6e6]/5'
            }`}>
              <input
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={handleAudioChange}
              />

              {audioFile ? (
                <>
                  <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
                    <CheckCircle size={24} className="text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-bold mb-1 text-emerald-400">File đã chọn</h3>
                  <p className="text-[#a0a0a0] text-sm text-center px-4 truncate max-w-full">{audioFile.name}</p>
                  {durationMs > 0 && (
                    <p className="text-[#666] text-xs mt-1">
                      Thời lượng: {Math.floor(durationMs / 60000)}:{String(Math.floor((durationMs % 60000) / 1000)).padStart(2, '0')}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-full bg-[#00e6e6]/10 flex items-center justify-center mb-3">
                    <Music size={24} className="text-[#00e6e6]" />
                  </div>
                  <h3 className="text-lg font-bold mb-1">File nhạc *</h3>
                  <p className="text-[#666] text-sm">MP3, WAV</p>
                </>
              )}
            </label>
          </div>

          {/* SONG TITLE */}
          <div>
            <label className="block mb-2 text-sm font-semibold text-[#a0a0a0]">
              Tên bài hát <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              placeholder="Nhập tên bài hát"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3.5 text-sm outline-none focus:border-[#00e6e6]/50 transition-colors placeholder-[#444]"
            />
          </div>

          {/* ARTIST */}
          <div>
            <label className="block mb-2 text-sm font-semibold text-[#a0a0a0]">
              Nghệ sĩ
            </label>

            <label className="flex items-center gap-2 mb-3 cursor-pointer w-fit">
              <input
                type="checkbox"
                checked={isOriginal}
                onChange={(e) => {
                  setIsOriginal(e.target.checked);
                  if (e.target.checked) {
                    setArtistName(currentUser.displayName || currentUser.username || "");
                  }
                }}
                className="w-4 h-4 rounded border-[#2a2a2a] bg-[#0a0a0a] text-[#00e6e6] focus:ring-[#00e6e6]"
              />
              <span className="text-sm text-white">Tôi là tác giả gốc (OG)</span>
            </label>

            <input
              type="text"
              placeholder={isArtistUser ? "Nhập tên nghệ sĩ (hoặc các nghệ sĩ hợp tác)" : "Nhập tên user"}
              value={isOriginal ? (artistName || currentUser.displayName || currentUser.username || "Tên nghệ sĩ") : artistName}
              onChange={(e) => setArtistName(e.target.value)}
              disabled={isOriginal}
              className={`w-full border rounded-xl px-4 py-3.5 text-sm outline-none transition-colors placeholder-[#444] ${
                isOriginal 
                  ? 'bg-[#1a1a1a] border-[#333] text-[#666] cursor-not-allowed' 
                  : 'bg-[#0a0a0a] border-[#2a2a2a] focus:border-[#00e6e6]/50 text-white'
              }`}
            />
          </div>

          {myAlbums.length > 0 && (
            <div>
              <label className="block mb-2 text-sm font-semibold text-[#a0a0a0]">
                Thêm vào album (tùy chọn)
              </label>
              <select
                value={selectedAlbumId}
                onChange={(e) => setSelectedAlbumId(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3.5 text-sm outline-none focus:border-[#00e6e6]/50 text-white"
              >
                <option value="">— Không chọn —</option>
                {myAlbums.map((al) => (
                  <option key={al.id} value={al.id}>
                    {al.title}
                  </option>
                ))}
              </select>
              <p className="text-xs text-[#666] mt-1">
                Bài sau khi được duyệt sẽ hiển thị trong album (nếu đã gán).
              </p>
            </div>
          )}

          {/* GENRE - Multi Select */}
          <div ref={genreRef} className="relative">
            <label className="block mb-2 text-sm font-semibold text-[#a0a0a0]">
              Thể loại
            </label>

            {/* Selected tags + trigger */}
            <div
              onClick={() => setGenreDropdownOpen(prev => !prev)}
              className={`w-full min-h-[48px] bg-[#0a0a0a] border rounded-xl px-3 py-2 flex flex-wrap items-center gap-2 cursor-pointer transition-colors ${
                genreDropdownOpen ? 'border-[#00e6e6]/50' : 'border-[#2a2a2a]'
              }`}
            >
              {selectedGenreIds.length === 0 && (
                <span className="text-[#444] text-sm">Chọn thể loại...</span>
              )}
              {selectedGenreIds.map(id => {
                const g = genres.find(x => x.id === id);
                if (!g) return null;
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 bg-[#00e6e6]/15 text-[#00e6e6] text-xs font-semibold px-2.5 py-1 rounded-lg"
                  >
                    {g.genreTag}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeGenre(id); }}
                      className="hover:text-white transition-colors ml-0.5"
                    >
                      <X size={12} />
                    </button>
                  </span>
                );
              })}

              {/* Chevron */}
              <svg
                className={`ml-auto w-4 h-4 text-[#666] transition-transform flex-shrink-0 ${
                  genreDropdownOpen ? 'rotate-180' : ''
                }`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {/* Dropdown list */}
            {genreDropdownOpen && (
              <div className="absolute z-50 mt-2 w-full max-h-60 overflow-y-auto bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl shadow-2xl py-1 scrollbar-thin">
                {genres.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-[#666]">Đang tải...</div>
                ) : (
                  genres.map(g => {
                    const isSelected = selectedGenreIds.includes(g.id);
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => toggleGenre(g.id)}
                        className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors ${
                          isSelected
                            ? 'bg-[#00e6e6]/10 text-[#00e6e6]'
                            : 'text-white hover:bg-[#222]'
                        }`}
                      >
                        <span>{g.genreTag}</span>
                        {isSelected && (
                          <svg className="w-4 h-4 text-[#00e6e6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* DESCRIPTION */}
          <div>
            <label className="block mb-2 text-sm font-semibold text-[#a0a0a0]">
              Mô tả
            </label>
            <textarea
              rows="4"
              placeholder="Viết gì đó về bài hát của bạn..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3.5 text-sm outline-none focus:border-[#00e6e6]/50 transition-colors resize-none placeholder-[#444]"
            />
          </div>

          {/* Progress Bar */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[#a0a0a0]">Đang upload...</span>
                <span className="text-[#00e6e6] font-semibold">{uploadProgress}%</span>
              </div>
              <div className="h-2 bg-[#222] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#00e6e6] to-[#00b8d4] rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* BUTTON */}
          <button
            type="submit"
            disabled={uploading}
            className={`w-full flex items-center justify-center gap-3 font-bold text-lg px-8 py-4 rounded-xl transition-all duration-300 ${
              uploading
                ? 'bg-[#333] text-[#666] cursor-not-allowed'
                : 'bg-gradient-to-r from-[#00e6e6] to-[#00b8d4] text-black hover:shadow-lg hover:shadow-[#00e6e6]/20 hover:scale-[1.01] active:scale-[0.99]'
            }`}
          >
            {uploading ? (
              <>
                <Loader2 size={22} className="animate-spin" />
                Đang upload...
              </>
            ) : (
              <>
                <Upload size={22} />
                Upload bài hát
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}