'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';

export const EnquiryForm: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div style={{ textAlign: 'center', padding: '30px 10px' }}>
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'var(--green-soft)',
            color: 'var(--green)',
            display: 'grid',
            placeItems: 'center',
            fontSize: '24px',
            margin: '0 auto 14px',
          }}
        >
          ✓
        </div>
        <h4 className="h3" style={{ marginBottom: '8px' }}>
          Enquiry Received!
        </h4>
        <p className="muted" style={{ fontSize: '13.5px' }}>
          Thank you for reaching out. Our dispatch desk will call you back within 15 minutes.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="fld2">
        <div className="fld">
          <label htmlFor="ct-name">Your Name</label>
          <input id="ct-name" type="text" placeholder="John Doe" required />
        </div>
        <div className="fld">
          <label htmlFor="ct-phone">Phone Number</label>
          <input id="ct-phone" type="tel" placeholder="9845012345" required />
        </div>
      </div>
      <div className="fld">
        <label htmlFor="ct-email">Email Address (Optional)</label>
        <input id="ct-email" type="email" placeholder="john@example.com" />
      </div>
      <div className="fld">
        <label htmlFor="ct-details">Trip Details / Requirements</label>
        <textarea
          id="ct-details"
          rows={4}
          placeholder="Tell us your travel date, route, or special requirements..."
          required
        />
      </div>
      <Button type="submit" variant="accent" fullWidth>
        Send Enquiry
      </Button>
    </form>
  );
};
