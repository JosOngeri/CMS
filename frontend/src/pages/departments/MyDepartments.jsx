import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Building, ChevronRight, Users, Shield, Plus, X, CheckSquare, Square, Check } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { FullPageLoading } from '../../components/common/Loading'
import { DepartmentsEmptyState } from '../../components/common/EmptyState'
import { API_ENDPOINTS } from '../../constants/api'

const MyDepartments = () => {
  const { api, user } = useAuth()
  const toast = useToast()
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [availableDepartments, setAvailableDepartments] = useState([])
  const [selectedDepartments, setSelectedDepartments] = useState([])
  const [joinLoading, setJoinLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(API_ENDPOINTS.DEPARTMENTS.USER_DEPARTMENTS)
        setDepartments(Array.isArray(res.data.data) ? res.data.data : [])
      } catch (e) {
        console.error(e)
        toast.error(e.response?.data?.error || e.message || 'Failed to load departments')
        setDepartments([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const loadAvailableDepartments = async () => {
    try {
      const res = await api.get(API_ENDPOINTS.DEPARTMENTS.DEPARTMENT.AVAILABLE)
      setAvailableDepartments(Array.isArray(res.data.data) ? res.data.data : [])
    } catch (e) {
      console.error(e)
      toast.error(e.response?.data?.error || e.message || 'Failed to load available departments')
      setAvailableDepartments([])
    }
  }

  const handleJoinDepartments = async () => {
    if (selectedDepartments.length === 0) {
      toast.error('Please select at least one department to join')
      return
    }

    try {
      setJoinLoading(true)
      const res = await api.post(API_ENDPOINTS.DEPARTMENTS.DEPARTMENT.JOIN, {
        department_ids: selectedDepartments,
      })
      toast.success(res.data.message || 'Successfully joined departments')
      setShowJoinModal(false)
      setSelectedDepartments([])
      // Reload departments
      const reload = await api.get(API_ENDPOINTS.DEPARTMENTS.USER_DEPARTMENTS)
      setDepartments(Array.isArray(reload.data.data) ? reload.data.data : [])
    } catch (e) {
      console.error(e)
      toast.error(e.response?.data?.error || e.message || 'Failed to join departments')
    } finally {
      setJoinLoading(false)
    }
  }

  const handleOpenJoinModal = () => {
    loadAvailableDepartments()
    setShowJoinModal(true)
  }

  const handleToggleDepartment = (departmentId) => {
    setSelectedDepartments(prev => {
      if (prev.includes(departmentId)) {
        return prev.filter(id => id !== departmentId)
      } else {
        return [...prev, departmentId]
      }
    })
  }

  const handleSelectAll = () => {
    const allDepartmentIds = availableDepartments.map(dept => dept.id)
    setSelectedDepartments(allDepartmentIds)
  }

  const handleDeselectAll = () => {
    setSelectedDepartments([])
  }

  const isAdmin = user?.roles?.includes('Super Admin') || user?.roles?.includes('Admin')

  if (loading) {
    return <FullPageLoading message="Loading your departments..." />
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">My departments</h1>
          <p className="text-[var(--color-textSecondary)] mt-1">
            Departments you belong to. Open a department hub for communications, meetings, and tasks.
          </p>
        </div>
        <button
          onClick={handleOpenJoinModal}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Join Departments
        </button>
      </div>

      {departments.length === 0 ? (
        <DepartmentsEmptyState />
      ) : (
        <ul className="space-y-3">
          {departments.map((d) => (
            <li key={d.id}>
              <Link
                to={`/dashboard/departments/${d.slug || d.id}`}
                className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 hover:border-[var(--color-primary)]-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-[var(--color-primary)]-100 shrink-0">
                    <Building className="w-6 h-6 text-[var(--color-primary)]-600" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-semibold text-[var(--color-text)] truncate">{d.name}</h2>
                    {d.description && (
                      <p className="text-sm text-[var(--color-textSecondary)] line-clamp-2 mt-0.5">{d.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {d.category && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-surface)] text-[var(--color-text)]">
                          {d.category}
                        </span>
                      )}
                      {d.role && (
                        <span className="text-xs inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--color-primary)]-50 text-[var(--color-primary)]-800">
                          <Shield className="w-3 h-3" />
                          {d.role}
                        </span>
                      )}
                      {d.status && (
                        <span className={`text-xs inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${
                          d.status === 'approved' 
                            ? 'bg-green-50 text-green-800'
                            : d.status === 'pending'
                            ? 'bg-yellow-50 text-yellow-800'
                            : 'bg-red-50 text-red-800'
                        }`}>
                          {d.status === 'approved' && '✓ Approved'}
                          {d.status === 'pending' && '⏳ Pending Approval'}
                          {d.status === 'rejected' && '✗ Rejected'}
                        </span>
                      )}
                      {d.can_manage && (
                        <span className="text-xs text-amber-700">Can manage</span>
                      )}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-[var(--color-textSecondary)] shrink-0 ml-2" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {departments.length > 0 && (
        <p className="text-sm text-[var(--color-textSecondary)]">
          <Users className="w-4 h-4 inline mr-1 align-text-bottom" />
          Need the full church directory?{' '}
          <Link to="/dashboard/departments" className="text-[var(--color-primary)]-600 hover:underline">
            All departments
          </Link>
        </p>
      )}

      {/* Join Departments Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--color-surface)] rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
              <h2 className="text-xl font-semibold text-[var(--color-text)]">Join Departments</h2>
              <button
                onClick={() => {
                  setShowJoinModal(false)
                  setSelectedDepartments([])
                }}
                className="text-[var(--color-textSecondary)] hover:text-[var(--color-text)]"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-96">
              {availableDepartments.length === 0 ? (
                <p className="text-[var(--color-textSecondary)] text-center py-8">
                  No departments available to join
                </p>
              ) : (
                <div className="space-y-3">
                  {availableDepartments.map((dept) => (
                    <div
                      key={dept.id}
                      onClick={() => handleToggleDepartment(dept.id)}
                      className="flex items-center gap-3 p-4 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] cursor-pointer transition-colors"
                    >
                      <button
                        type="button"
                        className="shrink-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggleDepartment(dept.id)
                        }}
                      >
                        {selectedDepartments.includes(dept.id) ? (
                          <CheckSquare className="w-5 h-5 text-[var(--color-primary)]-600" />
                        ) : (
                          <Square className="w-5 h-5 text-[var(--color-textSecondary)]" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-[var(--color-text)] truncate">{dept.name}</h3>
                        {dept.description && (
                          <p className="text-sm text-[var(--color-textSecondary)] line-clamp-2">{dept.description}</p>
                        )}
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-surface)] text-[var(--color-text)] mt-2 inline-block">
                          {dept.category}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between p-6 border-t border-[var(--color-border)]">
              <div className="flex items-center gap-4">
                <span className="text-sm text-[var(--color-textSecondary)]">
                  {selectedDepartments.length} {selectedDepartments.length === 1 ? 'department' : 'departments'} selected
                </span>
                {isAdmin && selectedDepartments.length > 0 && (
                  <button
                    onClick={selectedDepartments.length === availableDepartments.length ? handleDeselectAll : handleSelectAll}
                    className="text-sm text-[var(--color-primary)]-600 hover:text-[var(--color-primary)]-700 font-medium flex items-center gap-1"
                  >
                    {selectedDepartments.length === availableDepartments.length ? (
                      <>
                        <X className="w-4 h-4" />
                        Deselect All
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Select All
                      </>
                    )}
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowJoinModal(false)
                    setSelectedDepartments([])
                  }}
                  className="px-4 py-2 text-[var(--color-text)] hover:bg-[var(--color-surface)] rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleJoinDepartments}
                  disabled={selectedDepartments.length === 0 || joinLoading}
                  className="px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 disabled:bg-[var(--color-surface)] disabled:cursor-not-allowed transition-colors"
                >
                  {joinLoading ? 'Joining...' : 'Join Selected'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MyDepartments
