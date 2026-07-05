import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Calendar,
  Building,
  ChevronRight,
  Search,
  Info,
  DollarSign,
  BarChart3,
  X,
  Plus,
  Edit,
  Settings
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { FullPageLoading } from '../../components/common/Loading';
import { DepartmentsEmptyState } from '../../components/common/EmptyState';
import Breadcrumb from '../../components/common/Breadcrumb';

const DepartmentsAlternative = () => {
  const { api, user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState('info');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/departments');
      setDepartments(response.data.departments || []);
      if (response.data.departments?.length > 0) {
        setSelectedDepartment(response.data.departments[0]);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast.error('Failed to load departments');
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredDepartments = departments.filter(dept => {
    const matchesSearch = dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         dept.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || dept.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const handleDepartmentClick = (department) => {
    setSelectedDepartment(department);
    setActiveSubTab('info');
  };

  const handleOpenDepartment = () => {
    if (selectedDepartment) {
      navigate(`/dashboard/departments/${selectedDepartment.slug}`);
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

  const subTabs = [
    { id: 'info', label: 'Info', icon: Info },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'activities', label: 'Activities', icon: Calendar },
    { id: 'budget', label: 'Budget', icon: DollarSign },
    { id: 'reports', label: 'Reports', icon: BarChart3 }
  ];

  if (loading) {
    return <FullPageLoading message="Loading departments..." />
  }

  return (
    <div className="h-full">
      <Breadcrumb />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Departments</h1>
          <p className="text-sm text-[var(--color-textSecondary)]">View and manage church departments</p>
        </div>
        <button
          onClick={() => navigate('/dashboard/departments/create')}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Department
        </button>
      </div>

      <div className="flex gap-6 h-[calc(100vh-200px)]">
        {/* Left Panel - Department List */}
        <div className="w-1/3 min-w-[300px] bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] flex flex-col">
          {/* Search and Filter */}
          <div className="p-4 border-b border-[var(--color-border)] space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--color-textSecondary)]" />
              <input
                type="text"
                placeholder="Search departments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]-500 focus:border-transparent text-sm"
              />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]-500 focus:border-transparent text-sm"
            >
              <option value="all">All Categories</option>
              <option value="Leadership">Leadership</option>
              <option value="Ministry">Ministry</option>
              <option value="Education">Education</option>
              <option value="Youth">Youth</option>
              <option value="Support">Support</option>
              <option value="Special">Special</option>
            </select>
          </div>

          {/* Department List */}
          <div className="flex-1 overflow-y-auto">
            {filteredDepartments.length === 0 ? (
              <div className="p-8 text-center">
                <Building className="w-12 h-12 text-[var(--color-textSecondary)] mx-auto mb-4" />
                <p className="text-[var(--color-textSecondary)] text-sm">No departments found</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                {filteredDepartments.map((department) => (
                  <button
                    key={department.id}
                    onClick={() => handleDepartmentClick(department)}
                    className={`w-full p-4 text-left hover:bg-[var(--color-background)] transition-colors ${
                      selectedDepartment?.id === department.id ? 'bg-[var(--color-primary)]-50 border-l-4 border-[var(--color-primary)]-600' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-[var(--color-primary)]-100 shrink-0">
                        <Building className="w-5 h-5 text-[var(--color-primary)]-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-[var(--color-text)] truncate">{department.name}</h3>
                        <p className="text-sm text-[var(--color-textSecondary)] line-clamp-2">{department.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getCategoryColor(department.category)}`}>
                            {department.category || 'Uncategorized'}
                          </span>
                          <span className="text-xs text-[var(--color-textSecondary)]">{department.member_count || 0} members</span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-[var(--color-textSecondary)] shrink-0 mt-1" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Department Details */}
        <div className="flex-1 bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] flex flex-col">
          {selectedDepartment ? (
            <>
              {/* Department Header */}
              <div className="p-6 border-b border-[var(--color-border)]">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-[var(--color-primary)]-100">
                      <Building className="w-8 h-8 text-[var(--color-primary)]-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-[var(--color-text)]">{selectedDepartment.name}</h2>
                      <p className="text-sm text-[var(--color-textSecondary)] mt-1">{selectedDepartment.description}</p>
                      <div className="flex items-center gap-3 mt-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getCategoryColor(selectedDepartment.category)}`}>
                          {selectedDepartment.category || 'Uncategorized'}
                        </span>
                        <span className="text-sm text-[var(--color-textSecondary)]">{selectedDepartment.member_count || 0} members</span>
                        {!selectedDepartment.is_active && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                            Inactive
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleOpenDepartment}
                      className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors text-sm"
                    >
                      Open Department
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => navigate(`/dashboard/departments/${selectedDepartment.slug}/settings`)}
                      className="p-2 text-[var(--color-textSecondary)] hover:bg-[var(--color-surface)] rounded-lg transition-colors"
                      title="Settings"
                    >
                      <Settings className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Sub-tabs */}
              <div className="border-b border-[var(--color-border)]">
                <nav className="flex space-x-0" aria-label="Department sub-tabs">
                  {subTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveSubTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
                        activeSubTab === tab.id
                          ? 'border-[var(--color-primary)]-500 text-[var(--color-primary)]-600 bg-[var(--color-primary)]-50'
                          : 'border-transparent text-[var(--color-textSecondary)] hover:text-[var(--color-text)] hover:border-[var(--color-border)]'
                      }`}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Sub-tab Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {activeSubTab === 'info' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-[var(--color-text)] mb-3">Department Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-[var(--color-textSecondary)]">Category</label>
                          <p className="text-[var(--color-text)] font-medium">{selectedDepartment.category || 'Not set'}</p>
                        </div>
                        <div>
                          <label className="text-sm text-[var(--color-textSecondary)]">Status</label>
                          <p className="text-[var(--color-text)] font-medium">
                            {selectedDepartment.is_active ? 'Active' : 'Inactive'}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm text-[var(--color-textSecondary)]">Member Count</label>
                          <p className="text-[var(--color-text)] font-medium">{selectedDepartment.member_count || 0}</p>
                        </div>
                        <div>
                          <label className="text-sm text-[var(--color-textSecondary)]">Created</label>
                          <p className="text-[var(--color-text)] font-medium">
                            {new Date(selectedDepartment.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    {selectedDepartment.head_id && (
                      <div>
                        <h3 className="text-lg font-semibold text-[var(--color-text)] mb-3">Department Head</h3>
                        <div className="bg-[var(--color-background)] rounded-lg p-4">
                          <p className="text-[var(--color-text)]">Department head information will be displayed here</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeSubTab === 'members' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-[var(--color-text)]">Department Members</h3>
                      <button className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors text-sm">
                        <Plus className="w-4 h-4" />
                        Add Member
                      </button>
                    </div>
                    <div className="bg-[var(--color-background)] rounded-lg p-8 text-center">
                      <Users className="w-12 h-12 text-[var(--color-textSecondary)] mx-auto mb-4" />
                      <p className="text-[var(--color-textSecondary)]">Member list will be displayed here</p>
                    </div>
                  </div>
                )}

                {activeSubTab === 'activities' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-[var(--color-text)]">Department Activities</h3>
                      <button className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors text-sm">
                        <Plus className="w-4 h-4" />
                        Add Activity
                      </button>
                    </div>
                    <div className="bg-[var(--color-background)] rounded-lg p-8 text-center">
                      <Calendar className="w-12 h-12 text-[var(--color-textSecondary)] mx-auto mb-4" />
                      <p className="text-[var(--color-textSecondary)]">Activities will be displayed here</p>
                    </div>
                  </div>
                )}

                {activeSubTab === 'budget' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-[var(--color-text)]">Department Budget</h3>
                      <button className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors text-sm">
                        <Edit className="w-4 h-4" />
                        Edit Budget
                      </button>
                    </div>
                    <div className="bg-[var(--color-background)] rounded-lg p-8 text-center">
                      <DollarSign className="w-12 h-12 text-[var(--color-textSecondary)] mx-auto mb-4" />
                      <p className="text-[var(--color-textSecondary)]">Budget information will be displayed here</p>
                    </div>
                  </div>
                )}

                {activeSubTab === 'reports' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-[var(--color-text)]">Department Reports</h3>
                      <button className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors text-sm">
                        <Plus className="w-4 h-4" />
                        Generate Report
                      </button>
                    </div>
                    <div className="bg-[var(--color-background)] rounded-lg p-8 text-center">
                      <BarChart3 className="w-12 h-12 text-[var(--color-textSecondary)] mx-auto mb-4" />
                      <p className="text-[var(--color-textSecondary)]">Reports will be displayed here</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <DepartmentsEmptyState message="Select a department to view details" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DepartmentsAlternative;
