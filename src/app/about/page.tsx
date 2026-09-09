import React from 'react';
import { Container } from '@/components/ui/Container';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';

export const metadata = {
  title: 'About Us — Kandy Cabs Mangaluru',
  description: 'Learn about Kandy Cabs — trusted taxi travel service in Mangaluru operating since 2012 with 14 years of reliable service.',
};

export default function AboutPage() {
  return (
    <section className="sec">
      <Container>
        <SectionHeader
          eyebrow="Our story"
          title="Fourteen years of trusted travel across the coast"
          lede="Founded in 2012 in Ullala, Mangaluru, Kandy Cabs was built on a simple promise: transparent upfront fares, reliable vehicles, and respectful local drivers."
        />

        <div className="ab-hero">
          <Card padded style={{ background: '#0F172A', color: '#fff' }}>
            <h3 className="h3" style={{ color: '#fff', fontSize: '22px', marginBottom: '14px' }}>
              Built on Trust & Upfront Pricing
            </h3>
            <p style={{ opacity: 0.85, lineHeight: 1.6 }}>
              Whether it’s an urgent early morning airport drop, a family weekend pilgrimage to Subramanya, or a long-distance drop to Bengaluru, our drivers prioritize safety, punctuality, and comfort above all else.
            </p>
            <div style={{ marginTop: '24px', display: 'flex', gap: '24px' }}>
              <div>
                <b style={{ fontSize: '24px', color: 'var(--accent)' }}>9,400+</b>
                <span style={{ display: 'block', fontSize: '11px', opacity: 0.7 }}>Trips Completed</span>
              </div>
              <div>
                <b style={{ fontSize: '24px', color: 'var(--accent)' }}>4.8 ★</b>
                <span style={{ display: 'block', fontSize: '11px', opacity: 0.7 }}>Google Rating</span>
              </div>
              <div>
                <b style={{ fontSize: '24px', color: 'var(--accent)' }}>100%</b>
                <span style={{ display: 'block', fontSize: '11px', opacity: 0.7 }}>Permit Compliant</span>
              </div>
            </div>
          </Card>

          <div className="tl">
            <div className="tl-i">
              <span className="tl-y">2012</span>
              <h4>Founded in Mangaluru</h4>
              <p>Started operations with 2 cars catering to local city rentals and airport drops.</p>
            </div>
            <div className="tl-i">
              <span className="tl-y">2017</span>
              <h4>Outstation Expansion</h4>
              <p>Expanded fleet to include Innova Crystas and Tempo Travellers for outstation group trips.</p>
            </div>
            <div className="tl-i">
              <span className="tl-y">2026</span>
              <h4>High-End Digital Platform</h4>
              <p>Launched upfront fare calculation engine with instant online reservation support.</p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
