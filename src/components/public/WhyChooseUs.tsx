import React from 'react';
import { Card } from '@/components/ui/Card';

export const WhyChooseUs: React.FC = () => {
  const points = [
    {
      title: 'Fixed Upfront Quoting',
      description: 'Zero surge pricing, zero night allowance surprises. The fare you see is what you pay.',
      icon: '💵',
    },
    {
      title: 'All-India Permit Fleet',
      description: '100% yellow board commercial permit cabs with valid insurance and safety permits.',
      icon: '🛡️',
    },
    {
      title: 'Verified Local Chauffeurs',
      description: 'Polite, experienced drivers fluent in Kannada, Tulu, Hindi & English who know coastal routes.',
      icon: '👨‍✈️',
    },
    {
      title: '24/7 Flight Tracking',
      description: 'We track flight arrivals at Mangaluru Airport (IXE) and adjust pickup times automatically.',
      icon: '✈️',
    },
  ];

  return (
    <div className="grid4">
      {points.map((pt, idx) => (
        <Card key={idx} padded className="why" style={{ flexDirection: 'column' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>{pt.icon}</div>
          <h4>{pt.title}</h4>
          <p>{pt.description}</p>
        </Card>
      ))}
    </div>
  );
};
