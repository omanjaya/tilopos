import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { registerServiceWorker } from './lib/register-sw';
import './styles/globals.css';
import './styles/print.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Service worker only in production builds (in dev it would cache Vite modules)
if (import.meta.env.PROD) {
  registerServiceWorker({
    onUpdate: (registration) => {
      const waiting = registration.waiting;
      if (!waiting) return;
      const ok = window.confirm('Versi baru TiloPOS tersedia. Muat ulang sekarang?');
      if (!ok) return;
      navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), {
        once: true,
      });
      waiting.postMessage({ type: 'SKIP_WAITING' });
    },
    onError: (error) => {
      console.error('[sw] registration failed', error);
    },
  });
}
