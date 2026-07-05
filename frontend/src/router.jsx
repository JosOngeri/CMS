import { Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import PublicShell from './shells/PublicShell';
import { publicRoutes } from './router/public.routes';
import { FullPageLoading } from './components/common/Loading';

// Auth and Dashboard are loaded only when the user navigates to them.
const AuthShell = lazy(() => import('./shells/AuthShell'));
const DashboardShell = lazy(() => import('./shells/DashboardShell'));

const ShellFallback = () => <FullPageLoading message="Loading..." />;

/**
 * App router with three clear boundaries:
 *
 * 1. Public shell (/) - loads immediately, only the landing/public pages.
 * 2. Auth shell (/auth/*) - loads when the user triggers login.
 * 3. Dashboard shell (/dashboard/*) - loads after login, lazy loads each page.
 */
export const createAppRouter = () => {
  return createBrowserRouter([
    {
      path: '/',
      element: <PublicShell />,
      children: publicRoutes
    },
    {
      path: '/auth/*',
      element: (
        <Suspense fallback={<ShellFallback />}>
          <AuthShell />
        </Suspense>
      )
    },
    {
      path: '/dashboard/*',
      element: (
        <Suspense fallback={<ShellFallback />}>
          <DashboardShell />
        </Suspense>
      )
    },
    {
      path: '*',
      element: <Navigate to='/' replace />
    }
  ], {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
      v7_fetcherPersist: true,
      v7_normalizeFormMethod: true,
      v7_partialHydration: true,
      v7_skipActionErrorRevalidation: true
    }
  });
};

export default createAppRouter;

