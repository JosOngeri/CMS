import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, TrendingUp, Activity, Download, Filter } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const SecurityDashboard = () => {
  const { api } = useAuth();
  const toast = useToast();
  const [analytics, setAnalytics] = useState({
    totalEvents: 0,
    blockedAttempts: 0,
    suspiciousActivity: 0,
    complianceScore: 0
  });
  const [recentEvents, setRecentEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await api.get('/security/analytics');
      setAnalytics(response.data.analytics || {});
      setRecentEvents(response.data.recentEvents || []);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading security analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Security Dashboard</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-[var(--color-surface)] rounded-lg hover:bg-[var(--color-surface)]">
          <Download size={16} />
          Export Report
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[var(--color-surface)] border rounded-lg p-4">
          <div className="flex items-center gap-2 text-[var(--color-textSecondary)] mb-2">
            <Activity size={16} />
            <span className="text-sm">Total Events</span>
          </div>
          <div className="text-2xl font-bold">{analytics.totalEvents.toLocaleString()}</div>
        </div>
        <div className="bg-[var(--color-surface)] border rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-600 mb-2">
            <Shield size={16} />
            <span className="text-sm">Blocked Attempts</span>
          </div>
          <div className="text-2xl font-bold">{analytics.blockedAttempts.toLocaleString()}</div>
        </div>
        <div className="bg-[var(--color-surface)] border rounded-lg p-4">
          <div className="flex items-center gap-2 text-orange-600 mb-2">
            <AlertTriangle size={16} />
            <span className="text-sm">Suspicious Activity</span>
          </div>
          <div className="text-2xl font-bold">{analytics.suspiciousActivity.toLocaleString()}</div>
        </div>
        <div className="bg-[var(--color-surface)] border rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <TrendingUp size={16} />
            <span className="text-sm">Compliance Score</span>
          </div>
          <div className="text-2xl font-bold">{analytics.complianceScore}%</div>
        </div>
      </div>

      {/* Recent Security Events */}
      <div className="bg-[var(--color-surface)] border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Recent Security Events</h3>
          <button className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-[var(--color-background)]">
            <Filter size={16} />
            Filter
          </button>
        </div>
        <div className="space-y-3">
          {recentEvents.map((event, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-[var(--color-background)] rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${
                  event.severity === 'high' ? 'bg-red-100 text-red-600' :
                  event.severity === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                  'bg-green-100 text-green-600'
                }`}>
                  <Shield size={16} />
                </div>
                <div>
                  <div className="font-medium">{event.type}</div>
                  <div className="text-sm text-[var(--color-textSecondary)]">{event.description}</div>
                </div>
              </div>
              <div className="text-sm text-[var(--color-textSecondary)]">
                {new Date(event.timestamp).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SecurityDashboard;
