import React from 'react';
import { Container } from '@/components/ui/Container';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { LazyMap } from '@/components/maps/LazyMap';
import { EnquiryForm } from '@/components/public/EnquiryForm';
import { DriverJoinRequestForm } from '@/components/public/DriverJoinRequestForm';

export const metadata = {
  title: 'Contact Us & Driver Partner Onboarding — Kandy Cabs Mangaluru',
  description: 'Get in touch with Kandy Cabs Mangaluru for taxi bookings or submit a driver partner onboarding request to join our team.',
};

export default function ContactPage() {
  return (
    <section className="sec">
      <Container>
        <SectionHeader
          eyebrow="Get in touch & Join our team"
          title="We are here to help you plan your journey"
          lede="Call us 24/7 or fill out the enquiry form below. Drivers looking to join our team can submit their details below and our team will contact you!"
        />

        <div className="ct-grid">
          <div>
            <Card padded>
              <div className="cl">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.4 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" />
                </svg>
                <div>
                  <b>24/7 Phone Booking</b>
                  <p>
                    <a href="tel:9900887777" style={{ color: 'var(--ink)' }}>+91 99008 87777</a>
                  </p>
                </div>
              </div>

              <div className="cl">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
                <div>
                  <b>Instant WhatsApp Support</b>
                  <p>
                    <a
                      href="https://wa.me/919900887777?text=Hi%20Kandy%20Cabs,%20I%20want%20to%20enquire%20about%20a%20cab%20booking"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--green)', fontWeight: 700 }}
                    >
                      Chat on WhatsApp (+91 99008 87777)
                    </a>
                  </p>
                </div>
              </div>

              <div className="cl">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <div>
                  <b>Main Office Address</b>
                  <p>Inland Impala, Vidyaranyanagar, Ullala, Mangaluru — 575020</p>
                </div>
              </div>

              <div className="cl">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-10 7L2 7" />
                </svg>
                <div>
                  <b>Email Enquiries</b>
                  <p>bookings@kandycabs.in</p>
                </div>
              </div>

              {/* On-demand Lazy Loaded Map */}
              <div style={{ marginTop: '20px' }}>
                <LazyMap title="Kandy Cabs Mangaluru Office" height="260px" />
              </div>
            </Card>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <Card padded>
              <h3 className="h3" style={{ marginBottom: '16px' }}>
                Send an Enquiry
              </h3>
              <EnquiryForm />
            </Card>

            <Card padded style={{ border: '2px solid #BFDBFE', background: '#F8FAFC' }}>
              <h3 className="h3" style={{ marginBottom: '12px', color: '#1E3A8A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>👨‍✈️</span>
                <span>Driver Partner Request — Join Our Team</span>
              </h3>
              <DriverJoinRequestForm />
            </Card>
          </div>
        </div>
      </Container>
    </section>
  );
}
