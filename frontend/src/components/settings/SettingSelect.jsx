import React from 'react'
import { Info } from 'lucide-react'

const SettingSelect = ({ label, description, value, onChange, options, disabled, error, id }) => {
  const handleChange = (e) => {
    onChange(e.target.value)
  }

  const selectId = id || `setting-${label?.toLowerCase().replace(/\s+/g, '-')}`

  return (
    <div className="space-y-1">
      <label htmlFor={selectId} className="block text-sm font-medium text-[var(--color-text)]">
        {label}
      </label>
      <select
        id={selectId}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        aria-label={label}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${selectId}-error` : description ? `${selectId}-description` : undefined}
        className={`input ${error ? 'border-red-500 ring-red-500' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {description && (
        <p id={`${selectId}-description`} className="flex items-center text-xs text-[var(--color-textSecondary)]">
          <Info className="w-3 h-3 mr-1" aria-hidden="true" />
          {description}
        </p>
      )}
      {error && (
        <p id={`${selectId}-error`} className="text-xs text-red-600" role="alert">{error}</p>
      )}
    </div>
  )
}

export default SettingSelect
