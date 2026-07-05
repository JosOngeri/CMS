import { useState, useEffect } from 'react'
import { Save, RefreshCw, Settings as SettingsIcon, MessageSquare, Building, FileText, Calendar, Shield, DollarSign, Cpu, Users } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { useColorPalette } from '../../contexts/ColorPaletteContext'
import { useSettings } from '../../contexts/SettingsContext'
import { FullPageLoading } from '../../components/common/Loading'
import PageInfoPanel from '../../components/common/PageInfoPanel'
import SettingInput from '../../components/settings/SettingInput'
import SettingNumber from '../../components/settings/SettingNumber'
import SettingBoolean from '../../components/settings/SettingBoolean'
import SettingColor from '../../components/settings/SettingColor'
import SettingSelect from '../../components/settings/SettingSelect'
import SettingTextarea from '../../components/settings/SettingTextarea'
import PaletteSelector from '../../components/settings/PaletteSelector'

const SiteSettings = () => {
  const { user, api } = useAuth()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState({})
  const [changes, setChanges] = useState({})
  const [activeMainTab, setActiveMainTab] = useState('general')
  const [activeCategory, setActiveCategory] = useState('general')

  const canManageSettings = user?.roles?.some(role => 
    ['Super Admin', 'Pastor', 'First Elder'].includes(role)
  )

  useEffect(() => {
    fetchSettings()
  }, [])

  useEffect(() => {
    // Set the first category of the active main tab as the active category
    const firstCategory = tabGroups[activeMainTab]?.categories[0]
    if (firstCategory && !tabGroups[activeMainTab]?.categories.includes(activeCategory)) {
      setActiveCategory(firstCategory)
    }
  }, [activeMainTab])

  const getIconForGroup = (iconName) => {
    const icons = {
      Settings: SettingsIcon,
      MessageSquare: MessageSquare,
      Building: Building,
      FileText: FileText,
      Calendar: Calendar,
      Shield: Shield,
      DollarSign: DollarSign,
      Cpu: Cpu,
      Users: Users
    }
    return icons[iconName] || SettingsIcon
  }

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await api.get('/settings')
      setSettings(response.data.settings || {})
    } catch (error) {
      console.error('Error fetching settings:', error)
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (category, key, value) => {
    setChanges(prev => ({
      ...prev,
      [key]: value
    }))
    setSettings(prev => ({
      ...prev,
      [category]: prev[category]?.map(s => 
        s.key === key ? { ...s, value } : s
      )
    }))
  }

  const { fetchPublicSettings } = useSettings()

  const handleSave = async () => {
    if (Object.keys(changes).length === 0) {
      toast.info('No changes to save')
      return
    }

    try {
      setSaving(true)
      const settingsArray = Object.entries(changes).map(([key, value]) => ({
        key,
        value: String(value)
      }))

      await api.put('/settings/bulk', { settings: settingsArray })
      await fetchPublicSettings()
      toast.success('Settings saved successfully')
      setChanges({})
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    fetchSettings()
    setChanges({})
    toast.info('Settings reset to server values')
  }

  const renderSetting = (setting) => {
    const currentValue = changes[setting.key] !== undefined ? changes[setting.key] : setting.value

    switch (setting.value_type) {
      case 'number':
        const rules = typeof setting.validation_rules === 'string' 
          ? JSON.parse(setting.validation_rules) 
          : setting.validation_rules
        return (
          <SettingNumber
            key={setting.key}
            label={setting.label}
            description={setting.description}
            value={currentValue}
            onChange={(value) => handleChange(setting.category, setting.key, value)}
            disabled={!setting.is_editable || !canManageSettings}
            min={rules?.min}
            max={rules?.max}
            step={rules?.step}
          />
        )
      case 'boolean':
        return (
          <SettingBoolean
            key={setting.key}
            label={setting.label}
            description={setting.description}
            value={currentValue === 'true' || currentValue === true}
            onChange={(value) => handleChange(setting.category, setting.key, value)}
            disabled={!setting.is_editable || !canManageSettings}
          />
        )
      case 'color':
        return (
          <SettingColor
            key={setting.key}
            label={setting.label}
            description={setting.description}
            value={currentValue}
            onChange={(value) => handleChange(setting.category, setting.key, value)}
            disabled={!setting.is_editable || !canManageSettings}
          />
        )
      case 'select':
        const selectRules = typeof setting.validation_rules === 'string' 
          ? JSON.parse(setting.validation_rules) 
          : setting.validation_rules
        const options = selectRules?.enum?.map(val => ({ value: val, label: val })) || []
        return (
          <SettingSelect
            key={setting.key}
            label={setting.label}
            description={setting.description}
            value={currentValue}
            onChange={(value) => handleChange(setting.category, setting.key, value)}
            options={options}
            disabled={!setting.is_editable || !canManageSettings}
          />
        )
      default:
        return (
          <SettingInput
            key={setting.key}
            label={setting.label}
            description={setting.description}
            value={currentValue}
            onChange={(value) => handleChange(setting.category, setting.key, value)}
            disabled={!setting.is_editable || !canManageSettings}
          />
        )
    }
  }

  const categoryNames = {
    general: 'General',
    appearance: 'Appearance',
    contact: 'Contact Information',
    social: 'Social Media',
    payment: 'Payment Settings',
    sms: 'SMS Settings',
    service: 'Service Times',
    features: 'Feature Flags',
    maintenance: 'Maintenance Mode',
    church_info: 'Church Information',
    streaming: 'Service Streaming',
    banner: 'Announcement Banner',
    notifications: 'Email Notifications',
    seo: 'SEO & Analytics',
    uploads: 'File Upload Settings',
    security: 'Security Settings',
    user_defaults: 'Default User Settings',
    moderation: 'Content Moderation',
    backups: 'Backup Settings',
    event_settings: 'Event Settings',
    giving: 'Donation & Giving',
    volunteers: 'Volunteer Management',
    telegram: 'Telegram Integration',
    content: 'Content Management',
    documentation: 'Documentation',
    mobile: 'Mobile App',
    monitoring: 'System Monitoring',
    accessibility: 'Accessibility',
    testing: 'Testing'
  }

  const tabGroups = {
    general: {
      name: 'General',
      icon: 'Settings',
      categories: ['general', 'appearance', 'features']
    },
    church: {
      name: 'Church',
      icon: 'Building',
      categories: ['church_info', 'service', 'streaming']
    },
    communication: {
      name: 'Communication',
      icon: 'MessageSquare',
      categories: ['contact', 'social', 'sms', 'notifications', 'telegram']
    },
    content: {
      name: 'Content',
      icon: 'FileText',
      categories: ['maintenance', 'banner', 'moderation', 'uploads', 'content', 'documentation']
    },
    events: {
      name: 'Events',
      icon: 'Calendar',
      categories: ['event_settings']
    },
    users: {
      name: 'Users',
      icon: 'Users',
      categories: ['security', 'user_defaults', 'volunteers', 'mobile']
    },
    financial: {
      name: 'Financial',
      icon: 'DollarSign',
      categories: ['payment', 'giving']
    },
    system: {
      name: 'System',
      icon: 'Cpu',
      categories: ['seo', 'backups', 'monitoring', 'accessibility', 'testing']
    }
  }

  const categoryHelpContent = {
    general: {
      title: 'General Settings',
      description: 'Basic site configuration',
      steps: [
        'Set your site name and basic information',
        'Configure timezone and language preferences',
        'Set default currency for payments',
        'Configure site-wide display options',
        'Save changes to apply them immediately'
      ],
      faqs: [
        {
          question: 'What are general settings?',
          answer: 'General settings control the basic configuration of your site, including name, timezone, currency, and other fundamental options.'
        },
        {
          question: 'Do changes apply immediately?',
          answer: 'Yes, most general settings take effect immediately after saving. Some settings may require a page refresh.'
        }
      ]
    },
    appearance: {
      title: 'Appearance Settings',
      description: 'Customize the look and feel',
      steps: [
        'Choose a color palette from the available options',
        'Use the custom palette selector to create your own colors',
        'Preview changes in real-time',
        'Save your preferred color scheme',
        'Changes apply across the entire site'
      ],
      faqs: [
        {
          question: 'How do I change the color scheme?',
          answer: 'Use the Palette Selector to choose from predefined color palettes or create your own custom color scheme.'
        },
        {
          question: 'Can I revert to default colors?',
          answer: 'Yes, you can reset to the default color palette by selecting it from the palette options.'
        }
      ]
    },
    contact: {
      title: 'Contact Information',
      description: 'Manage church contact details',
      steps: [
        'Enter the church physical address',
        'Set primary phone number for inquiries',
        'Configure email addresses for different departments',
        'Add office hours and availability',
        'Save to update contact information site-wide'
      ],
      faqs: [
        {
          question: 'Where does this information appear?',
          answer: 'Contact information appears on the Contact page, footer, and other relevant sections throughout the site.'
        },
        {
          question: 'Can I have multiple email addresses?',
          answer: 'Yes, you can configure different email addresses for various departments and purposes.'
        }
      ]
    },
    social: {
      title: 'Social Media Settings',
      description: 'Configure social media links',
      steps: [
        'Add your church social media profile URLs',
        'Include Facebook, Twitter, Instagram, and YouTube',
        'Configure social sharing settings',
        'Test links to ensure they work correctly',
        'Save to update social media buttons'
      ],
      faqs: [
        {
          question: 'What social media platforms are supported?',
          answer: 'We support Facebook, Twitter/X, Instagram, YouTube, and other major social media platforms.'
        },
        {
          question: 'Do I need to add all platforms?',
          answer: 'No, only add the platforms your church actively uses. Leave others blank.'
        }
      ]
    },
    payment: {
      title: 'Payment Settings',
      description: 'Configure payment processing',
      steps: [
        'Set up M-Pesa integration for mobile payments',
        'Configure payment processing fees',
        'Set default payment methods',
        'Configure receipt and invoice settings',
        'Test payment flow before going live'
      ],
      faqs: [
        {
          question: 'What payment methods are supported?',
          answer: 'We primarily support M-Pesa for mobile payments. Additional payment methods can be configured as needed.'
        },
        {
          question: 'Are payment transactions secure?',
          answer: 'Yes, all payment transactions are encrypted and processed through secure payment gateways.'
        }
      ]
    },
    sms: {
      title: 'SMS Settings',
      description: 'Configure SMS notifications',
      steps: [
        'Set up SMS gateway credentials',
        'Configure sender ID and API keys',
        'Set default SMS templates',
        'Configure SMS rate limits',
        'Test SMS functionality'
      ],
      faqs: [
        {
          question: 'What SMS gateway is used?',
          answer: 'Configure your preferred SMS gateway provider in these settings with proper API credentials.'
        },
        {
          question: 'Are there rate limits on SMS?',
          answer: 'Yes, configure rate limits to prevent spam and control SMS costs.'
        }
      ]
    },
    service: {
      title: 'Service Times',
      description: 'Configure worship service schedule',
      steps: [
        'Set regular Sabbath service times',
        'Configure mid-week service schedule',
        'Add special service times for holidays',
        'Set prayer meeting schedules',
        'Save to update service times site-wide'
      ],
      faqs: [
        {
          question: 'How do I add special services?',
          answer: 'Special services can be added as events in the Events section, while regular services are configured here.'
        },
        {
          question: 'Do service times appear on the homepage?',
          answer: 'Yes, service times are displayed on the homepage and other relevant sections.'
        }
      ]
    },
    features: {
      title: 'Feature Flags',
      description: 'Enable or disable site features',
      steps: [
        'Toggle features on or off as needed',
        'Enable new features when ready',
        'Disable features temporarily for maintenance',
        'Review feature descriptions before toggling',
        'Save changes to apply feature settings'
      ],
      faqs: [
        {
          question: 'What are feature flags?',
          answer: 'Feature flags allow you to enable or disable specific site features without code changes.'
        },
        {
          question: 'Can I enable experimental features?',
          answer: 'Yes, experimental features can be enabled here. Use with caution on production sites.'
        }
      ]
    },
    maintenance: {
      title: 'Maintenance Mode',
      description: 'Control site maintenance status',
      steps: [
        'Toggle maintenance mode on/off',
        'Set custom maintenance message for visitors',
        'Configure admin bypass option',
        'Test maintenance page appearance',
        'Disable maintenance mode when ready'
      ],
      faqs: [
        {
          question: 'What happens during maintenance mode?',
          answer: 'Visitors see a maintenance message while admins can still access the site if bypass is enabled.'
        },
        {
          question: 'Can admins access the site during maintenance?',
          answer: 'Yes, if admin bypass is enabled, admins can still access and work on the site during maintenance.'
        }
      ]
    },
    church_info: {
      title: 'Church Information',
      description: 'Basic church details',
      steps: [
        'Enter the official church name',
        'Set physical address and location',
        'Configure contact phone and email',
        'Add pastor name and leadership info',
        'Include Google Maps embed URL'
      ],
      faqs: [
        {
          question: 'Where does church information appear?',
          answer: 'Church information appears on the About page, footer, and other relevant sections.'
        },
        {
          question: 'How do I get a Google Maps embed URL?',
          answer: 'Go to Google Maps, find your location, click Share, then Embed to get the embed URL.'
        }
      ]
    },
    streaming: {
      title: 'Service Streaming',
      description: 'Configure live streaming options',
      steps: [
        'Add YouTube live stream URL',
        'Configure Facebook stream URL',
        'Set Zoom meeting link for online services',
        'Define streaming schedule information',
        'Test streaming links before services'
      ],
      faqs: [
        {
          question: 'What streaming platforms are supported?',
          answer: 'We support YouTube, Facebook, and Zoom for live streaming services.'
        },
        {
          question: 'Do I need separate accounts for each platform?',
          answer: 'Yes, you need active accounts on each platform you want to use for streaming.'
        }
      ]
    },
    banner: {
      title: 'Announcement Banner',
      description: 'Manage site announcement banners',
      steps: [
        'Toggle banner visibility on/off',
        'Set banner message text',
        'Choose banner background color',
        'Add optional link URL for banner',
        'Set banner expiry date if needed'
      ],
      faqs: [
        {
          question: 'Where does the banner appear?',
          answer: 'The announcement banner appears at the top of every page when enabled.'
        },
        {
          question: 'Can I schedule banners?',
          answer: 'Yes, set an expiry date to automatically hide the banner after a specific date.'
        }
      ]
    },
    notifications: {
      title: 'Email Notifications',
      description: 'Configure email notification settings',
      steps: [
        'Set system notification email address',
        'Toggle notifications for new members',
        'Enable event signup notifications',
        'Configure prayer request alerts',
        'Set donation and department request notifications'
      ],
      faqs: [
        {
          question: 'What events trigger notifications?',
          answer: 'Notifications can be triggered by new member registrations, event signups, prayer requests, donations, and more.'
        },
        {
          question: 'Can notifications be sent to multiple emails?',
          answer: 'Currently, notifications are sent to a single system email. Configure email forwarding for multiple recipients.'
        }
      ]
    },
    seo: {
      title: 'SEO & Analytics',
      description: 'Optimize site for search engines',
      steps: [
        'Set site title for search engines',
        'Write meta description for search results',
        'Add Google Analytics tracking ID',
        'Configure Search Console verification',
        'Save to improve search engine visibility'
      ],
      faqs: [
        {
          question: 'What is a meta description?',
          answer: 'A meta description is a short summary that appears in search engine results, helping users understand your page content.'
        },
        {
          question: 'How do I get Google Analytics ID?',
          answer: 'Create a Google Analytics account, add your property, and copy the tracking ID (format: UA-XXXXX-Y).'
        }
      ]
    },
    uploads: {
      title: 'File Upload Settings',
      description: 'Configure file upload restrictions',
      steps: [
        'Set maximum file size in MB',
        'Define allowed file types and extensions',
        'Configure maximum image dimensions',
        'Enable or disable auto image compression',
        'Save to apply upload restrictions'
      ],
      faqs: [
        {
          question: 'What file types are allowed?',
          answer: 'Configure allowed file types based on your needs. Common types include images, PDFs, and documents.'
        },
        {
          question: 'Does auto-compression affect image quality?',
          answer: 'Auto-compression reduces file size while maintaining reasonable quality for web use.'
        }
      ]
    },
    security: {
      title: 'Security Settings',
      description: 'Configure site security options',
      steps: [
        'Set session timeout duration',
        'Require email verification for new users',
        'Configure password complexity requirements',
        'Enable two-factor authentication',
        'Set failed login lockout threshold'
      ],
      faqs: [
        {
          question: 'What is session timeout?',
          answer: 'Session timeout automatically logs users out after a period of inactivity for security.'
        },
        {
          question: 'Should I enable 2FA?',
          answer: 'Yes, 2FA significantly improves security by requiring a second verification step.'
        }
      ]
    },
    user_defaults: {
      title: 'Default User Settings',
      description: 'Configure default user behavior',
      steps: [
        'Set default role for new users',
        'Configure auto department assignment',
        'Enable welcome email for new members',
        'Customize welcome email template',
        'Save to apply default user settings'
      ],
      faqs: [
        {
          question: 'What is the default user role?',
          answer: 'New users are assigned this role by default. Common options are Member or Visitor.'
        },
        {
          question: 'Can I customize the welcome email?',
          answer: 'Yes, you can customize the welcome email content and template.'
        }
      ]
    },
    moderation: {
      title: 'Content Moderation',
      description: 'Configure content approval settings',
      steps: [
        'Enable auto-approval for comments',
        'Configure profanity filter settings',
        'Set approval requirements for photos',
        'Configure announcement approval process',
        'Set event and prayer request approval rules'
      ],
      faqs: [
        {
          question: 'What is auto-approval?',
          answer: 'Auto-approval automatically publishes content without requiring admin review.'
        },
        {
          question: 'How does the profanity filter work?',
          answer: 'The profanity filter automatically detects and blocks inappropriate language in user content.'
        }
      ]
    },
    backups: {
      title: 'Backup Settings',
      description: 'Configure automated backups',
      steps: [
        'Enable automatic database backups',
        'Set backup frequency (daily/weekly/monthly)',
        'Configure backup retention period',
        'Set backup notification email',
        'Save to enable automated backups'
      ],
      faqs: [
        {
          question: 'How often should I backup?',
          answer: 'Daily backups are recommended for active sites. Weekly may suffice for less active sites.'
        },
        {
          question: 'Where are backups stored?',
          answer: 'Backups are stored securely and can be restored when needed.'
        }
      ]
    },
    event_settings: {
      title: 'Event Settings',
      description: 'Configure event management options',
      steps: [
        'Enable event registration functionality',
        'Set default maximum attendees',
        'Enable event waitlist when full',
        'Require approval for public events',
        'Configure event reminder timing'
      ],
      faqs: [
        {
          question: 'What is the waitlist feature?',
          answer: 'Waitlist allows users to join a queue when an event is full, getting notified if spots become available.'
        },
        {
          question: 'When are event reminders sent?',
          answer: 'Reminders are sent based on the configured hours before the event start time.'
        }
      ]
    },
    giving: {
      title: 'Donation & Giving',
      description: 'Configure online giving options',
      steps: [
        'Enable online giving functionality',
        'Set suggested donation amounts',
        'Configure default donation categories',
        'Require donor information for donations',
        'Enable automatic donation receipts'
      ],
      faqs: [
        {
          question: 'What payment methods support donations?',
          answer: 'Donations use the same payment methods configured in Payment Settings, typically M-Pesa.'
        },
        {
          question: 'Are donation receipts automatic?',
          answer: 'Yes, receipts are automatically sent to donors when enabled.'
        }
      ]
    },
    volunteers: {
      title: 'Volunteer Management',
      description: 'Configure volunteer signup options',
      steps: [
        'Enable volunteer signup functionality',
        'Set volunteer coordinator email',
        'Require background checks for volunteers',
        'Configure auto volunteer role assignment',
        'Save to apply volunteer settings'
      ],
      faqs: [
        {
          question: 'What is the volunteer coordinator email?',
          answer: 'This email receives notifications when new volunteers sign up.'
        },
        {
          question: 'Should I require background checks?',
          answer: 'Background checks are recommended for volunteers working with children or sensitive roles.'
        }
      ]
    }
  }

  if (loading) {
    return <FullPageLoading />
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Site Settings</h1>
          <p className="text-[var(--color-textSecondary)]">Manage site-wide configuration</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleReset}
            disabled={saving}
            className="btn-secondary"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saving || Object.keys(changes).length === 0 || !canManageSettings}
            className="btn-primary"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="border-b border-[var(--color-border)] mb-4">
        <nav className="flex space-x-6 overflow-x-auto scrollbar-hide" aria-label="Main Tabs">
          {Object.entries(tabGroups).map(([key, group]) => {
            const Icon = getIconForGroup(group.icon)
            return (
              <button
                key={key}
                onClick={() => setActiveMainTab(key)}
                className={`flex items-center gap-2 whitespace-nowrap py-3 px-3 border-b-2 font-medium text-sm transition-all ${
                  activeMainTab === key
                    ? 'border-[var(--color-accent)] text-[var(--color-text)]'
                    : 'border-transparent text-[var(--color-textSecondary)] hover:text-[var(--color-text)] hover:border-[var(--color-border)]'
                }`}
              >
                <Icon size={16} />
                {group.name}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Sub-Tab Navigation */}
      <div className="border-b border-[var(--color-border)] mb-6">
        <nav className="flex space-x-6 overflow-x-auto scrollbar-hide" aria-label="Sub Tabs">
          {tabGroups[activeMainTab]?.categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-all ${
                activeCategory === category
                  ? 'border-[var(--color-accent)] text-[var(--color-text)]'
                  : 'border-transparent text-[var(--color-textSecondary)] hover:text-[var(--color-text)] hover:border-[var(--color-border)]'
              }`}
            >
              {categoryNames[category] || category}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-[var(--color-surface)] rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">
          {categoryNames[activeCategory] || activeCategory}
        </h2>
        
        {activeCategory === 'appearance' && (
          <PaletteSelector
            selectedPalette={settings.appearance?.find(s => s.key === 'selected_palette')?.value}
            onSelect={(palette) => {
              Object.entries(palette).forEach(([key, value]) => {
                if (key !== 'name') {
                  handleChange('appearance', key, value)
                }
              })
            }}
          />
        )}
        
        {settings[activeCategory] && settings[activeCategory].length > 0 ? (
          <div className="space-y-6">
            {settings[activeCategory].map(renderSetting)}
          </div>
        ) : (
          <p className="text-[var(--color-textSecondary)]">No settings in this category</p>
        )}
      </div>

      {/* Page Info Panel */}
      {categoryHelpContent[activeCategory] && (
        <PageInfoPanel
          title={categoryHelpContent[activeCategory].title}
          description={categoryHelpContent[activeCategory].description}
          steps={categoryHelpContent[activeCategory].steps}
          faqs={categoryHelpContent[activeCategory].faqs}
          defaultOpen={false}
        />
      )}
    </div>
  )
}

export default SiteSettings
