import { Suspense, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from '../components/ErrorBoundary';
import ProtectedRoute from '../components/ProtectedRoute';
import { AuthProvider } from '../contexts/AuthContext';
import { MembersProvider } from '../contexts/MembersContext';
import { GalleryProvider } from '../contexts/GalleryContext';
import DashboardLayout from '../layouts/DashboardLayout';
import { FullPageLoading } from '../components/common/Loading';
import { dashboardRoutes } from '../router/dashboard.routes';
import axios from 'axios';

/**
 * DashboardShell
 *
 * Loaded after the user logs in and navigates to /dashboard/*.
 * It brings in auth, members, and gallery providers and uses the consolidated dashboard routes.
 */
function DashboardShell() {
  useEffect(() => {
    console.log('📱 DashboardShell mounted - checking server connection...');
    
    const checkConnection = async () => {
      try {
        const response = await axios.get('/api/health', { timeout: 3000 });
        console.log('✅ DashboardShell: Backend server connected');
        console.log(`📊 Status: ${response.data.status}, Environment: ${response.data.environment}`);
      } catch (error) {
        console.error('❌ DashboardShell: Backend server connection failed');
        console.error(`🔴 Error: ${error.message}`);
      }
    };
    
    checkConnection();
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <ProtectedRoute>
          <MembersProvider>
            <GalleryProvider>
              <Suspense fallback={<FullPageLoading message="Loading dashboard..." />}>
                <Routes>
                  <Route element={<DashboardLayout />}>
                    {dashboardRoutes.map((route, index) => (
                      <Route
                        key={route.path || `index-${index}`}
                        index={route.index}
                        path={route.path}
                        element={route.element}
                      />
                    ))}
                    {/* Catch-all for dashboard sub-routes */}
                    <Route path="*" element={<Navigate to="/dashboard/overview" replace />} />
                  </Route>
                </Routes>
              </Suspense>
            </GalleryProvider>
          </MembersProvider>
        </ProtectedRoute>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default DashboardShell;
