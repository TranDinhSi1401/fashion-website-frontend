import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
          <div className="max-w-md rounded-2xl border border-amber-500/30 bg-[#14141a]/95 p-8 text-white shadow-2xl backdrop-blur-xl">
            <h2 className="mb-3 text-lg font-bold text-amber-400">Đã xảy ra sự cố hiển thị</h2>
            <p className="mb-6 text-sm text-neutral-300 leading-relaxed">
              {this.state.error?.message || 'Giao diện gặp trục trặc khi chuyển trang.'}
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="rounded-lg bg-gradient-to-r from-amber-300 to-amber-500 px-6 py-2.5 text-sm font-extrabold uppercase text-neutral-900 transition-opacity hover:opacity-90"
            >
              Tải lại trang
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
