import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { MessageSquare, Calendar, RefreshCw, Filter, Search, Edit, Trash2 } from 'lucide-react';
import axios from 'axios';
import { useToast } from '../../contexts/ToastContext';
import { useColorPalette } from '../../contexts/ColorPaletteContext';

const TelegramPosts = () => {
  const { channelId } = useParams();
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const toast = useToast();
  const { colors } = useColorPalette();

  useEffect(() => {
    fetchPosts();
  }, [channelId]);

  const fetchPosts = async () => {
    try {
      const response = await axios.get(`/api/telegram/channels/${channelId}/posts`);
      setPosts(response.data.data);
    } catch (err) {
      toast.error('Failed to fetch posts');
    }
    setIsLoading(false);
  };

  const handleSync = async () => {
    try {
      const response = await axios.post(`/api/telegram/channels/${channelId}/sync`);
      toast.success(`Synced ${response.data.data.syncedCount} posts`);
      fetchPosts();
    } catch (err) {
      toast.error('Failed to sync posts');
    }
  };

  const filteredPosts = posts.filter(post =>
    post.message_text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.message_id.toString().includes(searchTerm)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: colors.background }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: colors.primary }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: colors.background }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: colors.text }}>
              Channel Posts
            </h1>
            <p className="mt-2" style={{ color: colors.textSecondary }}>
              View and manage Telegram channel posts
            </p>
          </div>
          <button
            onClick={handleSync}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white"
            style={{ backgroundColor: colors.primary }}
          >
            <RefreshCw className="h-4 w-4" />
            Sync Posts
          </button>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: colors.textSecondary }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search posts..."
              className="w-full pl-10 pr-4 py-2 rounded-lg"
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.text,
                borderWidth: '1px',
                borderStyle: 'solid'
              }}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg"
            style={{ backgroundColor: colors.surface, color: colors.text }}
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>
        </div>

        {/* Posts List */}
        <div className="space-y-4">
          {filteredPosts.length === 0 ? (
            <div className="text-center py-12 rounded-lg" style={{ backgroundColor: colors.surface }}>
              <MessageSquare className="h-12 w-12 mx-auto mb-4" style={{ color: colors.textSecondary }} />
              <p className="text-lg font-medium" style={{ color: colors.text }}>
                No posts found
              </p>
              <p className="mt-2" style={{ color: colors.textSecondary }}>
                {searchTerm ? 'Try a different search term' : 'Sync posts from Telegram to get started'}
              </p>
            </div>
          ) : (
            filteredPosts.map((post) => (
              <div
                key={post.id}
                className="p-6 rounded-lg shadow-sm"
                style={{ backgroundColor: colors.surface }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full" style={{ backgroundColor: colors.primary + '20' }}>
                      <MessageSquare className="h-5 w-5" style={{ color: colors.primary }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium" style={{ color: colors.text }}>
                          Message #{post.message_id}
                        </h3>
                        {post.is_edited && (
                          <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: colors.primary + '20', color: colors.primary }}>
                            Edited
                          </span>
                        )}
                        {post.synced_to_announcement && (
                          <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'var(--color-success)20', color: 'var(--color-success)' }}>
                            Synced
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-sm" style={{ color: colors.textSecondary }}>
                        <Calendar className="h-3 w-3" />
                        {post.post_date ? new Date(post.post_date).toLocaleString() : 'Unknown date'}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="p-2 rounded-lg hover:bg-[var(--color-surface)] transition-colors"
                      style={{ color: colors.text }}
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                      style={{ color: 'var(--color-error)' }}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div
                  className="p-4 rounded-lg"
                  style={{ backgroundColor: colors.background, color: colors.text }}
                >
                  {post.message_text || 'No text content'}
                </div>

                {post.edit_date && (
                  <div className="mt-2 text-sm" style={{ color: colors.textSecondary }}>
                    Last edited: {new Date(post.edit_date).toLocaleString()}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default TelegramPosts;