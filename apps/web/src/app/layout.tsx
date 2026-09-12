import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

export const metadata: Metadata = {
  title: 'Kandy Cabs — Safe | Reliable | Hassle Free Cab Booking',
  description: 'Book premium one-way, round-trip, local hourly, airport transfers, and outstation tour packages with Kandy Cabs.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-kandy-bg text-kandy-ink min-h-screen">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
