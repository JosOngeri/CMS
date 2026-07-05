import React, { useState } from 'react';
import { FileText, Download, Calendar, Filter, Download as DownloadIcon, FileSpreadsheet, FileText as FilePdf } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import PermissionButton from '../../components/common/PermissionButton';
import { PERMISSIONS } from '../../constants/permissions';

const Reports = () => {
  const { api } = useAuth();
  const toast = useToast();
  const [reports, setReports] = useState([]);
  const [savedReports, setSavedReports] = useState([]);
  const [scheduledReports, setScheduledReports] = useState([]);
  const [reportTemplates, setReportTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [exportFormat, setExportFormat] = useState('pdf');
  const [showCustomBuilder, setShowCustomBuilder] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [customReportData, setCustomReportData] = useState({
    dataSource: '',
    filters: [],
    columns: [],
    groupBy: '',
    sortBy: '',
    format: 'json'
  });
  const [scheduleData, setScheduleData] = useState({
    name: '',
    description: '',
    reportType: '',
    schedule: 'weekly',
    recipients: []
  });

  const fetchReports = async () => {
    try {
      const response = await api.get('/reports');
      setReports(response.data.reports || []);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async (reportType) => {
    try {
      toast.loading('Generating report...');
      const response = await api.post('/reports', { 
        report_type: reportType,
        date_range: dateRange,
        export_format: exportFormat
      });
      toast.success('Report generated successfully');
      fetchReports();
    } catch (error) {
      toast.error('Failed to generate report');
    }
  };

  const downloadReport = async (reportId, format) => {
    try {
      toast.loading('Downloading report...');
      const response = await api.get(`/reports/${reportId}/download?format=${format}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report_${reportId}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Report downloaded successfully');
    } catch (error) {
      toast.error('Failed to download report');
    }
  };

  const fetchFinancialReport = async (startDate, endDate) => {
    try {
      const response = await api.get('/reports/financial', {
        params: { startDate, endDate }
      });
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch financial report:', error);
      toast.error('Failed to fetch financial report');
    }
  };

  const fetchDepartmentReport = async (startDate, endDate) => {
    try {
      const response = await api.get('/reports/department', {
        params: { startDate, endDate }
      });
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch department report:', error);
      toast.error('Failed to fetch department report');
    }
  };

  const fetchAttendanceReport = async (startDate, endDate) => {
    try {
      const response = await api.get('/reports/attendance', {
        params: { startDate, endDate }
      });
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch attendance report:', error);
      toast.error('Failed to fetch attendance report');
    }
  };

  const fetchSMSReport = async (startDate, endDate, status) => {
    try {
      const response = await api.get('/reports/sms', {
        params: { startDate, endDate, status }
      });
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch SMS report:', error);
      toast.error('Failed to fetch SMS report');
    }
  };

  const fetchApprovalReport = async (startDate, endDate, status, entityType) => {
    try {
      const response = await api.get('/reports/approvals', {
        params: { startDate, endDate, status, entityType }
      });
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch approval report:', error);
      toast.error('Failed to fetch approval report');
    }
  };

  const exportReport = async (reportType, startDate, endDate, format) => {
    try {
      toast.loading('Exporting report...');
      const response = await api.get('/reports/export', {
        params: { reportType, startDate, endDate, format },
        responseType: format === 'csv' ? 'blob' : 'json'
      });
      
      if (format === 'csv') {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `report_${reportType}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
      
      toast.success('Report exported successfully');
    } catch (error) {
      console.error('Failed to export report:', error);
      toast.error('Failed to export report');
    }
  };

  const saveCustomReport = async (reportData) => {
    try {
      await api.post('/reports/save', reportData);
      toast.success('Report saved successfully');
      fetchSavedReports();
    } catch (error) {
      console.error('Failed to save report:', error);
      toast.error('Failed to save report');
    }
  };

  const fetchSavedReports = async () => {
    try {
      const response = await api.get('/reports/saved');
      setSavedReports(response.data.reports || []);
    } catch (error) {
      console.error('Failed to fetch saved reports:', error);
    }
  };

  const generateCustomReport = async (reportData) => {
    try {
      toast.loading('Generating custom report...');
      const response = await api.post('/reports/generate', reportData);
      toast.success('Custom report generated successfully');
      return response.data.data;
    } catch (error) {
      console.error('Failed to generate custom report:', error);
      toast.error('Failed to generate custom report');
    }
  };

  const scheduleReport = async (scheduleData) => {
    try {
      await api.post('/reports/schedule', scheduleData);
      toast.success('Report scheduled successfully');
      fetchScheduledReports();
    } catch (error) {
      console.error('Failed to schedule report:', error);
      toast.error('Failed to schedule report');
    }
  };

  const fetchScheduledReports = async () => {
    try {
      const response = await api.get('/reports/scheduled');
      setScheduledReports(response.data.reports || []);
    } catch (error) {
      console.error('Failed to fetch scheduled reports:', error);
    }
  };

  const fetchReportExecutions = async (reportId) => {
    try {
      const response = await api.get(`/reports/scheduled/${reportId}/executions`);
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch report executions:', error);
      toast.error('Failed to fetch report executions');
    }
  };

  const fetchReportTemplates = async () => {
    try {
      const response = await api.get('/reports/templates');
      setReportTemplates(response.data.templates || []);
    } catch (error) {
      console.error('Failed to fetch report templates:', error);
    }
  };

  const filteredReports = reports.filter(r => {
    if (filter === 'all') return true;
    return r.report_type === filter;
  });

  React.useEffect(() => {
    fetchReports();
  }, []);

  if (loading) {
    return <div className="p-8 text-center">Loading reports...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Reports</h1>
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="all">All Reports</option>
            <option value="financial">Financial</option>
            <option value="membership">Membership</option>
            <option value="attendance">Attendance</option>
            <option value="treasury">Treasury</option>
            <option value="departments">Departments</option>
            <option value="events">Events</option>
          </select>
        </div>
      </div>

      <div className="bg-[var(--color-surface)]  rounded-lg border p-4 mb-6">
        <h3 className="font-semibold mb-3">Report Options</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Export Format</label>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="pdf">PDF</option>
              <option value="xlsx">Excel</option>
              <option value="csv">CSV</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[
          { type: 'financial', name: 'Financial Report', icon: 'dollar-sign', description: 'Income, expenses, and financial summary' },
          { type: 'membership', name: 'Membership Report', icon: 'users', description: 'Member statistics and demographics' },
          { type: 'attendance', name: 'Attendance Report', icon: 'calendar', description: 'Service attendance trends' },
          { type: 'treasury', name: 'Treasury Report', icon: 'trending-up', description: 'Treasury accounts and transactions' },
          { type: 'departments', name: 'Department Report', icon: 'building-2', description: 'Department activities and members' },
          { type: 'events', name: 'Events Report', icon: 'calendar-days', description: 'Event participation and outcomes' },
        ].map((report) => (
          <PermissionButton
            key={report.type}
            permission={PERMISSIONS.REPORTS_GENERATE}
            buttonProps={{
              onClick: () => generateReport(report.type),
              className: "p-4 bg-[var(--color-surface)]  rounded-lg border hover:border-[var(--color-primary)]-500 transition-colors text-left",
            }}
          >
            <FileText className="w-8 h-8 text-[var(--color-primary)]-600 mb-2" />
            <h3 className="font-semibold">{report.name}</h3>
            <p className="text-sm text-[var(--color-textSecondary)]">{report.description}</p>
          </PermissionButton>
        ))}
      </div>

      <div className="bg-[var(--color-surface)]  rounded-lg border">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="font-semibold">Generated Reports ({filteredReports.length})</h2>
        </div>
        <div className="p-4">
          {filteredReports.length === 0 ? (
            <p className="text-[var(--color-textSecondary)] text-center py-8">No reports generated yet</p>
          ) : (
            <div className="space-y-2">
              {filteredReports.map((report) => (
                <div key={report.id} className="flex items-center justify-between p-3 bg-[var(--color-background)]  rounded">
                  <div className="flex-1">
                    <p className="font-medium">{report.report_name}</p>
                    <p className="text-sm text-[var(--color-textSecondary)]">
                      {new Date(report.generated_at).toLocaleString()}
                    </p>
                    {report.parameters && (
                      <p className="text-xs text-[var(--color-textSecondary)] mt-1">
                        {report.parameters.date_range && `Range: ${report.parameters.date_range.start} to ${report.parameters.date_range.end}`}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <PermissionButton
                      permission={PERMISSIONS.REPORTS_EXPORT}
                      buttonProps={{
                        onClick: () => downloadReport(report.id, 'pdf'),
                        className: "p-2 text-red-600 hover:bg-red-50 rounded",
                        title: "Download as PDF",
                      }}
                    >
                      <FilePdf className="w-5 h-5" />
                    </PermissionButton>
                    <PermissionButton
                      permission={PERMISSIONS.REPORTS_EXPORT}
                      buttonProps={{
                        onClick: () => downloadReport(report.id, 'xlsx'),
                        className: "p-2 text-green-600 hover:bg-green-50 rounded",
                        title: "Download as Excel",
                      }}
                    >
                      <FileSpreadsheet className="w-5 h-5" />
                    </PermissionButton>
                    <PermissionButton
                      permission={PERMISSIONS.REPORTS_EXPORT}
                      buttonProps={{
                        onClick: () => downloadReport(report.id, 'csv'),
                        className: "p-2 text-[var(--color-primary)]-600 hover:bg-[var(--color-primary)]-50 rounded",
                        title: "Download as CSV",
                      }}
                    >
                      <DownloadIcon className="w-5 h-5" />
                    </PermissionButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
