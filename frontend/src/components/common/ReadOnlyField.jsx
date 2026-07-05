import React from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';

const ReadOnlyField = ({ 
  label, 
  value, 
  type = 'text', 
  icon: Icon,
  showLockIcon = true,
  className = '',
  labelClassName = '',
  valueClassName = ''
}) => {
  const formatValue = (val) => {
    if (val === null || val === undefined) return '-';
    if (type === 'date' && val) {
      return new Date(val).toLocaleDateString();
    }
    if (type === 'datetime' && val) {
      return new Date(val).toLocaleString();
    }
    if (type === 'boolean') {
      return val ? 'Yes' : 'No';
    }
    if (type === 'currency' && val) {
      return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES'
      }).format(val);
    }
    return String(val);
  };

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label className={`block text-sm font-medium text-[var(--color-text)] ${labelClassName}`}>
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4 text-[var(--color-textSecondary)]" aria-hidden="true" />}
            {label}
            {showLockIcon && (
              <Lock className="h-3 w-3 text-[var(--color-textSecondary)]" aria-hidden="true" title="Read-only field" />
            )}
          </div>
        </label>
      )}
      <div className="relative">
        <div
          className={`w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-textSecondary)] cursor-not-allowed ${valueClassName}`}
          aria-readonly="true"
        >
          {formatValue(value)}
        </div>
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <EyeOff className="h-4 w-4 text-[var(--color-textSecondary)]" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
};

export default ReadOnlyField;
