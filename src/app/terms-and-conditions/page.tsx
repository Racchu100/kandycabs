import React from 'react';
import { Container } from '@/components/ui/Container';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';

export const metadata = {
  title: 'Terms & Conditions — Kandy Cabs Mangaluru',
  description: 'Terms of service, toll charge policies, driver night allowances, cancellation rules, and passenger guidelines for Kandy Cabs.',
};

export default function TermsAndConditionsPage() {
  return (
    <section className="sec">
      <Container>
        <SectionHeader
          eyebrow="Terms of Service"
          title="Terms & Conditions"
          lede="Please review the operational terms, fare calculation guidelines, and trip policies for cab rentals with Kandy Cabs."
        />

        <Card padded style={{ background: '#fff', color: 'var(--ink)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', lineHeight: 1.65 }}>
            <div>
              <h3 className="h3" style={{ marginBottom: '8px' }}>1. Upfront Quoting & Exclusions</h3>
              <p className="muted">
                All base rates quoted online include distance fare, driver daily allowance, and GST. National highway toll fees, state entry permits, and airport parking fees are payable at actuals directly by the customer unless explicitly bundled in a package.
              </p>
            </div>

            <div>
              <h3 className="h3" style={{ marginBottom: '8px' }}>2. Driver Night Allowance</h3>
              <p className="muted">
                A night allowance of ₹250 applies for journeys operating between 10:00 PM and 6:00 AM on multi-day outstation packages to compensate the driver for night duty.
              </p>
            </div>

            <div>
              <h3 className="h3" style={{ marginBottom: '8px' }}>3. Free Cancellation Window</h3>
              <p className="muted">
                Cancellations requested up to 4 hours prior to scheduled pickup time incur zero cancellation charges. Cancellations requested less than 2 hours before pickup may attract a nominal ₹300 driver mobilization fee.
              </p>
            </div>

            <div>
              <h3 className="h3" style={{ marginBottom: '8px' }}>4. Passenger Guidelines & Luggage Policy</h3>
              <p className="muted">
                Passenger count must not exceed the vehicle seating capacity specified by the Regional Transport Office (RTO) permit. Carrying hazardous materials, contraband, or smoking inside the vehicle is strictly prohibited.
              </p>
            </div>
          </div>
        </Card>
      </Container>
    </section>
  );
}
