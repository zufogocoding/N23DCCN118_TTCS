import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { api } from '../../utils/api';

export default function ReportModal({ isOpen, onClose, targetType, targetId }) {
  const [reason, setReason] = useState('COPYRIGHT');
  const [description, setDescription] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await api.post('/api/reports', {
        targetType,
        targetId,
        reason,
        description,
        proofUrl
      });

      if (res.ok) {
        alert('Đã gửi báo cáo thành công. Cảm ơn bạn đã đóng góp!');
        onClose();
        setDescription('');
        setProofUrl('');
        setReason('COPYRIGHT');
      } else {
        const data = await res.json();
        alert(data.error || 'Có lỗi xảy ra khi gửi báo cáo');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#282828] w-full max-w-md rounded-xl shadow-2xl border border-[#333] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-[#333]">
          <div className="flex items-center gap-2 text-[#ff4d4d]">
            <AlertTriangle size={20} />
            <h3 className="font-bold text-lg text-white">Báo cáo vi phạm</h3>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Lý do báo cáo</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-[#3e3e3e] text-white text-sm rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-[#00e6e6]"
            >
              <option value="COPYRIGHT">Vi phạm bản quyền</option>
              <option value="SPAM">Spam / Rác</option>
              <option value="HATE_SPEECH">Ngôn từ thù ghét / Quấy rối</option>
              <option value="INAPPROPRIATE">Nội dung không phù hợp</option>
              <option value="OTHER">Khác</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Chi tiết báo cáo</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Vui lòng mô tả rõ vấn đề..."
              rows={3}
              className="w-full bg-[#3e3e3e] text-white text-sm rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-[#00e6e6] resize-none"
            ></textarea>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Link chứng minh (Bắt buộc nếu vi phạm bản quyền)
            </label>
            <input
              type="url"
              value={proofUrl}
              onChange={(e) => setProofUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-[#3e3e3e] text-white text-sm rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-[#00e6e6]"
              required={reason === 'COPYRIGHT'}
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-gray-300 hover:text-white transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-[#ff4d4d] hover:bg-[#ff3333] text-white text-sm font-bold rounded-full transition disabled:opacity-50"
            >
              {loading ? 'Đang gửi...' : 'Gửi báo cáo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
