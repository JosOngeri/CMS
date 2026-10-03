import React, { useState, useEffect, useCallback } from 'react';
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
  FileText,
  ArrowLeftRight
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { usePermission } from '../../hooks/usePermission';
import { FullPageLoading } from '../../components/common/Loading';
import { DepartmentsEmptyState } from '../../components/common/EmptyState';
import Breadcrumb from '../../components/common/Breadcrumb';
import TabNavigation from '../../components/common/TabNavigation';
import PasswordConfirmationModal from '../../components/common/PasswordConfirmationModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import PermissionButton from '../../components/common/PermissionButton';
import Card from '../../components/common/Card';
import { usePasswordConfirmation } from '../../hooks/usePasswordConfirmation';
import { SUCCESS_MESSAGES } from '../../constants/validation';
import { PERMISSIONS } from '../../constants/permissions';
import { SDA_DEPARTMENTS, SDA_CATEGORIES } from '../../constants/sdaDepartments';

const DepartmentsList = () => {
  const { user, api } = useAuth();
  const { can } = usePermission();
  const toast = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'members', 'events', 'budget', 'reports'
  const [viewMode, setViewMode] = useState('all'); // 'all', 'my'
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
  const [pendingBatch, setPendingBatch] = useState(null); // {action, message}
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

  const fetchDepartments = useCallback(async () => {
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
  }, [api, toast]);

  const fetchUserDepartments = useCallback(async () => {
    try {
      const response = await api.get('/departments/my-departments');
      setUserDepartments(response.data.departments || []);
      setUserRoles(response.data.roles || {});
    } catch (error) {
      console.error('Error fetching user departments:', error);
      // Don't show error toast here as it might be secondary
      setUserDepartments([]);
      setUserRoles({});
    }
  }, [api]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchDepartments(), fetchUserDepartments()]);
      setLoading(false);
    };
    init();
  }, [fetchDepartments, fetchUserDepartments]);

  const canManageDepartments = user?.roles?.some(role => 
    ['Super Admin', 'Pastor', 'First Elder'].includes(role)
  );

  const handleDepartmentClick = (department) => {
    const userRole = userRoles[department.id];
    const isAdmin = userRole === 'Leader' || userRole === 'Assistant Leader';
    navigate(`/dashboard/departments/${department.slug}`, {
      state: { role: userRole, isAdmin }
    });
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

  const BATCH_LABELS = {
    activate_all: { confirm: 'Are you sure you want to activate all departments?', success: 'All departments activated successfully' },
    deactivate_all: { confirm: 'Are you sure you want to deactivate all departments?', success: 'All departments deactivated successfully' },
    activate_selected: { confirm: `Are you sure you want to activate ${selectedDepartments.length} selected departments?`, success: 'Selected departments activated successfully' },
    deactivate_selected: { confirm: `Are you sure you want to deactivate ${selectedDepartments.length} selected departments?`, success: 'Selected departments deactivated successfully' },
  };

  const handleBatchOperation = (action) => {
    if (action === 'delete_selected') {
      requirePasswordConfirmation(
        async () => {
          const payload = { action: 'delete_selected', department_ids: selectedDepartments };
          await api.post('/departments/batch', payload);
          toast.success('Selected departments deleted successfully');
          setSelectedDepartments([]);
          setSelectAll(false);
          fetchDepartments();
        },
        `Please enter your password to confirm the deletion of ${selectedDepartments.length} department(s).`
      );
      return;
    }
    const labels = BATCH_LABELS[action];
    if (!labels) return;
    setPendingBatch({ action, message: labels.confirm });
  };

  const confirmBatchOperation = async () => {
    const pending = pendingBatch;
    setPendingBatch(null);
    try {
      const payload = pending.action === 'activate_all' || pending.action === 'deactivate_all'
        ? { action: pending.action }
        : { action: pending.action, department_ids: selectedDepartments };

      await api.post('/departments/batch', payload);
      toast.success(BATCH_LABELS[pending.action].success);
      setSelectedDepartments([]);
      setSelectAll(false);
      fetchDepartments();
    } catch (error) {
      console.error('Batch operation error:', error);
      toast.error('Batch operation failed');
    }
  };

  const currentDepartments = viewMode === 'my' ? userDepartments : departments;

  const departmentTabs = [
    { id: 'overview', label: 'Overview', icon: Building, count: departments.length },
    { id: 'members', label: 'Members', icon: Users, count: departments.reduce((sum, d) => sum + (d.member_count || 0), 0) },
    { id: 'events', label: 'Events', icon: Calendar },
    { id: 'budget', label: 'Budget', icon: DollarSign },
    { id: 'reports', label: 'Reports', icon: BarChart3 }
  ];

  const filteredDepartments = currentDepartments.filter(dept => {
    if (filter === 'all') return true;
    if (filter === 'leadership') return userRoles[dept.id] === 'Leader' || userRoles[dept.id] === 'Assistant Leader';
    return dept.category === filter;
  }).sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'members') return (b.member_count || 0) - (a.member_count || 0);
    if (sortBy === 'category') return (a.category || '').localeCompare(b.category || '');
    if (sortBy === 'status') return (b.is_active ? 1 : 0) - (a.is_active ? 1 : 0);
    return 0;
  });

  const groupedDepartments = filteredDepartments.reduce((groups, dept) => {
    const category = dept.category || 'Other';
    if (!groups[category]) groups[category] = { parents: [], children: [] };
    if (dept.parent_department_id) groups[category].children.push(dept);
    else groups[category].parents.push(dept);
    return groups;
  }, {});

  if (loading) return <FullPageLoading message="Loading departments..." />;

  return (
    <div className="space-y-6">
      <Breadcrumb />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Department Management</h1>
          <p className="text-sm text-[var(--color-textSecondary)]">Manage church departments and activities</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/dashboard/departments/handovers')}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surfaceHover)] transition-colors"
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span className="hidden sm:inline">Handovers</span>
          </button>
          {canManageDepartments && (
            <>
              <button
                onClick={() => navigate('/dashboard/departments/head-allocation')}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surfaceHover)] transition-colors"
              >
                <Crown className="w-4 h-4" />
                <span className="hidden sm:inline">Leadership</span>
              </button>
              <button
                onClick={() => { setEditingDepartment(null); setFormData({ name: '', description: '', head_id: '', category: '', parent_department_id: '', is_committee: false, is_active: true }); setShowCreateForm(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-[var(--color-on-solid)] rounded-lg hover:bg-[var(--color-primary)] transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Department</span>
              </button>
            </>
          )}
        </div>
      </div>

      <TabNavigation tabs={departmentTabs} activeTab={activeTab} onTabChange={setActiveTab} persistKey="departments-tab" />

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setViewMode('all')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${viewMode === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <LayoutGrid className="w-4 h-4" />
              All Departments
            </button>
            <button
              onClick={() => setViewMode('my')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${viewMode === 'my' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <UserCheck className="w-4 h-4" />
              My Departments
            </button>
          </div>

          {/* Selection Bar */}
          {selectedDepartments.length > 0 && (
            <div className="bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] border border-[color-mix(in_srgb,var(--color-primary)_20%,transparent)] rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={handleSelectAll} className="flex items-center gap-2 text-primary hover:opacity-80">
                  {selectAll ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                  <span className="text-sm font-medium">{selectAll ? 'Deselect All' : 'Select All'}</span>
                </button>
                {canManageDepartments && (
                  <div className="flex items-center gap-2 border-l border-[color-mix(in_srgb,var(--color-primary)_30%,transparent)] pl-4 ml-2">
                    <button onClick={() => handleBatchOperation('activate_selected')} className="btn btn-sm btn-success">Activate</button>
                    <button onClick={() => handleBatchOperation('deactivate_selected')} className="btn btn-sm btn-warning">Deactivate</button>
                    <button onClick={() => handleBatchOperation('delete_selected')} className="btn btn-sm btn-danger">Delete</button>
                  </div>
                )}
              </div>
              <button onClick={() => setSelectedDepartments([])} className="text-[var(--color-textSecondary)] hover:text-[var(--color-text)] text-sm">Cancel</button>
            </div>
          )}

          {/* Form */}
          {showCreateForm && (
            <Card className="mb-6">
              <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">
                {editingDepartment ? 'Edit Department' : 'Create New Department'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input type="text" placeholder="Name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="input" required list="sda-department-names" />
                  <datalist id="sda-department-names">
                    {SDA_DEPARTMENTS.map((d) => <option key={d.slug} value={d.name}>{d.category}</option>)}
                  </datalist>
                  <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="select">
                    <option value="">Select Category</option>
                    {SDA_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <select
                    value={formData.parent_department_id || ''}
                    onChange={(e) => setFormData({...formData, parent_department_id: e.target.value || null})}
                    className="select"
                  >
                    <option value="">No parent (top-level department)</option>
                    {departments.filter((d) => d.id !== editingDepartment?.id).map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                  <label className="flex items-center gap-2 text-sm text-[var(--color-text)]">
                    <input
                      type="checkbox"
                      checked={!!formData.is_committee}
                      onChange={(e) => setFormData({...formData, is_committee: e.target.checked})}
                      className="rounded"
                    />
                    Committee (e.g. Camp Meeting, Development)
                  </label>
                </div>
                <textarea placeholder="Description" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="textarea" rows={3} required />
                <div className="flex gap-3">
                  <button type="submit" className="btn btn-primary">{editingDepartment ? 'Update' : 'Create'}</button>
                  <button type="button" onClick={() => setShowCreateForm(false)} className="btn btn-secondary">Cancel</button>
                </div>
              </form>
            </Card>
          )}

          {/* Filters */}
          <div className="flex gap-4 items-center">
            <select value={filter} onChange={(e) => setFilter(e.target.value)} className="select w-48">
              <option value="all">All Categories</option>
              <option value="leadership">My Leadership</option>
              {SDA_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="select w-48">
              <option value="name">Sort by Name</option>
              <option value="members">Sort by Members</option>
            </select>
          </div>

          {/* List */}
          <div className="space-y-6">
            {Object.keys(groupedDepartments).length > 0 ? (
              Object.entries(groupedDepartments).map(([category, { parents, children }]) => (
                <div key={category}>
                  <h2 className="text-lg font-semibold mb-3">{category}</h2>
                  <div className="bg-[var(--color-surface)] rounded-lg border divide-y overflow-hidden">
                    {[...parents, ...children.filter((c) => !parents.some((p) => p.id === c.parent_department_id))].map((dept) => (
                      <div key={dept.id}>
                        <div className="p-4 flex items-center justify-between hover:bg-[var(--color-background)]">
                          <div className="flex items-center gap-3">
                            {canManageDepartments && (
                              <button onClick={() => handleSelectDepartment(dept.id)}>
                                {selectedDepartments.includes(dept.id) ? <CheckSquare className="text-primary-600" /> : <Square className="text-[var(--color-textSecondary)]" />}
                              </button>
                            )}
                            <Building className="text-primary" />
                            <div>
                              <h3 className="font-medium">{dept.name}</h3>
                              <p className="text-sm text-[var(--color-textSecondary)]">{dept.description}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleDepartmentClick(dept)} className="btn btn-sm btn-primary">Open</button>
                            {canManageDepartments && <button onClick={() => handleEdit(dept)} className="btn btn-sm btn-secondary"><Edit className="w-4 h-4" /></button>}
                          </div>
                        </div>
                        {/* Sub-departments nested under their parent */}
                        {children.filter((c) => c.parent_department_id === dept.id).map((child) => (
                          <div key={child.id} className="p-4 pl-12 flex items-center justify-between hover:bg-[var(--color-background)] border-t border-[var(--color-border)]">
                            <div className="flex items-center gap-3">
                              <Building className="text-[var(--color-textSecondary)]" />
                              <div>
                                <h3 className="font-medium text-sm">{child.name}</h3>
                                <p className="text-xs text-[var(--color-textSecondary)]">{child.description}</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => handleDepartmentClick(child)} className="btn btn-sm btn-primary">Open</button>
                              {canManageDepartments && <button onClick={() => handleEdit(child)} className="btn btn-sm btn-secondary"><Edit className="w-4 h-4" /></button>}
                            </div>
                          </div>
                        ))}
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

      {activeTab !== 'overview' && (
        <Card className="p-12 text-center">
          <p className="text-[var(--color-textSecondary)]">The {activeTab} section is coming soon.</p>
        </Card>
      )}

      <PasswordConfirmationModal
        show={showPasswordModal}
        onClose={cancelPasswordConfirmation}
        onConfirm={handlePasswordConfirmation}
        password={password}
        setPassword={setPassword}
        isLoading={passwordLoading}
      />

      <ConfirmDialog
        show={pendingBatch !== null}
        onClose={() => setPendingBatch(null)}
        onConfirm={confirmBatchOperation}
        title="Confirm Batch Operation"
        message={pendingBatch?.message || ''}
        confirmLabel="Confirm"
      />
    </div>
  );
};

export default DepartmentsList;
