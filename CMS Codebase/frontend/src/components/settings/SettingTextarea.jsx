import React from 'react'
import { Info } from 'lucide-react'

const SettingTextarea = ({ label, description, value, onChange, placeholder, disabled, error, rows = 3, id }) => {
  const handleChange = (e) => {
    onChange(e.target.value)
  }

  const textareaId = id || `setting-${label?.toLowerCase().replace(/\s+/g, '-')}`

  return (
    <div className="space-y-1">
      <label htmlFor={textareaId} className="block text-sm font-medium text-[var(--color-text)]">
        {label}
      </label>
      <textarea
        id={textareaId}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        aria-label={label}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${textareaId}-error` : description ? `${textareaId}-description` : undefined}
        className={`input min-h-[100px] ${error ? 'border-red-500 ring-red-500' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      />
      {description && (
        <p id={`${textareaId}-description`} className="flex items-center text-xs text-[var(--color-textSecondary)]">
          <Info className="w-3 h-3 mr-1" aria-hidden="true" />
          {description}
        </p>
      )}
      {error && (
        <p id={`${textareaId}-error`} className="text-xs text-red-600" role="alert">{error}</p>
      )}
    </div>
  )
}

export default SettingTextarea
