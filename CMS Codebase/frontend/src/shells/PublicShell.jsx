import { useEffect } from 'react';
import ErrorBoundary from '../components/ErrorBoundary';
import PublicLayout from '../layouts/PublicLayout';
import axios from 'axios';

/**
 * PublicShell
 *
 * The first shell loaded when a visitor opens the app.
 * It contains only the public marketing/landing layout and its child routes.
 * No auth, members, or gallery providers are loaded here.
 */
function PublicShell() {
  useEffect(() => {
    console.log('🌐 PublicShell mounted - checking server connection...');
    
    const checkConnection = async () => {
      try {
        const response = await axios.get('/api/health', { timeout: 3000 });
        console.log('✅ PublicShell: Backend server connected');
        console.log(`📊 Status: ${response.data.status}, Environment: ${response.data.environment}`);
      } catch (error) {
        console.error('❌ PublicShell: Backend server connection failed');
        console.error(`🔴 Error: ${error.message}`);
      }
    };
    
    checkConnection();
  }, []);

  return (
    <ErrorBoundary>
      <PublicLayout />
    </ErrorBoundary>
  );
}

export default PublicShell;
