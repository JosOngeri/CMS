import { useState, useEffect } from 'react';
import { MessageSquare, Reply, Clock, CheckCircle, XCircle, AlertTriangle, Search, Filter, Trash2, Archive } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const SMSReplyHandler = () => {
  const { api } = useAuth();
  const toast = useToast();
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedReply, setSelectedReply] = useState(null);
  const [showReplyModal, setShowReplyModal] = useState(false);

  useEffect(() => {
    fetchReplies();
  }, []);

  const fetchReplies = async () => {
    try {
      const response = await api.get('/sms/replies');
      setReplies(response.data.replies || []);
    } catch (error) {
      console.error('Failed to fetch replies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (originalMessageId, replyText) => {
    try {
      await api.post('/sms/reply', {
        originalMessageId,
        replyText
      });
      toast.success('Reply sent successfully');
      setShowReplyModal(false);
      fetchReplies();
    } catch (error) {
      toast.error('Failed to send reply');
    }
  };

  const handleArchive = async (replyId) => {
    try {
      await api.put(`/sms/replies/${replyId}/archive`);
      toast.success('Reply archived');
      fetchReplies();
    } catch (error) {
      toast.error('Failed to archive reply');
    }
  };

  const handleDelete = async (replyId) => {
    if (!confirm('Are you sure you want to delete this reply?')) return;
    try {
      await api.delete(`/sms/replies/${replyId}`);
      toast.success('Reply deleted');
      fetchReplies();
    } catch (error) {
      toast.error('Failed to delete reply');
    }
  };

  const filteredReplies = replies.filter(reply => {
    const matchesSearch = reply.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         reply.sender.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || reply.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return <div className="text-center py-8">Loading replies...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">SMS Replies</h2>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-textSecondary)]" size={20} />
            <input
              type="text"
              placeholder="Search replies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-lg"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="all">All Status</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
            <option value="replied">Replied</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[var(--color-surface)] border rounded-lg p-4">
          <div className="flex items-center gap-2 text-[var(--color-textSecondary)] mb-2">
            <MessageSquare size={16} />
            <span className="text-sm">Total Replies</span>
          </div>
          <div className="text-2xl font-bold">{replies.length}</div>
        </div>
        <div className="bg-[var(--color-surface)] border rounded-lg p-4">
          <div className="flex items-center gap-2 text-[var(--color-primary)]-600 mb-2">
            <AlertTriangle size={16} />
            <span className="text-sm">Unread</span>
          </div>
          <div className="text-2xl font-bold">{replies.filter(r => r.status === 'unread').length}</div>
        </div>
        <div className="bg-[var(--color-surface)] border rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <CheckCircle size={16} />
            <span className="text-sm">Replied</span>
          </div>
          <div className="text-2xl font-bold">{replies.filter(r => r.status === 'replied').length}</div>
        </div>
        <div className="bg-[var(--color-surface)] border rounded-lg p-4">
          <div className="flex items-center gap-2 text-purple-600 mb-2">
            <Clock size={16} />
            <span className="text-sm">Avg Response Time</span>
          </div>
          <div className="text-2xl font-bold">2.5h</div>
        </div>
      </div>

      {/* Replies List */}
      <div className="space-y-4">
        {filteredReplies.map((reply) => (
          <div key={reply.id} className="bg-[var(--color-surface)] border rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[var(--color-primary)]-100 rounded-full flex items-center justify-center text-[var(--color-primary)]-600 font-bold">
                  {reply.sender.charAt(0)}
                </div>
                <div>
                  <div className="font-medium">{reply.sender}</div>
                  <div className="text-sm text-[var(--color-textSecondary)]">{reply.phone}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-full text-xs ${
                  reply.status === 'unread' ? 'bg-[var(--color-primary)]-100 text-[var(--color-primary)]-700' :
                  reply.status === 'read' ? 'bg-[var(--color-surface)] text-[var(--color-text)]' :
                  reply.status === 'replied' ? 'bg-green-100 text-green-700' :
                  'bg-[var(--color-surface)] text-[var(--color-text)]'
                }`}>
                  {reply.status}
                </span>
                <div className="text-xs text-[var(--color-textSecondary)]">
                  {new Date(reply.receivedAt).toLocaleString()}
                </div>
              </div>
            </div>
            <div className="mb-3">
              <div className="text-sm text-[var(--color-textSecondary)] mb-1">Original Message:</div>
              <div className="text-sm bg-[var(--color-background)] p-2 rounded">{reply.originalMessage}</div>
            </div>
            <div className="mb-3">
              <div className="text-sm text-[var(--color-textSecondary)] mb-1">Reply:</div>
              <div className="text-sm">{reply.message}</div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setSelectedReply(reply); setShowReplyModal(true); }}
                className="flex items-center gap-1 px-3 py-1 text-sm bg-[var(--color-primary)]-100 text-[var(--color-primary)]-700 rounded hover:bg-[var(--color-primary)]-200"
              >
                <Reply size={14} />
                Reply
              </button>
              <button
                onClick={() => handleArchive(reply.id)}
                className="flex items-center gap-1 px-3 py-1 text-sm bg-[var(--color-surface)] rounded hover:bg-[var(--color-surface)]"
              >
                <Archive size={14} />
                Archive
              </button>
              <button
                onClick={() => handleDelete(reply.id)}
                className="flex items-center gap-1 px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          </div>
        ))}

        {filteredReplies.length === 0 && (
          <div className="text-center py-12 text-[var(--color-textSecondary)]">
            <MessageSquare size={48} className="mx-auto mb-4 text-[var(--color-textSecondary)]" />
            <p>No replies found</p>
          </div>
        )}
      </div>

      {/* Reply Modal */}
      {showReplyModal && selectedReply && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--color-surface)] rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Reply to {selectedReply.sender}</h3>
              <button onClick={() => setShowReplyModal(false)} className="text-[var(--color-textSecondary)] hover:text-[var(--color-text)]">
                <XCircle size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="bg-[var(--color-background)] p-3 rounded">
                <div className="text-sm text-[var(--color-textSecondary)] mb-1">Original Reply:</div>
                <div className="text-sm">{selectedReply.message}</div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Your Response</label>
                <textarea
                  className="w-full p-2 border rounded-lg"
                  rows={4}
                  placeholder="Type your response..."
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleReply(selectedReply.originalMessageId, '')}
                  className="flex-1 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700"
                >
                  Send Reply
                </button>
                <button
                  onClick={() => setShowReplyModal(false)}
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

export default SMSReplyHandler;
