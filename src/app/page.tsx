import React from 'react';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { BookingSearchCard } from '@/components/public/BookingSearchCard';
import { WhyChooseUs } from '@/components/public/WhyChooseUs';
import { VehicleCard } from '@/components/vehicle/VehicleCard';
import { PackageCard } from '@/components/public/PackageCard';
import { ReviewCard } from '@/components/public/ReviewCard';
import { FaqAccordion } from '@/components/public/FaqAccordion';
import { DETAILED_VEHICLES, DETAILED_PACKAGES, REVIEWS, FAQS } from '@/config/siteData';

export default function HomePage() {
  return (
    <div className="pg-home">
      {/* Hero Section */}
      <section className="hero">
        <Container>
          <div className="hpanel">
            <div className="hp-copy">
              <span className="hp-badge">Trusted Taxi Service in Mangaluru</span>
              <h1 className="h1">
                Safe. Reliable.
                <br />
                <span className="hp-accent">Always With You.</span>
              </h1>
              <p className="hp-sub">
                Outstation | Airport | Local | Rental | Packages
              </p>
              
              <div className="hp-footer">
                <div className="hp-service">
                  <b className="hp-247">24/7</b>
                  <span>At your service</span>
                </div>
                <div className="hp-features">
                  <span>✓ AC Cabs</span>
                  <span>✓ Professional Drivers</span>
                  <span>✓ Best Rates</span>
                </div>
              </div>
            </div>

            <div className="hp-art">
              <svg viewBox="0 0 520 280" fill="none" className="hp-car">
                <rect x="20" y="100" width="480" height="120" rx="30" fill="#0F172A" />
                <path d="M120 100 L180 30 L360 30 L420 100 Z" fill="#1E293B" />
                <circle cx="120" cy="220" r="40" fill="#334155" />
                <circle cx="120" cy="220" r="20" fill="#F4F6F9" />
                <circle cx="400" cy="220" r="40" fill="#334155" />
                <circle cx="400" cy="220" r="20" fill="#F4F6F9" />
                <rect x="440" y="120" width="30" height="18" rx="4" fill="#F26A21" />
              </svg>
            </div>
          </div>

          {/* Floating Booking Search Card Component */}
          <BookingSearchCard />

          {/* Fleet Brands Banner */}
          <div className="hbrands">
            <span>Our fleet</span>
            <b>MARUTI SUZUKI</b>
            <b>TOYOTA</b>
            <b>FORCE</b>
            <b>MAHINDRA</b>
            <b>HYUNDAI</b>
            <b>KIA</b>
          </div>
        </Container>
      </section>

      {/* Services Section */}
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
              <h3 className="h3">One-Way Drops</h3>
              <p>Pay only for distance traveled without forced return fares to Bengaluru, Mysore, or Goa.</p>
              <div className="svc-f">
                <span>Starts at</span>
                <b>₹14 / km</b>
              </div>
            </Card>

            <Card padded className="svc">
              <div className="svc-i">🔄</div>
              <h3 className="h3">Round Trips</h3>
              <p>Flexible multiday outstation journeys with dedicated driver and vehicles kept at your service.</p>
              <div className="svc-f">
                <span>Starts at</span>
                <b>₹13 / km</b>
              </div>
            </Card>

            <Card padded className="svc">
              <div className="svc-i">✈️</div>
              <h3 className="h3">Airport Transfers</h3>
              <p>Punctual pick and drop at Mangaluru International Airport (IXE) with flight tracking.</p>
              <div className="svc-f">
                <span>Flat rate</span>
                <b>₹900</b>
              </div>
            </Card>
          </div>
        </Container>
      </section>

      {/* Why Choose Us */}
      <section className="sec" style={{ paddingTop: 0 }}>
        <Container>
          <SectionHeader eyebrow="Why Kandy Cabs" title="Built for peace of mind" />
          <WhyChooseUs />
        </Container>
      </section>

      {/* Fleet Preview Section */}
      <section className="sec" style={{ paddingTop: 0 }}>
        <Container>
          <SectionHeader
            eyebrow="The fleet"
            title="Twelve vehicles, six categories"
            action={<Button href="/fleet" variant="ghost">View full fleet</Button>}
          />
          <div className="grid3">
            {DETAILED_VEHICLES.slice(0, 3).map((v) => (
              <VehicleCard key={v.id} vehicle={v} />
            ))}
          </div>
        </Container>
      </section>

      {/* Package Preview Section */}
      <section className="sec" style={{ paddingTop: 0 }}>
        <Container>
          <SectionHeader
            eyebrow="Holiday & pilgrimage"
            title="Ready-made travel packages"
            action={<Button href="/packages" variant="ghost">All packages</Button>}
          />
          <div className="grid3">
            {DETAILED_PACKAGES.map((pkg) => (
              <PackageCard key={pkg.id} packageData={pkg} />
            ))}
          </div>
        </Container>
      </section>

      {/* Reviews Section */}
      <section className="sec" style={{ paddingTop: 0 }}>
        <Container>
          <SectionHeader eyebrow="Reviews" title="What riders say" />
          <div className="grid3">
            {REVIEWS.slice(0, 3).map((rev) => (
              <ReviewCard key={rev.id} review={rev} />
            ))}
          </div>
        </Container>
      </section>

      {/* FAQ Section */}
      <section className="sec" style={{ paddingTop: 0 }}>
        <Container>
          <SectionHeader
            eyebrow="Got questions?"
            title="Frequently Asked Questions"
            action={<Button href="/faq" variant="ghost">View all FAQs</Button>}
          />
          <FaqAccordion items={FAQS.slice(0, 4)} />
        </Container>
      </section>
    </div>
  );
}
