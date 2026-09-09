import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  padded?: boolean;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  padded = false,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`card ${padded ? 'pad' : ''} ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
};
