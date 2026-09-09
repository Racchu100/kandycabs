import React from 'react';
import { Container } from '@/components/ui/Container';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { VehicleCard } from '@/components/vehicle/VehicleCard';
import { DETAILED_VEHICLES } from '@/config/siteData';

export const metadata = {
  title: 'Our Fleet — Kandy Cabs Mangaluru',
  description: 'Explore our fleet of Maruti Suzuki Swift Dzire, Toyota Etios, Ertiga, Innova Crysta, and Force Tempo Travellers.',
};

export default function FleetPage() {
  return (
    <section className="sec">
      <Container>
        <SectionHeader
          eyebrow="The fleet"
          title="Twelve vehicles, six categories"
          lede="All vehicles in our fleet hold valid All-India Tourist Permits, undergo periodic multi-point safety checks, and are driven by verified local chauffeurs."
        />
        <div className="grid3">
          {DETAILED_VEHICLES.map((vehicle) => (
            <VehicleCard key={vehicle.id} vehicle={vehicle} />
          ))}
        </div>
      </Container>
    </section>
  );
}
