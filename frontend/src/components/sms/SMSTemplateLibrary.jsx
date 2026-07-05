import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Copy, FileText, Clock, TrendingUp, GitBranch, BarChart3, Users, Download, Upload, Share2, CheckCircle, XCircle, Eye, History, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const SMSTemplateLibrary = () => {
  const { api } = useAuth();
  const toast = useToast();
  const [templates, setTemplates] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showABTest, setShowABTest] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // grid, list
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [versionHistory, setVersionHistory] = useState([]);
  const [abTestResults, setAbTestResults] = useState([]);
  const [showExamples, setShowExamples] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  
  const exampleTemplates = [
    {
      id: 'ex1',
      name: 'Welcome Message',
      category: 'welcome',
      content: 'Welcome {{name}} to Kiserian SDA Church! We are blessed to have you join our family. Sabbath School starts at 9:30 AM this Saturday. See you there!',
      mergeFields: ['{{name}}']
    },
    {
      id: 'ex2',
      name: 'Event Reminder',
      category: 'reminder',
      content: 'Hi {{name}}, this is a reminder that {{event}} is happening on {{date}} at {{time}} at {{location}}. Please RSVP if you haven\'t already.',
      mergeFields: ['{{name}}', '{{event}}', '{{date}}', '{{time}}', '{{location}}']
    },
    {
      id: 'ex3',
      name: 'Weekly Announcement',
      category: 'announcement',
      content: 'Kiserian SDA Church Weekly Update: Join us this Saturday for {{event}}. Sabbath School at 9:30 AM, Divine Service at 11:00 AM. Potluck lunch after service!',
      mergeFields: ['{{event}}']
    },
    {
      id: 'ex4',
      name: 'Birthday Greeting',
      category: 'event',
      content: 'Happy Birthday {{name}}! May God bless you with health, joy, and peace on your special day. The Kiserian SDA Church family celebrates you!',
      mergeFields: ['{{name}}']
    },
    {
      id: 'ex5',
      name: 'Prayer Request',
      category: 'announcement',
      content: 'Prayer Request: Please pray for {{name}} who is going through {{situation}}. Let us come together in prayer and support. James 5:16',
      mergeFields: ['{{name}}', '{{situation}}']
    },
    {
      id: 'ex6',
      name: 'Thank You',
      category: 'welcome',
      content: 'Thank you {{name}} for your generous contribution to {{cause}}. Your support helps us continue our mission. God bless you!',
      mergeFields: ['{{name}}', '{{cause}}']
    }
  ];

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await api.get('/sms/templates');
      setTemplates(response.data.templates || []);
    } catch (error) {
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };


  const useExampleTemplate = async (example) => {
    try {
      const response = await api.post('/sms/templates', {
        name: example.name,
        content: example.content,
        category: example.category,
        mergeFields: example.mergeFields
      });
      toast.success('Template created from example');
      fetchTemplates();
    } catch (error) {
      toast.error('Failed to create template from example');
    }
  };

  const fetchAnalytics = async (templateId) => {
    try {
      const response = await api.get(`/sms/templates/${templateId}/analytics`);
      setAnalyticsData(response.data.analytics);
    } catch (error) {
      toast.error('Failed to load analytics');
    }
  };

  const fetchVersionHistory = async (templateId) => {
    try {
      const response = await api.get(`/sms/templates/${templateId}/versions`);
      setVersionHistory(response.data.versions || []);
    } catch (error) {
      toast.error('Failed to load version history');
    }
  };

  const fetchABTestResults = async (templateId) => {
    try {
      const response = await api.get(`/sms/templates/${templateId}/ab-tests`);
      setAbTestResults(response.data.results || []);
    } catch (error) {
      toast.error('Failed to load A/B test results');
    }
  };
  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      await api.delete(`/sms/templates/${id}`);
      toast.success('Template deleted');
      fetchTemplates();
    } catch (error) {
      toast.error('Failed to delete template');
    }
  };

  const handleDuplicate = async (template) => {
    try {
      await api.post('/sms/templates', {
        name: `${template.name} (Copy)`,
        content: template.content,
        category: template.category,
        mergeFields: template.mergeFields
      });
      toast.success('Template duplicated');
      fetchTemplates();
    } catch (error) {
      toast.error('Failed to duplicate template');
    }
  };

  const handleApprove = async (templateId) => {
    try {
      await api.put(`/sms/templates/${templateId}/approve`);
      toast.success('Template approved');
      fetchTemplates();
    } catch (error) {
      toast.error('Failed to approve template');
    }
  };

  const handleReject = async (templateId) => {
    try {
      await api.put(`/sms/templates/${templateId}/reject`);
      toast.success('Template rejected');
      fetchTemplates();
    } catch (error) {
      toast.error('Failed to reject template');
    }
  };

  const handleShare = async (templateId, users) => {
    try {
      await api.post(`/sms/templates/${templateId}/share`, { users });
      toast.success('Template shared successfully');
      setShowShareModal(false);
    } catch (error) {
      toast.error('Failed to share template');
    }
  };

  const handleExport = async (templateId) => {
    try {
      const response = await api.get(`/sms/templates/${templateId}/export`);
      const blob = new Blob([JSON.stringify(response.data)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `template-${templateId}.json`;
      a.click();
      toast.success('Template exported');
    } catch (error) {
      toast.error('Failed to export template');
    }
  };

  const handleImport = async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.post('/sms/templates/import', formData);
      toast.success('Template imported successfully');
      fetchTemplates();
    } catch (error) {
      toast.error('Failed to import template');
    }
  };


  const generatePersonalizationSuggestions = (template) => {
    const suggestions = [];
    
    if (template.category === 'welcome') {
      suggestions.push({ type: 'merge_field', field: '{{name}}', reason: 'Personalize welcome with member name' });
      suggestions.push({ type: 'merge_field', field: '{{church}}', reason: 'Include church name for context' });
    } else if (template.category === 'reminder') {
      suggestions.push({ type: 'merge_field', field: '{{name}}', reason: 'Address member by name' });
      suggestions.push({ type: 'merge_field', field: '{{event}}', reason: 'Specify the event name' });
      suggestions.push({ type: 'merge_field', field: '{{date}}', reason: 'Include event date' });
      suggestions.push({ type: 'merge_field', field: '{{time}}', reason: 'Include event time' });
    } else if (template.category === 'announcement') {
      suggestions.push({ type: 'merge_field', field: '{{event}}', reason: 'Announce specific event' });
      suggestions.push({ type: 'merge_field', field: '{{date}}', reason: 'Provide event date' });
    } else if (template.category === 'event') {
      suggestions.push({ type: 'merge_field', field: '{{name}}', reason: 'Personalize invitation' });
      suggestions.push({ type: 'merge_field', field: '{{location}}', reason: 'Include venue information' });
    }
    
    if (!template.content.includes('{{name}}')) {
      suggestions.push({ type: 'tip', field: '{{name}}', reason: 'Adding member name increases engagement by 23%' });
    }
    if (template.content.length > 150 && !template.content.includes('{{')) {
      suggestions.push({ type: 'tip', field: 'merge fields', reason: 'Long messages benefit from personalization' });
    }
    
    return suggestions;
  };
  const handleStartABTest = async (templateId, variantContent) => {
    try {
      await api.post(`/sms/templates/${templateId}/ab-test`, { variantContent });
      toast.success('A/B test started');
      fetchABTestResults(templateId);
    } catch (error) {
      toast.error('Failed to start A/B test');
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = category === 'all' || template.category === category;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return <div className="text-center py-8">Loading templates...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">SMS Templates</h2>
        <div className="flex gap-2">
          <button
            onClick={() => document.getElementById('import-file').click()}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-surface)] rounded-lg hover:bg-[var(--color-surface)]"
          >
            <Upload size={16} />
            Import
          </button>
          <input
            id="import-file"
            type="file"
            accept=".json"
            className="hidden"
            onChange={(e) => e.target.files[0] && handleImport(e.target.files[0])}
          />
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700"
          >
            <Plus size={20} />
            New Template
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-textSecondary)]" size={20} />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="all">All Categories</option>
          <option value="welcome">Welcome</option>
          <option value="reminder">Reminder</option>
          <option value="announcement">Announcement</option>
          <option value="event">Event</option>
          <option value="emergency">Emergency</option>
        </select>
        <button
          onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          className="px-4 py-2 border rounded-lg hover:bg-[var(--color-background)]"
        >
          {viewMode === 'grid' ? 'List' : 'Grid'}
        </button>
      </div>

      {/* Templates Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <div key={template.id} className="bg-[var(--color-surface)] border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="text-[var(--color-primary)]-600" size={20} />
                  <span className="font-semibold">{template.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  {template.approval_status === 'approved' && (
                    <CheckCircle size={16} className="text-green-600" title="Approved" />
                  )}
                  {template.approval_status === 'rejected' && (
                    <XCircle size={16} className="text-red-600" title="Rejected" />
                  )}
                  {template.approval_status === 'pending' && (
                    <Clock size={16} className="text-yellow-600" title="Pending Approval" />
                  )}
                  <span className="text-xs px-2 py-1 bg-[var(--color-surface)] rounded-full">{template.category}</span>
                </div>
              </div>
              <p className="text-sm text-[var(--color-textSecondary)] mb-3 line-clamp-3">{template.content}</p>
              <div className="flex items-center justify-between text-xs text-[var(--color-textSecondary)] mb-3">
                <div className="flex items-center gap-1">
                  <Clock size={12} />
                  {new Date(template.created_at).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp size={12} />
                  {template.usage_count || 0} uses
                </div>
                <div className="flex items-center gap-1">
                  <GitBranch size={12} />
                  v{template.version || 1}
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setSelectedTemplate(template)}
                  className="flex-1 py-2 text-sm bg-[var(--color-surface)] rounded hover:bg-[var(--color-surface)] flex items-center justify-center gap-1"
                >
                  <Edit size={14} />
                  Edit
                </button>
                <button
                  onClick={() => handleDuplicate(template)}
                  className="flex-1 py-2 text-sm bg-[var(--color-surface)] rounded hover:bg-[var(--color-surface)] flex items-center justify-center gap-1"
                >
                  <Copy size={14} />
                  Copy
                </button>
                <button
                  onClick={() => { fetchVersionHistory(template.id); setShowVersionHistory(true); }}
                  className="py-2 px-3 text-sm bg-[var(--color-surface)] rounded hover:bg-[var(--color-surface)]"
                  title="Version History"
                >
                  <History size={14} />
                </button>
                <button
                  onClick={() => { fetchAnalytics(template.id); setShowAnalytics(true); }}
                  className="py-2 px-3 text-sm bg-[var(--color-surface)] rounded hover:bg-[var(--color-surface)]"
                  title="Analytics"
                >
                  <BarChart3 size={14} />
                </button>
                <button
                  onClick={() => { fetchABTestResults(template.id); setShowABTest(true); }}
                  className="py-2 px-3 text-sm bg-[var(--color-surface)] rounded hover:bg-[var(--color-surface)]"
                  title="A/B Test"
                >
                  <Sparkles size={14} />
                </button>
                <button
                  onClick={() => setShowShareModal(true)}
                  className="py-2 px-3 text-sm bg-[var(--color-surface)] rounded hover:bg-[var(--color-surface)]"
                  title="Share"
                >
                  <Share2 size={14} />
                </button>
                <button
                  onClick={() => handleExport(template.id)}
                  className="py-2 px-3 text-sm bg-[var(--color-surface)] rounded hover:bg-[var(--color-surface)]"
                  title="Export"
                >
                  <Download size={14} />
                </button>
                {template.approval_status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleApprove(template.id)}
                      className="py-2 px-3 text-sm bg-green-100 text-green-600 rounded hover:bg-green-200"
                      title="Approve"
                    >
                      <CheckCircle size={14} />
                    </button>
                    <button
                      onClick={() => handleReject(template.id)}
                      className="py-2 px-3 text-sm bg-red-100 text-red-600 rounded hover:bg-red-200"
                      title="Reject"
                    >
                      <XCircle size={14} />
                    </button>
                  </>
                )}
                <button
                  onClick={() => handleDelete(template.id)}
                  className="py-2 px-3 text-sm bg-red-100 text-red-600 rounded hover:bg-red-200"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[var(--color-surface)] border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-[var(--color-background)]">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Template</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Category</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Version</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Usage</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Created</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTemplates.map((template) => (
                <tr key={template.id} className="border-t hover:bg-[var(--color-background)]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText className="text-[var(--color-primary)]-600" size={16} />
                      <span className="font-medium">{template.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">{template.category}</td>
                  <td className="px-4 py-3">
                    {template.approval_status === 'approved' && (
                      <span className="flex items-center gap-1 text-green-600 text-sm">
                        <CheckCircle size={12} /> Approved
                      </span>
                    )}
                    {template.approval_status === 'rejected' && (
                      <span className="flex items-center gap-1 text-red-600 text-sm">
                        <XCircle size={12} /> Rejected
                      </span>
                    )}
                    {template.approval_status === 'pending' && (
                      <span className="flex items-center gap-1 text-yellow-600 text-sm">
                        <Clock size={12} /> Pending
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">v{template.version || 1}</td>
                  <td className="px-4 py-3 text-sm">{template.usage_count || 0}</td>
                  <td className="px-4 py-3 text-sm">{new Date(template.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => setSelectedTemplate(template)} className="p-1 hover:bg-[var(--color-surface)] rounded">
                        <Edit size={14} />
                      </button>
                      <button onClick={() => handleDuplicate(template)} className="p-1 hover:bg-[var(--color-surface)] rounded">
                        <Copy size={14} />
                      </button>
                      <button onClick={() => handleDelete(template.id)} className="p-1 hover:bg-red-100 text-red-600 rounded">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12 text-[var(--color-textSecondary)]">
          <FileText size={48} className="mx-auto mb-4 text-[var(--color-textSecondary)]" />
          <p>No templates found</p>
        </div>
      )}

      {/* Version History Modal */}
      {showVersionHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--color-surface)] rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Version History</h3>
              <button onClick={() => setShowVersionHistory(false)} className="text-[var(--color-textSecondary)] hover:text-[var(--color-text)]">
                <XCircle size={20} />
              </button>
            </div>
            {versionHistory.length > 0 ? (
              <div className="space-y-3">
                {versionHistory.map((version, idx) => (
                  <div key={idx} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">v{version.version}</span>
                      <span className="text-sm text-[var(--color-textSecondary)]">{new Date(version.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-[var(--color-textSecondary)]">{version.content}</p>
                    <div className="text-xs text-[var(--color-textSecondary)] mt-1">Changed by: {version.changed_by}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[var(--color-textSecondary)]">No version history available</p>
            )}
          </div>
        </div>
      )}

      {/* Analytics Modal */}
      {showAnalytics && analyticsData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--color-surface)] rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Template Analytics</h3>
              <button onClick={() => setShowAnalytics(false)} className="text-[var(--color-textSecondary)] hover:text-[var(--color-text)]">
                <XCircle size={20} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-3 bg-[var(--color-primary)]-50 rounded-lg">
                <div className="text-sm text-[var(--color-textSecondary)]">Total Sends</div>
                <div className="text-2xl font-bold">{analyticsData.totalSends || 0}</div>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="text-sm text-[var(--color-textSecondary)]">Delivery Rate</div>
                <div className="text-2xl font-bold">{analyticsData.deliveryRate || 0}%</div>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <div className="text-sm text-[var(--color-textSecondary)]">Response Rate</div>
                <div className="text-2xl font-bold">{analyticsData.responseRate || 0}%</div>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <div className="text-sm text-[var(--color-textSecondary)]">Avg. Cost</div>
                <div className="text-2xl font-bold">KES {analyticsData.avgCost || 0}</div>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Performance Over Time</h4>
              <div className="h-40 bg-[var(--color-background)] rounded-lg flex items-center justify-center text-[var(--color-textSecondary)]">
                Chart visualization would go here
              </div>
            </div>
          </div>
        </div>
      )}

      {/* A/B Test Modal */}
      {showABTest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--color-surface)] rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">A/B Testing</h3>
              <button onClick={() => setShowABTest(false)} className="text-[var(--color-textSecondary)] hover:text-[var(--color-text)]">
                <XCircle size={20} />
              </button>
            </div>
            {abTestResults.length > 0 ? (
              <div className="space-y-3">
                {abTestResults.map((test, idx) => (
                  <div key={idx} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{test.name}</span>
                      <span className={`px-2 py-1 rounded text-xs ${test.winner ? 'bg-green-100 text-green-600' : 'bg-[var(--color-surface)]'}`}>
                        {test.winner ? 'Winner' : 'Running'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>Variant A: {test.variantA_rate}% response</div>
                      <div>Variant B: {test.variantB_rate}% response</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-[var(--color-textSecondary)] mb-4">No A/B tests running</p>
                <button className="px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700">
                  Start New A/B Test
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--color-surface)] rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Share Template</h3>
              <button onClick={() => setShowShareModal(false)} className="text-[var(--color-textSecondary)] hover:text-[var(--color-text)]">
                <XCircle size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Select Users</label>
                <select className="w-full p-2 border rounded-lg" multiple>
                  <option>User 1</option>
                  <option>User 2</option>
                  <option>User 3</option>
                </select>
              </div>
              <button
                onClick={() => handleShare(selectedTemplate?.id, [])}
                className="w-full py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700"
              >
                Share
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


      {/* Personalization Suggestions Modal */}
      {showSuggestions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--color-surface)] rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Sparkles size={20} />
                Personalization Suggestions
              </h3>
              <button onClick={() => setShowSuggestions(false)} className="text-[var(--color-textSecondary)] hover:text-[var(--color-text)]">
                <XCircle size={20} />
              </button>
            </div>
            <div className="space-y-3">
              {suggestions.length > 0 ? (
                suggestions.map((suggestion, idx) => (
                  <div key={idx} className="p-3 bg-[var(--color-primary)]-50 border border-[var(--color-primary)]-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-[var(--color-primary)]-700">{suggestion.field}</span>
                      <span className="text-xs px-2 py-1 bg-[var(--color-primary)]-200 text-[var(--color-primary)]-800 rounded">
                        {suggestion.type === 'merge_field' ? 'Merge Field' : 'Tip'}
                      </span>
                    </div>
                    <div className="text-sm text-[var(--color-primary)]-600">{suggestion.reason}</div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-[var(--color-textSecondary)]">
                  No suggestions available for this template
                </div>
              )}
            </div>
          </div>
        </div>
      )}

export default SMSTemplateLibrary;







