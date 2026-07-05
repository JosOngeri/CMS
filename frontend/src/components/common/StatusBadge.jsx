import { CheckCircle, Clock, XCircle, AlertCircle, PauseCircle } from 'lucide-react'

const StatusBadge = ({ status, type = 'default', size = 'md' }) => {
  const statusConfig = {
    // General status types
    active: {
      label: 'Active',
      color: 'bg-green-100 text-green-700',
      icon: CheckCircle
    },
    inactive: {
      label: 'Inactive',
      color: 'bg-[var(--color-surface)] text-[var(--color-text)]',
      icon: PauseCircle
    },
    pending: {
      label: 'Pending',
      color: 'bg-yellow-100 text-yellow-700',
      icon: Clock
    },
    approved: {
      label: 'Approved',
      color: 'bg-green-100 text-green-700',
      icon: CheckCircle
    },
    rejected: {
      label: 'Rejected',
      color: 'bg-red-100 text-red-700',
      icon: XCircle
    },
    processing: {
      label: 'Processing',
      color: 'bg-[var(--color-primary)]-100 text-[var(--color-primary)]-700',
      icon: AlertCircle
    },
    completed: {
      label: 'Completed',
      color: 'bg-green-100 text-green-700',
      icon: CheckCircle
    },
    cancelled: {
      label: 'Cancelled',
      color: 'bg-red-100 text-red-700',
      icon: XCircle
    },
    draft: {
      label: 'Draft',
      color: 'bg-[var(--color-surface)] text-[var(--color-text)]',
      icon: PauseCircle
    },
    published: {
      label: 'Published',
      color: 'bg-green-100 text-green-700',
      icon: CheckCircle
    }
  }

  const config = statusConfig[status] || {
    label: status,
    color: 'bg-[var(--color-surface)] text-[var(--color-text)]',
    icon: null
  }

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  }

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${config.color} ${sizeClasses[size]}`}>
      {config.icon && <config.icon className="h-3 w-3" aria-hidden="true" />}
      {config.label}
    </span>
  )
}

export default StatusBadge
