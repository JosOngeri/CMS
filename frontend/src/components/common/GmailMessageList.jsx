import React, { useState } from 'react';
import { 
  Check, Star, Archive, Trash2, MoreVertical, 
  RefreshCw, X, Clock, Filter 
} from 'lucide-react';
import { useColorPalette } from '../../contexts/ColorPaletteContext';

const GmailMessageList = ({
  items,
  tabs,
  activeTab,
  onTabChange,
  onCompose,
  onRefresh,
  onSelectAll,
  selectedItems,
  onToggleSelect,
  onToggleSelectAll,
  onBulkAction,
  onRowAction,
  emptyMessage = 'No messages found',
  loading = false
}) => {
  const { colors } = useColorPalette()
  const [hoveredRow, setHoveredRow] = useState(null);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return { color: colors.error, bg: colors.error + '20' };
      case 'high': return { color: colors.warning, bg: colors.warning + '20' };
      case 'normal': return { color: colors.primary, bg: colors.primary + '20' };
      case 'medium': return { color: colors.warning, bg: colors.warning + '20' };
      case 'low': return { color: colors.textSecondary, bg: colors.background };
      default: return { color: colors.textSecondary, bg: colors.background };
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const truncateText = (text, maxLength = 100) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const allSelected = items.length > 0 && selectedItems.size === items.length;
  const someSelected = selectedItems.size > 0 && selectedItems.size < items.length;

  return (
    <div className="rounded-lg shadow-sm" style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: '1px', borderStyle: 'solid' }}>
      {/* Category Tabs */}
      <div className="flex items-center overflow-x-auto" style={{ borderBottom: `1px solid ${colors.border}` }} role="tablist" aria-label="Message categories">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`${tab.id}-panel`}
            className="px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors"
            style={{
              borderColor: activeTab === tab.id ? colors.primary : 'transparent',
              color: activeTab === tab.id ? colors.primary : colors.textSecondary
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.color = colors.text
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.color = colors.textSecondary
              }
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.background }}>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => {
              if (el) el.indeterminate = someSelected;
            }}
            onChange={onToggleSelectAll}
            className="w-4 h-4 rounded"
            aria-label="Select all messages"
            style={{ accentColor: colors.primary }}
          />
          {selectedItems.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: colors.textSecondary }}>
                {selectedItems.size} selected
              </span>
              <button
                onClick={() => onBulkAction('archive')}
                className="p-1.5 rounded"
                aria-label="Archive selected"
                style={{ transition: 'background-color 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.border}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <Archive className="w-4 h-4" style={{ color: colors.textSecondary }} />
              </button>
              <button
                onClick={() => onBulkAction('delete')}
                className="p-1.5 rounded"
                aria-label="Delete selected"
                style={{ transition: 'background-color 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.border}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <Trash2 className="w-4 h-4" style={{ color: colors.textSecondary }} />
              </button>
              <button
                onClick={() => onBulkAction('markRead')}
                className="p-1.5 rounded"
                aria-label="Mark selected as read"
                style={{ transition: 'background-color 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.border}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <Check className="w-4 h-4" style={{ color: colors.textSecondary }} />
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="p-1.5 rounded"
            aria-label="Refresh messages"
            style={{ transition: 'background-color 0.2s' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.border}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <RefreshCw className="w-4 h-4" style={{ color: colors.textSecondary }} />
          </button>
          <span className="text-sm" style={{ color: colors.textSecondary }}>
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </span>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedItems.size > 0 && (
        <div className="flex items-center justify-between px-4 py-2 bg-[var(--color-primary)]-50 border-b border-[var(--color-primary)]-200">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onBulkAction('archive')}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--color-text)]  hover:bg-[var(--color-surface)]  rounded"
            >
              <Archive className="w-4 h-4" />
              Archive
            </button>
            <button
              onClick={() => onBulkAction('delete')}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--color-text)]  hover:bg-[var(--color-surface)]  rounded"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
            <button
              onClick={() => onBulkAction('markRead')}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--color-text)]  hover:bg-[var(--color-surface)]  rounded"
            >
              <Check className="w-4 h-4" />
              Mark as read
            </button>
          </div>
          <button
            onClick={() => onToggleSelectAll(false)}
            className="p-1.5 hover:bg-[var(--color-surface)]  rounded"
            aria-label="Clear selection"
          >
            <X className="w-4 h-4 text-[var(--color-textSecondary)] " />
          </button>
        </div>
      )}

      {/* Message List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-[var(--color-textSecondary)] ">Loading...</div>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="text-[var(--color-textSecondary)] mb-2">
            <Filter className="w-12 h-12 mx-auto" />
          </div>
          <p className="text-[var(--color-textSecondary)] ">{emptyMessage}</p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--color-border)] ">
          {items.map((item, index) => {
            const isSelected = selectedItems.has(item.id);
            const isHovered = hoveredRow === index;
            const isUnread = !item.read;

            return (
              <div
                key={item.id}
                onMouseEnter={() => setHoveredRow(index)}
                onMouseLeave={() => setHoveredRow(null)}
                className={`
                  flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors
                  ${isSelected ? 'bg-[var(--color-primary)]-50' : 'hover:bg-[var(--color-background)] /50'}
                  ${isUnread ? 'bg-[var(--color-surface)] ' : 'bg-[var(--color-background)]/50 /50'}
                `}
                onClick={() => onRowAction && onRowAction('view', item)}
              >
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => {
                    e.stopPropagation();
                    onToggleSelect(item.id);
                  }}
                  className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)]-600 focus:ring-[var(--color-primary)]-500"
                  onClick={(e) => e.stopPropagation()}
                />

                {/* Star */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRowAction && onRowAction('star', item);
                  }}
                  className={`p-1 hover:bg-[var(--color-surface)]  rounded ${
                    item.starred ? 'text-yellow-500' : 'text-[var(--color-textSecondary)]'
                  }`}
                >
                  <Star className={`w-4 h-4 ${item.starred ? 'fill-current' : ''}`} />
                </button>

                {/* Sender/Author */}
                <div className="w-48 flex-shrink-0">
                  <span className={`text-sm truncate block ${
                    isUnread ? 'font-semibold text-[var(--color-text)] ' : 'text-[var(--color-text)] '
                  }`}>
                    {item.sender || item.author || 'Unknown'}
                  </span>
                </div>

                {/* Subject + Preview */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm truncate ${
                      isUnread ? 'font-semibold text-[var(--color-text)] ' : 'text-[var(--color-text)] '
                    }`}>
                      {item.title || item.subject || '(No subject)'}
                    </span>
                    {item.type && (
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getPriorityColor(item.priority || 'normal')}`}>
                        {item.type}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[var(--color-textSecondary)]  truncate">
                    {truncateText(item.message || item.content || item.description, 80)}
                  </p>
                </div>

                {/* Date or Actions */}
                <div className="w-32 flex-shrink-0 flex items-center justify-end">
                  {isHovered ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRowAction && onRowAction('archive', item);
                        }}
                        className="p-1.5 hover:bg-[var(--color-surface)] rounded"
                        title="Archive"
                      >
                        <Archive className="w-4 h-4 text-[var(--color-textSecondary)] " />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRowAction && onRowAction('delete', item);
                        }}
                        className="p-1.5 hover:bg-[var(--color-surface)] rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-[var(--color-textSecondary)] " />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRowAction && onRowAction('markRead', item);
                        }}
                        className="p-1.5 hover:bg-[var(--color-surface)] rounded"
                        title="Mark as read"
                      >
                        <Check className="w-4 h-4 text-[var(--color-textSecondary)] " />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRowAction && onRowAction('snooze', item);
                        }}
                        className="p-1.5 hover:bg-[var(--color-surface)] rounded"
                        title="Snooze"
                      >
                        <Clock className="w-4 h-4 text-[var(--color-textSecondary)] " />
                      </button>
                    </div>
                  ) : (
                    <span className="text-sm text-[var(--color-textSecondary)]  whitespace-nowrap">
                      {formatDate(item.created_at || item.sent_at || item.date)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Compose Button */}
      {onCompose && (
        <button
          onClick={onCompose}
          className="fixed bottom-6 right-6 flex items-center gap-2 px-6 py-3 bg-[var(--color-primary)]-600 text-white rounded-full shadow-lg hover:bg-[var(--color-primary)]-700 transition-colors z-10"
          aria-label="Compose new message"
        >
          <span className="font-medium">Compose</span>
        </button>
      )}
    </div>
  );
};

export default GmailMessageList;
