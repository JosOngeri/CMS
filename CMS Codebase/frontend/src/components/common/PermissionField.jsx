import React from 'react';
import ReadOnlyField from './ReadOnlyField';
import Input from './ui/Input';

const PermissionField = ({ 
  label, 
  value, 
  onChange, 
  type = 'text', 
  field, 
  module, 
  permissions,
  icon: Icon,
  showLockIcon = true,
  className = '',
  rows = 3,
  children,
  ...props 
}) => {
  const canEdit = permissions?.all || permissions[field]?.write || false;
  const canView = permissions?.all || permissions[field]?.read || false;

  if (!canView) {
    return null; // Hide field if user can't view it
  }

  if (!canEdit) {
    return (
      <ReadOnlyField
        label={label}
        value={value}
        type={type}
        icon={Icon}
        showLockIcon={showLockIcon}
        className={className}
      />
    );
  }

  if (type === 'textarea') {
    return (
      <div className={`space-y-1 ${className}`}>
        {label && (
          <label className="block text-sm font-medium text-[var(--color-text)]">
            <div className="flex items-center gap-2">
              {Icon && <Icon className="h-4 w-4 text-[var(--color-textSecondary)]" aria-hidden="true" />}
              {label}
            </div>
          </label>
        )}
        <textarea
          name={field}
          value={value}
          onChange={onChange}
          rows={rows}
          className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]-500"
          {...props}
        />
      </div>
    );
  }

  if (type === 'select') {
    return (
      <div className={`space-y-1 ${className}`}>
        {label && (
          <label className="block text-sm font-medium text-[var(--color-text)]">
            <div className="flex items-center gap-2">
              {Icon && <Icon className="h-4 w-4 text-[var(--color-textSecondary)]" aria-hidden="true" />}
              {label}
            </div>
          </label>
        )}
        <select
          name={field}
          value={value}
          onChange={onChange}
          className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]-500"
          {...props}
        >
          {children}
        </select>
      </div>
    );
  }

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-[var(--color-text)]">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4 text-[var(--color-textSecondary)]" aria-hidden="true" />}
            {label}
          </div>
        </label>
      )}
      <Input
        type={type}
        name={field}
        value={value}
        onChange={onChange}
        {...props}
      />
    </div>
  );
};

export default PermissionField;
