import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DETAILED_VEHICLES } from '@/config/siteData';

interface VehicleDetailsPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: VehicleDetailsPageProps) {
  const { id } = await params;
  const vehicle = DETAILED_VEHICLES.find((v) => v.id === id);
  if (!vehicle) return { title: 'Vehicle Not Found' };
  return {
    title: `${vehicle.name} (${vehicle.category}) — Kandy Cabs Mangaluru`,
    description: vehicle.description,
  };
}

export default async function VehicleDetailsPage({ params }: VehicleDetailsPageProps) {
  const { id } = await params;
  const vehicle = DETAILED_VEHICLES.find((v) => v.id === id);

  if (!vehicle) {
    notFound();
  }

  return (
    <section className="sec">
      <Container>
        <div style={{ marginBottom: '16px' }}>
          <Link href="/fleet" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--muted)' }}>
            ← Back to Fleet Catalog
          </Link>
        </div>

        <SectionHeader
          eyebrow={vehicle.category}
          title={vehicle.name}
          lede={vehicle.description}
        />

        <div className="ct-grid">
          <div>
            <Card className="vc">
              <div className="vc-art" style={{ height: '240px' }}>
                <div className="artw">
                  <span style={{ fontSize: '96px', userSelect: 'none' }}>🚕</span>
                </div>
              </div>
              <div className="vc-b" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--muted)' }}>
                    Rating: ⭐ {vehicle.rating} ({vehicle.reviewsCount} reviews)
                  </span>
                  <span className="vc-pr" style={{ fontSize: '22px' }}>
                    ₹{vehicle.baseRatePerKm}/km
                  </span>
                </div>
              </div>
            </Card>

            <Card padded style={{ marginTop: '20px' }}>
              <h3 className="h3" style={{ marginBottom: '14px' }}>
                Features & Amenities
              </h3>
              <ul style={{ listStyle: 'none', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {vehicle.features.map((feat, i) => (
                  <li key={i} style={{ fontSize: '13.5px', color: 'var(--ink2)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: 'var(--green)' }}>✓</span> {feat}
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <div>
            <Card padded>
              <h3 className="h3" style={{ marginBottom: '16px' }}>
                Vehicle Specifications
              </h3>

              <div className="sum" style={{ margin: 0 }}>
                <div className="srow">
                  <span>Seating Capacity</span>
                  <b>{vehicle.seats} Passenger Seats</b>
                </div>
                <div className="srow">
                  <span>Luggage Capacity</span>
                  <b>{vehicle.luggageCapacityText}</b>
                </div>
                <div className="srow">
                  <span>Fuel Type</span>
                  <b>{vehicle.specifications.fuelType}</b>
                </div>
                <div className="srow">
                  <span>Air Conditioning</span>
                  <b>{vehicle.ac ? 'Dual Blowers / Climate Control' : 'Standard'}</b>
                </div>
                <div className="srow">
                  <span>Driver Allowance</span>
                  <b>₹{vehicle.driverAllowancePerDay} / day</b>
                </div>
                <div className="srow">
                  <span>Boot Space</span>
                  <b>{vehicle.specifications.bootSpace}</b>
                </div>
                <div className="srow">
                  <span>Safety Rating</span>
                  <b>{vehicle.specifications.safetyRating}</b>
                </div>
              </div>

              <div style={{ marginTop: '20px' }}>
                <b style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)', marginBottom: '4px' }}>
                  Ideal For
                </b>
                <p style={{ fontSize: '13.5px', color: 'var(--ink2)', lineHeight: 1.5 }}>
                  {vehicle.idealFor}
                </p>
              </div>

              <div style={{ marginTop: '24px' }}>
                <Button href={`/booking?vehicle=${vehicle.id}`} variant="accent" fullWidth style={{ padding: '14px' }}>
                  Book {vehicle.name} Now
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </Container>
    </section>
  );
}
