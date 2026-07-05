import { useState, useEffect } from 'react';
import { Send, Users, Hash, Clock, FileText, Eye, AlertTriangle, Zap, History, RotateCcw, Sparkles, Bold, Italic, Underline, Code, List, Type } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const SMSComposer = () => {
  const { api } = useAuth();
  const toast = useToast();
  const [formData, setFormData] = useState({
    recipients: 'all',
    recipientIds: [],
    message: '',
    scheduleDate: '',
    scheduleTime: '',
    templateId: '',
    enableReply: false,
    trackLinks: false
  });
  const [characterCount, setCharacterCount] = useState(0);
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [preview, setPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [mergeFields, setMergeFields] = useState([
    { key: '{{name}}', label: 'Member Name' },
    { key: '{{church}}', label: 'Church Name' },
    { key: '{{event}}', label: 'Event Name' },
    { key: '{{date}}', label: 'Event Date' },
    { key: '{{time}}', label: 'Event Time' },
    { key: '{{location}}', label: 'Location' }
  ]);
  const [complianceWarnings, setComplianceWarnings] = useState([]);
  const [rateLimitInfo, setRateLimitInfo] = useState({ remaining: 100, resetIn: 3600 });
  const [showMergeFields, setShowMergeFields] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showFormatting, setShowFormatting] = useState(false);
  const [recentMessages, setRecentMessages] = useState([]);
  const [deliveryStatuses, setDeliveryStatuses] = useState([]);
  const [showDeliveryStatus, setShowDeliveryStatus] = useState(false);

  const COST_PER_SMS = 0.5; // KES per SMS
  const MAX_CHARS = 1600;
  const SPAM_WORDS = ['free', 'win', 'winner', 'cash', 'prize', 'urgent', 'act now', 'limited time'];
  const REQUIRED_OPT_OUT = ['STOP', 'STOP to', 'unsubscribe', 'reply STOP'];

  useEffect(() => {
    fetchTemplates();
    fetchRateLimit();
    fetchRecentMessages();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await api.get('/sms/templates');
      setTemplates(response.data.templates || []);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const fetchRateLimit = async () => {
    try {
      const response = await api.get('/sms/rate-limit');
      setRateLimitInfo(response.data || { remaining: 100, resetIn: 3600 });
    } catch (error) {
      console.error('Failed to fetch rate limit:', error);
    }
  };

  const fetchRecentMessages = async () => {
    try {
      const response = await api.get('/sms/recent');
      setRecentMessages(response.data.messages || []);
    } catch (error) {
      console.error('Failed to fetch recent messages:', error);
    }
  };

  const handleMessageChange = (e) => {
    const message = e.target.value;
    setFormData({ ...formData, message });
    setCharacterCount(message.length);
    setEstimatedCost(Math.ceil(message.length / MAX_CHARS) * COST_PER_SMS);
    checkCompliance(message);
  };

  const checkCompliance = (message) => {
    const warnings = [];
    const lowerMessage = message.toLowerCase();

    // Check for spam words
    const foundSpamWords = SPAM_WORDS.filter(word => lowerMessage.includes(word));
    if (foundSpamWords.length > 0) {
      warnings.push({
        type: 'spam',
        message: `Contains potential spam words: ${foundSpamWords.join(', ')}`
      });
    }

    // Check for opt-out language
    const hasOptOut = REQUIRED_OPT_OUT.some(opt => lowerMessage.includes(opt.toLowerCase()));
    if (!hasOptOut && message.length > 50) {
      warnings.push({
        type: 'opt-out',
        message: 'Missing opt-out language (e.g., "STOP to unsubscribe")'
      });
    }

    // Check message length
    if (message.length > 160) {
      warnings.push({
        type: 'length',
        message: 'Message exceeds 160 characters (will be split into multiple parts)'
      });
    }

    setComplianceWarnings(warnings);
  };

  const insertMergeField = (field) => {
    const textarea = document.getElementById('sms-message');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = formData.message;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    const newText = before + field.key + after;
    
    setFormData({ ...formData, message: newText });
    setCharacterCount(newText.length);
    setEstimatedCost(Math.ceil(newText.length / MAX_CHARS) * COST_PER_SMS);
    checkCompliance(newText);
    
    // Restore cursor position
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + field.key.length;
      textarea.focus();
    }, 0);
  };

  const loadTemplate = async (templateId) => {
    try {
      const response = await api.get(`/sms/templates/${templateId}`);
      const template = response.data.template;
      setFormData({
        ...formData,
        message: template.content,
        templateId: templateId
      });
      setCharacterCount(template.content.length);
      setEstimatedCost(Math.ceil(template.content.length / MAX_CHARS) * COST_PER_SMS);
      checkCompliance(template.content);
      toast.success('Template loaded');
    } catch (error) {
      toast.error('Failed to load template');
    }
  };

  const loadFromHistory = (message) => {
    setFormData({ ...formData, message });
    setCharacterCount(message.length);
    setEstimatedCost(Math.ceil(message.length / MAX_CHARS) * COST_PER_SMS);
    checkCompliance(message);
    setShowHistory(false);
  };


  const applyFormatting = (format) => {
    const textarea = document.getElementById('sms-message');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = formData.message;
    const selectedText = text.substring(start, end);
    
    let formattedText = '';
    switch (format) {
      case 'bold':
        formattedText = `*${selectedText}*`;
        break;
      case 'italic':
        formattedText = `_${selectedText}_`;
        break;
      case 'underline':
        formattedText = selectedText.startsWith('_') && selectedText.endsWith('_') 
          ? selectedText.slice(1, -1) 
          : `_${selectedText}_`;
        break;
      case 'code':
        formattedText = `\`${selectedText}\``;
        break;
      case 'list':
        formattedText = `• ${selectedText}`;
        break;
      default:
        formattedText = selectedText;
    }
    
    const newText = text.substring(0, start) + formattedText + text.substring(end);
    setFormData({ ...formData, message: newText });
    setCharacterCount(newText.length);
    setEstimatedCost(Math.ceil(newText.length / MAX_CHARS) * COST_PER_SMS);
    checkCompliance(newText);
    
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + formattedText.length;
      textarea.focus();
    }, 0);
  };

  const fetchDeliveryStatuses = async () => {
    try {
      const response = await api.get('/sms/delivery-statuses');
      setDeliveryStatuses(response.data.statuses || []);
    } catch (error) {
      console.error('Failed to fetch delivery statuses:', error);
    }
  };
  const handleSend = async () => {
    if (!formData.message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    if (rateLimitInfo.remaining <= 0) {
      toast.error('Rate limit exceeded. Please wait before sending more messages.');
      return;
    }

    setSending(true);
    try {
      const response = await api.post('/sms/send', {
        recipients: formData.recipients,
        recipientIds: formData.recipientIds,
        message: formData.message,
        scheduleDate: formData.scheduleDate,
        scheduleTime: formData.scheduleTime,
        templateId: formData.templateId,
        enableReply: formData.enableReply,
        trackLinks: formData.trackLinks
      });

      if (response.data.success) {
        toast.success('SMS sent successfully');
        setFormData({
          ...formData,
          message: '',
          recipientIds: [],
          templateId: ''
        });
        setCharacterCount(0);
        setEstimatedCost(0);
        setComplianceWarnings([]);
        fetchRateLimit();
        fetchRecentMessages();
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to send SMS');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Send SMS</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-surface)] rounded-lg hover:bg-[var(--color-surface)]"
          >
            <History size={16} />
            History
          </button>
          <button
            onClick={() => setPreview(!preview)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-surface)] rounded-lg hover:bg-[var(--color-surface)]"
          >
            <Eye size={16} />
            {preview ? 'Hide Preview' : 'Show Preview'}
          </button>
        </div>
      </div>

      {/* Rate Limit Indicator */}
      <div className={`p-3 rounded-lg ${rateLimitInfo.remaining < 20 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'} border`}>
        <div className="flex items-center gap-2">
          <Zap size={16} className={rateLimitInfo.remaining < 20 ? 'text-red-600' : 'text-green-600'} />
          <span className="text-sm">
            Rate Limit: <strong>{rateLimitInfo.remaining}</strong> messages remaining
            {rateLimitInfo.remaining < 20 && ` (resets in ${Math.floor(rateLimitInfo.resetIn / 60)} minutes)`}
          </span>
        </div>
      </div>

      {/* Compliance Warnings */}
      {complianceWarnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-yellow-800 mb-1">Compliance Warnings</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                {complianceWarnings.map((warning, idx) => (
                  <li key={idx}>• {warning.message}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          {/* Template Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Template (Optional)</label>
            <select
              value={formData.templateId}
              onChange={(e) => e.target.value && loadTemplate(e.target.value)}
              className="w-full p-2 border rounded-lg"
            >
              <option value="">Select a template...</option>
              {templates.map(template => (
                <option key={template.id} value={template.id}>{template.name}</option>
              ))}
            </select>
          </div>

          {/* Recipient Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Recipients</label>
            <div className="flex gap-2">
              <button
                className={`flex-1 py-2 px-4 rounded-lg ${formData.recipients === 'all' ? 'bg-[var(--color-primary)]-600 text-white' : 'bg-[var(--color-surface)]'}`}
                onClick={() => setFormData({ ...formData, recipients: 'all' })}
              >
                <Users size={16} className="inline mr-2" />
                All Members
              </button>
              <button
                className={`flex-1 py-2 px-4 rounded-lg ${formData.recipients === 'group' ? 'bg-[var(--color-primary)]-600 text-white' : 'bg-[var(--color-surface)]'}`}
                onClick={() => setFormData({ ...formData, recipients: 'group' })}
              >
                <Hash size={16} className="inline mr-2" />
                Groups
              </button>
              <button
                className={`flex-1 py-2 px-4 rounded-lg ${formData.recipients === 'individual' ? 'bg-[var(--color-primary)]-600 text-white' : 'bg-[var(--color-surface)]'}`}
                onClick={() => setFormData({ ...formData, recipients: 'individual' })}
              >
                <Users size={16} className="inline mr-2" />
                Individual
              </button>
            </div>
          </div>

          {/* Message Input with Merge Fields */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">Message</label>
              <button
                onClick={() => setShowMergeFields(!showMergeFields)}
                className="flex items-center gap-1 text-sm text-[var(--color-primary)]-600 hover:text-[var(--color-primary)]-700"
              >
                <Sparkles size={14} />
                {showMergeFields ? 'Hide' : 'Show'} Merge Fields
              </button>
            </div>
            
            {showMergeFields && (
              <div className="mb-2 p-2 bg-[var(--color-primary)]-50 rounded-lg">
                <div className="text-xs text-[var(--color-primary)]-600 mb-1">Click to insert:</div>
                <div className="flex flex-wrap gap-1">
                  {mergeFields.map(field => (
                    <button
                      key={field.key}
                      onClick={() => insertMergeField(field)}
                      className="px-2 py-1 bg-[var(--color-surface)] border border-[var(--color-primary)]-200 rounded text-xs hover:bg-[var(--color-primary)]-100"
                    >
                      {field.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <textarea
              id="sms-message"
              value={formData.message}
              onChange={handleMessageChange}
              placeholder="Type your message here... Use merge fields like {{name}} for personalization"
              className="w-full h-40 p-3 border rounded-lg resize-none"
              maxLength={1600}
            />
            <div className="flex justify-between mt-2 text-sm text-[var(--color-textSecondary)]">
              <span>{characterCount} / 1600 characters ({Math.ceil(characterCount / 160)} parts)</span>
              <span>Est. Cost: KES {estimatedCost.toFixed(2)}</span>
            </div>
          </div>

          {/* Advanced Options */}
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.enableReply}
                onChange={(e) => setFormData({ ...formData, enableReply: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Enable reply handling</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.trackLinks}
                onChange={(e) => setFormData({ ...formData, trackLinks: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Track link clicks</span>
            </label>
          </div>

          {/* Scheduling */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Schedule Date (Optional)</label>
              <input
                type="date"
                value={formData.scheduleDate}
                onChange={(e) => setFormData({ ...formData, scheduleDate: e.target.value })}
                className="w-full p-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Schedule Time (Optional)</label>
              <input
                type="time"
                value={formData.scheduleTime}
                onChange={(e) => setFormData({ ...formData, scheduleTime: e.target.value })}
                className="w-full p-2 border rounded-lg"
              />
            </div>
          </div>

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={sending || !formData.message.trim() || rateLimitInfo.remaining <= 0}
            className="w-full py-3 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 disabled:bg-[var(--color-surface)] disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Send size={20} />
            {sending ? 'Sending...' : 'Send SMS'}
          </button>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Preview */}
          {preview && (
            <div className="bg-[var(--color-background)] p-4 rounded-lg">
              <h3 className="font-semibold mb-3">SMS Preview</h3>
              <div className="bg-[var(--color-surface)] p-4 rounded-lg border-2 border-[var(--color-border)] max-w-sm mx-auto">
                <div className="text-sm text-[var(--color-textSecondary)] mb-2">From: Kiserian SDA Church</div>
                <div className="text-sm whitespace-pre-wrap">{formData.message || 'Your message will appear here...'}</div>
                <div className="text-xs text-[var(--color-textSecondary)] mt-2">{characterCount} characters</div>
              </div>
            </div>
          )}

          {/* Recent Messages History */}
          {showHistory && (
            <div className="bg-[var(--color-background)] p-4 rounded-lg">
              <h3 className="font-semibold mb-3">Recent Messages</h3>
              {recentMessages.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {recentMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      onClick={() => loadFromHistory(msg.message)}
                      className="p-2 bg-[var(--color-surface)] rounded border cursor-pointer hover:bg-[var(--color-surface)]"
                    >
                      <div className="text-xs text-[var(--color-textSecondary)] mb-1">{new Date(msg.sentAt).toLocaleString()}</div>
                      <div className="text-sm truncate">{msg.message}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-[var(--color-textSecondary)]">No recent messages</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SMSComposer;


