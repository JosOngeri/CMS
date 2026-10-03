import ErrorBoundary from '../components/ErrorBoundary';
import PublicLayout from '../layouts/PublicLayout';

/**
 * PublicShell
 *
 * The first shell loaded when a visitor opens the app.
 * It contains only the public marketing/landing layout and its child routes.
 * No auth, members, or gallery providers are loaded here.
 */
function PublicShell() {
  return (
    <ErrorBoundary>
      <PublicLayout />
    </ErrorBoundary>
  );
}

export default PublicShell;
