import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DETAILED_PACKAGES } from '@/config/siteData';

interface PackageDetailsPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PackageDetailsPageProps) {
  const { id } = await params;
  const pkg = DETAILED_PACKAGES.find((p) => p.id === id);
  if (!pkg) return { title: 'Package Not Found' };
  return {
    title: `${pkg.title} (${pkg.duration}) — Kandy Cabs Mangaluru`,
    description: pkg.description,
  };
}

export default async function PackageDetailsPage({ params }: PackageDetailsPageProps) {
  const { id } = await params;
  const pkg = DETAILED_PACKAGES.find((p) => p.id === id);

  if (!pkg) {
    notFound();
  }

  return (
    <section className="sec">
      <Container>
        <div style={{ marginBottom: '16px' }}>
          <Link href="/packages" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--muted)' }}>
            ← Back to Packages
          </Link>
        </div>

        <SectionHeader
          eyebrow={pkg.duration}
          title={pkg.title}
          lede={pkg.description}
        />

        <div className="ct-grid">
          <div>
            <Card padded>
              <h3 className="h3" style={{ marginBottom: '18px' }}>
                Day-by-Day Itinerary
              </h3>
              <div className="tl" style={{ borderLeftColor: 'var(--accent)' }}>
                {pkg.itinerary.map((item) => (
                  <div key={item.day} className="tl-i">
                    <span className="tl-y">DAY {item.day}</span>
                    <h4>{item.title}</h4>
                    <p style={{ marginTop: '4px', lineHeight: 1.6 }}>{item.details}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card padded style={{ marginTop: '20px' }}>
              <h3 className="h3" style={{ marginBottom: '14px' }}>
                Inclusions & Exclusions
              </h3>
              <div className="fld2">
                <div>
                  <b style={{ color: 'var(--green)', fontSize: '13px', display: 'block', marginBottom: '8px' }}>
                    ✓ What's Included
                  </b>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {pkg.inclusions.map((inc, i) => (
                      <li key={i} style={{ fontSize: '13px', color: 'var(--ink2)' }}>
                        • {inc}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <b style={{ color: 'var(--accent)', fontSize: '13px', display: 'block', marginBottom: '8px' }}>
                    ✕ Exclusions
                  </b>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {pkg.exclusions.map((exc, i) => (
                      <li key={i} style={{ fontSize: '13px', color: 'var(--muted)' }}>
                        • {exc}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          </div>

          <div>
            <Card padded>
              <h3 className="h3" style={{ marginBottom: '16px' }}>
                Package Fare Summary
              </h3>

              <div className="sum" style={{ margin: 0 }}>
                <div className="srow">
                  <span>Duration</span>
                  <b>{pkg.duration}</b>
                </div>
                <div className="srow">
                  <span>Recommended Vehicle</span>
                  <b>{pkg.recommendedVehicle}</b>
                </div>
                <div className="srow tot">
                  <span>Starting Package Price</span>
                  <b>₹{pkg.startingPrice.toLocaleString()}</b>
                </div>
              </div>

              <p className="muted" style={{ fontSize: '12px', marginTop: '12px', lineHeight: 1.5 }}>
                * Final fare depends on chosen vehicle category (Sedan vs SUV vs Tempo) and pickup point. GST included.
              </p>

              <div style={{ marginTop: '24px' }}>
                <Button href={`/booking?package=${pkg.id}`} variant="accent" fullWidth style={{ padding: '14px' }}>
                  Reserve This Package
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </Container>
    </section>
  );
}
