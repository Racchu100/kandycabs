import type { Metadata } from 'next';
import { AuthProvider } from '@kandy-cabs/shared';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kandy Cabs Admin Panel',
  description: 'Operations and dispatch management',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
