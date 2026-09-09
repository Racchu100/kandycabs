import React from 'react';

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const Container: React.FC<ContainerProps> = ({ children, className = '', ...props }) => {
  return (
    <div className={`wrap ${className}`.trim()} {...props}>
      {children}
    </div>
  );
};
