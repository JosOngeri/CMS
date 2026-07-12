import { useState, useEffect } from 'react';
import { Activity, RefreshCw, Database, AlertTriangle, CheckCircle, Clock, HardDrive } from 'lucide-react';
import axios from 'axios';
import { useToast } from '../../contexts/ToastContext';
import { useColorPalette } from '../../contexts/ColorPaletteContext';

const TelegramCacheHealth = () => {
  const [health, setHealth] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const toast = useToast();
  const { colors } = useColorPalette();

  useEffect(() => {
    fetchHealth();
  }, []);

  const fetchHealth = async () => {
    try {
      const response = await axios.get('/api/telegram/cache/health');
      setHealth(response.data.data);
    } catch (err) {
      toast.error('Failed to fetch cache health');
    }
    setIsLoading(false);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const response = await axios.post('/api/telegram/cache/refresh');
      toast.success(`Refreshed ${response.data.data.count} cache entries`);
      fetchHealth();
    } catch (err) {
      toast.error('Failed to refresh cache');
    }
    setIsRefreshing(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
        return 'var(--color-success)';
      case 'warning':
        return 'var(--color-warning)';
      case 'critical':
        return 'var(--color-error)';
      default:
        return 'var(--color-textSecondary)';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5" />;
      case 'critical':
        return <AlertTriangle className="h-5 w-5" />;
      default:
        return <Activity className="h-5 w-5" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: colors.background }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: colors.primary }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: colors.background }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: colors.text }}>
              Cache Health Monitor
            </h1>
            <p className="mt-2" style={{ color: colors.textSecondary }}>
              Monitor and manage Telegram photo cache health
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white"
            style={{
              backgroundColor: colors.primary,
              opacity: isRefreshing ? 0.7 : 1,
              cursor: isRefreshing ? 'not-allowed' : 'pointer',
            }}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Cache
          </button>
        </div>

        {/* Health Status */}
        {health && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Overall Status */}
            <div className="p-6 rounded-lg shadow-sm" style={{ backgroundColor: colors.surface }}>
              <div className="flex items-center justify-between mb-4">
                <Activity className="h-6 w-6" style={{ color: getStatusColor(health.status) }} />
                <span className="text-sm font-medium" style={{ color: colors.textSecondary }}>
                  Status
                </span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(health.status)}
                <span className="text-2xl font-bold capitalize" style={{ color: getStatusColor(health.status) }}>
                  {health.status}
                </span>
              </div>
            </div>

            {/* Total Entries */}
            <div className="p-6 rounded-lg shadow-sm" style={{ backgroundColor: colors.surface }}>
              <div className="flex items-center justify-between mb-4">
                <Database className="h-6 w-6" style={{ color: colors.primary }} />
                <span className="text-sm font-medium" style={{ color: colors.textSecondary }}>
                  Total Entries
                </span>
              </div>
              <div className="text-2xl font-bold" style={{ color: colors.text }}>
                {health.totalEntries}
              </div>
            </div>

            {/* Valid Entries */}
            <div className="p-6 rounded-lg shadow-sm" style={{ backgroundColor: colors.surface }}>
              <div className="flex items-center justify-between mb-4">
                <CheckCircle className="h-6 w-6" style={{ color: 'var(--color-success)' }} />
                <span className="text-sm font-medium" style={{ color: colors.textSecondary }}>
                  Valid Entries
                </span>
              </div>
              <div className="text-2xl font-bold" style={{ color: colors.text }}>
                {health.validEntries}
              </div>
            </div>

            {/* Expired Entries */}
            <div className="p-6 rounded-lg shadow-sm" style={{ backgroundColor: colors.surface }}>
              <div className="flex items-center justify-between mb-4">
                <AlertTriangle className="h-6 w-6" style={{ color: 'var(--color-error)' }} />
                <span className="text-sm font-medium" style={{ color: colors.textSecondary }}>
                  Expired Entries
                </span>
              </div>
              <div className="text-2xl font-bold" style={{ color: colors.text }}>
                {health.expiredEntries}
              </div>
            </div>
          </div>
        )}

        {/* Health Percentage */}
        {health && (
          <div className="p-6 rounded-lg shadow-sm mb-8" style={{ backgroundColor: colors.surface }}>
            <h3 className="text-lg font-medium mb-4" style={{ color: colors.text }}>
              Cache Health
            </h3>
            <div className="relative pt-1">
              <div className="flex mb-2 items-center justify-between">
                <div>
                  <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full" style={{ backgroundColor: getStatusColor(health.status) + '20', color: getStatusColor(health.status) }}>
                    {health.healthPercentage}% Healthy
                  </span>
                </div>
              </div>
              <div className="overflow-hidden h-2 mb-4 text-xs flex rounded" style={{ backgroundColor: colors.background }}>
                <div
                  style={{ width: `${health.healthPercentage}%`, backgroundColor: getStatusColor(health.status) }}
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center"
                />
              </div>
            </div>
          </div>
        )}

        {/* Additional Stats */}
        {health && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Average File Size */}
            <div className="p-6 rounded-lg shadow-sm" style={{ backgroundColor: colors.surface }}>
              <div className="flex items-center gap-3 mb-4">
                <HardDrive className="h-6 w-6" style={{ color: colors.primary }} />
                <h3 className="text-lg font-medium" style={{ color: colors.text }}>
                  Average File Size
                </h3>
              </div>
              <div className="text-2xl font-bold" style={{ color: colors.text }}>
                {(health.avgFileSize / 1024 / 1024).toFixed(2)} MB
              </div>
            </div>

            {/* Recommendations */}
            <div className="p-6 rounded-lg shadow-sm" style={{ backgroundColor: colors.surface }}>
              <div className="flex items-center gap-3 mb-4">
                <Clock className="h-6 w-6" style={{ color: colors.primary }} />
                <h3 className="text-lg font-medium" style={{ color: colors.text }}>
                  Recommendations
                </h3>
              </div>
              <div className="space-y-2">
                {health.status === 'healthy' && (
                  <p className="text-sm" style={{ color: colors.textSecondary }}>
                    Cache is healthy. No immediate action required.
                  </p>
                )}
                {health.status === 'warning' && (
                  <p className="text-sm" style={{ color: colors.textSecondary }}>
                    Consider refreshing expired entries to improve performance.
                  </p>
                )}
                {health.status === 'critical' && (
                  <p className="text-sm" style={{ color: 'var(--color-error)' }}>
                    Cache health is critical. Immediate refresh recommended.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TelegramCacheHealth;