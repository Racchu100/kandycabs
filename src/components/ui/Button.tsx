import React from 'react';
import Link from 'next/link';

export type ButtonVariant = 'primary' | 'accent' | 'whatsapp' | 'ghost';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
  href?: string;
  children: React.ReactNode;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  fullWidth = false,
  href,
  children,
  className = '',
  ...props
}) => {
  const variantClass =
    variant === 'primary'
      ? 'btn-p'
      : variant === 'accent'
      ? 'btn-a'
      : variant === 'whatsapp'
      ? 'btn-wa'
      : 'btn-g';

  const fullWidthClass = fullWidth ? 'btn-full' : '';
  const combinedClasses = `btn ${variantClass} ${fullWidthClass} ${className}`.trim();

  if (href) {
    return (
      <Link href={href} className={combinedClasses}>
        {children}
      </Link>
    );
  }

  return (
    <button className={combinedClasses} {...props}>
      {children}
    </button>
  );
};
