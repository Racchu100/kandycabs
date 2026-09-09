import React from 'react';
import { DriverDashboardView } from '@/components/driver/DriverDashboardView';

export const metadata = {
  title: 'Driver Operational Dashboard — Kandy Cabs Mangaluru',
  description: 'Mobile chauffeur dispatch portal for trip acceptance, OTP verification, and meter Odometer readings.',
};

export default function DriverDashboardPage() {
  return <DriverDashboardView />;
}
