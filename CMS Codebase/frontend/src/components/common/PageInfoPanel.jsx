import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, BookOpen, AlertTriangle, HelpCircle, XCircle, CheckCircle, Info } from 'lucide-react'

const LEVEL_CONFIG = {
  error: {
    icon: XCircle,
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    text: 'text-red-500',
    badge: 'bg-red-500 text-white',
  },
  warn: {
    icon: AlertTriangle,
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    text: 'text-amber-500',
    badge: 'bg-amber-500 text-white',
  },
  info: {
    icon: Info,
    bg: 'bg-primary/10',
    border: 'border-primary/20',
    text: 'text-primary',
    badge: 'bg-primary text-white',
  },
  success: {
    icon: CheckCircle,
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
    text: 'text-green-500',
    badge: 'bg-green-500 text-white',
  },
}

const StatusItem = ({ level = 'info', message, detail }) => {
  const cfg = LEVEL_CONFIG[level] || LEVEL_CONFIG.info
  const Icon = cfg.icon
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${cfg.bg} ${cfg.border}`}>
      <Icon size={16} className={`mt-0.5 shrink-0 ${cfg.text}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${cfg.text}`}>{message}</p>
        {detail && <p className="text-xs text-[var(--color-textSecondary)] mt-0.5">{detail}</p>}
      </div>
    </div>
  )
}

const PageInfoPanel = ({
  title,
  description,
  steps = [],
  faqs = [],
  fetchStatus = null,
  className = '',
  defaultOpen = false,
}) => {
  const [open, setOpen] = useState(defaultOpen)
  const [activeTab, setActiveTab] = useState('help')
  const [statusItems, setStatusItems] = useState([])
  const [statusLoading, setStatusLoading] = useState(false)
  const [statusLoaded, setStatusLoaded] = useState(false)

  useEffect(() => {
    if (open && activeTab === 'status' && !statusLoaded && fetchStatus) {
      loadStatus()
    }
  }, [open, activeTab])

  const loadStatus = async () => {
    if (!fetchStatus) return
    setStatusLoading(true)
    try {
      const items = await fetchStatus()
      setStatusItems(Array.isArray(items) ? items : [])
    } catch {
      setStatusItems([{ level: 'error', message: 'Failed to load status information.' }])
    } finally {
      setStatusLoading(false)
      setStatusLoaded(true)
    }
  }

  const handleTabChange = tab => {
    setActiveTab(tab)
    if (tab === 'status' && !statusLoaded && fetchStatus) {
      loadStatus()
    }
  }

  const errorCount = statusItems.filter(i => i.level === 'error').length
  const warnCount = statusItems.filter(i => i.level === 'warn').length
  const hasBadge = errorCount + warnCount > 0

  return (
    <div className={`mt-6 border border-[var(--color-border)] rounded-xl overflow-hidden ${className}`}>
      {/* Header toggle */}
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between px-5 py-3 bg-[var(--color-background)] hover:bg-[var(--color-surface)] transition-colors"
        aria-expanded={open}
        aria-controls="page-info-panel"
        aria-label={open ? 'Collapse page guide' : 'Expand page guide'}
      >
        <div className="flex items-center gap-2">
          <HelpCircle size={16} className="text-[var(--color-primary)]" />
          <span className="text-sm font-semibold text-[var(--color-text)]">
            {title ? `About: ${title}` : 'Page Guide'}
          </span>
          {description && (
            <span className="hidden sm:inline text-xs text-[var(--color-textSecondary)]">
              — {description}
            </span>
          )}
          {hasBadge && (
            <span
              className={`ml-2 text-xs font-bold rounded-full px-2 py-0.5 ${
                errorCount > 0
                  ? 'bg-red-100 text-red-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {errorCount > 0
                ? `${errorCount} error${errorCount > 1 ? 's' : ''}`
                : `${warnCount} warning${warnCount > 1 ? 's' : ''}`}
            </span>
          )}
        </div>
        {open ? (
          <ChevronUp size={16} className="text-[var(--color-textSecondary)]" />
        ) : (
          <ChevronDown size={16} className="text-[var(--color-textSecondary)]" />
        )}
      </button>

      {/* Panel body */}
      {open && (
        <div id="page-info-panel" className="bg-[var(--color-surface)]">
          {/* Tab bar */}
          <div className="flex border-b border-[var(--color-border)] px-5" role="tablist" aria-label="Page information tabs">
            <button
              onClick={() => handleTabChange('help')}
              id="help-tab"
              role="tab"
              aria-selected={activeTab === 'help'}
              aria-controls="help-panel"
              className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === 'help'
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'border-transparent text-[var(--color-textSecondary)] hover:text-[var(--color-text)]'
              }`}
            >
              <BookOpen size={14} />
              How to Use
            </button>
            {fetchStatus && (
              <button
                onClick={() => handleTabChange('status')}
                id="status-tab"
                role="tab"
                aria-selected={activeTab === 'status'}
                aria-controls="status-panel"
                className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === 'status'
                    ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                    : 'border-transparent text-[var(--color-textSecondary)] hover:text-[var(--color-text)]'
                }`}
              >
                <AlertTriangle size={14} />
                Status & Issues
                {hasBadge && statusLoaded && (
                  <span
                    className={`ml-1 text-xs font-bold rounded-full px-1.5 py-0.5 ${
                      errorCount > 0 ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'
                    }`}
                  >
                    {errorCount + warnCount}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Tab content */}
          <div className="p-5">
            {/* How to Use Tab */}
            {activeTab === 'help' && (
              <div id="help-panel" role="tabpanel" aria-labelledby="help-tab" className="grid md:grid-cols-2 gap-6">
                {steps.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3">
                      Step-by-Step Guide
                    </h4>
                    <ol className="space-y-2">
                      {steps.map((step, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="shrink-0 w-6 h-6 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs font-bold flex items-center justify-center mt-0.5">
                            {i + 1}
                          </span>
                          <span className="text-sm text-[var(--color-textSecondary)]">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {faqs.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3">
                      Common Questions
                    </h4>
                    <div className="space-y-3">
                      {faqs.map((faq, i) => (
                        <div key={i} className="p-3 bg-[var(--color-background)] rounded-lg">
                          <p className="text-sm font-medium text-[var(--color-text)] mb-1">
                            {faq.question}
                          </p>
                          <p className="text-xs text-[var(--color-textSecondary)]">{faq.answer}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Status & Issues Tab */}
            {activeTab === 'status' && (
              <div id="status-panel" role="tabpanel" aria-labelledby="status-tab">
                {statusLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
                  </div>
                ) : statusItems.length > 0 ? (
                  <div className="space-y-2">
                    {statusItems.map((item, i) => (
                      <StatusItem key={i} {...item} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-[var(--color-textSecondary)]">
                    <CheckCircle size={32} className="mx-auto mb-2 text-green-500" />
                    <p className="text-sm">No issues detected</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default PageInfoPanel
