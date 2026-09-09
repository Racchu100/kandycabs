import React from 'react';
import { RealBookingEngine } from '@/components/booking/RealBookingEngine';

export const metadata = {
  title: 'Book a Cab — Kandy Cabs Mangaluru',
  description: 'Book one-way drops, round trips, airport transfers, local rentals, and tour packages with transparent upfront fares.',
};

export default function BookingPage() {
  return <RealBookingEngine />;
}
