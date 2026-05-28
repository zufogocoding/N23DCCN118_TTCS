import { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert, RefreshCw, X, AlertTriangle, CheckCircle, Clock,
  Filter, ExternalLink, MessageSquare, Ban
} from 'lucide-react';
import { api, getMediaUrl } from '../../utils/api';

// ── Status Badge ─────────────────────────────────────────────────────────────
const STATUS_MAP = {
  PENDING: { label: 'Chờ xử lý', cls: 'bg-amber-500/15 border-amber-500/40 text-amber-400', icon: <Clock size={10} /> },
  RESOLVED: { label: 'Đã xử lý', cls: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400', icon: <CheckCircle size={10} /> },
  REJECTED: { label: 'Đã bác bỏ', cls: 'bg-red-500/15 border-red-500/40 text-red-400', icon: <Ban size={10} /> },
};

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.PENDING;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${s.cls}`}>
      {s.icon}{s.label}
    </span>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border text-sm font-medium animate-fade-in
      ${toast.type === 'success'
        ? 'bg-emerald-900/90 border-emerald-500/50 text-emerald-300'
        : 'bg-red-900/90 border-red-500/50 text-red-300'}`}
    >
      {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
      {toast.message}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ManageReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [selectedReport, setSelectedReport] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [targetTypeFilter, setTargetTypeFilter] = useState('ALL');

  // UI state
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const fetchReports = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page, limit: 15,
        status: statusFilter
      });
      if (targetTypeFilter !== 'ALL') params.append('targetType', targetTypeFilter);
      
      const res = await api.get(`/api/admin/reports?${params}`);
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
        setPagination(data.pagination || { total: 0, page: 1, totalPages: 1 });
      } else {
        showToast('Không thể tải danh sách báo cáo', 'error');
      }
    } catch {
      showToast('Lỗi kết nối server', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, targetTypeFilter, showToast]);

  useEffect(() => {
    fetchReports(1);
  }, [fetchReports]);

  // Actions
  const handleResolve = async (id) => {
    if (!window.confirm("Bạn chắc chắn muốn XỬ LÝ vi phạm này? Bài hát sẽ bị ẩn và gửi cảnh cáo cho Artist.")) return;
    setActionLoading(true);
    try {
      const res = await api.put(`/api/admin/reports/${id}/resolve`);
      const data = await res.json();
      if (res.ok) {
        showToast(data.message);
        fetchReports(pagination.page);
      } else {
        showToast(data.error || 'Lỗi khi xử lý', 'error');
      }
    } catch {
      showToast('Lỗi kết nối server', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm("Bạn chắc chắn muốn BÁC BỎ báo cáo này?")) return;
    setActionLoading(true);
    try {
      const res = await api.put(`/api/admin/reports/${id}/reject`);
      const data = await res.json();
      if (res.ok) {
        showToast(data.message);
        fetchReports(pagination.page);
      } else {
        showToast(data.error || 'Lỗi khi bác bỏ', 'error');
      }
    } catch {
      showToast('Lỗi kết nối server', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes fade-in  { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in  { animation: fade-in 0.2s ease; }
      `}</style>

      <div className="space-y-5 pb-10">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <ShieldAlert className="text-[#ff0055]" /> Report Management
            </h2>
            <p className="text-[#666] text-sm mt-0.5">
              {loading ? '...' : `${pagination.total.toLocaleString()} báo cáo`}
            </p>
          </div>
          <button
            onClick={() => fetchReports(pagination.page)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1a1a1a] border border-[#333] text-[#aaa] hover:text-white hover:border-[#555] transition-all text-sm"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Làm mới
          </button>
        </div>

        {/* ── Filter Bar ── */}
        <div className="bg-[#121212] border border-[#2a2a2a] rounded-2xl p-4 flex gap-3 items-center">
          <Filter size={16} className="text-[#555]" />
          <div className="flex items-center gap-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-1">
            {[
              ['PENDING', 'Chờ xử lý'],
              ['RESOLVED', 'Đã xử lý'],
              ['REJECTED', 'Đã bác bỏ'],
              ['ALL', 'Tất cả'],
            ].map(([v, l]) => (
              <button
                key={v}
                onClick={() => setStatusFilter(v)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap
                  ${statusFilter === v ? 'bg-[#00e6e6]/15 text-[#00e6e6] border border-[#00e6e6]/30 shadow-[0_0_10px_rgba(0,230,230,0.2)]' : 'text-[#666] hover:text-[#aaa]'}`}
              >
                {l}
              </button>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-1 overflow-x-auto hide-scrollbar">
            {[
              ['ALL', 'Mọi đối tượng'],
              ['SONG', 'Bài hát'],
              ['ALBUM', 'Album'],
              ['PLAYLIST', 'Playlist'],
              ['ARTIST', 'Nghệ sĩ'],
              ['USER', 'Người dùng'],
            ].map(([v, l]) => (
              <button
                key={v}
                onClick={() => setTargetTypeFilter(v)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap
                  ${targetTypeFilter === v ? 'bg-[#00e6e6]/15 text-[#00e6e6] border border-[#00e6e6]/30 shadow-[0_0_10px_rgba(0,230,230,0.2)]' : 'text-[#666] hover:text-[#aaa]'}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* ── Table ── */}
        <div className="bg-[#121212] border border-[#2a2a2a] rounded-2xl overflow-hidden shadow-[0_0_15px_rgba(0,0,0,0.5)]">
          {/* Table header */}
          <div className="grid grid-cols-[80px_1.5fr_2fr_1.5fr_120px_120px_180px] gap-4 px-5 py-4 border-b border-[#2a2a2a] text-[11px] font-bold uppercase tracking-widest text-[#555] bg-[#0a0a0a]">
            <span>ID</span>
            <span>Người gửi</span>
            <span>Đối tượng bị báo cáo</span>
            <span>Lý do / Bằng chứng</span>
            <span>Ngày gửi</span>
            <span>Trạng thái</span>
            <span className="text-right">Hành động</span>
          </div>

          {/* Rows */}
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <RefreshCw size={28} className="text-[#00e6e6] animate-spin" />
            </div>
          ) : reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-[#555]">
              <ShieldAlert size={44} className="mb-3 opacity-30 text-[#ff0055]" />
              <p className="text-sm">Không có báo cáo nào ở trạng thái này</p>
            </div>
          ) : (
            <div className="divide-y divide-[#1a1a1a]">
              {reports.map((report) => (
                <div key={report.id} className="grid grid-cols-[80px_1.5fr_2fr_1.5fr_120px_120px_180px] gap-4 px-5 py-4 items-center hover:bg-[#161616] transition-colors">
                  
                  {/* ID */}
                  <p className="text-[#888] text-xs font-mono">#{report.id}</p>

                  {/* Reporter */}
                  <div className="flex items-center gap-3 min-w-0">
                    <img 
                      src={getMediaUrl(report.reporter?.avatarUrl) || 'https://i.pravatar.cc/150?u=' + report.reporter?.id} 
                      alt="avatar" 
                      className="w-8 h-8 rounded-full border border-[#333]" 
                    />
                    <div className="min-w-0">
                      <p className="text-white text-sm font-semibold truncate">{report.reporter?.displayName || report.reporter?.username}</p>
                      <p className="text-[#555] text-xs truncate">{report.reporter?.email}</p>
                    </div>
                  </div>

                  {/* Target */}
                  <div className="min-w-0">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#333] text-white uppercase tracking-wider mb-1 inline-block">
                      {report.targetType}
                    </span>
                    {report.targetInfo ? (
                      <div className="flex items-center gap-2 mt-1">
                        {report.targetInfo.coverArtUrl && (
                          <img src={getMediaUrl(report.targetInfo.coverArtUrl)} className="w-8 h-8 rounded-md" alt="cover" />
                        )}
                        <p className="text-[#00e6e6] text-sm truncate font-medium hover:underline cursor-pointer" onClick={() => setSelectedReport(report)}>
                          {report.targetInfo.title}
                        </p>
                      </div>
                    ) : (
                      <p className="text-[#888] text-sm">ID: {report.targetId} (Không tìm thấy)</p>
                    )}
                  </div>

                  {/* Reason / Proof */}
                  <div className="min-w-0 cursor-pointer group" onClick={() => setSelectedReport(report)}>
                    <p className="text-white text-sm font-bold text-[#ff3366] group-hover:underline">{report.reason}</p>
                    {report.description && (
                      <p className="text-[#888] text-xs truncate mt-1" title={report.description}>
                        <MessageSquare size={10} className="inline mr-1" />{report.description}
                      </p>
                    )}
                    {report.proofUrl && (
                      <div className="text-[#00e6e6] text-xs flex items-center gap-1 mt-1 group-hover:underline">
                        <ExternalLink size={10} /> Link bằng chứng
                      </div>
                    )}
                  </div>

                  {/* Date */}
                  <p className="text-[#666] text-xs">{new Date(report.createdAt).toLocaleDateString('vi-VN')}</p>

                  {/* Status */}
                  <div>
                    <StatusBadge status={report.status} />
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-2">
                    {report.status === 'PENDING' ? (
                      <>
                        <button
                          onClick={() => handleResolve(report.id)}
                          disabled={actionLoading}
                          className="flex items-center gap-1 px-3 py-1.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all text-xs font-bold disabled:opacity-50"
                        >
                          <CheckCircle size={14} /> Xử lý
                        </button>
                        <button
                          onClick={() => handleReject(report.id)}
                          disabled={actionLoading}
                          className="flex items-center gap-1 px-3 py-1.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all text-xs font-bold disabled:opacity-50"
                        >
                          <X size={14} /> Bác bỏ
                        </button>
                      </>
                    ) : (
                      <span className="text-[#555] text-xs italic">Đã chốt</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* ── Full Report Detail Modal ── */}
      {selectedReport && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setSelectedReport(null)}>
          <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl w-full max-w-2xl flex flex-col md:flex-row overflow-hidden relative shadow-2xl" onClick={e => e.stopPropagation()}>
            <button className="absolute top-4 right-4 text-[#888] hover:text-white transition-colors z-10 bg-black/20 p-1 rounded-full" onClick={() => setSelectedReport(null)}>
              <X size={20} />
            </button>
            
            {/* Left side: Target Info & Audio */}
            <div className="md:w-1/2 bg-[#111] p-6 flex flex-col items-center border-r border-[#333]">
              <h4 className="text-[#888] text-xs font-bold uppercase tracking-widest mb-4">Đối tượng vi phạm</h4>
              {selectedReport.targetInfo ? (
                <>
                  <img 
                    src={getMediaUrl(selectedReport.targetInfo.coverArtUrl) || 'https://images.unsplash.com/photo-1598387993441-a364f854c3e1?q=80&w=400&auto=format&fit=crop'} 
                    alt="cover" 
                    className="w-40 h-40 rounded-xl object-cover shadow-2xl ring-4 ring-[#222]" 
                  />
                  <h3 className="text-lg font-bold text-white text-center mt-4 px-2">{selectedReport.targetInfo.title}</h3>
                  <p className="text-xs text-[#888] mt-1 font-mono uppercase">
                    Status: {selectedReport.targetInfo.status || 'unknown'}
                  </p>
                  
                  <div className="w-full mt-6">
                    {selectedReport.targetInfo.audioUrl ? (
                      <audio 
                        controls 
                        src={getMediaUrl(selectedReport.targetInfo.audioUrl)} 
                        className="w-full h-10 outline-none" 
                      />
                    ) : (
                      <div className="text-red-400 text-sm italic bg-red-500/10 py-2 rounded-lg border border-red-500/20 text-center">
                        Không tìm thấy file Audio
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-[#555] italic">
                  Không tìm thấy thông tin đối tượng
                </div>
              )}
            </div>

            {/* Right side: Report Details */}
            <div className="md:w-1/2 p-6 flex flex-col">
              <h4 className="text-[#888] text-xs font-bold uppercase tracking-widest mb-4 border-b border-[#333] pb-2">Chi tiết báo cáo</h4>
              
              <div className="space-y-4 flex-1">
                {/* Reporter */}
                <div>
                  <label className="text-[10px] text-[#666] uppercase font-bold tracking-wider">Người báo cáo</label>
                  <div className="flex items-center gap-2 mt-1 bg-[#222] p-2 rounded-lg">
                    <img src={getMediaUrl(selectedReport.reporter?.avatarUrl) || 'https://i.pravatar.cc/150'} alt="avatar" className="w-6 h-6 rounded-full" />
                    <div>
                      <p className="text-sm font-semibold text-white leading-tight">{selectedReport.reporter?.displayName || selectedReport.reporter?.username}</p>
                      <p className="text-[10px] text-[#888] leading-tight">{selectedReport.reporter?.email}</p>
                    </div>
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <label className="text-[10px] text-[#666] uppercase font-bold tracking-wider">Lý do chính</label>
                  <p className="text-[#ff3366] font-bold text-sm bg-[#ff3366]/10 px-3 py-1.5 rounded-lg border border-[#ff3366]/20 mt-1 inline-block">
                    {selectedReport.reason}
                  </p>
                </div>

                {/* Description */}
                <div>
                  <label className="text-[10px] text-[#666] uppercase font-bold tracking-wider">Mô tả chi tiết</label>
                  <div className="mt-1 text-sm text-gray-300 bg-[#222] p-3 rounded-lg leading-relaxed whitespace-pre-wrap max-h-[120px] overflow-y-auto">
                    {selectedReport.description || <span className="italic text-[#666]">Không có mô tả</span>}
                  </div>
                </div>

                {/* Proof */}
                {selectedReport.proofUrl && (
                  <div>
                    <label className="text-[10px] text-[#666] uppercase font-bold tracking-wider">Bằng chứng (Link)</label>
                    <a 
                      href={selectedReport.proofUrl} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="mt-1 flex items-center gap-2 text-sm text-[#00e6e6] hover:underline bg-[#00e6e6]/10 p-2 rounded-lg border border-[#00e6e6]/20 break-all"
                    >
                      <ExternalLink size={16} className="shrink-0" />
                      {selectedReport.proofUrl}
                    </a>
                  </div>
                )}
              </div>

              {/* Actions footer if PENDING */}
              {selectedReport.status === 'PENDING' && (
                <div className="mt-6 pt-4 border-t border-[#333] flex gap-2 justify-end">
                  <button
                    onClick={() => {
                      setSelectedReport(null);
                      handleReject(selectedReport.id);
                    }}
                    className="px-4 py-2 rounded-lg text-sm font-bold bg-transparent text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    Bác bỏ
                  </button>
                  <button
                    onClick={() => {
                      setSelectedReport(null);
                      handleResolve(selectedReport.id);
                    }}
                    className="px-4 py-2 rounded-lg text-sm font-bold bg-[#00e6e6]/20 text-[#00e6e6] hover:bg-[#00e6e6]/30 transition-colors"
                  >
                    Xác nhận Xử lý
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} />
    </>
  );
}
