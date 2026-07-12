import React from 'react';
import clsx from 'clsx';
import { useColorPalette } from '../../contexts/ColorPaletteContext';

const Input = ({
  label,
  error,
  helperText,
  className,
  containerClassName,
  required = false,
  ...props
}) => {
  const { colors } = useColorPalette()

  return (
    <div className={clsx('space-y-1', containerClassName)}>
      {label && (
        <label className="block text-sm font-medium" style={{ color: colors.text }}>
          {label}
          {required && <span style={{ color: colors.error }} className="ml-1">*</span>}
        </label>
      )}
      <input
        className={clsx(
          'block w-full px-3 py-2 border rounded-md shadow-sm sm:text-sm',
          className
        )}
        style={{
          backgroundColor: colors.background,
          borderColor: error ? colors.error : colors.border,
          color: error ? colors.error : colors.text,
          outline: 'none'
        }}
        aria-label={label}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${props.id}-error` : helperText ? `${props.id}-helper` : undefined}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = colors.primary
          e.currentTarget.style.boxShadow = `0 0 0 2px ${colors.primary}40`
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = error ? colors.error : colors.border
          e.currentTarget.style.boxShadow = 'none'
        }}
        {...props}
      />
      {error && (
        <p id={`${props.id}-error`} className="text-sm" style={{ color: colors.error }} role="alert">{error}</p>
      )}
      {helperText && !error && (
        <p id={`${props.id}-helper`} className="text-sm" style={{ color: colors.textSecondary }}>{helperText}</p>
      )}
    </div>
  );
};

export default Input;
