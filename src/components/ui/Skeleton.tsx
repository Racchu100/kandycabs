import React from 'react';

interface SkeletonProps {
  height?: string | number;
  width?: string | number;
  borderRadius?: string | number;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  height = '20px',
  width = '100%',
  borderRadius = '8px',
  className = '',
}) => {
  return (
    <div
      className={className}
      style={{
        height,
        width,
        borderRadius,
        backgroundColor: '#E2E8F0',
        animation: 'pulse 1.5s ease-in-out infinite',
      }}
    />
  );
};
