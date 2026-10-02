/**
 * WHAT THIS FILE DOES
 * -------------------
 * A Gmail-style message list used by pages like Announcements. Shows a list
 * of items with priority tabs, checkboxes for bulk selection, a refresh
 * button, and a floating "Compose" button for people who can create.
 *
 * Clicking a row calls onRowAction('view', item). The only row action
 * buttons shown are ones the parent page actually supports (delete).
 *
 * FILES IT TALKS TO
 * -----------------
 * - pages/announcements/Announcements.jsx → feeds items, handles view/delete/compose
 * - ColorPaletteContext.jsx               → church colours
 */
import React, { useState } from 'react';
import { Trash2, RefreshCw, X, Filter } from 'lucide-react';
import { fmtRelative } from '../../utils/format';

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
  const [hoveredRow, setHoveredRow] = useState(null);

  const getPriorityClass = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-[var(--color-error-light)] text-[var(--color-error)]';
      case 'high': return 'bg-[var(--color-warning-light)] text-[var(--color-warning)]';
      case 'medium': return 'bg-[var(--color-primary-light)] text-[var(--color-primary)]';
      case 'low':
      default: return 'bg-[var(--color-background)] text-[var(--color-textSecondary)]';
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
    <div className="rounded-lg shadow-sm bg-[var(--color-surface)] border border-[var(--color-border)]">
      {/* Category Tabs */}
      <div className="flex items-center overflow-x-auto border-b border-[var(--color-border)]" role="tablist" aria-label="Message categories">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`${tab.id}-panel`}
            className={`px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-[var(--color-textSecondary)] hover:text-[var(--color-text)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-background)]">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => {
              if (el) el.indeterminate = someSelected;
            }}
            onChange={onToggleSelectAll}
            className="w-4 h-4 rounded accent-[var(--color-primary)]"
            aria-label="Select all messages"
          />
          {selectedItems.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--color-textSecondary)]">
                {selectedItems.size} selected
              </span>
              <button
                onClick={() => onBulkAction('delete')}
                className="p-1.5 rounded transition-colors hover:bg-[var(--color-surfaceHover)]"
                aria-label="Delete selected"
              >
                <Trash2 className="w-4 h-4 text-[var(--color-textSecondary)]" />
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="p-1.5 rounded transition-colors hover:bg-[var(--color-surfaceHover)]"
            aria-label="Refresh messages"
          >
            <RefreshCw className="w-4 h-4 text-[var(--color-textSecondary)]" />
          </button>
          <span className="text-sm text-[var(--color-textSecondary)]">
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </span>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedItems.size > 0 && (
        <div className="flex items-center justify-between px-4 py-2 bg-[var(--color-primary-light)] border-b border-[var(--color-primary-light)]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onBulkAction('delete')}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface)] rounded"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
          <button
            onClick={() => onToggleSelectAll(false)}
            className="p-1.5 hover:bg-[var(--color-surface)] rounded"
            aria-label="Clear selection"
          >
            <X className="w-4 h-4 text-[var(--color-textSecondary)]" />
          </button>
        </div>
      )}

      {/* Message List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-[var(--color-textSecondary)]">Loading...</div>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="text-[var(--color-textSecondary)] mb-2">
            <Filter className="w-12 h-12 mx-auto" />
          </div>
          <p className="text-[var(--color-textSecondary)]">{emptyMessage}</p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--color-border)]">
          {items.map((item, index) => {
            const isSelected = selectedItems.has(item.id);
            const isHovered = hoveredRow === index;

            return (
              <div
                key={item.id}
                onMouseEnter={() => setHoveredRow(index)}
                onMouseLeave={() => setHoveredRow(null)}
                className={`
                  flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors
                  ${isSelected ? 'bg-[var(--color-primary-light)]' : 'hover:bg-[var(--color-background)]'}
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
                  className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                  onClick={(e) => e.stopPropagation()}
                />

                {/* Sender/Author */}
                <div className="w-48 flex-shrink-0">
                  <span className="text-sm truncate block font-medium text-[var(--color-text)]">
                    {item.sender || item.author || 'Church Office'}
                  </span>
                </div>

                {/* Subject + Preview */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm truncate font-medium text-[var(--color-text)]">
                      {item.title || item.subject || '(No subject)'}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${getPriorityClass(item.priority || 'normal')}`}
                    >
                      {item.priority || 'normal'}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--color-textSecondary)] truncate">
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
                          onRowAction && onRowAction('delete', item);
                        }}
                        className="p-1.5 hover:bg-[var(--color-surface)] rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-[var(--color-textSecondary)]" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-sm text-[var(--color-textSecondary)] whitespace-nowrap">
                      {fmtRelative(item.created_at || item.sent_at || item.date)}
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
          className="fixed bottom-6 right-6 flex items-center gap-2 px-6 py-3 bg-[var(--color-primary)] text-[var(--color-on-solid)] rounded-full shadow-lg hover:opacity-90 transition-opacity z-10"
          aria-label="Compose new message"
        >
          <span className="font-medium">Compose</span>
        </button>
      )}
    </div>
  );
};

export default GmailMessageList;
