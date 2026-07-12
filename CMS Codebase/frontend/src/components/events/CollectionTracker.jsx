import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Users, CheckCircle, Clock, XCircle, Plus, Eye } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { API_ENDPOINTS } from '../../constants/api';

const CollectionTracker = ({ collection, canContribute = true, canManage = false }) => {
  const { api } = useAuth();
  const toast = useToast();
  const [showContributionForm, setShowContributionForm] = useState(false);
  const [showContributions, setShowContributions] = useState(false);
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [contributionForm, setContributionForm] = useState({
    amount: '',
    payment_method: 'cash',
    notes: '',
    is_anonymous: false,
  });

  const progress = collection.progress || 0;
  const isCompleted = collection.status === 'completed';
  const isCancelled = collection.status === 'cancelled';
  const isActive = collection.status === 'active';

  const getStatusColor = () => {
    if (isCompleted) return 'bg-green-100 text-green-800 bg-green-900 text-green-200';
    if (isCancelled) return 'bg-red-100 text-red-800 bg-red-900 text-red-200';
    return 'bg-[var(--color-primary)]-100 text-[var(--color-primary)]-800 bg-[var(--color-primary)]-900 text-[var(--color-primary)]-200';
  };

  const getStatusIcon = () => {
    if (isCompleted) return <CheckCircle className="w-4 h-4" />;
    if (isCancelled) return <XCircle className="w-4 h-4" />;
    return <Clock className="w-4 h-4" />;
  };

  const loadContributions = async () => {
    try {
      setLoading(true);
      const response = await api.get(API_ENDPOINTS.COLLECTIONS.CONTRIBUTIONS(collection.id));
      setContributions(response.data.data || []);
    } catch (error) {
      console.error('Failed to load contributions:', error);
      toast.error('Failed to load contributions');
    } finally {
      setLoading(false);
    }
  };

  const handleContribute = async (e) => {
    e.preventDefault();
    try {
      await api.post(API_ENDPOINTS.COLLECTIONS.CONTRIBUTIONS(collection.id), {
        amount: parseFloat(contributionForm.amount),
        payment_method: contributionForm.payment_method,
        notes: contributionForm.notes,
        is_anonymous: contributionForm.is_anonymous,
      });
      toast.success('Contribution added successfully');
      setShowContributionForm(false);
      setContributionForm({ amount: '', payment_method: 'cash', notes: '', is_anonymous: false });
      // Reload contributions if visible
      if (showContributions) {
        loadContributions();
      }
    } catch (error) {
      console.error('Failed to add contribution:', error);
      toast.error(error.response?.data?.error || 'Failed to add contribution');
    }
  };

  const toggleContributions = () => {
    if (!showContributions) {
      loadContributions();
    }
    setShowContributions(!showContributions);
  };

  return (
    <div className="bg-[var(--color-surface)] rounded-lg shadow p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-[var(--color-text)] text-white">
              {collection.title}
            </h3>
            <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${getStatusColor()}`}>
              {getStatusIcon()}
              {collection.status}
            </span>
          </div>
          {collection.description && (
            <p className="text-sm text-[var(--color-textSecondary)] text-[var(--color-textSecondary)] mb-2">
              {collection.description}
            </p>
          )}
          <div className="flex items-center gap-4 text-sm text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">
            <span className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              {collection.visibility === 'church' ? 'Church-wide' : 'Department only'}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {collection.contribution_count || 0} contributions
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)]">
            Progress
          </span>
          <span className="text-sm font-semibold text-[var(--color-text)] text-white">
            {progress}%
          </span>
        </div>
        <div className="w-full bg-[var(--color-surface)] bg-[var(--color-surface)] rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-300 ${
              isCompleted ? 'bg-green-600' : 'bg-[var(--color-primary)]-600'
            }`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <div className="flex justify-between items-center mt-2">
          <div>
            <p className="text-xs text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">Raised</p>
            <p className="text-lg font-semibold text-[var(--color-text)] text-white">
              KES {parseFloat(collection.current_amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">Target</p>
            <p className="text-lg font-semibold text-[var(--color-text)] text-white">
              KES {parseFloat(collection.target_amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {isActive && canContribute && (
          <button
            onClick={() => setShowContributionForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Contribute
          </button>
        )}
        <button
          onClick={toggleContributions}
          className="flex items-center gap-2 px-4 py-2 border border-[var(--color-border)] text-[var(--color-text)] text-[var(--color-textSecondary)] rounded-lg hover:bg-[var(--color-background)] hover:bg-[var(--color-surface)] transition-colors"
        >
          <Eye className="w-4 h-4" />
          {showContributions ? 'Hide' : 'View'} Contributions
        </button>
      </div>

      {/* Contribution Form */}
      {showContributionForm && (
        <div className="mt-4 p-4 bg-[var(--color-background)] bg-[var(--color-surface)] rounded-lg">
          <h4 className="text-sm font-semibold text-[var(--color-text)] text-white mb-3">
            Add Contribution
          </h4>
          <form onSubmit={handleContribute} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-1">
                Amount (KES)
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={contributionForm.amount}
                onChange={(e) => setContributionForm({ ...contributionForm, amount: e.target.value })}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] text-white focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-1">
                Payment Method
              </label>
              <select
                value={contributionForm.payment_method}
                onChange={(e) => setContributionForm({ ...contributionForm, payment_method: e.target.value })}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] text-white focus:ring-2 focus:ring-green-500"
              >
                <option value="cash">Cash</option>
                <option value="mobile_money">Mobile Money (M-Pesa)</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="card">Card</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-1">
                Notes (optional)
              </label>
              <textarea
                rows={2}
                value={contributionForm.notes}
                onChange={(e) => setContributionForm({ ...contributionForm, notes: e.target.value })}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] text-white focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="anonymous"
                checked={contributionForm.is_anonymous}
                onChange={(e) => setContributionForm({ ...contributionForm, is_anonymous: e.target.checked })}
                className="w-4 h-4 text-green-600 border-[var(--color-border)] rounded focus:ring-green-500"
              />
              <label htmlFor="anonymous" className="text-sm text-[var(--color-text)] text-[var(--color-textSecondary)]">
                Make contribution anonymous
              </label>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowContributionForm(false)}
                className="flex-1 px-4 py-2 border border-[var(--color-border)] text-[var(--color-text)] text-[var(--color-textSecondary)] rounded-lg hover:bg-[var(--color-background)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Submit
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Contributions List */}
      {showContributions && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-[var(--color-text)] text-white mb-3">
            Contribution History
          </h4>
          {loading ? (
            <p className="text-sm text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">Loading contributions...</p>
          ) : contributions.length === 0 ? (
            <p className="text-sm text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">No contributions yet</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {contributions.map((contribution) => (
                <div
                  key={contribution.id}
                  className="flex items-center justify-between p-3 bg-[var(--color-background)] bg-[var(--color-surface)] rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text)] text-white">
                      {contribution.contributor_name || 'Anonymous'}
                    </p>
                    <p className="text-xs text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">
                      {new Date(contribution.created_at).toLocaleDateString()} • {contribution.payment_method}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-[var(--color-text)] text-white">
                    KES {parseFloat(contribution.amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CollectionTracker;
