import { useState, useEffect } from 'react';
import { useMembers } from '../../contexts/MembersContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Filter, UserCog, Users as UsersIcon, Crown, Shield, UserCheck, UserPlus, Mail, Phone, Calendar, User, UserX, ChevronDown, Eye, EyeOff } from 'lucide-react';
import SettingsTabs from '../../components/settings/SettingsTabs';

function MembersList() {
  const { members, loading, fetchMembers, deleteMember, fetchStats, stats } = useMembers();
  const { user, api } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [activeTab, setActiveTab] = useState('members');
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    password: '',
    roles: [],
    is_active: true
  });

  const tabs = [
    { id: 'users', label: 'Users', icon: UserCog },
    { id: 'members', label: 'Church Members', icon: UsersIcon },
    { id: 'department-heads', label: 'Department Heads', icon: Crown },
    { id: 'staff', label: 'Staff', icon: Shield },
    { id: 'volunteers', label: 'Volunteers', icon: UserCheck },
    { id: 'visitors', label: 'Visitors', icon: UserPlus },
  ];

  useEffect(() => {
    fetchMembers();
    fetchStats();
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

  const handleSearch = () => {
    fetchMembers({ search: searchTerm, status: statusFilter });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this member?')) {
      try {
        await deleteMember(id);
        toast.success('Member deleted successfully');
      } catch (error) {
        toast.error(error.error || 'Failed to delete member');
      }
    }
  };

  // User management functions
  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      const response = await api.get('/users');
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  };

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, formData);
        toast.success('User updated successfully');
      } else {
        await api.post('/auth/register', formData);
        toast.success('User created successfully');
      }
      setFormData({
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        phone: '',
        password: '',
        roles: [],
        is_active: true
      });
      setShowCreateForm(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      console.error('Failed to save user:', error);
      toast.error(editingUser ? 'Failed to update user' : 'Failed to create user');
    }
  };

  const handleUserEdit = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone,
      password: '',
      roles: user.roles || [],
      is_active: user.is_active
    });
    setShowCreateForm(true);
  };

  const handleUserDelete = async (userId) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/users/${userId}`);
      setUsers(users.filter(u => u.id !== userId));
      toast.success('User deleted successfully');
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      await api.put(`/users/${userId}`, { is_active: !currentStatus });
      setUsers(users.map(u => u.id === userId ? { ...u, is_active: !currentStatus } : u));
      toast.success(!currentStatus ? 'User activated' : 'User deactivated');
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast.error('Failed to update user status');
    }
  };

  const handleRoleToggle = (role) => {
    setFormData(prev => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter(r => r !== role)
        : [...prev.roles, role]
    }));
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = (user.first_name || '').toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                         (user.last_name || '').toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                         (user.email || '').toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                         (user.username || '').toLowerCase().includes(userSearchTerm.toLowerCase());

    const matchesRole = filterRole === 'all' || user.roles?.includes(filterRole);
    const matchesStatus = filterStatus === 'all' ||
                          (filterStatus === 'active' && user.is_active) ||
                          (filterStatus === 'inactive' && !user.is_active);

    return matchesSearch && matchesRole && matchesStatus;
  }).sort((a, b) => {
    if (sortBy === 'name') {
      return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
    } else if (sortBy === 'email') {
      return a.email.localeCompare(b.email);
    } else if (sortBy === 'joined') {
      return new Date(b.created_at) - new Date(a.created_at);
    } else if (sortBy === 'status') {
      return (b.is_active ? 1 : 0) - (a.is_active ? 1 : 0);
    }
    return 0;
  });

  const roles = [
    { value: 'Super Admin', label: 'Super Admin', color: 'bg-red-100 text-red-800' },
    { value: 'Pastor', label: 'Pastor', color: 'bg-purple-100 text-purple-800' },
    { value: 'First Elder', label: 'First Elder', color: 'bg-[var(--color-primary)]-100 text-[var(--color-primary)]-800' },
    { value: 'Department Head', label: 'Department Head', color: 'bg-green-100 text-green-800' },
    { value: 'Member', label: 'Member', color: 'bg-[var(--color-surface)] text-[var(--color-text)]' }
  ];

  const getRoleColor = (role) => {
    const roleConfig = roles.find(r => r.value === role);
    return roleConfig?.color || 'bg-[var(--color-surface)] text-[var(--color-text)]';
  };

  const canManageUsers = user?.roles?.some(role => 
    ['Super Admin', 'Pastor', 'First Elder'].includes(role)
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'users':
        return (
          <UserManagementTab 
            users={users}
            usersLoading={usersLoading}
            userSearchTerm={userSearchTerm}
            setUserSearchTerm={setUserSearchTerm}
            filterRole={filterRole}
            setFilterRole={setFilterRole}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            sortBy={sortBy}
            setSortBy={setSortBy}
            showCreateForm={showCreateForm}
            setShowCreateForm={setShowCreateForm}
            editingUser={editingUser}
            setEditingUser={setEditingUser}
            formData={formData}
            setFormData={setFormData}
            handleUserSubmit={handleUserSubmit}
            handleUserEdit={handleUserEdit}
            handleUserDelete={handleUserDelete}
            handleToggleStatus={handleToggleStatus}
            handleRoleToggle={handleRoleToggle}
            filteredUsers={filteredUsers}
            getRoleColor={getRoleColor}
            canManageUsers={canManageUsers}
            roles={roles}
          />
        );
      case 'department-heads':
        return (
          <div className="space-y-6">
            <div className="bg-[var(--color-surface)]  rounded-lg shadow p-6 transition-colors">
              <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">Department Heads</h3>
              <p className="text-sm text-[var(--color-textSecondary)] ">Manage department leadership and assignments.</p>
            </div>
          </div>
        );
      case 'staff':
        return (
          <div className="space-y-6">
            <div className="bg-[var(--color-surface)]  rounded-lg shadow p-6 transition-colors">
              <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">Staff Members</h3>
              <p className="text-sm text-[var(--color-textSecondary)] ">Manage church staff and their roles.</p>
            </div>
          </div>
        );
      case 'volunteers':
        return (
          <div className="space-y-6">
            <div className="bg-[var(--color-surface)]  rounded-lg shadow p-6 transition-colors">
              <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">Volunteers</h3>
              <p className="text-sm text-[var(--color-textSecondary)] ">Manage volunteer assignments and schedules.</p>
            </div>
          </div>
        );
      case 'visitors':
        return (
          <div className="space-y-6">
            <div className="bg-[var(--color-surface)]  rounded-lg shadow p-6 transition-colors">
              <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">Visitors</h3>
              <p className="text-sm text-[var(--color-textSecondary)] ">Track and manage visitor information.</p>
            </div>
          </div>
        );
      case 'members':
      default:
        return (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[var(--color-surface)]  rounded-lg shadow p-6 transition-colors">
                <p className="text-sm text-[var(--color-textSecondary)] ">Total Members</p>
                <p className="text-3xl font-bold text-[var(--color-text)]  mt-1">{stats?.total || 0}</p>
              </div>
              <div className="bg-[var(--color-surface)]  rounded-lg shadow p-6 transition-colors">
                <p className="text-sm text-[var(--color-textSecondary)] ">Active Members</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{stats?.active || 0}</p>
              </div>
              <div className="bg-[var(--color-surface)]  rounded-lg shadow p-6 transition-colors">
                <p className="text-sm text-[var(--color-textSecondary)] ">New (30 days)</p>
                <p className="text-3xl font-bold text-primary mt-1">{stats?.new || 0}</p>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-[var(--color-surface)]  rounded-lg shadow p-4 transition-colors">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[var(--color-textSecondary)]" />
                  <input
                    type="text"
                    placeholder="Search members..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-[var(--color-border)]  rounded-lg focus:outline-none focus:ring-2 focus:ring-primary w-full bg-[var(--color-surface)]  text-[var(--color-text)] placeholder-[var(--color-textSecondary)]"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-[var(--color-border)]  rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-[var(--color-surface)]  text-[var(--color-text)]"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="visitor">Visitor</option>
                </select>
                <button
                  onClick={handleSearch}
                  className="flex items-center px-4 py-2 bg-[var(--color-surface)]  text-[var(--color-text)] rounded-lg hover:bg-[var(--color-surface)] transition-colors"
                >
                  <Filter className="h-5 w-5 mr-2" />
                  Filter
                </button>
              </div>
            </div>

            {/* Members Table */}
            <div className="bg-[var(--color-surface)]  rounded-lg shadow overflow-hidden transition-colors">
              <table className="min-w-full divide-y divide-[var(--color-border)] ">
                <thead className="bg-[var(--color-background)]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)]  uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)]  uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)]  uppercase tracking-wider">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)]  uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)]  uppercase tracking-wider">Joined</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-[var(--color-textSecondary)]  uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-[var(--color-surface)]  divide-y divide-[var(--color-border)] ">
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-4 text-center text-[var(--color-textSecondary)] ">Loading...</td>
                    </tr>
                  ) : members.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-4 text-center text-[var(--color-textSecondary)] ">No members found</td>
                    </tr>
                  ) : (
                    members.map((member) => (
                      <tr key={member.id} className="hover:bg-[var(--color-background)]  transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-[var(--color-text)] ">{member.first_name} {member.last_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-[var(--color-textSecondary)] ">{member.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-[var(--color-textSecondary)] ">{member.phone}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            member.membership_status === 'active' ? 'bg-green-100 text-green-800' : 'bg-[var(--color-surface)] text-[var(--color-text)]'
                          }`}>
                            {member.membership_status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-textSecondary)] ">
                          {new Date(member.joined_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => navigate(`/dashboard/members/${member.id}/edit`)}
                            className="text-primary hover:text-primary-600 mr-3"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(member.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)] ">Members</h1>
          <p className="text-[var(--color-textSecondary)] ">Manage church members and people</p>
        </div>
        {activeTab === 'members' && (
          <button
            onClick={() => navigate('/dashboard/members/new')}
            className="flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Member
          </button>
        )}
      </div>

      {/* Tabs */}
      <SettingsTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} persistKey="members-active-tab" />

      {/* Tab Content */}
      <div className="mt-6">
        {renderTabContent()}
      </div>
    </div>
  );
}

// User Management Tab Component
function UserManagementTab({
  users,
  usersLoading,
  userSearchTerm,
  setUserSearchTerm,
  filterRole,
  setFilterRole,
  filterStatus,
  setFilterStatus,
  sortBy,
  setSortBy,
  showCreateForm,
  setShowCreateForm,
  editingUser,
  setEditingUser,
  formData,
  setFormData,
  handleUserSubmit,
  handleUserEdit,
  handleUserDelete,
  handleToggleStatus,
  handleRoleToggle,
  filteredUsers,
  getRoleColor,
  canManageUsers,
  roles
}) {
  const [showPassword, setShowPassword] = useState(false);

  if (usersLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[var(--color-text)] ">System Users</h3>
          <p className="text-sm text-[var(--color-textSecondary)] ">Manage system user accounts and permissions.</p>
        </div>
        {canManageUsers && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add User
          </button>
        )}
      </div>

      {/* Create/Edit User Form */}
      {showCreateForm && (
        <div className="bg-[var(--color-surface)]  rounded-lg shadow-sm border border-[var(--color-border)]  p-6">
          <h3 className="text-lg font-semibold text-[var(--color-text)]  mb-4">
            {editingUser ? 'Edit User' : 'Create New User'}
          </h3>
          
          <form onSubmit={handleUserSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)]  mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                  className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg bg-[var(--color-surface)]  text-[var(--color-text)]  focus:ring-2 focus:ring-[var(--color-primary)]-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)]  mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                  className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg bg-[var(--color-surface)]  text-[var(--color-text)]  focus:ring-2 focus:ring-[var(--color-primary)]-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)]  mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg bg-[var(--color-surface)]  text-[var(--color-text)]  focus:ring-2 focus:ring-[var(--color-primary)]-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)]  mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg bg-[var(--color-surface)]  text-[var(--color-text)]  focus:ring-2 focus:ring-[var(--color-primary)]-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)]  mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg bg-[var(--color-surface)]  text-[var(--color-text)]  focus:ring-2 focus:ring-[var(--color-primary)]-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)]  mb-2">
                  Password {!editingUser && <span className="text-red-500">*</span>}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg bg-[var(--color-surface)]  text-[var(--color-text)]  focus:ring-2 focus:ring-[var(--color-primary)]-500 focus:border-transparent pr-10"
                    required={!editingUser}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--color-textSecondary)] hover:text-[var(--color-textSecondary)]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text)]  mb-2">
                Roles
              </label>
              <div className="flex flex-wrap gap-2">
                {roles.map(role => (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => handleRoleToggle(role.value)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      formData.roles.includes(role.value)
                        ? role.color
                        : 'bg-[var(--color-surface)] text-[var(--color-textSecondary)] hover:bg-[var(--color-surface)]'
                    }`}
                  >
                    {role.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                className="w-4 h-4 text-[var(--color-primary)]-600 border-[var(--color-border)] rounded focus:ring-[var(--color-primary)]-500"
              />
              <label htmlFor="is_active" className="ml-2 text-sm text-[var(--color-text)] ">
                User is active
              </label>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors"
              >
                {editingUser ? 'Update User' : 'Create User'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false)
                  setEditingUser(null)
                  setFormData({
                    username: '',
                    email: '',
                    first_name: '',
                    last_name: '',
                    phone: '',
                    password: '',
                    roles: [],
                    is_active: true
                  })
                }}
                className="px-4 py-2 bg-[var(--color-surface)] text-[var(--color-text)] rounded-lg hover:bg-[var(--color-surface)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-[var(--color-surface)]  rounded-lg shadow-sm border border-[var(--color-border)]  p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-textSecondary)] w-4 h-4" />
              <input
                type="text"
                placeholder="Search users..."
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[var(--color-border)]  rounded-lg bg-[var(--color-surface)]  text-[var(--color-text)]  focus:ring-2 focus:ring-[var(--color-primary)]-500 focus:border-transparent"
              />
            </div>
          </div>

          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-4 py-2 border border-[var(--color-border)]  rounded-lg bg-[var(--color-surface)]  text-[var(--color-text)]  focus:ring-2 focus:ring-[var(--color-primary)]-500 focus:border-transparent"
          >
            <option value="all">All Roles</option>
            {roles.map(role => (
              <option key={role.value} value={role.value}>{role.label}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-[var(--color-border)]  rounded-lg bg-[var(--color-surface)]  text-[var(--color-text)]  focus:ring-2 focus:ring-[var(--color-primary)]-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 border border-[var(--color-border)]  rounded-lg bg-[var(--color-surface)]  text-[var(--color-text)]  focus:ring-2 focus:ring-[var(--color-primary)]-500 focus:border-transparent"
          >
            <option value="name">Sort by Name</option>
            <option value="email">Sort by Email</option>
            <option value="joined">Sort by Joined Date</option>
            <option value="status">Sort by Status</option>
          </select>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-[var(--color-surface)]  rounded-lg shadow-sm border border-[var(--color-border)]  overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--color-background)] ">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)]  uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)]  uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)]  uppercase tracking-wider">
                  Roles
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)]  uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)]  uppercase tracking-wider">
                  Joined
                </th>
                {canManageUsers && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)]  uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-[var(--color-surface)]  divide-y divide-[var(--color-border)] ">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-[var(--color-background)] ">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-[var(--color-primary)]-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-[var(--color-primary)]-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-[var(--color-text)] ">
                          {user.first_name} {user.last_name}
                        </div>
                        <div className="text-sm text-[var(--color-textSecondary)] ">
                          @{user.username}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-[var(--color-text)] ">
                      <div className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-[var(--color-textSecondary)]" />
                        {user.email}
                      </div>
                      {user.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-[var(--color-textSecondary)]" />
                          {user.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {user.roles?.map(role => (
                        <span key={role} className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(role)}`}>
                          {role}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.is_active 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.is_active ? (
                        <>
                          <UserCheck className="w-3 h-3 mr-1" />
                          Active
                        </>
                      ) : (
                        <>
                          <UserX className="w-3 h-3 mr-1" />
                          Inactive
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-textSecondary)] ">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  {canManageUsers && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUserEdit(user)}
                          className="text-[var(--color-primary)]-600 hover:text-[var(--color-primary)]-700"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(user.id, user.is_active)}
                          className="text-yellow-600 hover:text-yellow-700"
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleUserDelete(user.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default MembersList;
