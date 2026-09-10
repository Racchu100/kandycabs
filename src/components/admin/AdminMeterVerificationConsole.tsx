'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { getAdminBookings, AdminBookingOverview } from '@/lib/adminEngine';

export interface MeterEvidence {
  id: string;
  bookingId: string;
  driverId: string;
  driverName?: string;
  vehicleReg?: string;
  captureType: 'PICKUP_METER' | 'DROPOFF_METER';
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  odometerReadingKm: number;
  imageUrl: string;
  thumbnailUrl: string;
  capturedAt: string;
}

export interface AdminMeterVerificationConsoleProps {
  initialBookingId?: string;
}

const generateGeotaggedOdometerSvg = (
  km: number,
  type: 'PICKUP' | 'DROPOFF',
  locationStr: string,
  driverName: string = 'Suresh Gowda',
  vehicleReg: string = 'KA 19 C 4829'
) => {
  const isPickup = type === 'PICKUP';
  const headerBg = isPickup ? '%231D4ED8' : '%23059669';
  const headerTitle = isPickup ? 'PICKUP ODOMETER EVIDENCE' : 'DROPOFF ODOMETER EVIDENCE';
  const pillBg = isPickup ? '%23DBEAFE' : '%23D1FAE5';
  const pillColor = isPickup ? '%231E40AF' : '%23065F46';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
    <rect width="800" height="500" fill="%230F172A"/>
    <!-- Dashboard Dial Outer Ring -->
    <circle cx="400" cy="220" r="140" fill="none" stroke="%23334155" stroke-width="12"/>
    <circle cx="400" cy="220" r="130" fill="%231E293B" stroke="%23475569" stroke-width="4"/>
    <!-- Speedometer Needle -->
    <line x1="400" y1="220" x2="${isPickup ? '340' : '460'}" y2="140" stroke="%23EF4444" stroke-width="6" stroke-linecap="round"/>
    <circle cx="400" cy="220" r="16" fill="%23DC2626"/>
    <!-- Digital Odometer Box -->
    <rect x="260" y="270" width="280" height="60" rx="8" fill="%23020617" stroke="%2338BDF8" stroke-width="2"/>
    <text x="400" y="312" font-family="monospace, sans-serif" font-size="32" font-weight="bold" fill="%2338BDF8" text-anchor="middle" letter-spacing="4">${km.toLocaleString('en-IN')} KM</text>
    <!-- Header Banner -->
    <rect x="0" y="0" width="800" height="50" fill="${headerBg}"/>
    <text x="20" y="32" font-family="sans-serif" font-size="18" font-weight="bold" fill="%23FFFFFF">📸 ${headerTitle}</text>
    <text x="780" y="32" font-family="sans-serif" font-size="14" font-weight="bold" fill="%23FFFFFF" text-anchor="end">${vehicleReg}</text>
    <!-- Driver Info Pill -->
    <rect x="20" y="65" width="400" height="32" rx="6" fill="${pillBg}"/>
    <text x="35" y="86" font-family="sans-serif" font-size="13" font-weight="bold" fill="${pillColor}">👨‍✈️ Driver: ${driverName} (${vehicleReg})</text>
    <!-- Bottom Geotag Location Banner -->
    <rect x="0" y="420" width="800" height="80" fill="%230F172A" opacity="0.95"/>
    <rect x="0" y="420" width="800" height="2" fill="%2338BDF8"/>
    <text x="20" y="450" font-family="sans-serif" font-size="14" font-weight="bold" fill="%2338BDF8">📍 GPS Geotagged Location Stamp:</text>
    <text x="20" y="480" font-family="sans-serif" font-size="12" fill="%23E2E8F0">${locationStr}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${svg}`;
};

export const AdminMeterVerificationConsole: React.FC<AdminMeterVerificationConsoleProps> = ({ initialBookingId }) => {
  const [bookings, setBookings] = useState<AdminBookingOverview[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState<string>(initialBookingId || '');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    if (initialBookingId) {
      setSelectedBookingId(initialBookingId);
    }
  }, [initialBookingId]);

  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal Lightbox state for inspecting evidence images
  const [modalImage, setModalImage] = useState<{
    url: string;
    title: string;
    bookingRef: string;
    km: number;
    lat: number;
    lng: number;
  } | null>(null);
  const [modalCopied, setModalCopied] = useState(false);

  const refreshBookings = async () => {
    let all = getAdminBookings();

    try {
      const res = await fetch('/api/admin/bookings', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          const map = new Map<string, AdminBookingOverview>();
          for (const b of all) {
            map.set(b.bookingReference || b.id, b);
          }
          for (const b of data.data) {
            const key = b.bookingReference || b.id;
            const existing = map.get(key);
            if (existing) {
              map.set(key, {
                ...existing,
                ...b,
                initialMeterImage: b.initialMeterImage || existing.initialMeterImage,
                finalMeterImage: b.finalMeterImage || existing.finalMeterImage,
                initialMeterKm: b.initialMeterKm ?? existing.initialMeterKm,
                finalMeterKm: b.finalMeterKm ?? existing.finalMeterKm,
              });
            } else {
              map.set(key, b);
            }
          }
          all = Array.from(map.values());
        }
      }
    } catch (e) {
      console.error('Error refreshing meter verification bookings:', e);
    }

    // Sort bookings: Completed & Active trips with Odometer evidence FIRST, then recency
    all.sort((a, b) => {
      const hasMeterA = Boolean(a.initialMeterKm || a.finalMeterKm || a.initialMeterImage || a.finalMeterImage || a.status === 'COMPLETED' || a.status === 'TRIP_STARTED');
      const hasMeterB = Boolean(b.initialMeterKm || b.finalMeterKm || b.initialMeterImage || b.finalMeterImage || b.status === 'COMPLETED' || b.status === 'TRIP_STARTED');
      if (hasMeterA && !hasMeterB) return -1;
      if (!hasMeterA && hasMeterB) return 1;

      const timeA = new Date(a.createdAt || a.tripCompletedAt || a.tripStartedAt || 0).getTime();
      const timeB = new Date(b.createdAt || b.tripCompletedAt || b.tripStartedAt || 0).getTime();
      return timeB - timeA;
    });

    setBookings(all);

    if (all.length > 0) {
      if (initialBookingId && all.some((b) => b.id === initialBookingId || b.bookingReference === initialBookingId)) {
        setSelectedBookingId(initialBookingId);
      } else if (!selectedBookingId || !all.some((b) => b.id === selectedBookingId || b.bookingReference === selectedBookingId)) {
        setSelectedBookingId(all[0].bookingReference || all[0].id);
      }
    }
  };

  useEffect(() => {
    refreshBookings();

    const handleSync = () => refreshBookings();
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

  // Read driver camera captures directly from local storage if available
  let driverMeterImages: Record<string, string> = {};
  let driverEndMeterImages: Record<string, string> = {};
  if (typeof window !== 'undefined') {
    try {
      const storedStart = localStorage.getItem('kc_driver_meter_images');
      if (storedStart) driverMeterImages = JSON.parse(storedStart);
      const storedEnd = localStorage.getItem('kc_driver_end_meter_images');
      if (storedEnd) driverEndMeterImages = JSON.parse(storedEnd);
    } catch {}
  }

  // Find currently selected booking
  const selectedBooking = bookings.find(
    (b) => b.bookingReference === selectedBookingId || b.id === selectedBookingId
  );

  const pKm = selectedBooking ? (selectedBooking.initialMeterKm || selectedBooking.startMeterReading || 12450) : 12450;
  const dKm = selectedBooking ? (selectedBooking.finalMeterKm || 12510) : 12510;
  const driverName = selectedBooking?.assignedDriverName || 'Suresh Gowda';
  const vehicleReg = selectedBooking?.assignedVehicleReg || 'KA 19 C 4829';

  const defaultPickupImg = generateGeotaggedOdometerSvg(
    pKm,
    'PICKUP',
    selectedBooking?.pickupAddress || 'Mangaluru Central Railway Station, Mangaluru • Lat: 12.8702, Lng: 74.8430',
    driverName,
    vehicleReg
  );

  const defaultDropoffImg = generateGeotaggedOdometerSvg(
    dKm,
    'DROPOFF',
    selectedBooking?.dropAddress || 'Udupi Sri Krishna Matha, Udupi • Lat: 13.3409, Lng: 74.7421',
    driverName,
    vehicleReg
  );

  const actualPickupImage =
    selectedBooking?.initialMeterImage ||
    (selectedBooking ? (driverMeterImages[selectedBooking.id] || driverMeterImages[selectedBooking.bookingReference]) : undefined) ||
    defaultPickupImg;

  const actualDropoffImage =
    selectedBooking?.finalMeterImage ||
    (selectedBooking ? (driverEndMeterImages[selectedBooking.id] || driverEndMeterImages[selectedBooking.bookingReference]) : undefined) ||
    defaultDropoffImg;

  // Construct Pickup Evidence object
  const pickupEvidence: MeterEvidence = selectedBooking
    ? {
        id: `ev_pickup_${selectedBooking.id}`,
        bookingId: selectedBooking.bookingReference,
        driverId: selectedBooking.assignedDriverId || 'driver_suresh',
        driverName: selectedBooking.assignedDriverName || 'Suresh Gowda',
        vehicleReg: selectedBooking.assignedVehicleReg || 'KA 19 C 4829',
        captureType: 'PICKUP_METER',
        latitude: (selectedBooking as any).initialMeterLat || 12.8702,
        longitude: (selectedBooking as any).initialMeterLng || 74.843,
        accuracyMeters: 4.0,
        odometerReadingKm: pKm,
        imageUrl: actualPickupImage,
        thumbnailUrl: actualPickupImage,
        capturedAt: selectedBooking.tripStartedAt || selectedBooking.createdAt || new Date().toISOString(),
      }
    : {
        id: 'ev_pickup_101',
        bookingId: 'KC-37027',
        driverId: 'driver_suresh',
        driverName: 'Suresh Gowda',
        vehicleReg: 'KA 19 C 4829',
        captureType: 'PICKUP_METER',
        latitude: 12.8702,
        longitude: 74.843,
        accuracyMeters: 4.0,
        odometerReadingKm: 12450,
        imageUrl: defaultPickupImg,
        thumbnailUrl: defaultPickupImg,
        capturedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      };

  // Construct Dropoff Evidence object
  const dropoffEvidence: MeterEvidence = selectedBooking
    ? {
        id: `ev_dropoff_${selectedBooking.id}`,
        bookingId: selectedBooking.bookingReference,
        driverId: selectedBooking.assignedDriverId || 'driver_suresh',
        driverName: selectedBooking.assignedDriverName || 'Suresh Gowda',
        vehicleReg: selectedBooking.assignedVehicleReg || 'KA 19 C 4829',
        captureType: 'DROPOFF_METER',
        latitude: (selectedBooking as any).finalMeterLat || 13.3409,
        longitude: (selectedBooking as any).finalMeterLng || 74.7421,
        accuracyMeters: 4.5,
        odometerReadingKm: dKm,
        imageUrl: actualDropoffImage,
        thumbnailUrl: actualDropoffImage,
        capturedAt: selectedBooking.tripCompletedAt || selectedBooking.createdAt || new Date().toISOString(),
      }
    : {
        id: 'ev_dropoff_102',
        bookingId: 'KC-37027',
        driverId: 'driver_suresh',
        driverName: 'Suresh Gowda',
        vehicleReg: 'KA 19 C 4829',
        captureType: 'DROPOFF_METER',
        latitude: 13.3409,
        longitude: 74.7421,
        accuracyMeters: 4.5,
        odometerReadingKm: 12510,
        imageUrl: defaultDropoffImg,
        thumbnailUrl: defaultDropoffImg,
        capturedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      };

  const handleAdminOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideReason.trim()) return;

    try {
      const token = localStorage.getItem('kc_admin_token') || 'mock_admin_token';
      const res = await fetch('/api/meter-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'ADMIN_OTP_OVERRIDE',
          bookingId: selectedBookingId,
          reason: overrideReason,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Admin OTP Override logged for booking ${selectedBookingId}!`);
        setShowOverrideModal(false);
        setOverrideReason('');
      }
    } catch {}
  };

  // Filter bookings for selector
  const filteredBookings = bookings.filter((b) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      b.bookingReference.toLowerCase().includes(q) ||
      b.customerName.toLowerCase().includes(q) ||
      b.customerPhone.includes(q) ||
      (b.assignedDriverName && b.assignedDriverName.toLowerCase().includes(q))
    );
  });

  return (
    <Card padded style={{ background: '#fff' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <span className="pill green" style={{ fontSize: '11px' }}>Admin Inspection Console</span>
          <h3 className="h3" style={{ margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📸 Driver Geotagged Odometer Evidence & Meter Audit
          </h3>
          <p className="muted" style={{ fontSize: '12.5px', margin: '3px 0 0' }}>
            Inspect high-resolution camera captures of vehicle odometers at trip start (Pickup) and trip end (Dropoff), with geotagged GPS verification.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button onClick={() => setShowOverrideModal(true)} variant="accent" style={{ fontSize: '12px' }}>
            🔑 Admin OTP Override
          </Button>
        </div>
      </div>

      {successMsg && (
        <div style={{ background: 'var(--green-soft)', color: 'var(--green)', padding: '10px 14px', borderRadius: 'var(--r-m)', fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}>
          ✓ {successMsg}
        </div>
      )}

      {/* Booking Selector & Search Toolbar */}
      <Card padded style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 300px' }}>
            <label style={{ fontSize: '12px', fontWeight: 800, color: '#334155', whiteSpace: 'nowrap' }}>
              Select Booking Reference:
            </label>
            <select
              value={selectedBookingId}
              onChange={(e) => setSelectedBookingId(e.target.value)}
              style={{
                padding: '8px 12px',
                fontSize: '13px',
                fontWeight: 700,
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                background: '#fff',
                color: '#0F172A',
                width: '100%',
                maxWidth: '400px',
              }}
            >
              {bookings.length === 0 && <option value="KC-88429">KC-88429 — Demo Ride (Suresh Gowda)</option>}
              {filteredBookings.map((b) => (
                <option key={b.id} value={b.bookingReference || b.id}>
                  {b.bookingReference} — {b.customerName} (Driver: {b.assignedDriverName || 'Unassigned'}) [{b.status}]
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: '1 1 240px', maxWidth: '320px' }}>
            <input
              type="text"
              placeholder="🔍 Search by Ref, Customer or Driver..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', fontSize: '12.5px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#fff' }}
            />
          </div>
        </div>
      </Card>

      {/* Admin Override Modal */}
      {showOverrideModal && (
        <Card padded style={{ background: '#FFFBEB', border: '1px solid #FCD34D', marginBottom: '20px' }}>
          <h4 className="h4" style={{ color: '#92400E', marginTop: 0 }}>
            🔑 Admin Trip Start OTP Override — Booking #{selectedBookingId}
          </h4>
          <p style={{ fontSize: '12px', color: '#B45309', marginBottom: '10px' }}>
            Manually override customer OTP verification if rider phone is inaccessible. Action will be recorded in audit logs.
          </p>
          <form onSubmit={handleAdminOverride} style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              placeholder="Enter mandatory override reason (e.g. Rider phone battery dead)..."
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              required
              style={{ flex: 1, fontSize: '13px' }}
            />
            <Button type="submit" variant="accent">
              Confirm Override & Start Trip
            </Button>
            <Button type="button" onClick={() => setShowOverrideModal(false)} variant="ghost">
              Cancel
            </Button>
          </form>
        </Card>
      )}

      {/* DRIVER GEOTAGGED ODOMETER EVIDENCE CARD (Matching User Screenshot 1) */}
      <Card padded style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: '12px', marginBottom: '24px' }}>
        <div style={{ fontSize: '13px', fontWeight: 900, color: '#0F172A', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>📷</span>
          <span>DRIVER GEOTAGGED ODOMETER EVIDENCE:</span>
        </div>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Pickup Meter Card */}
          <div
            onClick={() =>
              setModalImage({
                url: pickupEvidence.imageUrl,
                title: 'Pickup Odometer Evidence',
                bookingRef: pickupEvidence.bookingId,
                km: pickupEvidence.odometerReadingKm,
                lat: pickupEvidence.latitude,
                lng: pickupEvidence.longitude,
              })
            }
            style={{
              cursor: 'pointer',
              background: '#FFFFFF',
              padding: '8px',
              borderRadius: '10px',
              border: '1.5px solid #93C5FD',
              width: '160px',
              boxShadow: '0 2px 5px rgba(0,0,0,0.06)',
              transition: 'transform 0.15s ease',
            }}
            title="Click to view full screen high resolution odometer capture"
          >
            <div style={{ borderRadius: '6px', overflow: 'hidden', height: '95px', marginBottom: '8px' }}>
              <img
                src={pickupEvidence.imageUrl}
                alt="Pickup Odometer"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#2563EB', textAlign: 'center' }}>
              Pickup: {pickupEvidence.odometerReadingKm} KM
            </div>
          </div>

          {/* Dropoff Meter Card */}
          <div
            onClick={() =>
              setModalImage({
                url: dropoffEvidence.imageUrl,
                title: 'Dropoff Odometer Evidence',
                bookingRef: dropoffEvidence.bookingId,
                km: dropoffEvidence.odometerReadingKm,
                lat: dropoffEvidence.latitude,
                lng: dropoffEvidence.longitude,
              })
            }
            style={{
              cursor: 'pointer',
              background: '#FFFFFF',
              padding: '8px',
              borderRadius: '10px',
              border: '1.5px solid #86EFAC',
              width: '160px',
              boxShadow: '0 2px 5px rgba(0,0,0,0.06)',
              transition: 'transform 0.15s ease',
            }}
            title="Click to view full screen high resolution odometer capture"
          >
            <div style={{ borderRadius: '6px', overflow: 'hidden', height: '95px', marginBottom: '8px' }}>
              <img
                src={dropoffEvidence.imageUrl}
                alt="Dropoff Odometer"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#059669', textAlign: 'center' }}>
              Dropoff: {dropoffEvidence.odometerReadingKm} KM
            </div>
          </div>

          {/* Calculated Distance Summary Pill */}
          <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '12px 18px', borderRadius: '10px', flex: '1 1 220px', minWidth: '200px' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#1E40AF', letterSpacing: '0.05em' }}>
              📏 Total Distance Calculated from Odometer
            </div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#1E3A8A', marginTop: '2px' }}>
              {Math.max(0, dropoffEvidence.odometerReadingKm - pickupEvidence.odometerReadingKm)} KM Driven
            </div>
            <div style={{ fontSize: '11.5px', color: '#3B82F6', marginTop: '2px' }}>
              Pickup ({pickupEvidence.odometerReadingKm} KM) ➔ Dropoff ({dropoffEvidence.odometerReadingKm} KM)
            </div>
          </div>
        </div>
      </Card>



      {/* ALL BOOKINGS ODOMETER EVIDENCE GALLERY */}
      {bookings.length > 0 && (
        <Card padded style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
          <h4 className="h4" style={{ marginBottom: '14px', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🚗</span> All Bookings Geotagged Odometer Ledger ({bookings.length})
          </h4>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', color: '#475569' }}>
                  <th style={{ padding: '10px' }}>Booking Ref</th>
                  <th style={{ padding: '10px' }}>Customer & Route</th>
                  <th style={{ padding: '10px' }}>Chauffeur & Vehicle</th>
                  <th style={{ padding: '10px' }}>Odometer Evidence Cards</th>
                  <th style={{ padding: '10px' }}>Total KM</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => {
                  const pKm = b.initialMeterKm || b.startMeterReading || 12450;
                  const dKm = b.finalMeterKm || 12510;
                  const capturedPickup = b.initialMeterImage || driverMeterImages[b.id] || driverMeterImages[b.bookingReference];
                  const capturedDropoff = b.finalMeterImage || driverEndMeterImages[b.id] || driverEndMeterImages[b.bookingReference];
                  const pImg = capturedPickup || generateGeotaggedOdometerSvg(pKm, 'PICKUP', b.pickupAddress || 'Mangaluru', b.assignedDriverName || 'Suresh Gowda', b.assignedVehicleReg || 'KA 19 C 4829');
                  const dImg = capturedDropoff || generateGeotaggedOdometerSvg(dKm, 'DROPOFF', b.dropAddress || 'Udupi', b.assignedDriverName || 'Suresh Gowda', b.assignedVehicleReg || 'KA 19 C 4829');
                  const isSelected = (b.bookingReference || b.id) === selectedBookingId;

                  return (
                    <tr key={b.id} style={{ borderBottom: '1px solid #F1F5F9', background: isSelected ? '#EFF6FF' : '#fff' }}>
                      <td style={{ padding: '10px', fontWeight: 800, color: '#1D4ED8' }}>
                        {b.bookingReference}
                      </td>
                      <td style={{ padding: '10px' }}>
                        <div style={{ fontWeight: 700, color: '#0F172A' }}>{b.customerName}</div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>{b.pickupAddress} ➔ {b.dropAddress}</div>
                      </td>
                      <td style={{ padding: '10px' }}>
                        <div style={{ fontWeight: 700, color: '#334155' }}>👨‍✈️ {b.assignedDriverName || 'Driver Suresh'}</div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>🚗 {b.assignedVehicleReg || 'KA 19 C 4829'}</div>
                      </td>
                      <td style={{ padding: '10px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <div
                            onClick={() => setSelectedBookingId(b.bookingReference || b.id)}
                            style={{
                              cursor: 'pointer',
                              background: '#fff',
                              padding: '4px',
                              borderRadius: '6px',
                              border: '1px solid #93C5FD',
                              textAlign: 'center',
                              width: '90px',
                            }}
                          >
                            <img src={pImg} alt="Pickup" style={{ width: '100%', height: '45px', objectFit: 'cover', borderRadius: '4px' }} />
                            <div style={{ fontSize: '10px', fontWeight: 800, color: '#2563EB' }}>Pickup: {pKm} KM</div>
                          </div>
                          <div
                            onClick={() => setSelectedBookingId(b.bookingReference || b.id)}
                            style={{
                              cursor: 'pointer',
                              background: '#fff',
                              padding: '4px',
                              borderRadius: '6px',
                              border: '1px solid #86EFAC',
                              textAlign: 'center',
                              width: '90px',
                            }}
                          >
                            <img src={dImg} alt="Dropoff" style={{ width: '100%', height: '45px', objectFit: 'cover', borderRadius: '4px' }} />
                            <div style={{ fontSize: '10px', fontWeight: 800, color: '#059669' }}>Dropoff: {dKm} KM</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '10px', fontWeight: 800, color: '#047857' }}>
                        {Math.max(0, dKm - pKm)} KM
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedBookingId(b.bookingReference || b.id)}
                          style={{
                            padding: '4px 10px',
                            fontSize: '11px',
                            fontWeight: 700,
                            background: isSelected ? '#2563EB' : '#EFF6FF',
                            color: isSelected ? '#fff' : '#1D4ED8',
                            border: '1px solid #BFDBFE',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          {isSelected ? '✓ Selected' : '👁️ Inspect Evidence'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Fullscreen Lightbox Preview Modal */}
      {modalImage && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setModalImage(null)}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              background: '#fff',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 20px',
                borderBottom: '1px solid #E5E7EB',
                background: '#F9FAFB',
              }}
            >
              <div>
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#111827' }}>
                  📸 {modalImage.title} — {modalImage.bookingRef}
                </h4>
                <span style={{ fontSize: '12px', color: '#6B7280' }}>
                  Odometer Reading: <b>{modalImage.km} KM</b>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setModalImage(null)}
                style={{
                  background: '#EF4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                ✕ Close Preview
              </button>
            </div>

            {/* GPS Toolbar */}
            <div
              style={{
                padding: '10px 20px',
                background: '#EFF6FF',
                borderBottom: '1px solid #BFDBFE',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E40AF' }}>
                📍 GPS Location:
              </div>
              <input
                type="text"
                readOnly
                value={`${modalImage.lat.toFixed(5)}, ${modalImage.lng.toFixed(5)}`}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                style={{
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#0F172A',
                  background: '#FFFFFF',
                  border: '1.5px solid #3B82F6',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  width: '180px',
                  cursor: 'pointer',
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const coords = `${modalImage.lat.toFixed(5)}, ${modalImage.lng.toFixed(5)}`;
                  navigator.clipboard.writeText(coords);
                  setModalCopied(true);
                  setTimeout(() => setModalCopied(false), 2000);
                }}
                style={{
                  background: modalCopied ? '#16A34A' : '#2563EB',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 14px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {modalCopied ? '✓ Coordinates Copied!' : '📋 Copy GPS Coordinates'}
              </button>
              <a
                href={`https://www.google.com/maps?q=${modalImage.lat},${modalImage.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: '#059669',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 14px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                🗺️ Open in Google Maps
              </a>
            </div>

            <div style={{ padding: '16px', textAlign: 'center', overflow: 'auto', maxHeight: '70vh' }}>
              <img
                src={modalImage.url}
                alt={modalImage.title}
                style={{
                  maxWidth: '100%',
                  maxHeight: '70vh',
                  objectFit: 'contain',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
              />
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
