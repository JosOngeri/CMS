import React from 'react'
import { Info } from 'lucide-react'

const SettingBoolean = ({ label, description, value, onChange, disabled, id }) => {
  const handleChange = (e) => {
    onChange(e.target.checked)
  }

  const checkboxId = id || `setting-${label?.toLowerCase().replace(/\s+/g, '-')}`

  return (
    <div className="space-y-1">
      <div className="flex items-center">
        <input
          id={checkboxId}
          type="checkbox"
          checked={value}
          onChange={handleChange}
          disabled={disabled}
          aria-label={label}
          aria-describedby={description ? `${checkboxId}-description` : undefined}
          className="w-4 h-4 text-[var(--color-primary)] border-[var(--color-border)] rounded focus:ring-[var(--color-primary)]"
        />
        <label htmlFor={checkboxId} className="ml-2 block text-sm font-medium text-[var(--color-text)]">
          {label}
        </label>
      </div>
      {description && (
        <p id={`${checkboxId}-description`} className="flex items-center text-xs text-[var(--color-textSecondary)] ml-6">
          <Info className="w-3 h-3 mr-1" aria-hidden="true" />
          {description}
        </p>
      )}
    </div>
  )
}

export default SettingBoolean
