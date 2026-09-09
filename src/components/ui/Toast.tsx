'use client';

import React from 'react';

interface ToastProps {
  message: string | null;
  isVisible: boolean;
}

export const Toast: React.FC<ToastProps> = ({ message, isVisible }) => {
  if (!message) return null;

  return (
    <div className={`toast ${isVisible ? 'on' : ''}`} role="status">
      {message}
    </div>
  );
};
