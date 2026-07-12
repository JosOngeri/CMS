import { useState, useEffect } from 'react'
import { Mail, MessageSquare, Bell, Calendar, Building, CreditCard, Clock, Save, Loader2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'

const NotificationSettings = () => {
  const { api } = useAuth()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState({
    email_notifications: true,
    sms_notifications: false,
    announcement_notifications: true,
    event_notifications: true,
    department_notifications: true,
    payment_notifications: true,
    reminder_notifications: true
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await api.get('/user-settings/preferences')
      setSettings(response.data.preferences || settings)
    } catch (error) {
      console.error('Failed to fetch notification settings:', error)
      toast.error('Failed to load notification settings')
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

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put('/user-settings/preferences', settings)
      toast.success('Notification settings saved successfully')
    } catch (error) {
      console.error('Failed to save notification settings:', error)
      toast.error('Failed to save notification settings')
    } finally {
      setSaving(false)
    }
  }

  const notificationOptions = [
    {
      key: 'email_notifications',
      icon: Mail,
      title: 'Email Notifications',
      description: 'Receive notifications via email',
      category: 'general'
    },
    {
      key: 'sms_notifications',
      icon: MessageSquare,
      title: 'SMS Notifications',
      description: 'Receive notifications via SMS',
      category: 'general'
    },
    {
      key: 'announcement_notifications',
      icon: Bell,
      title: 'Announcements',
      description: 'Get notified about new announcements',
      category: 'content'
    },
    {
      key: 'event_notifications',
      icon: Calendar,
      title: 'Events',
      description: 'Get notified about upcoming events',
      category: 'content'
    },
    {
      key: 'department_notifications',
      icon: Building,
      title: 'Department Updates',
      description: 'Get notified about department activities',
      category: 'content'
    },
    {
      key: 'payment_notifications',
      icon: CreditCard,
      title: 'Payment Confirmations',
      description: 'Get notified about payment confirmations',
      category: 'financial'
    },
    {
      key: 'reminder_notifications',
      icon: Clock,
      title: 'Reminders',
      description: 'Get reminded about upcoming events and deadlines',
      category: 'content'
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
      {/* General Settings */}
      <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-6">
        <h3 className="text-lg font-semibold text-[var(--color-text)] text-white mb-4">
          General Notifications
        </h3>
        <div className="space-y-4">
          {notificationOptions
            .filter(opt => opt.category === 'general')
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

      {/* Content Notifications */}
      <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-6">
        <h3 className="text-lg font-semibold text-[var(--color-text)] text-white mb-4">
          Content Notifications
        </h3>
        <div className="space-y-4">
          {notificationOptions
            .filter(opt => opt.category === 'content')
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

      {/* Financial Notifications */}
      <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-6">
        <h3 className="text-lg font-semibold text-[var(--color-text)] text-white mb-4">
          Financial Notifications
        </h3>
        <div className="space-y-4">
          {notificationOptions
            .filter(opt => opt.category === 'financial')
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

export default NotificationSettings
