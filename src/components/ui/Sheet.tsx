'use client';

import React from 'react';

interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Sheet: React.FC<SheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
}) => {
  return (
    <>
      <div
        className={`scrim ${isOpen ? 'on' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div className={`sheet ${isOpen ? 'on' : ''}`} role="dialog" aria-modal="true">
        <div className="sh-hd">
          <h3>{title}</h3>
          <button className="x" onClick={onClose} aria-label="Close sheet">
            ✕
          </button>
        </div>
        <div className="sh-b">{children}</div>
      </div>
    </>
  );
};
