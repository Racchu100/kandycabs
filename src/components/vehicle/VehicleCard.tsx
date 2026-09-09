import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DetailedVehicle } from '@/config/siteData';

interface VehicleCardProps {
  vehicle: DetailedVehicle;
}

export const VehicleCard: React.FC<VehicleCardProps> = ({ vehicle }) => {
  return (
    <Card className="vc">
      <div className="vc-top">
        <span className="vc-eta">
          ⭐ {vehicle.rating} ({vehicle.reviewsCount} reviews)
        </span>
        <span
          style={{
            marginLeft: 'auto',
            fontSize: '11px',
            fontWeight: 700,
            color: vehicle.availableNow ? 'var(--green)' : 'var(--muted)',
          }}
        >
          {vehicle.availableNow ? '● Available' : '○ On Duty'}
        </span>
      </div>

      <Link href={`/fleet/${vehicle.id}`} className="vc-art" style={{ textDecoration: 'none' }}>
        <div className="artw">
          <span style={{ fontSize: '56px', userSelect: 'none' }}>🚕</span>
        </div>
      </Link>

      <div className="vc-b">
        <div className="vc-nm">
          <Link href={`/fleet/${vehicle.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <h3>{vehicle.name}</h3>
          </Link>
          <span className="vc-pr">₹{vehicle.baseRatePerKm}/km</span>
        </div>
        <div className="vc-sp">
          <p>
            {vehicle.category} · {vehicle.seats} Seats · AC
          </p>
        </div>

        <div style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {vehicle.features.slice(0, 3).map((feat, i) => (
            <span
              key={i}
              style={{
                fontSize: '10px',
                padding: '3px 8px',
                borderRadius: '6px',
                background: 'var(--line2)',
                color: 'var(--ink2)',
                fontWeight: 600,
              }}
            >
              {feat}
            </span>
          ))}
        </div>

        <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
          <Button href={`/fleet/${vehicle.id}`} variant="ghost" style={{ flex: 1, padding: '8px 12px', fontSize: '13px' }}>
            Details
          </Button>
          <Button href={`/booking?vehicle=${vehicle.id}`} variant="accent" style={{ flex: 1, padding: '8px 12px', fontSize: '13px' }}>
            Book Cab
          </Button>
        </div>
      </div>
    </Card>
  );
};
