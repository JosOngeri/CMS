import { useState, useEffect } from 'react'
import { User, Mail, Phone, Calendar, Shield, Camera, Edit2, Save, X, Lock, Key, History, Eye, EyeOff, Bell, Globe } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import NotificationSettings from '../../components/settings/NotificationSettings'
import PrivacySettings from '../../components/settings/PrivacySettings'

const ProfileManagement = () => {
  const { user, updateUser, api } = useAuth()
  const toast = useToast()
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    bio: '',
    address: '',
    date_of_birth: ''
  })
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })
  const [activityHistory, setActivityHistory] = useState([])
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone_number: user.phone_number || '',
        bio: user.bio || '',
        address: user.address || '',
        date_of_birth: user.date_of_birth || ''
      })
    }
    fetchActivityHistory()
  }, [user])

  const fetchActivityHistory = async () => {
    try {
      const response = await api.get('/user-settings/activity-history')
      setActivityHistory(response.data.activities || [])
    } catch (error) {
      console.error('Error fetching activity history:', error)
      toast.error('Failed to load activity history')
    }
  }

  const handleProfileUpdate = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await api.put('/auth/profile', formData)
      updateUser(response.data.user)
      toast.success('Profile updated successfully')
      setShowEditForm(false)
    } catch (error) {
      console.error('Profile update error:', error)
      toast.error(error.response?.data?.error || 'Failed to update profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()

    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('New passwords do not match')
      return
    }

    if (passwordData.new_password.length < 6) {
      toast.error('Password must be at least 6 characters long')
      return
    }

    setLoading(true)

    try {
      await api.post('/user-settings/change-password', {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password
      })
      toast.success('Password changed successfully')
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' })
      setShowPasswordForm(false)
    } catch (error) {
      console.error('Password change error:', error)
      toast.error(error.response?.data?.error || 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  const getActivityIcon = (type) => {
    switch (type) {
      case 'login': return <Key className="w-4 h-4" />
      case 'profile_update': return <User className="w-4 h-4" />
      case 'password_change': return <Lock className="w-4 h-4" />
      case 'payment': return <Shield className="w-4 h-4" />
      default: return <History className="w-4 h-4" />
    }
  }

  const getActivityColor = (type) => {
    switch (type) {
      case 'login': return 'text-[var(--color-primary)]-600 bg-[var(--color-primary)]-100'
      case 'profile_update': return 'text-green-600 bg-green-100'
      case 'password_change': return 'text-yellow-600 bg-yellow-100'
      case 'payment': return 'text-purple-600 bg-purple-100'
      default: return 'text-[var(--color-textSecondary)] bg-[var(--color-surface)]'
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString()
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Profile Management</h1>
        <p className="page-subtitle">Manage your personal information and account settings</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--color-border)]">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {['profile', 'notifications', 'privacy', 'security', 'activity'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm capitalize whitespace-nowrap ${
                activeTab === tab
                  ? 'border-[var(--color-primary)]-500 text-[var(--color-primary)]-600'
                  : 'border-transparent text-[var(--color-textSecondary)] hover:text-[var(--color-text)] hover:border-[var(--color-border)]'
              }`}
            >
              {tab === 'security' ? (
                <span className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Security
                </span>
              ) : tab === 'activity' ? (
                <span className="flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Activity
                </span>
              ) : tab === 'notifications' ? (
                <span className="flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Notifications
                </span>
              ) : tab === 'privacy' ? (
                <span className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Privacy
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Profile
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* Profile Header */}
          <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="w-20 h-20 bg-[var(--color-primary)]-100 rounded-full flex items-center justify-center">
                    <User className="w-10 h-10 text-[var(--color-primary)]-600" />
                  </div>
                  <button className="absolute bottom-0 right-0 p-1 bg-[var(--color-primary)]-600 text-white rounded-full hover:bg-[var(--color-primary)]-700">
                    <Camera className="w-3 h-3" />
                  </button>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-[var(--color-text)] text-white">
                    {user.first_name} {user.last_name}
                  </h2>
                  <p className="text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">@{user.username}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {user.roles?.map(role => (
                      <span key={role} className="px-2 py-1 rounded-full text-xs font-medium bg-[var(--color-primary)]-100 text-[var(--color-primary)]-800">
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowEditForm(!showEditForm)}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors"
              >
                {showEditForm ? <X className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                {showEditForm ? 'Cancel' : 'Edit Profile'}
              </button>
            </div>
          </div>

          {/* Edit Profile Form */}
          {showEditForm && (
            <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-6">
              <h3 className="text-lg font-semibold text-[var(--color-text)] text-white mb-4">Edit Profile</h3>
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-1">First Name</label>
                    <input
                      type="text"
                      value={formData.first_name}
                      onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                      className="input w-full"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-1">Last Name</label>
                    <input
                      type="text"
                      value={formData.last_name}
                      onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                      className="input w-full"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
                    className="input w-full"
                    placeholder="+254 700 000 000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-1">Bio</label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({...formData, bio: e.target.value})}
                    className="input w-full"
                    rows={3}
                    placeholder="Tell us about yourself..."
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEditForm(false)}
                    className="px-4 py-2 bg-[var(--color-surface)] text-[var(--color-text)] text-[var(--color-textSecondary)] rounded-lg hover:bg-[var(--color-surface)] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 disabled:bg-[var(--color-surface)] disabled:bg-[var(--color-surface)] transition-colors"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Profile Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-6">
              <div className="flex items-center gap-3 mb-4">
                <Mail className="w-5 h-5 text-[var(--color-textSecondary)]" />
                <h3 className="font-semibold text-[var(--color-text)] text-white">Email</h3>
              </div>
              <p className="text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">{user.email}</p>
            </div>
            <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-6">
              <div className="flex items-center gap-3 mb-4">
                <Phone className="w-5 h-5 text-[var(--color-textSecondary)]" />
                <h3 className="font-semibold text-[var(--color-text)] text-white">Phone</h3>
              </div>
              <p className="text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">{user.phone_number || 'Not provided'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <NotificationSettings />
      )}

      {/* Privacy Tab */}
      {activeTab === 'privacy' && (
        <PrivacySettings />
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Password Change */}
          <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-[var(--color-text)] text-white">Change Password</h3>
                <p className="text-sm text-[var(--color-textSecondary)] text-[var(--color-textSecondary)] mt-1">
                  Update your password to keep your account secure
                </p>
              </div>
              <button
                onClick={() => setShowPasswordForm(!showPasswordForm)}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors"
              >
                {showPasswordForm ? <X className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                {showPasswordForm ? 'Cancel' : 'Change Password'}
              </button>
            </div>

            {showPasswordForm && (
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-1">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={passwordData.current_password}
                      onChange={(e) => setPasswordData({...passwordData, current_password: e.target.value})}
                      className="input w-full pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-textSecondary)] hover:text-[var(--color-text)] hover:text-[var(--color-textSecondary)]"
                    >
                      {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordData.new_password}
                      onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})}
                      className="input w-full pr-10"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-textSecondary)] hover:text-[var(--color-text)] hover:text-[var(--color-textSecondary)]"
                    >
                      {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-[var(--color-textSecondary)] text-[var(--color-textSecondary)] mt-1">
                    Password must be at least 6 characters long
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] text-[var(--color-textSecondary)] mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={passwordData.confirm_password}
                      onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})}
                      className="input w-full pr-10"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-textSecondary)] hover:text-[var(--color-text)] hover:text-[var(--color-textSecondary)]"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordForm(false)
                      setPasswordData({ current_password: '', new_password: '', confirm_password: '' })
                    }}
                    className="px-4 py-2 bg-[var(--color-surface)] text-[var(--color-text)] text-[var(--color-textSecondary)] rounded-lg hover:bg-[var(--color-surface)] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 disabled:bg-[var(--color-surface)] disabled:bg-[var(--color-surface)] transition-colors"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Update Password</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Security Info */}
          <div className="bg-[var(--color-primary)]-50 bg-[var(--color-primary)]-900/20 border border-[var(--color-primary)]-200 border-[var(--color-primary)]-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-[var(--color-primary)]-600 text-[var(--color-primary)]-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-[var(--color-primary)]-900 text-[var(--color-primary)]-100">Security Tips</h4>
                <ul className="text-sm text-[var(--color-primary)]-700 text-[var(--color-primary)]-300 mt-2 space-y-1">
                  <li>• Use a strong password with at least 8 characters</li>
                  <li>• Include a mix of letters, numbers, and special characters</li>
                  <li>• Don't reuse passwords from other sites</li>
                  <li>• Enable two-factor authentication when available</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-6">
          <h3 className="text-lg font-semibold text-[var(--color-text)] text-white mb-4">Activity History</h3>
          {activityHistory.length === 0 ? (
            <div className="text-center py-8 text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">
              No activity history available
            </div>
          ) : (
            <div className="space-y-4">
              {activityHistory.map((activity, index) => (
                <div key={index} className="flex items-start gap-4 p-4 bg-[var(--color-background)] bg-[var(--color-surface)] rounded-lg">
                  <div className={`p-2 rounded-full ${getActivityColor(activity.type)}`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-[var(--color-text)] text-white">
                      {activity.description || activity.type}
                    </p>
                    <p className="text-sm text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">
                      {formatDate(activity.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ProfileManagement
