import React from 'react';

export type BadgeVariant = 'accent' | 'green' | 'completed' | 'tag';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'accent',
  className = '',
  ...props
}) => {
  const variantClass =
    variant === 'accent'
      ? 'pl new'
      : variant === 'green'
      ? 'pl confirmed'
      : variant === 'completed'
      ? 'pl completed'
      : 'tag';

  return (
    <span className={`${variantClass} ${className}`.trim()} {...props}>
      {children}
    </span>
  );
};
