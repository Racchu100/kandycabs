import React from 'react';
import { CustomerBookingDetailsView } from '@/components/customer/CustomerBookingDetailsView';

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: 'Booking Details — Kandy Cabs Mangaluru',
  description: 'View booking summary, chauffeur contact details, start OTP, and payment breakdown.',
};

export default async function CustomerBookingDetailsPage({ params }: PageProps) {
  const { id } = await params;
  return <CustomerBookingDetailsView bookingId={id} />;
}
