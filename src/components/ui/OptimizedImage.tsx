'use client';

import React from 'react';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  largeSrc?: string;
  mediumSrc?: string;
  thumbnailSrc?: string;
  sizes?: string;
  width?: number;
  height?: number;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  largeSrc,
  mediumSrc,
  thumbnailSrc,
  sizes = '(max-width: 640px) 400px, (max-width: 1024px) 800px, 1600px',
  style,
  className,
  ...props
}) => {
  // Construct responsive srcset if variant URLs are provided
  const srcSetEntries: string[] = [];
  if (thumbnailSrc) srcSetEntries.push(`${thumbnailSrc} 400w`);
  if (mediumSrc) srcSetEntries.push(`${mediumSrc} 800w`);
  if (largeSrc) srcSetEntries.push(`${largeSrc} 1600w`);

  const srcSetString = srcSetEntries.length > 0 ? srcSetEntries.join(', ') : undefined;

  return (
    <picture style={{ display: 'contents' }}>
      <img
        src={src}
        srcSet={srcSetString}
        sizes={srcSetString ? sizes : undefined}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={className}
        style={{
          maxWidth: '100%',
          height: 'auto',
          objectFit: 'cover',
          ...style,
        }}
        {...props}
      />
    </picture>
  );
};
