/**
 * Authentication Routes
 * Login, register, password reset routes
 */

import { Navigate } from 'react-router-dom';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import ForgotPassword from '../pages/auth/ForgotPassword';

export const authRoutes = [
  {
    index: true,
    element: <Navigate to="/" replace />
  },
  {
    path: 'login',
    element: <Login />
  },
  {
    path: 'forgot-password',
    element: <ForgotPassword />
  },
  {
    path: 'register',
    element: <Register />
  }
];
