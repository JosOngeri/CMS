import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import ErrorBoundary from '../components/ErrorBoundary';
import { AuthProvider } from '../contexts/AuthContext';
import AuthLayout from '../layouts/AuthLayout';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import ForgotPassword from '../pages/auth/ForgotPassword';
import axios from 'axios';

/**
 * AuthShell
 *
 * Loaded only when the user navigates to /auth/* (e.g. clicks "Member Login").
 * It brings in the AuthProvider and renders the authentication forms.
 */
function AuthShell() {
  useEffect(() => {
    console.log('🔐 AuthShell mounted - checking server connection...');
    
    const checkConnection = async () => {
      try {
        const response = await axios.get('/api/health', { timeout: 3000 });
        console.log('✅ AuthShell: Backend server connected');
        console.log(`📊 Status: ${response.data.status}, Environment: ${response.data.environment}`);
      } catch (error) {
        console.error('❌ AuthShell: Backend server connection failed');
        console.error(`🔴 Error: ${error.message}`);
      }
    };
    
    checkConnection();
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <Routes>
          <Route element={<AuthLayout />}>
            <Route index element={<Navigate to="/" replace />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="forgot-password" element={<ForgotPassword />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default AuthShell;
