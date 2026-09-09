import React from 'react';
import Image from 'next/image';

interface KandyCabsLogoProps {
  className?: string;
  width?: number;
  height?: number;
  variant?: 'light' | 'dark';
}

export const KandyCabsLogo: React.FC<KandyCabsLogoProps> = ({
  className = '',
  width = 180,
  height = 54,
  variant = 'light',
}) => {
  const logoSrc = variant === 'dark' ? '/images/logo-dark-mode.png' : '/images/logo-transparent.png';

  return (
    <div className={`inline-flex items-center ${className}`} style={{ height: `${height}px` }}>
      <Image
        src={logoSrc}
        alt="Kandy Cabs — Safe | Reliable | Hassle Free"
        width={width}
        height={height}
        priority
        style={{ width: `${width}px`, height: `${height}px`, objectFit: 'contain' }}
      />
    </div>
  );
};
