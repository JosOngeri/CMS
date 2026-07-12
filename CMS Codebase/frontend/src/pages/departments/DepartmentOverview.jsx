import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Calendar,
  MessageSquare,
  CheckSquare,
  FileText,
  Building2,
  TrendingUp,
  Activity,
  Search,
  Filter,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { FullPageLoading } from '../../components/common/Loading';
import { API_ENDPOINTS } from '../../constants/api';

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

const DepartmentOverview = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchOverview = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (categoryFilter) params.append('category', categoryFilter);
      if (statusFilter) params.append('status', statusFilter);

      const response = await fetch(`${API_ENDPOINTS.DEPARTMENT.ALL}/overview?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!response.ok) throw new Error('Failed to fetch department overview');
      const data = await response.json();
      setOverview(data.data);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, statusFilter, toast]);

  useEffect(() => {
    setLoading(true);
    fetchOverview();
  }, [categoryFilter, statusFilter]);

  const filteredDepartments = overview?.departments?.filter(dept => {
    const matchesSearch = searchTerm === '' || 
      dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dept.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === '' || dept.activity_status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const categories = [...new Set(overview?.departments?.map(d => d.category) || [])];

  if (loading) {
    return <FullPageLoading message="Loading department overview..." />;
  }

  if (!overview) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--color-textSecondary)]">Unable to load department overview</p>
      </div>
    );
  }

  const { departments, recentActivity, stats } = overview;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Department Overview</h1>
          <p className="text-sm text-[var(--color-textSecondary)]">
            Global view of all departments and their activity
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/dashboard/departments/new')}
          className="inline-flex items-center px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors text-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Department
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-[var(--color-surface)] rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-textSecondary)]">Total Departments</p>
              <p className="text-2xl font-bold text-[var(--color-text)]">{stats?.total_departments || 0}</p>
            </div>
            <Building2 className="w-8 h-8 text-[var(--color-primary)]-600" />
          </div>
        </div>
        <div className="bg-[var(--color-surface)] rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-textSecondary)]">Total Categories</p>
              <p className="text-2xl font-bold text-[var(--color-text)]">{stats?.total_categories || 0}</p>
            </div>
            <Filter className="w-8 h-8 text-green-600" />
          </div>
        </div>
        <div className="bg-[var(--color-surface)] rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-textSecondary)]">Total Members</p>
              <p className="text-2xl font-bold text-[var(--color-text)]">{stats?.total_members || 0}</p>
            </div>
            <Users className="w-8 h-8 text-purple-600" />
          </div>
        </div>
        <div className="bg-[var(--color-surface)] rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-textSecondary)]">Active Departments</p>
              <p className="text-2xl font-bold text-[var(--color-text)]">{stats?.active_departments || 0}</p>
            </div>
            <Activity className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[var(--color-surface)] rounded-lg shadow p-4">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-textSecondary)] w-4 h-4" />
              <input
                type="text"
                placeholder="Search departments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]-500"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]-500"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Department Cards Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredDepartments.map((dept) => (
          <div
            key={dept.id}
            className="bg-[var(--color-surface)] rounded-lg shadow hover:shadow-lg transition-shadow p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-[var(--color-text)] mb-1">
                  {dept.name}
                </h3>
                <p className="text-sm text-[var(--color-textSecondary)]">{dept.category}</p>
              </div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                dept.activity_status === 'active' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-[var(--color-surface)] text-[var(--color-text)]'
              }`}>
                {dept.activity_status}
              </span>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center text-sm text-[var(--color-textSecondary)]">
                <Users className="w-4 h-4 mr-2" />
                <span>{dept.member_count} members</span>
              </div>
              {dept.leader_name && (
                <div className="flex items-center text-sm text-[var(--color-textSecondary)]">
                  <FileText className="w-4 h-4 mr-2" />
                  <span>{dept.leader_name}</span>
                </div>
              )}
              <div className="flex items-center text-sm text-[var(--color-textSecondary)]">
                <MessageSquare className="w-4 h-4 mr-2" />
                <span>{dept.recent_communications} communications this week</span>
              </div>
              <div className="flex items-center text-sm text-[var(--color-textSecondary)]">
                <Calendar className="w-4 h-4 mr-2" />
                <span>{dept.recent_meetings} meetings this week</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => navigate(`/dashboard/departments/${dept.slug || dept.id}`)}
                className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors text-sm"
              >
                View Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
              <button
                type="button"
                onClick={() => navigate(`/dashboard/departments/${dept.slug || dept.id}/settings`)}
                className="px-4 py-2 border border-[var(--color-border)] text-[var(--color-text)] rounded-lg hover:bg-[var(--color-background)] transition-colors text-sm"
              >
                Settings
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredDepartments.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="w-12 h-12 text-[var(--color-textSecondary)] mx-auto mb-4" />
          <p className="text-[var(--color-textSecondary)]">No departments found</p>
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-[var(--color-surface)] rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">
          Recent Activity Across All Departments
        </h2>
        <div className="space-y-3">
          {recentActivity?.map((activity, index) => (
            <div key={index} className="flex items-start gap-3 p-3 bg-[var(--color-background)] rounded-lg">
              <div className={`p-2 rounded-lg ${
                activity.type === 'communication' ? 'bg-[var(--color-primary)]-100' :
                activity.type === 'meeting' ? 'bg-green-100' :
                'bg-[var(--color-surface)]'
              }`}>
                {activity.type === 'communication' && <MessageSquare className="w-4 h-4 text-[var(--color-primary)]-600" />}
                {activity.type === 'meeting' && <Calendar className="w-4 h-4 text-green-600" />}
                {activity.type !== 'communication' && activity.type !== 'meeting' && <FileText className="w-4 h-4 text-[var(--color-textSecondary)]" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--color-text)]">{activity.title}</p>
                <p className="text-xs text-[var(--color-textSecondary)]">
                  {activity.department_name} • {activity.author}
                </p>
              </div>
              <span className="text-xs text-[var(--color-textSecondary)]">
                {new Date(activity.date).toLocaleDateString()}
              </span>
            </div>
          ))}
          {(!recentActivity || recentActivity.length === 0) && (
            <p className="text-sm text-[var(--color-textSecondary)] text-center py-4">
              No recent activity
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DepartmentOverview;