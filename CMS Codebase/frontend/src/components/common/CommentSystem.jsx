import { useState, useEffect } from 'react';
import { MessageSquare, Send, X, User, Clock, Trash2, Edit2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const CommentSystem = ({ 
  entityType, 
  entityId, 
  allowComments = true,
  allowFeedback = true,
  maxHeight = 400 
}) => {
  const { api, user } = useAuth();
  const toast = useToast();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingComment, setEditingComment] = useState(null);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    fetchComments();
  }, [entityType, entityId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/comments/${entityType}/${entityId}`);
      setComments(response.data.comments || []);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!newComment.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post(`/comments/${entityType}/${entityId}`, {
        content: newComment,
        type: 'comment'
      });
      setComments([...comments, response.data.comment]);
      setNewComment('');
      toast.success('Comment added successfully');
    } catch (error) {
      toast.error('Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (commentId) => {
    if (!editText.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.put(`/comments/${commentId}`, {
        content: editText
      });
      setComments(comments.map(c => 
        c.id === commentId ? response.data.comment : c
      ));
      setEditingComment(null);
      setEditText('');
      toast.success('Comment updated successfully');
    } catch (error) {
      toast.error('Failed to update comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;

    try {
      await api.delete(`/comments/${commentId}`);
      setComments(comments.filter(c => c.id !== commentId));
      toast.success('Comment deleted successfully');
    } catch (error) {
      toast.error('Failed to delete comment');
    }
  };

  const startEdit = (comment) => {
    setEditingComment(comment.id);
    setEditText(comment.content);
  };

  const cancelEdit = () => {
    setEditingComment(null);
    setEditText('');
  };

  const canEditComment = (comment) => {
    return user?.id === comment.user_id || user?.roles?.includes('Super Admin');
  };

  const canDeleteComment = (comment) => {
    return user?.id === comment.user_id || user?.roles?.includes('Super Admin');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--color-primary)]-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Comments Section */}
      {allowComments && (
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Comments ({comments.length})
          </h3>

          {/* Add Comment */}
          <div className="mb-4">
            <div className="flex gap-2">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 p-3 border border-[var(--color-border)]  rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]-500 focus:border-transparent  resize-none"
                rows={2}
                aria-label="New comment"
              />
              <button
                onClick={handleSubmit}
                disabled={submitting || !newComment.trim()}
                className="px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 disabled:bg-[var(--color-surface)] disabled:cursor-not-allowed flex items-center gap-2 min-h-[44px]"
                aria-label="Submit comment"
                aria-busy={submitting}
              >
                <Send className="h-4 w-4" />
                {submitting ? '...' : 'Send'}
              </button>
            </div>
          </div>

          {/* Comments List */}
          <div 
            className="space-y-3 overflow-y-auto pr-2"
            style={{ maxHeight: `${maxHeight}px` }}
          >
            {comments.length === 0 ? (
              <div className="text-center py-8 text-[var(--color-textSecondary)] ">
                <MessageSquare className="h-12 w-12 mx-auto mb-2 text-[var(--color-textSecondary)]" />
                <p>No comments yet</p>
              </div>
            ) : (
              comments.map((comment) => (
                <div 
                  key={comment.id} 
                  className="bg-[var(--color-background)]  rounded-lg p-4"
                >
                  {editingComment === comment.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full p-2 border border-[var(--color-border)]  rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]-500 focus:border-transparent  resize-none"
                        rows={3}
                        aria-label="Edit comment"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(comment.id)}
                          disabled={submitting}
                          className="px-3 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 disabled:bg-[var(--color-surface)] disabled:cursor-not-allowed text-sm min-h-[36px]"
                          aria-label="Save edit"
                          aria-busy={submitting}
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-3 py-2 border border-[var(--color-border)]  rounded-lg hover:bg-[var(--color-background)]  text-sm min-h-[36px]"
                          aria-label="Cancel edit"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--color-primary)]-500 to-violet-500 flex items-center justify-center">
                            <User className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <span className="font-medium text-sm">{comment.user_name}</span>
                            <div className="flex items-center gap-1 text-xs text-[var(--color-textSecondary)] ">
                              <Clock className="h-3 w-3" />
                              {new Date(comment.created_at).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        {(canEditComment(comment) || canDeleteComment(comment)) && (
                          <div className="flex gap-1">
                            {canEditComment(comment) && (
                              <button
                                onClick={() => startEdit(comment)}
                                className="p-1 text-[var(--color-textSecondary)] hover:text-[var(--color-primary)]-600 hover:bg-[var(--color-primary)]-50 rounded"
                                aria-label="Edit comment"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                            )}
                            {canDeleteComment(comment) && (
                              <button
                                onClick={() => handleDelete(comment.id)}
                                className="p-1 text-[var(--color-textSecondary)] hover:text-red-600 hover:bg-red-50 rounded"
                                aria-label="Delete comment"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      <p className="text-[var(--color-text)]  text-sm">{comment.content}</p>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Feedback Section */}
      {allowFeedback && (
        <div className="border-t border-[var(--color-border)]  pt-4">
          <h3 className="font-semibold mb-3">Feedback</h3>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setNewComment('👍 Positive feedback: ');
                document.querySelector('textarea')?.focus();
              }}
              className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm min-h-[36px]"
              aria-label="Add positive feedback"
            >
              👍 Positive
            </button>
            <button
              onClick={() => {
                setNewComment('👎 Negative feedback: ');
                document.querySelector('textarea')?.focus();
              }}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm min-h-[36px]"
              aria-label="Add negative feedback"
            >
              👎 Negative
            </button>
            <button
              onClick={() => {
                setNewComment('💡 Suggestion: ');
                document.querySelector('textarea')?.focus();
              }}
              className="px-4 py-2 bg-[var(--color-primary)]-100 text-[var(--color-primary)]-700 rounded-lg hover:bg-[var(--color-primary)]-200 text-sm min-h-[36px]"
              aria-label="Add suggestion"
            >
              💡 Suggestion
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommentSystem;
