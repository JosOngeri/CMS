import { Suspense } from 'react';
import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import ErrorBoundary from '../components/ErrorBoundary';
import ProtectedRoute from '../components/ProtectedRoute';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { MembersProvider } from '../contexts/MembersContext';
import { GalleryProvider } from '../contexts/GalleryContext';
import DashboardLayout from '../layouts/DashboardLayout';
import { FullPageLoading } from '../components/common/Loading';
import { dashboardRoutes } from '../router/dashboard.routes';

/**
 * Keeps the URL tenant-scoped. Two mounts render this shell:
 *   /:churchSlug/dashboard/*  (canonical)
 *   /dashboard/*              (legacy — rewritten here)
 * A missing slug gets prepended; a slug that isn't the user's own church
 * is corrected to their church (backend scoping already isolates data —
 * this keeps the URL honest).
 */
const ChurchSlugGuard = ({ children }) => {
  const { user, loading } = useAuth();
  const { churchSlug } = useParams();
  const location = useLocation();
  const slug = user?.church_slug;

  if (loading || !user || !slug) return children;

  if (!churchSlug) {
    return <Navigate to={`/${slug}${location.pathname}${location.search}`} replace />;
  }
  if (churchSlug !== slug) {
    const rest = location.pathname.slice(churchSlug.length + 1);
    return <Navigate to={`/${slug}${rest}${location.search}`} replace />;
  }
  return children;
};

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
              <ChurchSlugGuard>
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
              </ChurchSlugGuard>
            </GalleryProvider>
          </MembersProvider>
        </ProtectedRoute>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default DashboardShell;
