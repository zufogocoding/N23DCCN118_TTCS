import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen w-full bg-background text-text p-6">
          <div className="relative flex flex-col items-center text-center max-w-[520px] w-full p-10 bg-surface/60 border border-white/5 rounded-2xl shadow-2xl backdrop-blur-xl">
            {/* Icon */}
            <div className="relative flex items-center justify-center w-20 h-20 rounded-xl bg-primary/10 border border-primary/20 mb-7">
              <AlertTriangle size={48} className="text-primary drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]" />
              <div className="absolute w-[100px] h-[100px] rounded-full bg-gradient-radial from-primary/15 to-transparent -z-10" />
            </div>

            {/* Headers */}
            <h1 className="text-2xl font-extrabold tracking-tight mb-3 bg-gradient-to-r from-text to-text-muted bg-clip-text text-transparent">
              Đã xảy ra lỗi bất ngờ
            </h1>
            <p className="text-sm leading-relaxed text-text-muted mb-6">
              Rất tiếc, ứng dụng vừa gặp sự cố kỹ thuật. Đừng lo lắng, dữ liệu và trạng thái phát nhạc của bạn đã được bảo vệ.
            </p>

            {/* Detail Box */}
            {this.state.error && (
              <div className="w-full text-left bg-black/40 border border-white/5 rounded-xl p-4 mb-8">
                <p className="text-[11px] font-bold uppercase text-[#666] mb-1.5">Mã lỗi chi tiết:</p>
                <code className="text-sm font-mono text-[#ff6b6b] break-all whitespace-pre-wrap">
                  {this.state.error.toString()}
                </code>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-row gap-3 w-full">
              <button
                onClick={this.handleReload}
                className="flex flex-1 items-center justify-center gap-2 bg-primary text-black border-none rounded-xl py-3.5 px-5 text-sm font-bold cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <RefreshCw size={18} />
                Tải lại trang
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex flex-1 items-center justify-center gap-2 bg-white/5 text-text border border-white/10 rounded-xl py-3.5 px-5 text-sm font-semibold cursor-pointer transition-all hover:bg-white/10 hover:border-white/20"
              >
                <Home size={18} />
                Quay về Trang chủ
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
