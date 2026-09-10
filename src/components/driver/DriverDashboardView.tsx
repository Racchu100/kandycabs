'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DriverCustomerMessaging } from '@/components/messaging/DriverCustomerMessaging';
import { DriverGpsTracker } from '@/components/driver/DriverGpsTracker';
import { CustomerInvoiceModal } from '@/components/invoice/CustomerInvoiceModal';
import { OnlinePaymentModal } from '@/components/payments/OnlinePaymentModal';
import { GeotagCameraModal } from '@/components/camera/GeotagCameraModal';
import {
  acceptTripAtomic,
  startTripWithOtp,
  completeTripWithMeter,
  DriverTripRecord,
} from '@/lib/driverTripManager';
import {
  getAdminBookings,
  sendOtpToCustomerForBooking,
  verifyOtpAndStartBookingTrip,
  completeBookingTrip,
  updateBookingTollCharges,
  recordDriverApproval,
  recordDriverDecline,
  AdminBookingOverview,
} from '@/lib/adminEngine';
import { setDriverDutyStatus, getDriverByPhoneOrUsername, getAllDriverAccounts } from '@/lib/driverAccountEngine';

interface DriverSwipeCardProps {
  booking: AdminBookingOverview;
  onApprove: (booking: AdminBookingOverview) => void;
  onDecline: (booking: AdminBookingOverview) => void;
}

const DriverSwipeCard: React.FC<DriverSwipeCardProps> = ({ booking, onApprove, onDecline }) => {
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState<number>(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    setTouchStartX(clientX);
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (touchStartX === null || !isSwiping) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const diff = clientX - touchStartX;
    const bounded = Math.max(-140, Math.min(140, diff));
    setSwipeOffset(bounded);
  };

  const handleTouchEnd = () => {
    if (!isSwiping) return;
    setIsSwiping(false);
    if (swipeOffset > 70) {
      onApprove(booking);
    } else if (swipeOffset < -70) {
      onDecline(booking);
    }
    setSwipeOffset(0);
    setTouchStartX(null);
  };

  return (
    <div
      style={{
        background: '#EFF6FF',
        border: '2px solid #3B82F6',
        borderRadius: '10px',
        padding: '14px',
        marginBottom: '14px',
        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '18px' }}>🔔</span>
          <span style={{ fontWeight: 800, fontSize: '13.5px', color: '#1E40AF' }}>
            New Trip Assignment Received — Action Required
          </span>
        </div>
        <span className="pill blue" style={{ fontSize: '10.5px', fontWeight: 800 }}>AWAITING YOUR APPROVAL</span>
      </div>

      <p style={{ fontSize: '12px', color: '#1E3A8A', margin: '0 0 12px', lineHeight: 1.5, fontWeight: 600 }}>
        Admin dispatch control has assigned trip <b>{booking.bookingReference}</b> ({booking.tripMode}) to you. Swipe or tap below to accept or decline this job assignment:
      </p>

      {/* Swipe Gesture Interactive Canvas */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseMove={handleTouchMove}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
        style={{
          background: swipeOffset > 30 ? '#DCFCE7' : swipeOffset < -30 ? '#FEE2E2' : '#FFFFFF',
          border: swipeOffset > 30 ? '2px solid #16A34A' : swipeOffset < -30 ? '2px solid #DC2626' : '2px dashed #93C5FD',
          borderRadius: '8px',
          padding: '12px',
          textAlign: 'center',
          cursor: isSwiping ? 'grabbing' : 'grab',
          transform: `translateX(${swipeOffset}px)`,
          transition: isSwiping ? 'none' : 'transform 0.2s cubic-bezier(0.18, 0.89, 0.32, 1.28), background 0.2s ease',
          userSelect: 'none',
          touchAction: 'pan-y',
          marginBottom: '10px',
        }}
      >
        <div style={{ fontSize: '13px', fontWeight: 800, color: swipeOffset > 30 ? '#15803D' : swipeOffset < -30 ? '#B91C1C' : '#1D4ED8' }}>
          {swipeOffset > 40
            ? '👉 Release to ACCEPT & APPROVE TRIP ✅'
            : swipeOffset < -40
            ? '👈 Release to DECLINE TRIP ❌'
            : '👈 Swipe Left to Decline | Swipe Right to Accept 👉'}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
          (Touch & slide left or right on touchscreen, or use buttons below)
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <button
          type="button"
          onClick={() => onDecline(booking)}
          style={{
            background: '#FEE2E2',
            color: '#991B1B',
            border: '1.5px solid #FCA5A5',
            borderRadius: '6px',
            padding: '10px 12px',
            fontSize: '12.5px',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          👈 Decline Job
        </button>

        <button
          type="button"
          onClick={() => onApprove(booking)}
          style={{
            background: '#059669',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            padding: '10px 12px',
            fontSize: '12.5px',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            boxShadow: '0 2px 6px rgba(5, 150, 105, 0.3)',
          }}
        >
          👉 Accept & Approve Trip ✅
        </button>
      </div>
    </div>
  );
};

export const DriverDashboardView: React.FC = () => {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(false);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'ASSIGNED' | 'AVAILABLE' | 'COMPLETED' | 'PROFILE'>('ASSIGNED');
  const [driverUser, setDriverUser] = useState<any | null>(null);
  const [allDrivers] = useState(getAllDriverAccounts());
  const [assignedBookings, setAssignedBookings] = useState<AdminBookingOverview[]>([]);
  const [invoiceBooking, setInvoiceBooking] = useState<any | null>(null);
  const [onlinePaymentBooking, setOnlinePaymentBooking] = useState<any | null>(null);

  // Cancellation Notice Dismissal State (Ensures popup shows only ONCE until closed)
  const [noticeIdToShow, setNoticeIdToShow] = useState<string | null>(null);
  const [dismissedNoticeIds, setDismissedNoticeIds] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('kc_dismissed_cancellation_notices');
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return {};
  });

  // Camera Geotag Modal State
  const [cameraModalConfig, setCameraModalConfig] = useState<{
    isOpen: boolean;
    bookingId: string;
    type: 'PICKUP_METER' | 'DROPOFF_METER' | 'TOLL_RECEIPT';
    title: string;
    defaultAddress: string;
  }>({
    isOpen: false,
    bookingId: '',
    type: 'PICKUP_METER',
    title: '',
    defaultAddress: '',
  });

  // Per-booking OTP & Odometer & Toll Form State
  const [otpInputs, setOtpInputs] = useState<Record<string, string>>({});
  const [meterInputs, setMeterInputs] = useState<Record<string, string>>({});
  const [meterImages, setMeterImages] = useState<Record<string, string>>({});
  const [endMeterInputs, setEndMeterInputs] = useState<Record<string, string>>({});
  const [endMeterImages, setEndMeterImages] = useState<Record<string, string>>({});
  const [tollAmountInputs, setTollAmountInputs] = useState<Record<string, string>>({});
  const [tollReceiptImages, setTollReceiptImages] = useState<Record<string, string>>({});
  const [sendWhatsappCheck, setSendWhatsappCheck] = useState<Record<string, boolean>>({});

  // Active Trip State Management (Tolerates network loss & refresh)
  const [activeTrip, setActiveTrip] = useState<DriverTripRecord | null>(null);

  const [availableTrips, setAvailableTrips] = useState<DriverTripRecord[]>([]);

  // Form Inputs for Trip Execution
  const [inputOtp, setInputOtp] = useState('');
  const [startMeterKm, setStartMeterKm] = useState('12450');
  const [endMeterKm, setEndMeterKm] = useState('12510');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [gpsPermissionState, setGpsPermissionState] = useState<'GRANTED' | 'DENIED' | 'PROMPT' | 'CHECKING'>('CHECKING');
  const [showGpsHelpModal, setShowGpsHelpModal] = useState(false);

  const checkAndRequestGpsLocation = () => {
    setGpsPermissionState('CHECKING');
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsPermissionState('GRANTED');
        },
        (err) => {
          setGpsPermissionState('DENIED');
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setGpsPermissionState('DENIED');
    }
  };

  // Sync assigned customer bookings from Persistent Storage & Supabase DB
  const loadDriverTrips = async () => {
    let currentDriver: any = null;

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlDriverParam = params.get('driverId') || params.get('phone');
      if (urlDriverParam) {
        const found = getDriverByPhoneOrUsername(urlDriverParam);
        if (found) {
          currentDriver = found;
          setDriverUser(found);
        }
      }
    }

    if (!currentDriver) {
      try {
        const storedDriver = localStorage.getItem('kc_driver_user');
        const storedUser = localStorage.getItem('kc_user');
        if (storedDriver) {
          currentDriver = JSON.parse(storedDriver);
        } else if (storedUser) {
          const parsed = JSON.parse(storedUser);
          const found = getDriverByPhoneOrUsername(parsed.phone || parsed.username || parsed.id || parsed.fullName);
          currentDriver = found || parsed;
        }
        if (currentDriver) setDriverUser(currentDriver);
      } catch {}
    }

    if (!currentDriver) {
      currentDriver = {
        id: 'driver_suresh',
        fullName: 'Suresh Gowda',
        phone: '9900887777',
        username: 'suresh',
        vehicleRegistration: 'KA 19 C 4829',
      };
      setDriverUser(currentDriver);
    }

    const targetDriverName = (currentDriver?.fullName || 'Suresh Gowda').toLowerCase().trim();
    const targetDriverPhoneDigits = (currentDriver?.phone || '9900887777').replace(/\D/g, '').slice(-10);
    const targetDriverId = currentDriver?.id || '';

    const liveDriver = getDriverByPhoneOrUsername(currentDriver?.id || currentDriver?.phone || currentDriver?.fullName);
    if (liveDriver) {
      setIsOnline(liveDriver.status === 'ACTIVE' || liveDriver.status === 'ON_DUTY');
    }

    // 1. Load from local cache first for fast initial display
    let adminBookings = getAdminBookings();

    // 2. Fetch live data from Supabase DB API
    try {
      const res = await fetch('/api/admin/bookings', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          const map = new Map<string, AdminBookingOverview>();
          for (const b of adminBookings) {
            map.set(b.bookingReference || b.id, b);
          }
          for (const b of data.data) {
            const key = b.bookingReference || b.id;
            const existing = map.get(key);
            if (existing) {
              if (
                (existing.driverApprovalStatus === 'APPROVED' || existing.driverApprovalStatus === 'DECLINED') &&
                b.driverApprovalStatus === 'PENDING'
              ) {
                b.driverApprovalStatus = existing.driverApprovalStatus;
              }
              if (
                (existing.status === 'DRIVER_APPROVED' || existing.status === 'DRIVER_DECLINED') &&
                (b.status === 'VENDOR_DISPATCHED' || b.status === 'DISPATCHED_PENDING_DRIVER_APPROVAL')
              ) {
                b.status = existing.status;
              }
            }
            map.set(key, b);
          }
          adminBookings = Array.from(map.values());
          try {
            localStorage.setItem('kc_all_admin_bookings', JSON.stringify(adminBookings));
          } catch {}
        }
      }
    } catch (e) {
      console.error('Error fetching live driver bookings from DB:', e);
    }

    const urlBookingId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('bookingId') : null;

    const matched = adminBookings.filter((b) => {
      const isUrlMatch = Boolean(urlBookingId && urlBookingId !== 'all' && (b.id === urlBookingId || b.bookingReference === urlBookingId));
      if (isUrlMatch) return true;

      // Hide trips declined by driver from active assigned portal
      if (b.driverApprovalStatus === 'DECLINED' || b.status === 'DRIVER_DECLINED') {
        return false;
      }

      const bDriverName = (b.assignedDriverName || '').toLowerCase().trim();
      const bDriverPhoneDigits = (b.driverPhone || '').replace(/\D/g, '').slice(-10);
      const bDriverId = b.assignedDriverId || '';

      const nameMatch = Boolean(
        bDriverName &&
          (bDriverName === targetDriverName ||
            bDriverName.includes(targetDriverName) ||
            targetDriverName.includes(bDriverName))
      );
      const phoneMatch = Boolean(targetDriverPhoneDigits && bDriverPhoneDigits && bDriverPhoneDigits === targetDriverPhoneDigits);
      const idMatch = Boolean(
        targetDriverId && (bDriverId === targetDriverId || bDriverId === `driver_${targetDriverPhoneDigits}`)
      );

      return nameMatch || phoneMatch || idMatch;
    });

    const cancelledTrip = matched.find((b) => b.status === 'CANCELLED');
    if (cancelledTrip) {
      const noticeKey = cancelledTrip.bookingReference || cancelledTrip.id;
      const isDismissed = Boolean(dismissedNoticeIds[noticeKey]);
      if (!isDismissed) {
        setNoticeIdToShow(noticeKey);
        setErrorMsg(
          `🚨 URGENT RIDE CANCELLATION NOTICE: Booking ${cancelledTrip.bookingReference} for customer ${cancelledTrip.customerName} (${cancelledTrip.customerPhone}) has been CANCELLED by Admin! Please DO NOT proceed to pickup. Contact dispatch control for details.`
        );
      }
    } else {
      setNoticeIdToShow(null);
    }

    // Sort matched assigned bookings so recent & action-required admin dispatches ALWAYS appear AT THE VERY TOP
    matched.sort((a, b) => {
      const getPriority = (item: AdminBookingOverview) => {
        // Priority 0: New trip assignment pending driver approval (action required - top of portal)
        if (
          (item.driverApprovalStatus === 'PENDING' ||
            item.status === 'DISPATCHED_PENDING_DRIVER_APPROVAL' ||
            item.status === 'VENDOR_DISPATCHED') &&
          item.status !== 'CANCELLED' &&
          item.status !== 'COMPLETED'
        ) {
          return 0;
        }

        // Priority 1: Active accepted / in-progress trip
        if (item.status === 'DRIVER_APPROVED' || item.status === 'DRIVER_ASSIGNED' || item.status === 'TRIP_STARTED') {
          return 1;
        }

        // Priority 2: Other non-completed, non-cancelled trips
        if (item.status !== 'COMPLETED' && item.status !== 'CANCELLED') {
          return 2;
        }

        // Priority 3: Completed or Cancelled trips (placed at bottom)
        return 3;
      };

      const priorityA = getPriority(a);
      const priorityB = getPriority(b);

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // Within the same priority tier, sort by recency (newest createdAt or latest timestamp/reference first)
      const getRecency = (item: AdminBookingOverview) => {
        if (item.createdAt) {
          const t = new Date(item.createdAt).getTime();
          if (!isNaN(t) && t > 0) return t;
        }
        if (item.tripStartedAt) {
          const t = new Date(item.tripStartedAt).getTime();
          if (!isNaN(t) && t > 0) return t;
        }
        if (item.driverApprovedAt) {
          const t = new Date(item.driverApprovedAt).getTime();
          if (!isNaN(t) && t > 0) return t;
        }
        // Fallback to numeric digits in booking reference or id
        const numMatch = (item.bookingReference || item.id || '').match(/\d+/g);
        if (numMatch) {
          const parsed = parseInt(numMatch.join(''), 10);
          if (!isNaN(parsed) && parsed > 0) return parsed;
        }
        return 0;
      };

      const recencyA = getRecency(a);
      const recencyB = getRecency(b);

      if (recencyA !== recencyB) {
        return recencyB - recencyA; // Descending: newest first
      }

      return (b.bookingReference || b.id || '').localeCompare(a.bookingReference || a.id || '', undefined, {
        numeric: true,
        sensitivity: 'base',
      });
    });

    setAssignedBookings(matched);
  };

  const handleApproveBooking = (b: AdminBookingOverview) => {
    const driverId = driverUser?.id || driverUser?.phone || 'driver_suresh';
    const driverName = driverUser?.fullName || 'Suresh Gowda';
    const vehicleReg = driverUser?.vehicleRegistration || 'KA 19 C 4829';
    const res = recordDriverApproval(b.bookingReference || b.id, driverId, driverName, vehicleReg);
    if (res.success) {
      setSuccessMsg(`✅ Trip ${b.bookingReference} approved & accepted! Admin dispatch control has been notified.`);
      setErrorMsg(null);
      loadDriverTrips();
    } else {
      setErrorMsg(res.error || 'Failed to record driver trip approval.');
    }
  };

  const handleDeclineBooking = (b: AdminBookingOverview) => {
    const driverId = driverUser?.id || driverUser?.phone || 'driver_suresh';
    const driverName = driverUser?.fullName || 'Suresh Gowda';
    const res = recordDriverDecline(b.bookingReference || b.id, driverId, driverName, 'Chauffeur declined via duty dashboard swipe');
    if (res.success) {
      setErrorMsg(`⚠️ Trip ${b.bookingReference} declined. Alert sent to Admin control for re-dispatch.`);
      setSuccessMsg(null);
      loadDriverTrips();
    } else {
      setErrorMsg(res.error || 'Failed to record driver trip decline.');
    }
  };

  useEffect(() => {
    loadDriverTrips();
    checkAndRequestGpsLocation();

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlBookingId = params.get('bookingId');
      if (urlBookingId) {
        setActiveTab('ASSIGNED');
      }
    }

    const handleSync = () => {
      loadDriverTrips();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleSync);
      window.addEventListener('new_booking_created', handleSync);
    }

    const intervalId = setInterval(() => {
      loadDriverTrips();
    }, 4000);

    return () => {
      clearInterval(intervalId);
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleSync);
        window.removeEventListener('new_booking_created', handleSync);
      }
    };
  }, [driverUser?.id]);

  const handleToggleOnline = () => {
    setIsOnline((prev) => {
      const nextStatus = !prev;
      const targetDriverId = driverUser?.id || 'driver_suresh';
      const statusStr = nextStatus ? 'ACTIVE' : 'OFFLINE';
      setDriverDutyStatus(targetDriverId, statusStr);
      if (driverUser) {
        const updatedUser = { ...driverUser, status: statusStr };
        setDriverUser(updatedUser);
        try {
          localStorage.setItem('kc_driver_user', JSON.stringify(updatedUser));
        } catch {}
      }
      return nextStatus;
    });
  };

  const handleAcceptTrip = (tripId: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const driverId = driverUser?.id || 'driver_suresh';
    const driverName = driverUser?.fullName || 'Suresh Gowda';
    const vehicleReg = driverUser?.vehicleRegistration || 'KA 19 C 4829';

    const res = acceptTripAtomic(tripId, driverId, driverName, vehicleReg);

    if (!res.success) {
      setErrorMsg(res.error || 'Failed to accept trip');
      return;
    }

    setSuccessMsg('Trip accepted successfully!');
    setActiveTrip(res.trip || null);
    setAvailableTrips((prev) => prev.filter((t) => t.id !== tripId));
    setActiveTab('ACTIVE');
  };

  const handleStartTrip = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!activeTrip) return;

    if (gpsPermissionState !== 'GRANTED') {
      setErrorMsg(
        '📡 GPS LOCATION REQUIRED: Location is turned off or access was denied. Please turn on your device GPS location and click "📡 Turn On & Allow GPS Location" at the top before starting the trip!'
      );
      return;
    }

    const startImg = meterImages[activeTrip.id] || '';
    if (!startImg || startImg.trim() === '') {
      setErrorMsg(
        '📷 COMPULSORY ODOMETER PHOTO REQUIRED: Please click "📷 Open Camera" below to capture and stamp the geotagged Pickup Odometer Photo before starting the trip!'
      );
      return;
    }

    const initialMeter = parseFloat(startMeterKm);

    const res = startTripWithOtp(activeTrip.id, inputOtp, initialMeter, startImg);
    if (!res.success) {
      setErrorMsg(res.error || 'OTP verification failed');
      return;
    }

    setSuccessMsg('Trip started successfully! Geotagged Odometer initial reading recorded.');
    setActiveTrip(res.trip || null);
  };

  const handleSendOtpToCustomer = (bookingId: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const res = sendOtpToCustomerForBooking(bookingId);
    if (!res.success) {
      setErrorMsg(res.error || 'Failed to send OTP to customer');
      return;
    }
    setSuccessMsg(
      `✓ OTP confirmation code (${res.otp}) successfully sent to customer ${res.customerName} (${res.phone}) via SMS/WhatsApp!`
    );
    loadDriverTrips();
  };

  const handleVerifyOtpSubmit = (bookingId: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (gpsPermissionState !== 'GRANTED') {
      setErrorMsg(
        '📡 GPS LOCATION REQUIRED: Location is turned off or access was denied. Please turn on your device GPS location and click "📡 Turn On & Allow GPS Location" at the top before starting the trip!'
      );
      return;
    }

    const inputOtp = otpInputs[bookingId] || '';
    const startKm = parseFloat(meterInputs[bookingId] || '12450');
    const startImg = meterImages[bookingId] || '';

    if (!startImg || startImg.trim() === '') {
      setErrorMsg(
        '📷 COMPULSORY ODOMETER PHOTO REQUIRED: Please click "📷 Open Camera" below to capture and stamp the geotagged Pickup Odometer Photo before starting the trip!'
      );
      return;
    }

    const res = verifyOtpAndStartBookingTrip(bookingId, inputOtp, startKm, startImg);
    if (!res.success) {
      setErrorMsg(res.error || 'OTP verification failed');
      return;
    }

    setSuccessMsg(
      `✓ OTP Verified & Start Odometer Recorded! Trip ${res.booking?.bookingReference} started for customer ${res.booking?.customerName}. En route to destination!`
    );
    loadDriverTrips();
  };

  const handleCompleteTripSubmit = (bookingId: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (gpsPermissionState !== 'GRANTED') {
      setErrorMsg(
        '📡 GPS LOCATION REQUIRED: Location is turned off or access was denied. Please turn on your device GPS location and click "📡 Turn On & Allow GPS Location" at the top before completing the trip!'
      );
      return;
    }

    const targetBooking = assignedBookings.find((item) => item.id === bookingId || item.bookingReference === bookingId);
    const rawTollVal = tollAmountInputs[bookingId];
    const hasTollInput = rawTollVal !== undefined && rawTollVal !== '' && rawTollVal.trim() !== '';
    const hasExistingToll = targetBooking?.tollCharges !== undefined && targetBooking?.tollCharges !== null;

    if (!hasTollInput && !hasExistingToll) {
      setErrorMsg(
        '💳 COMPULSORY TOLL FARE ENTRY REQUIRED: Please enter the Toll Gate Amount (₹) before ending the trip! (Enter 0 if no toll gate was crossed).'
      );
      return;
    }

    if (hasTollInput) {
      const amount = parseFloat(rawTollVal);
      if (isNaN(amount) || amount < 0) {
        setErrorMsg('💳 VALID TOLL AMOUNT REQUIRED: Please enter a valid non-negative Toll Gate Amount (₹).');
        return;
      }
      const receiptImg = tollReceiptImages[bookingId] || targetBooking?.tollReceiptImage || '';
      const tollRes = updateBookingTollCharges(bookingId, amount, receiptImg);
      if (!tollRes.success) {
        setErrorMsg(tollRes.error || 'Failed to update toll charges before completing trip');
        return;
      }
    }

    const finalKm = parseFloat(endMeterInputs[bookingId] || '12510');
    const finalImg = endMeterImages[bookingId] || '';

    if (!finalImg || finalImg.trim() === '') {
      setErrorMsg(
        '📷 COMPULSORY ODOMETER PHOTO REQUIRED: Please click "📷 Open Camera" below to capture and stamp the geotagged Final Destination Odometer Photo before completing the trip!'
      );
      return;
    }

    const res = completeBookingTrip(bookingId, finalKm, finalImg);
    if (!res.success) {
      setErrorMsg(res.error || 'Failed to complete trip');
      return;
    }

    const b = res.booking;
    const isWhatsappAutoSend = sendWhatsappCheck[bookingId] !== false;

    if (isWhatsappAutoSend && b) {
      setSuccessMsg(
        `✓ Trip ${b.bookingReference} Final Checkout Complete! Tax Invoice auto-sent to customer ${b.customerName} (${b.customerPhone}) via background WhatsApp integration.`
      );
    } else {
      setSuccessMsg(`✓ Trip ${b?.bookingReference || bookingId} Final Checkout Complete! Final Odometer: ${finalKm} KM recorded.`);
    }

    loadDriverTrips();
  };

  const handleUpdateTollSubmit = (bookingId: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const targetBooking = assignedBookings.find((item) => item.id === bookingId || item.bookingReference === bookingId);
    if (targetBooking && targetBooking.status !== 'TRIP_STARTED' && targetBooking.status !== 'COMPLETED') {
      setErrorMsg('⚠️ Trip has not started yet. Please verify customer OTP & start trip before entering toll gate fares.');
      return;
    }

    const rawVal = tollAmountInputs[bookingId];
    const amount = rawVal !== undefined && rawVal !== '' ? parseFloat(rawVal) : 0;
    const receiptImg = tollReceiptImages[bookingId] || '';

    const res = updateBookingTollCharges(bookingId, amount, receiptImg);
    if (!res.success) {
      setErrorMsg(res.error || 'Failed to update toll charges');
      return;
    }

    setSuccessMsg(
      `✓ Toll Gate Fares (+₹${amount}) & FASTag Receipt updated! Recalculated Remaining Balance to Collect: ₹${res.booking?.remainingFare}`
    );
    loadDriverTrips();
  };

  const handleCompleteTrip = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!activeTrip) return;

    if (gpsPermissionState !== 'GRANTED') {
      setErrorMsg(
        '📡 GPS LOCATION REQUIRED: Location is turned off or access was denied. Please turn on your device GPS location and click "📡 Turn On & Allow GPS Location" at the top before completing the trip!'
      );
      return;
    }

    const rawTollVal = tollAmountInputs[activeTrip.id];
    const hasTollInput = rawTollVal !== undefined && rawTollVal !== '' && rawTollVal.trim() !== '';

    if (!hasTollInput) {
      setErrorMsg(
        '💳 COMPULSORY TOLL FARE ENTRY REQUIRED: Please enter the Toll Gate Amount (₹) before ending the trip! (Enter 0 if no toll gate was crossed).'
      );
      return;
    }

    const amount = parseFloat(rawTollVal);
    if (isNaN(amount) || amount < 0) {
      setErrorMsg('💳 VALID TOLL AMOUNT REQUIRED: Please enter a valid non-negative Toll Gate Amount (₹).');
      return;
    }
    const receiptImg = tollReceiptImages[activeTrip.id] || '';
    updateBookingTollCharges(activeTrip.id, amount, receiptImg);

    const finalImg = endMeterImages[activeTrip.id] || '';
    if (!finalImg || finalImg.trim() === '') {
      setErrorMsg(
        '📷 COMPULSORY ODOMETER PHOTO REQUIRED: Please click "📷 Open Camera" below to capture and stamp the geotagged Final Destination Odometer Photo before completing the trip!'
      );
      return;
    }

    const finalMeter = parseFloat(endMeterKm);

    const res = completeTripWithMeter(activeTrip.id, finalMeter, finalImg);
    if (!res.success) {
      setErrorMsg(res.error || 'Failed to complete trip');
      return;
    }

    setSuccessMsg(`Trip completed! Recorded actual distance: ${res.trip?.actualDistanceKm} km.`);
    setActiveTrip(null);
    setActiveTab('COMPLETED');
  };

  return (
    <section className="sec" style={{ padding: '16px 0 60px' }}>
      <Container>
        {/* Chauffeur Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span className="pill green">Chauffeur Duty Desk</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff', padding: '2px 8px', borderRadius: '6px', border: '1px solid var(--line)' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)' }}>👨‍✈️ Logged-In Driver:</span>
                <select
                  value={allDrivers.find((d) => d.fullName.toLowerCase() === (driverUser?.fullName || 'suresh gowda').toLowerCase())?.id || 'driver_suresh'}
                  onChange={(e) => {
                    const found = allDrivers.find((d) => d.id === e.target.value);
                    if (found) {
                      setDriverUser(found);
                      try {
                        localStorage.setItem('kc_driver_user', JSON.stringify(found));
                      } catch {}
                      loadDriverTrips();
                    }
                  }}
                  style={{ border: 'none', background: 'transparent', fontWeight: 700, fontSize: '12px', color: 'var(--ink)', cursor: 'pointer' }}
                >
                  {allDrivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.fullName} (📱 {d.phone})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <h1 className="h2" style={{ marginTop: '6px' }}>
              {driverUser?.fullName || 'Suresh Gowda'}
            </h1>
            <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '2px' }}>
              Mobile: <b>📱 {driverUser?.phone || '9900887777'}</b> · Vehicle: <b>{driverUser?.vehicleRegistration || 'KA 19 C 4829'} ({driverUser?.vehicleModel || 'Swift Dzire'})</b>
            </div>
          </div>

          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            <Button href="/booking" variant="primary" style={{ fontSize: '13px', background: 'var(--accent)', color: '#fff', padding: '6px 14px' }}>
              🚖 Book a Cab as Customer
            </Button>
          </div>
        </div>

        {/* GPS Location Services Warning Banner */}
        {gpsPermissionState === 'DENIED' && (
          <Card
            padded
            style={{
              background: '#FFFBEB',
              border: '2px solid #F59E0B',
              borderRadius: '10px',
              marginBottom: '16px',
              boxShadow: '0 4px 6px -1px rgba(245, 158, 11, 0.15)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ flex: 1, minWidth: '260px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '20px' }}>⚠️</span>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#92400E' }}>
                    GPS Location Access Needed — Location Turned Off or Blocked
                  </h4>
                </div>
                <p style={{ fontSize: '12.5px', color: '#B45309', margin: '6px 0 0', lineHeight: 1.5, fontWeight: 600 }}>
                  Location access is required to transmit live telemetry to dispatch & verify odometer evidence. Please click <b>"Turn On & Allow GPS"</b> or enable Location in your browser address bar.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={checkAndRequestGpsLocation}
                  style={{
                    background: '#D97706',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 14px',
                    fontSize: '12.5px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 4px rgba(217, 119, 6, 0.3)',
                  }}
                >
                  📡 Turn On & Allow GPS Location
                </button>

                <button
                  type="button"
                  onClick={() => setShowGpsHelpModal((prev) => !prev)}
                  style={{
                    background: '#FFFFFF',
                    color: '#92400E',
                    border: '1.5px solid #FCD34D',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  ❓ How to Enable Location
                </button>
              </div>
            </div>

            {/* How to enable location instructions */}
            {showGpsHelpModal && (
              <div
                style={{
                  marginTop: '12px',
                  paddingTop: '12px',
                  borderTop: '1px dashed #FCD34D',
                  fontSize: '12px',
                  color: '#78350F',
                }}
              >
                <div style={{ fontWeight: 800, fontSize: '13px', marginBottom: '6px' }}>
                  📱 How to Turn On Location in Browser / Mobile:
                </div>
                <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: 1.6 }}>
                  <li>
                    <b>Android / Google Chrome:</b> Tap the lock/site icon <code>🔒</code> or <code>🌐</code> in the top address bar ➔ Tap <b>Permissions</b> ➔ Select <b>Location</b> ➔ Change to <b>"Allow"</b> ➔ Click <i>"Turn On & Allow GPS Location"</i> above.
                  </li>
                  <li>
                    <b>iPhone / Safari:</b> Go to <b>Settings</b> ➔ Privacy & Security ➔ Location Services ➔ Safari ➔ Select <b>"While Using the App"</b> ➔ Return to browser.
                  </li>
                  <li>
                    <b>Device Location Toggle:</b> Swipe down your phone notification shade and ensure the <b>Location / GPS</b> icon is turned ON.
                  </li>
                </ul>
              </div>
            )}
          </Card>
        )}

        {/* Dynamic Global Error Alert Banner */}
        {errorMsg && (
          <Card padded style={{ background: '#FEE2E2', border: '2px solid #EF4444', color: '#991B1B', marginBottom: '16px', borderRadius: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <div style={{ fontWeight: 800, fontSize: '13.5px', lineHeight: 1.5 }}>
                {errorMsg}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (noticeIdToShow) {
                    const noticeKey = noticeIdToShow;
                    setDismissedNoticeIds((prev) => {
                      const updated = { ...prev, [noticeKey]: true };
                      if (typeof window !== 'undefined') {
                        try {
                          sessionStorage.setItem('kc_dismissed_cancellation_notices', JSON.stringify(updated));
                        } catch {}
                      }
                      return updated;
                    });
                    setNoticeIdToShow(null);
                  }
                  setErrorMsg(null);
                }}
                style={{ background: 'transparent', border: 'none', color: '#991B1B', fontWeight: 900, cursor: 'pointer', fontSize: '18px', padding: '0 4px' }}
                title="Dismiss cancellation notice"
              >
                ✕
              </button>
            </div>
          </Card>
        )}

        {/* Dynamic Global Success Alert Banner */}
        {successMsg && (
          <Card padded style={{ background: '#ECFDF5', border: '2px solid #10B981', color: '#065F46', marginBottom: '16px', borderRadius: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <div style={{ fontWeight: 800, fontSize: '13.5px', lineHeight: 1.5 }}>
                {successMsg}
              </div>
              <button
                type="button"
                onClick={() => setSuccessMsg(null)}
                style={{ background: 'transparent', border: 'none', color: '#065F46', fontWeight: 900, cursor: 'pointer', fontSize: '16px' }}
              >
                ✕
              </button>
            </div>
          </Card>
        )}

        {/* Navigation Tabs */}
        <div className="search-tabs" style={{ marginBottom: '16px', background: '#fff', padding: '4px', borderRadius: 'var(--r-m)', overflowX: 'auto' }}>
          {[
            { id: 'ASSIGNED', label: `📋 Assigned Bookings (${assignedBookings.length})` },
            { id: 'ACTIVE', label: `🚀 Active Trip (${activeTrip ? 1 : 0})` },
            { id: 'AVAILABLE', label: `🔔 Available Pool (${availableTrips.length})` },
            { id: 'COMPLETED', label: '🏁 Completed' },
            { id: 'PROFILE', label: '👨‍✈️ Duty Profile' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              className={`tab ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id as any)}
              style={{ fontSize: '12.5px', padding: '8px 12px', whiteSpace: 'nowrap' }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab 0: Assigned Bookings from Admin & Vendor */}
        {activeTab === 'ASSIGNED' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {assignedBookings.length === 0 ? (
              <Card padded style={{ textAlign: 'center', background: '#fff', padding: '40px 20px' }}>
                <p className="muted" style={{ fontSize: '14px' }}>
                  No customer bookings currently assigned to driver account <b>{driverUser?.fullName || 'Suresh Gowda'}</b>.
                </p>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '8px' }}>
                  💡 When an Admin dispatches a trip in the Admin Console to this driver, it will appear here automatically with full customer details!
                </div>
              </Card>
            ) : (
              assignedBookings.map((b) => (
                <Card key={b.id} padded style={{ background: '#fff', border: '1px solid var(--line)' }}>
                  {b.driverApprovalStatus === 'APPROVED' || b.status === 'DRIVER_APPROVED' || b.status === 'TRIP_STARTED' || b.status === 'COMPLETED' ? null : (
                    <DriverSwipeCard
                      booking={b}
                      onApprove={handleApproveBooking}
                      onDecline={handleDeclineBooking}
                    />
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <span className="pill green" style={{ fontSize: '12px', fontWeight: 800 }}>Ref ID: {b.bookingReference}</span>
                      <h3 className="h3" style={{ marginTop: '4px', color: 'var(--ink)' }}>{b.tripMode}</h3>
                      <div style={{ fontSize: '12.5px', color: 'var(--muted)', marginTop: '2px' }}>
                        📅 Scheduled Pickup: <b>{b.pickupTime}</b>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="pill green" style={{ fontSize: '11.5px', fontWeight: 700 }}>
                        ✅ Dispatched to {b.assignedDriverName || 'You'}
                      </span>
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-soft)', padding: '14px', borderRadius: 'var(--r-m)', marginBottom: '14px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '10px' }}>
                      <div style={{ background: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid var(--line)' }}>
                        <div style={{ fontSize: '10.5px', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                          👤 Customer Name
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--ink)', marginTop: '2px' }}>
                          {b.customerName}
                        </div>
                      </div>
                      <div style={{ background: '#ECFDF5', padding: '10px', borderRadius: '6px', border: '1px solid var(--green)' }}>
                        <div style={{ fontSize: '10.5px', color: 'var(--green)', textTransform: 'uppercase', fontWeight: 700 }}>
                          📞 Direct Customer Mobile
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--green)', marginTop: '2px' }}>
                          <a href={`tel:${b.customerPhone}`} style={{ color: 'inherit', textDecoration: 'underline' }}>
                            {b.customerPhone}
                          </a>
                        </div>
                      </div>
                    </div>

                    <div style={{ background: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid var(--line)', marginBottom: '10px' }}>
                      <div style={{ fontSize: '12.5px', marginBottom: '4px' }}>
                        📍 <b>Pickup Address:</b> {b.pickupAddress}
                      </div>
                      <div style={{ fontSize: '12.5px', color: 'var(--muted)' }}>
                        🏁 <b>Drop Destination:</b> {b.dropAddress}
                      </div>
                    </div>

                    <div style={{ background: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid var(--line)', fontSize: '12px', marginBottom: '10px' }}>
                      <span className="muted">Vehicle Assigned:</span><br />
                      <b>🚗 {b.vehicleModel || 'Cab'} [{b.assignedVehicleReg || 'Reg Plate'}]</b>
                    </div>

                    {/* RIDE CANCELLED BY ADMIN NOTICE */}
                    {b.status === 'CANCELLED' ? (
                      <div style={{ background: '#FEE2E2', border: '2px solid #EF4444', color: '#991B1B', padding: '16px', borderRadius: '8px', marginBottom: '14px', textAlign: 'center' }}>
                        <div style={{ fontSize: '18px', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          🔴 RIDE CANCELLED BY ADMIN
                        </div>
                        <p style={{ fontSize: '13px', margin: '6px 0 0', fontWeight: 700 }}>
                          This booking ({b.bookingReference}) for customer <b>{b.customerName}</b> ({b.customerPhone}) has been officially CANCELLED from the Admin Control Console.
                        </p>
                        <div style={{ fontSize: '12px', color: '#7F1D1D', marginTop: '6px', fontWeight: 700, background: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #FCA5A5' }}>
                          ⚠️ Operational Instruction: Please DO NOT proceed to customer pickup or ride execution. You are released for other trip dispatches.
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {/* OTP DISPATCH & TRIP EXECUTION PANEL */}
                  {b.status !== 'TRIP_STARTED' && b.status !== 'COMPLETED' && b.status !== 'CANCELLED' ? (
                    <div style={{ background: '#ECFDF5', border: '1px solid var(--green)', padding: '14px', borderRadius: '8px', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                        <h4 className="h4" style={{ color: '#065F46', margin: 0 }}>
                          🔑 Customer OTP Verification to Start Trip
                        </h4>
                        {b.startOtp ? (
                          <span className="pill green" style={{ fontSize: '11.5px', fontWeight: 800 }}>
                            📲 Sent OTP: {b.startOtp}
                          </span>
                        ) : null}
                      </div>

                      <p style={{ fontSize: '12px', color: '#047857', margin: '0 0 10px' }}>
                        When arriving at pickup, click below to dispatch the 4-digit start OTP to customer <b>{b.customerName} ({b.customerPhone})</b>. Customer must confirm the code before trip starts.
                      </p>

                      <div style={{ marginBottom: '12px' }}>
                        <Button
                          type="button"
                          onClick={() => handleSendOtpToCustomer(b.id)}
                          variant="accent"
                          style={{ fontSize: '12px', padding: '6px 12px', background: '#059669', borderColor: '#059669', width: '100%', fontWeight: 700 }}
                        >
                          📲 Send 4-Digit OTP Confirmation to Customer ({b.customerName} - {b.customerPhone})
                        </Button>
                      </div>

                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleVerifyOtpSubmit(b.id);
                        }}
                        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', alignItems: 'end' }}
                      >
                        <div className="fld">
                          <label style={{ fontSize: '11.5px', color: '#065F46', fontWeight: 700 }}>
                            4-Digit Customer OTP Code
                          </label>
                          <input
                            type="text"
                            placeholder={b.startOtp ? `e.g. ${b.startOtp}` : 'Enter OTP'}
                            value={otpInputs[b.id] || ''}
                            onChange={(e) => setOtpInputs((prev) => ({ ...prev, [b.id]: e.target.value }))}
                            required
                            maxLength={4}
                            style={{ fontSize: '16px', letterSpacing: '4px', textAlign: 'center', fontWeight: 800 }}
                          />
                        </div>

                        <div className="fld">
                          <label style={{ fontSize: '11.5px', color: '#065F46', fontWeight: 700 }}>
                            Start Odometer (KM)
                          </label>
                          <input
                            type="number"
                            placeholder="12450"
                            value={meterInputs[b.id] || '12450'}
                            onChange={(e) => setMeterInputs((prev) => ({ ...prev, [b.id]: e.target.value }))}
                            required
                            style={{ fontSize: '14px', fontWeight: 700 }}
                          />
                        </div>

                        <div className="fld" style={{ gridColumn: 'span 2' }}>
                          <label style={{ fontSize: '11.5px', color: '#065F46', fontWeight: 700 }}>
                            📸 Odometer Photo Evidence (Click to Open Camera with Bottom Map Location Banner)
                          </label>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <Button
                              type="button"
                              onClick={() => {
                                setCameraModalConfig({
                                  isOpen: true,
                                  bookingId: b.id,
                                  type: 'PICKUP_METER',
                                  title: `📷 Geotagged Pickup Odometer — ${b.pickupAddress}`,
                                  defaultAddress: b.pickupAddress || 'Mangaluru Central Railway Station, Mangaluru',
                                });
                              }}
                              style={{
                                flex: 1,
                                padding: '10px 14px',
                                background: meterImages[b.id] ? '#D1FAE5' : '#059669',
                                borderColor: meterImages[b.id] ? 'var(--green)' : '#059669',
                                color: meterImages[b.id] ? 'var(--green)' : '#ffffff',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '12.5px',
                                fontWeight: 800,
                                textAlign: 'center',
                              }}
                            >
                              {meterImages[b.id] ? '✅ Geotagged Odometer Image Captured! (Click to Recapture)' : '📷 Open Camera (with Bottom Map Location Banner)'}
                            </Button>
                          </div>
                          {meterImages[b.id] && (
                            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <img
                                src={meterImages[b.id]}
                                alt="Geotagged Odometer Preview"
                                style={{ width: '120px', height: '80px', objectFit: 'cover', borderRadius: '6px', border: '1.5px solid var(--green)' }}
                              />
                              <span style={{ fontSize: '11px', color: 'var(--green)', fontWeight: 700 }}>
                                ✓ Geotagged Location Banner stamped onto Odometer photo! Verified for Admin.
                              </span>
                            </div>
                          )}
                        </div>

                        <div style={{ gridColumn: 'span 2', marginTop: '2px' }}>
                          <Button type="submit" variant="accent" fullWidth style={{ fontWeight: 800 }}>
                            🚀 Verify OTP Code & Start Trip
                          </Button>
                        </div>
                      </form>
                    </div>
                  ) : null}

                  {b.status === 'TRIP_STARTED' ? (
                    <div style={{ background: 'var(--green-soft)', border: '1px solid var(--green)', padding: '14px', borderRadius: '8px', marginBottom: '14px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--green)', marginBottom: '4px' }}>
                        🚀 Trip Started & Active — En Route to {b.dropAddress}!
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--green)', marginBottom: '10px' }}>
                        Pickup Initial Meter: <b>{b.initialMeterKm || 12450} KM</b>.
                      </div>
                      <DriverGpsTracker bookingReference={b.bookingReference || b.id} tripState="TRIP_STARTED" />

                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleCompleteTripSubmit(b.id);
                        }}
                        style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
                      >
                        <div className="fld">
                          <label style={{ fontSize: '12px', color: 'var(--green)', fontWeight: 700 }}>
                            Final Destination Dropoff Odometer (KM)
                          </label>
                          <input
                            type="number"
                            placeholder="12510"
                            value={endMeterInputs[b.id] || '12510'}
                            onChange={(e) => setEndMeterInputs((prev) => ({ ...prev, [b.id]: e.target.value }))}
                            required
                            style={{ fontSize: '16px', fontWeight: 700 }}
                          />
                        </div>

                        {/* Final Destination Odometer Photo Upload (Required) */}
                        <div className="fld">
                          <label style={{ fontSize: '12px', color: 'var(--green)', fontWeight: 700 }}>
                            📸 Final Destination Odometer Photo (Click to Open Camera with Bottom Map Location Banner)
                          </label>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <Button
                              type="button"
                              onClick={() => {
                                setCameraModalConfig({
                                  isOpen: true,
                                  bookingId: b.id,
                                  type: 'DROPOFF_METER',
                                  title: `📷 Geotagged Dropoff Odometer — ${b.dropAddress}`,
                                  defaultAddress: b.dropAddress || 'Udupi Sri Krishna Matha, Udupi',
                                });
                              }}
                              style={{
                                flex: 1,
                                padding: '10px 14px',
                                background: endMeterImages[b.id] ? '#D1FAE5' : 'var(--green)',
                                borderColor: 'var(--green)',
                                color: endMeterImages[b.id] ? 'var(--green)' : '#ffffff',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '12.5px',
                                fontWeight: 800,
                                textAlign: 'center',
                              }}
                            >
                              {endMeterImages[b.id] ? '✅ Geotagged Final Odometer Captured! (Click to Recapture)' : '📷 Open Camera (with Bottom Map Location Banner)'}
                            </Button>
                          </div>
                          {endMeterImages[b.id] && (
                            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <img
                                src={endMeterImages[b.id]}
                                alt="Final Odometer Preview"
                                style={{ width: '120px', height: '80px', objectFit: 'cover', borderRadius: '6px', border: '1.5px solid var(--green)' }}
                              />
                              <span style={{ fontSize: '11px', color: 'var(--green)', fontWeight: 700 }}>
                                ✓ Geotagged Destination Location Banner stamped onto Odometer photo!
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Toll Gate Fares & FASTag Receipt Entry (Before Ending Trip) */}
                        <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', padding: '12px', borderRadius: '6px', marginTop: '6px', marginBottom: '6px' }}>
                          <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#92400E', marginBottom: '4px' }}>
                            💳 Insert Toll Gate Amount & FASTag Receipt (Before Ending Trip)
                          </div>
                          <p style={{ fontSize: '11.5px', color: '#78350F', margin: '0 0 8px' }}>
                            Enter toll gate / interstate charges paid during the trip and attach FASTag receipt proof before finishing ride. Leave 0 if no toll gate crossed.
                          </p>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div>
                              <label style={{ fontSize: '11px', fontWeight: 700, color: '#78350F' }}>Toll Gate Amount (₹) *</label>
                              <input
                                type="number"
                                required
                                min="0"
                                placeholder="e.g. 0 or 150"
                                value={tollAmountInputs[b.id] !== undefined ? tollAmountInputs[b.id] : (b.tollCharges !== undefined ? b.tollCharges : '')}
                                onChange={(e) => setTollAmountInputs((prev) => ({ ...prev, [b.id]: e.target.value }))}
                                style={{
                                  padding: '6px 8px',
                                  fontSize: '14px',
                                  fontWeight: 700,
                                  borderRadius: '4px',
                                  border: '1px solid #FCD34D',
                                  width: '100%',
                                }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '11px', fontWeight: 700, color: '#78350F' }}>Upload FASTag / Toll Receipt</label>
                              <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                id={`toll-receipt-input-${b.id}`}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (evt) => {
                                      const base64Str = evt.target?.result as string;
                                      setTollReceiptImages((prev) => ({ ...prev, [b.id]: base64Str }));
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                                style={{ display: 'none' }}
                              />
                              <label
                                htmlFor={`toll-receipt-input-${b.id}`}
                                style={{
                                  display: 'block',
                                  padding: '6px 8px',
                                  background: (tollReceiptImages[b.id] || b.tollReceiptImage) ? '#FEF3C7' : '#fff',
                                  border: '1px solid #FCD34D',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '11.5px',
                                  fontWeight: 700,
                                  color: '#92400E',
                                  textAlign: 'center',
                                }}
                              >
                                {(tollReceiptImages[b.id] || b.tollReceiptImage) ? '✅ Toll Receipt Attached!' : '📷 Attach Receipt Photo'}
                              </label>
                            </div>
                          </div>
                          {(tollReceiptImages[b.id] || b.tollReceiptImage) && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                              <img
                                src={tollReceiptImages[b.id] || b.tollReceiptImage}
                                alt="Toll Receipt Preview"
                                style={{ width: '50px', height: '35px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #FCD34D' }}
                              />
                              <span style={{ fontSize: '11px', color: '#78350F', fontWeight: 600 }}>
                                Receipt photo attached!
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Send Invoice via WhatsApp Checkbox */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', marginBottom: '10px', background: '#ECFDF5', padding: '10px 12px', borderRadius: '6px', border: '1px solid #A7F3D0' }}>
                          <input
                            type="checkbox"
                            id={`send-whatsapp-check-${b.id}`}
                            checked={sendWhatsappCheck[b.id] !== false}
                            onChange={(e) => setSendWhatsappCheck((prev) => ({ ...prev, [b.id]: e.target.checked }))}
                            style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#059669' }}
                          />
                          <label htmlFor={`send-whatsapp-check-${b.id}`} style={{ fontSize: '12px', fontWeight: 700, color: '#065F46', cursor: 'pointer' }}>
                            📲 Send Official Tax Invoice & Payment Receipt to Customer via WhatsApp ({b.customerPhone})
                          </label>
                        </div>

                        <Button type="submit" variant="primary" fullWidth style={{ background: 'var(--green)', borderColor: 'var(--green)', fontWeight: 800 }}>
                          🏁 End Trip
                        </Button>
                      </form>
                    </div>
                  ) : null}

                  {b.status === 'COMPLETED' ? (
                    <div style={{ background: '#ECFDF5', border: '1px solid var(--green)', padding: '14px', borderRadius: '8px', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div style={{ color: 'var(--green)', fontWeight: 800, fontSize: '14px' }}>
                          🏁 Trip Final Checkout Complete & Verified!
                        </div>
                        <span className="pill green" style={{ fontSize: '11px', fontWeight: 800 }}>
                          CLOSED & AUDITED
                        </span>
                      </div>

                      <div style={{ fontSize: '12px', color: '#065F46', marginBottom: '12px' }}>
                        Initial Meter: <b>{b.initialMeterKm || 12450} KM</b> · Final Meter: <b>{b.finalMeterKm || 12510} KM</b> · Total Distance: <b>{Math.max(0, (b.finalMeterKm || 12510) - (b.initialMeterKm || 12450))} KM</b>
                      </div>

                      {/* Uploaded Reference Evidence Images Thumbnails */}
                      <div style={{ marginTop: '10px' }}>
                        <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#065F46', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                          📸 Uploaded Reference Evidence Records:
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                          {(b.initialMeterImage || meterImages[b.id]) && (
                            <div style={{ background: '#fff', padding: '6px', borderRadius: '6px', border: '1px solid #A7F3D0', textAlign: 'center' }}>
                              <img
                                src={b.initialMeterImage || meterImages[b.id]}
                                alt="Initial Pickup Odometer"
                                style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '4px', marginBottom: '4px' }}
                              />
                              <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#065F46' }}>
                                Pickup Odometer
                              </div>
                            </div>
                          )}

                          {(b.finalMeterImage || endMeterImages[b.id]) && (
                            <div style={{ background: '#fff', padding: '6px', borderRadius: '6px', border: '1px solid #A7F3D0', textAlign: 'center' }}>
                              <img
                                src={b.finalMeterImage || endMeterImages[b.id]}
                                alt="Final Dropoff Odometer"
                                style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '4px', marginBottom: '4px' }}
                              />
                              <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#065F46' }}>
                                Dropoff Odometer
                              </div>
                            </div>
                          )}

                          {(b.tollReceiptImage || tollReceiptImages[b.id]) && (
                            <div style={{ background: '#fff', padding: '6px', borderRadius: '6px', border: '1px solid #A7F3D0', textAlign: 'center' }}>
                              <img
                                src={b.tollReceiptImage || tollReceiptImages[b.id]}
                                alt="FASTag Toll Receipt"
                                style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '4px', marginBottom: '4px' }}
                              />
                              <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#065F46' }}>
                                FASTag / Toll Receipt
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <a
                      href={`tel:${b.customerPhone}`}
                      style={{
                        flex: 1,
                        textAlign: 'center',
                        padding: '10px',
                        background: 'var(--green)',
                        color: '#fff',
                        borderRadius: 'var(--r-m)',
                        fontWeight: 700,
                        textDecoration: 'none',
                        fontSize: '13px',
                      }}
                    >
                      📞 Direct Call Customer ({b.customerName})
                    </a>
                    <a
                      href={`https://wa.me/91${b.customerPhone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        flex: 1,
                        textAlign: 'center',
                        padding: '10px',
                        background: '#25D366',
                        color: '#fff',
                        borderRadius: 'var(--r-m)',
                        fontWeight: 700,
                        textDecoration: 'none',
                        fontSize: '13px',
                      }}
                    >
                      💬 WhatsApp Customer ({b.customerPhone})
                    </a>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Tab 1: Active Trip Execution */}
        {activeTab === 'ACTIVE' && (
          <div>
            {!activeTrip ? (
              <Card padded style={{ textAlign: 'center', background: '#fff', padding: '40px 20px' }}>
                <p className="muted">No active trip currently in progress.</p>
                <div style={{ marginTop: '12px' }}>
                  <Button onClick={() => setActiveTab('AVAILABLE')} variant="accent">
                    View Available Trips ({availableTrips.length})
                  </Button>
                </div>
              </Card>
            ) : (
              <Card padded style={{ background: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <span className="pill green" style={{ fontSize: '12px' }}>Ref: {activeTrip.bookingReference}</span>
                    <h3 className="h3" style={{ marginTop: '4px' }}>{activeTrip.tripMode}</h3>
                  </div>

                  <span
                    style={{
                      background: activeTrip.status === 'TRIP_STARTED' ? '#FEF3C7' : 'var(--accent-soft)',
                      color: activeTrip.status === 'TRIP_STARTED' ? '#92400E' : 'var(--accent)',
                      padding: '4px 10px',
                      borderRadius: 'var(--r-m)',
                      fontSize: '12px',
                      fontWeight: 700,
                    }}
                  >
                    {activeTrip.statusLabel}
                  </span>
                </div>

                <div className="sum" style={{ background: 'var(--bg-soft)', padding: '12px', borderRadius: 'var(--r-m)', marginBottom: '14px' }}>
                  <div className="srow">
                    <span>Rider Name</span>
                    <b>{activeTrip.customerName}</b>
                  </div>
                  {activeTrip.tripDays && (
                    <div className="srow">
                      <span>Trip Duration</span>
                      <b>{activeTrip.tripDays} Days</b>
                    </div>
                  )}
                  <div className="srow">
                    <span>Rider Phone (Privacy Protected)</span>
                    <b style={{ color: 'var(--muted)' }}>{activeTrip.maskedCustomerPhone}</b>
                  </div>
                  <div className="srow">
                    <span>Pickup Address</span>
                    <b>{activeTrip.pickupAddress}</b>
                  </div>
                  <div className="srow">
                    <span>Drop Destination</span>
                    <b>{activeTrip.dropAddress}</b>
                  </div>
                </div>

                {/* TRIP EXECUTION STEP 1: OTP & START TRIP */}
                {activeTrip.status !== 'TRIP_STARTED' && (
                  <form onSubmit={handleStartTrip} style={{ background: '#FFFBEB', border: '1px solid #FCD34D', padding: '16px', borderRadius: 'var(--r-m)', marginBottom: '14px' }}>
                    <h4 className="h4" style={{ color: '#92400E', marginTop: 0, marginBottom: '8px' }}>
                      🔑 Step 1: Customer OTP & Pickup Meter Odometer Capture
                    </h4>
                    <p style={{ fontSize: '12px', color: '#B45309', marginBottom: '12px' }}>
                      Ask rider for their 4-digit OTP code and record initial vehicle Odometer reading before starting trip.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div className="fld">
                        <label style={{ fontSize: '12px', color: '#92400E' }}>
                          4-Digit Customer OTP <span style={{ fontWeight: 'normal', color: '#B45309' }}>(Demo Code: <b>{activeTrip.startOtp}</b>)</span>
                        </label>
                        <input
                          type="text"
                          placeholder={`e.g. ${activeTrip.startOtp}`}
                          value={inputOtp}
                          onChange={(e) => setInputOtp(e.target.value)}
                          required
                          maxLength={4}
                          style={{ fontSize: '16px', letterSpacing: '4px', textAlign: 'center' }}
                        />
                      </div>
                      <div className="fld">
                        <label style={{ fontSize: '12px', color: '#92400E' }}>Start Odometer (KM)</label>
                        <input
                          type="number"
                          placeholder="12450"
                          value={startMeterKm}
                          onChange={(e) => setStartMeterKm(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="fld" style={{ marginTop: '10px' }}>
                      <label style={{ fontSize: '11.5px', color: '#92400E', fontWeight: 700 }}>
                        📸 Pickup Odometer Photo Evidence (Click to Open Camera with Bottom Map Location Banner)
                      </label>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <Button
                          type="button"
                          onClick={() => {
                            setCameraModalConfig({
                              isOpen: true,
                              bookingId: activeTrip.id,
                              type: 'PICKUP_METER',
                              title: `📷 Geotagged Pickup Odometer — ${activeTrip.pickupAddress}`,
                              defaultAddress: activeTrip.pickupAddress || 'Mangaluru Central Railway Station, Mangaluru',
                            });
                          }}
                          style={{
                            flex: 1,
                            padding: '10px 14px',
                            background: meterImages[activeTrip.id] ? '#D1FAE5' : '#D97706',
                            borderColor: meterImages[activeTrip.id] ? 'var(--green)' : '#D97706',
                            color: meterImages[activeTrip.id] ? 'var(--green)' : '#ffffff',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12.5px',
                            fontWeight: 800,
                            textAlign: 'center',
                          }}
                        >
                          {meterImages[activeTrip.id] ? '✅ Geotagged Odometer Image Captured! (Click to Recapture)' : '📷 Open Camera (with Bottom Map Location Banner)'}
                        </Button>
                      </div>
                      {meterImages[activeTrip.id] && (
                        <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img
                            src={meterImages[activeTrip.id]}
                            alt="Geotagged Odometer Preview"
                            style={{ width: '120px', height: '80px', objectFit: 'cover', borderRadius: '6px', border: '1.5px solid var(--green)' }}
                          />
                          <span style={{ fontSize: '11px', color: 'var(--green)', fontWeight: 700 }}>
                            ✓ Geotagged Location Banner stamped onto Odometer photo! Verified for Admin.
                          </span>
                        </div>
                      )}
                    </div>

                    <div style={{ marginTop: '12px' }}>
                      <Button type="submit" variant="accent" fullWidth style={{ fontWeight: 800 }}>
                        Verify OTP & Start Trip 🚀
                      </Button>
                    </div>
                  </form>
                )}

                {/* TRIP EXECUTION STEP 2: COMPLETE TRIP */}
                {activeTrip.status === 'TRIP_STARTED' && (
                  <form onSubmit={handleCompleteTrip} style={{ background: 'var(--green-soft)', border: '1px solid var(--green)', padding: '16px', borderRadius: 'var(--r-m)', marginBottom: '14px' }}>
                    <h4 className="h4" style={{ color: 'var(--green)', marginTop: 0, marginBottom: '8px' }}>
                      🏁 Step 2: Destination Arrival & Final Meter Capture
                    </h4>
                    <p style={{ fontSize: '12px', color: 'var(--green)', marginBottom: '12px' }}>
                      Pickup Odometer recorded: <b>{activeTrip.initialMeterKm || 12450} km</b>. Enter final Odometer reading upon drop off.
                    </p>

                    <div className="fld">
                      <label style={{ color: 'var(--green)', fontWeight: 700 }}>Final Destination Odometer (KM)</label>
                      <input
                        type="number"
                        placeholder="12510"
                        value={endMeterKm}
                        onChange={(e) => setEndMeterKm(e.target.value)}
                        required
                        style={{ fontSize: '16px', fontWeight: 700 }}
                      />
                    </div>

                    <div className="fld" style={{ marginTop: '10px' }}>
                      <label style={{ fontSize: '12px', color: 'var(--green)', fontWeight: 700 }}>
                        📸 Final Destination Odometer Photo (Click to Open Camera with Bottom Map Location Banner)
                      </label>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <Button
                          type="button"
                          onClick={() => {
                            setCameraModalConfig({
                              isOpen: true,
                              bookingId: activeTrip.id,
                              type: 'DROPOFF_METER',
                              title: `📷 Geotagged Dropoff Odometer — ${activeTrip.dropAddress}`,
                              defaultAddress: activeTrip.dropAddress || 'Udupi Sri Krishna Matha, Udupi',
                            });
                          }}
                          style={{
                            flex: 1,
                            padding: '10px 14px',
                            background: endMeterImages[activeTrip.id] ? '#D1FAE5' : 'var(--green)',
                            borderColor: 'var(--green)',
                            color: endMeterImages[activeTrip.id] ? 'var(--green)' : '#ffffff',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12.5px',
                            fontWeight: 800,
                            textAlign: 'center',
                          }}
                        >
                          {endMeterImages[activeTrip.id] ? '✅ Geotagged Final Odometer Captured! (Click to Recapture)' : '📷 Open Camera (with Bottom Map Location Banner)'}
                        </Button>
                      </div>
                      {endMeterImages[activeTrip.id] && (
                        <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img
                            src={endMeterImages[activeTrip.id]}
                            alt="Final Odometer Preview"
                            style={{ width: '120px', height: '80px', objectFit: 'cover', borderRadius: '6px', border: '1.5px solid var(--green)' }}
                          />
                          <span style={{ fontSize: '11px', color: 'var(--green)', fontWeight: 700 }}>
                            ✓ Geotagged Destination Location Banner stamped onto Odometer photo!
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Toll Gate Fares & FASTag Receipt Entry (Before Ending Trip) */}
                    <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', padding: '12px', borderRadius: '6px', marginTop: '6px', marginBottom: '6px' }}>
                      <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#92400E', marginBottom: '4px' }}>
                        💳 Insert Toll Gate Amount & FASTag Receipt (Before Ending Trip)
                      </div>
                      <p style={{ fontSize: '11.5px', color: '#78350F', margin: '0 0 8px' }}>
                        Enter toll gate / interstate charges paid during the trip and attach FASTag receipt proof before finishing ride. Leave 0 if no toll gate crossed.
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <label style={{ fontSize: '11px', fontWeight: 700, color: '#78350F' }}>Toll Gate Amount (₹) *</label>
                          <input
                            type="number"
                            required
                            min="0"
                            placeholder="e.g. 0 or 150"
                            value={tollAmountInputs[activeTrip.id] !== undefined ? tollAmountInputs[activeTrip.id] : ''}
                            onChange={(e) => setTollAmountInputs((prev) => ({ ...prev, [activeTrip.id]: e.target.value }))}
                            style={{
                              padding: '6px 8px',
                              fontSize: '14px',
                              fontWeight: 700,
                              borderRadius: '4px',
                              border: '1px solid #FCD34D',
                              width: '100%',
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '11px', fontWeight: 700, color: '#78350F' }}>Upload FASTag / Toll Receipt</label>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            id={`active-toll-receipt-input-${activeTrip.id}`}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (evt) => {
                                  const base64Str = evt.target?.result as string;
                                  setTollReceiptImages((prev) => ({ ...prev, [activeTrip.id]: base64Str }));
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            style={{ display: 'none' }}
                          />
                          <label
                            htmlFor={`active-toll-receipt-input-${activeTrip.id}`}
                            style={{
                              display: 'block',
                              padding: '6px 8px',
                              background: tollReceiptImages[activeTrip.id] ? '#FEF3C7' : '#fff',
                              border: '1px solid #FCD34D',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              color: '#92400E',
                              textAlign: 'center',
                            }}
                          >
                            {tollReceiptImages[activeTrip.id] ? '✅ Toll Receipt Attached!' : '📷 Attach Receipt Photo'}
                          </label>
                        </div>
                      </div>
                      {tollReceiptImages[activeTrip.id] && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                          <img
                            src={tollReceiptImages[activeTrip.id]}
                            alt="Toll Receipt Preview"
                            style={{ width: '50px', height: '35px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #FCD34D' }}
                          />
                          <span style={{ fontSize: '11px', color: '#78350F', fontWeight: 600 }}>
                            Receipt photo attached!
                          </span>
                        </div>
                      )}
                    </div>

                    <div style={{ marginTop: '12px' }}>
                      <Button type="submit" variant="primary" fullWidth style={{ background: 'var(--green)', borderColor: 'var(--green)', fontWeight: 800 }}>
                        🏁 End Trip
                      </Button>
                    </div>
                  </form>
                )}

                {/* Driver High-Precision GPS Tracker */}
                <DriverGpsTracker bookingReference={activeTrip.bookingReference} tripState={activeTrip.status} />

                {/* Platform In-App Messaging */}
                <DriverCustomerMessaging bookingId={activeTrip.bookingReference} customerName={activeTrip.customerName} />
              </Card>
            )}
          </div>
        )}

        {/* Tab 2: Available Trips */}
        {activeTab === 'AVAILABLE' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {availableTrips.length === 0 ? (
              <Card padded style={{ textAlign: 'center', background: '#fff' }}>
                <p className="muted">No unassigned trips available at this moment.</p>
              </Card>
            ) : (
              availableTrips.map((trip) => (
                <Card key={trip.id} padded style={{ background: '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div>
                      <span className="pill green" style={{ fontSize: '12px' }}>Ref: {trip.bookingReference}</span>
                      <h3 className="h3" style={{ marginTop: '4px' }}>
                        {trip.tripMode} {trip.tripDays ? `(${trip.tripDays} Days)` : ''}
                      </h3>
                      <div style={{ fontSize: '13px', color: 'var(--muted)' }}>📅 {trip.pickupTime}</div>
                    </div>
                  </div>

                  <div className="sum" style={{ background: 'var(--bg-soft)', padding: '10px', borderRadius: 'var(--r-m)', marginBottom: '12px' }}>
                    <div className="srow">
                      <span>Pickup</span>
                      <b>{trip.pickupAddress}</b>
                    </div>
                    <div className="srow">
                      <span>Destination</span>
                      <b>{trip.dropAddress}</b>
                    </div>
                    <div className="srow">
                      <span>Rider (Privacy Masked)</span>
                      <b>{trip.customerName} ({trip.maskedCustomerPhone})</b>
                    </div>
                  </div>

                  <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', padding: '10px 12px', borderRadius: '8px', marginBottom: '12px', fontSize: '12.5px', color: '#92400E', fontWeight: 600 }}>
                    🔔 <b>Admin Dispatch Notification:</b> Admin assigned this trip to your duty profile. Review trip details and approve to accept assignment.
                  </div>

                  <Button onClick={() => handleAcceptTrip(trip.id)} variant="accent" fullWidth style={{ fontWeight: 700 }}>
                    ✅ Approve & Accept Trip Assignment 🤝
                  </Button>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Tab 3: Completed Trips */}
        {activeTab === 'COMPLETED' && (
          <Card padded style={{ background: '#fff' }}>
            <h3 className="h3" style={{ marginBottom: '12px' }}>Chauffeur Completed Trips Log</h3>
            <div className="sum" style={{ background: 'var(--bg-soft)', padding: '12px', borderRadius: 'var(--r-m)' }}>
              <div className="srow">
                <span>Total Trips Completed Today</span>
                <b>4 Trips</b>
              </div>
              <div className="srow">
                <span>Total Mileage Driven</span>
                <b>248 KM</b>
              </div>
            </div>
          </Card>
        )}

        {/* Tab 4: Duty Profile */}
        {activeTab === 'PROFILE' && (
          <Card padded style={{ background: '#fff', maxWidth: '500px' }}>
            <h3 className="h3" style={{ marginBottom: '14px' }}>Chauffeur Duty Profile Details</h3>
            <div className="fld">
              <label>Chauffeur Name</label>
              <input type="text" value={driverUser?.fullName || 'Suresh Gowda'} readOnly style={{ background: 'var(--bg-soft)', fontWeight: 600 }} />
            </div>
            <div className="fld">
              <label>Mobile Phone & Username</label>
              <input type="text" value={`📱 ${driverUser?.phone || '9900887777'} (${driverUser?.username || 'suresh'})`} readOnly style={{ background: 'var(--bg-soft)' }} />
            </div>
            <div className="fld">
              <label>Commercial DL Number</label>
              <input type="text" value={driverUser?.licenseNumber || 'KA19-2021-00892'} readOnly style={{ background: 'var(--bg-soft)' }} />
            </div>
            <div className="fld">
              <label>Assigned Vehicle Reg No</label>
              <input type="text" value={driverUser?.vehicleRegistration || 'KA 19 C 4829'} readOnly style={{ background: 'var(--bg-soft)', fontWeight: 700 }} />
            </div>
            <div className="fld">
              <label>Current Duty Status</label>
              <input type="text" value={`🟢 ${driverUser?.status || 'ACTIVE'}`} readOnly style={{ background: 'var(--bg-soft)', fontWeight: 700, color: 'var(--green)' }} />
            </div>
          </Card>
        )}

        {invoiceBooking && (
          <CustomerInvoiceModal
            booking={invoiceBooking}
            onClose={() => setInvoiceBooking(null)}
          />
        )}

        <GeotagCameraModal
          isOpen={cameraModalConfig.isOpen}
          onClose={() => setCameraModalConfig((prev) => ({ ...prev, isOpen: false }))}
          title={cameraModalConfig.title}
          driverName={driverUser?.fullName || 'Suresh Gowda'}
          vehicleReg={driverUser?.vehicleRegistration || 'KA 19 C 4829'}
          defaultAddress={cameraModalConfig.defaultAddress}
          onCapture={(imageDataUrl) => {
            const bId = cameraModalConfig.bookingId;
            if (cameraModalConfig.type === 'PICKUP_METER') {
              setMeterImages((prev) => ({ ...prev, [bId]: imageDataUrl }));
            } else if (cameraModalConfig.type === 'DROPOFF_METER') {
              setEndMeterImages((prev) => ({ ...prev, [bId]: imageDataUrl }));
            } else if (cameraModalConfig.type === 'TOLL_RECEIPT') {
              setTollReceiptImages((prev) => ({ ...prev, [bId]: imageDataUrl }));
            }
          }}
        />
      </Container>
    </section>
  );
};
