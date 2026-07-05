import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { TrendingUp, Users, DollarSign, Clock, CheckCircle, XCircle, Brain, Target, Zap, AlertTriangle, Download, Share2, Calendar, Filter, Award, ArrowUp, ArrowDown, Activity, Globe, MessageSquare, Eye, BarChart3, Settings } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const SMSAnalytics = () => {
  const { api } = useAuth();
  const toast = useToast();
  const [analytics, setAnalytics] = useState({
    totalSent: 0,
    deliveryRate: 0,
    responseRate: 0,
    totalCost: 0,
    trends: [],
    topRecipients: [],
    predictiveData: [],
    benchmarks: [],
    collaborationInsights: [],
    goalTracking: []
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d'); // 7d, 30d, 90d, 1y
  const [showPredictive, setShowPredictive] = useState(false);
  const [showBenchmarks, setShowBenchmarks] = useState(false);
  const [showCollaboration, setShowCollaboration] = useState(false);
  const [showGoals, setShowGoals] = useState(false);
  const [showExecutiveSummary, setShowExecutiveSummary] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      const response = await api.get(`/sms/analytics?range=${timeRange}`);
      setAnalytics(response.data.analytics || {});
    } catch (error) {
      console.error('Failed to fetch SMS analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPredictiveAnalytics = async () => {
    try {
      const response = await api.get('/sms/analytics/predictive');
      setAnalytics(prev => ({ ...prev, predictiveData: response.data.predictions || [] }));
    } catch (error) {
      toast.error('Failed to load predictive analytics');
    }
  };

  const fetchBenchmarks = async () => {
    try {
      const response = await api.get('/sms/analytics/benchmarks');
      setAnalytics(prev => ({ ...prev, benchmarks: response.data.benchmarks || [] }));
    } catch (error) {
      toast.error('Failed to load benchmarks');
    }
  };

  const fetchCollaborationInsights = async () => {
    try {
      const response = await api.get('/sms/analytics/collaboration');
      setAnalytics(prev => ({ ...prev, collaborationInsights: response.data.insights || [] }));
    } catch (error) {
      toast.error('Failed to load collaboration insights');
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.get('/sms/analytics/export');
      const blob = new Blob([JSON.stringify(response.data)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sms-analytics-${timeRange}.json`;
      a.click();
      toast.success('Analytics exported');
    } catch (error) {
      toast.error('Failed to export analytics');
    }
  };

  const COLORS = [
    'var(--color-primary)',
    'var(--color-success)',
    'var(--color-accent)',
    'var(--color-warning)',
    'var(--color-error)'
  ];

  if (loading) {
    return <div className="text-center py-8">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">SMS Analytics</h2>
        <div className="flex gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <button
            onClick={() => setShowExecutiveSummary(!showExecutiveSummary)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-surface)] rounded-lg hover:bg-[var(--color-surface)]"
          >
            <Activity size={16} />
            Executive Summary
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-surface)] rounded-lg hover:bg-[var(--color-surface)]"
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {/* Executive Summary */}
      {showExecutiveSummary && (
        <div className="bg-gradient-to-r from-[var(--color-primary)]-50 to-purple-50 border rounded-lg p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Activity size={20} />
            Executive Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-[var(--color-surface)] p-4 rounded-lg shadow-sm">
              <div className="text-sm text-[var(--color-textSecondary)] mb-1">Key Insight</div>
              <div className="font-medium text-[var(--color-primary)]-600">Delivery rate up 5.2% vs last period</div>
            </div>
            <div className="bg-[var(--color-surface)] p-4 rounded-lg shadow-sm">
              <div className="text-sm text-[var(--color-textSecondary)] mb-1">Top Performer</div>
              <div className="font-medium text-green-600">Welcome templates: 98% delivery</div>
            </div>
            <div className="bg-[var(--color-surface)] p-4 rounded-lg shadow-sm">
              <div className="text-sm text-[var(--color-textSecondary)] mb-1">Cost Efficiency</div>
              <div className="font-medium text-purple-600">KES 0.45 per SMS (down 8%)</div>
            </div>
            <div className="bg-[var(--color-surface)] p-4 rounded-lg shadow-sm">
              <div className="text-sm text-[var(--color-textSecondary)] mb-1">Recommendation</div>
              <div className="font-medium text-orange-600">Increase weekend sends by 15%</div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="bg-[var(--color-surface)] border rounded-lg p-4">
          <div className="flex items-center gap-2 text-[var(--color-textSecondary)] mb-2">
            <Users size={16} />
            <span className="text-sm">Total Sent</span>
          </div>
          <div className="text-2xl font-bold">{analytics.totalSent.toLocaleString()}</div>
          <div className="text-xs text-green-600 flex items-center gap-1 mt-1">
            <ArrowUp size={10} /> 12% vs last period
          </div>
        </div>
        <div className="bg-[var(--color-surface)] border rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <CheckCircle size={16} />
            <span className="text-sm">Delivery Rate</span>
          </div>
          <div className="text-2xl font-bold">{analytics.deliveryRate}%</div>
          <div className="text-xs text-green-600 flex items-center gap-1 mt-1">
            <ArrowUp size={10} /> 3.2% vs last period
          </div>
        </div>
        <div className="bg-[var(--color-surface)] border rounded-lg p-4">
          <div className="flex items-center gap-2 text-[var(--color-primary)]-600 mb-2">
            <TrendingUp size={16} />
            <span className="text-sm">Response Rate</span>
          </div>
          <div className="text-2xl font-bold">{analytics.responseRate}%</div>
          <div className="text-xs text-red-600 flex items-center gap-1 mt-1">
            <ArrowDown size={10} /> 1.5% vs last period
          </div>
        </div>
        <div className="bg-[var(--color-surface)] border rounded-lg p-4">
          <div className="flex items-center gap-2 text-purple-600 mb-2">
            <DollarSign size={16} />
            <span className="text-sm">Total Cost</span>
          </div>
          <div className="text-2xl font-bold">KES {analytics.totalCost.toLocaleString()}</div>
          <div className="text-xs text-green-600 flex items-center gap-1 mt-1">
            <ArrowDown size={10} /> 8% vs last period
          </div>
        </div>
        <div className="bg-[var(--color-surface)] border rounded-lg p-4">
          <div className="flex items-center gap-2 text-orange-600 mb-2">
            <Target size={16} />
            <span className="text-sm">Goal Progress</span>
          </div>
          <div className="text-2xl font-bold">87%</div>
          <div className="text-xs text-[var(--color-textSecondary)] mt-1">Monthly target</div>
        </div>
        <div className="bg-[var(--color-surface)] border rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-600 mb-2">
            <AlertTriangle size={16} />
            <span className="text-sm">Opt-Out Rate</span>
          </div>
          <div className="text-2xl font-bold">0.8%</div>
          <div className="text-xs text-green-600 flex items-center gap-1 mt-1">
            <ArrowDown size={10} /> 0.3% vs last period
          </div>
        </div>
      </div>

      {/* Advanced Analytics Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <button
          onClick={() => { fetchPredictiveAnalytics(); setShowPredictive(!showPredictive); }}
          className="p-4 bg-[var(--color-surface)] border rounded-lg hover:shadow-md transition-shadow flex items-center gap-3"
        >
          <div className="p-3 bg-purple-100 rounded-lg">
            <Brain size={24} className="text-purple-600" />
          </div>
          <div className="text-left">
            <div className="font-semibold">Predictive Analytics</div>
            <div className="text-sm text-[var(--color-textSecondary)]">AI-powered insights and forecasts</div>
          </div>
        </button>
        <button
          onClick={() => { fetchBenchmarks(); setShowBenchmarks(!showBenchmarks); }}
          className="p-4 bg-[var(--color-surface)] border rounded-lg hover:shadow-md transition-shadow flex items-center gap-3"
        >
          <div className="p-3 bg-[var(--color-primary)]-100 rounded-lg">
            <Award size={24} className="text-[var(--color-primary)]-600" />
          </div>
          <div className="text-left">
            <div className="font-semibold">Benchmarks</div>
            <div className="text-sm text-[var(--color-textSecondary)]">Industry comparisons and standards</div>
          </div>
        </button>
        <button
          onClick={() => { fetchCollaborationInsights(); setShowCollaboration(!showCollaboration); }}
          className="p-4 bg-[var(--color-surface)] border rounded-lg hover:shadow-md transition-shadow flex items-center gap-3"
        >
          <div className="p-3 bg-green-100 rounded-lg">
            <Users size={24} className="text-green-600" />
          </div>
          <div className="text-left">
            <div className="font-semibold">Collaboration Insights</div>
            <div className="text-sm text-[var(--color-textSecondary)]">Team performance and insights</div>
          </div>
        </button>
        <button
          onClick={() => setShowGoals(!showGoals)}
          className="p-4 bg-[var(--color-surface)] border rounded-lg hover:shadow-md transition-shadow flex items-center gap-3"
        >
          <div className="p-3 bg-orange-100 rounded-lg">
            <Target size={24} className="text-orange-600" />
          </div>
          <div className="text-left">
            <div className="font-semibold">Goal Tracking</div>
            <div className="text-sm text-[var(--color-textSecondary)]">KPIs and performance targets</div>
          </div>
        </button>
      </div>

      {/* Predictive Analytics Section */}
      {showPredictive && (
        <div className="bg-[var(--color-surface)] border rounded-lg p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Brain size={20} />
            Predictive Analytics
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">Predicted Send Volume (Next 30 Days)</h4>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={analytics.predictiveData || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="predicted" stroke="var(--color-accent)" name="Predicted" strokeDasharray="5 5" />
                  <Line type="monotone" dataKey="actual" stroke="var(--color-primary)" name="Actual" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div>
              <h4 className="font-medium mb-3">AI Recommendations</h4>
              <div className="space-y-2">
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700">
                    <Zap size={16} />
                    <span className="font-medium">High Impact</span>
                  </div>
                  <p className="text-sm text-green-600 mt-1">Send reminders on Friday evenings for 23% higher response rate</p>
                </div>
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-700">
                    <AlertTriangle size={16} />
                    <span className="font-medium">Attention Needed</span>
                  </div>
                  <p className="text-sm text-yellow-600 mt-1">Delivery rate dropping for messages over 160 characters</p>
                </div>
                <div className="p-3 bg-[var(--color-primary)]-50 border border-[var(--color-primary)]-200 rounded-lg">
                  <div className="flex items-center gap-2 text-[var(--color-primary)]-700">
                    <TrendingUp size={16} />
                    <span className="font-medium">Opportunity</span>
                  </div>
                  <p className="text-sm text-[var(--color-primary)]-600 mt-1">Personalized messages show 15% higher engagement</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Benchmarks Section */}
      {showBenchmarks && (
        <div className="bg-[var(--color-surface)] border rounded-lg p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Award size={20} />
            Industry Benchmarks
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">Performance vs Industry Average</h4>
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={analytics.benchmarks || []}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" />
                  <PolarRadiusAxis />
                  <Radar name="Your Performance" dataKey="yourValue" stroke="var(--color-primary)" fill="var(--color-primary)" fillOpacity={0.6} />
                  <Radar name="Industry Average" dataKey="industryAvg" stroke="var(--color-success)" fill="var(--color-success)" fillOpacity={0.6} />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div>
              <h4 className="font-medium mb-3">Benchmark Details</h4>
              <div className="space-y-3">
                {[
                  { metric: 'Delivery Rate', yours: 95.2, industry: 92.0, status: 'above' },
                  { metric: 'Response Rate', yours: 12.5, industry: 8.0, status: 'above' },
                  { metric: 'Cost per SMS', yours: 0.45, industry: 0.50, status: 'above' },
                  { metric: 'Opt-out Rate', yours: 0.8, industry: 1.2, status: 'above' }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-[var(--color-background)] rounded-lg">
                    <div className="font-medium">{item.metric}</div>
                    <div className="flex items-center gap-4">
                      <div className="text-sm">
                        <span className="text-[var(--color-textSecondary)]">You:</span> {item.yours}
                      </div>
                      <div className="text-sm">
                        <span className="text-[var(--color-textSecondary)]">Industry:</span> {item.industry}
                      </div>
                      {item.status === 'above' ? (
                        <CheckCircle size={16} className="text-green-600" />
                      ) : (
                        <XCircle size={16} className="text-red-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Collaboration Insights Section */}
      {showCollaboration && (
        <div className="bg-[var(--color-surface)] border rounded-lg p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Users size={20} />
            Collaboration Insights
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
              <h4 className="font-medium mb-3">Top Contributors</h4>
              <div className="space-y-2">
                {analytics.collaborationInsights?.topContributors?.map((user, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-[var(--color-background)] rounded">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-[var(--color-primary)]-100 rounded-full flex items-center justify-center text-[var(--color-primary)]-600 font-bold text-sm">
                        {user.name.charAt(0)}
                      </div>
                      <span className="text-sm">{user.name}</span>
                    </div>
                    <span className="text-sm font-medium">{user.contributions} campaigns</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-3">Team Performance</h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={analytics.collaborationInsights?.teamPerformance || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="member" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="successRate" fill="var(--color-primary)" name="Success Rate %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div>
              <h4 className="font-medium mb-3">Process Improvement</h4>
              <div className="space-y-2">
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="font-medium text-green-700 text-sm">Template Standardization</div>
                  <div className="text-xs text-green-600 mt-1">Reduced errors by 40%</div>
                </div>
                <div className="p-3 bg-[var(--color-primary)]-50 border border-[var(--color-primary)]-200 rounded-lg">
                  <div className="font-medium text-[var(--color-primary)]-700 text-sm">Approval Workflow</div>
                  <div className="text-xs text-[var(--color-primary)]-600 mt-1">Faster approvals by 25%</div>
                </div>
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="font-medium text-purple-700 text-sm">Knowledge Sharing</div>
                  <div className="text-xs text-purple-600 mt-1">Template reuse up 60%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Goal Tracking Section */}
      {showGoals && (
        <div className="bg-[var(--color-surface)] border rounded-lg p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Target size={20} />
            Goal Tracking
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">Monthly Goals Progress</h4>
              <div className="space-y-4">
                {[
                  { goal: 'Total Sends', current: 8500, target: 10000, unit: 'messages' },
                  { goal: 'Delivery Rate', current: 95.2, target: 98, unit: '%' },
                  { goal: 'Response Rate', current: 12.5, target: 15, unit: '%' },
                  { goal: 'Cost Efficiency', current: 0.45, target: 0.40, unit: 'KES/SMS' }
                ].map((item, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{item.goal}</span>
                      <span>{item.current} / {item.target} {item.unit}</span>
                    </div>
                    <div className="w-full bg-[var(--color-surface)] rounded-full h-2">
                      <div
                        className="bg-[var(--color-primary)]-600 h-2 rounded-full"
                        style={{ width: `${Math.min((item.current / item.target) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-3">Goal History</h4>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={analytics.goalTracking || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="achieved" stroke="var(--color-success)" name="Achieved" />
                  <Line type="monotone" dataKey="target" stroke="var(--color-primary)" name="Target" strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Standard Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[var(--color-surface)] border rounded-lg p-4">
          <h3 className="font-semibold mb-4">SMS Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="sent" stroke="var(--color-primary)" name="Sent" />
              <Line type="monotone" dataKey="delivered" stroke="var(--color-success)" name="Delivered" />
              <Line type="monotone" dataKey="responses" stroke="var(--color-accent)" name="Responses" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[var(--color-surface)] border rounded-lg p-4">
          <h3 className="font-semibold mb-4">Response by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.responseByCategory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="responses" fill="var(--color-accent)" name="Responses" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Recipients */}
      <div className="bg-[var(--color-surface)] border rounded-lg p-4">
        <h3 className="font-semibold mb-4">Top Recipients by Engagement</h3>
        <div className="space-y-3">
          {analytics.topRecipients.map((recipient, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-[var(--color-background)] rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[var(--color-primary)]-100 rounded-full flex items-center justify-center text-[var(--color-primary)]-600 font-bold">
                  {recipient.name.charAt(0)}
                </div>
                <div>
                  <div className="font-medium">{recipient.name}</div>
                  <div className="text-sm text-[var(--color-textSecondary)]">{recipient.phone}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold">{recipient.responseRate}%</div>
                <div className="text-sm text-[var(--color-textSecondary)]">{recipient.totalMessages} messages</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SMSAnalytics;
