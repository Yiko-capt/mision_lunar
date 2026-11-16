import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class PatchErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('[PatchErrorBoundary] Error caught in South Pole view:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#050811]/95 text-white p-6 z-30 font-sans">
          <div className="max-w-md w-full bg-slate-900/90 border border-amber-500/50 rounded-2xl p-6 text-center space-y-4 shadow-2xl backdrop-blur-md">
            <div className="text-4xl">⛰️⚠️</div>
            <h3 className="text-sm font-bold text-amber-400 font-mono">
              Error rendering South Pole terrain
            </h3>
            <p className="text-[11px] text-slate-300 font-mono bg-slate-950 p-3 rounded-lg border border-slate-800 text-left overflow-auto max-h-32">
              {this.state.error?.message || 'Error in topographic computation or WebGL buffer'}
            </p>
            <div className="flex gap-2 justify-center pt-1">
              <button
                onClick={this.handleRetry}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg transition cursor-pointer shadow-lg"
              >
                🔄 Retry terrain patch
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
