import { Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from '../components/ErrorBoundary';
import { AuthProvider } from '../contexts/AuthContext';
import AuthLayout from '../layouts/AuthLayout';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import ForgotPassword from '../pages/auth/ForgotPassword';
import ResetPassword from '../pages/auth/ResetPassword';

/**
 * AuthShell
 *
 * Loaded only when the user navigates to /auth/* (e.g. clicks "Member Login").
 * It brings in the AuthProvider and renders the authentication forms.
 */
function AuthShell() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Routes>
          <Route element={<AuthLayout />}>
            <Route index element={<Navigate to="/" replace />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="forgot-password" element={<ForgotPassword />} />
            <Route path="reset-password" element={<ResetPassword />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default AuthShell;
