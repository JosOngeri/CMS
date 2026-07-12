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

// ── Server Connection Status Display ─────────────────────────────────────────
const displayServerStatus = async () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 KMainCMS Frontend - Server Connection Check');
  console.log('='.repeat(60));
  
  const API_BASE_URL = import.meta.env.VITE_API_URL || '';
  const targetServer = API_BASE_URL || 'http://localhost:5000 (via Vite proxy)';
  
  console.log(`� Target Server: ${targetServer}`);
  console.log(`� Checking connection...`);
  
  try {
    const startTime = Date.now();
    const response = await axios.get('/api/health', { timeout: 5000 });
    const responseTime = Date.now() - startTime;
    
    console.log(`✅ Backend server connected successfully! (${responseTime}ms)`);
    console.log(`📊 Server Status: ${response.data.status}`);
    console.log(`🌍 Environment: ${response.data.environment}`);
    console.log(`🗄️  Database: ${response.data.database}`);
    console.log(`⏰ Server Time: ${new Date(response.data.timestamp).toLocaleString()}`);
    console.log(`💾 Memory Usage: ${response.data.memory.heapUsed} / ${response.data.memory.heapTotal}`);
    console.log('='.repeat(60) + '\n');
  } catch (error) {
    console.log(`❌ Backend server connection failed!`);
    console.log(`🔴 Error: ${error.message}`);
    
    if (error.code === 'ECONNREFUSED') {
      console.log(`💡 Make sure the backend server is running on port 5000`);
      console.log(`💡 Run: cd backend && npm start`);
    } else if (error.code === 'ETIMEDOUT') {
      console.log(`💡 Server connection timed out - check if backend is responsive`);
    }
    console.log('='.repeat(60) + '\n');
  }
};

// ── Axios configuration ────────────────────────────────────────────────────
// Vite proxy handles /api prefix, so baseURL should be empty to use the proxy
const API_BASE_URL = import.meta.env.VITE_API_URL || '';
axios.defaults.baseURL = API_BASE_URL;
axios.defaults.withCredentials = true;

// Attach JWT token to every request
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('[Axios Request Error]', error);
    return Promise.reject(error);
  }
);

// Handle 401 globally and log API errors (4xx as warnings, 5xx/network as errors)
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

// ── Mount ──────────────────────────────────────────────────────────────────
const rootEl = document.getElementById('root');

if (!rootEl) {
  console.error('[main.jsx] #root element not found in DOM');
} else {
  // Check server connection before mounting
  displayServerStatus().then(() => {
    console.log('🎨 Starting React application...');
    ReactDOM.createRoot(rootEl).render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    );
  });
}
