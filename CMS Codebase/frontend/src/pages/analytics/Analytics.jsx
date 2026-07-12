import React, { useState, useEffect } from 'react';
import { Activity, TrendingUp, Users, Calendar, DollarSign, Eye, BarChart3, PieChart, LineChart, Download, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const Analytics = () => {
  const { api } = useAuth();
  const toast = useToast();
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Analytics data states
  const [memberDemographics, setMemberDemographics] = useState(null);
  const [memberActivity, setMemberActivity] = useState([]);
  const [financialSummary, setFinancialSummary] = useState(null);
  const [contributionTrends, setContributionTrends] = useState([]);
  const [departmentPerformance, setDepartmentPerformance] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [collectionPerformance, setCollectionPerformance] = useState([]);
  const [collectionTrends, setCollectionTrends] = useState([]);
  const [eventEngagement, setEventEngagement] = useState([]);
  const [eventAttendance, setEventAttendance] = useState([]);
  const [smsPerformance, setSmsPerformance] = useState(null);
  const [smsDelivery, setSmsDelivery] = useState([]);
  const [customMetrics, setCustomMetrics] = useState([]);
  
  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange, activeTab]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'members':
          await Promise.all([
            fetchMemberDemographics(),
            fetchMemberActivity()
          ]);
          break;
        case 'finance':
          await Promise.all([
            fetchFinancialSummary(),
            fetchContributionTrends()
          ]);
          break;
        case 'departments':
          await fetchDepartmentPerformance();
          break;
        case 'attendance':
          await fetchAttendanceSummary();
          break;
        case 'collections':
          await Promise.all([
            fetchCollectionPerformance(),
            fetchCollectionTrends()
          ]);
          break;
        case 'events':
          await Promise.all([
            fetchEventEngagement(),
            fetchEventAttendance()
          ]);
          break;
        case 'sms':
          await Promise.all([
            fetchSmsPerformance(),
            fetchSmsDelivery()
          ]);
          break;
        default:
          await fetchOverviewData();
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const fetchOverviewData = async () => {
    // Fetch summary data for overview
    const response = await api.get('/analytics/dashboard');
    setMemberDemographics(response.data.data);
  };

  const fetchMemberDemographics = async () => {
    const response = await api.get('/analytics/member-demographics');
    setMemberDemographics(response.data.data);
  };

  const fetchMemberActivity = async () => {
    const response = await api.get('/analytics/member-activity', {
      params: { days: 30 }
    });
    setMemberActivity(response.data.data);
  };

  const fetchFinancialSummary = async () => {
    const response = await api.get('/analytics/financial-summary');
    setFinancialSummary(response.data.data);
  };

  const fetchContributionTrends = async () => {
    const response = await api.get('/analytics/contribution-trends', {
      params: { months: 12 }
    });
    setContributionTrends(response.data.data);
  };

  const fetchDepartmentPerformance = async () => {
    const response = await api.get('/analytics/department-performance', {
      params: { months: 6 }
    });
    setDepartmentPerformance(response.data.data);
  };

  const fetchAttendanceSummary = async () => {
    const response = await api.get('/analytics/attendance-summary');
    setAttendanceSummary(response.data.data);
  };

  const fetchCollectionPerformance = async () => {
    const response = await api.get('/analytics/collection-performance', {
      params: { months: 6 }
    });
    setCollectionPerformance(response.data.data);
  };

  const fetchCollectionTrends = async () => {
    const response = await api.get('/analytics/collection-trends', {
      params: { months: 12 }
    });
    setCollectionTrends(response.data.data);
  };

  const fetchEventEngagement = async () => {
    const response = await api.get('/analytics/event-engagement', {
      params: { months: 6 }
    });
    setEventEngagement(response.data.data);
  };

  const fetchEventAttendance = async () => {
    const response = await api.get('/analytics/event-attendance', {
      params: { months: 6 }
    });
    setEventAttendance(response.data.data);
  };

  const fetchSmsPerformance = async () => {
    const response = await api.get('/analytics/sms-performance', {
      params: { months: 6 }
    });
    setSmsPerformance(response.data.data);
  };

  const fetchSmsDelivery = async () => {
    const response = await api.get('/analytics/sms-delivery', {
      params: { months: 6 }
    });
    setSmsDelivery(response.data.data);
  };

  const handleExport = async (format = 'json') => {
    try {
      toast.loading('Exporting analytics...');
      const response = await api.post('/analytics/export', {
        type: activeTab,
        format,
        startDate: getDateRange().start,
        endDate: getDateRange().end
      });
      
      if (format === 'csv') {
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `analytics_${activeTab}_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
      
      toast.success('Analytics exported successfully');
    } catch (error) {
      console.error('Failed to export analytics:', error);
      toast.error('Failed to export analytics');
    }
  };

  const getDateRange = () => {
    const end = new Date();
    const start = new Date();
    switch (timeRange) {
      case '7d':
        start.setDate(start.getDate() - 7);
        break;
      case '30d':
        start.setDate(start.getDate() - 30);
        break;
      case '90d':
        start.setDate(start.getDate() - 90);
        break;
      case '1y':
        start.setFullYear(start.getFullYear() - 1);
        break;
      default:
        start.setDate(start.getDate() - 7);
    }
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  };

  // Mock analytics data
  const metrics = {
    totalVisitors: 12543,
    activeUsers: 892,
    pageViews: 45678,
    conversionRate: 3.2,
    avgSessionDuration: '4m 32s',
    bounceRate: 42.5
  };

  const trafficData = [
    { date: 'Mon', visitors: 1200, pageViews: 4500 },
    { date: 'Tue', visitors: 1450, pageViews: 5200 },
    { date: 'Wed', visitors: 1380, pageViews: 4900 },
    { date: 'Thu', visitors: 1620, pageViews: 5800 },
    { date: 'Fri', visitors: 1890, pageViews: 6200 },
    { date: 'Sat', visitors: 2100, pageViews: 7500 },
    { date: 'Sun', visitors: 1900, pageViews: 6800 },
  ];

  const topPages = [
    { page: '/dashboard', views: 12450, unique: 8900 },
    { page: '/departments', views: 8230, unique: 5600 },
    { page: '/treasury', views: 6780, unique: 4200 },
    { page: '/events', views: 5430, unique: 3800 },
    { page: '/gallery', views: 4120, unique: 2900 },
  ];

  const deviceBreakdown = [
    { device: 'Desktop', percentage: 65, users: 8153 },
    { device: 'Mobile', percentage: 28, users: 3512 },
    { device: 'Tablet', percentage: 7, users: 878 },
  ];

  const renderBarChart = (data, height = 200) => {
    const maxValue = Math.max(...data.map(d => d.visitors));
    
    return (
      <div className="flex items-end gap-2 h-full">
        {data.map((item, index) => {
          const heightPercent = (item.visitors / maxValue) * 100;
          return (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div 
                className="w-full bg-[var(--color-primary)]-500 rounded-t transition-all hover:bg-[var(--color-primary)]-600"
                style={{ height: `${heightPercent}%` }}
              />
              <span className="text-xs mt-2 text-[var(--color-textSecondary)]">{item.date}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderPieChart = (data) => {
    const colors = ['bg-[var(--color-primary)]-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500'];
    
    return (
      <div className="flex gap-4">
        <div className="relative w-32 h-32">
          <div className="absolute inset-0 rounded-full" style={{
            background: `conic-gradient(
              ${data[0].percentage}% blue 0%,
              ${data[0].percentage + data[1].percentage}% green 0%,
              ${data[0].percentage + data[1].percentage + data[2].percentage}% yellow 0%
            )`
          }} />
        </div>
        <div className="flex flex-col justify-center gap-2">
          {data.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded ${colors[index]}`} />
              <span className="text-sm">{item.device}: {item.percentage}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
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
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-[var(--color-surface)]  rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-textSecondary)]">Total Visitors</p>
              <p className="text-2xl font-bold">{metrics.totalVisitors.toLocaleString()}</p>
            </div>
            <Eye className="w-8 h-8 text-[var(--color-primary)]-600" />
          </div>
          <p className="text-sm text-green-600 mt-2">↑ 12.5% from last period</p>
        </div>
        <div className="bg-[var(--color-surface)]  rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-textSecondary)]">Active Users</p>
              <p className="text-2xl font-bold">{metrics.activeUsers.toLocaleString()}</p>
            </div>
            <Users className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-sm text-green-600 mt-2">↑ 8.3% from last period</p>
        </div>
        <div className="bg-[var(--color-surface)]  rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-textSecondary)]">Page Views</p>
              <p className="text-2xl font-bold">{metrics.pageViews.toLocaleString()}</p>
            </div>
            <Activity className="w-8 h-8 text-purple-600" />
          </div>
          <p className="text-sm text-green-600 mt-2">↑ 15.2% from last period</p>
        </div>
        <div className="bg-[var(--color-surface)]  rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-textSecondary)]">Conversion Rate</p>
              <p className="text-2xl font-bold">{metrics.conversionRate}%</p>
            </div>
            <TrendingUp className="w-8 h-8 text-orange-600" />
          </div>
          <p className="text-sm text-red-600 mt-2">↓ 2.1% from last period</p>
        </div>
        <div className="bg-[var(--color-surface)]  rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-textSecondary)]">Avg Session</p>
              <p className="text-2xl font-bold">{metrics.avgSessionDuration}</p>
            </div>
            <Calendar className="w-8 h-8 text-cyan-600" />
          </div>
          <p className="text-sm text-green-600 mt-2">↑ 5.4% from last period</p>
        </div>
        <div className="bg-[var(--color-surface)]  rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-textSecondary)]">Bounce Rate</p>
              <p className="text-2xl font-bold">{metrics.bounceRate}%</p>
            </div>
            <BarChart3 className="w-8 h-8 text-red-600" />
          </div>
          <p className="text-sm text-green-600 mt-2">↓ 3.8% from last period</p>
        </div>
      </div>

      {/* Traffic Chart */}
      <div className="bg-[var(--color-surface)]  rounded-lg border p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold flex items-center gap-2">
            <LineChart className="w-5 h-5" />
            Traffic Overview
          </h2>
        </div>
        <div className="h-64">
          {renderBarChart(trafficData)}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top Pages */}
        <div className="bg-[var(--color-surface)]  rounded-lg border p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Top Pages
          </h2>
          <div className="space-y-3">
            {topPages.map((page, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-[var(--color-background)] bg-[var(--color-surface)] rounded">
                <div>
                  <p className="font-medium">{page.page}</p>
                  <p className="text-sm text-[var(--color-textSecondary)]">{page.unique.toLocaleString()} unique visitors</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{page.views.toLocaleString()}</p>
                  <p className="text-sm text-[var(--color-textSecondary)]">views</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Device Breakdown */}
        <div className="bg-[var(--color-surface)]  rounded-lg border p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5" />
            Device Breakdown
          </h2>
          {renderPieChart(deviceBreakdown)}
        </div>
      </div>

      {/* Configuration */}
      <div className="bg-[var(--color-surface)]  rounded-lg border p-6">
        <h2 className="font-semibold mb-4">Analytics Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Tracking Code</label>
            <input
              type="text"
              defaultValue="UA-123456789-1"
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Google Analytics ID"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Data Retention</label>
            <select className="w-full px-3 py-2 border rounded-lg">
              <option>30 days</option>
              <option>90 days</option>
              <option>1 year</option>
              <option>Forever</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" defaultChecked className="rounded" />
            <label className="text-sm">Track user sessions</label>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" defaultChecked className="rounded" />
            <label className="text-sm">Track page views</label>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" defaultChecked className="rounded" />
            <label className="text-sm">Track events</label>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" className="rounded" />
            <label className="text-sm">Anonymize IP addresses</label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
