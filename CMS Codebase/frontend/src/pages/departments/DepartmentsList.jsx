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
import Card from '../../components/common/Card';
import { usePasswordConfirmation } from '../../hooks/usePasswordConfirmation';
import { SUCCESS_MESSAGES } from '../../constants/validation';
import { PERMISSIONS } from '../../constants/permissions';

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
      const response = await api.get('/department/my-departments');
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
      state: { role: userRole, isAdmin: true }
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
              await api.post('/departments/batch', payload);
              toast.success('Selected departments deleted successfully');
              setSelectedDepartments([]);
              setSelectAll(false);
              fetchDepartments();
            },
            `Please enter your password to confirm the deletion of ${selectedDepartments.length} department(s).`
          );
          return;
        default:
          return;
      }

      if (!confirm(confirmMessage)) return;

      const payload = action === 'activate_all' || action === 'deactivate_all'
        ? { action }
        : { action, department_ids: selectedDepartments };

      await api.post('/departments/batch', payload);
      toast.success(successMessage);
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
    { id: 'events', label: 'Events', icon: Calendar, count: 0 },
    { id: 'budget', label: 'Budget', icon: DollarSign, count: 0 },
    { id: 'reports', label: 'Reports', icon: BarChart3, count: 0 }
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
        {canManageDepartments && (
          <button
            onClick={() => { setEditingDepartment(null); setFormData({ name: '', description: '', head_id: '', category: '', parent_department_id: '', is_committee: false, is_active: true }); setShowCreateForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Department
          </button>
        )}
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
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={handleSelectAll} className="flex items-center gap-2 text-primary hover:opacity-80">
                  {selectAll ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                  <span className="text-sm font-medium">{selectAll ? 'Deselect All' : 'Select All'}</span>
                </button>
                {canManageDepartments && (
                  <div className="flex items-center gap-2 border-l border-primary/30 pl-4 ml-2">
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
                  <input type="text" placeholder="Name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="input" required />
                  <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="select">
                    <option value="">Select Category</option>
                    <option value="Ministry">Ministry</option>
                    <option value="Leadership">Leadership</option>
                    <option value="Education">Education</option>
                    <option value="Youth">Youth</option>
                    <option value="Support">Support</option>
                  </select>
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
              <option value="Ministry">Ministry</option>
              <option value="Leadership">Leadership</option>
              <option value="Education">Education</option>
              <option value="Youth">Youth</option>
            </select>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="select w-48">
              <option value="name">Sort by Name</option>
              <option value="members">Sort by Members</option>
            </select>
          </div>

          {/* List */}
          <div className="space-y-6">
            {Object.keys(groupedDepartments).length > 0 ? (
              Object.entries(groupedDepartments).map(([category, { parents }]) => (
                <div key={category}>
                  <h2 className="text-lg font-semibold mb-3">{category}</h2>
                  <div className="bg-[var(--color-surface)] rounded-lg border divide-y overflow-hidden">
                    {parents.map((dept) => (
                      <div key={dept.id} className="p-4 flex items-center justify-between hover:bg-[var(--color-background)]">
                        <div className="flex items-center gap-3">
                          {canManageDepartments && (
                            <button onClick={() => handleSelectDepartment(dept.id)}>
                              {selectedDepartments.includes(dept.id) ? <CheckSquare className="text-primary-600" /> : <Square className="text-gray-300" />}
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
    </div>
  );
};

export default DepartmentsList;
