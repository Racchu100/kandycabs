'use client';

import React, { useState, useEffect } from 'react';
import { Container } from '@/components/ui/Container';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface Props {
  bookingId: string;
}

export const CustomerBookingDetailsView: React.FC<Props> = ({ bookingId }) => {
  const [booking, setBooking] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchBooking() {
      try {
        const token = localStorage.getItem('kc_token') || '';
        const res = await fetch(`/api/bookings/${bookingId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to fetch booking details');
        }

        setBooking(data.booking);
      } catch (err: any) {
        setErrorMsg(err.message || 'Access denied or booking not found.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchBooking();
  }, [bookingId]);

  if (isLoading) {
    return (
      <section className="sec">
        <Container>
          <Card padded style={{ maxWidth: '640px', margin: '0 auto', textAlign: 'center' }}>
            <p className="muted">Loading booking details...</p>
          </Card>
        </Container>
      </section>
    );
  }

  if (errorMsg || !booking) {
    return (
      <section className="sec">
        <Container>
          <Card padded style={{ maxWidth: '640px', margin: '0 auto', background: '#FEE2E2', color: '#991B1B' }}>
            <h2 className="h3">Access Error</h2>
            <p style={{ marginTop: '6px' }}>{errorMsg || 'Booking not found.'}</p>
            <div style={{ marginTop: '16px' }}>
              <Button href="/customer/dashboard" variant="primary">
                Return to Dashboard
              </Button>
            </div>
          </Card>
        </Container>
      </section>
    );
  }

  return (
    <section className="sec" style={{ padding: '24px 0 60px' }}>
      <Container>
        <Card padded style={{ maxWidth: '680px', margin: '0 auto', background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <span className="pill green">Ref: {booking.bookingReference}</span>
              <h1 className="h2" style={{ marginTop: '6px' }}>Booking Details</h1>
            </div>
            <Button href="/customer/dashboard" variant="ghost" style={{ fontSize: '13px', padding: '6px 12px' }}>
              ← Dashboard
            </Button>
          </div>

          {/* Status Banner */}
          <div
            style={{
              background: 'var(--accent-soft)',
              color: 'var(--accent)',
              padding: '12px 16px',
              borderRadius: 'var(--r-m)',
              fontWeight: 700,
              fontSize: '14px',
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>Status: {booking.statusLabel || booking.status}</span>
            <span style={{ fontSize: '12px', background: '#fff', padding: '4px 8px', borderRadius: '4px' }}>
              No Live Map Tracking
            </span>
          </div>

          {/* Trip Start OTP Box */}
          {booking.tripStartOtp && (
            <div
              style={{
                background: '#FEF3C7',
                border: '1px solid #F59E0B',
                color: '#92400E',
                padding: '14px',
                borderRadius: 'var(--r-m)',
                marginBottom: '20px',
                textAlign: 'center',
              }}
            >
              <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 700 }}>
                Trip Start Verification OTP Code
              </span>
              <div style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '8px', margin: '4px 0' }}>
                {booking.tripStartOtp}
              </div>
              <p style={{ fontSize: '12px', margin: 0 }}>
                Share this 4-digit code with your chauffeur upon vehicle arrival to initiate trip meter.
              </p>
            </div>
          )}

          {/* Location & Details Table */}
          <div className="sum" style={{ margin: '0 0 20px', background: 'var(--bg-soft)', padding: '16px', borderRadius: 'var(--r-m)' }}>
            <div className="srow">
              <span>Trip Mode</span>
              <b>{booking.tripMode}</b>
            </div>
            {booking.tripDays && (
              <div className="srow">
                <span>Trip Duration</span>
                <b>{booking.tripDays} Days</b>
              </div>
            )}
            <div className="srow">
              <span>Pickup Location</span>
              <b>{booking.pickupAddress}</b>
            </div>
            <div className="srow">
              <span>Drop Location</span>
              <b>{booking.dropAddress}</b>
            </div>
            <div className="srow">
              <span>Pickup Date & Time</span>
              <b>{booking.pickupTime}</b>
            </div>
            <div className="srow">
              <span>Assigned Vehicle</span>
              <b>{booking.vehicleModel || booking.vehicleName || 'Cab'} ({booking.vehicleRegistration})</b>
            </div>
            <div className="srow">
              <span>Chauffeur / Driver</span>
              <b>{booking.driverName || 'Assigned Driver'}</b>
            </div>
          </div>

          {/* Driver Contact Box */}
          {booking.driverPhone && (
            <div
              style={{
                border: '1px solid var(--green)',
                background: 'var(--green-soft)',
                borderRadius: 'var(--r-m)',
                padding: '14px',
                marginBottom: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div>
                <b style={{ fontSize: '14.5px', color: 'var(--green)' }}>
                  👨‍✈️ Driver: {booking.driverName}
                </b>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                  Vehicle: {booking.vehicleModel || booking.vehicleName || 'Cab'} ({booking.vehicleRegistration})
                </div>
              </div>
              <a
                href={`tel:${booking.driverPhone.replace(/\s+/g, '')}`}
                className="btn accent"
                style={{ padding: '10px 18px', fontSize: '14px', fontWeight: 700 }}
              >
                📞 Call Driver ({booking.driverPhone})
              </a>
            </div>
          )}

          {/* Fare Snapshot */}
          <h3 className="h3" style={{ marginBottom: '12px' }}>Fare Breakdown</h3>
          <div className="sum" style={{ margin: '0 0 24px', background: 'var(--bg-soft)', padding: '16px', borderRadius: 'var(--r-m)' }}>
            <div className="srow">
              <span>Total Quoted Fare</span>
              <b>₹{Number(booking.fareBreakdown?.totalFare ?? booking.estimatedFare ?? 0).toLocaleString()}</b>
            </div>
            <div className="srow">
              <span>Advance Deposit Paid</span>
              <b style={{ color: 'var(--green)' }}>₹{Number(booking.fareBreakdown?.advanceAmount ?? booking.advancePaid ?? 0).toLocaleString()}</b>
            </div>
            <div className="srow tot">
              <span>Remaining Balance Payable</span>
              <b>₹{Number(booking.fareBreakdown?.remainingAmount ?? (booking.estimatedFare ? booking.estimatedFare - (booking.advancePaid || 0) : 0)).toLocaleString()}</b>
            </div>
          </div>

          <p className="muted" style={{ fontSize: '12px', fontStyle: 'italic' }}>
            ℹ️ {booking.fareBreakdown?.tollNotice || booking.tollNotice || 'Toll charges are extra and payable separately.'}
          </p>
        </Card>
      </Container>
    </section>
  );
};
