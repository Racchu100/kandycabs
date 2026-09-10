'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CustomerInvoiceModal } from '@/components/invoice/CustomerInvoiceModal';
import { getAdminBookings, AdminBookingOverview } from '@/lib/adminEngine';
import { getDriverByPhoneOrUsername } from '@/lib/driverAccountEngine';

export const CustomerDashboardView: React.FC = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'ALL' | 'UPCOMING' | 'COMPLETED' | 'CANCELLED' | 'PROFILE'>('ALL');
  const [user, setUser] = useState<any | null>(null);
  const [liveBookingsList, setLiveBookingsList] = useState<any[]>([]);
  const [invoiceBooking, setInvoiceBooking] = useState<any | null>(null);

  const loadCustomerBookings = () => {
    let currentUser: any = null;
    try {
      const stored = localStorage.getItem('kc_user') || localStorage.getItem('kc_admin_user');
      if (stored) {
        currentUser = JSON.parse(stored);
        setUser(currentUser);
      } else {
        setUser(null);
        setLiveBookingsList([]);
        return;
      }
    } catch {
      setUser(null);
      setLiveBookingsList([]);
      return;
    }

    if (!currentUser || (!currentUser.phone && !currentUser.id && !currentUser.customerId)) {
      setLiveBookingsList([]);
      return;
    }

    const cleanUserPhone = currentUser.phone ? currentUser.phone.replace(/\D/g, '') : '';
    const userPhoneSuffix = cleanUserPhone.length >= 10 ? cleanUserPhone.slice(-10) : cleanUserPhone;
    const currentUserId = currentUser.id || currentUser.customerId;

    const allAdmin = getAdminBookings();

    // STRICT USER FILTER: Match ONLY by user's phone or customerId
    const matchedBookings = allAdmin.filter((b) => {
      const bPhone = (b.customerPhone || '').replace(/\D/g, '');
      const phoneMatch = Boolean(
        userPhoneSuffix && userPhoneSuffix.length >= 7 && bPhone.includes(userPhoneSuffix)
      );
      const idMatch = Boolean(
        currentUserId && ((b as any).customerId === currentUserId || b.customerPhone === currentUser.phone)
      );
      return phoneMatch || idMatch;
    });

    // If matchedBookings is empty, filteredBookings MUST BE [] (EMPTY)!
    const filteredBookings = matchedBookings;

    const mapped = filteredBookings.map((b: AdminBookingOverview) => {
      const advance = b.advancePaid !== undefined ? b.advancePaid : Math.round((b.estimatedFare || 0) * 0.25);
      const toll = b.tollCharges || 0;
      const totalFare = (b.estimatedFare || 0) + toll;
      const remaining = b.remainingFare !== undefined ? b.remainingFare : Math.max(0, totalFare - advance);

      const isCompleted = b.status === 'COMPLETED';
      const isCancelled = b.status === 'CANCELLED';
      const isTripStarted = b.status === 'TRIP_STARTED' || Boolean(b.initialMeterKm || b.initialMeterImage);
      const isDriverAssigned = Boolean(b.assignedDriverName && b.assignedDriverName.trim() !== '');

      let statusLabel = '⏳ Pending Driver Assignment';
      let statusBadgeColor = '#92400E';
      let statusBg = '#FEF3C7';
      let statusCategory: 'UPCOMING' | 'COMPLETED' | 'CANCELLED' = 'UPCOMING';

      if (isCancelled) {
        statusLabel = '🔴 Booking Cancelled';
        statusBadgeColor = '#991B1B';
        statusBg = '#FEE2E2';
        statusCategory = 'CANCELLED';
      } else if (isCompleted) {
        statusLabel = '🏁 Trip Completed';
        statusBadgeColor = '#065F46';
        statusBg = '#ECFDF5';
        statusCategory = 'COMPLETED';
      } else if (isTripStarted) {
        statusLabel = '🚕 Trip In Progress';
        statusBadgeColor = '#0284C7';
        statusBg = '#E0F2FE';
        statusCategory = 'UPCOMING';
      } else if (isDriverAssigned) {
        statusLabel = `👨‍✈️ Driver Assigned (${b.assignedDriverName})`;
        statusBadgeColor = '#065F46';
        statusBg = '#D1FAE5';
        statusCategory = 'UPCOMING';
      }

      return {
        id: b.id,
        reference: b.bookingReference || b.id,
        mode: b.tripMode || 'Outstation Cab Service',
        tripDays: b.tripDays,
        pickup: b.pickupAddress,
        drop: b.dropAddress,
        datetime: b.pickupTime || 'As Scheduled',
        vehicleModel: b.vehicleModel || 'Swift Dzire (AC Sedan)',
        vehicleReg: b.assignedVehicleReg || '',
        vendorAgency: b.vendorAgencyName || 'Sri Durga Travels & Cab Service',
        driverName: b.assignedDriverName || '',
        driverPhone: b.driverPhone || '',
        status: b.status,
        statusLabel,
        statusBadgeColor,
        statusBg,
        statusCategory,
        fare: b.estimatedFare || 0,
        tollCharges: toll,
        totalFare,
        advance,
        remaining,
        tripStartOtp: b.startOtp || '4829',
        initialMeterKm: b.initialMeterKm,
        initialMeterImage: b.initialMeterImage,
        finalMeterKm: b.finalMeterKm,
        finalMeterImage: b.finalMeterImage,
        tollReceiptImage: b.tollReceiptImage,
        createdAt: b.createdAt || new Date().toISOString(),
        rawBooking: b,
      };
    });

    setLiveBookingsList(mapped);
  };

  useEffect(() => {
    loadCustomerBookings();

    const handleSync = () => {
      loadCustomerBookings();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleSync);
      window.addEventListener('new_booking_created', handleSync);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleSync);
        window.removeEventListener('new_booking_created', handleSync);
      }
    };
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('kc_token');
      localStorage.removeItem('kc_user');
      router.push('/login');
    } catch {
      router.push('/login');
    }
  };

  const upcomingBookings = liveBookingsList.filter((b) => b.statusCategory === 'UPCOMING');
  const completedBookings = liveBookingsList.filter((b) => b.statusCategory === 'COMPLETED');
  const cancelledBookings = liveBookingsList.filter((b) => b.statusCategory === 'CANCELLED');

  const getFilteredList = () => {
    if (activeTab === 'UPCOMING') return upcomingBookings;
    if (activeTab === 'COMPLETED') return completedBookings;
    if (activeTab === 'CANCELLED') return cancelledBookings;
    return liveBookingsList;
  };

  const currentDisplayedList = getFilteredList();

  const totalSpent = completedBookings.reduce((sum, b) => sum + (b.totalFare || b.fare || 0), 0);

  return (
    <section className="sec" style={{ padding: '24px 0 60px' }}>
      <Container>
        {/* Customer Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <span className="pill green" style={{ marginBottom: '6px', display: 'inline-block' }}>
              Verified Rider Profile
            </span>
            <h1 className="h2" style={{ margin: 0 }}>
              {liveBookingsList.length > 0 ? `Welcome back, ${user?.fullName || 'Valued Customer'}` : `Welcome, ${user?.fullName || 'Valued Customer'}`}
            </h1>
            <p className="muted" style={{ fontSize: '13.5px', margin: '4px 0 0' }}>
              📱 Mobile: <b>{user?.phone || ''}</b> {user?.email ? `· 📧 ${user.email}` : ''}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Button href="/booking" variant="accent" style={{ padding: '8px 16px', fontSize: '13px' }}>
              🚗 Book a New Cab
            </Button>
            <Button onClick={handleLogout} variant="ghost" style={{ padding: '8px 16px', fontSize: '13px' }}>
              Logout 🚪
            </Button>
          </div>
        </div>

        {/* Registered Driver Banner */}
        {(() => {
          const registeredDriver = user?.phone ? getDriverByPhoneOrUsername(user.phone) : null;
          if (!registeredDriver) return null;
          return (
            <div
              style={{
                background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)',
                color: '#FFFFFF',
                padding: '16px 20px',
                borderRadius: '12px',
                marginBottom: '24px',
                boxShadow: '0 4px 16px rgba(49, 46, 129, 0.3)',
                border: '1.5px solid #4338CA',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '32px' }}>👨‍✈️</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '15px', color: '#FDE047' }}>
                    Registered Driver Account — {registeredDriver.fullName} ({registeredDriver.vehicleRegistration || 'Active Driver'})
                  </div>
                  <div style={{ fontSize: '13px', color: '#E0E7FF', marginTop: '2px' }}>
                    Mobile <b>+91 {registeredDriver.phone}</b> is registered as an active driver. Tap below to view your driver dashboard and start assigned tasks.
                  </div>
                </div>
              </div>
              <Button
                onClick={() => router.push('/driver/dashboard')}
                style={{
                  background: '#F59E0B',
                  color: '#000000',
                  fontWeight: 800,
                  fontSize: '13px',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                🚕 Open Driver Dashboard & Start Tasks
              </Button>
            </div>
          );
        })()}

        {/* Dashboard Statistics KPIs */}
        <div className="grid4" style={{ marginBottom: '24px' }}>
          <Card padded style={{ background: '#fff' }}>
            <span className="muted" style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 700 }}>
              Total Bookings
            </span>
            <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '4px', color: 'var(--ink)' }}>
              {liveBookingsList.length} Trips
            </div>
          </Card>

          <Card padded style={{ background: '#fff' }}>
            <span className="muted" style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 700 }}>
              Active / Upcoming
            </span>
            <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '4px', color: 'var(--accent)' }}>
              {upcomingBookings.length} Active
            </div>
          </Card>

          <Card padded style={{ background: '#fff' }}>
            <span className="muted" style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 700 }}>
              Completed Rides
            </span>
            <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '4px', color: 'var(--green)' }}>
              {completedBookings.length} Completed
            </div>
          </Card>

          <Card padded style={{ background: '#fff' }}>
            <span className="muted" style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 700 }}>
              Total Travel Spend
            </span>
            <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '4px', color: 'var(--ink)' }}>
              ₹{totalSpent > 0 ? totalSpent.toLocaleString('en-IN') : '0'}
            </div>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <div className="search-tabs" style={{ marginBottom: '20px', background: '#fff', padding: '6px', borderRadius: 'var(--r-m)' }}>
          {[
            { id: 'ALL', label: `📋 All Bookings (${liveBookingsList.length})` },
            { id: 'UPCOMING', label: `🚀 Upcoming & Active (${upcomingBookings.length})` },
            { id: 'COMPLETED', label: `🏁 Previous / Completed (${completedBookings.length})` },
            { id: 'CANCELLED', label: `🔴 Cancelled (${cancelledBookings.length})` },
            { id: 'PROFILE', label: '👨‍💼 Profile & Account' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              className={`tab ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id as any)}
              style={{ fontSize: '13px', padding: '8px 14px' }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content: Bookings List */}
        {activeTab !== 'PROFILE' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {currentDisplayedList.length === 0 ? (
              <Card padded style={{ textAlign: 'center', background: '#fff', padding: '40px 20px' }}>
                <p className="muted">No bookings found in this category.</p>
                <div style={{ marginTop: '16px' }}>
                  <Button href="/booking" variant="accent">
                    Book a New Cab Now
                  </Button>
                </div>
              </Card>
            ) : (
              currentDisplayedList.map((b: any) => (
                <Card key={b.id} padded style={{ background: '#fff' }}>
                  {/* Header Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span className="pill green" style={{ fontSize: '12px', fontWeight: 800 }}>
                          Ref: {b.reference}
                        </span>
                        <span
                          style={{
                            background: b.statusBg,
                            color: b.statusBadgeColor,
                            padding: '4px 10px',
                            borderRadius: 'var(--r-m)',
                            fontSize: '12px',
                            fontWeight: 800,
                          }}
                        >
                          {b.statusLabel}
                        </span>
                      </div>
                      <h3 className="h3" style={{ marginTop: '6px', marginBottom: '2px' }}>{b.mode}</h3>
                      <div style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 600 }}>
                        📅 Pickup Date & Time: <b>{b.datetime}</b>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700 }}>
                        Total Trip Fare
                      </div>
                      <div style={{ fontSize: '22px', fontWeight: 900, color: 'var(--ink)' }}>
                        ₹{b.totalFare.toLocaleString('en-IN')}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--muted)' }}>
                        Adv Paid: <b style={{ color: '#059669' }}>₹{b.advance}</b> · Bal: <b style={{ color: '#DC2626' }}>₹{b.remaining}</b>
                      </div>
                    </div>
                  </div>

                  {/* Route Summary Box */}
                  <div className="sum" style={{ margin: '0 0 16px', background: 'var(--bg-soft)', padding: '14px', borderRadius: 'var(--r-m)' }}>
                    <div className="srow">
                      <span>📍 Pickup Location</span>
                      <b>{b.pickup}</b>
                    </div>
                    <div className="srow">
                      <span>🏁 Drop Destination</span>
                      <b>{b.drop}</b>
                    </div>
                    {b.tripDays && (
                      <div className="srow">
                        <span>Duration</span>
                        <b>{b.tripDays} Days</b>
                      </div>
                    )}
                    <div className="srow">
                      <span>Vehicle Category</span>
                      <b>{b.vehicleModel} {b.vehicleReg ? `[${b.vehicleReg}]` : ''}</b>
                    </div>
                    <div className="srow">
                      <span>Travel Desk Partner</span>
                      <b>🏢 {b.vendorAgency}</b>
                    </div>
                  </div>

                  {/* Driver Details Card (High Visibility when Driver Assigned) */}
                  {b.driverName ? (
                    <div
                      style={{
                        background: '#ECFDF5',
                        border: '1.5px solid #A7F3D0',
                        borderRadius: '8px',
                        padding: '14px',
                        marginBottom: '16px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: 800, color: '#047857', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                            👨‍✈️ ASSIGNED CHAUFFEUR & VEHICLE DETAILS:
                          </div>
                          <div style={{ fontSize: '16px', fontWeight: 800, color: '#064E3B', marginTop: '4px' }}>
                            👨‍✈️ {b.driverName}
                          </div>
                          <div style={{ fontSize: '13px', color: '#047857', marginTop: '2px', fontWeight: 600 }}>
                            📱 Mobile: <b>{b.driverPhone || 'N/A'}</b> · 🚗 Car: <b>{b.vehicleModel}</b> {b.vehicleReg ? `[${b.vehicleReg}]` : ''}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {b.driverPhone && (
                            <a
                              href={`tel:${b.driverPhone.replace(/\s+/g, '')}`}
                              className="btn dark"
                              style={{ padding: '8px 14px', fontSize: '13px', fontWeight: 800, background: '#065F46', color: '#fff' }}
                            >
                              📞 Call Driver ({b.driverPhone})
                            </a>
                          )}
                          <Button
                            href={`/itinerary/${encodeURIComponent(b.reference)}`}
                            variant="accent"
                            style={{ padding: '8px 14px', fontSize: '13px', fontWeight: 800 }}
                          >
                            💬 WhatsApp Itinerary
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        background: '#FEF3C7',
                        border: '1px solid #FCD34D',
                        borderRadius: '8px',
                        padding: '12px 14px',
                        marginBottom: '16px',
                        color: '#92400E',
                        fontSize: '13px',
                        fontWeight: 600,
                      }}
                    >
                      ⏳ <b>Chauffeur Assignment In Progress:</b> Travel desk dispatch control is assigning your vehicle and driver details. Driver info will reflect here shortly!
                    </div>
                  )}

                  {/* Trip Start Verification OTP Card */}
                  {b.status !== 'COMPLETED' && b.status !== 'CANCELLED' && (
                    <div
                      style={{
                        background: '#FFFBEB',
                        border: '1.5px solid #F59E0B',
                        color: '#92400E',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '10px',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 800, color: '#B45309' }}>
                          🔑 TRIP START VERIFICATION OTP CODE:
                        </div>
                        <div style={{ fontSize: '12px', color: '#78350F', marginTop: '2px', fontWeight: 600 }}>
                          Share this 4-digit code with your chauffeur upon vehicle pickup to start trip meter.
                        </div>
                      </div>

                      <div style={{ background: '#FFFFFF', border: '2px solid #D97706', padding: '6px 16px', borderRadius: '8px', fontSize: '24px', fontWeight: 900, color: '#92400E', letterSpacing: '4px' }}>
                        {b.tripStartOtp}
                      </div>
                    </div>
                  )}

                  {/* Geotagged Odometer & Evidence (If available) */}
                  {(b.initialMeterKm || b.finalMeterKm || b.initialMeterImage || b.finalMeterImage) && (
                    <div style={{ background: '#F8FAFC', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--line)', marginBottom: '16px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--ink)', textTransform: 'uppercase', marginBottom: '8px' }}>
                        📸 Geotagged Odometer Evidence & Meter Readings:
                      </div>
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        {b.initialMeterKm && (
                          <div style={{ fontSize: '12px', color: '#1D4ED8', fontWeight: 700 }}>
                            Pickup Odometer: <b>{b.initialMeterKm} KM</b>
                          </div>
                        )}
                        {b.finalMeterKm && (
                          <div style={{ fontSize: '12px', color: '#059669', fontWeight: 700 }}>
                            Dropoff Odometer: <b>{b.finalMeterKm} KM</b>
                          </div>
                        )}
                        {b.tollCharges > 0 && (
                          <div style={{ fontSize: '12px', color: '#B45309', fontWeight: 700 }}>
                            Toll Gate Charges: <b>+₹{b.tollCharges}</b>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', paddingTop: '8px', borderTop: '1px solid var(--line)' }}>
                    <div style={{ fontSize: '12.5px', color: 'var(--muted)', fontWeight: 600 }}>
                      Advance Paid: <b style={{ color: '#059669' }}>₹{b.advance}</b> · Remaining Balance: <b style={{ color: b.remaining > 0 ? '#DC2626' : '#059669' }}>₹{b.remaining}</b>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <Button
                        href={`/itinerary/${encodeURIComponent(b.reference)}`}
                        variant="ghost"
                        style={{ padding: '8px 12px', fontSize: '12.5px', fontWeight: 700 }}
                      >
                        📄 View Online Itinerary
                      </Button>

                      <Button
                        type="button"
                        onClick={() => setInvoiceBooking({
                          id: b.id,
                          bookingReference: b.reference || b.id,
                          customerName: user?.fullName || 'Valued Customer',
                          customerPhone: user?.phone || '+91 98450 12345',
                          pickupAddress: b.pickup,
                          dropAddress: b.drop,
                          tripMode: b.mode,
                          status: b.status,
                          estimatedFare: b.fare,
                          advancePaid: b.advance,
                          remainingFare: b.remaining,
                          assignedDriverName: b.driverName,
                          driverPhone: b.driverPhone,
                          vehicleModel: b.vehicleModel,
                          assignedVehicleReg: b.vehicleReg,
                          vendorAgencyName: b.vendorAgency,
                        })}
                        variant="primary"
                        style={{ padding: '8px 14px', fontSize: '12.5px', fontWeight: 800 }}
                      >
                        🧾 View & Download Invoice →
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Tab Content: Customer Profile */}
        {activeTab === 'PROFILE' && (
          <Card padded style={{ background: '#fff', maxWidth: '640px' }}>
            <h2 className="h3" style={{ marginBottom: '16px' }}>Customer Account Profile</h2>
            <form onSubmit={(e) => e.preventDefault()}>
              <div className="fld">
                <label>Full Name</label>
                <input type="text" defaultValue={user?.fullName || ''} placeholder="Enter your full name" />
              </div>
              <div className="fld">
                <label>Registered Mobile Number (Verified)</label>
                <input type="tel" defaultValue={user?.phone || ''} readOnly style={{ background: 'var(--bg-soft)' }} />
              </div>
              <div className="fld">
                <label>Email Address</label>
                <input type="email" defaultValue={user?.email || ''} placeholder="e.g. name@domain.com" />
              </div>
              <div className="fld">
                <label>Default Pickup Address</label>
                <input type="text" defaultValue="Mangaluru City, Karnataka" />
              </div>
              <Button type="button" variant="accent" style={{ marginTop: '12px' }}>
                Save Profile Changes 💾
              </Button>
            </form>
          </Card>
        )}

        {/* Interactive Tax Invoice Modal */}
        {invoiceBooking && (
          <CustomerInvoiceModal
            booking={invoiceBooking}
            onClose={() => setInvoiceBooking(null)}
          />
        )}
      </Container>
    </section>
  );
};
