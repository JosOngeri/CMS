import { useState } from 'react';
import { Plus, Trash2, Save, Play, Download, BarChart3, FileText } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const ReportBuilder = () => {
  const { api } = useAuth();
  const toast = useToast();
  const [report, setReport] = useState({
    name: '',
    description: '',
    dataSource: 'members',
    filters: [],
    columns: ['name', 'email', 'phone', 'joined_date'],
    groupBy: null,
    sortBy: 'name',
    format: 'pdf'
  });
  const [saving, setSaving] = useState(false);

  const addFilter = () => {
    setReport({
      ...report,
      filters: [...report.filters, { field: 'membership_status', operator: 'equals', value: 'active' }]
    });
  };

  const removeFilter = (index) => {
    setReport({
      ...report,
      filters: report.filters.filter((_, i) => i !== index)
    });
  };

  const updateFilter = (index, field, value) => {
    setReport({
      ...report,
      filters: report.filters.map((filter, i) =>
        i === index ? { ...filter, [field]: value } : filter
      )
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/reports', report);
      toast.success('Report saved successfully');
    } catch (error) {
      toast.error('Failed to save report');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    try {
      const response = await api.post('/reports/generate', report);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${report.name}.${report.format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Report generated successfully');
    } catch (error) {
      toast.error('Failed to generate report');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Report Builder</h2>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 disabled:bg-[var(--color-surface)]"
            aria-label="Save report"
            aria-busy={saving}
          >
            <Save size={20} aria-hidden="true" />
            {saving ? 'Saving...' : 'Save Report'}
          </button>
          <button
            onClick={handleGenerate}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            aria-label="Generate and download report"
          >
            <Download size={20} aria-hidden="true" />
            Generate Report
          </button>
        </div>
      </div>

      {/* Report Details */}
      <div className="bg-[var(--color-surface)] border rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2" htmlFor="report-name">Report Name</label>
            <input
              id="report-name"
              type="text"
              value={report.name}
              onChange={(e) => setReport({ ...report, name: e.target.value })}
              placeholder="Enter report name"
              className="w-full p-2 border rounded-lg"
              aria-label="Report name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" htmlFor="report-datasource">Data Source</label>
            <select
              id="report-datasource"
              value={report.dataSource}
              onChange={(e) => setReport({ ...report, dataSource: e.target.value })}
              className="w-full p-2 border rounded-lg"
              aria-label="Select data source"
            >
              <option value="members">Members</option>
              <option value="payments">Payments</option>
              <option value="events">Events</option>
              <option value="departments">Departments</option>
              <option value="documents">Documents</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2" htmlFor="report-description">Description</label>
          <textarea
            id="report-description"
            value={report.description}
            onChange={(e) => setReport({ ...report, description: e.target.value })}
            placeholder="Describe the report purpose"
            className="w-full p-2 border rounded-lg h-24 resize-none"
            aria-label="Report description"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[var(--color-surface)] border rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Filters</h3>
          <button
            onClick={addFilter}
            className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-[var(--color-background)]"
            aria-label="Add new filter"
          >
            <Plus size={16} aria-hidden="true" />
            Add Filter
          </button>
        </div>
        {report.filters.map((filter, index) => (
          <div key={index} className="flex items-center gap-3 p-3 bg-[var(--color-background)] rounded-lg">
            <select
              value={filter.field}
              onChange={(e) => updateFilter(index, 'field', e.target.value)}
              className="flex-1 p-2 border rounded-lg"
              aria-label={`Filter ${index + 1} field`}
            >
              <option value="membership_status">Membership Status</option>
              <option value="joined_date">Joined Date</option>
              <option value="department">Department</option>
            </select>
            <select
              value={filter.operator}
              onChange={(e) => updateFilter(index, 'operator', e.target.value)}
              className="p-2 border rounded-lg"
              aria-label={`Filter ${index + 1} operator`}
            >
              <option value="equals">Equals</option>
              <option value="not_equals">Not Equals</option>
              <option value="contains">Contains</option>
              <option value="greater_than">Greater Than</option>
              <option value="less_than">Less Than</option>
            </select>
            <input
              type="text"
              value={filter.value}
              onChange={(e) => updateFilter(index, 'value', e.target.value)}
              className="flex-1 p-2 border rounded-lg"
              placeholder="Value"
              aria-label={`Filter ${index + 1} value`}
            />
            <button
              onClick={() => removeFilter(index)}
              className="p-2 text-red-600 hover:bg-red-50 rounded"
              aria-label={`Remove filter ${index + 1}`}
            >
              <Trash2 size={16} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>

      {/* Columns */}
      <div className="bg-[var(--color-surface)] border rounded-lg p-6">
        <h3 className="font-semibold mb-4">Columns</h3>
        <div className="grid grid-cols-3 gap-2">
          {['name', 'email', 'phone', 'joined_date', 'membership_status', 'department'].map((column) => (
            <label key={column} className="flex items-center gap-2 p-2 bg-[var(--color-background)] rounded cursor-pointer hover:bg-[var(--color-surface)]">
              <input
                type="checkbox"
                checked={report.columns.includes(column)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setReport({ ...report, columns: [...report.columns, column] });
                  } else {
                    setReport({ ...report, columns: report.columns.filter(c => c !== column) });
                  }
                }}
                aria-label={`Include ${column.replace('_', ' ')} column`}
              />
              <span className="capitalize">{column.replace('_', ' ')}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Output Options */}
      <div className="bg-[var(--color-surface)] border rounded-lg p-6">
        <h3 className="font-semibold mb-4">Output Options</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2" htmlFor="report-format">Format</label>
            <select
              id="report-format"
              value={report.format}
              onChange={(e) => setReport({ ...report, format: e.target.value })}
              className="w-full p-2 border rounded-lg"
              aria-label="Select output format"
            >
              <option value="pdf">PDF</option>
              <option value="excel">Excel</option>
              <option value="csv">CSV</option>
              <option value="html">HTML</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Sort By</label>
            <select
              value={report.sortBy}
              onChange={(e) => setReport({ ...report, sortBy: e.target.value })}
              className="w-full p-2 border rounded-lg"
            >
              <option value="name">Name</option>
              <option value="joined_date">Joined Date</option>
              <option value="membership_status">Status</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Group By</label>
            <select
              value={report.groupBy || ''}
              onChange={(e) => setReport({ ...report, groupBy: e.target.value || null })}
              className="w-full p-2 border rounded-lg"
            >
              <option value="">No Grouping</option>
              <option value="department">Department</option>
              <option value="membership_status">Status</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportBuilder;
