import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DetailedPackage } from '@/config/siteData';

interface PackageCardProps {
  packageData: DetailedPackage;
}

export const PackageCard: React.FC<PackageCardProps> = ({ packageData }) => {
  return (
    <Card className="pkg">
      <Link href={`/packages/${packageData.id}`} className="pkg-im" style={{ padding: '24px', color: '#fff', textDecoration: 'none', display: 'block' }}>
        <span className="pkg-d">{packageData.duration}</span>
        <h3 className="h3" style={{ marginTop: '36px', color: '#fff', fontSize: '20px' }}>
          {packageData.title}
        </h3>
      </Link>

      <div className="pkg-b">
        <p>{packageData.highlights}</p>

        <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--muted)' }}>
          Recommended: <strong>{packageData.recommendedVehicle}</strong>
        </div>

        <div className="pkg-f">
          <span>Starting from</span>
          <b>₹{packageData.startingPrice.toLocaleString()}</b>
        </div>

        <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
          <Button href={`/packages/${packageData.id}`} variant="ghost" style={{ flex: 1, padding: '8px 12px', fontSize: '13px' }}>
            Itinerary
          </Button>
          <Button href={`/booking?package=${packageData.id}`} variant="accent" style={{ flex: 1, padding: '8px 12px', fontSize: '13px' }}>
            Book Tour
          </Button>
        </div>
      </div>
    </Card>
  );
};
