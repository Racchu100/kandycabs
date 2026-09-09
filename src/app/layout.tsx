import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileBottomBar } from '@/components/layout/MobileBottomBar';

export const metadata: Metadata = {
  title: 'Kandy Cabs — Taxi & Travel Service in Mangaluru | Outstation, Airport & Local Cabs',
  description:
    'Book taxis in Mangaluru with Kandy Cabs. Outstation one-way drops, round trips, local rental packages, airport transfers and holiday tour packages across coastal Karnataka. Fares quoted upfront.',
  keywords: [
    'taxi Mangaluru',
    'cab booking Mangalore',
    'Mangalore to Bangalore taxi',
    'airport taxi Mangaluru',
    'outstation cab coastal Karnataka',
  ],
  alternates: {
    canonical: 'https://www.kandycabs.in/',
  },
  openGraph: {
    type: 'website',
    title: 'Kandy Cabs — Taxi & Travel Service in Mangaluru',
    description:
      'Outstation drops, airport transfers, local rentals and holiday packages across coastal Karnataka. Fares fixed upfront.',
    url: 'https://www.kandycabs.in/',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: '#0F172A',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'TaxiService',
  name: 'Kandy Cabs',
  telephone: '+91-9900887777',
  priceRange: '₹₹',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Inland Impala, Vidyaranyanagar, Ullala',
    addressLocality: 'Mangaluru',
    addressRegion: 'Karnataka',
    postalCode: '575020',
    addressCountry: 'IN',
  },
  areaServed: [
    'Mangaluru',
    'Udupi',
    'Karkala',
    'Puttur',
    'Kasaragod',
    'Subramanya',
    'Dharmasthala',
    'Coorg',
  ],
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    reviewCount: '1778',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body suppressHydrationWarning>
        <Header />
        <main>{children}</main>
        <Footer />
        <MobileBottomBar />
      </body>
    </html>
  );
};
