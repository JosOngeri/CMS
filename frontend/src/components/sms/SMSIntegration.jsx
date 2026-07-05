import { useState, useEffect } from 'react';
import { Link2, CheckCircle, XCircle, Settings, RefreshCw, Calendar, DollarSign, FileText, Users, Zap, Bell } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const SMSIntegration = () => {
  const { api } = useAuth();
  const toast = useToast();
  const [integrations, setIntegrations] = useState([
    {
      id: 'events',
      name: 'Events Module',
      description: 'Send SMS reminders for events, RSVP confirmations, and event updates',
      icon: Calendar,
      enabled: true,
      features: ['Event reminders', 'RSVP confirmations', 'Event changes', 'Attendance tracking']
    },
    {
      id: 'treasury',
      name: 'Treasury Module',
      description: 'Send payment confirmations, donation receipts, and financial alerts',
      icon: DollarSign,
      enabled: true,
      features: ['Payment confirmations', 'Donation receipts', 'Budget alerts', 'Payment reminders']
    },
    {
      id: 'documents',
      name: 'Documents Module',
      description: 'Send document notifications, approval requests, and sharing alerts',
      icon: FileText,
      enabled: false,
      features: ['Document uploads', 'Approval requests', 'Sharing notifications', 'Version updates']
    },
    {
      id: 'members',
      name: 'Members Module',
      description: 'Send welcome messages, birthday greetings, and membership updates',
      icon: Users,
      enabled: true,
      features: ['Welcome messages', 'Birthday greetings', 'Anniversary wishes', 'Membership updates']
    },
    {
      id: 'notifications',
      name: 'Notifications Module',
      description: 'Send system notifications, alerts, and announcements via SMS',
      icon: Bell,
      enabled: true,
      features: ['System alerts', 'Announcements', 'Emergency notifications', 'Urgent updates']
    },
    {
      id: 'automation',
      name: 'Automation Module',
      description: 'Trigger SMS based on automated workflows and schedules',
      icon: Zap,
      enabled: false,
      features: ['Workflow triggers', 'Scheduled sends', 'Conditional sends', 'Batch processing']
    }
  ]);
  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);

  const handleToggleIntegration = async (integrationId) => {
    try {
      await api.put(`/sms/integrations/${integrationId}/toggle`);
      setIntegrations(integrations.map(int => 
        int.id === integrationId ? { ...int, enabled: !int.enabled } : int
      ));
      toast.success('Integration status updated');
    } catch (error) {
      toast.error('Failed to update integration status');
    }
  };

  const handleSyncIntegration = async (integrationId) => {
    try {
      await api.post(`/sms/integrations/${integrationId}/sync`);
      toast.success('Integration synced successfully');
    } catch (error) {
      toast.error('Failed to sync integration');
    }
  };

  const handleSaveConfig = async (config) => {
    try {
      await api.put(`/sms/integrations/${selectedIntegration.id}/config`, config);
      toast.success('Configuration saved');
      setShowConfigModal(false);
    } catch (error) {
      toast.error('Failed to save configuration');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">SMS Module Integrations</h2>
        <button
          onClick={() => toast.info('Integration status refreshed')}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-surface)] rounded-lg hover:bg-[var(--color-surface)]"
        >
          <RefreshCw size={16} />
          Refresh Status
        </button>
      </div>

      {/* Integration Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[var(--color-surface)] border rounded-lg p-4">
          <div className="flex items-center gap-2 text-[var(--color-textSecondary)] mb-2">
            <Link2 size={16} />
            <span className="text-sm">Total Integrations</span>
          </div>
          <div className="text-2xl font-bold">{integrations.length}</div>
        </div>
        <div className="bg-[var(--color-surface)] border rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <CheckCircle size={16} />
            <span className="text-sm">Active</span>
          </div>
          <div className="text-2xl font-bold">{integrations.filter(i => i.enabled).length}</div>
        </div>
        <div className="bg-[var(--color-surface)] border rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-600 mb-2">
            <XCircle size={16} />
            <span className="text-sm">Inactive</span>
          </div>
          <div className="text-2xl font-bold">{integrations.filter(i => !i.enabled).length}</div>
        </div>
        <div className="bg-[var(--color-surface)] border rounded-lg p-4">
          <div className="flex items-center gap-2 text-[var(--color-primary)]-600 mb-2">
            <Zap size={16} />
            <span className="text-sm">Active Features</span>
          </div>
          <div className="text-2xl font-bold">
            {integrations.reduce((sum, i) => sum + (i.enabled ? i.features.length : 0), 0)}
          </div>
        </div>
      </div>

      {/* Integration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map((integration) => {
          const Icon = integration.icon;
          return (
            <div key={integration.id} className="bg-[var(--color-surface)] border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${integration.enabled ? 'bg-[var(--color-primary)]-100' : 'bg-[var(--color-surface)]'}`}>
                    <Icon size={20} className={integration.enabled ? 'text-[var(--color-primary)]-600' : 'text-[var(--color-textSecondary)]'} />
                  </div>
                  <div>
                    <h3 className="font-semibold">{integration.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      integration.enabled ? 'bg-green-100 text-green-700' : 'bg-[var(--color-surface)] text-[var(--color-text)]'
                    }`}>
                      {integration.enabled ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-[var(--color-textSecondary)] mb-3">{integration.description}</p>
              <div className="mb-3">
                <div className="text-xs text-[var(--color-textSecondary)] mb-1">Features:</div>
                <div className="flex flex-wrap gap-1">
                  {integration.features.map((feature, idx) => (
                    <span key={idx} className="text-xs px-2 py-1 bg-[var(--color-surface)] rounded">
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleToggleIntegration(integration.id)}
                  className={`flex-1 py-2 text-sm rounded ${
                    integration.enabled 
                      ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  {integration.enabled ? 'Disable' : 'Enable'}
                </button>
                <button
                  onClick={() => { setSelectedIntegration(integration); setShowConfigModal(true); }}
                  className="py-2 px-3 text-sm bg-[var(--color-surface)] rounded hover:bg-[var(--color-surface)]"
                  title="Configure"
                >
                  <Settings size={14} />
                </button>
                {integration.enabled && (
                  <button
                    onClick={() => handleSyncIntegration(integration.id)}
                    className="py-2 px-3 text-sm bg-[var(--color-surface)] rounded hover:bg-[var(--color-surface)]"
                    title="Sync"
                  >
                    <RefreshCw size={14} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Configuration Modal */}
      {showConfigModal && selectedIntegration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--color-surface)] rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Configure {selectedIntegration.name}</h3>
              <button onClick={() => setShowConfigModal(false)} className="text-[var(--color-textSecondary)] hover:text-[var(--color-text)]">
                <XCircle size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Default Template</label>
                <select className="w-full p-2 border rounded-lg">
                  <option value="">Select template...</option>
                  <option value="1">Welcome Message</option>
                  <option value="2">Event Reminder</option>
                  <option value="3">Confirmation</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Send Schedule</label>
                <select className="w-full p-2 border rounded-lg">
                  <option value="immediate">Immediate</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="batch">Batch</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Retry Policy</label>
                <select className="w-full p-2 border rounded-lg">
                  <option value="none">No retry</option>
                  <option value="1">Retry once</option>
                  <option value="3">Retry 3 times</option>
                </select>
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="rounded" />
                <span className="text-sm">Enable logging</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="rounded" />
                <span className="text-sm">Send notifications on errors</span>
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSaveConfig({})}
                  className="flex-1 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700"
                >
                  Save Configuration
                </button>
                <button
                  onClick={() => setShowConfigModal(false)}
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

export default SMSIntegration;
