import React from 'react';
import { Lock, Eye } from 'lucide-react';

/**
 * ReadOnlyInput - Read-only version of input field
 */
const ReadOnlyInput = ({ label, value, icon: Icon, ...props }) => {
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-textSecondary)]">
            <Icon className="w-4 h-4" aria-hidden="true" />
          </div>
        )}
        <input
          type="text"
          value={value || ''}
          readOnly
          aria-label={label}
          aria-readonly="true"
          className={`w-full px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-textSecondary)] cursor-not-allowed ${
            Icon ? 'pl-10' : ''
          }`}
          {...props}
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--color-textSecondary)]" aria-hidden="true">
          <Lock className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};

/**
 * ReadOnlySelect - Read-only version of select dropdown
 */
const ReadOnlySelect = ({ label, value, options, ...props }) => {
  const selectedOption = options?.find(opt => opt.value === value);
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          value={value}
          disabled
          aria-label={label}
          aria-readonly="true"
          className="w-full px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-textSecondary)] cursor-not-allowed appearance-none"
          {...props}
        >
          {options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--color-textSecondary)] pointer-events-none" aria-hidden="true">
          <Lock className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};

/**
 * ReadOnlyTextArea - Read-only version of textarea
 */
const ReadOnlyTextArea = ({ label, value, rows = 3, ...props }) => {
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <textarea
          value={value || ''}
          readOnly
          rows={rows}
          aria-label={label}
          aria-readonly="true"
          className="w-full px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-textSecondary)] cursor-not-allowed resize-none"
          {...props}
        />
        <div className="absolute right-3 top-3 text-[var(--color-textSecondary)]" aria-hidden="true">
          <Lock className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};

/**
 * ReadOnlyField - Generic read-only field component
 */
const ReadOnlyField = ({ label, value, type = 'text', ...props }) => {
  const renderField = () => {
    switch (type) {
      case 'textarea':
        return <ReadOnlyTextArea label={label} value={value} {...props} />;
      case 'select':
        return <ReadOnlySelect label={label} value={value} options={props.options} {...props} />;
      default:
        return <ReadOnlyInput label={label} value={value} {...props} />;
    }
  };

  return renderField();
};

/**
 * ReadOnlyBadge - Visual indicator for read-only mode
 */
const ReadOnlyBadge = ({ message = 'View Only Mode' }) => {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-yellow-50 border border-yellow-200 rounded-lg">
      <Eye className="w-4 h-4 text-yellow-600" aria-hidden="true" />
      <span className="text-sm font-medium text-yellow-700">
        {message}
      </span>
    </div>
  );
};

/**
 * ReadOnlyContainer - Container that marks all children as read-only
 */
const ReadOnlyContainer = ({ title, children, showBadge = true }) => {
  return (
    <div className="relative">
      {showBadge && (
        <div className="mb-4">
          <ReadOnlyBadge />
        </div>
      )}
      {title && (
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-semibold text-[var(--color-text)]">
            {title}
          </h3>
          <Lock className="w-4 h-4 text-[var(--color-textSecondary)]" aria-hidden="true" />
        </div>
      )}
      <div className="space-y-4 opacity-75">
        {children}
      </div>
    </div>
  );
};

export default ReadOnlyField;
export { ReadOnlyInput, ReadOnlySelect, ReadOnlyTextArea, ReadOnlyBadge, ReadOnlyContainer };
