const toDate = (value) => {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export const fmtKES = (value, fallback = '—') => {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return fallback
  return `KES ${amount.toLocaleString('en-KE')}`
}

export const fmtDate = (value, options = {}) => {
  const { locale = 'en-KE', fallback = '—', ...dateOptions } = options
  const date = toDate(value)
  if (!date) return fallback

  return date.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...dateOptions
  })
}

export const fmtDateTime = (value, options = {}) => {
  const { locale = 'en-KE', fallback = '—', ...dateOptions } = options
  const date = toDate(value)
  if (!date) return fallback

  return date.toLocaleString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...dateOptions
  })
}

export const fmtRelative = (value, fallback = '') => {
  const date = toDate(value)
  if (!date) return fallback

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.floor((today - day) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return date.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })
  }
  if (diffDays === 1) return 'Yesterday'
  if (diffDays > 1 && diffDays < 7) {
    return date.toLocaleDateString('en-KE', { weekday: 'short' })
  }
  return fmtDate(date)
}
