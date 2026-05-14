import { useState, useRef } from "react";
import { Image, Music, Upload, CheckCircle, Loader2, ArrowLeft, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function UploadSong() {
  const navigate = useNavigate();
  const [coverImage, setCoverImage] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [title, setTitle] = useState("");
  const [artistName, setArtistName] = useState("");
  const [genre, setGenre] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState("");

  // Duration detection
  const [durationMs, setDurationMs] = useState(0);

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
      formData.append("genre", genre);
      formData.append("durationMs", durationMs.toString());

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

        xhr.open("POST", "http://localhost:9000/api/songs/upload");
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
                setArtistName("");
                setGenre("");
                setDescription("");
                setCoverImage(null);
                setCoverPreview(null);
                setAudioFile(null);
                setDurationMs(0);
                setUploadProgress(0);
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
            <input
              type="text"
              placeholder="Nhập tên nghệ sĩ"
              value={artistName}
              onChange={(e) => setArtistName(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3.5 text-sm outline-none focus:border-[#00e6e6]/50 transition-colors placeholder-[#444]"
            />
          </div>

          {/* GENRE */}
          <div>
            <label className="block mb-2 text-sm font-semibold text-[#a0a0a0]">
              Thể loại
            </label>
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3.5 text-sm outline-none focus:border-[#00e6e6]/50 transition-colors text-white"
            >
              <option value="">Chọn thể loại</option>
              <option value="Pop">Pop</option>
              <option value="Rock">Rock</option>
              <option value="Hip Hop">Hip Hop</option>
              <option value="Lo-fi">Lo-fi</option>
              <option value="EDM">EDM</option>
              <option value="R&B">R&B</option>
              <option value="Jazz">Jazz</option>
              <option value="Classical">Classical</option>
            </select>
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