'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const AdminMasterConsoleView = dynamic(
  () => import('@/components/admin/AdminMasterConsoleView').then((mod) => mod.AdminMasterConsoleView),
  {
    loading: () => (
      <div style={{ padding: '60px', textAlign: 'center', fontSize: '14px', color: 'var(--muted)' }}>
        ⚡ Loading Admin Command Console & Telemetry Engine...
      </div>
    ),
    ssr: false,
  }
);

export default function AdminDashboardPage() {
  return <AdminMasterConsoleView />;
}
