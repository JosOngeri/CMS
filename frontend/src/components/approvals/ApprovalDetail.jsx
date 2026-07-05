import { useState, useEffect } from 'react';
import { 
  Check, X, Clock, User, Calendar, FileText, 
  MessageSquare, ChevronRight, AlertCircle, 
  Shield, MoreVertical, Download, History
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import Modal from '../ui/Modal';

const ApprovalDetail = ({ approvalId, onClose, onApprove, onReject, onDelegate }) => {
  const { api } = useAuth();
  const toast = useToast();
  const [approval, setApproval] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [showDelegate, setShowDelegate] = useState(false);
  const [delegateTo, setDelegateTo] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (approvalId) {
      fetchApprovalDetail();
    }
  }, [approvalId]);

  const fetchApprovalDetail = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/approvals/${approvalId}`);
      setApproval(response.data.approval);
    } catch (error) {
      toast.error('Failed to load approval details');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      await api.put(`/approvals/${approvalId}/approve`, { comment });
      toast.success('Request approved successfully');
      if (onApprove) onApprove();
      onClose();
    } catch (error) {
      toast.error('Failed to approve request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    setSubmitting(true);
    try {
      await api.put(`/approvals/${approvalId}/reject`, { comment });
      toast.success('Request rejected successfully');
      if (onReject) onReject();
      onClose();
    } catch (error) {
      toast.error('Failed to reject request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelegate = async () => {
    if (!delegateTo) {
      toast.error('Please select a user to delegate to');
      return;
    }
    setSubmitting(true);
    try {
      await api.put(`/approvals/${approvalId}/delegate`, { delegateTo, comment });
      toast.success('Request delegated successfully');
      if (onDelegate) onDelegate();
      onClose();
    } catch (error) {
      toast.error('Failed to delegate request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Modal isOpen={true} onClose={onClose} title="Approval Details" size="lg">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]-600"></div>
        </div>
      </Modal>
    );
  }

  if (!approval) {
    return (
      <Modal isOpen={true} onClose={onClose} title="Approval Details" size="lg">
        <div className="text-center py-12 text-[var(--color-textSecondary)]">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-[var(--color-textSecondary)]" />
          <p>Approval not found</p>
        </div>
      </Modal>
    );
  }

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    delegated: 'bg-[var(--color-primary)]-100 text-[var(--color-primary)]-700'
  };

  const priorityColors = {
    high: 'bg-red-100 text-red-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-green-100 text-green-700'
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Approval Details" size="lg">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-semibold mb-2">{approval.title}</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-3 py-1 rounded-full text-sm ${statusColors[approval.status]}`}>
                {approval.status.charAt(0).toUpperCase() + approval.status.slice(1)}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm ${priorityColors[approval.priority]}`}>
                {approval.priority.charAt(0).toUpperCase() + approval.priority.slice(1)} Priority
              </span>
              <span className="text-sm text-[var(--color-textSecondary)]">{approval.type}</span>
            </div>
          </div>
          {approval.status === 'pending' && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowDelegate(true)}
                className="p-2 text-[var(--color-primary)]-600 hover:bg-[var(--color-primary)]-50 rounded-lg"
                aria-label="Delegate request"
              >
                <User className="h-5 w-5" />
              </button>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="p-2 text-[var(--color-textSecondary)] hover:bg-[var(--color-background)] rounded-lg"
                aria-label="Toggle history"
              >
                <History className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>

        {/* Request Details */}
        <div className="bg-[var(--color-background)]  rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-[var(--color-textSecondary)]" />
              <span className="text-sm text-[var(--color-textSecondary)] ">Requested by:</span>
              <span className="text-sm font-medium">{approval.requester_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[var(--color-textSecondary)]" />
              <span className="text-sm text-[var(--color-textSecondary)] ">Created:</span>
              <span className="text-sm font-medium">
                {new Date(approval.created_at).toLocaleDateString()}
              </span>
            </div>
            {approval.delegated_to && (
              <div className="flex items-center gap-2">
                <ChevronRight className="h-4 w-4 text-[var(--color-textSecondary)]" />
                <span className="text-sm text-[var(--color-textSecondary)] ">Delegated to:</span>
                <span className="text-sm font-medium">{approval.delegated_to}</span>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Description
          </h4>
          <p className="text-[var(--color-text)] ">{approval.description}</p>
        </div>

        {/* History */}
        {showHistory && (
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <History className="h-4 w-4" />
              Approval History
            </h4>
            <div className="space-y-3">
              {approval.history?.map((item, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-[var(--color-background)]  rounded-lg">
                  <div className={`p-2 rounded-full ${
                    item.action === 'approved' ? 'bg-green-100 text-green-600' :
                    item.action === 'rejected' ? 'bg-red-100 text-red-600' :
                    'bg-[var(--color-primary)]-100 text-[var(--color-primary)]-600'
                  }`}>
                    {item.action === 'approved' ? <Check className="h-4 w-4" /> :
                     item.action === 'rejected' ? <X className="h-4 w-4" /> :
                     <Clock className="h-4 w-4" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{item.user}</span>
                      <span className="text-xs text-[var(--color-textSecondary)]">
                        {new Date(item.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--color-textSecondary)]  mt-1">
                      {item.action.charAt(0).toUpperCase() + item.action.slice(1)}
                      {item.comment && `: ${item.comment}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comment Input */}
        {approval.status === 'pending' && (
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Comment (Optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment for this approval..."
              className="w-full p-3 border border-[var(--color-border)]  rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]-500 focus:border-transparent  text-[var(--color-text)]"
              rows={3}
              aria-label="Approval comment"
            />
          </div>
        )}

        {/* Actions */}
        {approval.status === 'pending' && (
          <div className="flex gap-3 pt-4 border-t border-[var(--color-border)] ">
            <button
              onClick={handleApprove}
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-[var(--color-surface)] disabled:cursor-not-allowed min-h-[44px]"
              aria-label="Approve request"
              aria-busy={submitting}
            >
              <Check className="h-5 w-5" />
              {submitting ? 'Approving...' : 'Approve'}
            </button>
            <button
              onClick={handleReject}
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-[var(--color-surface)] disabled:cursor-not-allowed min-h-[44px]"
              aria-label="Reject request"
              aria-busy={submitting}
            >
              <X className="h-5 w-5" />
              {submitting ? 'Rejecting...' : 'Reject'}
            </button>
          </div>
        )}

        {/* Delegate Modal */}
        {showDelegate && (
          <Modal
            isOpen={showDelegate}
            onClose={() => setShowDelegate(false)}
            title="Delegate Request"
            size="md"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Delegate To</label>
                <select
                  value={delegateTo}
                  onChange={(e) => setDelegateTo(e.target.value)}
                  className="w-full p-3 border border-[var(--color-border)]  rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]-500 focus:border-transparent  text-[var(--color-text)]"
                  aria-label="Select user to delegate to"
                >
                  <option value="">Select a user...</option>
                  {approval.available_delegates?.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.role})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Comment (Optional)</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add a comment for the delegation..."
                  className="w-full p-3 border border-[var(--color-border)]  rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]-500 focus:border-transparent  text-[var(--color-text)]"
                  rows={3}
                  aria-label="Delegation comment"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleDelegate}
                  disabled={submitting || !delegateTo}
                  className="flex-1 px-4 py-3 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 disabled:bg-[var(--color-surface)] disabled:cursor-not-allowed min-h-[44px]"
                  aria-label="Confirm delegation"
                  aria-busy={submitting}
                >
                  {submitting ? 'Delegating...' : 'Delegate'}
                </button>
                <button
                  onClick={() => setShowDelegate(false)}
                  className="flex-1 px-4 py-3 border border-[var(--color-border)]  rounded-lg hover:bg-[var(--color-background)]  min-h-[44px]"
                  aria-label="Cancel delegation"
                >
                  Cancel
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </Modal>
  );
};

export default ApprovalDetail;
