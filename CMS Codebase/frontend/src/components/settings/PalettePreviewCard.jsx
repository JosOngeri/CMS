import React from 'react'
import { Check } from 'lucide-react'

const PalettePreviewCard = ({ palette, isActive, onClick }) => {
  const colors = palette.colors || {}

  return (
    <div
      onClick={onClick}
      className={`relative cursor-pointer rounded-lg border-2 transition-all hover:shadow-md ${
        isActive ? 'border-green-600 ring-2 ring-green-600 ring-offset-2' : 'border-[var(--color-border)] hover:border-[var(--color-border)]'
      }`}
    >
      {isActive && (
        <div className="absolute top-2 right-2 bg-green-600 text-white rounded-full p-1">
          <Check className="h-3 w-3" />
        </div>
      )}
      
      <div className="p-3">
        <h3 className="text-sm font-medium text-[var(--color-text)] mb-2">{palette.display_name}</h3>
        
        <div className="flex space-x-1">
          <div
            className="w-6 h-6 rounded-full border border-[var(--color-border)]"
            style={{ backgroundColor: colors.primary || '#2563eb' }}
            title="Primary"
          />
          <div
            className="w-6 h-6 rounded-full border border-[var(--color-border)]"
            style={{ backgroundColor: colors.secondary || '#f59e0b' }}
            title="Secondary"
          />
          <div
            className="w-6 h-6 rounded-full border border-[var(--color-border)]"
            style={{ backgroundColor: colors.background || '#ffffff' }}
            title="Background"
          />
          <div
            className="w-6 h-6 rounded-full border border-[var(--color-border)]"
            style={{ backgroundColor: colors.text || '#111827' }}
            title="Text"
          />
          <div
            className="w-6 h-6 rounded-full border border-[var(--color-border)]"
            style={{ backgroundColor: colors.success || '#16a34a' }}
            title="Success"
          />
          <div
            className="w-6 h-6 rounded-full border border-[var(--color-border)]"
            style={{ backgroundColor: colors.error || '#dc2626' }}
            title="Error"
          />
        </div>
      </div>
    </div>
  )
}

export default PalettePreviewCard
