// Reports — generate, list and download church reports.
// Backend: POST /api/reports (generate), GET /api/reports (list),
// GET /api/reports/:id/download?format=pdf|xlsx|csv.
import React, { useEffect, useState } from 'react';
import { Download as DownloadIcon, FileSpreadsheet, FileText as FilePdf } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import PermissionButton from '../../components/common/PermissionButton';
import { PERMISSIONS } from '../../constants/permissions';

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]';

const Reports = () => {
  const { api } = useAuth();
  const toast = useToast();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [exportFormat, setExportFormat] = useState('pdf');

  const fetchReports = async () => {
    try {
      const response = await api.get('/reports');
      setReports(response.data.reports || response.data.data?.reports || response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReports(); }, []);

  const generateReport = async (reportType) => {
    try {
      toast.info('Generating report...');
      await api.post('/reports', {
        report_type: reportType,
        date_range: dateRange,
        export_format: exportFormat,
      });
      toast.success('Report generated successfully');
      fetchReports();
    } catch {
      toast.error('Failed to generate report');
    }
  };

  const downloadReport = async (reportId, format) => {
    try {
      toast.info('Downloading report...');
      const response = await api.get(`/reports/${reportId}/download?format=${format}`, {
        responseType: 'blob',
      });
      // xlsx degrades to CSV server-side — name the file by what came back
      const ext = (response.headers['content-type'] || '').includes('pdf') ? 'pdf' : 'csv';
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report_${reportId}.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Report downloaded successfully');
    } catch {
      toast.error('Failed to download report');
    }
  };

  const filteredReports = reports.filter((r) => filter === 'all' || r.report_type === filter);

  if (loading) {
    return <div className="p-8 text-center text-[var(--color-textSecondary)]">Loading reports...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Reports</h1>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className={`${inputCls} w-auto`}>
          <option value="all">All Reports</option>
          <option value="financial">Financial</option>
          <option value="membership">Membership</option>
          <option value="attendance">Attendance</option>
          <option value="treasury">Treasury</option>
          <option value="departments">Departments</option>
          <option value="events">Events</option>
        </select>
      </div>

      <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-4">
        <h3 className="font-semibold text-[var(--color-text)] mb-3">Report Options</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-1">Start Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-1">End Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-1">Export Format</label>
            <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)} className={inputCls}>
              <option value="pdf">PDF</option>
              <option value="xlsx">Excel</option>
              <option value="csv">CSV</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {['financial', 'membership', 'attendance', 'treasury', 'departments', 'events'].map((type) => (
            <PermissionButton
              key={type}
              permission={PERMISSIONS.REPORTS_EXPORT}
              buttonProps={{
                onClick: () => generateReport(type),
                className:
                  'px-4 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-primary-light)] capitalize',
              }}
            >
              {type} Report
            </PermissionButton>
          ))}
        </div>
      </div>

      <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-4">
        <h2 className="font-semibold text-[var(--color-text)] mb-3">Generated Reports ({filteredReports.length})</h2>
        {filteredReports.length === 0 ? (
          <p className="text-[var(--color-textSecondary)] text-center py-8">No reports generated yet</p>
        ) : (
          <div className="space-y-2">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between p-3 bg-[var(--color-background)] rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium text-[var(--color-text)]">{report.report_name}</p>
                  <p className="text-sm text-[var(--color-textSecondary)]">
                    {report.generated_at ? new Date(report.generated_at).toLocaleString() : ''}
                  </p>
                  {report.parameters?.date_range && (
                    <p className="text-xs text-[var(--color-textTertiary)] mt-1">
                      {`Range: ${report.parameters.date_range.start} to ${report.parameters.date_range.end}`}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <PermissionButton
                    permission={PERMISSIONS.REPORTS_EXPORT}
                    buttonProps={{
                      onClick: () => downloadReport(report.id, 'pdf'),
                      className: 'p-2 text-[var(--color-error)] hover:bg-[var(--color-error-light)] rounded',
                      title: 'Download as PDF',
                    }}
                  >
                    <FilePdf className="w-5 h-5" />
                  </PermissionButton>
                  <PermissionButton
                    permission={PERMISSIONS.REPORTS_EXPORT}
                    buttonProps={{
                      onClick: () => downloadReport(report.id, 'xlsx'),
                      className: 'p-2 text-[var(--color-success)] hover:bg-[var(--color-success-light)] rounded',
                      title: 'Download as Excel',
                    }}
                  >
                    <FileSpreadsheet className="w-5 h-5" />
                  </PermissionButton>
                  <PermissionButton
                    permission={PERMISSIONS.REPORTS_EXPORT}
                    buttonProps={{
                      onClick: () => downloadReport(report.id, 'csv'),
                      className: 'p-2 text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] rounded',
                      title: 'Download as CSV',
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
  );
};

export default Reports;
