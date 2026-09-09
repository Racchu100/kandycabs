import React from 'react';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { ROUTES } from '@/config/siteData';

export const metadata = {
  title: 'Outstation Fare Chart — Kandy Cabs Mangaluru',
  description: 'Fixed upfront taxi fare matrix for outstation routes from Mangaluru to Udupi, Manipal, Dharmasthala, Subramanya, Coorg, Mysore, Bengaluru.',
};

export default function FareChartPage() {
  return (
    <section className="sec">
      <Container>
        <SectionHeader
          eyebrow="Upfront pricing matrix"
          title="Outstation Route Fare Chart"
          lede="Transparent fixed fare estimates from Mangaluru city/airport. All rates include base distance, driver allowance, and GST."
        />
        <Card className="rt-tbl">
          <div className="rt-scroll">
            <table>
              <thead>
                <tr>
                  <th>Destination Route</th>
                  <th>Distance</th>
                  <th>Sedan (4 Seater)</th>
                  <th>SUV (6/7 Seater)</th>
                  <th>Tempo Traveller (13 Seater)</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {ROUTES.map((route) => (
                  <tr key={route.id}>
                    <td style={{ fontWeight: 600, color: 'var(--ink)' }}>
                      {route.origin} to {route.destination}
                    </td>
                    <td>{route.distanceKm} km</td>
                    <td className="num">₹{route.sedanFare.toLocaleString()}</td>
                    <td className="num">₹{route.suvFare.toLocaleString()}</td>
                    <td className="num">₹{route.tempoFare.toLocaleString()}</td>
                    <td>
                      <Link
                        href={`/booking?route=${route.id}`}
                        className="btn btn-g"
                        style={{ padding: '6px 14px', fontSize: '12px' }}
                      >
                        Book Route
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <p className="muted" style={{ marginTop: '16px', fontSize: '12.5px' }}>
          * Toll, parking, and interstate permit charges extra at actuals. Round-trip rates are lower per kilometre.
        </p>
      </Container>
    </section>
  );
}
