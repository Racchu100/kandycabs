'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import nextDynamic from 'next/dynamic';
import {
  TripType,
  VehicleCategory,
  FuelType,
  QuoteResponse,
  PricingBreakdown,
  UserRole,
} from '@kandy-cabs/shared';
import { useAuth } from '@/lib/AuthContext';
import { ALL_LOCATIONS, PlaceLocation } from '@/lib/locations';

import { DriverAppModal } from '@/components/DriverAppModal';
import { LocationPickerModal } from '@/components/LocationPickerModal';

export const dynamic = 'force-dynamic';

const POPULAR_LOCATIONS = ALL_LOCATIONS.map((l) => ({ name: l.label, lat: l.lat, lng: l.lng }));

const VEHICLE_META: Record<
  string,
  {
    image: string;
    tagline: string;
    badge: string;
  }
> = {
  [VehicleCategory.HATCHBACK]: {
    image: '/images/fleet-hatchback.webp',
    tagline: 'WagonR, Swift, Tiago or equivalent',
    badge: 'POPULAR CHOICE',
  },
  [VehicleCategory.SEDAN]: {
    image: '/images/fleet-sedan.webp',
    tagline: 'Dzire, Etios, Honda Amaze or equivalent',
    badge: 'MOST BOOKED',
  },
  [VehicleCategory.SUV]: {
    image: '/images/fleet-suv.webp',
    tagline: 'Ertiga, Carens, Triber or equivalent',
    badge: 'EXTRA SPACE',
  },
  [VehicleCategory.SUV_PREMIUM]: {
    image: '/images/fleet-crysta.webp',
    tagline: 'Innova Crysta, Safari, Hycross or equivalent',
    badge: 'PREMIUM COMFORT',
  },
  ['INNOVA_CRYSTA']: {
    image: '/images/fleet-crysta.webp',
    tagline: 'Innova Crysta, Safari, Hycross or equivalent',
    badge: 'PREMIUM COMFORT',
  },
  [VehicleCategory.TEMPO_TRAVELER]: {
    image: '/images/fleet-traveller.webp',
    tagline: 'Force Traveller 3350 AC (12+1)',
    badge: 'GROUP TRAVEL',
  },
};

export default function BookingFunnelPage() {
  const { user, isAuthenticated, sendOtp, verifyOtp, logout } = useAuth();

  // Wizard Step State (1: Route, 2: Vehicles & Quote, 3: Auth/Contact, 4: Payment & Confirm)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Route & Schedule
  const [tripType, setTripType] = useState<TripType>(TripType.ONEWAY);
  const [pickupAddress, setPickupAddress] = useState(POPULAR_LOCATIONS[2]?.name || 'Indiranagar 100 Feet Rd, Bangalore');
  const [pickupLat, setPickupLat] = useState(POPULAR_LOCATIONS[2]?.lat || 12.9784);
  const [pickupLng, setPickupLng] = useState(POPULAR_LOCATIONS[2]?.lng || 77.6408);

  const [dropAddress, setDropAddress] = useState(POPULAR_LOCATIONS[5]?.name || 'Mysore Palace, Mysore');
  const [dropLat, setDropLat] = useState(POPULAR_LOCATIONS[5]?.lat || 12.3051);
  const [dropLng, setDropLng] = useState(POPULAR_LOCATIONS[5]?.lng || 76.6551);

  // Interactive OpenStreetMap Location Picker Modal State
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [locationModalTarget, setLocationModalTarget] = useState<'PICKUP' | 'DROP' | string>('PICKUP');

  const handleSelectLocation = (place: PlaceLocation) => {
    if (locationModalTarget === 'PICKUP') {
      setPickupAddress(place.label);
      setPickupLat(place.lat);
      setPickupLng(place.lng);
    } else if (locationModalTarget === 'DROP') {
      setDropAddress(place.label);
      setDropLat(place.lat);
      setDropLng(place.lng);
    } else {
      setStops((prev) =>
        prev.map((s) => (s.id === locationModalTarget ? { ...s, address: place.label, lat: place.lat, lng: place.lng } : s))
      );
    }
  };

  // Round Trip Multiple Stops State (ONLY for Round Trip)
  interface TripStop {
    id: string;
    address: string;
    lat: number;
    lng: number;
  }
  const [stops, setStops] = useState<TripStop[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      
      // 1. Trip Type
      const tripTypeParam = sp.get('tripType') as TripType;
      if (tripTypeParam && Object.values(TripType).includes(tripTypeParam)) {
        setTripType(tripTypeParam);
      }

      // 2. Pickup Location
      const pickupParam = sp.get('pickup');
      if (pickupParam) {
        setPickupAddress(pickupParam);
        const lat = Number(sp.get('pickupLat'));
        const lng = Number(sp.get('pickupLng'));
        if (!isNaN(lat) && !isNaN(lng) && lat !== 0) {
          setPickupLat(lat);
          setPickupLng(lng);
        }
      }

      // 3. Drop Location
      const dropParam = sp.get('drop');
      if (dropParam) {
        setDropAddress(dropParam);
        const lat = Number(sp.get('dropLat'));
        const lng = Number(sp.get('dropLng'));
        if (!isNaN(lat) && !isNaN(lng) && lat !== 0) {
          setDropLat(lat);
          setDropLng(lng);
        }
      }

      // 4. Schedule Date & Time
      const dateParam = sp.get('date');
      if (dateParam) setScheduledDate(dateParam);
      const timeParam = sp.get('time');
      if (timeParam) setScheduledTime(timeParam);

      // 5. Duration Days & Package Hours
      const durationParam = Number(sp.get('durationDays'));
      if (!isNaN(durationParam) && durationParam > 0) setDurationDays(durationParam);
      const pkgParam = Number(sp.get('packageHours'));
      if (!isNaN(pkgParam) && pkgParam > 0) setPackageHours(pkgParam);

      // 6. Selected Vehicle Category
      const catParam = sp.get('category') as VehicleCategory;
      if (catParam && Object.values(VehicleCategory).includes(catParam)) {
        setSelectedCategory(catParam);
      }

      // Step selection (e.g., step=2 for Select Cab)
      const stepParam = Number(sp.get('step'));
      if (stepParam >= 1 && stepParam <= 4) {
        setStep(stepParam as 1 | 2 | 3 | 4);
      }

      // 7. Multiple Stops (ONLY for Round Trip)
      const stopsParam = sp.get('stops');
      if (stopsParam) {
        try {
          const parsed = JSON.parse(stopsParam);
          if (Array.isArray(parsed)) {
            setStops(parsed);
          }
        } catch (e) {}
      }
    }
  }, []);

  const handleAddStop = () => {
    const available = POPULAR_LOCATIONS.find(
      (l) => l.name !== pickupAddress && l.name !== dropAddress && !stops.some((s) => s.address === l.name)
    ) || POPULAR_LOCATIONS[6];
    setStops((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        address: available.name,
        lat: available.lat,
        lng: available.lng,
      },
    ]);
  };

  const handleRemoveStop = (id: string) => {
    setStops((prev) => prev.filter((s) => s.id !== id));
  };

  const handleUpdateStop = (id: string, name: string) => {
    const loc = POPULAR_LOCATIONS.find((l) => l.name === name);
    if (loc) {
      setStops((prev) =>
        prev.map((s) => (s.id === id ? { ...s, address: loc.name, lat: loc.lat, lng: loc.lng } : s))
      );
    }
  };

  const [scheduledDate, setScheduledDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [durationDays, setDurationDays] = useState(1);
  const [packageHours, setPackageHours] = useState(8);
  const [couponCode, setCouponCode] = useState('');

  // Step 2: Vehicle Quotes & Selection
  const [quotesData, setQuotesData] = useState<QuoteResponse | null>(null);
  const [isQuoting, setIsQuoting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<VehicleCategory>(VehicleCategory.SEDAN);
  const [selectedFuelType, setSelectedFuelType] = useState<FuelType>(FuelType.DIESEL);
  const [activePricing, setActivePricing] = useState<PricingBreakdown | null>(null);

  // Step 3: Auth / Phone Verification
  const [phone, setPhone] = useState(user?.phone?.replace(/^\+91/, '') || '');
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [authError, setAuthError] = useState('');
  const [debugOtp, setDebugOtp] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [isRegistered, setIsRegistered] = useState(false);
  const [existingName, setExistingName] = useState<string | null>(null);
  const [existingRoles, setExistingRoles] = useState<string[]>([]);
  const [driverAppModalOpen, setDriverAppModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Sync authenticated user details to contact state
  useEffect(() => {
    if (user?.phone) {
      setPhone(user.phone.replace(/^\+91/, ''));
    }
    if (user?.fullName) {
      setFullName(user.fullName);
    }
  }, [user]);

  // Resend Countdown Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Step 4: Payment & Confirmation
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // In-browser client quote cache & abort controller
  const clientQuoteCache = useRef<Map<string, QuoteResponse>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch Quotes when Step 1 data or route selections change
  const fetchQuotes = useCallback(async () => {
    const scheduledAt = `${scheduledDate}T${scheduledTime}:00`;
    const stopsKey = tripType === TripType.ROUND ? stops.map((s) => `${s.lat?.toFixed(4)},${s.lng?.toFixed(4)}`).join('|') : '';
    const cacheKey = `${pickupLat?.toFixed(4)}_${pickupLng?.toFixed(4)}_${dropLat?.toFixed(4)}_${dropLng?.toFixed(4)}_${tripType}_${scheduledAt}_${durationDays}_${packageHours}_${couponCode || ''}_${stopsKey}`;

    // Instant 0ms cache hit in browser
    const cached = clientQuoteCache.current.get(cacheKey);
    if (cached) {
      setQuotesData(cached);
      setIsQuoting(false);
      return;
    }

    // Cancel any inflight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsQuoting(true);
    try {
      const res = await fetch('/api/pricing/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          pickupAddress,
          pickupLat,
          pickupLng,
          dropAddress,
          dropLat,
          dropLng,
          stops: tripType === TripType.ROUND ? stops.map((s) => ({ address: s.address, lat: s.lat, lng: s.lng })) : [],
          tripType,
          scheduledAt,
          durationDays,
          packageHours,
          couponCode,
        }),
      });
      if (res.ok) {
        const data: QuoteResponse = await res.json();
        clientQuoteCache.current.set(cacheKey, data);
        setQuotesData(data);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Failed to fetch quotes:', err);
      }
    } finally {
      if (abortControllerRef.current === controller) {
        setIsQuoting(false);
      }
    }
  }, [
    pickupAddress,
    pickupLat,
    pickupLng,
    dropAddress,
    dropLat,
    dropLng,
    stops,
    tripType,
    scheduledDate,
    scheduledTime,
    durationDays,
    packageHours,
    couponCode,
  ]);

  // Debounced quote fetch (Fast 80ms background prefetch)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchQuotes();
    }, 80);
    return () => clearTimeout(timer);
  }, [fetchQuotes]);

  // Synchronize active pricing when selectedCategory, selectedFuelType, or quotesData changes
  useEffect(() => {
    if (quotesData?.quotes && quotesData.quotes.length > 0) {
      const matchCat = quotesData.quotes.find((q) => q.category === selectedCategory) || quotesData.quotes[0];
      if (matchCat) {
        if (selectedCategory !== matchCat.category) {
          setSelectedCategory(matchCat.category);
        }
        // Match selectedFuelType within fuelOptions
        const matchFuel =
          matchCat.fuelOptions?.find((fo) => fo.fuelType === selectedFuelType) ||
          matchCat.fuelOptions?.[0];

        if (matchFuel) {
          if (selectedFuelType !== matchFuel.fuelType) {
            setSelectedFuelType(matchFuel.fuelType);
          }
          setActivePricing(matchFuel.pricing);
        } else {
          setActivePricing(matchCat.pricing);
        }
      }
    }
  }, [selectedCategory, selectedFuelType, quotesData]);

  // Update active pricing when user clicks a category or fuel option
  const handleSelectCategory = (cat: VehicleCategory) => {
    setSelectedCategory(cat);
    const matchCat = quotesData?.quotes.find((q) => q.category === cat);
    if (matchCat) {
      const matchFuel =
        matchCat.fuelOptions?.find((fo) => fo.fuelType === selectedFuelType) ||
        matchCat.fuelOptions?.[0];
      if (matchFuel) {
        setSelectedFuelType(matchFuel.fuelType);
        setActivePricing(matchFuel.pricing);
      } else {
        setActivePricing(matchCat.pricing);
      }
    }
  };

  const handleSelectCategoryAndFuel = (cat: VehicleCategory, fuel: FuelType) => {
    setSelectedCategory(cat);
    setSelectedFuelType(fuel);
    const matchCat = quotesData?.quotes.find((q) => q.category === cat);
    if (matchCat) {
      const matchFuel = matchCat.fuelOptions?.find((fo) => fo.fuelType === fuel);
      if (matchFuel) {
        setActivePricing(matchFuel.pricing);
      }
    }
  };

  // Step 3: Handle Send OTP
  const handleSendOtp = async () => {
    if (!phone || phone.trim().length !== 10) {
      setAuthError('Please enter a valid 10-digit Indian phone number.');
      return;
    }
    setAuthError('');
    setIsAuthLoading(true);
    try {
      const res = await sendOtp(phone);
      if (res.success) {
        setOtpSent(true);
        setResendTimer(30);
        setIsRegistered(!!res.isRegistered);
        setExistingName(res.existingName || null);
        setExistingRoles(res.roles || []);
        if (res.existingName) {
          setFullName(res.existingName);
        } else {
          setFullName('');
        }
        if (res.debugOtp) {
          setDebugOtp(res.debugOtp);
          setOtp(res.debugOtp);
        }
      } else {
        setAuthError(res.message);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Failed to send OTP');
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Step 3: Handle Verify OTP
  const handleVerifyOtp = async () => {
    if (!otp || otp.trim().length !== 4) {
      setAuthError('Please enter the 4-digit verification code.');
      return;
    }
    if (!isRegistered && !fullName.trim()) {
      setAuthError('Please enter your full name to complete registration.');
      return;
    }
    setAuthError('');
    setIsAuthLoading(true);
    try {
      const res = await verifyOtp(phone, otp, fullName);
      if (res.success) {
        setStep(4);
      } else {
        setAuthError(res.message || 'Verification failed. Please check OTP and try again.');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Invalid verification code');
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Step 4: Confirm Booking & Pay Advance
  const handleConfirmAndPay = async () => {
    if (isSubmitting) return; // double-click protection
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const scheduledAt = `${scheduledDate}T${scheduledTime}:00`;

      // 1. Create Razorpay order on server for authoritative 25% advance
      const orderRes = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickupLat,
          pickupLng,
          dropLat,
          dropLng,
          category: selectedCategory,
          fuelType: selectedFuelType,
          tripType,
          scheduledAt,
          durationDays,
          packageHours,
          couponCode,
        }),
      });

      if (!orderRes.ok) {
        throw new Error('Failed to create payment order');
      }

      const orderData = await orderRes.json();
      const razorpayOrderId = orderData.orderId;
      const idempotencyKey = `idemp_${razorpayOrderId}_${Date.now()}`;

      // 2. Client-side payment confirmation & atomic booking creation
      const bookingRes = await fetch('/api/customer/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          pickupAddress,
          pickupLat,
          pickupLng,
          dropAddress,
          dropLat,
          dropLng,
          category: selectedCategory,
          fuelType: selectedFuelType,
          tripType,
          scheduledAt,
          durationDays,
          packageHours,
          couponCode,
          razorpayOrderId,
          razorpayPaymentId: `pay_rzp_${Date.now()}`,
          idempotencyKey,
        }),
      });

      if (!bookingRes.ok) {
        const errJson = await bookingRes.json();
        throw new Error(errJson.message || 'Failed to confirm booking');
      }

      const bookingData = await bookingRes.json();
      setConfirmedBooking(bookingData.booking);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during booking confirmation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen md:h-screen md:max-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between font-sans pt-16 pb-2 sm:pb-2.5 px-2 sm:px-4 lg:px-8 md:overflow-hidden">
      {/* Top Navigation Bar - Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs transition-all duration-300">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-15 flex items-center justify-between">
          <Link href="/" className="flex items-center group py-1.5">
            <Image
              src="/images/logo.webp"
              alt="Kandy Cabs - Safe | Reliable | Hassle Free"
              width={180}
              height={56}
              priority
              className="h-9 sm:h-11 lg:h-14 w-auto object-contain transition-transform group-hover:scale-[1.02]"
            />
          </Link>

          <nav className="hidden lg:flex items-center space-x-8 font-semibold text-sm text-slate-700">
            <Link href="/#booking-engine" className="hover:text-orange-600 transition">
              Book Cab
            </Link>
            <Link href="/#fleet" className="hover:text-orange-600 transition">
              Fleet & Rates
            </Link>
            <Link href="/#why-kandy" className="hover:text-orange-600 transition">
              Why Choose Us
            </Link>
            <Link href="/#how-it-works" className="hover:text-orange-600 transition">
              How It Works
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                {user?.roles?.includes(UserRole.ADMIN) && (
                  <a
                    href="http://localhost:3001"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hidden lg:inline-flex items-center px-3 py-1.5 sm:py-2 bg-white hover:bg-slate-100 text-slate-900 border border-slate-200 rounded-lg sm:rounded-xl text-xs font-bold transition shadow-xs"
                  >
                    Admin Dashboard
                  </a>
                )}
                {user?.roles?.includes(UserRole.DRIVER) && (
                  <button
                    type="button"
                    onClick={() => setDriverAppModalOpen(true)}
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border border-orange-200 text-orange-900 rounded-xl text-xs font-bold hover:bg-orange-100 transition"
                  >
                    <span>Driver Partner</span>
                    <span className="text-[10px] bg-orange-600 text-white px-1.5 py-0.5 rounded font-black">App</span>
                  </button>
                )}
                <Link
                  href="/customer/dashboard"
                  className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-slate-300 text-slate-800 bg-slate-50 hover:bg-slate-100 transition font-bold text-[11px] sm:text-xs flex items-center gap-1.5 shadow-xs"
                >
                  <div className="w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full bg-orange-600 text-white text-[10px] flex items-center justify-center font-black">
                    {user?.fullName ? user.fullName[0].toUpperCase() : 'U'}
                  </div>
                  <span className="hidden xs:inline">My Bookings</span>
                </Link>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="hidden lg:inline-flex px-2 sm:px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-lg sm:rounded-xl transition"
                  title="Sign Out"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-slate-300 bg-slate-50 hover:border-orange-500 hover:bg-orange-50 text-slate-800 transition font-bold text-[11px] sm:text-xs flex items-center gap-1 sm:gap-1.5 shadow-xs"
              >
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                <span>Sign In</span>
              </button>
            )}

            {/* Hamburger Button for Mobile and Tablet (<lg) */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle Navigation Menu"
              className="lg:hidden p-1.5 sm:p-2 rounded-lg sm:rounded-xl border border-slate-300 bg-slate-50 text-slate-800 hover:text-orange-600 hover:bg-slate-100 transition focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-xs"
            >
              {mobileMenuOpen ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile & Tablet Dropdown Navigation Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden mx-3 sm:mx-6 rounded-2xl border border-slate-200 bg-white/98 backdrop-blur-2xl px-4 sm:px-6 py-5 shadow-2xl animate-in slide-in-from-top-2 duration-200 mb-3">
            <nav className="flex flex-col space-y-3 font-semibold text-slate-800 text-base">
              <Link
                href="/#booking-engine"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-4 py-3 bg-orange-600 text-white rounded-xl shadow-xs font-bold hover:bg-orange-700 transition"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Book Cab Online</span>
                </div>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-medium">Instant</span>
              </Link>

              <Link
                href="/#fleet"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-slate-100 text-slate-800 hover:text-orange-600 transition"
              >
                <span className="flex items-center gap-3">
                  <span className="text-lg">🚗</span> Fleet & Rates
                </span>
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>

              <Link
                href="/#why-kandy"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-slate-100 text-slate-800 hover:text-orange-600 transition"
              >
                <span className="flex items-center gap-3">
                  <span className="text-lg">⭐</span> Why Choose Us
                </span>
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>

              <Link
                href="/#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-slate-100 text-slate-800 hover:text-orange-600 transition"
              >
                <span className="flex items-center gap-3">
                  <span className="text-lg">📋</span> How It Works
                </span>
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>

              <div className="pt-2 border-t border-slate-200 flex flex-col gap-2">
                {user?.roles?.includes(UserRole.ADMIN) && (
                  <a
                    href="http://localhost:3001"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-white border border-slate-200 text-slate-900 rounded-xl hover:bg-slate-50 transition font-bold text-sm text-left shadow-xs"
                  >
                    <span>Admin Dashboard</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setDriverAppModalOpen(true);
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 bg-orange-50 border border-orange-200 text-orange-950 rounded-xl hover:bg-orange-100 transition font-bold text-sm text-left"
                >
                  <span>Download KandyCabs App</span>
                  <span className="text-[10px] bg-orange-600 text-white px-2 py-0.5 rounded font-black">Download</span>
                </button>

                <a
                  href="tel:+918045689000"
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100 font-bold text-sm transition"
                >
                  <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span>24/7 Support: +91 80456 89000</span>
                </a>

                {isAuthenticated && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-sm transition mt-1"
                  >
                    <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Sign Out</span>
                  </button>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>

      <div className="max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto w-full transition-all duration-300">
        {/* Booking Confirmation Screen */}
        {confirmedBooking ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center animate-fade-in">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
              ✓
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Booking Confirmed!</h2>
            <p className="text-sm text-slate-500 mb-6">
              Reference ID:{' '}
              <span className="font-mono font-bold text-slate-800">
                {confirmedBooking.humanReadableRef}
              </span>
            </p>

            <div className="bg-slate-50 rounded-xl p-6 text-left max-w-md mx-auto space-y-3 mb-8 border border-slate-200">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Trip Type:</span>
                <span className="font-semibold text-slate-800">{confirmedBooking.tripType}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Pickup:</span>
                <span className="font-semibold text-slate-800 truncate max-w-[200px]" title={confirmedBooking.pickupAddress}>
                  {confirmedBooking.pickupAddress}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Drop:</span>
                <span className="font-semibold text-slate-800 truncate max-w-[200px]" title={confirmedBooking.dropAddress}>
                  {confirmedBooking.dropAddress}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Pickup OTP:</span>
                <span className="font-mono font-bold text-amber-600 text-base">{confirmedBooking.pickupOtp}</span>
              </div>
              <div className="border-t border-slate-200 pt-3 flex justify-between text-sm">
                <span className="text-slate-500">Advance Paid:</span>
                <span className="font-bold text-emerald-600">₹{Number(confirmedBooking.advanceAmount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Balance Due on Trip:</span>
                <span className="font-bold text-slate-800">₹{Number(confirmedBooking.balanceAmount).toFixed(2)}</span>
              </div>
            </div>

            <Link
              href="/customer/dashboard"
              className="inline-flex items-center justify-center px-8 py-3.5 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition shadow-lg shadow-slate-900/20 text-sm gap-2"
            >
              <span>View Booking</span>
              <svg className="w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {/* STEP 1: ROUTE & SCHEDULE */}
            {step === 1 && (
              <div className="p-6 sm:p-8 space-y-6">
                <h2 className="text-lg font-bold text-slate-900">Step 1: Choose Your Route & Date</h2>

                {/* Trip Type Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Trip Type
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: TripType.ONEWAY, label: 'One Way' },
                      { id: TripType.ROUND, label: 'Round Trip' },
                      { id: TripType.AIRPORT, label: 'Airport' },
                      { id: TripType.LOCAL, label: 'Local Hourly' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setTripType(t.id);
                          if (t.id !== TripType.ROUND) {
                            setStops([]);
                          }
                        }}
                        className={`py-2.5 px-3 rounded-lg text-sm font-medium border transition ${
                          tripType === t.id
                            ? 'bg-amber-500 text-white border-amber-500 shadow-sm font-bold'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Locations */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Pickup Location Trigger */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Pickup Location
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setLocationModalTarget('PICKUP');
                          setLocationModalOpen(true);
                        }}
                        className="text-[11px] font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 transition"
                      >
                        <span>⚡ Live GPS</span>
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setLocationModalTarget('PICKUP');
                        setLocationModalOpen(true);
                      }}
                      className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-800 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left transition focus:ring-2 focus:ring-amber-500 shadow-2xs group"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-base flex-shrink-0">🟢</span>
                        <span className="truncate font-semibold text-slate-900 group-hover:text-amber-600">
                          {pickupAddress}
                        </span>
                      </div>
                      <span className="text-slate-400 text-xs font-bold pl-2 flex-shrink-0">▾</span>
                    </button>
                  </div>

                  {/* Drop Destination Trigger */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Drop Location
                      </label>
                      {tripType === TripType.ROUND && (
                        <button
                          type="button"
                          onClick={handleAddStop}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:text-slate-950 bg-amber-100 hover:bg-amber-300 border border-amber-300 px-2 py-0.5 rounded-md transition"
                        >
                          <span className="text-xs font-black leading-none">+</span>
                          <span>Add Stop</span>
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setLocationModalTarget('DROP');
                        setLocationModalOpen(true);
                      }}
                      className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-800 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left transition focus:ring-2 focus:ring-amber-500 shadow-2xs group"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-base flex-shrink-0">🔴</span>
                        <span className="truncate font-semibold text-slate-900 group-hover:text-amber-600">
                          {dropAddress}
                        </span>
                      </div>
                      <span className="text-slate-400 text-xs font-bold pl-2 flex-shrink-0">▾</span>
                    </button>
                  </div>
                </div>

                {/* Multiple Intermediate Stops List (ONLY for Round Trip) */}
                {tripType === TripType.ROUND && stops.length > 0 && (
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold text-amber-900">
                      <span>Intermediate Route Stops ({stops.length})</span>
                      <span className="text-[11px] font-normal text-slate-500">
                        Chauffeur visits each stop before final return
                      </span>
                    </div>

                    <div className="space-y-2">
                      {stops.map((stop, index) => (
                        <div
                          key={stop.id}
                          className="p-2 bg-white border border-amber-200 rounded-lg flex items-center gap-2"
                        >
                          <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                            {index + 1}
                          </span>
                          <span className="text-xs font-medium text-slate-700 whitespace-nowrap">
                            Stop {index + 1}:
                          </span>
                          <div className="flex-1">
                            <button
                              type="button"
                              onClick={() => {
                                setLocationModalTarget(stop.id);
                                setLocationModalOpen(true);
                              }}
                              className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded px-2 py-1 text-xs font-medium text-slate-800 flex items-center justify-between text-left transition"
                            >
                              <span className="truncate">{stop.address}</span>
                              <span className="text-slate-400 text-[10px] font-bold pl-1">▾</span>
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveStop(stop.id)}
                            className="text-red-500 hover:text-red-700 p-1 rounded transition"
                            title="Remove Stop"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Schedule Picker */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Pickup Date
                    </label>
                    <input
                      type="date"
                      value={scheduledDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Pickup Time
                    </label>
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  {tripType === TripType.ROUND ? (
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Trip Duration (Days)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={durationDays}
                        onChange={(e) => setDurationDays(Number(e.target.value))}
                        className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  ) : tripType === TripType.LOCAL ? (
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Package Hours
                      </label>
                      <select
                        value={packageHours}
                        onChange={(e) => setPackageHours(Number(e.target.value))}
                        className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      >
                        <option value={4}>4 Hours / 40 KM</option>
                        <option value={8}>8 Hours / 80 KM</option>
                      </select>
                    </div>
                  ) : null}
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-6 py-2.5 rounded-xl bg-amber-500 text-white font-medium hover:bg-amber-600 transition"
                  >
                    Next: Choose Cab →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: VEHICLE CATEGORIES & LIVE QUOTE */}
            {step === 2 && (
              <div className="p-2 sm:p-3 lg:p-3.5 space-y-1.5 sm:space-y-2 flex-1 flex flex-col justify-between">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-base font-bold text-slate-900">Step 2: Select Vehicle Category</h2>
                    {isQuoting && (
                      <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs text-amber-700 bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 rounded-full font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                        Calculating best rates...
                      </span>
                    )}
                  </div>
                  {quotesData && (
                    <span className="text-[10px] sm:text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full font-medium whitespace-nowrap">
                      Est. {quotesData.distanceKm} km (~{quotesData.estimatedDurationMins} mins)
                    </span>
                  )}
                </div>

                {/* Slidable Vehicle Category Carousel Cards */}
                {!quotesData ? (
                  <div className="relative group my-auto">
                    <div className="flex gap-2 sm:gap-3 lg:gap-3.5 overflow-x-auto pb-1.5 sm:pb-2 pt-0.5 px-3 sm:px-2 snap-x snap-mandatory">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="min-w-[245px] sm:min-w-[265px] lg:min-w-[280px] max-w-[280px] rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4 flex flex-col justify-between shadow-xs animate-pulse space-y-3 shrink-0"
                        >
                          <div className="flex items-center justify-between">
                            <div className="h-4 w-24 bg-slate-200 rounded-md" />
                            <div className="h-4 w-16 bg-amber-100 rounded-full" />
                          </div>
                          <div className="h-28 sm:h-32 bg-slate-100 rounded-xl flex items-center justify-center">
                            <div className="w-12 h-6 bg-slate-200 rounded-lg" />
                          </div>
                          <div className="space-y-2">
                            <div className="h-3.5 w-3/4 bg-slate-200 rounded" />
                            <div className="h-3 w-1/2 bg-slate-100 rounded" />
                          </div>
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                            <div className="h-6 w-20 bg-slate-200 rounded-md" />
                            <div className="h-8 w-24 bg-amber-200 rounded-xl" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="relative group my-auto">
                    {/* Left Navigation Button */}
                    <button
                      type="button"
                      onClick={() => {
                        const track = document.getElementById('vehicle-carousel-track');
                        if (track) {
                          const scrollDistance = track.clientWidth >= 640 ? track.clientWidth * 0.5 : 300;
                          track.scrollBy({ left: -scrollDistance, behavior: 'smooth' });
                        }
                      }}
                      className="absolute left-1 sm:-left-3.5 top-16 sm:top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/95 backdrop-blur-md shadow-lg border border-slate-200 text-slate-700 hover:text-amber-600 hover:border-amber-400 hover:bg-white hover:scale-110 active:scale-95 transition-all flex items-center justify-center focus:outline-none"
                      title="Previous Vehicle"
                      aria-label="Previous Vehicle"
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700 hover:text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>

                    {/* Right Navigation Button */}
                    <button
                      type="button"
                      onClick={() => {
                        const track = document.getElementById('vehicle-carousel-track');
                        if (track) {
                          const scrollDistance = track.clientWidth >= 640 ? track.clientWidth * 0.5 : 300;
                          track.scrollBy({ left: scrollDistance, behavior: 'smooth' });
                        }
                      }}
                      className="absolute right-1 sm:-right-3.5 top-16 sm:top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/95 backdrop-blur-md shadow-lg border border-slate-200 text-slate-700 hover:text-amber-600 hover:border-amber-400 hover:bg-white hover:scale-110 active:scale-95 transition-all flex items-center justify-center focus:outline-none"
                      title="Next Vehicle"
                      aria-label="Next Vehicle"
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700 hover:text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>

                    {/* Horizontal Scrollable Track */}
                    <div
                      id="vehicle-carousel-track"
                      className="flex gap-2 sm:gap-3 lg:gap-3.5 overflow-x-auto pb-1.5 sm:pb-2 pt-0.5 px-3 sm:px-2 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-amber-300 scrollbar-track-slate-100"
                    >
                      {quotesData?.quotes.map((q) => {
                        const isCatSelected = selectedCategory === q.category;
                        const meta = VEHICLE_META[q.category] || {
                          image: '/images/fleet-sedan.png',
                          tagline: q.description,
                          badge: 'AVAILABLE',
                        };

                        // Display pricing for selected fuel or category default
                        const activeFuelOption = isCatSelected
                          ? q.fuelOptions?.find((fo) => fo.fuelType === selectedFuelType) || q.fuelOptions?.[0]
                          : q.fuelOptions?.[0];

                        const cardFare = isCatSelected && activePricing ? activePricing.totalFare : (activeFuelOption?.pricing.totalFare ?? q.pricing.totalFare);
                        const cardAdvance = isCatSelected && activePricing ? activePricing.advanceAmount : (activeFuelOption?.pricing.advanceAmount ?? q.pricing.advanceAmount);

                        return (
                          <div
                            key={q.category}
                            onClick={() => handleSelectCategory(q.category)}
                            className={`snap-start shrink-0 w-[84vw] sm:w-[calc(50%-8px)] lg:w-[calc(33.333%-10px)] xl:w-[360px] cursor-pointer rounded-2xl sm:rounded-[24px] border-[2px] sm:border-[2.5px] transition-all duration-300 relative flex flex-col justify-between overflow-hidden bg-white ${
                              isCatSelected
                                ? 'border-amber-500 ring-2 ring-amber-400/60 shadow-[0_6px_20px_rgba(245,158,11,0.2)] bg-gradient-to-b from-amber-50/50 via-white to-white'
                                : 'border-slate-200/90 hover:border-amber-300 hover:shadow-md opacity-95 hover:opacity-100 shadow-2xs'
                            }`}
                          >
                            {/* Card Top Header with Vehicle Illustration & Badge */}
                            <div className="p-2.5 sm:p-3 pb-0.5 sm:pb-1">
                              <div className="flex justify-between items-center gap-2 mb-1">
                                <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 sm:px-2.5 py-0.5 rounded-full transition ${
                                  isCatSelected ? 'bg-amber-500 text-slate-950 shadow-xs' : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {meta.badge}
                                </span>
                                {isCatSelected ? (
                                  <span className="text-[9px] sm:text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-300/80 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    <span>Selected</span>
                                  </span>
                                ) : (
                                  <span className="text-[9px] text-slate-400 font-medium">Click to select</span>
                                )}
                              </div>

                              {/* Vehicle Image with Pedestal Soft Gradient */}
                              <div className="relative w-full h-18 sm:h-20 lg:h-24 my-0.5 flex items-center justify-center">
                                <div className="absolute inset-x-6 bottom-0 h-2.5 bg-slate-200/40 rounded-full blur-xs -z-0"></div>
                                <Image
                                  src={meta.image}
                                  alt={q.name}
                                  width={220}
                                  height={100}
                                  className="w-full h-full object-contain filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.1)] transition-transform duration-300 hover:scale-105 select-none relative z-10"
                                />
                              </div>

                              {/* Vehicle Name & Models */}
                              <div className="mt-0.5">
                                <h3 className="font-extrabold text-slate-900 text-sm sm:text-base tracking-tight">
                                  {q.name}
                                </h3>
                                <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate">
                                  {meta.tagline}
                                </p>
                              </div>
                            </div>

                            {/* Price Section */}
                            <div className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-slate-50/80 border-y border-slate-100 flex items-center justify-between">
                              <div>
                                <div className="text-[8px] sm:text-[9px] uppercase font-semibold text-slate-500 tracking-wider">Total Calculated Fare</div>
                                <div className="text-base sm:text-lg lg:text-xl font-black text-slate-950 tracking-tight">
                                  ₹{cardFare.toLocaleString('en-IN')}
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="text-[8px] sm:text-[9px] text-amber-900 font-bold bg-amber-100/90 border border-amber-200/90 px-1.5 sm:px-2 py-0.5 rounded-md inline-block shadow-2xs">
                                  Advance (25%): ₹{cardAdvance.toLocaleString('en-IN')}
                                </span>
                              </div>
                            </div>

                            {/* Specs & Fuel Selector */}
                            <div className="p-2.5 sm:p-3 pt-1 sm:pt-1.5 space-y-1 sm:space-y-1.5">
                              {/* Capacity Specs */}
                              <div className="flex items-center gap-2 text-[9px] sm:text-[10px] font-semibold text-slate-700">
                                <span className="flex items-center gap-1 bg-slate-100/80 px-2 py-0.5 rounded-md shadow-2xs">
                                  👥 {q.seats} Seats
                                </span>
                                <span className="flex items-center gap-1 bg-slate-100/80 px-2 py-0.5 rounded-md shadow-2xs">
                                  🧳 {q.luggage} Bags
                                </span>
                              </div>

                              {/* Fuel Options Selection */}
                              {q.fuelOptions && q.fuelOptions.length > 0 && (
                                <div className="space-y-0.5 pt-0.5">
                                  <div className="text-[8px] sm:text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                                    <span>FUEL OPTIONS:</span>
                                    {isCatSelected ? (
                                      <span className="text-amber-700 font-black text-[8px] sm:text-[9px] uppercase tracking-wide">
                                        {selectedFuelType} Selected
                                      </span>
                                    ) : (
                                      <span className="text-indigo-600 font-semibold text-[8px] flex items-center gap-0.5">
                                        <span>ⓘ</span> Confirm Booking
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex flex-col gap-0.5 sm:gap-1">
                                    {q.fuelOptions.map((fo) => {
                                      const isFuelActive = isCatSelected && selectedFuelType === fo.fuelType;
                                      let badgeStyle = 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200/90 shadow-2xs';
                                      if (isFuelActive) {
                                        if (fo.fuelType === FuelType.CNG) badgeStyle = 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-sm font-black';
                                        else if (fo.fuelType === FuelType.PETROL) badgeStyle = 'bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-500 shadow-sm font-black';
                                        else badgeStyle = 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-sm font-black';
                                      }

                                      return (
                                        <button
                                          key={fo.fuelType}
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleSelectCategoryAndFuel(q.category, fo.fuelType);
                                          }}
                                          className={`w-full px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg text-[9px] sm:text-[11px] border transition-all flex items-center justify-between ${badgeStyle}`}
                                        >
                                          <span className="flex items-center gap-1 font-bold">
                                            {fo.fuelType === FuelType.CNG ? '🟢 CNG' : fo.fuelType === FuelType.PETROL ? '🟡 Petrol' : '🔵 Diesel'}
                                          </span>
                                          <span className="text-[9px] sm:text-[10px] font-mono">
                                            ₹{fo.ratePerKm}/km • ₹{fo.pricing.totalFare.toLocaleString('en-IN')}
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Pagination Dots & Indicator */}
                    <div className="flex items-center justify-center gap-2.5 pt-0.5">
                      <div className="flex items-center gap-1">
                        {quotesData?.quotes.map((q) => (
                          <button
                            key={q.category}
                            type="button"
                            onClick={() => handleSelectCategory(q.category)}
                            className={`h-1.5 rounded-full transition-all ${
                              selectedCategory === q.category
                                ? 'w-4 sm:w-5 bg-amber-500'
                                : 'w-1.5 bg-slate-300 hover:bg-slate-400'
                            }`}
                            aria-label={`Select ${q.name}`}
                          />
                        ))}
                      </div>

                      <span className="text-[9px] sm:text-[10px] font-semibold text-slate-500">
                        {quotesData?.quotes.findIndex((q) => q.category === selectedCategory)! + 1} of {quotesData?.quotes.length} Vehicles
                      </span>
                    </div>
                  </div>
                )}

                {/* Live Fare Breakdown */}
                {activePricing && (
                  <div className="bg-slate-50/90 rounded-lg p-1.5 sm:p-2 border border-slate-200/90 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-700">
                        Authoritative Price Breakdown
                      </h4>
                      <span className="text-[8px] sm:text-[9px] text-slate-400 font-medium">All inclusive</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 text-[9px] sm:text-[11px]">
                      <div>
                        <span className="text-slate-500 block text-[8px] sm:text-[9px]">Base Fare:</span>
                        <span className="font-semibold text-slate-800">₹{activePricing.baseFare}</span>
                      </div>
                      {activePricing.driverAllowance > 0 && (
                        <div>
                          <span className="text-slate-500 block text-[8px] sm:text-[9px]">Driver Allowance:</span>
                          <span className="font-semibold text-slate-800">₹{activePricing.driverAllowance}</span>
                        </div>
                      )}
                      {activePricing.nightCharge > 0 && (
                        <div>
                          <span className="text-slate-500 block text-[8px] sm:text-[9px]">Night Charge:</span>
                          <span className="font-semibold text-amber-700">₹{activePricing.nightCharge}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-slate-500 block text-[8px] sm:text-[9px]">GST (5%):</span>
                        <span className="font-semibold text-slate-800">₹{activePricing.gstAmount}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-3 py-1 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="px-4 sm:px-6 py-1.5 sm:py-2 rounded-xl bg-amber-500 text-slate-950 text-xs sm:text-sm font-bold hover:bg-amber-600 transition shadow-sm hover:shadow-md active:scale-98"
                  >
                    Next: Contact Details →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: AUTHENTICATION / CONTACT */}
            {step === 3 && (
              <div className="p-6 sm:p-8 space-y-6 max-w-md mx-auto">
                <div className="text-center space-y-1">
                  <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl mx-auto flex items-center justify-center mb-2 shadow-sm">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Step 3: Passenger & Contact Details
                  </h2>
                  <p className="text-xs text-slate-500">
                    {isAuthenticated && user
                      ? 'Confirm passenger information for dispatch & booking updates'
                      : 'Enter your details to receive driver tracking & ride updates'}
                  </p>
                </div>

                {authError && (
                  <div className="rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs text-red-700 font-medium leading-relaxed">
                    ⚠️ {authError}
                  </div>
                )}

                {isAuthenticated && user ? (
                  <div className="space-y-4">
                    {user?.roles?.includes(UserRole.DRIVER) && (
                      <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg">🚕</span>
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 bg-amber-200/80 px-1.5 py-0.5 rounded">
                              Driver Partner
                            </span>
                            <p className="text-xs font-bold text-slate-900 mt-0.5">
                              Booking ride as Customer ({user.fullName})
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDriverAppModalOpen(true)}
                          className="text-[11px] font-bold text-amber-900 bg-amber-200/90 hover:bg-amber-300 px-2.5 py-1 rounded-lg transition"
                        >
                          Driver App ↗
                        </button>
                      </div>
                    )}

                    <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white font-black flex items-center justify-center flex-shrink-0 text-sm shadow-sm">
                        ✓
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                          Verified Passenger Account
                        </span>
                        <p className="text-sm font-bold text-slate-900 truncate">
                          {fullName || user.fullName || 'Passenger'}
                        </p>
                        <p className="text-xs font-semibold text-slate-600">
                          +91 {phone || user.phone?.replace(/^\+91/, '')}
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Passenger Name for Pickup Chauffeur
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Rachel Sharma"
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 font-medium focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:outline-none transition"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => setStep(4)}
                      className="w-full py-3 rounded-xl bg-amber-500 text-slate-950 font-bold hover:bg-amber-600 transition shadow-md shadow-amber-500/20 flex items-center justify-center gap-2"
                    >
                      <span>Proceed to Review & Pay →</span>
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        await logout();
                        setOtpSent(false);
                        setOtp('');
                        setPhone('');
                        setFullName('');
                      }}
                      className="w-full text-xs font-semibold text-slate-500 hover:text-red-600 transition text-center pt-1 block"
                    >
                      Switch / Change Phone Number
                    </button>
                  </div>
                ) : !otpSent ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendOtp();
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        10-Digit Mobile Number
                      </label>
                      <div className="flex">
                        <span className="inline-flex items-center px-3.5 rounded-l-xl border border-r-0 border-slate-300 bg-slate-100 text-slate-700 text-sm font-bold">
                          +91
                        </span>
                        <input
                          type="tel"
                          maxLength={10}
                          autoFocus
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                          placeholder="9876543210"
                          required
                          className="w-full rounded-r-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 font-bold focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:outline-none transition tracking-wider"
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">We will send a 4-digit OTP to verify your booking</p>
                    </div>
                    <button
                      type="submit"
                      disabled={isAuthLoading || phone.length !== 10}
                      className="w-full py-3 rounded-xl bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition shadow-md shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isAuthLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                          <span>Sending Code...</span>
                        </>
                      ) : (
                        <span>Send Verification Code →</span>
                      )}
                    </button>
                  </form>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleVerifyOtp();
                    }}
                    className="space-y-4"
                  >
                    {isRegistered ? (
                      existingRoles.includes('DRIVER') ? (
                        <div className="p-2.5 sm:p-3.5 bg-amber-50 border border-amber-300 rounded-xl sm:rounded-2xl space-y-1.5 sm:space-y-2">
                          <div className="flex items-center gap-2 sm:gap-2.5">
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xs sm:text-sm shadow-xs flex-shrink-0">
                              🚕
                            </div>
                            <div>
                              <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-amber-900 bg-amber-200/80 px-1.5 sm:px-2 py-0.5 rounded inline-block">
                                Registered Driver Partner
                              </div>
                              <div className="text-xs sm:text-sm font-extrabold text-slate-900 mt-0.5">
                                Welcome back, {existingName || 'Driver Partner'}!
                              </div>
                            </div>
                          </div>
                          <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
                            You are booking this ride as a customer. To accept dispatch rides & go on duty, please use the <strong>Kandy Driver App</strong>.
                          </p>
                          <div className="pt-0.5 flex flex-wrap items-center gap-1.5 sm:gap-2">
                            <button
                              type="button"
                              onClick={() => setDriverAppModalOpen(true)}
                              className="text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg transition shadow-xs flex items-center gap-1"
                            >
                              <span>📲 Get Driver App</span>
                            </button>
                            <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium">or continue booking below</span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-2.5 sm:p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 sm:gap-3">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                            ✓
                          </div>
                          <div>
                            <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                              {existingRoles.includes('ADMIN')
                                ? 'Kandy Administrator'
                                : 'Registered Customer'}
                            </div>
                            <div className="text-xs sm:text-sm font-extrabold text-slate-900">
                              Welcome back, {existingName || 'Customer'}!
                            </div>
                          </div>
                        </div>
                      )
                    ) : (
                      <div className="space-y-2 sm:space-y-3">
                        <div className="p-2.5 sm:p-3 bg-amber-50 border border-amber-200 rounded-xl">
                          <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-amber-800">
                            New Customer Registration
                          </div>
                          <p className="text-[11px] sm:text-xs text-amber-700 mt-0.5">
                            Please enter your passenger name for dispatch & trip invoices.
                          </p>
                        </div>

                        <div>
                          <label className="block text-[11px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 sm:mb-1.5">
                            Passenger Full Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="e.g. Rachel Sharma"
                            className="w-full rounded-xl border border-slate-300 px-3 sm:px-3.5 py-2 sm:py-2.5 text-sm text-slate-800 font-medium focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:outline-none transition"
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="flex justify-between items-center mb-1 sm:mb-1.5 gap-1">
                        <label className="block text-[10px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider shrink-0">
                          4-Digit OTP Code
                        </label>
                        <button
                          type="button"
                          onClick={() => setOtpSent(false)}
                          className="text-[10px] sm:text-xs font-semibold text-amber-600 hover:text-amber-800 underline transition truncate"
                        >
                          Change (+91 {phone})
                        </button>
                      </div>
                      <input
                        type="text"
                        maxLength={4}
                        autoFocus={isRegistered}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••"
                        className="w-full text-center text-2xl sm:text-3xl tracking-[0.4em] sm:tracking-[0.5em] font-mono font-black rounded-xl border border-slate-300 py-2 sm:py-3 text-slate-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:outline-none transition bg-slate-50"
                      />
                      {debugOtp && (
                        <div className="mt-1.5 sm:mt-2 text-center">
                          <span className="inline-flex items-center gap-1.5 bg-amber-100 border border-amber-300 text-amber-900 text-[11px] sm:text-xs font-bold px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full">
                            <span>⚡ Dev Code: {debugOtp}</span>
                            <span className="text-[9px] sm:text-[10px] font-normal text-amber-700">(Auto-filled)</span>
                          </span>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isAuthLoading || otp.length < 4 || (!isRegistered && !fullName.trim())}
                      className="w-full py-2.5 sm:py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm sm:text-base hover:bg-emerald-700 transition shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isAuthLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <span>Verify & Proceed to Payment →</span>
                      )}
                    </button>

                    <div className="flex items-center justify-between pt-2 text-xs">
                      <span className="text-slate-500">Didn't receive the SMS?</span>
                      {resendTimer > 0 ? (
                        <span className="font-semibold text-slate-400">
                          Resend in <span className="text-amber-600 font-mono">{resendTimer}s</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={isAuthLoading}
                          onClick={handleSendOtp}
                          className="font-bold text-amber-600 hover:text-amber-800 transition"
                        >
                          Resend OTP
                        </button>
                      )}
                    </div>
                  </form>
                )}

                <div className="pt-4 border-t border-slate-100 flex justify-start">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="text-xs text-slate-500 hover:text-slate-800 transition flex items-center gap-1 font-medium"
                  >
                    ← Back to Vehicle Selection
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: REVIEW & PAY ADVANCE */}
            {step === 4 && activePricing && (
              <div className="p-4 sm:p-8 space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    Step 4: Review Ride & Pay Advance
                  </h2>
                  <span className="text-[10px] sm:text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Authoritative Quote</span>
                  </span>
                </div>

                {errorMessage && (
                  <div className="rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs text-red-700 font-medium leading-relaxed">
                    ⚠️ {errorMessage}
                  </div>
                )}

                {/* Ride Summary Card */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  {/* Vehicle Banner */}
                  <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 via-slate-50/80 to-amber-50/30 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-12 sm:w-20 sm:h-14 flex items-center justify-center flex-shrink-0">
                        <Image
                          src={VEHICLE_META[selectedCategory]?.image || '/images/fleet-sedan.webp'}
                          alt={selectedCategory}
                          width={80}
                          height={56}
                          className="w-full h-full object-contain filter drop-shadow-sm select-none"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                          Selected Vehicle
                        </span>
                        <h4 className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight">
                          {quotesData?.quotes.find((q) => q.category === selectedCategory)?.name || selectedCategory}
                        </h4>
                        <span className="text-[11px] font-semibold text-slate-600">
                          {selectedFuelType} Fuel Option
                        </span>
                      </div>
                    </div>
                    <span className="text-xs bg-emerald-100/90 text-emerald-800 font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-2xs">
                      {tripType === TripType.ONEWAY ? 'One Way' : tripType === TripType.ROUND ? 'Round Trip' : tripType}
                    </span>
                  </div>

                  <div className="p-4 sm:p-5 space-y-3.5">
                    {/* Passenger Row */}
                    <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                      <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center flex-shrink-0 text-sm font-bold shadow-xs">
                        👤
                      </div>
                      <div className="flex-1 flex flex-wrap items-center justify-between gap-1">
                        <div className="text-xs sm:text-sm font-bold text-slate-900">
                          {fullName || user?.fullName || 'Passenger'}
                        </div>
                        <div className="text-xs text-slate-600 font-mono flex items-center gap-1">
                          <span>(+91 {phone || user?.phone?.replace(/^\+91/, '') || '9854632158'})</span>
                          <span className="text-slate-400">📞</span>
                        </div>
                      </div>
                    </div>

                    {/* Route Locations */}
                    <div className="space-y-2 text-xs sm:text-sm text-slate-800">
                      <div className="flex items-start gap-2.5">
                        <span className="text-base leading-none flex-shrink-0">🟢</span>
                        <div>
                          <span className="font-bold text-slate-900">Pickup:</span>{' '}
                          <span className="text-slate-700">{pickupAddress}</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <span className="text-base leading-none flex-shrink-0">🔴</span>
                        <div>
                          <span className="font-bold text-slate-900">Drop:</span>{' '}
                          <span className="text-slate-700">{dropAddress}</span>
                        </div>
                      </div>

                      {tripType === TripType.ROUND && stops.length > 0 && (
                        <div className="flex items-start gap-2.5 pl-6 text-xs text-slate-600">
                          <span className="font-semibold text-amber-800">Via Stops:</span>{' '}
                          <span>{stops.map((s) => s.address).join(' → ')}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2.5 pt-1 text-slate-700">
                        <span className="text-base leading-none flex-shrink-0">📅</span>
                        <div>
                          <span className="font-bold text-slate-900">Pickup Time:</span>{' '}
                          <span className="font-medium text-slate-700">{scheduledDate} at {scheduledTime}</span>
                        </div>
                      </div>
                    </div>

                    {/* Fare Breakdown Section */}
                    <div className="pt-3.5 border-t border-slate-200 space-y-2.5">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Fare Breakdown
                      </div>

                      <div className="flex justify-between items-center text-xs sm:text-sm text-slate-700">
                        <span>Total Authoritative Fare (incl. GST):</span>
                        <span className="font-bold text-slate-900 font-mono text-sm sm:text-base">
                          ₹{activePricing.totalFare.toLocaleString('en-IN')}
                        </span>
                      </div>

                      {/* Online Advance (25%) Pill Highlight */}
                      <div className="p-3 bg-emerald-100/80 border border-emerald-300/80 rounded-xl flex items-center justify-between shadow-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-emerald-950 font-black text-sm sm:text-base">
                            Online Advance (25%):
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 font-mono font-black text-emerald-950 text-base sm:text-lg">
                          <span>₹{activePricing.advanceAmount.toLocaleString('en-IN')}</span>
                          <span className="text-emerald-700 text-sm" title="Secure Payment">🛡️</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-xs text-slate-500 pt-0.5">
                        <span>Balance Due on Trip (75%):</span>
                        <span className="font-semibold font-mono text-slate-700 text-xs sm:text-sm">
                          ₹{activePricing.balanceAmount.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 transition flex items-center gap-1"
                  >
                    ← Back to Contact
                  </button>

                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleConfirmAndPay}
                    className="px-5 sm:px-7 py-3 sm:py-3.5 rounded-2xl bg-emerald-600 text-white font-black hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/30 hover:shadow-emerald-600/40 active:scale-98 disabled:opacity-50 flex items-center gap-2.5 text-xs sm:text-sm group relative"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    <span>
                      {isSubmitting
                        ? 'Processing Payment...'
                        : `Pay Advance ₹${activePricing.advanceAmount.toLocaleString('en-IN')} & Book`}
                    </span>
                    <svg className="w-3.5 h-3.5 text-emerald-200 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Driver App Download / Information Modal */}
      <DriverAppModal
        isOpen={driverAppModalOpen}
        onClose={() => setDriverAppModalOpen(false)}
        driverName={user?.fullName || existingName}
      />

      {/* Interactive OpenStreetMap Location Picker Modal */}
      <LocationPickerModal
        isOpen={locationModalOpen}
        onClose={() => setLocationModalOpen(false)}
        title={
          locationModalTarget === 'PICKUP'
            ? 'Select Pickup Location'
            : locationModalTarget === 'DROP'
            ? 'Select Drop Destination'
            : 'Select Intermediate Stop'
        }
        targetType={
          locationModalTarget === 'PICKUP'
            ? 'PICKUP'
            : locationModalTarget === 'DROP'
            ? 'DROP'
            : 'STOP'
        }
        selectedAddress={
          locationModalTarget === 'PICKUP'
            ? pickupAddress
            : locationModalTarget === 'DROP'
            ? dropAddress
            : stops.find((s) => s.id === locationModalTarget)?.address || ''
        }
        onSelectLocation={handleSelectLocation}
      />
    </div>
  );
}
