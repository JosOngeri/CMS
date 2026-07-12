import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { FullPageLoading } from '../../components/common/Loading';
import { Settings, Building, Globe, Bell, Shield, Users, Save } from 'lucide-react';

const DepartmentSettings = () => {
  const { api } = useAuth();
  const toast = useToast();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('global');
  const [globalSettings, setGlobalSettings] = useState({
    allow_self_join: true,
    require_approval: false,
    max_members_per_department: null,
    default_category: 'Ministry'
  });
  const [departmentSettings, setDepartmentSettings] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const deptRes = await api.get('/departments');
      setDepartments(deptRes.data.departments || []);
      
      // Initialize department settings
      const initialDeptSettings = {};
      (deptRes.data.departments || []).forEach(dept => {
        initialDeptSettings[dept.id] = {
          is_public: dept.is_public ?? true,
          allow_member_communication: dept.allow_member_communication ?? true,
          auto_approve_members: dept.auto_approve_members ?? false
        };
      });
      setDepartmentSettings(initialDeptSettings);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleGlobalSettingChange = (key, value) => {
    setGlobalSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleDepartmentSettingChange = (departmentId, key, value) => {
    setDepartmentSettings(prev => ({
      ...prev,
      [departmentId]: {
        ...prev[departmentId],
        [key]: value
      }
    }));
  };

  const handleSaveGlobalSettings = async () => {
    try {
      await api.put('/admin/settings', { department_settings: globalSettings });
      toast.success('Global department settings saved successfully');
    } catch (error) {
      console.error('Error saving global settings:', error);
      toast.error('Failed to save global settings');
    }
  };

  const handleSaveDepartmentSettings = async (departmentId) => {
    try {
      await api.put(`/departments/${departmentId}`, departmentSettings[departmentId]);
      toast.success('Department settings saved successfully');
    } catch (error) {
      console.error('Error saving department settings:', error);
      toast.error('Failed to save department settings');
    }
  };

  if (loading) {
    return <FullPageLoading message="Loading department settings..." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Department Settings</h1>
        <p className="text-sm text-[var(--color-textSecondary)]">Configure global and department-specific settings</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--color-border)]">
        <nav className="flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('global')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'global'
                ? 'border-[var(--color-primary)]-500 text-[var(--color-primary)]-600'
                : 'border-transparent text-[var(--color-textSecondary)] hover:text-[var(--color-text)] hover:border-[var(--color-border)]'
            }`}
          >
            <Globe className="w-4 h-4 inline mr-2" />
            Global Settings
          </button>
          <button
            onClick={() => setActiveTab('departments')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'departments'
                ? 'border-[var(--color-primary)]-500 text-[var(--color-primary)]-600'
                : 'border-transparent text-[var(--color-textSecondary)] hover:text-[var(--color-text)] hover:border-[var(--color-border)]'
            }`}
          >
            <Building className="w-4 h-4 inline mr-2" />
            Department Settings
          </button>
        </nav>
      </div>

      {activeTab === 'global' && (
        <div className="space-y-6">
          <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-[var(--color-text)]">Global Department Settings</h2>
              <button
                onClick={handleSaveGlobalSettings}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                Save Settings
              </button>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-[var(--color-text)]">Allow Self-Join</h3>
                  <p className="text-sm text-[var(--color-textSecondary)]">Users can join departments without approval</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={globalSettings.allow_self_join}
                    onChange={(e) => handleGlobalSettingChange('allow_self_join', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[var(--color-surface)] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--color-primary)]-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--color-surface)] after:border-[var(--color-border)] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-[var(--color-text)]">Require Approval</h3>
                  <p className="text-sm text-[var(--color-textSecondary)]">Department head must approve new members</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={globalSettings.require_approval}
                    onChange={(e) => handleGlobalSettingChange('require_approval', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[var(--color-surface)] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--color-primary)]-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--color-surface)] after:border-[var(--color-border)] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]-600"></div>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                  Maximum Members per Department
                </label>
                <input
                  type="number"
                  value={globalSettings.max_members_per_department || ''}
                  onChange={(e) => handleGlobalSettingChange('max_members_per_department', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="No limit"
                  className="w-full max-w-xs px-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]-500 focus:border-transparent"
                />
                <p className="text-sm text-[var(--color-textSecondary)] mt-1">Leave empty for no limit</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                  Default Category
                </label>
                <select
                  value={globalSettings.default_category}
                  onChange={(e) => handleGlobalSettingChange('default_category', e.target.value)}
                  className="w-full max-w-xs px-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]-500 focus:border-transparent"
                >
                  <option value="Leadership">Leadership</option>
                  <option value="Ministry">Ministry</option>
                  <option value="Education">Education</option>
                  <option value="Youth">Youth</option>
                  <option value="Support">Support</option>
                  <option value="Special">Special</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'departments' && (
        <div className="space-y-6">
          {departments.map((department) => (
            <div key={department.id} className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[var(--color-primary)]-100">
                    <Building className="w-5 h-5 text-[var(--color-primary)]-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--color-text)]">{department.name}</h3>
                    <p className="text-sm text-[var(--color-textSecondary)]">{department.category || 'Uncategorized'}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleSaveDepartmentSettings(department.id)}
                  className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                >
                  Save
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-[var(--color-text)]">Public Department</h4>
                    <p className="text-sm text-[var(--color-textSecondary)]">Visible to all church members</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={departmentSettings[department.id]?.is_public ?? true}
                      onChange={(e) => handleDepartmentSettingChange(department.id, 'is_public', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[var(--color-surface)] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--color-primary)]-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--color-surface)] after:border-[var(--color-border)] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-[var(--color-text)]">Allow Member Communication</h4>
                    <p className="text-sm text-[var(--color-textSecondary)]">Members can post communications</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={departmentSettings[department.id]?.allow_member_communication ?? true}
                      onChange={(e) => handleDepartmentSettingChange(department.id, 'allow_member_communication', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[var(--color-surface)] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--color-primary)]-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--color-surface)] after:border-[var(--color-border)] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-[var(--color-text)]">Auto-Approve Members</h4>
                    <p className="text-sm text-[var(--color-textSecondary)]">Automatically approve join requests</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={departmentSettings[department.id]?.auto_approve_members ?? false}
                      onChange={(e) => handleDepartmentSettingChange(department.id, 'auto_approve_members', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[var(--color-surface)] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--color-primary)]-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--color-surface)] after:border-[var(--color-border)] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]-600"></div>
                  </label>
                </div>
              </div>
            </div>
          ))}

          {departments.length === 0 && (
            <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-12 text-center">
              <Building className="w-12 h-12 text-[var(--color-textSecondary)] mx-auto mb-4" />
              <p className="text-[var(--color-textSecondary)]">No departments found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DepartmentSettings;
