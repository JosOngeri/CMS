import { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from '../components/ErrorBoundary';
import ProtectedRoute from '../components/ProtectedRoute';
import { AuthProvider } from '../contexts/AuthContext';
import { MembersProvider } from '../contexts/MembersContext';
import { GalleryProvider } from '../contexts/GalleryContext';
import DashboardLayout from '../layouts/DashboardLayout';
import { FullPageLoading } from '../components/common/Loading';
import { dashboardRoutes } from '../router/dashboard.routes';

/**
 * DashboardShell
 *
 * Loaded after the user logs in and navigates to /dashboard/*.
 * It brings in auth, members, and gallery providers and uses the consolidated dashboard routes.
 */
function DashboardShell() {
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
