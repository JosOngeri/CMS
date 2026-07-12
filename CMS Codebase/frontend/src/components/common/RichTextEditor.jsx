import { useState, useRef, useEffect } from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered, 
  Link, 
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
  X
} from 'lucide-react';

const RichTextEditor = ({ 
  value, 
  onChange, 
  label, 
  placeholder = 'Start typing...',
  className = '',
  icon: Icon,
  minHeight = 200
}) => {
  const editorRef = useRef(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const execCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleContentChange();
  };

  const handleContentChange = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleAddLink = () => {
    if (linkUrl) {
      execCommand('createLink', linkUrl);
      setLinkUrl('');
      setShowLinkModal(false);
    }
  };

  const handleAddImage = () => {
    if (imageUrl) {
      execCommand('insertImage', imageUrl);
      setImageUrl('');
      setShowImageModal(false);
    }
  };

  const toolbarButtons = [
    { icon: Bold, command: 'bold', title: 'Bold' },
    { icon: Italic, command: 'italic', title: 'Italic' },
    { icon: Underline, command: 'underline', title: 'Underline' },
    { divider: true },
    { icon: List, command: 'insertUnorderedList', title: 'Bullet List' },
    { icon: ListOrdered, command: 'insertOrderedList', title: 'Numbered List' },
    { divider: true },
    { icon: AlignLeft, command: 'justifyLeft', title: 'Align Left' },
    { icon: AlignCenter, command: 'justifyCenter', title: 'Align Center' },
    { icon: AlignRight, command: 'justifyRight', title: 'Align Right' },
    { divider: true },
    { icon: Link, action: () => setShowLinkModal(true), title: 'Add Link' },
    { icon: ImageIcon, action: () => setShowImageModal(true), title: 'Add Image' },
    { divider: true },
    { icon: Undo, command: 'undo', title: 'Undo' },
    { icon: Redo, command: 'redo', title: 'Redo' },
  ];

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-[var(--color-text)]">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4 text-[var(--color-textSecondary)]" aria-hidden="true" />}
            {label}
          </div>
        </label>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-t-lg">
        {toolbarButtons.map((button, index) => {
          if (button.divider) {
            return (
              <div key={`divider-${index}`} className="w-px h-6 bg-[var(--color-surface)] mx-1" />
            );
          }

          const Icon = button.icon;
          return (
            <button
              key={button.command || button.title}
              onClick={() => button.action ? button.action() : execCommand(button.command)}
              className="p-2 hover:bg-[var(--color-surface)] rounded transition-colors"
              title={button.title}
              aria-label={button.title}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
            </button>
          );
        })}
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleContentChange}
        className="min-h-[200px] p-4 border border-t-0 border-[var(--color-border)] rounded-b-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]-500 prose max-w-none"
        style={{ minHeight: `${minHeight}px` }}
        placeholder={placeholder}
        aria-label="Rich text editor"
        role="textbox"
        aria-multiline="true"
      />

      {/* Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--color-surface)] rounded-lg p-6 w-96 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add Link</h3>
              <button
                onClick={() => setShowLinkModal(false)}
                className="text-[var(--color-textSecondary)] hover:text-[var(--color-text)]"
                aria-label="Close"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]-500 mb-4"
              aria-label="Link URL"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddLink}
                className="flex-1 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700"
                aria-label="Add link"
              >
                Add Link
              </button>
              <button
                onClick={() => setShowLinkModal(false)}
                className="flex-1 px-4 py-2 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)]"
                aria-label="Cancel"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--color-surface)] rounded-lg p-6 w-96 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add Image</h3>
              <button
                onClick={() => setShowImageModal(false)}
                className="text-[var(--color-textSecondary)] hover:text-[var(--color-text)]"
                aria-label="Close"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]-500 mb-4"
              aria-label="Image URL"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddImage}
                className="flex-1 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700"
                aria-label="Add image"
              >
                Add Image
              </button>
              <button
                onClick={() => setShowImageModal(false)}
                className="flex-1 px-4 py-2 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)]"
                aria-label="Cancel"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RichTextEditor;
