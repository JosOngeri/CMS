import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, Paperclip, X, Loader2 } from 'lucide-react';
import axios from 'axios';
import { useToast } from '../../contexts/ToastContext';
import { useColorPalette } from '../../contexts/ColorPaletteContext';

const TelegramPostMessage = () => {
  const { channelId } = useParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [parseMode, setParseMode] = useState('HTML');
  const [disableNotification, setDisableNotification] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();
  const { colors } = useColorPalette();

  const handleFileAttach = (e) => {
    const files = Array.from(e.target.files);
    setAttachedFiles([...attachedFiles, ...files]);
  };

  const removeFile = (index) => {
    setAttachedFiles(attachedFiles.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() && attachedFiles.length === 0) {
      toast.error('Please enter a message or attach a file');
      return;
    }

    setIsLoading(true);
    try {
      if (attachedFiles.length > 0) {
        // Handle photo upload
        const formData = new FormData();
        attachedFiles.forEach((file) => {
          formData.append('files', file);
        });
        formData.append('caption', message);

        await axios.post(`/api/telegram/upload-photo`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        // Handle text message
        await axios.post(`/api/telegram/channels/${channelId}/post`, {
          text: message,
          parseMode,
          disableNotification,
        });
      }

      toast.success('Message sent successfully');
      navigate(`/telegram/channels/${channelId}/posts`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send message');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: colors.background }}>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold" style={{ color: colors.text }}>
            Post to Channel
          </h1>
          <p className="mt-2" style={{ color: colors.textSecondary }}>
            Send a message to your Telegram channel
          </p>
        </div>

        {/* Message Form */}
        <div className="p-6 rounded-lg shadow-sm" style={{ backgroundColor: colors.surface }}>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Message Text */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 rounded-lg resize-none"
                style={{
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.text,
                  borderWidth: '1px',
                  borderStyle: 'solid'
                }}
                placeholder="Type your message here..."
              />
              <div className="mt-2 text-sm" style={{ color: colors.textSecondary }}>
                {message.length} / 4096 characters
              </div>
            </div>

            {/* File Attachments */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                Attachments
              </label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center" style={{ borderColor: colors.border }}>
                <input
                  type="file"
                  multiple
                  onChange={handleFileAttach}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <Paperclip className="h-8 w-8 mb-2" style={{ color: colors.textSecondary }} />
                  <span style={{ color: colors.textSecondary }}>
                    Click to attach files or drag and drop
                  </span>
                </label>
              </div>

              {attachedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  {attachedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg"
                      style={{ backgroundColor: colors.background }}
                    >
                      <span className="text-sm" style={{ color: colors.text }}>
                        {file.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="p-1 rounded hover:bg-red-100"
                        style={{ color: 'var(--color-error)' }}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Options */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                  Parse Mode
                </label>
                <select
                  value={parseMode}
                  onChange={(e) => setParseMode(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg"
                  style={{
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.text,
                    borderWidth: '1px',
                    borderStyle: 'solid'
                  }}
                >
                  <option value="HTML">HTML</option>
                  <option value="Markdown">Markdown</option>
                  <option value="MarkdownV2">Markdown V2</option>
                  <option value="">None</option>
                </select>
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={disableNotification}
                  onChange={(e) => setDisableNotification(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm" style={{ color: colors.text }}>
                  Send silently (without notification)
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex-1 py-3 rounded-lg font-medium"
                style={{ backgroundColor: colors.background, color: colors.text }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-3 rounded-lg font-medium text-white flex items-center justify-center gap-2"
                style={{
                  backgroundColor: colors.primary,
                  opacity: isLoading ? 0.7 : 1,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Message
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TelegramPostMessage;