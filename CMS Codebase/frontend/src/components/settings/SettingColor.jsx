import React from 'react'
import { Info, Lock } from 'lucide-react'

const SettingColor = ({ label, description, value, onChange, disabled, error, locked, id }) => {
  const handleChange = (e) => {
    onChange(e.target.value)
  }

  const colorId = id || `setting-${label?.toLowerCase().replace(/\s+/g, '-')}`

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label htmlFor={`${colorId}-text`} className="block text-sm font-medium text-[var(--color-text)]">
          {label}
        </label>
        {locked && (
          <div className="flex items-center text-xs text-[var(--color-textSecondary)]" title="Locked to palette">
            <Lock className="w-3 h-3 mr-1" aria-hidden="true" />
            Locked
          </div>
        )}
      </div>
      <div className="flex items-center space-x-2">
        <input
          id={`${colorId}-color`}
          type="color"
          value={value}
          onChange={handleChange}
          disabled={disabled || locked}
          aria-label={`${label} color picker`}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${colorId}-error` : description ? `${colorId}-description` : undefined}
          className={`w-12 h-10 border rounded cursor-pointer ${
            error ? 'border-red-500' : 'border-[var(--color-border)] border-[var(--color-border)]'
          } ${(disabled || locked) ? 'cursor-not-allowed opacity-50' : ''}`}
        />
        <input
          id={`${colorId}-text`}
          type="text"
          value={value}
          onChange={handleChange}
          disabled={disabled || locked}
          placeholder="#000000"
          aria-label={`${label} color value`}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${colorId}-error` : description ? `${colorId}-description` : undefined}
          className={`input flex-1 ${error ? 'border-red-500 ring-red-500' : ''} ${(disabled || locked) ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
      </div>
      {description && (
        <p id={`${colorId}-description`} className="flex items-center text-xs text-[var(--color-textSecondary)] text-[var(--color-textSecondary)]">
          <Info className="w-3 h-3 mr-1" aria-hidden="true" />
          {description}
        </p>
      )}
      {error && (
        <p id={`${colorId}-error`} className="text-xs text-red-600" role="alert">{error}</p>
      )}
    </div>
  )
}

export default SettingColor
