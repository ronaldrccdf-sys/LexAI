import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[LexAI] Erro capturado pelo ErrorBoundary:', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="min-h-screen bg-primary flex items-center justify-center px-6 text-center">
            <div className="graphite-light border border-gray-800/50 rounded-3xl p-10 max-w-lg w-full space-y-4">
              <h1 className="text-xl font-black gold-text uppercase tracking-[0.2em]">Falha ao carregar</h1>
              <p className="text-sm text-gray-400">
                Ocorreu um erro inesperado durante a inicialização da aplicação. Verifique o console para detalhes.
              </p>
              {this.state.error && (
                <pre className="bg-black/30 text-left text-[10px] text-red-300 p-4 rounded-2xl overflow-auto">
                  {this.state.error.message}
                </pre>
              )}
              <button
                onClick={this.handleReload}
                className="gold-gradient px-6 py-3 rounded-2xl text-white font-black uppercase tracking-widest text-[10px]"
              >
                Recarregar
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
