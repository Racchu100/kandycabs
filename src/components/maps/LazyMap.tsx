'use client';

import React, { useState } from 'react';

interface LazyMapProps {
  title?: string;
  height?: string;
  src?: string;
}

export const LazyMap: React.FC<LazyMapProps> = ({
  title = 'Kandy Cabs Location Map',
  height = '290px',
  src = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3889.921609149021!2d74.8385!3d12.8465!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTLCsDUwJzE3LjQiTiA3NMKwNTAnMTguNiJF!5e0!3m2!1sen!2sin!4v1650000000000!5m2!1sen!2sin',
}) => {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div
      className="ct-map"
      style={{
        height,
        position: 'relative',
        background: 'var(--line2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {!isLoaded ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'var(--card)',
              border: '1px solid var(--line)',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 12px',
            }}
          >
            📍
          </div>
          <b style={{ display: 'block', marginBottom: '6px' }}>{title}</b>
          <p className="muted" style={{ fontSize: '12px', marginBottom: '14px' }}>
            Click below to load interactive map
          </p>
          <button
            type="button"
            className="btn btn-g"
            onClick={() => setIsLoaded(true)}
            style={{ fontSize: '13px', padding: '8px 16px' }}
          >
            Load Interactive Map
          </button>
        </div>
      ) : (
        <iframe
          title={title}
          src={src}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      )}
    </div>
  );
};
