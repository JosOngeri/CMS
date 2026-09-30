/**
 * WHAT THIS FILE DOES
 * -------------------
 * Church analytics dashboard. Each tab pulls real metrics from the backend
 * (members, finance, departments, attendance, collections, events, SMS) and
 * can be exported as JSON or CSV.
 *
 * FILES IT TALKS TO
 * -----------------
 * - backend /api/analytics/*  → all tab data + /export
 * - contexts/AuthContext.jsx  → authed api client
 */

import React, { useState, useEffect } from 'react';
import { Activity, Users, Calendar, Download } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'members', label: 'Members' },
  { id: 'finance', label: 'Finance' },
  { id: 'departments', label: 'Departments' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'collections', label: 'Collections' },
  { id: 'events', label: 'Events' },
  { id: 'sms', label: 'SMS' },
];

const fmtMoney = (n) => `KES ${Number(n || 0).toLocaleString()}`;
const fmtPct = (n) => `${Number(n || 0).toFixed(1)}%`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : '—');

const StatCard = ({ label, value, sub }) => (
  <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-4">
    <p className="text-sm text-[var(--color-textSecondary)]">{label}</p>
    <p className="text-2xl font-bold text-[var(--color-text)]">{value}</p>
    {sub && <p className="text-xs text-[var(--color-textSecondary)] mt-1">{sub}</p>}
  </div>
);

const DataTable = ({ columns, rows, empty = 'No data available for this period.' }) => (
  <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] overflow-hidden overflow-x-auto">
    <table className="min-w-full divide-y divide-[var(--color-border)]">
      <thead className="bg-[var(--color-background)]">
        <tr>
          {columns.map((c) => (
            <th key={c.key} className="px-4 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider">
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-[var(--color-border)]">
        {!rows || rows.length === 0 ? (
          <tr>
            <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-[var(--color-textSecondary)]">
              {empty}
            </td>
          </tr>
        ) : (
          rows.map((row, i) => (
            <tr key={i} className="hover:bg-[var(--color-background)]">
              {columns.map((c) => (
                <td key={c.key} className="px-4 py-3 text-sm text-[var(--color-text)] whitespace-nowrap">
                  {c.render ? c.render(row) : row[c.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

const Section = ({ title, children }) => (
  <div className="space-y-3">
    <h2 className="font-semibold text-[var(--color-text)] flex items-center gap-2">
      <Activity className="w-5 h-5 text-[var(--color-primary)]" />
      {title}
    </h2>
    {children}
  </div>
);

const Analytics = () => {
  const { api } = useAuth();
  const toast = useToast();
  const [timeRange, setTimeRange] = useState('30d');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const [dashboardStats, setDashboardStats] = useState(null);
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

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange, activeTab]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'members':
          await Promise.all([fetchMemberDemographics(), fetchMemberActivity()]);
          break;
        case 'finance':
          await Promise.all([fetchFinancialSummary(), fetchContributionTrends()]);
          break;
        case 'departments':
          await fetchDepartmentPerformance();
          break;
        case 'attendance':
          await fetchAttendanceSummary();
          break;
        case 'collections':
          await Promise.all([fetchCollectionPerformance(), fetchCollectionTrends()]);
          break;
        case 'events':
          await Promise.all([fetchEventEngagement(), fetchEventAttendance()]);
          break;
        case 'sms':
          await Promise.all([fetchSmsPerformance(), fetchSmsDelivery()]);
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
    const response = await api.get('/analytics/dashboard');
    setDashboardStats(response.data.data);
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
      params: getMonthsParam()
    });
    setContributionTrends(response.data.data);
  };

  const fetchDepartmentPerformance = async () => {
    const response = await api.get('/analytics/department-performance', {
      params: getMonthsParam()
    });
    setDepartmentPerformance(response.data.data);
  };

  const fetchAttendanceSummary = async () => {
    const response = await api.get('/analytics/attendance-summary');
    setAttendanceSummary(response.data.data);
  };

  const fetchCollectionPerformance = async () => {
    const response = await api.get('/analytics/collection-performance', {
      params: getMonthsParam()
    });
    setCollectionPerformance(response.data.data);
  };

  const fetchCollectionTrends = async () => {
    const response = await api.get('/analytics/collection-trends', {
      params: getMonthsParam()
    });
    setCollectionTrends(response.data.data);
  };

  const fetchEventEngagement = async () => {
    const response = await api.get('/analytics/event-engagement', {
      params: getMonthsParam()
    });
    setEventEngagement(response.data.data);
  };

  const fetchEventAttendance = async () => {
    const response = await api.get('/analytics/event-attendance', {
      params: getMonthsParam()
    });
    setEventAttendance(response.data.data);
  };

  const fetchSmsPerformance = async () => {
    const response = await api.get('/analytics/sms-performance', {
      params: getMonthsParam()
    });
    setSmsPerformance(response.data.data);
  };

  const fetchSmsDelivery = async () => {
    const response = await api.get('/analytics/sms-delivery', {
      params: getMonthsParam()
    });
    setSmsDelivery(response.data.data);
  };

  const getMonthsParam = () => ({
    months: timeRange === '1y' ? 12 : timeRange === '90d' ? 3 : 1
  });

  const handleExport = async (format = 'json') => {
    try {
      toast.info('Exporting analytics...');
      const { start, end } = getDateRange();
      const response = await api.post('/analytics/export', {
        type: activeTab,
        format,
        startDate: start,
        endDate: end
      }, format === 'csv' ? { responseType: 'blob' } : {});

      if (format === 'csv') {
        const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `analytics_${activeTab}_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } else {
        const blob = new Blob([JSON.stringify(response.data?.data ?? response.data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `analytics_${activeTab}_${Date.now()}.json`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
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
      case '90d':
        start.setDate(start.getDate() - 90);
        break;
      case '1y':
        start.setFullYear(start.getFullYear() - 1);
        break;
      default:
        start.setDate(start.getDate() - 30);
    }
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  };

  const renderOverview = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <StatCard label="Total Members" value={dashboardStats?.members?.total ?? '—'} sub={`${dashboardStats?.members?.active ?? 0} active`} />
      <StatCard label="Departments" value={dashboardStats?.departments?.total ?? '—'} />
      <StatCard label="Monthly Income" value={fmtMoney(dashboardStats?.finance?.monthly_income)} />
      <StatCard label="Monthly Expenses" value={fmtMoney(dashboardStats?.finance?.monthly_expense)} />
      <StatCard label="Pending Approvals" value={dashboardStats?.approvals?.pending ?? '—'} />
      <StatCard label="Unread Notifications" value={dashboardStats?.notifications?.unread ?? '—'} />
    </div>
  );

  const renderMembers = () => (
    <>
      {memberDemographics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Members" value={memberDemographics.total_members} />
          <StatCard label="Active" value={memberDemographics.active_members} />
          <StatCard label="Inactive" value={memberDemographics.inactive_members} />
          <StatCard label="Visitors" value={memberDemographics.visitors} />
          <StatCard label="Male" value={memberDemographics.male_count} />
          <StatCard label="Female" value={memberDemographics.female_count} />
          <StatCard label="Average Age" value={Math.round(memberDemographics.average_age || 0)} />
          <StatCard label="Youth (0–25)" value={(parseInt(memberDemographics.age_0_17) || 0) + (parseInt(memberDemographics.age_18_25) || 0)} />
        </div>
      )}
      <Section title="Daily member activity">
        <DataTable
          columns={[
            { key: 'date', label: 'Date', render: (r) => fmtDate(r.date) },
            { key: 'active_members', label: 'Active Members' },
            { key: 'total_activities', label: 'Activities' },
          ]}
          rows={memberActivity}
        />
      </Section>
    </>
  );

  const renderFinance = () => (
    <>
      {financialSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Income" value={fmtMoney(financialSummary.total_income)} />
          <StatCard label="Total Expenses" value={fmtMoney(financialSummary.total_expense)} />
          <StatCard label="Last 30 Days Income" value={fmtMoney(financialSummary.monthly_income)} sub={`${financialSummary.income_transactions ?? 0} transactions`} />
          <StatCard label="Last 30 Days Expenses" value={fmtMoney(financialSummary.monthly_expense)} sub={`${financialSummary.expense_transactions ?? 0} transactions`} />
        </div>
      )}
      <Section title="Contribution trends">
        <DataTable
          columns={[
            { key: 'month', label: 'Month', render: (r) => fmtDate(r.month) },
            { key: 'total_contributions', label: 'Total', render: (r) => fmtMoney(r.total_contributions) },
            { key: 'contribution_count', label: 'Count' },
            { key: 'average_contribution', label: 'Average', render: (r) => fmtMoney(r.average_contribution) },
          ]}
          rows={contributionTrends}
        />
      </Section>
    </>
  );

  const renderDepartments = () => (
    <Section title="Department performance">
      <DataTable
        columns={[
          { key: 'department_name', label: 'Department' },
          { key: 'member_count', label: 'Members' },
          { key: 'meetings_count', label: 'Meetings' },
          { key: 'recent_meetings', label: 'Recent Meetings' },
          { key: 'tasks_completed', label: 'Tasks Completed' },
        ]}
        rows={departmentPerformance}
      />
    </Section>
  );

  const renderAttendance = () => (
    attendanceSummary ? (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Attendance Records" value={attendanceSummary.total_attendance_records} />
        <StatCard label="Unique Attendees" value={attendanceSummary.unique_attendees} />
        <StatCard label="Average Attendance Rate" value={fmtPct((attendanceSummary.average_attendance_rate || 0) * 100)} />
        <StatCard label="Last Attendance" value={fmtDate(attendanceSummary.last_attendance_date)} />
      </div>
    ) : (
      <p className="text-sm text-[var(--color-textSecondary)]">No attendance data available.</p>
    )
  );

  const renderCollections = () => (
    <>
      <Section title="Collection performance">
        <DataTable
          columns={[
            { key: 'collection_name', label: 'Collection' },
            { key: 'completion_percentage', label: 'Progress', render: (r) => fmtPct(r.completion_percentage) },
            { key: 'unique_contributors', label: 'Contributors' },
            { key: 'total_contributions', label: 'Contributions' },
            { key: 'average_contribution', label: 'Avg', render: (r) => fmtMoney(r.average_contribution) },
          ]}
          rows={collectionPerformance}
        />
      </Section>
      <Section title="Collection trends">
        <DataTable
          columns={[
            { key: 'month', label: 'Month', render: (r) => fmtDate(r.month) },
            { key: 'collections_created', label: 'Created' },
            { key: 'total_target_amount', label: 'Target', render: (r) => fmtMoney(r.total_target_amount) },
            { key: 'total_collected_amount', label: 'Collected', render: (r) => fmtMoney(r.total_collected_amount) },
          ]}
          rows={collectionTrends}
        />
      </Section>
    </>
  );

  const renderEvents = () => (
    <>
      <Section title="Event engagement">
        <DataTable
          columns={[
            { key: 'event_name', label: 'Event' },
            { key: 'registered_attendees', label: 'Registered' },
            { key: 'actual_attendees', label: 'Attended' },
            { key: 'attendance_rate', label: 'Rate', render: (r) => fmtPct(r.attendance_rate) },
          ]}
          rows={eventEngagement}
        />
      </Section>
      <Section title="Weekly attendance">
        <DataTable
          columns={[
            { key: 'week', label: 'Week', render: (r) => fmtDate(r.week) },
            { key: 'events_count', label: 'Events' },
            { key: 'total_attendees', label: 'Attendees' },
          ]}
          rows={eventAttendance}
        />
      </Section>
    </>
  );

  const renderSms = () => (
    <>
      {smsPerformance && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="Total Messages" value={smsPerformance.total_messages} />
          <StatCard label="Delivered" value={smsPerformance.delivered_count} />
          <StatCard label="Failed" value={smsPerformance.failed_count} />
          <StatCard label="Pending" value={smsPerformance.pending_count} />
          <StatCard label="Delivery Rate" value={fmtPct(smsPerformance.delivery_rate)} />
          <StatCard label="Total Cost" value={fmtMoney(smsPerformance.total_cost)} />
        </div>
      )}
      <Section title="Daily delivery">
        <DataTable
          columns={[
            { key: 'date', label: 'Date', render: (r) => fmtDate(r.date) },
            { key: 'messages_sent', label: 'Sent' },
            { key: 'delivered', label: 'Delivered' },
            { key: 'failed', label: 'Failed' },
          ]}
          rows={smsDelivery}
        />
      </Section>
    </>
  );

  const renderTab = () => {
    switch (activeTab) {
      case 'members': return renderMembers();
      case 'finance': return renderFinance();
      case 'departments': return renderDepartments();
      case 'attendance': return renderAttendance();
      case 'collections': return renderCollections();
      case 'events': return renderEvents();
      case 'sms': return renderSms();
      default: return renderOverview();
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <h1 className="text-2xl font-bold text-[var(--color-text)] flex items-center gap-2">
          <Users className="w-6 h-6 text-[var(--color-primary)]" />
          Analytics
        </h1>
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)]"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <button
            onClick={() => handleExport('csv')}
            className="flex items-center gap-2 px-4 py-2 border border-[var(--color-border)] rounded-lg text-[var(--color-text)] hover:bg-[var(--color-background)]"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
          <button
            onClick={() => handleExport('json')}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg"
          >
            <Download className="w-4 h-4" />
            JSON
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[var(--color-border)] pb-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-[var(--color-primary)] text-white'
                : 'text-[var(--color-textSecondary)] hover:bg-[var(--color-background)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">{renderTab()}</div>
      )}

      <p className="text-xs text-[var(--color-textSecondary)] flex items-center gap-1">
        <Calendar className="w-3 h-3" />
        Figures are computed live from church records for the selected period.
      </p>
    </div>
  );
};

export default Analytics;
