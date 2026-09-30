/**
 * Public Routes - lazy loaded
 */

import React, { lazy, Suspense } from 'react';
import { AuthProvider } from '../contexts/AuthContext';

const Loader = () => (
  <div className="flex items-center justify-center min-h-64 p-8">
    <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
  </div>
);

// Error boundary for individual lazy-loaded components
class RouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[Route Error] Public route failed to load:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-64 p-8">
          <div className="text-center">
            <p className="text-[var(--color-error)] mb-2">Failed to load this page</p>
            <p className="text-sm text-[var(--color-textSecondary)] mb-4">
              {this.state.error?.message || 'An error occurred while loading this module'}
            </p>
            <button 
              onClick={() => window.location.href = '/'}
              className="btn btn-primary"
            >
              Return to Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function SafeRoute({ children }) {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<Loader />}>
        {children}
      </Suspense>
    </RouteErrorBoundary>
  );
}

const PublicHome              = lazy(() => import('../pages/public/PublicHome'));
const PublicAnnouncementDetail = lazy(() => import('../pages/public/PublicAnnouncementDetail'));
const Announcements           = lazy(() => import('../pages/public/Announcements'));
const Terms                   = lazy(() => import('../pages/public/Terms'));
const Privacy                 = lazy(() => import('../pages/public/Privacy'));
const PhotoGalleryPage        = lazy(() => import('../pages/PhotoGalleryPage'));
const PlatformLogin           = lazy(() => import('../pages/platform/PlatformLogin'));
const DownloadsPage           = lazy(() => import('../pages/public/DownloadsPage'));

const W = ({ C }) => <SafeRoute><C /></SafeRoute>;

export const publicRoutes = [
  { index: true,                           element: <W C={PublicHome} /> },
  { path: 'announcements/:announcementId', element: <W C={PublicAnnouncementDetail} /> },
  { path: 'announcements',                 element: <W C={Announcements} /> },
  { path: 'downloads',                     element: <W C={DownloadsPage} /> },
  { path: 'terms',                         element: <W C={Terms} /> },
  { path: 'privacy',                       element: <W C={Privacy} /> },
  { path: 'gallery',                       element: <AuthProvider><W C={PhotoGalleryPage} /></AuthProvider> },
  { path: 'platform/login',                element: <AuthProvider><W C={PlatformLogin} /></AuthProvider> },
];
