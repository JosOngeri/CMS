/**
 * @audit Approval inbox page.
 * @purpose Lists church-scoped approval requests, shows 30-day analytics,
 *          and lets authorized roles approve/reject (password-confirmed) or
 *          delete pending requests. Talks to /api/approvals via useAuth().api.
 * @exports ApprovalInbox
 * @deps   GET /approvals?filter=<status>, GET /approvals/analytics,
 *         PUT /approvals/:id/approve|reject, DELETE /approvals/:id
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { usePasswordConfirmation } from '../../hooks/usePasswordConfirmation';
import PasswordConfirmationModal from '../../components/common/PasswordConfirmationModal';
import Breadcrumb from '../../components/common/Breadcrumb';
import TabNavigation from '../../components/common/TabNavigation';
import { CheckCircle, Clock, XCircle, FileText, Activity, Trash2, Forward } from 'lucide-react';

const STATUS_STYLES = {
  pending: { chip: 'bg-[var(--color-warning-light)] text-[var(--color-warning)]', icon: Clock },
  approved: { chip: 'bg-[var(--color-success-light)] text-[var(--color-success)]', icon: CheckCircle },
  rejected: { chip: 'bg-[var(--color-error-light)] text-[var(--color-error)]', icon: XCircle }
};

const TAB_FILTERS = {
  overview: 'pending',
  pending: 'pending',
  approved: 'approved',
  rejected: 'rejected',
  history: 'all'
};

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
};

const formatType = (type) => (type || 'general').replace(/_/g, ' ');

const ApprovalInbox = () => {
  const { api } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [approvals, setApprovals] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actioningId, setActioningId] = useState(null);
  const [comments, setComments] = useState({});
  const {
    showPasswordModal,
    password,
    setPassword,
    isLoading: passwordLoading,
    requirePasswordConfirmation,
    handlePasswordConfirmation,
    cancelPasswordConfirmation
  } = usePasswordConfirmation();

  const approvalTabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'pending', label: 'Pending', icon: Clock },
    { id: 'approved', label: 'Approved', icon: CheckCircle },
    { id: 'rejected', label: 'Rejected', icon: XCircle },
    { id: 'history', label: 'History', icon: FileText }
  ];

  const fetchData = useCallback(async (tab) => {
    setLoading(true);
    setError(null);
    try {
      const filter = TAB_FILTERS[tab] || 'all';
      const params = { filter };
      if (tab === 'history') {
        params.sort = 'updated_at';
        params.order = 'desc';
      }
      const requests = [api.get('/approvals', { params })];
      if (tab === 'overview') {
        requests.push(api.get('/approvals/analytics'));
      }
      const [listRes, analyticsRes] = await Promise.all(requests);
      setApprovals(listRes.data?.data?.approvals || []);
      if (analyticsRes) {
        setAnalytics(analyticsRes.data?.data?.analytics || null);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load approvals');
      setApprovals([]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchData(activeTab);
  }, [activeTab, fetchData]);

  const refresh = () => fetchData(activeTab);

  const handleApprove = async (approvalId) => {
    setActioningId(approvalId);
    try {
      await api.put(`/approvals/${approvalId}/approve`, { comment: comments[approvalId] || undefined });
      toast.success('Request approved successfully');
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve request');
    } finally {
      setActioningId(null);
    }
  };

  // Escalate = delegate to the church's First Elder. The request stays
  // pending but becomes that user's responsibility, and they get notified.
  const handleEscalate = async (approvalId) => {
    setActioningId(approvalId);
    try {
      await api.put(`/approvals/${approvalId}/delegate`, {
        delegate_role: 'First Elder',
        comment: comments[approvalId] || undefined,
      });
      toast.success('Request escalated to First Elder');
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to escalate request');
    } finally {
      setActioningId(null);
    }
  };

  const handleRejectApproval = (approvalId) => {
    requirePasswordConfirmation(
      async () => {
        await api.put(`/approvals/${approvalId}/reject`, { comment: comments[approvalId] || undefined });
        toast.success('Request rejected successfully');
        await refresh();
      },
      'Please enter your password to confirm the rejection of this approval. This action cannot be undone.'
    );
  };

  const handleDeleteApproval = (approvalId) => {
    requirePasswordConfirmation(
      async () => {
        await api.delete(`/approvals/${approvalId}`);
        toast.success('Pending request deleted');
        await refresh();
      },
      'Please enter your password to confirm deletion of this pending request. This action cannot be undone.'
    );
  };

  const renderAnalytics = () => {
    if (!analytics) return null;
    const cards = [
      { label: 'Total (30d)', value: analytics.total ?? 0, color: 'text-[var(--color-text)]' },
      { label: 'Pending', value: analytics.pending ?? 0, color: 'text-[var(--color-warning)]' },
      { label: 'Approved', value: analytics.approved ?? 0, color: 'text-[var(--color-success)]' },
      { label: 'Rejected', value: analytics.rejected ?? 0, color: 'text-[var(--color-error)]' },
      {
        label: 'Avg. turnaround',
        value: analytics.avg_processing_hours != null
          ? `${Number(analytics.avg_processing_hours).toFixed(1)}h`
          : '—',
        color: 'text-[var(--color-primary)]'
      }
    ];
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-[var(--color-surface)] p-4 rounded-lg border border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-textSecondary)] uppercase tracking-wide">{card.label}</p>
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>
    );
  };

  const renderApprovalCard = (approval) => {
    const status = STATUS_STYLES[approval.status] || STATUS_STYLES.pending;
    const StatusIcon = status.icon;
    const isPending = approval.status === 'pending';
    const isActioning = actioningId === approval.id;

    return (
      <div key={approval.id} className="bg-[var(--color-surface)] p-5 rounded-lg border border-[var(--color-border)] space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h4 className="font-semibold text-[var(--color-text)] truncate">{approval.title || 'Untitled request'}</h4>
            <p className="text-xs text-[var(--color-textSecondary)] capitalize">
              {formatType(approval.request_type)} · requested by {approval.requester_name || 'Unknown'} · {formatDate(approval.created_at)}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {approval.priority && (
              <span className="text-xs px-2 py-1 rounded bg-[var(--color-primary-light)] text-[var(--color-primary)] capitalize">
                {approval.priority}
              </span>
            )}
            <span className={`text-xs px-2 py-1 rounded inline-flex items-center gap-1 ${status.chip}`}>
              <StatusIcon size={12} />
              {approval.status}
            </span>
          </div>
        </div>

        {approval.description && (
          <p className="text-sm text-[var(--color-textSecondary)]">{approval.description}</p>
        )}

        {approval.amount != null && (
          <p className="text-sm text-[var(--color-text)]">
            Amount: <span className="font-semibold">KES {Number(approval.amount).toLocaleString()}</span>
          </p>
        )}

        {!isPending && (
          <p className="text-xs text-[var(--color-textSecondary)]">
            {approval.status === 'approved' ? 'Approved' : 'Rejected'} by {approval.approver_name || 'Unknown'}
            {' · '}{formatDate(approval.approved_at || approval.rejected_at)}
            {approval.comments ? ` — ${approval.comments}` : ''}
          </p>
        )}

        {isPending && (
          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <input
              type="text"
              value={comments[approval.id] || ''}
              onChange={(e) => setComments((prev) => ({ ...prev, [approval.id]: e.target.value }))}
              placeholder="Optional comment"
              className="flex-1 text-sm px-3 py-2 rounded border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
            />
            <div className="flex gap-2">
              <button
                onClick={() => handleApprove(approval.id)}
                disabled={isActioning}
                className="px-3 py-2 text-sm rounded bg-[var(--color-success)] text-[var(--color-on-solid)] disabled:opacity-50 inline-flex items-center gap-1"
              >
                <CheckCircle size={14} /> Approve
              </button>
              <button
                onClick={() => handleRejectApproval(approval.id)}
                disabled={isActioning}
                className="px-3 py-2 text-sm rounded bg-[var(--color-error)] text-[var(--color-on-solid)] disabled:opacity-50 inline-flex items-center gap-1"
              >
                <XCircle size={14} /> Reject
              </button>
              <button
                onClick={() => handleEscalate(approval.id)}
                disabled={isActioning}
                title="Escalate to First Elder"
                className="px-3 py-2 text-sm rounded border border-[var(--color-border)] text-[var(--color-text)] disabled:opacity-50 inline-flex items-center gap-1"
              >
                <Forward size={14} /> Escalate
              </button>
              <button
                onClick={() => handleDeleteApproval(approval.id)}
                disabled={isActioning}
                title="Delete pending request"
                className="px-3 py-2 text-sm rounded border border-[var(--color-border)] text-[var(--color-textSecondary)] disabled:opacity-50 inline-flex items-center gap-1"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderList = (emptyMessage) => {
    if (loading) {
      return <p className="text-[var(--color-textSecondary)] text-sm">Loading approvals…</p>;
    }
    if (error) {
      return <p className="text-[var(--color-error)] text-sm">{error}</p>;
    }
    if (approvals.length === 0) {
      return <p className="text-[var(--color-textSecondary)] text-sm">{emptyMessage}</p>;
    }
    return <div className="space-y-4">{approvals.map(renderApprovalCard)}</div>;
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {renderAnalytics()}
            <div>
              <h3 className="text-lg font-semibold text-[var(--color-text)] mb-3">Pending queue</h3>
              {renderList('No pending approval requests.')}
            </div>
          </div>
        );
      case 'pending':
        return renderList('No pending approval requests.');
      case 'approved':
        return renderList('No approved requests yet.');
      case 'rejected':
        return renderList('No rejected requests.');
      case 'history':
        return renderList('No approval history yet.');
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumb />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Approval Inbox</h1>
          <p className="text-sm text-[var(--color-textSecondary)]">Manage approval workflows and requests</p>
        </div>
      </div>

      <TabNavigation
        tabs={approvalTabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        persistKey="approvals-tab"
      />

      {renderTabContent()}

      <PasswordConfirmationModal
        show={showPasswordModal}
        onClose={cancelPasswordConfirmation}
        onConfirm={handlePasswordConfirmation}
        password={password}
        setPassword={setPassword}
        isLoading={passwordLoading}
        title="Confirm Action"
      />
    </div>
  );
};

export default ApprovalInbox;
