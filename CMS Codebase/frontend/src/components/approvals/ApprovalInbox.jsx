import { useState, useEffect } from 'react';
import { Check, X, Clock, AlertCircle, Filter, Search, ArrowUp, ArrowDown, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const ApprovalInbox = () => {
  const { api } = useAuth();
  const toast = useToast();
  const [approvals, setApprovals] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('priority');
  const [sortOrder, setSortOrder] = useState('desc');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApprovals();
  }, [filter, sortBy, sortOrder]);

  const fetchApprovals = async () => {
    try {
      const response = await api.get(`/approvals?filter=${filter}&sort=${sortBy}&order=${sortOrder}`);
      setApprovals(response.data.approvals || []);
    } catch (error) {
      toast.error('Failed to load approvals');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await api.put(`/approvals/${id}/approve`);
      toast.success('Request approved');
      fetchApprovals();
    } catch (error) {
      toast.error('Failed to approve request');
    }
  };

  const handleReject = async (id) => {
    try {
      await api.put(`/approvals/${id}/reject`);
      toast.success('Request rejected');
      fetchApprovals();
    } catch (error) {
      toast.error('Failed to reject request');
    }
  };

  const handleDelegate = async (id, delegateTo) => {
    try {
      await api.put(`/approvals/${id}/delegate`, { delegateTo });
      toast.success('Request delegated');
      fetchApprovals();
    } catch (error) {
      toast.error('Failed to delegate request');
    }
  };

  const filteredApprovals = approvals.filter(approval =>
    approval.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    approval.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const priorityColors = {
    high: 'bg-red-100 text-red-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-green-100 text-green-700'
  };

  if (loading) {
    return <div className="text-center py-8">Loading approvals...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Approval Inbox</h2>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700" aria-label="Bulk approve all pending requests">
            <Check size={16} aria-hidden="true" />
            Bulk Approve
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-textSecondary)]" size={20} aria-hidden="true" />
          <input
            type="text"
            placeholder="Search approvals..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
            aria-label="Search approvals"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg"
          aria-label="Filter approvals by status"
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <button
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          className="p-2 border rounded-lg hover:bg-[var(--color-background)]"
          aria-label={`Sort by ${sortBy} in ${sortOrder === 'asc' ? 'ascending' : 'descending'} order`}
        >
          {sortOrder === 'asc' ? <ArrowUp size={20} aria-hidden="true" /> : <ArrowDown size={20} aria-hidden="true" />}
        </button>
      </div>

      {/* Approvals List */}
      <div className="space-y-3">
        {filteredApprovals.map((approval) => (
          <div key={approval.id} className="bg-[var(--color-surface)] border rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-1 rounded-full text-xs ${priorityColors[approval.priority]}`}>
                    {approval.priority}
                  </span>
                  <span className="text-sm text-[var(--color-textSecondary)]">{approval.type}</span>
                  <div className="flex items-center gap-1 text-sm text-[var(--color-textSecondary)]">
                    <Clock size={14} aria-hidden="true" />
                    {new Date(approval.created_at).toLocaleDateString()}
                  </div>
                </div>
                <h3 className="font-semibold">{approval.title}</h3>
                <p className="text-sm text-[var(--color-textSecondary)] mt-1">{approval.description}</p>
                <div className="flex items-center gap-2 mt-2 text-sm text-[var(--color-textSecondary)]">
                  <span>Requested by: {approval.requester_name}</span>
                  {approval.delegated_to && <span>→ Delegated to: {approval.delegated_to}</span>}
                </div>
              </div>
              <div className="flex gap-2">
                {approval.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleApprove(approval.id)}
                      className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200"
                      aria-label={`Approve request: ${approval.title}`}
                    >
                      <Check size={20} aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => handleReject(approval.id)}
                      className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                      aria-label={`Reject request: ${approval.title}`}
                    >
                      <X size={20} aria-hidden="true" />
                    </button>
                  </>
                )}
                {approval.status === 'approved' && (
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">Approved</span>
                )}
                {approval.status === 'rejected' && (
                  <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">Rejected</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredApprovals.length === 0 && (
        <div className="text-center py-12 text-[var(--color-textSecondary)]">
          <CheckCircle size={48} className="mx-auto mb-4 text-[var(--color-textSecondary)]" aria-hidden="true" />
          <p>No approvals found</p>
        </div>
      )}
    </div>
  );
};

export default ApprovalInbox;
