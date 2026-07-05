import React from 'react'
import { Info } from 'lucide-react'

const SettingNumber = ({ label, description, value, onChange, placeholder, disabled, error, min, max, step, id }) => {
  const handleChange = (e) => {
    const newValue = parseFloat(e.target.value)
    onChange(isNaN(newValue) ? '' : newValue)
  }

  const inputId = id || `setting-${label?.toLowerCase().replace(/\s+/g, '-')}`

  return (
    <div className="space-y-1">
      <label htmlFor={inputId} className="block text-sm font-medium text-[var(--color-text)]">
        {label}
      </label>
      <input
        id={inputId}
        type="number"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
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

export default SettingNumber
