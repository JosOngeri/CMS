import React from 'react';
import clsx from 'clsx';
import { useColorPalette } from '../../contexts/ColorPaletteContext';

const Card = ({
  children,
  className,
  padding = 'md',
  shadow = 'md',
  border = true,
  ...props
}) => {
  const { colors } = useColorPalette()
  const baseClasses = 'rounded-lg';

  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  const shadows = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl'
  };

  return (
    <div
      className={clsx(
        baseClasses,
        paddings[padding],
        shadows[shadow],
        className
      )}
      style={{
        backgroundColor: colors.surface,
        border: border ? `1px solid ${colors.border}` : 'none'
      }}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className, ...props }) => (
  <div className={clsx('mb-4', className)} {...props}>
    {children}
  </div>
);

export const CardBody = ({ children, className, ...props }) => (
  <div className={clsx('', className)} {...props}>
    {children}
  </div>
);

export const CardFooter = ({ children, className, ...props }) => {
  const { colors } = useColorPalette()
  return (
    <div className={clsx('mt-4 pt-4', className)} style={{ borderTop: `1px solid ${colors.border}` }} {...props}>
      {children}
    </div>
  )
};

export default Card;
