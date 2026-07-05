import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import {
  Plus, Edit, Trash2, Search, Filter, ChevronDown,
  FolderKanban, RefreshCw, TrendingUp, CheckCircle
} from 'lucide-react'
import Card from '../../components/common/Card'
import { FullPageLoading } from '../../components/common/Loading'
import { EmptyState } from '../../components/common/EmptyState'

const Projects = () => {
  const { api } = useAuth()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState([])
  const [filteredProjects, setFilteredProjects] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [showMilestones, setShowMilestones] = useState(false)
  const [showContributions, setShowContributions] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [selectedProject, setSelectedProject] = useState(null)
  const [milestones, setMilestones] = useState([])
  const [contributions, setContributions] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [funds, setFunds] = useState([])
  const [users, setUsers] = useState([])
  const [formData, setFormData] = useState({
    project_code: '',
    project_name: '',
    description: '',
    start_date: '',
    end_date: '',
    budgeted_amount: '',
    fund_id: '',
    managed_by: '',
    status: 'active'
  })
  const [milestoneForm, setMilestoneForm] = useState({
    title: '',
    description: '',
    due_date: '',
    status: 'pending'
  })
  const [contributionForm, setContributionForm] = useState({
    amount: '',
    contributor_id: '',
    date: '',
    notes: ''
  })

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'on_hold', label: 'On Hold' },
    { value: 'cancelled', label: 'Cancelled' }
  ]

  useEffect(() => {
    fetchProjects()
    fetchFunds()
    fetchUsers()
  }, [])

  useEffect(() => {
    filterProjects()
  }, [searchTerm, filterStatus, projects])

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const response = await api.get('/treasury/projects')
      if (response.data) {
        setProjects(response.data.projects || [])
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error)
      toast.error('Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  const fetchFunds = async () => {
    try {
      const response = await api.get('/treasury/funds')
      if (response.data) {
        setFunds(response.data.funds || [])
      }
    } catch (error) {
      console.error('Failed to fetch funds:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users/directory')
      if (response.data) {
        setUsers(response.data.users || [])
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    }
  }

  const filterProjects = () => {
    let filtered = [...projects]

    if (searchTerm) {
      filtered = filtered.filter(project =>
        project.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.project_code.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(project => project.status === filterStatus)
    }

    setFilteredProjects(filtered)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingProject) {
        await api.put(`/treasury/projects/${editingProject.id}`, formData)
        toast.success('Project updated successfully')
      } else {
        await api.post('/treasury/projects', formData)
        toast.success('Project created successfully')
      }
      setShowForm(false)
      setEditingProject(null)
      resetForm()
      fetchProjects()
    } catch (error) {
      console.error('Failed to save project:', error)
      toast.error('Failed to save project')
    }
  }

  const resetForm = () => {
    setFormData({
      project_code: '',
      project_name: '',
      description: '',
      start_date: '',
      end_date: '',
      budgeted_amount: '',
      fund_id: '',
      managed_by: '',
      status: 'active'
    })
  }

  const handleEdit = (project) => {
    setEditingProject(project)
    setFormData({
      project_code: project.project_code,
      project_name: project.project_name,
      description: project.description || '',
      start_date: project.start_date || '',
      end_date: project.end_date || '',
      budgeted_amount: project.budgeted_amount || '',
      fund_id: project.fund_id || '',
      managed_by: project.managed_by || '',
      status: project.status
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this project?')) {
      try {
        await api.delete(`/treasury/projects/${id}`)
        toast.success('Project deleted successfully')
        fetchProjects()
      } catch (error) {
        console.error('Failed to delete project:', error)
        toast.error('Failed to delete project')
      }
    }
  }

  const handleViewMilestones = async (project) => {
    setSelectedProject(project)
    setShowMilestones(true)
    try {
      const response = await api.get(`/projects/${project.id}/milestones`)
      setMilestones(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch milestones:', error)
      toast.error('Failed to load milestones')
    }
  }

  const handleViewContributions = async (project) => {
    setSelectedProject(project)
    setShowContributions(true)
    try {
      const response = await api.get(`/projects/${project.id}/contributions`)
      setContributions(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch contributions:', error)
      toast.error('Failed to load contributions')
    }
  }

  const handleViewAnalytics = async (project) => {
    setSelectedProject(project)
    setShowAnalytics(true)
    try {
      const response = await api.get(`/projects/${project.id}/analytics`)
      setAnalytics(response.data.data)
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
      toast.error('Failed to load analytics')
    }
  }

  const handleAddMilestone = async (e) => {
    e.preventDefault()
    try {
      await api.post(`/projects/${selectedProject.id}/milestones`, milestoneForm)
      toast.success('Milestone added successfully')
      setMilestoneForm({ title: '', description: '', due_date: '', status: 'pending' })
      handleViewMilestones(selectedProject)
    } catch (error) {
      console.error('Failed to add milestone:', error)
      toast.error('Failed to add milestone')
    }
  }

  const handleUpdateMilestone = async (milestoneId, data) => {
    try {
      await api.put(`/projects/${selectedProject.id}/milestones/${milestoneId}`, data)
      toast.success('Milestone updated successfully')
      handleViewMilestones(selectedProject)
    } catch (error) {
      console.error('Failed to update milestone:', error)
      toast.error('Failed to update milestone')
    }
  }

  const handleDeleteMilestone = async (milestoneId) => {
    if (confirm('Are you sure you want to delete this milestone?')) {
      try {
        await api.delete(`/projects/${selectedProject.id}/milestones/${milestoneId}`)
        toast.success('Milestone deleted successfully')
        handleViewMilestones(selectedProject)
      } catch (error) {
        console.error('Failed to delete milestone:', error)
        toast.error('Failed to delete milestone')
      }
    }
  }

  const handleAddContribution = async (e) => {
    e.preventDefault()
    try {
      await api.post(`/projects/${selectedProject.id}/contributions`, contributionForm)
      toast.success('Contribution added successfully')
      setContributionForm({ amount: '', contributor_id: '', date: '', notes: '' })
      handleViewContributions(selectedProject)
    } catch (error) {
      console.error('Failed to add contribution:', error)
      toast.error('Failed to add contribution')
    }
  }

  const handleUpdateStatus = async (project, status) => {
    try {
      await api.put(`/projects/${project.id}/status`, { status })
      toast.success('Project status updated successfully')
      fetchProjects()
    } catch (error) {
      console.error('Failed to update status:', error)
      toast.error('Failed to update status')
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700'
      case 'completed': return 'bg-[var(--color-primary)]-100 text-[var(--color-primary)]-700'
      case 'on_hold': return 'bg-yellow-100 text-yellow-700'
      case 'cancelled': return 'bg-red-100 text-red-700'
      default: return 'bg-[var(--color-surface)] text-[var(--color-text)]'
    }
  }

  if (loading) {
    return <FullPageLoading message="Loading projects..." />
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)] ">Projects</h1>
          <p className="text-sm text-[var(--color-textSecondary)]">
            Project-based accounting and tracking
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Add Project</span>
        </button>
      </div>

      {/* Filters */}
      <Card>
        <div className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--color-textSecondary)]" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-[var(--color-border)]  rounded-lg bg-[var(--color-surface)]  text-[var(--color-text)] "
                />
              </div>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-4 py-2 border border-[var(--color-border)]  rounded-lg hover:bg-[var(--color-background)]  transition-colors"
            >
              <Filter className="h-4 w-4" />
              <span>Filters</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
            <button
              onClick={fetchProjects}
              className="flex items-center space-x-2 px-4 py-2 border border-[var(--color-border)]  rounded-lg hover:bg-[var(--color-background)]  transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
          </div>

          {showFilters && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-[var(--color-text)]  mb-2">
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg bg-[var(--color-surface)]  text-[var(--color-text)] "
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </Card>

      {/* Projects List */}
      <Card>
        {filteredProjects.length > 0 ? (
          <div className="divide-y divide-[var(--color-border)] ">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                className="p-4 hover:bg-[var(--color-background)] /50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <FolderKanban className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-medium text-[var(--color-text)] ">
                        {project.project_code} - {project.project_name}
                      </p>
                      <p className="text-sm text-[var(--color-textSecondary)]">
                        {project.description || 'No description'}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(project.status)}`}>
                          {project.status}
                        </span>
                        {project.start_date && (
                          <span className="text-xs text-[var(--color-textSecondary)]">
                            {project.start_date} - {project.end_date || 'Ongoing'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm text-[var(--color-textSecondary)]">Budget</p>
                      <p className="font-semibold text-[var(--color-text)] ">
                        KES {parseFloat(project?.budgeted_amount ?? 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-[var(--color-textSecondary)]">Actual</p>
                      <p className="font-semibold text-[var(--color-text)] ">
                        KES {parseFloat(project?.actual_amount ?? 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(project)}
                        className="p-2 text-[var(--color-textSecondary)] hover:text-[var(--color-primary)]-600 transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(project.id)}
                        className="p-2 text-[var(--color-textSecondary)] hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={FolderKanban}
            title="No projects found"
            description="Create your first project to start tracking project-based expenses."
          />
        )}
      </Card>

      {/* Project Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--color-surface)]  rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-[var(--color-text)]  mb-4">
                {editingProject ? 'Edit Project' : 'Add Project'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)]  mb-2">
                      Project Code
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.project_code}
                      onChange={(e) => setFormData({ ...formData, project_code: e.target.value })}
                      className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg bg-[var(--color-surface)]  text-[var(--color-text)] "
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)]  mb-2">
                      Project Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.project_name}
                      onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                      className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg bg-[var(--color-surface)]  text-[var(--color-text)] "
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)]  mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg bg-[var(--color-surface)]  text-[var(--color-text)] "
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)]  mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg bg-[var(--color-surface)]  text-[var(--color-text)] "
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)]  mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg bg-[var(--color-surface)]  text-[var(--color-text)] "
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)]  mb-2">
                      Budgeted Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.budgeted_amount}
                      onChange={(e) => setFormData({ ...formData, budgeted_amount: e.target.value })}
                      className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg bg-[var(--color-surface)]  text-[var(--color-text)] "
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)]  mb-2">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg bg-[var(--color-surface)]  text-[var(--color-text)] "
                    >
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="on_hold">On Hold</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)]  mb-2">
                    Fund
                  </label>
                  <select
                    value={formData.fund_id}
                    onChange={(e) => setFormData({ ...formData, fund_id: e.target.value })}
                    className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg bg-[var(--color-surface)]  text-[var(--color-text)] "
                  >
                    <option value="">No Fund</option>
                    {funds.map(fund => (
                      <option key={fund.id} value={fund.id}>
                        {fund.fund_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)]  mb-2">
                    Managed By
                  </label>
                  <select
                    value={formData.managed_by}
                    onChange={(e) => setFormData({ ...formData, managed_by: e.target.value })}
                    className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg bg-[var(--color-surface)]  text-[var(--color-text)] "
                  >
                    <option value="">Select Manager</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.first_name} {user.last_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false)
                      setEditingProject(null)
                      resetForm()
                    }}
                    className="px-4 py-2 border border-[var(--color-border)]  rounded-lg hover:bg-[var(--color-background)]  transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors"
                  >
                    {editingProject ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Projects
