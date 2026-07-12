import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { User, Mail, Phone, Save, Loader2, Lock, Eye, EyeOff, Key } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { toast } from 'react-toastify'

const Profile = () => {
  const { user, updateUser, api } = useAuth()
  const [loading, setLoading] = useState(false)
  const [departments, setDepartments] = useState([])
  const [showPassword, setShowPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm({
    defaultValues: {
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      email: user?.email || '',
      phone_number: user?.phone_number || ''
    }
  })

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  useEffect(() => {
    fetchUserDepartments()
  }, [])

  const fetchUserDepartments = async () => {
    try {
      const response = await api.get(`/users/${user.id}`)
      setDepartments(response.data.user.departments || [])
    } catch (error) {
      console.error('Failed to fetch departments:', error)
    }
  }

  const onSubmit = async (data) => {
    try {
      setLoading(true)
      const response = await api.put(`/users/${user.id}`, data)
      
      updateUser(response.data.user)
      toast.success('Profile updated successfully!')
    } catch (error) {
      console.error('Update profile error:', error)
      toast.error(error.response?.data?.error || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match')
      return
    }
    
    if (passwordForm.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    
    try {
      setPasswordLoading(true)
      const response = await api.put('/auth/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      })
      
      toast.success('Password changed successfully!')
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
    } catch (error) {
      console.error('Password change error:', error)
      toast.error(error.response?.data?.error || 'Failed to change password')
    } finally {
      setPasswordLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-text)]  mb-2">
          My Profile
        </h1>
        <p className="text-[var(--color-textSecondary)] ">
          Manage your personal information and account settings
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Form */}
        <div className="lg:col-span-2">
          <div className="bg-[var(--color-surface)]  rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-[var(--color-text)]  mb-6">
              Personal Information
            </h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)]  mb-2">
                    First Name
                  </label>
                  <input
                    {...register('first_name', {
                      required: 'First name is required'
                    })}
                    type="text"
                    className="input w-full"
                  />
                  {errors.first_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.first_name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)]  mb-2">
                    Last Name
                  </label>
                  <input
                    {...register('last_name', {
                      required: 'Last name is required'
                    })}
                    type="text"
                    className="input w-full"
                  />
                  {errors.last_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.last_name.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)]  mb-2">
                  Email Address
                </label>
                <input
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^\S+@\S+$/i,
                      message: 'Invalid email address'
                    }
                  })}
                  type="email"
                  className="input w-full"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)]  mb-2">
                  Phone Number
                </label>
                <input
                  {...register('phone_number', {
                    required: 'Phone number is required',
                    pattern: {
                      value: /^[\d\s\-\+\(\)]+$/,
                      message: 'Invalid phone number format'
                    }
                  })}
                  type="tel"
                  className="input w-full"
                  placeholder="+254 700 000 000"
                />
                {errors.phone_number && (
                  <p className="mt-1 text-sm text-red-600">{errors.phone_number.message}</p>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary flex items-center space-x-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Password Change Section */}
          <div className="bg-[var(--color-surface)]  rounded-lg shadow-sm p-6 mt-6">
            <h2 className="text-lg font-semibold text-[var(--color-text)]  mb-6 flex items-center">
              <Lock className="h-5 w-5 mr-2" />
              Change Password
            </h2>

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)]  mb-2">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                    className="input w-full pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--color-textSecondary)] hover:text-[var(--color-textSecondary)]"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)]  mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                    className="input w-full pr-10"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--color-textSecondary)] hover:text-[var(--color-textSecondary)]"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-[var(--color-textSecondary)]">Must be at least 8 characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)]  mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                    className="input w-full pr-10"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--color-textSecondary)] hover:text-[var(--color-textSecondary)]"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="btn btn-primary flex items-center space-x-2"
                >
                  {passwordLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Changing Password...</span>
                    </>
                  ) : (
                    <>
                      <Key className="h-5 w-5" />
                      <span>Change Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Profile Summary */}
          <div className="bg-[var(--color-surface)]  rounded-lg shadow-sm p-6">
            <h3 className="font-semibold text-[var(--color-text)]  mb-4">Profile Summary</h3>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-primary-600" />
                </div>
                <div>
                  <p className="font-medium text-[var(--color-text)] ">
                    {user?.first_name} {user?.last_name}
                  </p>
                  <p className="text-sm text-[var(--color-textSecondary)] ">
                    {user?.roles?.join(', ')}
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t border-[var(--color-border)] ">
                <div className="flex items-center space-x-2 text-sm text-[var(--color-textSecondary)] ">
                  <Mail className="h-4 w-4" />
                  <span>{user?.email}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-[var(--color-textSecondary)] ">
                  <Phone className="h-4 w-4" />
                  <span>{user?.phone_number}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Departments */}
          {departments.length > 0 && (
            <div className="bg-[var(--color-surface)]  rounded-lg shadow-sm p-6">
              <h3 className="font-semibold text-[var(--color-text)]  mb-4">My Departments</h3>
              
              <div className="space-y-3">
                {departments.map((dept) => (
                  <div key={dept.id} className="p-3 bg-[var(--color-background)]  rounded-lg">
                    <p className="font-medium text-[var(--color-text)] ">
                      {dept.name}
                    </p>
                    <p className="text-sm text-[var(--color-textSecondary)] ">
                      {dept.role_in_department || 'Member'}
                    </p>
                    <p className="text-xs text-[var(--color-textSecondary)] mt-1">
                      Joined {new Date(dept.joined_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Account Settings */}
          <div className="bg-[var(--color-surface)]  rounded-lg shadow-sm p-6">
            <h3 className="font-semibold text-[var(--color-text)]  mb-4">Account Settings</h3>
            
            <div className="space-y-3">
              <button className="w-full text-left p-3 hover:bg-[var(--color-background)]  rounded-lg transition-colors">
                <p className="font-medium text-[var(--color-text)] ">Change Password</p>
                <p className="text-sm text-[var(--color-textSecondary)] ">Update your password</p>
              </button>
              
              <button className="w-full text-left p-3 hover:bg-[var(--color-background)]  rounded-lg transition-colors">
                <p className="font-medium text-[var(--color-text)] ">Notification Settings</p>
                <p className="text-sm text-[var(--color-textSecondary)] ">Manage email and SMS notifications</p>
              </button>
              
              <button className="w-full text-left p-3 hover:bg-[var(--color-background)]  rounded-lg transition-colors">
                <p className="font-medium text-[var(--color-text)] ">Privacy Settings</p>
                <p className="text-sm text-[var(--color-textSecondary)] ">Control your privacy preferences</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile
