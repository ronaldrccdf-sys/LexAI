
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Não foi possível encontrar o elemento root.");
}

window.addEventListener('error', (event) => {
  console.error('[LexAI] Erro global:', event.error || event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[LexAI] Promise rejeitada sem tratamento:', event.reason);
});

console.log('[LexAI] Inicializando aplicação...');

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary
      fallback={
        <div className="min-h-screen bg-primary flex items-center justify-center text-center px-6">
          <div className="graphite-light border border-gray-800/50 rounded-3xl p-10 max-w-md w-full">
            <p className="text-sm text-gray-300 font-semibold">Carregando aplicação...</p>
          </div>
        </div>
      }
    >
      <React.Suspense
        fallback={
          <div className="min-h-screen bg-primary flex items-center justify-center text-center px-6">
            <div className="graphite-light border border-gray-800/50 rounded-3xl p-10 max-w-md w-full">
              <p className="text-sm text-gray-300 font-semibold">Carregando aplicação...</p>
            </div>
          </div>
        }
      >
        <App />
      </React.Suspense>
    </ErrorBoundary>
  </React.StrictMode>
);
