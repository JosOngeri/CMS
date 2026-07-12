import { useState, useEffect } from 'react'
import { Eye, EyeOff, Mail, Phone, Building, MessageSquare, Activity, Globe, Lock, Users, Save, Loader2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'

const PrivacySettings = () => {
  const { api } = useAuth()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState({
    profile_visibility: 'public',
    show_email: true,
    show_phone: true,
    show_departments: true,
    allow_messages: true,
    show_activity: true
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await api.get('/user-settings/preferences')
      setSettings(response.data.preferences || settings)
    } catch (error) {
      console.error('Failed to fetch privacy settings:', error)
      toast.error('Failed to load privacy settings')
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = (key) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const handleVisibilityChange = (value) => {
    setSettings(prev => ({
      ...prev,
      profile_visibility: value
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put('/user-settings/preferences', settings)
      toast.success('Privacy settings saved successfully')
    } catch (error) {
      console.error('Failed to save privacy settings:', error)
      toast.error('Failed to save privacy settings')
    } finally {
      setSaving(false)
    }
  }

  const visibilityOptions = [
    {
      value: 'public',
      icon: Globe,
      title: 'Public',
      description: 'Anyone can see your profile'
    },
    {
      value: 'members_only',
      icon: Users,
      title: 'Members Only',
      description: 'Only church members can see your profile'
    },
    {
      value: 'private',
      icon: Lock,
      title: 'Private',
      description: 'Only you can see your profile'
    }
  ]

  const privacyOptions = [
    {
      key: 'show_email',
      icon: Mail,
      title: 'Show Email',
      description: 'Allow others to see your email address',
      category: 'contact'
    },
    {
      key: 'show_phone',
      icon: Phone,
      title: 'Show Phone Number',
      description: 'Allow others to see your phone number',
      category: 'contact'
    },
    {
      key: 'show_departments',
      icon: Building,
      title: 'Show Departments',
      description: 'Allow others to see your department memberships',
      category: 'profile'
    },
    {
      key: 'allow_messages',
      icon: MessageSquare,
      title: 'Allow Messages',
      description: 'Allow other members to send you messages',
      category: 'interaction'
    },
    {
      key: 'show_activity',
      icon: Activity,
      title: 'Show Activity',
      description: 'Allow others to see your recent activity',
      category: 'profile'
    }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Profile Visibility */}
      <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-6">
        <h3 className="text-lg font-semibold text-[var(--color-text)] text-white mb-4">
          Profile Visibility
        </h3>
        <p className="text-sm text-[var(--color-textSecondary)] text-[var(--color-textSecondary)] mb-4">
          Control who can see your profile information
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {visibilityOptions.map(option => (
            <button
              key={option.value}
              onClick={() => handleVisibilityChange(option.value)}
              className={`p-4 rounded-lg border-2 transition-all ${
                settings.profile_visibility === option.value
                  ? 'border-primary-500 bg-primary-50 bg-primary-900/20'
                  : 'border-[var(--color-border)] hover:border-[var(--color-border)] hover:border-[var(--color-border)]'
              }`}
            >
              <div className="flex flex-col items-center text-center space-y-2">
                <div className={`p-3 rounded-full ${
                  settings.profile_visibility === option.value
                    ? 'bg-primary-100 bg-primary-900'
                    : 'bg-[var(--color-surface)]'
                }`}>
                  <option.icon className={`h-6 w-6 ${
                    settings.profile_visibility === option.value
                      ? 'text-primary-600 text-primary-400'
                      : 'text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]'
                  }`} />
                </div>
                <div>
                  <p className="font-medium text-[var(--color-text)] text-white">
                    {option.title}
                  </p>
                  <p className="text-xs text-[var(--color-textSecondary)] text-[var(--color-textSecondary)] mt-1">
                    {option.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-6">
        <h3 className="text-lg font-semibold text-[var(--color-text)] text-white mb-4">
          Contact Information
        </h3>
        <div className="space-y-4">
          {privacyOptions
            .filter(opt => opt.category === 'contact')
            .map(option => (
              <div key={option.key} className="flex items-center justify-between py-3 border-b border-[var(--color-border)] last:border-0">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-[var(--color-primary)]-100 bg-[var(--color-primary)]-900 rounded-lg">
                    <option.icon className="h-5 w-5 text-[var(--color-primary)]-600 text-[var(--color-primary)]-400" />
                  </div>
                  <div>
                    <p className="font-medium text-[var(--color-text)] text-white">
                      {option.title}
                    </p>
                    <p className="text-sm text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">
                      {option.description}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle(option.key)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings[option.key] ? 'bg-primary-600' : 'bg-[var(--color-surface)]'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-[var(--color-surface)] transition-transform ${
                      settings[option.key] ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
        </div>
      </div>

      {/* Profile Information */}
      <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-6">
        <h3 className="text-lg font-semibold text-[var(--color-text)] text-white mb-4">
          Profile Information
        </h3>
        <div className="space-y-4">
          {privacyOptions
            .filter(opt => opt.category === 'profile')
            .map(option => (
              <div key={option.key} className="flex items-center justify-between py-3 border-b border-[var(--color-border)] last:border-0">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 bg-green-900 rounded-lg">
                    <option.icon className="h-5 w-5 text-green-600 text-green-400" />
                  </div>
                  <div>
                    <p className="font-medium text-[var(--color-text)] text-white">
                      {option.title}
                    </p>
                    <p className="text-sm text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">
                      {option.description}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle(option.key)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings[option.key] ? 'bg-primary-600' : 'bg-[var(--color-surface)]'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-[var(--color-surface)] transition-transform ${
                      settings[option.key] ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
        </div>
      </div>

      {/* Interaction Settings */}
      <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-6">
        <h3 className="text-lg font-semibold text-[var(--color-text)] text-white mb-4">
          Interaction Settings
        </h3>
        <div className="space-y-4">
          {privacyOptions
            .filter(opt => opt.category === 'interaction')
            .map(option => (
              <div key={option.key} className="flex items-center justify-between py-3 border-b border-[var(--color-border)] last:border-0">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-100 bg-purple-900 rounded-lg">
                    <option.icon className="h-5 w-5 text-purple-600 text-purple-400" />
                  </div>
                  <div>
                    <p className="font-medium text-[var(--color-text)] text-white">
                      {option.title}
                    </p>
                    <p className="text-sm text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">
                      {option.description}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle(option.key)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings[option.key] ? 'bg-primary-600' : 'bg-[var(--color-surface)]'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-[var(--color-surface)] transition-transform ${
                      settings[option.key] ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center space-x-2 bg-primary-600 hover:bg-primary-700 disabled:bg-[var(--color-surface)] disabled:bg-[var(--color-surface)] text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
        >
          {saving ? (
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
    </div>
  )
}

export default PrivacySettings
