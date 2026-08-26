import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, AlertTriangle, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Application ErrorBoundary Caught Error]:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // Ignore storage clear errors
    }
    window.location.href = window.location.pathname;
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[#050811] text-slate-100 flex items-center justify-center p-4 font-sans select-none">
          <div className="max-w-md w-full bg-[#090d16]/90 border border-red-500/30 rounded-3xl p-6 shadow-2xl backdrop-blur-xl text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 mx-auto flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.2)]">
              <AlertTriangle size={32} />
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-mono font-bold text-white tracking-wider uppercase">
                System Interface Notice
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                The application encountered a runtime issue during initialization. Click reload below to refresh the interface.
              </p>
              {this.state.error?.message && (
                <div className="p-2.5 bg-black/60 border border-white/10 rounded-xl text-[10px] font-mono text-red-300 max-h-24 overflow-y-auto text-left break-all">
                  {this.state.error.message}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="py-2.5 px-4 bg-[#39FF14] hover:bg-[#32e011] text-black text-xs font-mono font-bold rounded-xl transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-lg active:scale-95"
              >
                <RefreshCw size={14} />
                <span>RELOAD APP</span>
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="py-2.5 px-4 bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-bold rounded-xl transition-all flex items-center justify-center space-x-2 cursor-pointer border border-white/10 active:scale-95"
              >
                <Home size={14} />
                <span>RESET CACHE</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
