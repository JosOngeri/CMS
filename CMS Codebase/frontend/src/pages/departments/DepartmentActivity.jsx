import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Calendar,
  Filter,
  Search,
  RefreshCw,
  FileText,
  X
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { FullPageLoading } from '../../components/common/Loading';
import ActivityFeed from '../../components/departments/ActivityFeed';
import { useActivityFeed, useActivitySummary } from '../../hooks/useActivityFeed';

const DepartmentActivity = () => {
  const { departmentId } = useParams();
  const { api } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [departmentInfo, setDepartmentInfo] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showDateFilter, setShowDateFilter] = useState(false);

  const {
    activities,
    loading: activitiesLoading,
    error: activitiesError,
    hasMore,
    totalCount,
    fetchActivities,
    refresh,
    filterByType,
    filterByDateRange
  } = useActivityFeed(departmentId, { limit: 50, autoFetch: false });

  const {
    summary,
    loading: summaryLoading,
    fetchSummary
  } = useActivitySummary(departmentId);

  useEffect(() => {
    loadDepartmentInfo();
  }, [departmentId]);

  useEffect(() => {
    if (api && departmentId) {
      fetchActivities(api);
      fetchSummary(api);
    }
  }, [api, departmentId, fetchActivities, fetchSummary]);

  const loadDepartmentInfo = async () => {
    try {
      setError(null);
      const response = await api.get(`/department/${departmentId}/dashboard`);
      
      if (response.data.success) {
        setDepartmentInfo(response.data.data.department);
      }
    } catch (err) {
      console.error('Error loading department info:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load department info');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    // Search functionality would be implemented here
    toast.info('Search functionality coming soon');
  };

  const handleDateFilter = () => {
    if (dateRange.start && dateRange.end) {
      filterByDateRange(api, dateRange.start, dateRange.end);
      setShowDateFilter(false);
    } else {
      toast.error('Please select both start and end dates');
    }
  };

  const handleExport = () => {
    toast.info('Export functionality coming soon');
  };

  const handleRefresh = () => {
    refresh(api);
    fetchSummary(api);
  };

  if (loading) {
    return <FullPageLoading message="Loading department activity..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/dashboard/my-departments')}
            className="px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors"
          >
            Back to My Departments
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Header */}
      <div className="bg-[var(--color-surface)] shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(`/dashboard/departments/${departmentInfo?.slug || departmentId}`)}
                className="p-2 text-[var(--color-textSecondary)] hover:text-[var(--color-text)] transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-[var(--color-text)]">
                  {departmentInfo?.name || 'Department'} Activity
                </h1>
                <p className="text-sm text-[var(--color-textSecondary)]">
                  {totalCount} activities recorded
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                className="p-2 text-[var(--color-textSecondary)] hover:text-[var(--color-text)] transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-5 h-5 ${activitiesLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <form onSubmit={handleSearch} className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--color-textSecondary)]" />
              <input
                type="text"
                placeholder="Search activities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] focus:ring-2 focus:ring-[var(--color-primary)]-500 focus:border-transparent"
              />
            </form>
            <button
              onClick={() => setShowDateFilter(!showDateFilter)}
              className="flex items-center gap-2 px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-background)] transition-colors"
            >
              <Calendar className="w-4 h-4" />
              Date Range
            </button>
          </div>

          {/* Date Filter Panel */}
          {showDateFilter && (
            <div className="mt-4 p-4 bg-[var(--color-background)] rounded-lg">
              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] focus:ring-2 focus:ring-[var(--color-primary)]-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] focus:ring-2 focus:ring-[var(--color-primary)]-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleDateFilter}
                    className="px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors"
                  >
                    Apply Filter
                  </button>
                  <button
                    onClick={() => {
                      setDateRange({ start: '', end: '' });
                      filterByDateRange(api, null, null);
                      setShowDateFilter(false);
                    }}
                    className="px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-background)] transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Activity Summary Cards */}
        {!summaryLoading && summary.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 mb-6">
            {summary.map((item) => (
              <div key={item.type} className="bg-[var(--color-surface)] rounded-lg shadow p-4">
                <p className="text-sm text-[var(--color-textSecondary)] capitalize">
                  {item.type}
                </p>
                <p className="text-2xl font-bold text-[var(--color-text)]">
                  {item.count}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Activity Feed */}
        <ActivityFeed 
          departmentId={departmentId} 
          api={api} 
          limit={50} 
          showViewAll={false}
        />
      </div>
    </div>
  );
};

export default DepartmentActivity;
