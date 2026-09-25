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

  const carouselTrackRef = useRef<HTMLDivElement>(null);
  const isScrollingProgrammatically = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Update active pricing when user clicks or scrolls to a category
  const handleSelectCategory = useCallback((cat: VehicleCategory) => {
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
  }, [quotesData, selectedFuelType]);

  const handleSelectCategoryAndFuel = useCallback((cat: VehicleCategory, fuel: FuelType) => {
    setSelectedCategory(cat);
    setSelectedFuelType(fuel);
    const matchCat = quotesData?.quotes.find((q) => q.category === cat);
    if (matchCat) {
      const matchFuel = matchCat.fuelOptions?.find((fo) => fo.fuelType === fuel);
      if (matchFuel) {
        setActivePricing(matchFuel.pricing);
      }
    }
  }, [quotesData]);

  // Smoothly scroll to a specific vehicle card by index
  const scrollToVehicleIndex = (index: number, select = true) => {
    if (!quotesData?.quotes?.length) return;
    const targetIndex = Math.max(0, Math.min(index, quotesData.quotes.length - 1));
    const track = carouselTrackRef.current;
    if (!track) return;

    const cards = Array.from(track.children) as HTMLElement[];
    const targetCard = cards[targetIndex];

    isScrollingProgrammatically.current = true;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingProgrammatically.current = false;
    }, 600);

    if (targetCard) {
      const cardLeft = targetCard.offsetLeft;
      const cardWidth = targetCard.offsetWidth;
      const trackWidth = track.clientWidth;
      const scrollPos = cardLeft - (trackWidth - cardWidth) / 2;
      track.scrollTo({ left: Math.max(0, scrollPos), behavior: 'smooth' });
    }

    if (select) {
      handleSelectCategory(quotesData.quotes[targetIndex].category);
    }
  };

  // Auto-detect and select the vehicle in view while scrolling/swiping
  const handleCarouselScroll = () => {
    if (isScrollingProgrammatically.current) return;
    if (scrollDebounceRef.current) clearTimeout(scrollDebounceRef.current);
    scrollDebounceRef.current = setTimeout(() => {
      const track = carouselTrackRef.current;
      if (!track || !quotesData?.quotes?.length) return;

      const cards = Array.from(track.children) as HTMLElement[];
      if (!cards.length) return;

      const trackRect = track.getBoundingClientRect();
      const trackCenter = trackRect.left + trackRect.width / 2;

      let closestIndex = 0;
      let minDiff = Infinity;

      cards.forEach((card, idx) => {
        const cardRect = card.getBoundingClientRect();
        const cardCenter = cardRect.left + cardRect.width / 2;
        const diff = Math.abs(cardCenter - trackCenter);
        if (diff < minDiff) {
          minDiff = diff;
          closestIndex = idx;
        }
      });

      const targetQuote = quotesData.quotes[closestIndex];
      if (targetQuote && targetQuote.category !== selectedCategory) {
        handleSelectCategory(targetQuote.category);
      }
    }, 50);
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
    <div className="min-h-[100dvh] h-[100dvh] max-h-[100dvh] lg:min-h-screen lg:h-screen lg:max-h-screen bg-slate-50 text-slate-900 flex flex-col justify-start gap-1 sm:gap-2 font-sans p-1.5 sm:p-3 pb-2 sm:pb-3 lg:pt-16 lg:pb-2.5 lg:px-8 overflow-hidden">
      {/* Top Navigation Bar - Desktop Fixed Header (Hidden on Mobile while booking) */}
      <header className="hidden lg:block fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs transition-all duration-300">
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
          </div>
        </div>
      </header>

      {/* Mobile-Only Minimal Compact Top Bar (Header removed while booking) */}
      <div className="lg:hidden flex items-center justify-between px-1.5 py-1 shrink-0">
        <button
          type="button"
          onClick={() => {
            if (step > 1) {
              setStep((s) => (s - 1) as 1 | 2 | 3 | 4);
            } else {
              window.location.href = '/';
            }
          }}
          aria-label="Back"
          className="w-9 h-9 rounded-full bg-white border border-slate-200 text-slate-700 flex items-center justify-center hover:bg-slate-100 transition active:scale-95 shadow-xs"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <Link href="/" className="flex items-center py-0.5">
          <Image
            src="/images/logo.webp"
            alt="Kandy Cabs"
            width={120}
            height={36}
            priority
            className="h-7 w-auto object-contain"
          />
        </Link>

        {isAuthenticated ? (
          <Link
            href="/customer/dashboard"
            className="w-8 h-8 rounded-full bg-orange-600 text-white text-xs flex items-center justify-center font-black shadow-xs"
            title="My Dashboard"
          >
            {user?.fullName ? user.fullName[0].toUpperCase() : 'U'}
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setStep(3)}
            className="text-[11px] font-bold text-orange-600 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-full"
          >
            Sign In
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto w-full transition-all duration-300 flex flex-col">
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
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200/90 overflow-hidden h-full flex flex-col justify-between">
            {/* STEP 1: ROUTE & SCHEDULE */}
            {step === 1 && (
              <div className="h-full flex flex-col justify-between p-4 sm:p-6 lg:p-8 space-y-3 sm:space-y-4 overflow-y-auto">
                <div className="space-y-3 sm:space-y-4">
                  {/* Step Heading */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
                        Choose Your Route &amp; Date
                      </h2>
                      <p className="text-xs text-slate-500 font-medium">
                        Select your trip type, locations, and travel date
                      </p>
                    </div>
                  </div>

                  {/* Trip Type Dropdown */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Trip Type
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-base">
                        {tripType === TripType.ONEWAY
                          ? '🚖'
                          : tripType === TripType.ROUND
                          ? '🔄'
                          : tripType === TripType.AIRPORT
                          ? '✈️'
                          : '⏱️'}
                      </div>
                      <select
                        value={tripType}
                        onChange={(e) => {
                          const newType = e.target.value as TripType;
                          setTripType(newType);
                          if (newType !== TripType.ROUND) {
                            setStops([]);
                          }
                        }}
                        className="w-full pl-11 pr-10 py-3 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-300 rounded-2xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-[#F05323] focus:border-[#F05323] focus:outline-none transition appearance-none cursor-pointer shadow-2xs"
                      >
                        <option value={TripType.ONEWAY}>One Way Outstation Drop</option>
                        <option value={TripType.ROUND}>Round Trip (Multi-Day / Same Day)</option>
                        <option value={TripType.AIRPORT}>Airport Transfer (Pickup / Drop)</option>
                        <option value={TripType.LOCAL}>Local Hourly Rental (City Tour)</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500 text-xs font-bold">
                        ▼
                      </div>
                    </div>
                  </div>

                  {/* Locations */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4">
                    {/* Pickup Location Trigger */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Pickup Location
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setLocationModalTarget('PICKUP');
                            setLocationModalOpen(true);
                          }}
                          className="text-[11px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 transition"
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
                        className="w-full rounded-2xl border border-slate-300 p-3 text-sm text-slate-800 bg-slate-50 hover:bg-slate-100/80 focus:bg-white flex items-center justify-between text-left transition focus:ring-2 focus:ring-orange-500 shadow-2xs group"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 shadow-xs ring-2 ring-emerald-200" />
                          <span className="truncate font-bold text-slate-900 group-hover:text-orange-600 text-xs sm:text-sm">
                            {pickupAddress}
                          </span>
                        </div>
                        <span className="text-slate-400 text-xs font-bold pl-2 flex-shrink-0">▾</span>
                      </button>
                    </div>

                    {/* Drop Destination Trigger */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Drop Location
                        </label>
                        {tripType === TripType.ROUND && (
                          <button
                            type="button"
                            onClick={handleAddStop}
                            className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-orange-800 hover:text-slate-950 bg-orange-100 hover:bg-orange-200 border border-orange-300 px-2 py-0.5 rounded-md transition"
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
                        className="w-full rounded-2xl border border-slate-300 p-3 text-sm text-slate-800 bg-slate-50 hover:bg-slate-100/80 focus:bg-white flex items-center justify-between text-left transition focus:ring-2 focus:ring-orange-500 shadow-2xs group"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0 shadow-xs ring-2 ring-rose-200" />
                          <span className="truncate font-bold text-slate-900 group-hover:text-orange-600 text-xs sm:text-sm">
                            {dropAddress}
                          </span>
                        </div>
                        <span className="text-slate-400 text-xs font-bold pl-2 flex-shrink-0">▾</span>
                      </button>
                    </div>
                  </div>

                  {/* Multiple Intermediate Stops List (ONLY for Round Trip) */}
                  {tripType === TripType.ROUND && stops.length > 0 && (
                    <div className="p-2.5 bg-orange-50/60 border border-orange-200 rounded-2xl space-y-1.5 max-h-24 overflow-y-auto">
                      <div className="flex justify-between items-center text-xs font-bold text-orange-950">
                        <span>Intermediate Stops ({stops.length})</span>
                      </div>
                      <div className="space-y-1.5">
                        {stops.map((stop, index) => (
                          <div
                            key={stop.id}
                            className="p-1.5 bg-white border border-orange-200 rounded-xl flex items-center gap-2"
                          >
                            <span className="w-4 h-4 rounded-full bg-orange-500 text-white font-bold text-[9px] flex items-center justify-center flex-shrink-0">
                              {index + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setLocationModalTarget(stop.id);
                                  setLocationModalOpen(true);
                                }}
                                className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 text-xs font-medium text-slate-800 flex items-center justify-between text-left transition truncate"
                              >
                                <span className="truncate">{stop.address}</span>
                                <span className="text-slate-400 text-[10px] font-bold pl-1">▾</span>
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveStop(stop.id)}
                              className="text-red-500 hover:text-red-700 p-1 text-xs rounded transition"
                              title="Remove Stop"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Trip Duration / Package / Airport mode (Contextual) */}
                  {tripType === TripType.ROUND ? (
                    <div className="p-2 sm:p-2.5 bg-orange-50/60 border border-orange-200 rounded-2xl flex items-center justify-between gap-1.5 sm:gap-2">
                      <div className="flex-1 min-w-0 pr-1">
                        <div className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-orange-950 truncate">
                          Trip Duration
                        </div>
                        <div className="text-[10px] sm:text-xs font-medium text-orange-800 mt-0.5 truncate">
                          {(() => {
                            try {
                              const parts = scheduledDate.split('-');
                              if (parts.length === 3) {
                                const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                                d.setDate(d.getDate() + (durationDays - 1));
                                return (
                                  <>Return: <strong className="text-slate-900 font-bold">{d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></>
                                );
                              }
                              return null;
                            } catch (e) {
                              return null;
                            }
                          })()}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setDurationDays((d) => Math.max(1, d - 1))}
                          className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white border border-orange-300 text-slate-900 font-black text-xs sm:text-sm hover:bg-orange-100 active:scale-90 transition flex items-center justify-center shadow-2xs"
                          aria-label="Decrease duration"
                        >
                          −
                        </button>
                        <span className="w-10 sm:w-11 text-center font-black text-[11px] sm:text-xs text-slate-900 shrink-0">
                          {durationDays} {durationDays === 1 ? 'Day' : 'Days'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setDurationDays((d) => Math.min(30, d + 1))}
                          className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white border border-orange-300 text-slate-900 font-black text-xs sm:text-sm hover:bg-orange-100 active:scale-90 transition flex items-center justify-center shadow-2xs"
                          aria-label="Increase duration"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ) : tripType === TripType.LOCAL ? (
                    <div className="p-2.5 sm:p-3 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-1">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-amber-950">
                        Rental Package Duration
                      </label>
                      <select
                        value={packageHours}
                        onChange={(e) => setPackageHours(Number(e.target.value))}
                        className="w-full py-2 px-3 bg-white border border-amber-300 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      >
                        <option value={4}>4 Hours / 40 KM Package (Local Sightseeing)</option>
                        <option value={8}>8 Hours / 80 KM Package (Full Day City)</option>
                        <option value={12}>12 Hours / 120 KM Package (Extended Day)</option>
                      </select>
                    </div>
                  ) : null}

                  {/* Schedule Picker: Date & Time */}
                  <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Pickup Date
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          value={scheduledDate}
                          min={new Date().toISOString().split('T')[0]}
                          onChange={(e) => setScheduledDate(e.target.value)}
                          className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-xs sm:text-sm font-bold text-slate-800 focus:ring-2 focus:ring-orange-500 focus:bg-white focus:outline-none transition shadow-2xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Pickup Time
                      </label>
                      <div className="relative">
                        <input
                          type="time"
                          value={scheduledTime}
                          onChange={(e) => setScheduledTime(e.target.value)}
                          className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-xs sm:text-sm font-bold text-slate-800 focus:ring-2 focus:ring-orange-500 focus:bg-white focus:outline-none transition shadow-2xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Action CTA Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="w-full py-3.5 sm:py-4 rounded-2xl bg-[#F05323] hover:bg-orange-600 active:scale-[0.99] text-white font-bold text-base shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition"
                  >
                    <span>Next: Choose Cab →</span>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: VEHICLE CATEGORIES & LIVE QUOTE */}
            {step === 2 && (
              <div className="p-2.5 sm:p-3.5 lg:p-4 flex-1 min-h-0 flex flex-col justify-between overflow-hidden">
                {/* Step Top Header */}
                <div className="flex items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-base font-bold text-slate-900">Select Vehicle Category</h2>
                    {isQuoting && (
                      <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                        Calculating...
                      </span>
                    )}
                  </div>
                  {quotesData && (
                    <span className="text-[11px] sm:text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full font-medium whitespace-nowrap">
                      Est. {quotesData.distanceKm} km (~{quotesData.estimatedDurationMins} mins)
                    </span>
                  )}
                </div>

                {/* Slidable Vehicle Category Carousel Cards */}
                {!quotesData ? (
                  <div className="relative group my-auto shrink-0">
                    <div className="flex gap-2 sm:gap-3 lg:gap-3.5 overflow-x-auto pb-1.5 pt-0.5 px-2 snap-x snap-mandatory">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="min-w-[260px] sm:min-w-[280px] max-w-[280px] rounded-2xl border border-slate-200/80 bg-white p-3.5 flex flex-col justify-between shadow-xs animate-pulse space-y-2 shrink-0"
                        >
                          <div className="flex items-center justify-between">
                            <div className="h-4 w-24 bg-slate-200 rounded-md" />
                            <div className="h-4 w-16 bg-amber-100 rounded-full" />
                          </div>
                          <div className="h-20 sm:h-24 bg-slate-100 rounded-xl flex items-center justify-center">
                            <div className="w-12 h-6 bg-slate-200 rounded-lg" />
                          </div>
                          <div className="space-y-1.5">
                            <div className="h-3 w-3/4 bg-slate-200 rounded" />
                            <div className="h-2.5 w-1/2 bg-slate-100 rounded" />
                          </div>
                          <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between">
                            <div className="h-5 w-20 bg-slate-200 rounded-md" />
                            <div className="h-7 w-24 bg-amber-200 rounded-xl" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="relative group my-auto shrink-0">
                    {/* Left Navigation Button */}
                    <button
                      type="button"
                      onClick={() => {
                        const currentIdx = quotesData?.quotes.findIndex((q) => q.category === selectedCategory) ?? 0;
                        scrollToVehicleIndex(currentIdx - 1, true);
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
                        const currentIdx = quotesData?.quotes.findIndex((q) => q.category === selectedCategory) ?? 0;
                        scrollToVehicleIndex(currentIdx + 1, true);
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
                      ref={carouselTrackRef}
                      id="vehicle-carousel-track"
                      onScroll={handleCarouselScroll}
                      className="flex gap-2.5 sm:gap-3.5 overflow-x-auto pb-1.5 pt-0.5 px-2 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-amber-300 scrollbar-track-slate-100"
                    >
                      {quotesData?.quotes.map((q, idx) => {
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
                            onClick={() => scrollToVehicleIndex(idx, true)}
                            className={`snap-start shrink-0 w-[84vw] sm:w-[calc(50%-8px)] lg:w-[calc(33.333%-10px)] xl:w-[360px] cursor-pointer rounded-2xl sm:rounded-[24px] border-[2px] sm:border-[2.5px] transition-all duration-300 relative flex flex-col justify-between overflow-hidden bg-white ${
                              isCatSelected
                                ? 'border-amber-500 ring-2 ring-amber-400/60 shadow-[0_6px_20px_rgba(245,158,11,0.2)] bg-gradient-to-b from-amber-50/50 via-white to-white'
                                : 'border-slate-200/90 hover:border-amber-300 hover:shadow-md opacity-95 hover:opacity-100 shadow-2xs'
                            }`}
                          >
                            {/* Card Top Header with Vehicle Illustration & Badge */}
                            <div className="p-3 pb-0.5">
                              <div className="flex justify-between items-center gap-2 mb-0.5">
                                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full transition ${
                                  isCatSelected ? 'bg-amber-500 text-slate-950 shadow-xs' : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {meta.badge}
                                </span>
                                {isCatSelected ? (
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-300/80 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    <span>Selected</span>
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-medium">Click to select</span>
                                )}
                              </div>

                              {/* Vehicle Image with Pedestal Soft Gradient */}
                              <div className="relative w-full h-20 sm:h-24 lg:h-28 my-0.5 flex items-center justify-center">
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
                                <p className="text-[11px] text-slate-500 font-medium truncate">
                                  {meta.tagline}
                                </p>
                              </div>
                            </div>

                            {/* Price Section */}
                            <div className="px-3 py-1 bg-slate-50/80 border-y border-slate-100 flex items-center justify-between">
                              <div>
                                <div className="text-[9px] uppercase font-semibold text-slate-500 tracking-wider">Total Calculated Fare</div>
                                <div className="text-base sm:text-lg font-black text-slate-950 tracking-tight">
                                  ₹{cardFare.toLocaleString('en-IN')}
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] sm:text-[11px] text-amber-900 font-bold bg-amber-100/90 border border-amber-200/90 px-2 py-0.5 rounded-md inline-block shadow-2xs">
                                  Advance (25%): ₹{cardAdvance.toLocaleString('en-IN')}
                                </span>
                              </div>
                            </div>

                            {/* Specs & Fuel Selector */}
                            <div className="p-3 pt-1.5 space-y-1.5">
                              {/* Capacity Specs */}
                              <div className="flex items-center gap-2 text-[10px] sm:text-xs font-semibold text-slate-700">
                                <span className="flex items-center gap-1 bg-slate-100/80 px-2 py-0.5 rounded-md shadow-2xs">
                                  👥 {q.seats} Seats
                                </span>
                                <span className="flex items-center gap-1 bg-slate-100/80 px-2 py-0.5 rounded-md shadow-2xs">
                                  🧳 {q.luggage} Bags
                                </span>
                              </div>

                              {/* Fuel Options Selection (3-Column Horizontal Grid for 100vh Fit) */}
                              {q.fuelOptions && q.fuelOptions.length > 0 && (
                                <div className="space-y-0.5 pt-0.5">
                                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                                    <span>FUEL OPTIONS:</span>
                                    {isCatSelected && (
                                      <span className="text-amber-700 font-black text-[9px] uppercase tracking-wide">
                                        {selectedFuelType} Selected
                                      </span>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-3 gap-1">
                                    {q.fuelOptions.map((fo) => {
                                      const isFuelActive = isCatSelected && selectedFuelType === fo.fuelType;
                                      let badgeStyle = 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 shadow-2xs';
                                      if (isFuelActive) {
                                        if (fo.fuelType === FuelType.CNG) badgeStyle = 'bg-emerald-600 text-white border-emerald-600 shadow-xs font-black';
                                        else if (fo.fuelType === FuelType.PETROL) badgeStyle = 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs font-black';
                                        else badgeStyle = 'bg-blue-600 text-white border-blue-600 shadow-xs font-black';
                                      }

                                      return (
                                        <button
                                          key={fo.fuelType}
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleSelectCategoryAndFuel(q.category, fo.fuelType);
                                          }}
                                          className={`px-1.5 py-1 rounded-xl text-center border transition-all flex flex-col items-center justify-center gap-0.5 ${badgeStyle}`}
                                        >
                                          <span className="font-extrabold text-[11px] leading-tight truncate">
                                            {fo.fuelType === FuelType.CNG ? '🟢 CNG' : fo.fuelType === FuelType.PETROL ? '🟡 Petrol' : '🔵 Diesel'}
                                          </span>
                                          <span className="text-[10px] font-bold font-mono opacity-90">
                                            ₹{fo.pricing.totalFare.toLocaleString('en-IN')}
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
                    <div className="flex items-center justify-center gap-2.5 pt-1 shrink-0">
                      <div className="flex items-center gap-1">
                        {quotesData?.quotes.map((q, idx) => (
                          <button
                            key={q.category}
                            type="button"
                            onClick={() => scrollToVehicleIndex(idx, true)}
                            className={`h-1.5 rounded-full transition-all ${
                              selectedCategory === q.category
                                ? 'w-4 sm:w-5 bg-amber-500'
                                : 'w-1.5 bg-slate-300 hover:bg-slate-400'
                            }`}
                            aria-label={`Select ${q.name}`}
                          />
                        ))}
                      </div>

                      <span className="text-[10px] sm:text-xs font-semibold text-slate-500">
                        {quotesData?.quotes.findIndex((q) => q.category === selectedCategory)! + 1} of {quotesData?.quotes.length} Vehicles
                      </span>
                    </div>
                  </div>
                )}

                {/* Live Fare Breakdown (Compact Banner for 100vh Mobile) */}
                {activePricing && (
                  <div className="bg-slate-50 border border-slate-200/90 rounded-xl px-3 py-1.5 flex items-center justify-between text-xs shrink-0 shadow-2xs">
                    <div className="flex items-center gap-1.5 sm:gap-2.5 text-slate-700 font-semibold text-[11px] sm:text-xs truncate">
                      <span className="text-slate-900 font-bold">Base: ₹{activePricing.baseFare}</span>
                      {activePricing.driverAllowance > 0 && <span>• DA: ₹{activePricing.driverAllowance}</span>}
                      <span>• GST: ₹{activePricing.gstAmount}</span>
                    </div>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full shrink-0">
                      All Inclusive
                    </span>
                  </div>
                )}

                {/* Bottom Action Buttons */}
                <div className="flex justify-between items-center pt-1.5 pb-1 sm:pb-1.5 border-t border-slate-100 shrink-0 bg-white">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-900 active:scale-95 transition"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="px-5 sm:px-6 py-2.5 sm:py-3 rounded-2xl bg-[#F05323] hover:bg-orange-600 text-white text-xs sm:text-sm font-bold transition shadow-md shadow-orange-500/20 active:scale-95 flex items-center gap-1.5"
                  >
                    <span>Next: Contact Details →</span>
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
                    Passenger &amp; Contact Details
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
                    Review Ride &amp; Pay Advance
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
