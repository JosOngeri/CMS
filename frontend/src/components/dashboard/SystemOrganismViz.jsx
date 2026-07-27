import { useState, useEffect } from 'react'
import { Server, Database, Activity, Shield, CheckCircle, AlertTriangle, Cpu, HardDrive, Globe, Zap } from 'lucide-react'
import { useColorPalette } from '../../contexts/ColorPaletteContext'

const SystemOrganismViz = ({ systemData, healthData, performanceData, className = '' }) => {
  const { colors } = useColorPalette()
  const [activeTab, setActiveTab] = useState('overview')

  // Default data if not provided
  const defaultSystemData = systemData || {
    totalServices: 8,
    activeServices: 7,
    degradedServices: 1,
    systemUptime: 99.9
  }

  const defaultHealthData = healthData || {
    databaseHealth: 'healthy',
    apiHealth: 'healthy',
    cacheHealth: 'healthy',
    storageHealth: 'healthy'
  }

  const defaultPerformanceData = performanceData || {
    cpuUsage: 45,
    memoryUsage: 60,
    diskUsage: 55,
    networkLatency: 25
  }

  // Organism/body metaphor for system health
  const renderSystemOverview = () => {
    const systemMetrics = [
      { label: 'Total Services', value: defaultSystemData.totalServices, icon: Server, color: 'text-[var(--color-primary)]' },
      { label: 'Active Services', value: defaultSystemData.activeServices, icon: CheckCircle, color: 'text-[var(--color-success)]' },
      { label: 'Degraded Services', value: defaultSystemData.degradedServices, icon: AlertTriangle, color: 'text-[var(--color-warning)]' },
      { label: 'System Uptime', value: `${defaultSystemData.systemUptime}%`, icon: Activity, color: 'text-[var(--color-secondary)]' }
    ]

    return (
      <div className="space-y-4">
        <h4 className="font-semibold text-[var(--color-text)] mb-4">System Organism Overview</h4>
        
        {/* Organism visualization */}
        <div className="relative">
          <div className="flex items-center justify-center mb-6">
            <div className="relative w-40 h-40">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="var(--color-border)"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="var(--color-success)"
                  strokeWidth="8"
                  strokeDasharray={`${(defaultSystemData.activeServices / defaultSystemData.totalServices) * 251.2} 251.2`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-[var(--color-text)]">
                  {Math.round((defaultSystemData.activeServices / defaultSystemData.totalServices) * 100)}%
                </span>
                <span className="text-xs text-[var(--color-textSecondary)]">System Health</span>
              </div>
            </div>
          </div>

          {/* System metrics */}
          <div className="grid grid-cols-2 gap-3">
            {systemMetrics.map((metric, index) => {
              const Icon = metric.icon
              return (
                <div key={index} className="flex items-center gap-3 p-3 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
                  <div className={`p-2 rounded-lg ${metric.color} bg-opacity-10`}>
                    <Icon size={16} aria-hidden="true" />
                  </div>
                  <div>
                    <div className="text-xs text-[var(--color-textSecondary)]">{metric.label}</div>
                    <div className="text-sm font-semibold text-[var(--color-text)]">{metric.value}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // Component health display
  const renderComponentHealth = () => {
    const componentHealth = [
      { name: 'Database', status: defaultHealthData.databaseHealth, icon: Database },
      { name: 'API Server', status: defaultHealthData.apiHealth, icon: Server },
      { name: 'Cache', status: defaultHealthData.cacheHealth, icon: Zap },
      { name: 'Storage', status: defaultHealthData.storageHealth, icon: HardDrive }
    ]

    const getStatusColor = (status) => {
      switch (status) {
        case 'healthy': return 'text-[var(--color-success)] bg-[var(--color-success)]-10'
        case 'degraded': return 'text-[var(--color-warning)] bg-[var(--color-warning)]-10'
        case 'critical': return 'text-[var(--color-error)] bg-[var(--color-error)]-10'
        default: return 'text-[var(--color-textSecondary)] bg-[var(--color-border)]'
      }
    }

    const getStatusIcon = (status) => {
      switch (status) {
        case 'healthy': return CheckCircle
        case 'degraded': return AlertTriangle
        case 'critical': return AlertTriangle
        default: return Activity
      }
    }

    return (
      <div className="space-y-4">
        <h4 className="font-semibold text-[var(--color-text)] mb-4">Component Health</h4>
        
        <div className="space-y-3">
          {componentHealth.map((component, index) => {
            const Icon = getStatusIcon(component.status)
            const statusColor = getStatusColor(component.status)
            
            return (
              <div key={index} className="flex items-center gap-3 p-4 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
                <div className={`p-2 rounded-lg ${statusColor}`}>
                  <Icon size={20} aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-[var(--color-text)]">{component.name}</div>
                  <div className="text-xs text-[var(--color-textSecondary)] capitalize">{component.status}</div>
                </div>
                <component.icon size={20} className="text-[var(--color-textSecondary)]" aria-hidden="true" />
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Performance metrics
  const renderPerformance = () => {
    const performanceMetrics = [
      { label: 'CPU Usage', value: `${defaultPerformanceData.cpuUsage}%`, icon: Cpu, threshold: 80 },
      { label: 'Memory Usage', value: `${defaultPerformanceData.memoryUsage}%`, icon: HardDrive, threshold: 85 },
      { label: 'Disk Usage', value: `${defaultPerformanceData.diskUsage}%`, icon: HardDrive, threshold: 90 },
      { label: 'Network Latency', value: `${defaultPerformanceData.networkLatency}ms`, icon: Globe, threshold: 100 }
    ]

    return (
      <div className="space-y-4">
        <h4 className="font-semibold text-[var(--color-text)] mb-4">System Performance</h4>
        
        <div className="space-y-3">
          {performanceMetrics.map((metric, index) => {
            const Icon = metric.icon
            const value = parseInt(metric.value)
            const isCritical = value > metric.threshold
            const isWarning = value > metric.threshold * 0.8 && value <= metric.threshold
            const statusColor = isCritical ? 'text-[var(--color-error)]' : isWarning ? 'text-[var(--color-warning)]' : 'text-[var(--color-success)]'
            const bgColor = isCritical ? 'bg-[var(--color-error)]-10' : isWarning ? 'bg-[var(--color-warning)]-10' : 'bg-[var(--color-success)]-10'
            
            return (
              <div key={index} className="p-4 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${bgColor} ${statusColor}`}>
                      <Icon size={16} aria-hidden="true" />
                    </div>
                    <span className="text-sm font-medium text-[var(--color-text)]">{metric.label}</span>
                  </div>
                  <span className={`text-sm font-semibold ${statusColor}`}>{metric.value}</span>
                </div>
                <div className="w-full bg-[var(--color-border)] rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      isCritical ? 'bg-[var(--color-error)]' : isWarning ? 'bg-[var(--color-warning)]' : 'bg-[var(--color-success)]'
                    }`}
                    style={{ width: `${Math.min(value, 100)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'overview', label: 'System Overview' },
    { id: 'health', label: 'Component Health' },
    { id: 'performance', label: 'Performance' }
  ]

  return (
    <div className={`system-organism-viz ${className}`}>
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-[var(--color-text)] flex items-center gap-2">
            <Server className="text-[var(--color-primary)]" size={20} aria-hidden="true" />
            System Organism
          </h3>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-[var(--color-border)]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'text-[var(--color-primary)] border-[var(--color-primary)]'
                  : 'text-[var(--color-textSecondary)] border-transparent hover:text-[var(--color-text)]'
              }`}
              aria-label={`View ${tab.label}`}
              aria-pressed={activeTab === tab.id}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="min-h-[200px]">
          {activeTab === 'overview' && renderSystemOverview()}
          {activeTab === 'health' && renderComponentHealth()}
          {activeTab === 'performance' && renderPerformance()}
        </div>
      </div>
    </div>
  )
}

export default SystemOrganismViz