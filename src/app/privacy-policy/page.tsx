import React from 'react';
import { Container } from '@/components/ui/Container';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';

export const metadata = {
  title: 'Privacy Policy — Kandy Cabs Mangaluru',
  description: 'Learn how Kandy Cabs collects, protects, and uses customer personal information and trip data.',
};

export default function PrivacyPolicyPage() {
  return (
    <section className="sec">
      <Container>
        <SectionHeader
          eyebrow="Legal & Privacy"
          title="Privacy Policy"
          lede="At Kandy Cabs, we respect your personal privacy and are committed to protecting the data you share when booking taxis or using our services."
        />

        <Card padded style={{ background: '#fff', color: 'var(--ink)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', lineHeight: 1.65 }}>
            <div>
              <h3 className="h3" style={{ marginBottom: '8px' }}>1. Information We Collect</h3>
              <p className="muted">
                When you initiate a booking or enquiry with Kandy Cabs, we collect essential details necessary to complete your journey. This includes your full name, primary phone number, email address, pickup location, drop destination, and travel dates.
              </p>
            </div>

            <div>
              <h3 className="h3" style={{ marginBottom: '8px' }}>2. How We Use Your Data</h3>
              <p className="muted">
                Your data is exclusively utilized to process cab reservations, assign qualified drivers, send ride confirmation SMS/WhatsApp alerts, and provide customer support. We do not sell or share customer contact details with external third-party advertisers.
              </p>
            </div>

            <div>
              <h3 className="h3" style={{ marginBottom: '8px' }}>3. Data Security & Storage</h3>
              <p className="muted">
                All digital communications between your browser and our platform are encrypted using industry-standard SSL/TLS protocols. Access to customer booking logs is restricted strictly to authorized dispatch staff and operational handlers.
              </p>
            </div>

            <div>
              <h3 className="h3" style={{ marginBottom: '8px' }}>4. Contact & Support</h3>
              <p className="muted">
                For questions or requests regarding your personal information, contact our privacy desk at <strong>privacy@kandycabs.in</strong> or call our 24/7 hotline at <strong>+91 99008 87777</strong>.
              </p>
            </div>
          </div>
        </Card>
      </Container>
    </section>
  );
}
