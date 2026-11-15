import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
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

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#02040a] text-white p-6 font-sans">
          <div className="max-w-md w-full bg-slate-900 border border-red-500/50 rounded-xl p-6 text-center space-y-4 shadow-2xl">
            <div className="text-4xl">⚠️</div>
            <h2 className="text-lg font-bold text-red-400">Error al inicializar el visor 3D</h2>
            <p className="text-xs text-slate-300 font-mono bg-slate-950 p-3 rounded border border-slate-800 text-left overflow-auto max-h-40">
              {this.state.error?.message || 'Error desconocido'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg transition"
            >
              🔄 Recargar aplicación
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
