import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { FullPageLoading } from '../../components/common/Loading';
import { Building, User, Save, Search } from 'lucide-react';

const DepartmentHeadAllocation = () => {
  const { api } = useAuth();
  const toast = useToast();
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [allocations, setAllocations] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [deptRes, userRes] = await Promise.all([
        api.get('/departments'),
        api.get('/users')
      ]);
      setDepartments(deptRes.data.departments || []);
      setUsers(userRes.data.users || []);
      
      // Initialize allocations
      const initialAllocations = {};
      (deptRes.data.departments || []).forEach(dept => {
        initialAllocations[dept.id] = dept.head_id || '';
      });
      setAllocations(initialAllocations);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAllocationChange = (departmentId, userId) => {
    setAllocations(prev => ({
      ...prev,
      [departmentId]: userId
    }));
  };

  const handleSave = async (departmentId) => {
    try {
      await api.put(`/departments/${departmentId}`, { head_id: allocations[departmentId] || null });
      toast.success('Department head updated successfully');
      loadData();
    } catch (error) {
      console.error('Error updating department head:', error);
      toast.error('Failed to update department head');
    }
  };

  const handleSaveAll = async () => {
    try {
      await Promise.all(
        Object.entries(allocations).map(([deptId, headId]) =>
          api.put(`/departments/${deptId}`, { head_id: headId || null })
        )
      );
      toast.success('All department heads updated successfully');
      loadData();
    } catch (error) {
      console.error('Error updating department heads:', error);
      toast.error('Failed to update some department heads');
    }
  };

  const filteredUsers = users.filter(user =>
    user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <FullPageLoading message="Loading department head allocation..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Department Head Allocation</h1>
          <p className="text-sm text-[var(--color-textSecondary)]">Assign heads to church departments</p>
        </div>
        <button
          onClick={handleSaveAll}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors"
        >
          <Save className="w-4 h-4" />
          Save All Changes
        </button>
      </div>

      <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)]">
        <div className="p-6 border-b border-[var(--color-border)]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--color-textSecondary)]" />
            <input
              type="text"
              placeholder="Search users by name or username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="divide-y divide-[var(--color-border)]">
          {departments.map((department) => (
            <div key={department.id} className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-[var(--color-primary)]-100 shrink-0">
                  <Building className="w-6 h-6 text-[var(--color-primary)]-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-[var(--color-text)]">{department.name}</h3>
                      <p className="text-sm text-[var(--color-textSecondary)]">{department.category || 'Uncategorized'}</p>
                    </div>
                    <button
                      onClick={() => handleSave(department.id)}
                      className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                    >
                      Save
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-[var(--color-textSecondary)]" />
                    <select
                      value={allocations[department.id] || ''}
                      onChange={(e) => handleAllocationChange(department.id, e.target.value)}
                      className="flex-1 max-w-md px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]-500 focus:border-transparent"
                    >
                      <option value="">No Department Head</option>
                      {filteredUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.first_name} {user.last_name} ({user.username})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {departments.length === 0 && (
          <div className="p-12 text-center">
            <Building className="w-12 h-12 text-[var(--color-textSecondary)] mx-auto mb-4" />
            <p className="text-[var(--color-textSecondary)]">No departments found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DepartmentHeadAllocation;
