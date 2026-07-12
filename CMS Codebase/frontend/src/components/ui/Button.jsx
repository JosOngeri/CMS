import React from 'react';
import clsx from 'clsx';
import { useColorPalette } from '../../contexts/ColorPaletteContext';

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  className,
  disabled = false,
  loading = false,
  ariaLabel,
  ...props
}) => {
  const { colors } = useColorPalette()
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: colors.primary,
          color: 'white',
          hoverColor: colors.primary + 'CC',
          focusRing: colors.primary
        }
      case 'secondary':
        return {
          backgroundColor: colors.border,
          color: colors.text,
          hoverColor: colors.border + 'CC',
          focusRing: colors.border
        }
      case 'danger':
        return {
          backgroundColor: colors.error,
          color: 'white',
          hoverColor: colors.error + 'CC',
          focusRing: colors.error
        }
      case 'success':
        return {
          backgroundColor: colors.success,
          color: 'white',
          hoverColor: colors.success + 'CC',
          focusRing: colors.success
        }
      case 'outline':
        return {
          backgroundColor: 'transparent',
          color: colors.text,
          borderColor: colors.border,
          hoverColor: colors.background,
          focusRing: colors.primary
        }
      default:
        return {
          backgroundColor: colors.primary,
          color: 'white',
          hoverColor: colors.primary + 'CC',
          focusRing: colors.primary
        }
    }
  }

  const variantStyles = getVariantStyles()

  const sizes = {
    sm: 'px-4 py-2.5 text-sm min-h-[44px]', // WCAG touch target minimum
    md: 'px-5 py-3 text-base min-h-[48px]', // Comfortable touch target
    lg: 'px-6 py-4 text-lg min-h-[52px]'  // Large touch target
  };

  return (
    <button
      className={clsx(
        baseClasses,
        sizes[size],
        (disabled || loading) && 'opacity-50 cursor-not-allowed',
        className
      )}
      style={{
        backgroundColor: variantStyles.backgroundColor,
        color: variantStyles.color,
        border: variant === 'outline' ? `1px solid ${variantStyles.borderColor}` : 'none',
        transition: 'background-color 0.2s'
      }}
      disabled={disabled || loading}
      aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
      aria-busy={loading}
      onMouseEnter={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.backgroundColor = variantStyles.hoverColor
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.backgroundColor = variantStyles.backgroundColor
        }
      }}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  );
};

export default Button;
