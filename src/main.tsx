import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

// Register Service Worker for offline asset caching safely
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    if (import.meta.env.PROD) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(
          (registration) => {
            console.log('[Service Worker] Active with scope:', registration.scope);
          },
          (err) => {
            console.warn('[Service Worker] Registration skipped:', err);
          }
        );
      });
    }
  } catch (swErr) {
    console.warn('[Service Worker] Setup skipped:', swErr);
  }
}

