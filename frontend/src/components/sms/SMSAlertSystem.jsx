import { useState, useEffect } from 'react';
import { Bell, AlertTriangle, CheckCircle, XCircle, Clock, DollarSign, Zap, Settings, Trash2, Plus, Filter } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const SMSAlertSystem = () => {
  const { api } = useAuth();
  const toast = useToast();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAlert, setNewAlert] = useState({
    type: 'budget',
    threshold: 80,
    enabled: true
  });

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await api.get('/sms/alerts');
      setAlerts(response.data.alerts || []);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAlert = async () => {
    try {
      await api.post('/sms/alerts', newAlert);
      toast.success('Alert rule created');
      setShowCreateModal(false);
      fetchAlerts();
    } catch (error) {
      toast.error('Failed to create alert rule');
    }
  };

  const handleDeleteAlert = async (alertId) => {
    if (!confirm('Are you sure you want to delete this alert rule?')) return;
    try {
      await api.delete(`/sms/alerts/${alertId}`);
      toast.success('Alert rule deleted');
      fetchAlerts();
    } catch (error) {
      toast.error('Failed to delete alert rule');
    }
  };

  const handleToggleAlert = async (alertId, currentStatus) => {
    try {
      await api.put(`/sms/alerts/${alertId}/status`, {
        enabled: !currentStatus
      });
      toast.success('Alert status updated');
      fetchAlerts();
    } catch (error) {
      toast.error('Failed to update alert status');
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    return filterType === 'all' || alert.type === filterType;
  });

  if (loading) {
    return <div className="text-center py-8">Loading alerts...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">SMS Alert System</h2>
        <div className="flex gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="all">All Types</option>
            <option value="budget">Budget</option>
            <option value="delivery">Delivery</option>
            <option value="rate_limit">Rate Limit</option>
            <option value="compliance">Compliance</option>
          </select>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700"
          >
            <Plus size={20} />
            New Alert Rule
          </button>
        </div>
      </div>

      {/* Alert Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[var(--color-surface)] border rounded-lg p-4">
          <div className="flex items-center gap-2 text-[var(--color-textSecondary)] mb-2">
            <Bell size={16} />
            <span className="text-sm">Total Alerts</span>
          </div>
          <div className="text-2xl font-bold">{alerts.length}</div>
        </div>
        <div className="bg-[var(--color-surface)] border rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <CheckCircle size={16} />
            <span className="text-sm">Active</span>
          </div>
          <div className="text-2xl font-bold">{alerts.filter(a => a.enabled).length}</div>
        </div>
        <div className="bg-[var(--color-surface)] border rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-600 mb-2">
            <AlertTriangle size={16} />
            <span className="text-sm">Triggered Today</span>
          </div>
          <div className="text-2xl font-bold">{alerts.filter(a => a.triggered_today).length}</div>
        </div>
        <div className="bg-[var(--color-surface)] border rounded-lg p-4">
          <div className="flex items-center gap-2 text-[var(--color-primary)]-600 mb-2">
            <Clock size={16} />
            <span className="text-sm">Avg Response Time</span>
          </div>
          <div className="text-2xl font-bold">5m</div>
        </div>
      </div>

      {/* Alert Rules List */}
      <div className="space-y-4">
        {filteredAlerts.map((alert) => (
          <div key={alert.id} className="bg-[var(--color-surface)] border rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold">{alert.name}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    alert.enabled ? 'bg-green-100 text-green-700' : 'bg-[var(--color-surface)] text-[var(--color-text)]'
                  }`}>
                    {alert.enabled ? 'Active' : 'Inactive'}
                  </span>
                  {alert.triggered_today && (
                    <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700">
                      Triggered Today
                    </span>
                  )}
                </div>
                <div className="text-sm text-[var(--color-textSecondary)] space-y-1">
                  <div className="flex items-center gap-2">
                    {alert.type === 'budget' && <DollarSign size={14} />}
                    {alert.type === 'delivery' && <CheckCircle size={14} />}
                    {alert.type === 'rate_limit' && <Zap size={14} />}
                    {alert.type === 'compliance' && <AlertTriangle size={14} />}
                    <span>Type: {alert.type}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter size={14} />
                    <span>Threshold: {alert.threshold}%</span>
                  </div>
                  {alert.last_triggered && (
                    <div className="flex items-center gap-2">
                      <Clock size={14} />
                      <span>Last triggered: {new Date(alert.last_triggered).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleToggleAlert(alert.id, alert.enabled)}
                  className="p-2 hover:bg-[var(--color-surface)] rounded"
                  title={alert.enabled ? 'Disable' : 'Enable'}
                >
                  {alert.enabled ? <XCircle size={16} /> : <CheckCircle size={16} />}
                </button>
                <button
                  onClick={() => handleDeleteAlert(alert.id)}
                  className="p-2 hover:bg-red-100 text-red-600 rounded"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredAlerts.length === 0 && (
          <div className="text-center py-12 text-[var(--color-textSecondary)]">
            <Bell size={48} className="mx-auto mb-4 text-[var(--color-textSecondary)]" />
            <p>No alert rules configured</p>
          </div>
        )}
      </div>

      {/* Create Alert Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--color-surface)] rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Create Alert Rule</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-[var(--color-textSecondary)] hover:text-[var(--color-text)]">
                <XCircle size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Alert Type</label>
                <select
                  value={newAlert.type}
                  onChange={(e) => setNewAlert({ ...newAlert, type: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="budget">Budget Threshold</option>
                  <option value="delivery">Delivery Rate Drop</option>
                  <option value="rate_limit">Rate Limit Warning</option>
                  <option value="compliance">Compliance Issue</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Threshold (%)</label>
                <input
                  type="number"
                  value={newAlert.threshold}
                  onChange={(e) => setNewAlert({ ...newAlert, threshold: parseInt(e.target.value) })}
                  className="w-full p-2 border rounded-lg"
                  min="0"
                  max="100"
                />
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newAlert.enabled}
                  onChange={(e) => setNewAlert({ ...newAlert, enabled: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Enable immediately</span>
              </label>
              <div className="flex gap-2">
                <button
                  onClick={handleCreateAlert}
                  className="flex-1 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700"
                >
                  Create Alert
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="py-2 px-4 border rounded-lg hover:bg-[var(--color-background)]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SMSAlertSystem;
