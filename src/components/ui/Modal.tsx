'use client';

import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  badgeText?: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  badgeText,
  children,
}) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="scrim on" onClick={onClose} aria-hidden="true" />
      <div className="adm on" role="dialog" aria-modal="true">
        <div className="adm-hd">
          <h2>{title}</h2>
          {badgeText && <span className="tag">{badgeText}</span>}
          <button
            className="x"
            onClick={onClose}
            aria-label="Close modal"
            style={{ marginLeft: 'auto', color: '#fff' }}
          >
            ✕
          </button>
        </div>
        <div className="adm-b">{children}</div>
      </div>
    </>
  );
};
