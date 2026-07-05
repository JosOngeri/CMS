import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  FileText,
  GitCompare,
  Users,
  DollarSign,
  Calendar,
  Activity,
  Search,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { FullPageLoading } from '../../components/common/Loading';
import { InsightsEmptyState } from '../../components/common/EmptyState';
import Breadcrumb from '../../components/common/Breadcrumb';
import TabNavigation from '../../components/common/TabNavigation';

const InsightsOriginal = () => {
  const { api } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState('30');

  const insightsTabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'trends', label: 'Trends', icon: Activity },
    { id: 'comparisons', label: 'Comparisons', icon: GitCompare }
  ];

  const handleRefresh = () => {
    toast.info('Refreshing data...');
  };

  const handleExport = () => {
    toast.info('Export functionality will be implemented');
  };

  return (
    <div className="space-y-6">
      <Breadcrumb />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Insights</h1>
          <p className="text-sm text-[var(--color-textSecondary)]">Analytics and reports for church operations</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]-500 focus:border-transparent text-sm"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
          <button
            onClick={handleRefresh}
            className="p-2 text-[var(--color-textSecondary)] hover:bg-[var(--color-surface)] rounded-lg transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
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

      <TabNavigation 
        tabs={insightsTabs} 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        persistKey="insights-tab"
      />

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--color-textSecondary)]">Total Members</p>
                  <p className="text-2xl font-bold text-[var(--color-text)]">0</p>
                  <p className="text-xs text-green-600 mt-1">+0% from last period</p>
                </div>
                <Users className="w-8 h-8 text-[var(--color-primary)]-600" />
              </div>
            </div>
            <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--color-textSecondary)]">Attendance Rate</p>
                  <p className="text-2xl font-bold text-[var(--color-text)]">0%</p>
                  <p className="text-xs text-green-600 mt-1">+0% from last period</p>
                </div>
                <Calendar className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--color-textSecondary)]">Total Giving</p>
                  <p className="text-2xl font-bold text-[var(--color-text)]">$0</p>
                  <p className="text-xs text-green-600 mt-1">+0% from last period</p>
                </div>
                <DollarSign className="w-8 h-8 text-purple-600" />
              </div>
            </div>
            <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--color-textSecondary)]">Activities</p>
                  <p className="text-2xl font-bold text-[var(--color-text)]">0</p>
                  <p className="text-xs text-green-600 mt-1">+0% from last period</p>
                </div>
                <Activity className="w-8 h-8 text-orange-600" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-6">
              <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">Member Growth</h3>
              <div className="h-64 flex items-center justify-center bg-[var(--color-background)] rounded-lg">
                <p className="text-[var(--color-textSecondary)]">Chart will be displayed here</p>
              </div>
            </div>
            <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-6">
              <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">Attendance Trends</h3>
              <div className="h-64 flex items-center justify-center bg-[var(--color-background)] rounded-lg">
                <p className="text-[var(--color-textSecondary)]">Chart will be displayed here</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--color-textSecondary)]" />
              <input
                type="text"
                placeholder="Search analytics..."
                className="pl-10 pr-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]-500 focus:border-transparent text-sm"
              />
            </div>
            <button className="flex items-center gap-2 px-3 py-2 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] transition-colors text-sm">
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>
          <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-8 text-center">
            <BarChart3 className="w-12 h-12 text-[var(--color-textSecondary)] mx-auto mb-4" />
            <p className="text-[var(--color-textSecondary)]">Analytics data will be displayed here</p>
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--color-textSecondary)]" />
                <input
                  type="text"
                  placeholder="Search reports..."
                  className="pl-10 pr-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors text-sm">
              <FileText className="w-4 h-4" />
              Generate Report
            </button>
          </div>
          <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-8 text-center">
            <FileText className="w-12 h-12 text-[var(--color-textSecondary)] mx-auto mb-4" />
            <p className="text-[var(--color-textSecondary)]">No reports available</p>
          </div>
        </div>
      )}

      {/* Trends Tab */}
      {activeTab === 'trends' && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--color-textSecondary)]" />
              <input
                type="text"
                placeholder="Search trends..."
                className="pl-10 pr-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]-500 focus:border-transparent text-sm"
              />
            </div>
            <button className="flex items-center gap-2 px-3 py-2 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] transition-colors text-sm">
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>
          <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-8 text-center">
            <TrendingUp className="w-12 h-12 text-[var(--color-textSecondary)] mx-auto mb-4" />
            <p className="text-[var(--color-textSecondary)]">Trends data will be displayed here</p>
          </div>
        </div>
      )}

      {/* Comparisons Tab */}
      {activeTab === 'comparisons' && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--color-textSecondary)]" />
              <input
                type="text"
                placeholder="Search comparisons..."
                className="pl-10 pr-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]-500 focus:border-transparent text-sm"
              />
            </div>
            <button className="flex items-center gap-2 px-3 py-2 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] transition-colors text-sm">
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>
          <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-8 text-center">
            <GitCompare className="w-12 h-12 text-[var(--color-textSecondary)] mx-auto mb-4" />
            <p className="text-[var(--color-textSecondary)]">Comparison data will be displayed here</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default InsightsOriginal;
