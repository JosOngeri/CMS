import React from 'react'
import { Info } from 'lucide-react'

const SettingInput = ({ label, description, value, onChange, type = 'text', placeholder, disabled, error, validationRules, id }) => {
  const handleChange = (e) => {
    const newValue = e.target.value
    onChange(newValue)
  }

  const inputId = id || `setting-${label?.toLowerCase().replace(/\s+/g, '-')}`

  return (
    <div className="space-y-1">
      <label htmlFor={inputId} className="block text-sm font-medium text-[var(--color-text)]">
        {label}
      </label>
      <input
        id={inputId}
        type={type}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={label}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${inputId}-error` : description ? `${inputId}-description` : undefined}
        className={`input ${error ? 'border-red-500 ring-red-500' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      />
      {description && (
        <p id={`${inputId}-description`} className="flex items-center text-xs text-[var(--color-textSecondary)]">
          <Info className="w-3 h-3 mr-1" aria-hidden="true" />
          {description}
        </p>
      )}
      {error && (
        <p id={`${inputId}-error`} className="text-xs text-red-600" role="alert">{error}</p>
      )}
    </div>
  )
}

export default SettingInput
