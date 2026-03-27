import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/scroll.css';
import './styles/globals.css';
import './styles/animations.css';
import './styles/notifications.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

// Mobile debug console — ?debug query param activates
if (new URLSearchParams(location.search).has('debug')) {
  import('eruda').then((mod) => {
    mod.default.init();
  }).catch(() => {});
}
