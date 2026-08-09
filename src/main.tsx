import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register Service Worker for offline asset caching
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (registration) => {
        console.log('[Service Worker] Registration successful with scope: ', registration.scope);
      },
      (err) => {
        console.log('[Service Worker] Registration failed: ', err);
      }
    );
  });
} else if ('serviceWorker' in navigator) {
  // Also register in development mode if supported
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.log('[Service Worker] Registration error: ', err);
    });
  });
}
