import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Users, Search, Filter, Mail, Phone, Calendar, MapPin, Download, Eye, Edit, Shield, UserCheck, UserX, ChevronDown, Building, Clock, FileText, TrendingUp, ChevronRight } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { FullPageLoading, InlineLoading } from '../../components/common/Loading'
import { MembersEmptyState, SearchEmptyState } from '../../components/common/EmptyState'
import Breadcrumb from '../../components/common/Breadcrumb'
import TabNavigation from '../../components/common/TabNavigation'
import ProtectedComponent from '../../components/common/ProtectedComponent'
import PermissionButton from '../../components/common/PermissionButton'
import { PermissionBadge } from '../../components/common/ProtectedComponent'
import { ROLES, ADMIN_ROLES } from '../../constants/roles'
import { PERMISSIONS } from '../../constants/permissions'
import { API_ENDPOINTS } from '../../constants/api'

const MemberDirectory = () => {
  const { user, api } = useAuth()
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('q') || '')
  const [filterRole, setFilterRole] = useState('all')
  const [filterDepartment, setFilterDepartment] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortBy, setSortBy] = useState('name')
  const [selectedMember, setSelectedMember] = useState(null)
  const [showExportModal, setShowExportModal] = useState(false)

  const roles = [
    { value: 'Super Admin', label: 'Super Admin', color: 'bg-red-100 text-red-800' },
    { value: 'Pastor', label: 'Pastor', color: 'bg-purple-100 text-purple-800' },
    { value: 'First Elder', label: 'First Elder', color: 'bg-[var(--color-primary)]-100 text-[var(--color-primary)]-800' },
    { value: 'Department Head', label: 'Department Head', color: 'bg-green-100 text-green-800' },
    { value: 'Member', label: 'Member', color: 'bg-[var(--color-surface)] text-[var(--color-text)]' }
  ]

  const departments = [
    { value: 'sabbath-school', label: 'Sabbath School' },
    { value: 'youth-ministry', label: 'Youth Ministry' },
    { value: 'music-ministry', label: 'Music Ministry' },
    { value: 'womens-ministry', label: 'Women\'s Ministry' },
    { value: 'mens-ministry', label: 'Men\'s Ministry' },
    { value: 'children-ministry', label: 'Children\'s Ministry' },
    { value: 'outreach', label: 'Outreach & Evangelism' },
    { value: 'health', label: 'Health & Temperance' },
    { value: 'stewardship', label: 'Stewardship' },
    { value: 'communication', label: 'Communication' },
    { value: 'prayer-ministry', label: 'Prayer Ministry' },
    { value: 'family-life', label: 'Family Life' }
  ]

  const memberTabs = [
    { id: 'all', label: 'All Members', icon: Users, count: members.length },
    { id: 'active', label: 'Active', icon: UserCheck, count: members.filter(m => m.is_active).length },
    { id: 'inactive', label: 'Inactive', icon: UserX, count: members.filter(m => !m.is_active).length },
    { id: 'groups', label: 'Groups/Categories', icon: Building, count: departments.length },
    { id: 'reports', label: 'Reports', icon: FileText, count: 0 }
  ]

  useEffect(() => {
    setSearchTerm(searchParams.get('q') || '')
  }, [searchParams])

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setLoading(true)
        const response = await api.get('/users/directory')
        setMembers(response.data.users || [])
      } catch (error) {
        console.error('Error fetching members:', error)
        toast.error('Failed to load members. Please try again.')
        setMembers([])
      } finally {
        setLoading(false)
      }
    }

    fetchMembers()
  }, [])

  const filteredMembers = members.filter(member => {
    const matchesSearch = member.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.phone_number?.includes(searchTerm)

    const matchesRole = filterRole === 'all' || member.role === filterRole
    const matchesDepartment = filterDepartment === 'all' || member.department === filterDepartment
    const matchesStatus = filterStatus === 'all' ||
                          (filterStatus === 'active' && member.is_active) ||
                          (filterStatus === 'inactive' && !member.is_active)

    // Tab-based filtering
    let matchesTab = true
    if (activeTab === 'active') {
      matchesTab = member.is_active
    } else if (activeTab === 'inactive') {
      matchesTab = !member.is_active
    } else if (activeTab === 'groups') {
      // Show departments/groups view instead of members
      matchesTab = false
    } else if (activeTab === 'reports') {
      // Show reports view instead of members
      matchesTab = false
    }

    return matchesSearch && matchesRole && matchesDepartment && matchesStatus && matchesTab
  }).sort((a, b) => {
    if (sortBy === 'name') {
      return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
    } else if (sortBy === 'role') {
      return (a.role || '').localeCompare(b.role || '');
    } else if (sortBy === 'department') {
      return (a.department || '').localeCompare(b.department || '');
    } else if (sortBy === 'joined') {
      return new Date(b.joined_date) - new Date(a.joined_date);
    } else if (sortBy === 'status') {
      return (b.is_active ? 1 : 0) - (a.is_active ? 1 : 0);
    }
    return 0;
  })

  const getRoleColor = (role) => {
    const roleConfig = roles.find(r => r.value === role)
    return roleConfig?.color || 'bg-[var(--color-surface)] text-[var(--color-text)]'
  }

  const handleExport = (format) => {
    // Export functionality
    const csvContent = [
      ['First Name', 'Last Name', 'Email', 'Phone', 'Role', 'Department', 'Status', 'Joined Date'],
      ...filteredMembers.map(member => [
        member.first_name,
        member.last_name,
        member.email,
        member.phone_number || '',
        member.role,
        member.department || '',
        member.is_active ? 'Active' : 'Inactive',
        member.joined_date
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `member-directory-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    setShowExportModal(false)
  }

  if (loading) {
    return <FullPageLoading message="Loading members..." />
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Member Directory</h1>
          <p className="page-subtitle">Find and manage church members</p>
          <div className="mt-2 flex gap-2">
            <PermissionBadge permission={PERMISSIONS.MEMBERS_VIEW} />
            <PermissionBadge permission={PERMISSIONS.MEMBERS_EDIT} />
            <PermissionBadge permission={PERMISSIONS.MEMBERS_DELETE} />
          </div>
        </div>
        <PermissionButton
          permission={PERMISSIONS.MEMBERS_EXPORT}
          buttonProps={{
            className: "flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors",
          }}
          onClick={() => setShowExportModal(true)}
        >
          <Download className="w-4 h-4" />
          Export
        </PermissionButton>
      </div>

      {/* Tab Navigation */}
      <TabNavigation 
        tabs={memberTabs} 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        persistKey="member-directory-tab"
      />

      {/* Tab Content */}
      {activeTab === 'groups' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((dept) => (
              <div key={dept.value} className="bg-[var(--color-surface)]  p-6 rounded-lg border border-[var(--color-border)] ">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-[var(--color-primary)]-100  rounded-lg">
                    <Building className="h-6 w-6 text-[var(--color-primary)]-600 " />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--color-text)] ">{dept.label}</h3>
                    <p className="text-sm text-[var(--color-textSecondary)] ">
                      {members.filter(m => m.department === dept.value).length} members
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: 'Membership Growth', icon: TrendingUp, link: '/reports/membership-growth' },
              { title: 'Department Distribution', icon: Building, link: '/reports/department-distribution' },
              { title: 'Attendance Reports', icon: Calendar, link: '/reports/attendance' },
              { title: 'Member Engagement', icon: Users, link: '/reports/engagement' }
            ].map((report, index) => (
              <div key={index} className="bg-[var(--color-surface)]  p-6 rounded-lg border border-[var(--color-border)]  hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-100  rounded-lg">
                    <report.icon className="h-6 w-6 text-purple-600 " />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-[var(--color-text)] ">{report.title}</h3>
                    <p className="text-sm text-[var(--color-textSecondary)] ">View report</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-[var(--color-textSecondary)]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab !== 'groups' && activeTab !== 'reports' && (
        <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-[var(--color-surface)]  p-6 rounded-lg shadow-sm border border-[var(--color-border)] ">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-textSecondary)] ">Total Members</p>
              <p className="text-2xl font-bold text-[var(--color-text)] ">{members.length}</p>
            </div>
            <div className="p-3 bg-[var(--color-primary)]-100  rounded-lg">
              <Users className="h-6 w-6 text-[var(--color-primary)]-600 " />
            </div>
          </div>
        </div>

        <div className="bg-[var(--color-surface)]  p-6 rounded-lg shadow-sm border border-[var(--color-border)] ">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-textSecondary)] ">Active Members</p>
              <p className="text-2xl font-bold text-[var(--color-text)] ">
                {members.filter(m => m.is_active).length}
              </p>
            </div>
            <div className="p-3 bg-green-100  rounded-lg">
              <UserCheck className="h-6 w-6 text-green-600 " />
            </div>
          </div>
        </div>

        <div className="bg-[var(--color-surface)]  p-6 rounded-lg shadow-sm border border-[var(--color-border)] ">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-textSecondary)] ">Inactive Members</p>
              <p className="text-2xl font-bold text-[var(--color-text)] ">
                {members.filter(m => !m.is_active).length}
              </p>
            </div>
            <div className="p-3 bg-red-100  rounded-lg">
              <UserX className="h-6 w-6 text-red-600 " />
            </div>
          </div>
        </div>

        <div className="bg-[var(--color-surface)]  p-6 rounded-lg shadow-sm border border-[var(--color-border)] ">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-textSecondary)] ">Department Heads</p>
              <p className="text-2xl font-bold text-[var(--color-text)] ">
                {members.filter(m => m.role === 'Department Head').length}
              </p>
            </div>
            <div className="p-3 bg-purple-100  rounded-lg">
              <Shield className="h-6 w-6 text-purple-600 " />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-[var(--color-surface)]  rounded-lg shadow-sm border border-[var(--color-border)]  p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-textSecondary)] w-4 h-4" />
              <input
                type="text"
                placeholder="Search members by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="px-4 py-2 border border-[var(--color-border)]  rounded-lg bg-[var(--color-surface)]  text-[var(--color-text)]  focus:ring-2 focus:ring-[var(--color-primary)]-500 focus:border-transparent"
          >
            <option value="all">All Departments</option>
            {departments.map(dept => (
              <option key={dept.value} value={dept.value}>{dept.label}</option>
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
            <option value="role">Sort by Role</option>
            <option value="department">Sort by Department</option>
            <option value="joined">Sort by Joined Date</option>
            <option value="status">Sort by Status</option>
          </select>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-[var(--color-surface)]  rounded-lg shadow-sm border border-[var(--color-border)]  overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--color-background)] ">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)]  uppercase tracking-wider">
                  Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)]  uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)]  uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)]  uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)]  uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)]  uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-[var(--color-surface)]  divide-y divide-[var(--color-border)] ">
              {filteredMembers.length > 0 ? (
                filteredMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-[var(--color-background)] ">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-[var(--color-primary)]-100 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-[var(--color-primary)]-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-[var(--color-text)] ">
                            {member.first_name} {member.last_name}
                          </div>
                          <div className="text-sm text-[var(--color-textSecondary)] ">
                            Joined {new Date(member.joined_date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-[var(--color-text)] ">
                        <div className="flex items-center gap-1 mb-1">
                          <Mail className="w-3 h-3 text-[var(--color-textSecondary)]" />
                          {member.email}
                      </div>
                      <ProtectedComponent permission={PERMISSIONS.MEMBERS_VIEW}>
                        {member.phone_number && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-[var(--color-textSecondary)]" />
                            {member.phone_number}
                          </div>
                        )}
                      </ProtectedComponent>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(member.role)}`}>
                      {member.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <Building className="w-3 h-3 text-[var(--color-textSecondary)]" />
                      <span className="text-sm text-[var(--color-text)] ">
                        {member.department || 'Not assigned'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      member.is_active 
                        ? 'bg-green-100 text-green-800 '
                        : 'bg-red-100 text-red-800 '
                    }`}>
                      {member.is_active ? (
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedMember(member)}
                        className="text-[var(--color-primary)]-600 hover:text-[var(--color-primary)]-900"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <PermissionButton
                        permission={PERMISSIONS.MEMBERS_EDIT}
                        buttonProps={{
                          className: "text-[var(--color-primary)]-600 hover:text-[var(--color-primary)]-900",
                        }}
                        onClick={() => {/* Edit functionality */}}
                      >
                        <Edit className="w-4 h-4" />
                      </PermissionButton>
                    </div>
                  </td>
                </tr>
              ))
              ) : (
                <tr>
                  <td colSpan="6">
                    {searchTerm || filterRole !== 'all' || filterDepartment !== 'all' || filterStatus !== 'all' ? (
                      <SearchEmptyState searchTerm={searchTerm} />
                    ) : (
                      <MembersEmptyState />
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface)]  rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[var(--color-text)] ">Export Member Directory</h3>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-[var(--color-textSecondary)] hover:text-[var(--color-textSecondary)]"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-[var(--color-textSecondary)]  mb-2">
                  Choose export format:
                </p>
                <div className="space-y-2">
                  <button
                    onClick={() => handleExport('csv')}
                    className="w-full px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors text-left"
                  >
                    Export as CSV
                  </button>
                  <button
                    onClick={() => setShowExportModal(false)}
                    className="w-full px-4 py-2 bg-[var(--color-surface)] text-[var(--color-text)] rounded-lg hover:bg-[var(--color-surface)] transition-colors text-left"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Member Details Modal */}
      {selectedMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface)]  rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[var(--color-text)] ">Member Details</h3>
              <button
                onClick={() => setSelectedMember(null)}
                className="text-[var(--color-textSecondary)] hover:text-[var(--color-textSecondary)]"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-[var(--color-primary)]-100 rounded-full flex items-center justify-center">
                  <Users className="w-8 h-8 text-[var(--color-primary)]-600" />
                </div>
                <div>
                  <h4 className="text-lg font-medium text-[var(--color-text)] ">
                    {selectedMember.first_name} {selectedMember.last_name}
                  </h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(selectedMember.role)}`}>
                    {selectedMember.role}
                  </span>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-[var(--color-textSecondary)]" />
                  <span className="text-sm text-[var(--color-text)] ">{selectedMember.email}</span>
                </div>
                
                {selectedMember.phone_number && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-[var(--color-textSecondary)]" />
                    <span className="text-sm text-[var(--color-text)] ">{selectedMember.phone_number}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-3">
                  <Building className="w-4 h-4 text-[var(--color-textSecondary)]" />
                  <span className="text-sm text-[var(--color-text)] ">
                    {selectedMember.department || 'Not assigned'}
                  </span>
                </div>
                
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-[var(--color-textSecondary)]" />
                  <span className="text-sm text-[var(--color-text)] ">
                    Joined {new Date(selectedMember.joined_date).toLocaleDateString()}
                  </span>
                </div>
                
                {selectedMember.address && (
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-[var(--color-textSecondary)]" />
                    <span className="text-sm text-[var(--color-text)] ">{selectedMember.address}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-3">
                  <Shield className="w-4 h-4 text-[var(--color-textSecondary)]" />
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    selectedMember.is_active 
                      ? 'bg-green-100 text-green-800 '
                      : 'bg-red-100 text-red-800 '
                  }`}>
                    {selectedMember.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MemberDirectory
