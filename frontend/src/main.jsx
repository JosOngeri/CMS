import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

// ── Server Connection Status Display (dev only — never blocks render) ────────
const displayServerStatus = async () => {
  const API_BASE_URL = import.meta.env.VITE_API_URL || '';
  const targetServer = API_BASE_URL || 'http://localhost:5000 (via Vite proxy)';
  console.log(`[Msabato] Checking backend at ${targetServer} ...`);

  try {
    const startTime = Date.now();
    const response = await axios.get('/api/health', { timeout: 5000 });
    const health = response.data?.data || response.data;
    console.log(`[Msabato] Backend connected in ${Date.now() - startTime}ms — status: ${health.status}, db: ${health.database}`);
  } catch (error) {
    console.warn(`[Msabato] Backend unreachable: ${error.message}`);
    if (error.code === 'ECONNREFUSED') {
      console.warn('[Msabato] Start the backend: cd backend && npm start');
    }
  }
};

// ── Axios configuration ────────────────────────────────────────────────────
// Vite proxy handles /api prefix, so baseURL should be empty to use the proxy.
// Auth is cookie-based (HttpOnly + SameSite=Strict) — no localStorage JWT.
const API_BASE_URL = import.meta.env.VITE_API_URL || '';
axios.defaults.baseURL = API_BASE_URL;
axios.defaults.withCredentials = true;

// Log API errors (4xx as warnings, 5xx/network as errors)
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url;
    const errorData = error.response?.data || error.message;

    if (status && status >= 400 && status < 500) {
      console.warn(`[API Warning] ${status} on ${url}`, errorData);
    } else {
      console.error(`[API Error] ${status || 'network'} on ${url}`, errorData);
    }

    // Do not auto-redirect here; AuthContext and ProtectedRoute handle session state and redirects
    return Promise.reject(error);
  }
);

// ── Service worker (PWA) — production only ──────────────────────────────────
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('[SW] registration failed:', err);
    });
  });
}

// ── Mount ──────────────────────────────────────────────────────────────────
const rootEl = document.getElementById('root');

if (!rootEl) {
  console.error('[main.jsx] #root element not found in DOM');
} else {
  // Mount immediately — the health ping is informational and must not block render.
  if (import.meta.env.DEV) {
    displayServerStatus();
  }
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
}
