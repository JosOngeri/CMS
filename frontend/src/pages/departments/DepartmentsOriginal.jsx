import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  MessageSquare,
  Calendar,
  Settings,
  ChevronRight,
  Building,
  Crown,
  Shield,
  Star,
  Plus,
  Edit,
  Trash2,
  User,
  CheckCircle,
  XCircle,
  CheckSquare,
  Square,
  Power,
  PowerOff,
  LayoutGrid,
  UserCheck,
  DollarSign,
  BarChart3,
  FileText
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { usePermission } from '../../hooks/usePermission';
import { FullPageLoading } from '../../components/common/Loading';
import { DepartmentsEmptyState } from '../../components/common/EmptyState';
import Breadcrumb from '../../components/common/Breadcrumb';
import TabNavigation from '../../components/common/TabNavigation';
import PasswordConfirmationModal from '../../components/common/PasswordConfirmationModal';
import PermissionButton from '../../components/common/PermissionButton';
import { usePasswordConfirmation } from '../../hooks/usePasswordConfirmation';
import { API_ENDPOINTS } from '../../constants/api';
import { SUCCESS_MESSAGES } from '../../constants/validation';
import { PERMISSIONS } from '../../constants/permissions';

const DepartmentsOriginal = () => {
  const { user, api } = useAuth();
  const { can } = usePermission();
  const toast = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [departments, setDepartments] = useState([]);
  const [userDepartments, setUserDepartments] = useState([]);
  const [userRoles, setUserRoles] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    head_id: '',
    category: '',
    parent_department_id: '',
    is_committee: false,
    is_active: true
  });

  const {
    showPasswordModal,
    password,
    setPassword,
    isLoading: passwordLoading,
    requirePasswordConfirmation,
    handlePasswordConfirmation,
    cancelPasswordConfirmation
  } = usePasswordConfirmation();

  useEffect(() => {
    fetchDepartments();
    fetchUserDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/departments');
      setDepartments(response.data.departments || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast.error('Failed to load departments');
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDepartments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/department/my-departments');
      setUserDepartments(response.data.departments || []);
      setUserRoles(response.data.roles || {});
    } catch (error) {
      console.error('Error fetching user departments:', error);
      toast.error('Failed to load your departments');
      setUserDepartments([]);
      setUserRoles({});
    } finally {
      setLoading(false);
    }
  };

  const canManageDepartments = user?.roles?.some(role => 
    ['Super Admin', 'Pastor', 'First Elder'].includes(role)
  );

  const handleDepartmentClick = (department) => {
    const userRole = userRoles[department.id];
    const isAdmin = userRole === 'Leader' || userRole === 'Assistant Leader';
    
    if (isAdmin) {
      navigate(`/dashboard/departments/${department.slug}`, { 
        state: { role: userRole, isAdmin: true } 
      });
    } else {
      navigate(`/dashboard/departments/${department.slug}`, { 
        state: { role: userRole, isAdmin: false } 
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingDepartment) {
        await api.put(`/departments/${editingDepartment.id}`, formData);
        toast.success(SUCCESS_MESSAGES.DEPARTMENT_UPDATED);
      } else {
        await api.post('/departments', formData);
        toast.success(SUCCESS_MESSAGES.DEPARTMENT_CREATED);
      }
      setFormData({ name: '', description: '', head_id: '', category: '', parent_department_id: '', is_committee: false, is_active: true });
      setShowCreateForm(false);
      setEditingDepartment(null);
      fetchDepartments();
    } catch (error) {
      console.error('Failed to save department:', error);
      toast.error(editingDepartment ? 'Failed to update department' : 'Failed to create department');
    }
  };

  const handleEdit = (department) => {
    setEditingDepartment(department);
    setFormData({
      name: department.name,
      description: department.description,
      head_id: department.head_id || '',
      category: department.category || '',
      parent_department_id: department.parent_department_id || '',
      is_committee: department.is_committee || false,
      is_active: department.is_active
    });
    setShowCreateForm(true);
  };

  const handleToggleStatus = async (departmentId, currentStatus) => {
    try {
      await api.put(`/departments/${departmentId}`, { is_active: !currentStatus });
      setDepartments(departments.map(dept =>
        dept.id === departmentId ? { ...dept, is_active: !currentStatus } : dept
      ));
      toast.success(!currentStatus ? 'Department activated' : 'Department deactivated');
    } catch (error) {
      console.error('Error toggling department status:', error);
      toast.error('Failed to update department status');
    }
  };

  const handleSelectDepartment = (departmentId) => {
    setSelectedDepartments(prev => {
      if (prev.includes(departmentId)) {
        return prev.filter(id => id !== departmentId);
      } else {
        return [...prev, departmentId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedDepartments([]);
    } else {
      setSelectedDepartments(filteredDepartments.map(dept => dept.id));
    }
    setSelectAll(!selectAll);
  };

  const handleBatchOperation = async (action) => {
    try {
      let confirmMessage = '';
      let successMessage = '';

      switch (action) {
        case 'activate_all':
          confirmMessage = 'Are you sure you want to activate all departments?';
          successMessage = 'All departments activated successfully';
          break;
        case 'deactivate_all':
          confirmMessage = 'Are you sure you want to deactivate all departments?';
          successMessage = 'All departments deactivated successfully';
          break;
        case 'activate_selected':
          confirmMessage = `Are you sure you want to activate ${selectedDepartments.length} selected departments?`;
          successMessage = 'Selected departments activated successfully';
          break;
        case 'deactivate_selected':
          confirmMessage = `Are you sure you want to deactivate ${selectedDepartments.length} selected departments?`;
          successMessage = 'Selected departments deactivated successfully';
          break;
        case 'delete_selected':
          requirePasswordConfirmation(
            async () => {
              const payload = { action: 'delete_selected', department_ids: selectedDepartments };
              const response = await api.post('/departments/batch', payload);
              toast.success('Selected departments deleted successfully');
              setSelectedDepartments([]);
              setSelectAll(false);
              fetchDepartments();
            },
            `Please enter your password to confirm the deletion of ${selectedDepartments.length} department(s). This action cannot be undone.`
          );
          return;
        default:
          return;
      }

      if (!confirm(confirmMessage)) {
        return;
      }

      const payload = action === 'activate_all' || action === 'deactivate_all'
        ? { action }
        : { action, department_ids: selectedDepartments };

      const response = await api.post('/departments/batch', payload);
      toast.success(successMessage);
      setSelectedDepartments([]);
      setSelectAll(false);
      fetchDepartments();
    } catch (error) {
      console.error('Batch operation error:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.details || error.message || 'Failed to perform batch operation';
      toast.error(`Batch operation failed: ${errorMessage}`);
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'Leadership': return 'bg-purple-100 text-purple-800';
      case 'Ministry': return 'bg-[var(--color-primary)]-100 text-[var(--color-primary)]-800';
      case 'Education': return 'bg-green-100 text-green-800';
      case 'Youth': return 'bg-orange-100 text-orange-800';
      case 'Support': return 'bg-[var(--color-surface)] text-[var(--color-text)]';
      case 'Special': return 'bg-pink-100 text-pink-800';
      default: return 'bg-[var(--color-surface)] text-[var(--color-text)]';
    }
  };

  const currentDepartments = activeTab === 'my-departments' ? userDepartments : departments;

  const filteredDepartments = currentDepartments.filter(dept => {
    if (filter === 'all') return true;
    if (filter === 'leadership') return dept.can_manage;
    if (filter === 'member') return !dept.can_manage;
    return dept.category === filter;
  }).sort((a, b) => {
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name);
    } else if (sortBy === 'members') {
      return (b.member_count || 0) - (a.member_count || 0);
    } else if (sortBy === 'category') {
      return (a.category || '').localeCompare(b.category || '');
    } else if (sortBy === 'status') {
      return (b.is_active ? 1 : 0) - (a.is_active ? 1 : 0);
    }
    return 0;
  });

  const groupedDepartments = filteredDepartments.reduce((groups, dept) => {
    const category = dept.category || 'Other';
    if (!groups[category]) groups[category] = { parents: [], children: [] };
    
    if (dept.parent_department_id) {
      groups[category].children.push(dept);
    } else {
      groups[category].parents.push(dept);
    }
    return groups;
  }, {});

  const departmentTabs = [
    { id: 'overview', label: 'Overview', icon: Building },
    { id: 'all-departments', label: 'All Departments', icon: LayoutGrid },
    { id: 'my-departments', label: 'My Departments', icon: UserCheck },
    { id: 'members', label: 'Department Members', icon: Users },
    { id: 'activities', label: 'Department Activities', icon: Calendar },
    { id: 'budget', label: 'Department Budget', icon: DollarSign },
    { id: 'reports', label: 'Department Reports', icon: BarChart3 }
  ];

  if (loading) {
    return <FullPageLoading message="Loading departments..." />
  }

  return (
    <div className="space-y-6">
      <Breadcrumb />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Department Management</h1>
          <p className="text-sm text-[var(--color-textSecondary)]">Manage church departments and their activities</p>
        </div>
        {canManageDepartments && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Department
          </button>
        )}
      </div>

      <TabNavigation 
        tabs={departmentTabs} 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        persistKey="departments-tab"
      />

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--color-textSecondary)]">Total Departments</p>
                  <p className="text-2xl font-bold text-[var(--color-text)]">{departments.length}</p>
                </div>
                <Building className="w-8 h-8 text-[var(--color-primary)]-600" />
              </div>
            </div>
            <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--color-textSecondary)]">Your Departments</p>
                  <p className="text-2xl font-bold text-[var(--color-text)]">{userDepartments.length}</p>
                </div>
                <UserCheck className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--color-textSecondary)]">Total Members</p>
                  <p className="text-2xl font-bold text-[var(--color-text)]">
                    {departments.reduce((sum, d) => sum + (d.member_count || 0), 0)}
                  </p>
                </div>
                <Users className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </div>
          <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-6">
            <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => setActiveTab('all-departments')}
                className="flex items-center gap-3 p-4 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] transition-colors"
              >
                <LayoutGrid className="w-5 h-5 text-[var(--color-primary)]-600" />
                <span className="text-[var(--color-text)]">View All Departments</span>
              </button>
              <button
                onClick={() => setActiveTab('my-departments')}
                className="flex items-center gap-3 p-4 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] transition-colors"
              >
                <UserCheck className="w-5 h-5 text-green-600" />
                <span className="text-[var(--color-text)]">My Departments</span>
              </button>
              {canManageDepartments && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="flex items-center gap-3 p-4 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] transition-colors"
                >
                  <Plus className="w-5 h-5 text-purple-600" />
                  <span className="text-[var(--color-text)]">Create Department</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* All Departments Tab */}
      {activeTab === 'all-departments' && (
        <div className="space-y-6">
          {selectedDepartments.length > 0 && (
            <div className="bg-[var(--color-primary)]-50 border border-[var(--color-primary)]-200 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleSelectAll}
                  className="flex items-center gap-2 text-[var(--color-primary)]-700 hover:text-[var(--color-primary)]-900"
                >
                  {selectAll ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                  <span className="text-sm font-medium">
                    {selectAll ? 'Deselect All' : 'Select All'}
                  </span>
                </button>
                <div className="h-6 w-px bg-[var(--color-primary)]-300"></div>
                <span className="text-sm text-[var(--color-primary)]-700 font-medium">
                  {selectedDepartments.length} {selectedDepartments.length === 1 ? 'department' : 'departments'} selected
                </span>
                {canManageDepartments && (
                  <>
                    <div className="h-6 w-px bg-[var(--color-primary)]-300"></div>
                    <div className="flex items-center gap-2">
                      <PermissionButton
                        permission={PERMISSIONS.DEPARTMENTS_EDIT}
                        buttonProps={{
                          className: "flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm",
                        }}
                        onClick={() => handleBatchOperation('activate_selected')}
                      >
                        <Power className="w-4 h-4" />
                        Activate
                      </PermissionButton>
                      <PermissionButton
                        permission={PERMISSIONS.DEPARTMENTS_EDIT}
                        buttonProps={{
                          className: "flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm",
                        }}
                        onClick={() => handleBatchOperation('deactivate_selected')}
                      >
                        <PowerOff className="w-4 h-4" />
                        Deactivate
                      </PermissionButton>
                      <PermissionButton
                        permission={PERMISSIONS.DEPARTMENTS_DELETE}
                        buttonProps={{
                          className: "flex items-center gap-2 px-3 py-1.5 bg-[var(--color-surface)] text-white rounded hover:bg-[var(--color-surface)] transition-colors text-sm",
                        }}
                        onClick={() => handleBatchOperation('delete_selected')}
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </PermissionButton>
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={() => {
                  setSelectedDepartments([]);
                  setSelectAll(false);
                }}
                className="text-[var(--color-primary)]-600 hover:text-[var(--color-primary)]-800 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          )}

          {showCreateForm && (
            <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-6">
              <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">
                {editingDepartment ? 'Edit Department' : 'Create New Department'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                      Department Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                      Department Head (Optional)
                    </label>
                    <select
                      value={formData.head_id}
                      onChange={(e) => setFormData({...formData, head_id: e.target.value})}
                      className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]-500 focus:border-transparent"
                    >
                      <option value="">No Department Head</option>
                      <option value="1">Pastor John</option>
                      <option value="2">First Elder</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]-500 focus:border-transparent"
                    >
                      <option value="">Select Category</option>
                      <option value="Leadership">Leadership</option>
                      <option value="Ministry">Ministry</option>
                      <option value="Education">Education</option>
                      <option value="Youth">Youth</option>
                      <option value="Support">Support</option>
                      <option value="Special">Special</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                      Parent Department (Optional)
                    </label>
                    <select
                      value={formData.parent_department_id}
                      onChange={(e) => setFormData({...formData, parent_department_id: e.target.value})}
                      className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]-500 focus:border-transparent"
                    >
                      <option value="">No Parent Department</option>
                      {departments.filter(d => d.id !== editingDepartment?.id).map((dept) => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={3}
                    className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]-500 focus:border-transparent resize-none"
                    required
                  />
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_committee"
                      checked={formData.is_committee}
                      onChange={(e) => setFormData({...formData, is_committee: e.target.checked})}
                      className="w-4 h-4 text-[var(--color-primary)]-600 border-[var(--color-border)] rounded focus:ring-[var(--color-primary)]-500"
                    />
                    <label htmlFor="is_committee" className="ml-2 text-sm text-[var(--color-text)]">
                      This is a committee/subcommittee
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                      className="w-4 h-4 text-[var(--color-primary)]-600 border-[var(--color-border)] rounded focus:ring-[var(--color-primary)]-500"
                    />
                    <label htmlFor="is_active" className="ml-2 text-sm text-[var(--color-text)]">
                      Department is active
                    </label>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors"
                  >
                    {editingDepartment ? 'Update Department' : 'Create Department'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setEditingDepartment(null);
                      setFormData({ name: '', description: '', head_id: '', category: '', parent_department_id: '', is_committee: false, is_active: true });
                    }}
                    className="px-4 py-2 bg-[var(--color-surface)] text-[var(--color-text)] rounded-lg hover:bg-[var(--color-surface)] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-[var(--color-text)]">Filter by:</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]-500 focus:border-transparent"
            >
              <option value="all">All Departments</option>
              <option value="leadership">Leadership Roles</option>
              <option value="Leadership">Leadership</option>
              <option value="Ministry">Ministry</option>
              <option value="Education">Education</option>
              <option value="Youth">Youth</option>
              <option value="Support">Support</option>
              <option value="Special">Special</option>
            </select>

            <label className="text-sm font-medium text-[var(--color-text)]">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]-500 focus:border-transparent"
            >
              <option value="name">Name</option>
              <option value="members">Member Count</option>
              <option value="category">Category</option>
              <option value="status">Status</option>
            </select>
          </div>

          <div className="space-y-6">
            {Object.keys(groupedDepartments).length > 0 ? (
              Object.entries(groupedDepartments).map(([category, { parents, children }]) => (
                <div key={category}>
                  <h2 className="text-lg font-semibold text-[var(--color-text)] mb-3">{category}</h2>
                  <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] overflow-hidden">
                    {parents.map((department) => (
                      <div
                        key={department.id}
                        className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-background)] transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {canManageDepartments && (
                            <button
                              onClick={() => handleSelectDepartment(department.id)}
                              className="shrink-0"
                            >
                              {selectedDepartments.includes(department.id) ? (
                                <CheckSquare className="w-5 h-5 text-[var(--color-primary)]-600" />
                              ) : (
                                <Square className="w-5 h-5 text-[var(--color-textSecondary)]" />
                              )}
                            </button>
                          )}
                          <Building className={`w-5 h-5 ${department.is_active ? 'text-[var(--color-primary)]-600' : 'text-[var(--color-textSecondary)]'} shrink-0`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-[var(--color-text)] truncate">{department.name}</h3>
                              {department.is_committee && (
                                <span className="shrink-0 px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded-full">
                                  Committee
                                </span>
                              )}
                              {!department.is_active && (
                                <span className="shrink-0 px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded-full">
                                  Inactive
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-[var(--color-textSecondary)] truncate">{department.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-4">
                          <span className="text-xs text-[var(--color-textSecondary)]">{department.member_count || 0} members</span>
                          <button
                            onClick={() => handleDepartmentClick(department)}
                            className="px-3 py-1.5 text-sm bg-[var(--color-primary)]-600 text-white rounded hover:bg-[var(--color-primary)]-700 transition-colors"
                          >
                            Open
                          </button>
                          {canManageDepartments && (
                            <PermissionButton
                              permission={PERMISSIONS.DEPARTMENTS_EDIT}
                              buttonProps={{
                                className: "p-1.5 text-[var(--color-primary)]-600 hover:bg-[var(--color-primary)]-50 rounded transition-colors",
                                title: "Edit",
                              }}
                              onClick={() => handleEdit(department)}
                            >
                              <Edit className="w-4 h-4" />
                            </PermissionButton>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <DepartmentsEmptyState />
            )}
          </div>
        </div>
      )}

      {/* My Departments Tab */}
      {activeTab === 'my-departments' && (
        <div className="space-y-6">
          {userDepartments.length === 0 ? (
            <DepartmentsEmptyState message="You are not a member of any departments yet." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userDepartments.map((department) => (
                <div
                  key={department.id}
                  onClick={() => handleDepartmentClick(department)}
                  className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-6 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-[var(--color-primary)]-100 shrink-0">
                      <Building className="w-6 h-6 text-[var(--color-primary)]-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[var(--color-text)] truncate">{department.name}</h3>
                      <p className="text-sm text-[var(--color-textSecondary)] line-clamp-2">{department.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getCategoryColor(department.category)}`}>
                      {department.category || 'Uncategorized'}
                    </span>
                    <ChevronRight className="w-5 h-5 text-[var(--color-textSecondary)]" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Department Members Tab */}
      {activeTab === 'members' && (
        <div className="space-y-6">
          <div className="bg-[var(--color-surface)] p-6 rounded-lg border border-[var(--color-border)]">
            <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">Department Members</h3>
            <p className="text-[var(--color-textSecondary)]">Member management by department will be implemented here.</p>
          </div>
        </div>
      )}

      {/* Department Activities Tab */}
      {activeTab === 'activities' && (
        <div className="space-y-6">
          <div className="bg-[var(--color-surface)] p-6 rounded-lg border border-[var(--color-border)]">
            <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">Department Activities</h3>
            <p className="text-[var(--color-textSecondary)]">Activity management by department will be implemented here.</p>
          </div>
        </div>
      )}

      {/* Department Budget Tab */}
      {activeTab === 'budget' && (
        <div className="space-y-6">
          <div className="bg-[var(--color-surface)] p-6 rounded-lg border border-[var(--color-border)]">
            <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">Department Budget</h3>
            <p className="text-[var(--color-textSecondary)]">Budget management by department will be implemented here.</p>
          </div>
        </div>
      )}

      {/* Department Reports Tab */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="bg-[var(--color-surface)] p-6 rounded-lg border border-[var(--color-border)]">
            <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">Department Reports</h3>
            <p className="text-[var(--color-textSecondary)]">Department analytics and reports will be implemented here.</p>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <PasswordConfirmationModal
          show={showPasswordModal}
          password={password}
          onPasswordChange={setPassword}
          onConfirm={handlePasswordConfirmation}
          onCancel={cancelPasswordConfirmation}
          isLoading={passwordLoading}
        />
      )}
    </div>
  );
};

export default DepartmentsOriginal;
