import { useState, useEffect } from 'react'
import { Send, Users, Clock, CheckCircle, DollarSign, Upload, Download, X, FileText, BarChart3, LayoutTemplate } from 'lucide-react'
import Card from '../components/common/Card'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

const SMS = () => {
  const { user, api } = useAuth()
  const toast = useToast()
  const [activeTab, setActiveTab] = useState('compose')
  const [message, setMessage] = useState('')
  const [recipients, setRecipients] = useState('all')
  const [sending, setSending] = useState(false)
  const [sentMessages, setSentMessages] = useState([])
  const [balance, setBalance] = useState(null)
  const [csvNumbers, setCsvNumbers] = useState([])
  const [csvFileName, setCsvFileName] = useState('')
  const [showCsvUpload, setShowCsvUpload] = useState(false)
  const [manualNumbers, setManualNumbers] = useState('')
  const [departments, setDepartments] = useState([])
  const [smsGroups, setSmsGroups] = useState([])
  const [templates, setTemplates] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [analytics, setAnalytics] = useState(null)

  useEffect(() => {
    fetchSMSHistory()
    fetchSMSBalance()
    fetchDepartments()
    fetchSmsGroups()
  }, [])

  const fetchSmsGroups = async () => {
    try {
      const response = await api.get('/sms-groups')
      setSmsGroups(response.data.data?.groups || response.data.groups || [])
    } catch (error) {
      console.error('Failed to fetch SMS groups:', error)
    }
  }

  const fetchTemplates = async () => {
    try {
      const response = await api.get('/sms/templates')
      setTemplates(response.data.data?.templates || response.data.templates || [])
    } catch (error) {
      toast.error('Failed to load templates')
    }
  }

  const fetchCampaigns = async () => {
    try {
      const response = await api.get('/sms/campaigns')
      setCampaigns(response.data.data?.campaigns || response.data.campaigns || [])
    } catch (error) {
      toast.error('Failed to load campaigns')
    }
  }

  const fetchAnalytics = async () => {
    try {
      const response = await api.get('/sms/analytics')
      setAnalytics(response.data.data?.analytics || null)
    } catch (error) {
      toast.error('Failed to load analytics')
    }
  }

  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
    // Lazy-load each tab's data on first visit
    if (tabId === 'templates' && templates.length === 0) fetchTemplates()
    if (tabId === 'campaigns' && campaigns.length === 0) fetchCampaigns()
    if (tabId === 'analytics' && !analytics) fetchAnalytics()
  }

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments')
      if (response.data.success) {
        setDepartments(response.data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch departments:', error)
    }
  }

  const fetchSMSHistory = async () => {
    try {
      const response = await api.get('/sms/history')
      if (response.data.success && Array.isArray(response.data.data)) {
        setSentMessages(response.data.data.map(msg => ({
          id: msg.id,
          message: msg.message,
          recipients: msg.recipient_type === 'all' ? 'All Members' : msg.recipient_type,
          sentAt: msg.sent_at ? new Date(msg.sent_at).toLocaleString() : 'N/A',
          status: msg.successful_count > 0 ? 'delivered' : 'failed',
          count: msg.recipient_count
        })))
      }
    } catch (error) {
      console.error('Failed to fetch SMS history:', error)
      toast.error('Failed to load SMS history')
    }
  }

  const fetchSMSBalance = async () => {
    try {
      const response = await api.get('/sms/balance')
      if (response.data.success) {
        setBalance(response.data.data)
      }
    } catch (error) {
      console.error('Failed to fetch SMS balance:', error)
      toast.error('Failed to load SMS balance')
    }
  }

  const handleCSVUpload = (event) => {
    const file = event.target.files[0]
    if (!file) return

    setCsvFileName(file.name)
    const reader = new FileReader()

    reader.onload = (e) => {
      const text = e.target.result
      const numbers = parseCSV(text)
      setCsvNumbers(numbers)
    }

    reader.readAsText(file)
  }

  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim())
    const numbers = []
    
    lines.forEach((line, index) => {
      // Skip header if it exists
      if (index === 0 && line.toLowerCase().includes('phone')) return
      
      // Extract phone numbers from CSV
      const columns = line.split(',').map(col => col.trim().replace(/"/g, ''))
      columns.forEach(column => {
        // Check if column looks like a phone number
        const phoneRegex = /[\d\s\-()+]/
        const match = column.match(phoneRegex)
        if (match) {
          const phone = match[0].replace(/\D/g, '')
          if (phone.length >= 9) { // Valid phone number length
            numbers.push(phone)
          }
        }
      })
    })
    
    return [...new Set(numbers)] // Remove duplicates
  }

  // L631: telegram/notifications tabs were placeholder boxes duplicating real
  // pages at /dashboard/telegram/* and /dashboard/notifications — removed.
  const smsTabs = [
    { id: 'compose', label: 'Compose', icon: Send },
    { id: 'templates', label: 'Templates', icon: LayoutTemplate },
    { id: 'campaigns', label: 'Campaigns', icon: FileText },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ]

  // Normalize Kenyan phone inputs to E.164 — backend sendSMS rejects anything else.
  const toE164 = (raw) => {
    const digits = String(raw || '').replace(/\D/g, '')
    if (!digits) return null
    if (digits.startsWith('254') && digits.length === 12) return `+${digits}`
    if (digits.startsWith('0') && digits.length === 10) return `+254${digits.slice(1)}`
    if (digits.length === 9) return `+254${digits}`
    if (digits.length >= 11 && digits.length <= 15) return `+${digits}`
    return null
  }

  // Resolve the selected recipient option to a phone array — the backend
  // contract is recipients: string[] of E.164 numbers (no group keywords).
  const resolveRecipientPhones = async () => {
    if (recipients === 'manual') {
      return manualNumbers.split(',').map(toE164).filter(Boolean)
    }
    if (recipients === 'csv') {
      return csvNumbers.map(toE164).filter(Boolean)
    }
    if (recipients.startsWith('dept-')) {
      const deptId = recipients.slice(5)
      const response = await api.get(`/departments/${deptId}/members`)
      const members = response.data.members || []
      return members.map(m => toE164(m.phone_number)).filter(Boolean)
    }
    if (recipients.startsWith('group-')) {
      const groupId = recipients.slice(6)
      const response = await api.get(`/sms-groups/${groupId}/members`)
      const contacts = response.data.data?.contacts || response.data.contacts || []
      return contacts.map(c => toE164(c.phone)).filter(Boolean)
    }
    // 'all' → every active SMS contact in this church's list
    const response = await api.get('/sms-contacts', { params: { limit: 5000 } })
    const contacts = response.data.data?.contacts || response.data.contacts || []
    return contacts.map(c => toE164(c.phone)).filter(Boolean)
  }

  const handleSendSMS = async (e) => {
    e?.preventDefault()
    if (!message.trim()) return

    setSending(true)
    try {
      const phones = await resolveRecipientPhones()
      if (phones.length === 0) {
        toast.error('No valid phone numbers found for the selected recipients')
        return
      }

      const response = await api.post('/sms/send-blessed', {
        message,
        recipients: phones,
      })

      if (response.data.success) {
        // Refresh history and balance
        await fetchSMSHistory()
        await fetchSMSBalance()

        setMessage('')
        setRecipients('all')

        const d = response.data.data || {}
        toast.success(`SMS queued: ${d.totalRecipients ?? phones.length} recipients (${d.batchCount ?? 1} batch(es))`)
      } else {
        toast.error(`Failed to send SMS: ${response.data.message}`)
      }
    } catch (error) {
      console.error('Failed to send SMS:', error)
      toast.error(error.response?.data?.error || 'Failed to send SMS. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const downloadSampleCSV = () => {
    const csvContent = `phone,name
254712345678,John Doe
254723456789,Jane Smith
254734567890,Bob Johnson
254745678901,Alice Brown`
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sample_phone_numbers.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">SMS Messaging</h1>
        <p className="page-subtitle">Send text messages to church members and groups</p>
        {balance && (
          <div className="mt-2 flex items-center gap-2 text-sm">
            <DollarSign size={16} className="text-[var(--color-success)]" />
            <span className="font-medium">SMS Balance: {balance.balance} {balance.currency}</span>
            {balance.message && (
              <span className="text-[var(--color-textSecondary)]">({balance.message})</span>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[var(--color-border)] ">
        {smsTabs.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'border-transparent text-[var(--color-textSecondary)]  hover:text-[var(--color-text)]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'compose' && (
        <>

      {/* Send SMS Form */}
      <Card>
        <h3 className="text-lg font-bold text-[var(--color-text)] mb-4 flex items-center gap-2">
          <span className="w-1 h-5 bg-[var(--color-primary)] rounded-full"></span>
          Send New Message
        </h3>
        
        <form onSubmit={handleSendSMS} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)]  mb-2">
              Recipients
            </label>
            <select
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg bg-[var(--color-surface)]  text-[var(--color-text)]  focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            >
              <option value="all">All SMS Contacts</option>
              {smsGroups.length > 0 && (
                <optgroup label="SMS Groups">
                  {smsGroups.map((group) => (
                    <option key={group.id} value={`group-${group.id}`}>
                      {group.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {departments.length > 0 && (
                <optgroup label="Departments">
                  {departments.map((dept) => (
                    <option key={dept.id} value={`dept-${dept.id}`}>
                      {dept.name}
                    </option>
                  ))}
                </optgroup>
              )}
              <option value="manual">Enter Phone Numbers</option>
              <option value="csv">CSV Upload</option>
            </select>
          </div>

          {/* Manual Phone Numbers Section */}
          {recipients === 'manual' && (
            <div className="border border-[var(--color-border)]  rounded-lg p-4 bg-[var(--color-background)] ">
              <h4 className="text-sm font-medium text-[var(--color-text)]  mb-3">
                Enter Phone Numbers
              </h4>
              
              <div className="space-y-3">
                <textarea
                  value={manualNumbers}
                  onChange={(e) => setManualNumbers(e.target.value)}
                  placeholder="Enter phone numbers separated by commas..."
                  rows={3}
                  className="w-full px-3 py-2 border border-[var(--color-border)]  rounded-lg bg-[var(--color-surface)]  text-[var(--color-text)]  focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none"
                />
                
                <div className="text-xs text-[var(--color-textSecondary)] ">
                  Enter phone numbers separated by commas. Supports formats: +254724363290, 254724363290, 0724363290, 724363290
                </div>
                
                {manualNumbers && (
                  <div className="text-sm text-[var(--color-primary)]">
                    📱 {manualNumbers.split(',').filter(n => n.trim()).length} phone numbers ready
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CSV Upload Section */}
          {recipients === 'csv' && (
            <div className="border border-[var(--color-border)]  rounded-lg p-4 bg-[var(--color-background)] ">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-[var(--color-text)] ">
                  Upload Phone Numbers
                </h4>
                <button
                  type="button"
                  onClick={downloadSampleCSV}
                  className="flex items-center gap-1 text-xs text-[var(--color-primary)] hover:text-[var(--color-primary)]"
                >
                  <Download size={12} />
                  Download Sample
                </button>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCSVUpload}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label
                    htmlFor="csv-upload"
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-[var(--color-on-solid)] rounded-lg hover:bg-[var(--color-primary)] cursor-pointer transition-colors"
                  >
                    <Upload size={16} />
                    Choose CSV File
                  </label>
                  
                  {csvFileName && (
                    <div className="flex items-center gap-2 text-sm text-[var(--color-textSecondary)] ">
                      <span className="truncate">{csvFileName}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setCsvFileName('')
                          setCsvNumbers([])
                        }}
                        className="text-[var(--color-error)] hover:text-[var(--color-error)]"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>
                
                {csvNumbers.length > 0 && (
                  <div className="text-sm text-[var(--color-success)]">
                    ✅ {csvNumbers.length} phone numbers loaded from CSV
                  </div>
                )}
                
                <div className="text-xs text-[var(--color-textSecondary)] ">
                  CSV should have a &lsquo;phone&rsquo; column. Supports formats: 254712345678, 0712345678, 712345678
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[var(--color-text)]  mb-2">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              rows={4}
              maxLength={160}
              className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg bg-[var(--color-surface)]  text-[var(--color-text)]  focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none"
            />
            <div className="text-sm text-[var(--color-textSecondary)]  mt-1">
              {message.length}/160 characters
            </div>
          </div>

          <button
            type="submit"
            disabled={sending || !message.trim()}
            className="flex items-center gap-2 px-6 py-2 bg-[var(--color-primary)] text-[var(--color-on-solid)] rounded-lg hover:bg-[var(--color-primary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={16} />
            {sending ? 'Sending...' : 'Send SMS'}
          </button>
        </form>
      </Card>

      {/* Sent Messages */}
      <Card>
        <h3 className="text-lg font-bold text-[var(--color-text)] mb-4 flex items-center gap-2">
          <span className="w-1 h-5 bg-[var(--color-success)] rounded-full"></span>
          Recent Messages
        </h3>

        <div className="space-y-4">
          {sentMessages.map((msg) => (
            <div key={msg.id} className="border border-[var(--color-border)]  rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Users size={16} className="text-[var(--color-textSecondary)]" />
                    <span className="font-medium text-[var(--color-text)] ">
                      {msg.recipients}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[var(--color-textSecondary)] ">
                    <Clock size={14} />
                    {msg.sentAt}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-[var(--color-success)]" />
                  <span className="text-sm text-[var(--color-success)]">
                    Delivered
                  </span>
                </div>
              </div>
              
              <p className="text-[var(--color-text)]  mb-2">
                {msg.message}
              </p>
              
              <div className="text-sm text-[var(--color-textSecondary)] ">
                Sent to {msg.count} recipients
              </div>
            </div>
          ))}
        </div>
      </Card>
        </>
      )}

      {activeTab === 'templates' && (
        <Card>
          <h2 className="text-lg font-semibold mb-4">SMS Templates</h2>
          {templates.length === 0 ? (
            <p className="text-[var(--color-textSecondary)]">No templates created yet.</p>
          ) : (
            <div className="space-y-3">
              {templates.map((t) => (
                <div key={t.id} className="border border-[var(--color-border)] rounded-lg p-4">
                  <p className="font-medium text-[var(--color-text)]">{t.name || t.title}</p>
                  <p className="text-sm text-[var(--color-textSecondary)] mt-1">{t.content || t.body || t.message}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === 'campaigns' && (
        <Card>
          <h2 className="text-lg font-semibold mb-4">SMS Campaigns</h2>
          {campaigns.length === 0 ? (
            <p className="text-[var(--color-textSecondary)]">No campaigns created yet.</p>
          ) : (
            <div className="space-y-3">
              {campaigns.map((c) => (
                <div key={c.id} className="border border-[var(--color-border)] rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-[var(--color-text)]">{c.name}</p>
                    <p className="text-sm text-[var(--color-textSecondary)]">
                      {c.status}{c.sent_count != null ? ` · ${c.sent_count} sent` : ''}
                      {c.scheduled_date ? ` · ${new Date(c.scheduled_date).toLocaleDateString()}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === 'analytics' && (
        <Card>
          <h2 className="text-lg font-semibold mb-4">SMS Analytics</h2>
          {!analytics ? (
            <p className="text-[var(--color-textSecondary)]">Loading analytics...</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                ['Total Sent', analytics.totalSent],
                ['Delivery Rate', analytics.deliveryRate != null ? `${analytics.deliveryRate}%` : null],
                ['Response Rate', analytics.responseRate != null ? `${analytics.responseRate}%` : null],
                ['Total Cost', analytics.totalCost != null ? `KES ${analytics.totalCost}` : null],
              ].map(([label, value]) => (
                <div key={label} className="p-4 bg-[var(--color-background)] rounded-lg text-center">
                  <p className="text-2xl font-bold text-[var(--color-text)]">{value ?? '—'}</p>
                  <p className="text-sm text-[var(--color-textSecondary)]">{label}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

export default SMS
