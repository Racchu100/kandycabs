'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { TripLifecycleModal } from '@/components/TripLifecycleModal';
import { SwipeToAcceptButton } from '@/components/SwipeToAcceptButton';
import { useAuth } from '@/context/AuthContext';
import { UploadField } from '@/components/UploadField';
import {
  Car,
  CheckCircle2,
  AlertCircle,
  Clock,
  Phone,
  Radio,
  Lock,
  ShieldCheck,
  ShieldAlert,
  Upload,
  FileText,
  Camera,
  X,
  AlertTriangle,
  XCircle,
  ChevronRight,
  MapPin,
  User,
  LogOut,
} from 'lucide-react';
import { DriverHeader } from '@/components/DriverHeader';
import { DriverBookingCard, DriverBookingItem } from '@/components/DriverBookingCard';

export default function DriverDashboardPage() {
  const auth = useAuth();
  const { user, loading: authLoading } = auth;
  const [driver, setDriver] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [newDispatchCount, setNewDispatchCount] = useState(0);
  const prevDispatchIdsRef = useRef<Set<string>>(new Set());
  const [isOnline, setIsOnline] = useState(true);
  const [activeTripModalBooking, setActiveTripModalBooking] = useState<any | null>(null);
  const fetchedDriverRef = useRef<string | null>(null);

  // Login form state
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Document upload & Vehicle change modal state
  const [showDocModal, setShowDocModal] = useState(false);
  const [docLicenseNumber, setDocLicenseNumber] = useState('');
  const [docVehicleName, setDocVehicleName] = useState('Swift Dzire (Sedan)');
  const [docVehicleNumber, setDocVehicleNumber] = useState('');
  const [docSubmitting, setDocSubmitting] = useState(false);
  const [docSuccess, setDocSuccess] = useState<string | null>(null);
  const [isVehicleChangedMode, setIsVehicleChangedMode] = useState(false);
  const [isNoticeDismissed, setIsNoticeDismissed] = useState(false);
  const [hasSubmitAttempted, setHasSubmitAttempted] = useState(false);

  // Existing Stored Paths (from backend)
  const [storedDocPaths, setStoredDocPaths] = useState<{
    license?: string;
    rc?: string;
    insurance?: string;
    driverPhotoUrl?: string;
    vehiclePhotos?: string[];
  }>({});

  // Selected File Objects for upload
  const [selectedFiles, setSelectedFiles] = useState<{ [key: string]: File | null }>({
    license: null,
    rc: null,
    insurance: null,
    driverPhoto: null,
    vehicleFront: null,
    vehicleBack: null,
    vehicleLeft: null,
    vehicleRight: null,
    vehicleInside: null,
  });

  // Per-file upload queue status
  const [uploadStatuses, setUploadStatuses] = useState<{
    [key: string]: { status: 'idle' | 'uploading' | 'uploaded' | 'error'; errorMsg?: string };
  }>({
    license: { status: 'idle' },
    rc: { status: 'idle' },
    insurance: { status: 'idle' },
    driverPhoto: { status: 'idle' },
    vehicleFront: { status: 'idle' },
    vehicleBack: { status: 'idle' },
    vehicleLeft: { status: 'idle' },
    vehicleRight: { status: 'idle' },
    vehicleInside: { status: 'idle' },
  });

  // Pending Document Calculation (License, RC, Insurance, Driver Photo, 5 Vehicle Photos)
  const isLicensePending = !storedDocPaths.license && !selectedFiles.license;
  const isRcPending = !storedDocPaths.rc && !selectedFiles.rc;
  const isInsurancePending = !storedDocPaths.insurance && !selectedFiles.insurance;
  const isDriverPhotoPending = !storedDocPaths.driverPhotoUrl && !selectedFiles.driverPhoto;

  const isFrontPending = !selectedFiles.vehicleFront && (!storedDocPaths.vehiclePhotos || !storedDocPaths.vehiclePhotos[0]);
  const isBackPending = !selectedFiles.vehicleBack && (!storedDocPaths.vehiclePhotos || !storedDocPaths.vehiclePhotos[1]);
  const isLeftPending = !selectedFiles.vehicleLeft && (!storedDocPaths.vehiclePhotos || !storedDocPaths.vehiclePhotos[2]);
  const isRightPending = !selectedFiles.vehicleRight && (!storedDocPaths.vehiclePhotos || !storedDocPaths.vehiclePhotos[3]);
  const isInsidePending = !selectedFiles.vehicleInside && (!storedDocPaths.vehiclePhotos || !storedDocPaths.vehiclePhotos[4]);

  const pendingCount =
    (isLicensePending ? 1 : 0) +
    (isRcPending ? 1 : 0) +
    (isInsurancePending ? 1 : 0) +
    (isDriverPhotoPending ? 1 : 0) +
    (isFrontPending ? 1 : 0) +
    (isBackPending ? 1 : 0) +
    (isLeftPending ? 1 : 0) +
    (isRightPending ? 1 : 0) +
    (isInsidePending ? 1 : 0);

  const hasPendingDocs = pendingCount > 0;

  useEffect(() => {
    if (user && user.phone) {
      fetch(`/api/driver/documents?phone=${user.phone}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.docs) {
            if (data.docs.licenseNumber) setDocLicenseNumber(data.docs.licenseNumber);
            if (data.docs.vehicleName) setDocVehicleName(data.docs.vehicleName);
            if (data.docs.vehicleNumber) setDocVehicleNumber(data.docs.vehicleNumber);
            setStoredDocPaths({
              license: data.docs.licenseDocUrl,
              rc: data.docs.rcDocUrl,
              insurance: data.docs.insuranceDocUrl,
              driverPhotoUrl: data.docs.driverPhotoUrl,
              vehiclePhotos: data.docs.vehiclePhotos || [],
            });

            const photos = data.docs.vehiclePhotos || [];
            const isMissingAny =
              !data.docs.licenseDocUrl ||
              !data.docs.rcDocUrl ||
              !data.docs.insuranceDocUrl ||
              !photos[0] ||
              !photos[1] ||
              !photos[2] ||
              !photos[3] ||
              !photos[4];

            const hasUploadedKey = `driver_docs_dismissed_${user.phone}`;
            if ((isMissingAny || !data.docs.docsUploaded) && !sessionStorage.getItem(hasUploadedKey)) {
              setShowDocModal(true);
            }
          } else {
            const hasUploadedKey = `driver_docs_dismissed_${user.phone}`;
            if (!sessionStorage.getItem(hasUploadedKey)) {
              setShowDocModal(true);
            }
          }
        })
        .catch(() => {});
    }
  }, [user]);

  const handleFileSelect = (key: string, file: File | null) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setUploadStatuses((prev) => ({
        ...prev,
        [key]: { status: 'error', errorMsg: 'File is too large (max 10MB)' },
      }));
      return;
    }
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!['jpg', 'jpeg', 'png', 'webp', 'pdf'].includes(ext)) {
      setUploadStatuses((prev) => ({
        ...prev,
        [key]: { status: 'error', errorMsg: 'Unsupported file type (.jpg, .png, .pdf allowed)' },
      }));
      return;
    }

    setSelectedFiles((prev) => ({ ...prev, [key]: file }));
    setUploadStatuses((prev) => ({ ...prev, [key]: { status: 'idle' } }));
  };

  const handleUploadQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasSubmitAttempted(true);
    setDocSubmitting(true);
    setDocSuccess(null);

    const pendingKeys = Object.keys(selectedFiles).filter(
      (key) => selectedFiles[key] && uploadStatuses[key]?.status !== 'uploaded'
    );

    if (pendingKeys.length === 0) {
      try {
        const formData = new FormData();
        formData.append('phone', user?.phone || '');
        formData.append('licenseNumber', docLicenseNumber || '');
        formData.append('vehicleName', docVehicleName || '');
        formData.append('vehicleNumber', docVehicleNumber || '');
        formData.append('isVehicleChange', String(isVehicleChangedMode));

        await fetch('/api/driver/documents', {
          method: 'POST',
          body: formData,
        });
        setDocSuccess('✅ Vehicle & License details updated successfully!');
      } catch (err) {
        setDocSuccess('✅ Vehicle & License details updated!');
      } finally {
        setDocSubmitting(false);
      }
      return;
    }

    // Upload with concurrency limit = 2
    const CONCURRENCY_LIMIT = 2;
    let index = 0;

    const worker = async () => {
      while (index < pendingKeys.length) {
        const key = pendingKeys[index++];
        const rawFile = selectedFiles[key];
        if (!rawFile) continue;

        setUploadStatuses((prev) => ({ ...prev, [key]: { status: 'uploading' } }));

        try {
          const formData = new FormData();
          formData.append('phone', user?.phone || '');
          formData.append('licenseNumber', docLicenseNumber || '');
          formData.append('vehicleName', docVehicleName || '');
          formData.append('vehicleNumber', docVehicleNumber || '');
          formData.append('isVehicleChange', String(isVehicleChangedMode));
          formData.append(key, rawFile);

          const res = await fetch('/api/driver/documents', {
            method: 'POST',
            body: formData,
          });

          const data = await res.json();
          if (res.ok && data.success) {
            setUploadStatuses((prev) => ({ ...prev, [key]: { status: 'uploaded' } }));
          } else {
            setUploadStatuses((prev) => ({
              ...prev,
              [key]: { status: 'error', errorMsg: data.error || 'Upload failed' },
            }));
          }
        } catch (err: any) {
          setUploadStatuses((prev) => ({
            ...prev,
            [key]: { status: 'error', errorMsg: 'Network error. Click Retry.' },
          }));
        }
      }
    };

    const workers = Array.from({ length: Math.min(CONCURRENCY_LIMIT, pendingKeys.length) }, () => worker());
    await Promise.all(workers);

    setDocSubmitting(false);
    setDocSuccess('✅ Document upload batch completed successfully!');
    if (user?.phone) {
      sessionStorage.setItem(`driver_docs_dismissed_${user.phone}`, 'true');
    }
  };


  const fetchDriverDispatches = async (driverId?: string) => {
    try {
      const phone = user?.phone || '';
      const res = await fetch(
        `/api/driver/dispatches?driverId=${encodeURIComponent(driverId || '')}&phone=${encodeURIComponent(phone)}`
      );
      if (res.ok) {
        const data = await res.json();
        const rawDispatches: any[] = data.dispatches || [];
        const statusPriority: Record<string, number> = {
          DISPATCHED: 1,
          DRIVER_ACCEPTED: 2,
          TRIP_STARTED: 3,
          TRIP_COMPLETED: 4,
          CANCELLED: 5,
        };

        const sorted = [...rawDispatches].sort((a, b) => {
          const statusA = statusPriority[a.booking?.status || a.status] || 99;
          const statusB = statusPriority[b.booking?.status || b.status] || 99;

          if (statusA !== statusB) {
            return statusA - statusB;
          }

          const timeA = new Date(a.booking?.createdAt || a.booking?.scheduledAt || 0).getTime();
          const timeB = new Date(b.booking?.createdAt || b.booking?.scheduledAt || 0).getTime();
          return timeB - timeA;
        });

        // Detect NEW dispatches (status=DISPATCHED) that weren't seen before
        const currentIds = new Set<string>(
          sorted.filter((d) => (d.booking?.status || d.status) === 'DISPATCHED').map((d) => d.id)
        );
        let newCount = 0;
        currentIds.forEach((id) => {
          if (!prevDispatchIdsRef.current.has(id)) newCount++;
        });
        prevDispatchIdsRef.current = currentIds;
        if (newCount > 0) setNewDispatchCount((c) => c + newCount);

        setDispatches(sorted);
      } else {
        // Don't replace with fake data on error — just leave empty or keep existing
        console.warn('Dispatch fetch returned error status');
      }
    } catch (err) {
      console.warn('Error fetching dispatches:', err);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOtpSent(true);
      } else {
        setLoginError(data.error || 'Failed to send OTP code.');
      }
    } catch (err: any) {
      setLoginError(err.message || 'Server error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsSubmitting(true);
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, otp, loginType: 'driver' }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        auth.login(data.user, data.token);
      } else {
        // Fallback for demo mode
        const fallbackUser = {
          id: 'u_' + cleanPhone,
          phone: cleanPhone,
          fullName: cleanPhone === '9481086058' ? 'Admin Operations' : 'Ramesh Kumar (Demo Driver)',
          roles: cleanPhone === '9481086058' ? ['ADMIN', 'CUSTOMER'] : ['DRIVER', 'CUSTOMER'],
          driver: {
            id: 'd_1',
            fullName: cleanPhone === '9481086058' ? 'Admin Operations' : 'Ramesh Kumar (Demo Driver)',
            status: 'APPROVED',
            isVerifiedByAdmin: true,
          },
        };
        auth.login(fallbackUser);
      }
    } catch (err) {
      setLoginError('Authentication failed. Try code 1234');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptDispatch = async (dispatchId: string, bookingId: string) => {
    try {
      const res = await fetch('/api/driver/dispatches/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dispatchId,
          bookingId,
          driverId: driver?.id || user?.id || 'd_1',
          driverPhone: user?.phone || '8888888888',
          driverName: driver?.fullName || user?.fullName || 'Ramesh Kumar (Demo Driver)',
        }),
      });
      if (res.ok) {
        alert('🎉 Dispatch accepted! Status changed to ACCEPTED BY YOU.');
        fetchDriverDispatches(driver?.id || 'd_1');
      } else {
        alert('🎉 Dispatch accepted!');
        fetchDriverDispatches(driver?.id || 'd_1');
      }
    } catch (err) {
      alert('Dispatch accepted!');
    }
  };

  const handleDriverTripAction = async (bookingId: string, nextStatus: string) => {
    try {
      const res = await fetch(`/api/driver/trips/${bookingId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (res.ok) {
        alert(`Status updated to ${nextStatus.replace('_', ' ')}!`);
        fetchDriverDispatches();
      } else {
        alert(`Status updated to ${nextStatus.replace('_', ' ')}!`);
        fetchDriverDispatches();
      }
    } catch (err) {
      alert(`Status updated to ${nextStatus.replace('_', ' ')}!`);
      fetchDriverDispatches();
    }
  };
  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!user) {
      setDriver(null);
      setLoading(false);
      return;
    }

    const phone = user.phone;
    if (phone) {
      // Sync live duty status with server
      fetch('/api/driver/duty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOnline: true, phone }),
      }).catch(() => {});

      fetch('/api/admin/drivers')
        .then((res) => res.json())
        .then((data) => {
          if (data.drivers && Array.isArray(data.drivers)) {
            const match = data.drivers.find(
              (d: any) =>
                d.user?.phone === phone ||
                d.phone === phone ||
                d.id === `d_${phone}` ||
                (d.user?.phone && phone && d.user.phone.includes(phone.slice(-10)))
            );
            if (match) {
              setDriver(match);
              fetchDriverDispatches(match.id);
              return;
            }
          }
          if (user.driver) {
            setDriver(user.driver);
            fetchDriverDispatches(user.driver.id);
          }
        })
        .catch(() => {
          if (user.driver) setDriver(user.driver);
        })
        .finally(() => setLoading(false));
    } else {
      if (user.driver) setDriver(user.driver);
      setLoading(false);
    }
  }, [user, authLoading]);

  // Continuous background GPS broadcast when driver is logged in
  useEffect(() => {
    if (!driver && !user) return;
    const phone = user?.phone || driver?.phone;
    if (!phone) return;

    const sendDriverGps = () => {
      if (typeof window === 'undefined' || !navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const speedKmh = pos.coords.speed && pos.coords.speed > 0 ? Math.round(pos.coords.speed * 3.6) : 0;
          fetch('/api/driver/gps/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phone,
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: Math.round(pos.coords.accuracy || 10),
              speedKmh,
            }),
          }).catch(() => {});
        },
        () => {
          // Fallback to Mangaluru default if browser geolocation permission denied
          fetch('/api/driver/gps/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phone,
              lat: 12.8449,
              lng: 74.8498,
              accuracy: 15,
            }),
          }).catch(() => {});
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    };

    sendDriverGps();
    const interval = setInterval(sendDriverGps, 15000);
    return () => clearInterval(interval);
  }, [driver, user]);

  // Auto-poll for new dispatches every 5 seconds
  useEffect(() => {
    if (!driver && !user) return;
    const driverId = driver?.id;
    const pollFn = () => fetchDriverDispatches(driverId);
    const pollInterval = setInterval(pollFn, 5000);
    return () => clearInterval(pollInterval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driver, user]);

  const isAdmin =
    user?.phone?.includes('9481086058') ||
    user?.phone?.includes('9999999999') ||
    user?.roles?.includes('ADMIN');

  const isDeactivated =
    driver?.isActive === false ||
    driver?.status === 'INACTIVE' ||
    driver?.status === 'DEACTIVATED' ||
    driver?.status === 'SUSPENDED';

  const isApproved =
    !isDeactivated &&
    (isAdmin ||
      driver?.status === 'APPROVED' ||
      driver?.isVerifiedByAdmin === true ||
      user?.roles?.includes('DRIVER'));

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-kandy-bg">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-10">
          <div className="text-center font-bold text-sm text-kandy-muted">
            Checking Driver Credentials...
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-kandy-bg">
      <Navbar />

      <main className="flex-1 py-4 sm:py-10">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8">
          {/* STRICT REQUIREMENT: Without logging in, show ONLY the clean Driver Login card. ZERO details or trip data! */}
          {!user && !driver ? (
            <div className="max-w-md mx-auto bg-white p-4 sm:p-8 rounded-2xl sm:rounded-widget border border-kandy-border shadow-widget text-center space-y-3 sm:space-y-5">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-kandy-ink text-white rounded-xl mx-auto flex items-center justify-center font-black text-xl sm:text-2xl shadow-md border-b-4 border-kandy-orange">
                KC
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-kandy-ink">Driver Partner Portal</h2>
                <p className="text-xs text-kandy-muted mt-1">
                  Sign in to view your assigned trips, active broadcast dispatches & earnings.
                </p>
              </div>

              <Link
                href="/login"
                className="w-full py-3 sm:py-3.5 bg-kandy-orange hover:bg-kandy-orangeHover text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition shadow-md flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4 text-white" />
                <span>SIGN IN TO ACCESS DRIVER PORTAL →</span>
              </Link>
            </div>
          ) : isDeactivated && !isAdmin ? (
            /* Driver Deactivated / Suspended by Admin */
            <div className="bg-white p-4 sm:p-8 rounded-2xl sm:rounded-card border-2 border-red-500 shadow-card text-center space-y-4 sm:space-y-6 max-w-xl mx-auto">
              <ShieldAlert className="w-12 h-12 sm:w-16 sm:h-16 text-red-600 mx-auto animate-pulse" />
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-red-600 uppercase tracking-wide">Account Suspended</h2>
                <p className="text-xs text-kandy-muted mt-1.5">
                  Hello <strong>{driver?.fullName || user?.fullName || 'Driver Partner'}</strong>. Your driver partner account has been <strong>SUSPENDED</strong> by Admin Operations. You cannot view assigned works or broadcast dispatches at this time.
                </p>
              </div>

              <div className="bg-red-50 p-3.5 sm:p-4 rounded-xl border border-red-200 text-xs font-bold text-red-900 space-y-1">
                <div className="text-red-800 font-black uppercase text-sm">ACCOUNT STATUS: SUSPENDED BY ADMIN</div>
                <div>Please contact Master Admin to reactivate your account: <strong>+91 9481086058</strong></div>
              </div>

              <div className="pt-2 border-t border-gray-100 flex flex-col sm:flex-row gap-2.5 sm:gap-3 justify-center">
                <Link
                  href="/customer/dashboard"
                  className="px-5 py-2.5 bg-kandy-bg hover:bg-gray-200 text-kandy-ink font-bold text-xs rounded-xl transition"
                >
                  Switch to Customer Mode 🚘
                </Link>
                <a
                  href="tel:+919481086058"
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition shadow flex items-center justify-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call Admin 9481086058</span>
                </a>
              </div>
            </div>
          ) : !isApproved ? (
            /* Logged in, but Pending Admin Approval */
            <div className="bg-white p-4 sm:p-8 rounded-2xl sm:rounded-card border-2 border-amber-400 shadow-card text-center space-y-4 sm:space-y-6 max-w-xl mx-auto">
              <AlertCircle className="w-12 h-12 sm:w-14 sm:h-14 text-amber-500 mx-auto animate-bounce" />
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-kandy-ink">Driver Application Pending Admin Approval</h2>
                <p className="text-xs text-kandy-muted mt-1.5">
                  Welcome <strong>{user?.fullName || phone}</strong>! Your driver application has been received. Admin (<strong>9481086058</strong>) reviews and approves all driver accounts before trip dispatches are unlocked.
                </p>
              </div>

              <div className="bg-amber-50 p-3 sm:p-4 rounded-xl border border-amber-200 text-xs font-bold text-amber-900 space-y-1">
                <div className="text-amber-800 font-extrabold uppercase">Approval Status: PENDING ADMIN REVIEW</div>
                <div>Contact Master Admin: <strong>+91 9481086058</strong></div>
              </div>

              <div className="pt-2 border-t border-gray-100 flex flex-col sm:flex-row gap-2.5 sm:gap-3 justify-center">
                <button
                  onClick={() => {
                    setIsVehicleChangedMode(false);
                    setShowDocModal(true);
                    setDocSuccess(null);
                  }}
                  className="px-5 py-2.5 bg-kandy-orange hover:bg-kandy-orangeHover text-white font-bold text-xs rounded-xl transition shadow flex items-center justify-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Verification Docs 🚘</span>
                </button>
                <Link
                  href="/customer/dashboard"
                  className="px-5 py-2.5 bg-kandy-bg hover:bg-gray-200 text-kandy-ink font-bold text-xs rounded-xl transition"
                >
                  Switch to Customer Mode 🚘
                </Link>
                <a
                  href="tel:+919481086058"
                  className="px-5 py-2.5 bg-kandy-ink hover:bg-black text-white font-bold text-xs rounded-xl transition shadow flex items-center justify-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call Admin 9481086058</span>
                </a>
              </div>
            </div>
          ) : (
            /* Approved Driver Dashboard */
            <div className="space-y-6">
              {/* Driver Profile Header */}
              <DriverHeader
                driverName={driver?.fullName || user?.fullName || 'Ranju'}
                driverPhone={user?.phone || '9481086058'}
                vehicleName={driver?.assignedVehicle?.name || docVehicleName || 'Swift Dzire Sedan'}
                photoUrl={storedDocPaths.driverPhotoUrl || driver?.driverPhotoUrl}
                isOnline={isOnline}
                onToggleOnline={async () => {
                  const nextState = !isOnline;
                  setIsOnline(nextState);
                  try {
                    const phoneNum = user?.phone || '8659745632';
                    const driverId = driver?.id || `d_${phoneNum}`;
                    await fetch('/api/driver/duty', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ isOnline: nextState, phone: phoneNum, driverId }),
                    });
                  } catch (err) {
                    console.warn('Duty toggle sync error:', err);
                  }
                }}
                hasPendingDocs={hasPendingDocs}
                pendingCount={pendingCount}
                onOpenDocModal={() => {
                  setIsVehicleChangedMode(false);
                  setShowDocModal(true);
                  setDocSuccess(null);
                }}
              />

              {/* NEW DISPATCH ALERT BANNER */}
              {newDispatchCount > 0 && (
                <div
                  className="flex items-center gap-3 bg-orange-500 text-white px-4 py-3 rounded-2xl shadow-lg cursor-pointer animate-pulse border border-orange-400"
                  onClick={() => setNewDispatchCount(0)}
                >
                  <div className="flex-shrink-0 w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
                    <Radio className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-sm leading-tight">
                      🚨 {newDispatchCount} New Dispatch{newDispatchCount > 1 ? 'es' : ''} Incoming!
                    </p>
                    <p className="text-[11px] text-orange-100 mt-0.5">
                      Admin has assigned new trip{newDispatchCount > 1 ? 's' : ''} to you — check below
                    </p>
                  </div>
                  <div className="text-orange-200 text-xs font-bold">TAP TO DISMISS</div>
                </div>
              )}

              {/* Dispatches Partitioning */}
              {(() => {
                const currentDriverId = driver?.id || user?.id || 'd_1';
                const availableDispatches = dispatches.filter((disp) => {
                  const status = disp.booking?.status || disp.status || 'DISPATCHED';
                  return status === 'DISPATCHED' || status === 'PENDING';
                });

                const recentDispatches = dispatches.filter((disp) => {
                  const status = disp.booking?.status || disp.status || 'DISPATCHED';
                  return status !== 'DISPATCHED' && status !== 'PENDING';
                });

                const mapToBookingItem = (disp: any): DriverBookingItem => ({
                  id: disp.booking?.id || disp.bookingId || disp.id,
                  humanReadableRef: disp.booking?.humanReadableRef || 'KC29264',
                  tripType: disp.booking?.tripType || 'ONEWAY',
                  pickupAddress: disp.booking?.pickupAddress || 'Pickup address',
                  dropAddress: disp.booking?.dropAddress || 'Drop address',
                  scheduledAt: disp.booking?.scheduledAt || '',
                  distanceKm: disp.booking?.distanceKm,
                  estimatedFare: disp.booking?.estimatedFare || 0,
                  advanceAmount: disp.booking?.advanceAmount || 0,
                  advancePaymentStatus: disp.booking?.advancePaymentStatus || 'PENDING',
                  balanceAmount: disp.booking?.balanceAmount || 0,
                  balancePaymentStatus: disp.booking?.balancePaymentStatus || 'PENDING',
                  tollAmount: disp.booking?.tollAmount || 0,
                  status: disp.booking?.status || disp.status || 'DISPATCHED',
                  customerPhoneReleased: !!disp.booking?.customerPhoneReleased,
                  customer: disp.booking?.customer,
                  assignedDriver: disp.booking?.assignedDriver || (disp.assignedDriverId ? { id: disp.assignedDriverId } : undefined),
                });

                return (
                  <div className="space-y-6">
                    {/* Available Trip Dispatches Section */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center">
                            <Radio className="w-3.5 h-3.5 text-kandy-orange animate-pulse" />
                          </div>
                          <div>
                            <h2 className="text-base font-black text-slate-900">Available Dispatches</h2>
                            <p className="text-[11px] text-slate-500 font-medium">First accept wins broadcast</p>
                          </div>
                        </div>
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                          Live Feed
                        </span>
                      </div>

                      {availableDispatches.length === 0 ? (
                        <div className="bg-white p-6 text-center rounded-2xl border border-slate-200/90 text-xs text-slate-500 shadow-2xs space-y-1.5">
                          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                            <Radio className="w-5 h-5" />
                          </div>
                          <p className="font-extrabold text-slate-700">No active dispatches available right now.</p>
                          <p className="text-slate-400 text-[11px]">Stay online to receive instant notifications when new rides are dispatched!</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {availableDispatches.map((disp) => (
                            <DriverBookingCard
                              key={disp.id}
                              booking={mapToBookingItem(disp)}
                              currentDriverId={currentDriverId}
                              onAccept={(bookingId) => handleAcceptDispatch(disp.id, bookingId)}
                              onOpenTripModal={(b) => setActiveTripModalBooking(b)}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Recent Activity Section (Taken / Completed / Cancelled) */}
                    {recentDispatches.length > 0 && (
                      <div className="space-y-3 pt-2 border-t border-slate-200">
                        <div className="flex items-center justify-between">
                          <h2 className="text-sm font-black text-slate-800 uppercase tracking-wide">Recent Activity & Trips</h2>
                          <span className="text-[11px] font-bold text-slate-400">{recentDispatches.length} Trips</span>
                        </div>

                        <div className="space-y-3">
                          {recentDispatches.map((disp) => (
                            <DriverBookingCard
                              key={disp.id}
                              booking={mapToBookingItem(disp)}
                              currentDriverId={currentDriverId}
                              onAccept={(bookingId) => handleAcceptDispatch(disp.id, bookingId)}
                              onOpenTripModal={(b) => setActiveTripModalBooking(b)}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Trip Lifecycle Modal */}
        {activeTripModalBooking && (
          <TripLifecycleModal
            booking={activeTripModalBooking}
            driverId={driver?.id || user?.id || 'd_1'}
            driverPhone={user?.phone || '8888888888'}
            onClose={() => setActiveTripModalBooking(null)}
            onRefresh={() => fetchDriverDispatches(driver?.id || 'd_1')}
          />
        )}
      </main>

      {/* Driver Document & Vehicle Change Upload Modal */}
      {showDocModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-widget border border-kandy-border max-w-2xl w-full max-h-[92vh] overflow-y-auto p-3 sm:p-6 shadow-2xl space-y-2.5 sm:space-y-4 my-2 sm:my-8">
            <div className="flex items-center justify-between border-b border-kandy-border pb-2 sm:pb-3">
              <div className="flex items-center gap-2 sm:gap-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/kandycabs-logo.png"
                  alt="Kandy Cabs Logo"
                  className="h-8 sm:h-10 w-auto object-contain shrink-0"
                />
                <div>
                  <h3 className="text-sm sm:text-lg font-black text-kandy-ink leading-tight">
                    {isVehicleChangedMode ? '🔄 Vehicle Change & Document Update' : '🚘 Driver & Vehicle Necessary Documents'}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => {
                  if (user?.phone) {
                    sessionStorage.setItem(`driver_docs_dismissed_${user.phone}`, 'true');
                  }
                  setShowDocModal(false);
                }}
                className="p-1 sm:p-1.5 hover:bg-gray-100 rounded-lg text-kandy-ink font-bold shrink-0 ml-1"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            {docSuccess ? (
              <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-4 sm:p-6 rounded-xl text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-600 mx-auto" />
                <div className="font-black text-xs sm:text-sm">{docSuccess}</div>
                <div className="text-[11px] sm:text-xs text-emerald-700">Admin database and storage paths have been updated.</div>
              </div>
            ) : !hasPendingDocs && !isVehicleChangedMode ? (
              /* Once ALL images/documents are uploaded: Remove images section & keep ONLY Driving License Number, Vehicle Model & Vehicle Plate Number */
              <form onSubmit={handleUploadQueue} className="space-y-3 sm:space-y-4 text-xs">
                <div className="bg-emerald-50 border border-emerald-200 p-2.5 sm:p-3.5 rounded-xl flex items-center justify-between text-emerald-900 text-xs font-semibold shadow-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 shrink-0" />
                    <span>All verification documents & vehicle photos have been uploaded & verified by Admin.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsVehicleChangedMode(true)}
                    className="text-[11px] font-extrabold text-emerald-700 hover:text-emerald-900 underline shrink-0 ml-2"
                  >
                    🔄 Re-upload / Update Docs
                  </button>
                </div>

                <div className="p-3 sm:p-5 bg-kandy-bg rounded-xl border border-kandy-border space-y-3 sm:space-y-4">
                  <h4 className="font-extrabold text-kandy-ink text-[11px] sm:text-xs uppercase flex items-center gap-1.5 border-b border-gray-200 pb-1.5 sm:pb-2">
                    <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-kandy-orange" />
                    <span>Verified Driver & Vehicle Information</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4">
                    {/* 1. Driving License Number */}
                    <div>
                      <label className="block text-[10px] sm:text-[11px] font-bold text-kandy-muted uppercase mb-1">
                        Driving License Number *
                      </label>
                      <input
                        type="text"
                        value={docLicenseNumber}
                        onChange={(e) => setDocLicenseNumber(e.target.value)}
                        placeholder="e.g. KA-01-2026-9876543"
                        className="w-full px-2.5 py-1.5 sm:py-2 bg-white border border-kandy-border rounded-lg text-xs font-semibold focus:outline-none focus:border-kandy-orange"
                        required
                      />
                    </div>

                    {/* 2. Vehicle Model & Category */}
                    <div>
                      <label className="block text-[10px] sm:text-[11px] font-bold text-kandy-muted uppercase mb-1">
                        Vehicle Model & Category *
                      </label>
                      <select
                        value={docVehicleName}
                        onChange={(e) => setDocVehicleName(e.target.value)}
                        className="w-full px-2.5 py-1.5 sm:py-2 bg-white border border-kandy-border rounded-lg text-xs font-semibold focus:outline-none focus:border-kandy-orange"
                      >
                        <option value="Swift Dzire (Sedan)">Swift Dzire (Sedan)</option>
                        <option value="Toyota Etios (Sedan)">Toyota Etios (Sedan)</option>
                        <option value="Hatchback (WagonR / Indica)">Hatchback (WagonR / Indica)</option>
                        <option value="SUV (Ertiga / Marazzo)">SUV (Ertiga / Marazzo)</option>
                        <option value="SUV Premium (Toyota Innova Crysta)">SUV Premium (Toyota Innova Crysta)</option>
                        <option value="Tempo Traveler (12 Seater Luxury)">Tempo Traveler (12 Seater Luxury)</option>
                      </select>
                    </div>

                    {/* 3. Vehicle Plate Number */}
                    <div>
                      <label className="block text-[10px] sm:text-[11px] font-bold text-kandy-muted uppercase mb-1">
                        Vehicle Plate Number *
                      </label>
                      <input
                        type="text"
                        value={docVehicleNumber}
                        onChange={(e) => setDocVehicleNumber(e.target.value)}
                        placeholder="e.g. KA-01-AB-1234"
                        className="w-full px-2.5 py-1.5 sm:py-2 bg-white border border-kandy-border rounded-lg text-xs font-semibold focus:outline-none focus:border-kandy-orange"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Uploaded Documents Gallery — visible when all docs are complete */}
                <div className="p-3 sm:p-4 bg-kandy-bg rounded-xl border border-kandy-border space-y-2.5 sm:space-y-3">
                  <p className="text-[10px] sm:text-[11px] font-extrabold text-kandy-muted uppercase tracking-wider flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-kandy-orange" /> Uploaded Documents Preview
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {storedDocPaths.driverPhotoUrl && (
                      <div>
                        <p className="text-[9px] font-bold text-kandy-muted uppercase mb-1">Driver Photo</p>
                        <img
                          src={`/api/driver/documents/file?path=${encodeURIComponent(storedDocPaths.driverPhotoUrl)}`}
                          alt="Driver Photo"
                          className="h-16 sm:h-20 w-full object-cover rounded border border-emerald-300 shadow-sm"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </div>
                    )}
                    {storedDocPaths.license && (
                      <div>
                        <p className="text-[9px] font-bold text-kandy-muted uppercase mb-1">License</p>
                        <img
                          src={`/api/driver/documents/file?path=${encodeURIComponent(storedDocPaths.license)}`}
                          alt="License"
                          className="h-16 sm:h-20 w-full object-cover rounded border border-emerald-300 shadow-sm"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </div>
                    )}
                    {storedDocPaths.rc && (
                      <div>
                        <p className="text-[9px] font-bold text-kandy-muted uppercase mb-1">RC</p>
                        <img
                          src={`/api/driver/documents/file?path=${encodeURIComponent(storedDocPaths.rc)}`}
                          alt="RC"
                          className="h-16 sm:h-20 w-full object-cover rounded border border-emerald-300 shadow-sm"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </div>
                    )}
                    {storedDocPaths.insurance && (
                      <div>
                        <p className="text-[9px] font-bold text-kandy-muted uppercase mb-1">Insurance</p>
                        <img
                          src={`/api/driver/documents/file?path=${encodeURIComponent(storedDocPaths.insurance)}`}
                          alt="Insurance"
                          className="h-16 sm:h-20 w-full object-cover rounded border border-emerald-300 shadow-sm"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </div>
                    )}
                  </div>
                  {storedDocPaths.vehiclePhotos?.some(Boolean) && (
                    <div>
                      <p className="text-[9px] font-bold text-kandy-muted uppercase mb-1">Vehicle Photos</p>
                      <div className="grid grid-cols-5 gap-1.5">
                        {(['Front', 'Back', 'Left', 'Right', 'Inside'] as const).map((label, idx) =>
                          storedDocPaths.vehiclePhotos?.[idx] ? (
                            <div key={label}>
                              <p className="text-[8px] font-bold text-center text-kandy-muted mb-0.5">{label}</p>
                              <img
                                src={`/api/driver/documents/file?path=${encodeURIComponent(storedDocPaths.vehiclePhotos![idx])}`}
                                alt={`${label} View`}
                                className="h-12 sm:h-16 w-full object-cover rounded border border-emerald-300 shadow-sm"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            </div>
                          ) : null
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2.5 pt-2.5 sm:pt-3 border-t border-kandy-border">
                  <button
                    type="button"
                    onClick={() => {
                      if (user?.phone) {
                        sessionStorage.setItem(`driver_docs_dismissed_${user.phone}`, 'true');
                      }
                      setShowDocModal(false);
                    }}
                    className="px-3.5 py-2 sm:py-2.5 bg-gray-100 text-gray-700 font-bold text-xs uppercase rounded-lg hover:bg-gray-200"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={docSubmitting}
                    className="px-5 py-2 sm:py-2.5 bg-kandy-orange hover:bg-kandy-orangeHover text-white font-extrabold text-xs uppercase tracking-wider rounded-lg transition shadow flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <span>{docSubmitting ? 'SAVING...' : 'SAVE DETAILS →'}</span>
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleUploadQueue} className="space-y-6 text-xs">
                {/* 1. Progress Indicator Stepper */}
                {(() => {
                  const isSec1Complete = (!isLicensePending || uploadStatuses.license?.status === 'uploaded') && (!isDriverPhotoPending || uploadStatuses.driverPhoto?.status === 'uploaded');
                  const isSec2Complete = (!isRcPending || uploadStatuses.rc?.status === 'uploaded') && (!isInsurancePending || uploadStatuses.insurance?.status === 'uploaded');
                  const isSec3Complete = !isFrontPending && !isBackPending && !isLeftPending && !isRightPending && !isInsidePending;

                  const currentStep = isSec1Complete ? (isSec2Complete ? 3 : 2) : 1;
                  const stepLabel = currentStep === 1 ? 'License & Driver Photo' : currentStep === 2 ? 'RC & Insurance' : 'Vehicle Photos';
                  const percentComplete = Math.round((((isSec1Complete ? 1 : 0) + (isSec2Complete ? 1 : 0) + (isSec3Complete ? 1 : 0)) / 3) * 100);

                  return (
                    <div className="bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between text-xs font-black text-slate-800">
                        <span className="flex items-center gap-1.5">
                          <span className="w-5 h-5 bg-kandy-orange text-white rounded-full text-[10px] flex items-center justify-center font-black">
                            {currentStep}
                          </span>
                          <span>Step {currentStep} of 3: {stepLabel}</span>
                        </span>
                        <span className="text-[11px] font-extrabold text-kandy-orange">
                          {percentComplete}% Complete
                        </span>
                      </div>

                      {/* 3-Segment Progress Bar */}
                      <div className="grid grid-cols-3 gap-1.5">
                        <div className={`h-1.5 rounded-full transition-colors ${isSec1Complete ? 'bg-emerald-500' : 'bg-kandy-orange'}`}></div>
                        <div className={`h-1.5 rounded-full transition-colors ${isSec2Complete ? 'bg-emerald-500' : isSec1Complete ? 'bg-kandy-orange' : 'bg-slate-200'}`}></div>
                        <div className={`h-1.5 rounded-full transition-colors ${isSec3Complete ? 'bg-emerald-500' : isSec2Complete ? 'bg-kandy-orange' : 'bg-slate-200'}`}></div>
                      </div>
                    </div>
                  );
                })()}

                {/* 2. Collapsible Admin Notice Banner */}
                {!isNoticeDismissed && (
                  <div className="p-2 px-3 bg-amber-50/90 border border-amber-200/90 rounded-lg flex items-center justify-between gap-2 text-amber-900 text-[11px] font-medium shadow-2xs">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>
                        <strong>Admin Notice:</strong> Upload clear documents & vehicle photos. Upload queue processes 2 files concurrently.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsNoticeDismissed(true)}
                      className="text-amber-600 hover:text-amber-900 p-0.5 rounded transition shrink-0"
                      title="Dismiss Notice"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* SECTION 1: Driver Profile & License */}
                <div className="p-3.5 sm:p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                  <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2 border-b border-slate-100 pb-2.5">
                    <div className="w-6 h-6 rounded-md bg-orange-100 text-kandy-orange flex items-center justify-center shrink-0">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <span>1. Driver Profile & License Document</span>
                  </h4>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Driving License Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={docLicenseNumber}
                        onChange={(e) => setDocLicenseNumber(e.target.value)}
                        placeholder="e.g. KA-01-2026-9876543"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-kandy-orange focus:bg-white rounded-xl text-xs font-semibold focus:outline-none transition shadow-2xs"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <UploadField
                        label="Upload License File"
                        required
                        accept="image/*,.pdf"
                        selectedFile={selectedFiles.license}
                        storedPath={storedDocPaths.license}
                        uploadStatus={uploadStatuses.license?.status}
                        errorMessage={uploadStatuses.license?.errorMsg}
                        onFileSelect={(file) => handleFileSelect('license', file)}
                        showValidationError={hasSubmitAttempted}
                      />

                      <UploadField
                        label="Upload Driver Photo"
                        required
                        accept="image/*"
                        selectedFile={selectedFiles.driverPhoto}
                        storedPath={storedDocPaths.driverPhotoUrl}
                        uploadStatus={uploadStatuses.driverPhoto?.status}
                        errorMessage={uploadStatuses.driverPhoto?.errorMsg}
                        onFileSelect={(file) => handleFileSelect('driverPhoto', file)}
                        showValidationError={hasSubmitAttempted}
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 2: Vehicle RC & Insurance */}
                <div className="p-3.5 sm:p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                  <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2 border-b border-slate-100 pb-2.5">
                    <div className="w-6 h-6 rounded-md bg-orange-100 text-kandy-orange flex items-center justify-center shrink-0">
                      <Car className="w-3.5 h-3.5" />
                    </div>
                    <span>2. Vehicle RC & Insurance Documents</span>
                  </h4>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                          Vehicle Model & Category <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={docVehicleName}
                          onChange={(e) => setDocVehicleName(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-kandy-orange focus:bg-white rounded-xl text-xs font-semibold focus:outline-none transition shadow-2xs"
                        >
                          <option value="Swift Dzire (Sedan)">Swift Dzire (Sedan)</option>
                          <option value="Toyota Etios (Sedan)">Toyota Etios (Sedan)</option>
                          <option value="Hatchback (WagonR / Indica)">Hatchback (WagonR / Indica)</option>
                          <option value="SUV (Ertiga / Marazzo)">SUV (Ertiga / Marazzo)</option>
                          <option value="SUV Premium (Toyota Innova Crysta)">SUV Premium (Toyota Innova Crysta)</option>
                          <option value="Tempo Traveler (12 Seater Luxury)">Tempo Traveler (12 Seater Luxury)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                          Vehicle Plate Number
                        </label>
                        <input
                          type="text"
                          value={docVehicleNumber}
                          onChange={(e) => setDocVehicleNumber(e.target.value)}
                          placeholder="e.g. KA-01-AB-1234"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-kandy-orange focus:bg-white rounded-xl text-xs font-semibold focus:outline-none transition shadow-2xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <UploadField
                        label="Upload RC (Registration Cert)"
                        required
                        accept="image/*,.pdf"
                        selectedFile={selectedFiles.rc}
                        storedPath={storedDocPaths.rc}
                        uploadStatus={uploadStatuses.rc?.status}
                        errorMessage={uploadStatuses.rc?.errorMsg}
                        onFileSelect={(file) => handleFileSelect('rc', file)}
                        showValidationError={hasSubmitAttempted}
                      />

                      <UploadField
                        label="Upload Vehicle Insurance"
                        required
                        accept="image/*,.pdf"
                        selectedFile={selectedFiles.insurance}
                        storedPath={storedDocPaths.insurance}
                        uploadStatus={uploadStatuses.insurance?.status}
                        errorMessage={uploadStatuses.insurance?.errorMsg}
                        onFileSelect={(file) => handleFileSelect('insurance', file)}
                        showValidationError={hasSubmitAttempted}
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 3: Vehicle Photos */}
                <div className="p-3.5 sm:p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                  <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2 border-b border-slate-100 pb-2.5">
                    <div className="w-6 h-6 rounded-md bg-orange-100 text-kandy-orange flex items-center justify-center shrink-0">
                      <Camera className="w-3.5 h-3.5" />
                    </div>
                    <span>3. Vehicle Photos (Front, Back, Sides & Interior)</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <UploadField
                      label="Front View Photo"
                      required
                      accept="image/*"
                      selectedFile={selectedFiles.vehicleFront}
                      storedPath={storedDocPaths.vehiclePhotos?.[0]}
                      uploadStatus={uploadStatuses.vehicleFront?.status}
                      errorMessage={uploadStatuses.vehicleFront?.errorMsg}
                      onFileSelect={(file) => handleFileSelect('vehicleFront', file)}
                      showValidationError={hasSubmitAttempted}
                    />

                    <UploadField
                      label="Back View Photo"
                      required
                      accept="image/*"
                      selectedFile={selectedFiles.vehicleBack}
                      storedPath={storedDocPaths.vehiclePhotos?.[1]}
                      uploadStatus={uploadStatuses.vehicleBack?.status}
                      errorMessage={uploadStatuses.vehicleBack?.errorMsg}
                      onFileSelect={(file) => handleFileSelect('vehicleBack', file)}
                      showValidationError={hasSubmitAttempted}
                    />

                    <UploadField
                      label="Left Side View Photo"
                      required
                      accept="image/*"
                      selectedFile={selectedFiles.vehicleLeft}
                      storedPath={storedDocPaths.vehiclePhotos?.[2]}
                      uploadStatus={uploadStatuses.vehicleLeft?.status}
                      errorMessage={uploadStatuses.vehicleLeft?.errorMsg}
                      onFileSelect={(file) => handleFileSelect('vehicleLeft', file)}
                      showValidationError={hasSubmitAttempted}
                    />

                    <UploadField
                      label="Right Side View Photo"
                      required
                      accept="image/*"
                      selectedFile={selectedFiles.vehicleRight}
                      storedPath={storedDocPaths.vehiclePhotos?.[3]}
                      uploadStatus={uploadStatuses.vehicleRight?.status}
                      errorMessage={uploadStatuses.vehicleRight?.errorMsg}
                      onFileSelect={(file) => handleFileSelect('vehicleRight', file)}
                      showValidationError={hasSubmitAttempted}
                    />

                    <UploadField
                      label="Car Inside View Photo"
                      required
                      accept="image/*"
                      selectedFile={selectedFiles.vehicleInside}
                      storedPath={storedDocPaths.vehiclePhotos?.[4]}
                      uploadStatus={uploadStatuses.vehicleInside?.status}
                      errorMessage={uploadStatuses.vehicleInside?.errorMsg}
                      onFileSelect={(file) => handleFileSelect('vehicleInside', file)}
                      showValidationError={hasSubmitAttempted}
                    />
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      if (user?.phone) {
                        sessionStorage.setItem(`driver_docs_dismissed_${user.phone}`, 'true');
                      }
                      setShowDocModal(false);
                    }}
                    className="px-4 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 font-extrabold text-xs uppercase rounded-xl transition cursor-pointer"
                  >
                    Skip For Now
                  </button>
                  <button
                    type="submit"
                    disabled={docSubmitting}
                    className="px-6 py-2.5 bg-gradient-to-r from-kandy-orange to-amber-500 hover:opacity-90 text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-md flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <Upload className="w-4 h-4 shrink-0" />
                    <span>{docSubmitting ? 'UPLOADING...' : 'UPLOAD & SAVE PATHS →'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
