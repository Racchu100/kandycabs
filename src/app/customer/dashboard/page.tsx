import React from 'react';
import { CustomerDashboardView } from '@/components/customer/CustomerDashboardView';

export const metadata = {
  title: 'Customer Dashboard — Kandy Cabs Mangaluru',
  description: 'Manage upcoming cab bookings, active trip details, driver contacts, and invoices.',
};

export default function CustomerDashboardPage() {
  return <CustomerDashboardView />;
}
