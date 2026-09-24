'use client';

import React from 'react';
import { AuthProvider } from '@kandy-cabs/shared';

export function Providers({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
