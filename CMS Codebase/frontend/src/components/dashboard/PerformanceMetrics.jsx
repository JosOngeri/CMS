import { useState, useEffect } from 'react';
import { Activity, Cpu, HardDrive, Clock, TrendingUp, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const PerformanceMetrics = () => {
  const { api } = useAuth();
  const [metrics, setMetrics] = useState({
    apiResponseTime: 0,
    serverLoad: 0,
    cpuUsage: 0,
    memoryUsage: 0,
    diskUsage: 0,
    uptime: 0,
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
      const response = await api.get('/dashboard/performance');
      setMetrics(response.data.metrics || {});
    } catch (error) {
      console.error('Failed to fetch performance metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const metricCards = [
    { label: 'API Response Time', value: `${metrics.apiResponseTime}ms`, icon: Clock, color: 'text-[var(--color-primary)]-600', threshold: 500 },
    { label: 'Server Load', value: `${metrics.serverLoad}%`, icon: Activity, color: 'text-purple-600', threshold: 80 },
    { label: 'CPU Usage', value: `${metrics.cpuUsage}%`, icon: Cpu, color: 'text-green-600', threshold: 80 },
    { label: 'Memory Usage', value: `${metrics.memoryUsage}%`, icon: HardDrive, color: 'text-orange-600', threshold: 85 },
    { label: 'Disk Usage', value: `${metrics.diskUsage}%`, icon: HardDrive, color: 'text-red-600', threshold: 90 },
    { label: 'Error Rate', value: `${metrics.errorRate}%`, icon: AlertTriangle, color: 'text-red-600', threshold: 1 },
  ];

  if (loading) {
    return <div className="text-center py-4">Loading performance metrics...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Performance Metrics</h3>
        <TrendingUp className="text-green-600" size={20} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {metricCards.map((metric, index) => {
          const Icon = metric.icon;
          const isWarning = parseFloat(metric.value) > metric.threshold;
          return (
            <div key={index} className={`p-4 bg-[var(--color-surface)] border rounded-lg ${isWarning ? 'border-red-300 bg-red-50' : ''}`}>
              <div className="flex items-center gap-2 mb-2">
                <Icon size={16} className={metric.color} />
                <span className="text-xs text-[var(--color-textSecondary)]">{metric.label}</span>
              </div>
              <div className={`text-2xl font-bold ${isWarning ? 'text-red-600' : 'text-[var(--color-text)]'}`}>
                {metric.value}
              </div>
              {isWarning && (
                <div className="text-xs text-red-600 mt-1">Above threshold</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PerformanceMetrics;
