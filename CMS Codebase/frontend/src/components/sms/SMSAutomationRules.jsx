import { useState, useEffect } from 'react';
import { Plus, Trash2, Clock, Calendar, Users, Target, Zap, Play, Pause, Save, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const SMSAutomationRules = () => {
  const { api } = useAuth();
  const toast = useToast();
  const [rules, setRules] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRule, setNewRule] = useState({
    name: '',
    trigger: 'new_member',
    action: 'send_welcome',
    templateId: '',
    delay: 0,
    delayUnit: 'hours',
    conditions: []
  });

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const response = await api.get('/sms/automation/rules');
      setRules(response.data.rules || []);
    } catch (error) {
      console.error('Failed to fetch automation rules:', error);
    }
  };

  const handleCreateRule = async () => {
    try {
      await api.post('/sms/automation/rules', newRule);
      toast.success('Automation rule created');
      setShowCreateModal(false);
      fetchRules();
    } catch (error) {
      toast.error('Failed to create automation rule');
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;
    try {
      await api.delete(`/sms/automation/rules/${ruleId}`);
      toast.success('Automation rule deleted');
      fetchRules();
    } catch (error) {
      toast.error('Failed to delete automation rule');
    }
  };

  const handleToggleRule = async (ruleId, currentStatus) => {
    try {
      await api.put(`/sms/automation/rules/${ruleId}/status`, {
        active: !currentStatus
      });
      toast.success('Rule status updated');
      fetchRules();
    } catch (error) {
      toast.error('Failed to update rule status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">SMS Automation Rules</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700"
        >
          <Plus size={20} />
          New Rule
        </button>
      </div>

      {/* Rules List */}
      <div className="space-y-4">
        {rules.map((rule) => (
          <div key={rule.id} className="bg-[var(--color-surface)] border rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold">{rule.name}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    rule.active ? 'bg-green-100 text-green-700' : 'bg-[var(--color-surface)] text-[var(--color-text)]'
                  }`}>
                    {rule.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="text-sm text-[var(--color-textSecondary)] space-y-1">
                  <div className="flex items-center gap-2">
                    <Zap size={14} />
                    <span>Trigger: {rule.trigger}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target size={14} />
                    <span>Action: {rule.action}</span>
                  </div>
                  {rule.delay > 0 && (
                    <div className="flex items-center gap-2">
                      <Clock size={14} />
                      <span>Delay: {rule.delay} {rule.delayUnit}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleToggleRule(rule.id, rule.active)}
                  className="p-2 hover:bg-[var(--color-surface)] rounded"
                  title={rule.active ? 'Deactivate' : 'Activate'}
                >
                  {rule.active ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <button
                  onClick={() => handleDeleteRule(rule.id)}
                  className="p-2 hover:bg-red-100 text-red-600 rounded"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {rules.length === 0 && (
          <div className="text-center py-12 text-[var(--color-textSecondary)]">
            <Zap size={48} className="mx-auto mb-4 text-[var(--color-textSecondary)]" />
            <p>No automation rules configured</p>
          </div>
        )}
      </div>

      {/* Create Rule Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--color-surface)] rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Create Automation Rule</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-[var(--color-textSecondary)] hover:text-[var(--color-text)]">
                <XCircle size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Rule Name</label>
                <input
                  type="text"
                  value={newRule.name}
                  onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  placeholder="Enter rule name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Trigger</label>
                <select
                  value={newRule.trigger}
                  onChange={(e) => setNewRule({ ...newRule, trigger: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="new_member">New Member Joins</option>
                  <option value="member_inactive">Member Inactive (30 days)</option>
                  <option value="event_rsvp">Event RSVP Received</option>
                  <option value="birthday">Member Birthday</option>
                  <option value="custom">Custom Trigger</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Action</label>
                <select
                  value={newRule.action}
                  onChange={(e) => setNewRule({ ...newRule, action: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="send_welcome">Send Welcome Message</option>
                  <option value="send_reminder">Send Reminder</option>
                  <option value="send_announcement">Send Announcement</option>
                  <option value="send_birthday">Send Birthday Greeting</option>
                  <option value="custom">Custom Action</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Template</label>
                <select
                  value={newRule.templateId}
                  onChange={(e) => setNewRule({ ...newRule, templateId: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="">Select a template...</option>
                  <option value="1">Welcome Message</option>
                  <option value="2">Event Reminder</option>
                  <option value="3">Birthday Greeting</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Delay</label>
                  <input
                    type="number"
                    value={newRule.delay}
                    onChange={(e) => setNewRule({ ...newRule, delay: parseInt(e.target.value) })}
                    className="w-full p-2 border rounded-lg"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Unit</label>
                  <select
                    value={newRule.delayUnit}
                    onChange={(e) => setNewRule({ ...newRule, delayUnit: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                  >
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreateRule}
                  className="flex-1 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 flex items-center justify-center gap-2"
                >
                  <Save size={16} />
                  Create Rule
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

export default SMSAutomationRules;
