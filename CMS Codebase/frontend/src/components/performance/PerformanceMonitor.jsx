import { useState, useEffect } from 'react';
import { Activity, Zap, Database, Clock, TrendingUp, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const PerformanceMonitor = () => {
  const { api } = useAuth();
  const [metrics, setMetrics] = useState({
    apiResponseTime: 0,
    cacheHitRate: 0,
    databaseQueryTime: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    errorRate: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchMetrics = async () => {
    try {
      const response = await api.get('/performance/metrics');
      setMetrics(response.data.metrics || {});
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading performance metrics...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Performance Monitor</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[var(--color-surface)] border rounded-lg p-4">
          <div className="flex items-center gap-2 text-[var(--color-primary)]-600 mb-2">
            <Zap size={16} />
            <span className="text-sm">API Response Time</span>
          </div>
          <div className="text-2xl font-bold">{metrics.apiResponseTime}ms</div>
        </div>
        <div className="bg-[var(--color-surface)] border rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <Activity size={16} />
            <span className="text-sm">Cache Hit Rate</span>
          </div>
          <div className="text-2xl font-bold">{metrics.cacheHitRate}%</div>
        </div>
        <div className="bg-[var(--color-surface)] border rounded-lg p-4">
          <div className="flex items-center gap-2 text-purple-600 mb-2">
            <Database size={16} />
            <span className="text-sm">DB Query Time</span>
          </div>
          <div className="text-2xl font-bold">{metrics.databaseQueryTime}ms</div>
        </div>
        <div className="bg-[var(--color-surface)] border rounded-lg p-4">
          <div className="flex items-center gap-2 text-orange-600 mb-2">
            <Clock size={16} />
            <span className="text-sm">Memory Usage</span>
          </div>
          <div className="text-2xl font-bold">{metrics.memoryUsage}%</div>
        </div>
        <div className="bg-[var(--color-surface)] border rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-600 mb-2">
            <TrendingUp size={16} />
            <span className="text-sm">CPU Usage</span>
          </div>
          <div className="text-2xl font-bold">{metrics.cpuUsage}%</div>
        </div>
        <div className="bg-[var(--color-surface)] border rounded-lg p-4">
          <div className="flex items-center gap-2 text-[var(--color-textSecondary)] mb-2">
            <AlertCircle size={16} />
            <span className="text-sm">Error Rate</span>
          </div>
          <div className="text-2xl font-bold">{metrics.errorRate}%</div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceMonitor;
