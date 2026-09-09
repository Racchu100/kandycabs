import React from 'react';
import { Container } from '@/components/ui/Container';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { PackageCard } from '@/components/public/PackageCard';
import { DETAILED_PACKAGES } from '@/config/siteData';

export const metadata = {
  title: 'Tour & Pilgrimage Packages — Kandy Cabs Mangaluru',
  description: 'Holiday tour packages and coastal pilgrimage travel across Mangaluru, Udupi, Murdeshwar, Kollur, and Coorg.',
};

export default function PackagesPage() {
  return (
    <section className="sec">
      <Container>
        <SectionHeader
          eyebrow="Holiday & pilgrimage"
          title="Customized Travel Packages"
          lede="Explore hand-crafted tour itineraries with dedicated cab, driver, and flexible sightseeing stops."
        />
        <div className="grid3">
          {DETAILED_PACKAGES.map((pkg) => (
            <PackageCard key={pkg.id} packageData={pkg} />
          ))}
        </div>
      </Container>
    </section>
  );
}
