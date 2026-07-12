import React, { useState, useEffect, useRef } from 'react';
import { Command, Search, ChevronRight, HelpCircle } from 'lucide-react';

/**
 * SlashCommandWidget Component (Phase 10)
 * Provides slash command interface for quick actions
 * Triggers modals and shortcuts for common operations
 */
const SlashCommandWidget = ({ onCommand, onClose }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const modalRef = useRef(null);

  // Available commands
  const commands = [
    { id: 'new-announcement', label: 'New Announcement', icon: '📢', shortcut: '/announce', description: 'Create a new announcement' },
    { id: 'new-event', label: 'New Event', icon: '📅', shortcut: '/event', description: 'Create a new event' },
    { id: 'send-sms', label: 'Send SMS', icon: '💬', shortcut: '/sms', description: 'Send SMS to members' },
    { id: 'add-member', label: 'Add Member', icon: '👤', shortcut: '/member', description: 'Add a new member' },
    { id: 'new-payment', label: 'Record Payment', icon: '💰', shortcut: '/payment', description: 'Record a payment' },
    { id: 'upload-photo', label: 'Upload Photo', icon: '📷', shortcut: '/photo', description: 'Upload photo to gallery' },
    { id: 'create-report', label: 'Generate Report', icon: '📊', shortcut: '/report', description: 'Generate a report' },
    { id: 'search', label: 'Search', icon: '🔍', shortcut: '/search', description: 'Search across the system' },
    { id: 'settings', label: 'Settings', icon: '⚙️', shortcut: '/settings', description: 'Open settings' },
    { id: 'help', label: 'Help', icon: '❓', shortcut: '/help', description: 'Get help and documentation' },
  ];

  // Filter commands based on query
  const filteredCommands = commands.filter(cmd =>
    cmd.label.toLowerCase().includes(query.toLowerCase()) ||
    cmd.shortcut.toLowerCase().includes(query.toLowerCase())
  );

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Open with Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      
      // Close with Escape
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setQuery('');
      }
      
      // Navigate with arrow keys
      if (isOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
        }
        if (e.key === 'Enter' && filteredCommands.length > 0) {
          e.preventDefault();
          handleCommand(filteredCommands[selectedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        setIsOpen(false);
        setQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Handle command selection
  const handleCommand = (command) => {
    if (onCommand) {
      onCommand(command);
    }
    setIsOpen(false);
    setQuery('');
    setSelectedIndex(0);
  };

  // Trigger button
  const TriggerButton = () => (
    <button
      onClick={() => setIsOpen(true)}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold
                 bg-[var(--color-surface)] text-[var(--color-text)]
                 hover:bg-[var(--color-surface)]/80
                 transition-all duration-200"
      title="Press Ctrl+K to open command palette"
    >
      <Command className="w-4 h-4" />
      <span>Commands</span>
      <kbd className="px-2 py-0.5 text-xs bg-[var(--color-border)] rounded">
        Ctrl+K
      </kbd>
    </button>
  );

  // Modal
  const Modal = () => {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div
          ref={modalRef}
          className="w-full max-w-2xl bg-[var(--color-background)] rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)]">
            <Search className="w-5 h-5 text-[var(--color-textSecondary)]" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Type a command or search..."
              className="flex-1 bg-transparent text-[var(--color-text)] placeholder-[var(--color-textSecondary)] focus:outline-none"
            />
            <kbd className="px-2 py-0.5 text-xs bg-[var(--color-border)] rounded text-[var(--color-textSecondary)]">
              ESC
            </kbd>
          </div>

          {/* Command List */}
          <div className="max-h-96 overflow-y-auto p-2">
            {filteredCommands.length === 0 ? (
              <div className="text-center py-8 text-[var(--color-textSecondary)]">
                <HelpCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No commands found</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredCommands.map((command, index) => (
                  <button
                    key={command.id}
                    onClick={() => handleCommand(command)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors
                      ${index === selectedIndex
                        ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                        : 'hover:bg-[var(--color-surface)] text-[var(--color-text)]'
                      }`}
                  >
                    <span className="text-2xl">{command.icon}</span>
                    <div className="flex-1 text-left">
                      <div className="font-medium">{command.label}</div>
                      <div className="text-sm opacity-70">{command.description}</div>
                    </div>
                    <kbd className="px-2 py-0.5 text-xs bg-[var(--color-border)] rounded text-[var(--color-textSecondary)]">
                      {command.shortcut}
                    </kbd>
                    {index === selectedIndex && (
                      <ChevronRight className="w-5 h-5" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-[var(--color-border)] text-xs text-[var(--color-textSecondary)]">
            <div className="flex items-center justify-between">
              <span>Use arrow keys to navigate, Enter to select</span>
              <span>Press <kbd className="px-1 py-0.5 bg-[var(--color-border)] rounded">/</kbd> for quick commands</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <TriggerButton />
      <Modal />
    </>
  );
};

export default SlashCommandWidget;