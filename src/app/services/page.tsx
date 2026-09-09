import React from 'react';
import { Container } from '@/components/ui/Container';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export const metadata = {
  title: 'Services — Kandy Cabs Mangaluru',
  description: 'Explore outstation one-way drops, round trips, local rental packages, airport transfers and holiday tour packages across coastal Karnataka.',
};

export default function ServicesPage() {
  return (
    <section className="sec">
      <Container>
        <SectionHeader
          eyebrow="What we run"
          title="Five ways to travel with us"
          lede="Every service is priced on the same transparent basis — distance, vehicle category, and driver duration."
        />
        <div className="grid3">
          <Card padded className="svc">
            <div className="svc-i">🚗</div>
            <h3 className="h3">One-Way Outstation Drop</h3>
            <p>
              Pay only for distance traveled to Bengaluru, Mysore, Goa, or North Kerala without forced return charges.
            </p>
            <div className="svc-f">
              <span>Starts at</span>
              <b>₹14 / km</b>
            </div>
            <div style={{ marginTop: '16px' }}>
              <Button href="/booking?mode=oneway" variant="accent" fullWidth>
                Book One-Way
              </Button>
            </div>
          </Card>

          <Card padded className="svc">
            <div className="svc-i">🔄</div>
            <h3 className="h3">Round Trips</h3>
            <p>
              Multiday outstation travel across Karnataka & Kerala with dedicated vehicle and driver at your service.
            </p>
            <div className="svc-f">
              <span>Starts at</span>
              <b>₹13 / km</b>
            </div>
            <div style={{ marginTop: '16px' }}>
              <Button href="/booking?mode=round" variant="primary" fullWidth>
                Book Round Trip
              </Button>
            </div>
          </Card>

          <Card padded className="svc">
            <div className="svc-i">✈️</div>
            <h3 className="h3">Airport Transfers</h3>
            <p>
              24/7 punctual pick and drop service for Mangaluru International Airport (IXE) with flight monitoring.
            </p>
            <div className="svc-f">
              <span>Flat rate</span>
              <b>₹900</b>
            </div>
            <div style={{ marginTop: '16px' }}>
              <Button href="/booking?mode=airport" variant="accent" fullWidth>
                Book Airport Cab
              </Button>
            </div>
          </Card>

          <Card padded className="svc">
            <div className="svc-i">🏙️</div>
            <h3 className="h3">Local Rentals</h3>
            <p>
              Hourly rental packages (4 Hrs / 40 Km, 8 Hrs / 80 Km, 12 Hrs / 120 Km) for city errands and meetings.
            </p>
            <div className="svc-f">
              <span>8 Hr / 80 Km</span>
              <b>₹2,200</b>
            </div>
            <div style={{ marginTop: '16px' }}>
              <Button href="/booking?mode=local" variant="ghost" fullWidth>
                Book Local Rental
              </Button>
            </div>
          </Card>

          <Card padded className="svc">
            <div className="svc-i">🌴</div>
            <h3 className="h3">Holiday Packages</h3>
            <p>
              Curated tour itineraries covering Udupi, Coorg, Murdeshwar, Chikmagalur, and coastal pilgrimage spots.
            </p>
            <div className="svc-f">
              <span>From</span>
              <b>₹3,200</b>
            </div>
            <div style={{ marginTop: '16px' }}>
              <Button href="/packages" variant="ghost" fullWidth>
                Explore Packages
              </Button>
            </div>
          </Card>
        </div>
      </Container>
    </section>
  );
}
