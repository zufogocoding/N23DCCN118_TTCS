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
        <div style={styles.overlay}>
          <div style={styles.container}>
            {/* Glowing Icon Container */}
            <div style={styles.iconWrapper}>
              <AlertTriangle size={48} className="text-[#00e6e6]" style={styles.icon} />
              <div style={styles.glow} />
            </div>

            {/* Error Headers */}
            <h1 style={styles.title}>Đã xảy ra lỗi bất ngờ</h1>
            <p style={styles.subtitle}>
              Rất tiếc, ứng dụng vừa gặp sự cố kỹ thuật. Đừng lo lắng, dữ liệu và trạng thái phát nhạc của bạn đã được bảo vệ.
            </p>

            {/* Detail Box */}
            {this.state.error && (
              <div style={styles.detailsContainer}>
                <p style={styles.detailsTitle}>Mã lỗi chi tiết:</p>
                <code style={styles.detailsCode}>
                  {this.state.error.toString()}
                </code>
              </div>
            )}

            {/* Actions */}
            <div style={styles.actions}>
              <button onClick={this.handleReload} style={styles.buttonPrimary}>
                <RefreshCw size={18} style={styles.buttonIcon} />
                Tải lại trang
              </button>
              <button onClick={this.handleGoHome} style={styles.buttonSecondary}>
                <Home size={18} style={styles.buttonIcon} />
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

const styles = {
  overlay: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    width: '100%',
    backgroundColor: '#0a0a0a',
    fontFamily: "'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    color: '#ffffff',
    padding: '24px',
    boxSizing: 'border-box',
  },
  container: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    maxWidth: '520px',
    width: '100%',
    padding: '40px',
    backgroundColor: 'rgba(20, 20, 20, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '24px',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
  },
  iconWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '80px',
    height: '80px',
    borderRadius: '20px',
    backgroundColor: 'rgba(0, 230, 230, 0.1)',
    border: '1px solid rgba(0, 230, 230, 0.2)',
    marginBottom: '28px',
  },
  icon: {
    filter: 'drop-shadow(0 0 8px rgba(0, 230, 230, 0.4))',
  },
  glow: {
    position: 'absolute',
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(0, 230, 230, 0.15) 0%, rgba(0, 230, 230, 0) 70%)',
    zIndex: -1,
  },
  title: {
    fontSize: '24px',
    fontWeight: '800',
    letterSpacing: '-0.025em',
    marginBottom: '12px',
    background: 'linear-gradient(to right, #ffffff, #a0a0a0)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#a0a0a0',
    marginBottom: '24px',
    marginHorizontal: 'auto',
  },
  detailsContainer: {
    width: '100%',
    textAlign: 'left',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '32px',
    boxSizing: 'border-box',
  },
  detailsTitle: {
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#666666',
    margin: '0 0 6px 0',
  },
  detailsCode: {
    fontSize: '13px',
    fontFamily: 'monospace',
    color: '#ff6b6b',
    wordBreak: 'break-all',
    whiteSpace: 'pre-wrap',
  },
  actions: {
    display: 'flex',
    flexDirection: 'row',
    gap: '12px',
    width: '100%',
  },
  buttonPrimary: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    backgroundColor: '#00e6e6',
    color: '#000000',
    border: 'none',
    borderRadius: '14px',
    padding: '14px 20px',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'transform 0.2s, background-color 0.2s',
  },
  buttonSecondary: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: '#ffffff',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '14px',
    padding: '14px 20px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s, border-color 0.2s',
  },
  buttonIcon: {
    flexShrink: 0,
  },
};
