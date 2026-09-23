'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
  TripType,
  VehicleCategory,
  QuoteResponse,
  useAuth,
  UserRole,
} from '@kandy-cabs/shared';
import { ALL_LOCATIONS, PlaceLocation } from '@/lib/locations';

const DriverAppModal = dynamic(
  () => import('@/components/DriverAppModal').then((mod) => mod.DriverAppModal),
  { ssr: false }
);
const LocationPickerModal = dynamic(
  () => import('@/components/LocationPickerModal').then((mod) => mod.LocationPickerModal),
  { ssr: false }
);

const POPULAR_LOCATIONS = ALL_LOCATIONS.map((l) => ({ name: l.label, lat: l.lat, lng: l.lng }));

const HERO_FLEET_SLIDES = [
  {
    id: 'hatchback',
    name: 'Economy Hatchback',
    models: 'Baleno • WagonR • Tiago',
    image: '/images/fleet-hatchback.webp',
    rate: '₹11 / km',
    capacity: '4 Passengers',
  },
  {
    id: 'sedan',
    name: 'Prime Sedan',
    models: 'Dzire • Etios • Honda Amaze',
    image: '/images/fleet-sedan.webp',
    rate: '₹13 / km',
    capacity: '4 Passengers',
  },
  {
    id: 'suv',
    name: 'Prime SUV (6+1)',
    models: 'Ertiga • Carens • Triber',
    image: '/images/fleet-suv.webp',
    rate: '₹18 / km',
    capacity: '6 Passengers',
  },
  {
    id: 'crysta',
    name: 'Innova Crysta Luxury',
    models: 'Innova Crysta • Hycross',
    image: '/images/fleet-crysta.webp',
    rate: '₹22 / km',
    capacity: '7 Passengers',
  },
  {
    id: 'traveller',
    name: 'Tempo Traveller (12+1)',
    models: 'Force Traveller 3350 AC',
    image: '/images/fleet-traveller.webp',
    rate: '₹26 / km',
    capacity: '12-17 Passengers',
    sizeClass: 'w-[88%] sm:w-[84%] max-w-[510px]',
  },
];

const SLIDE_TO_CATEGORY: Record<string, VehicleCategory> = {
  hatchback: VehicleCategory.HATCHBACK,
  sedan: VehicleCategory.SEDAN,
  suv: VehicleCategory.SUV,
  crysta: VehicleCategory.SUV_PREMIUM,
  traveller: VehicleCategory.TEMPO_TRAVELER,
};

const FLEET_DATA = [
  {
    category: VehicleCategory.HATCHBACK,
    name: 'Hatchback',
    models: 'WagonR, Tiago, Celerio',
    image: '/images/fleet-hatchback.webp',
    ratePerKm: '₹11/km',
    capacity: '4 Passengers',
    luggage: '2 Luggage Bags',
    idealFor: 'Budget city & short outstation trips',
    badge: 'ECONOMY CHOICE',
    badgeBg: 'bg-[#059668] text-white',
    cardBorder: 'border-emerald-200 hover:border-emerald-400',
    cardHeaderGradient: 'bg-gradient-to-b from-emerald-50/70 via-white to-white',
    rateBadge: 'bg-emerald-100 text-emerald-800',
    iconBg: 'bg-emerald-100/80 text-emerald-600 border border-emerald-200/80',
    idealForBg: 'bg-emerald-50/80 text-emerald-950 border border-emerald-100/80',
    checkColor: 'text-emerald-600',
    btnHover: 'hover:bg-emerald-600',
    badgeIcon: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
        <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
      </svg>
    ),
    icon: (
      <svg className="w-5 h-5 sm:w-5.5 sm:h-5.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="9" rx="3" />
        <path d="M5 11l2-6h10l2 6" />
        <circle cx="7" cy="15.5" r="1.5" />
        <circle cx="17" cy="15.5" r="1.5" />
        <path d="M10 15.5h4" />
      </svg>
    ),
  },
  {
    category: VehicleCategory.SEDAN,
    name: 'Prime Sedan',
    models: 'Dzire, Etios, Honda Amaze',
    image: '/images/fleet-sedan.webp',
    ratePerKm: '₹13/km',
    capacity: '4 Passengers',
    luggage: '3 Large Bags',
    idealFor: 'Comfortable family & business highway rides',
    badge: 'MOST POPULAR',
    badgeBg: 'bg-[#0066ff] text-white',
    cardBorder: 'border-blue-200 hover:border-blue-400',
    cardHeaderGradient: 'bg-gradient-to-b from-blue-50/70 via-white to-white',
    rateBadge: 'bg-blue-100 text-blue-800',
    iconBg: 'bg-blue-100/80 text-blue-600 border border-blue-200/80',
    idealForBg: 'bg-blue-50/80 text-blue-950 border border-blue-100/80',
    checkColor: 'text-blue-600',
    btnHover: 'hover:bg-blue-600',
    badgeIcon: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 16l-2-9 5.5 3.5L12 4l3.5 6.5L21 7l-2 9H5z" />
      </svg>
    ),
    icon: (
      <svg className="w-5 h-5 sm:w-5.5 sm:h-5.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="9" rx="3" />
        <path d="M5 11l2-6h10l2 6" />
        <circle cx="7" cy="15.5" r="1.5" />
        <circle cx="17" cy="15.5" r="1.5" />
        <path d="M10 15.5h4" />
      </svg>
    ),
  },
  {
    category: VehicleCategory.SUV,
    name: 'Prime SUV (6+1)',
    models: 'Ertiga, Carens, Triber',
    image: '/images/fleet-suv.webp',
    ratePerKm: '₹18/km',
    capacity: '6 Passengers',
    luggage: '4 Large Bags',
    idealFor: 'Family vacations, hill stations & extra luggage',
    badge: 'EXTRA SPACE',
    badgeBg: 'bg-[#7c3aed] text-white',
    cardBorder: 'border-purple-200 hover:border-purple-400',
    cardHeaderGradient: 'bg-gradient-to-b from-purple-50/70 via-white to-white',
    rateBadge: 'bg-purple-100 text-purple-800',
    iconBg: 'bg-purple-100/80 text-purple-600 border border-purple-200/80',
    idealForBg: 'bg-purple-50/80 text-purple-950 border border-purple-100/80',
    checkColor: 'text-purple-600',
    btnHover: 'hover:bg-purple-600',
    badgeIcon: (
      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
      </svg>
    ),
    icon: (
      <svg className="w-5 h-5 sm:w-5.5 sm:h-5.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9C2.1 11.1 2 11.5 2 12v4c0 .6.4 1 1 1h2" />
        <circle cx="7" cy="17" r="2" />
        <path d="M9 17h6" />
        <circle cx="17" cy="17" r="2" />
      </svg>
    ),
  },
  {
    category: VehicleCategory.SUV_PREMIUM,
    name: 'Innova Crysta Luxury',
    models: 'Toyota Innova Crysta / Hycross',
    image: '/images/fleet-crysta.webp',
    ratePerKm: '₹23/km',
    capacity: '6+1 Captain Seats',
    luggage: '5 Large Bags',
    idealFor: 'VIP travel, long distance hill tours & unmatched comfort',
    badge: 'PREMIUM COMFORT',
    badgeBg: 'bg-fuchsia-100 text-fuchsia-800 font-extrabold',
    cardBorder: 'border-fuchsia-200 hover:border-fuchsia-400',
    cardHeaderGradient: 'bg-gradient-to-b from-fuchsia-50/70 via-white to-white',
    rateBadge: 'bg-fuchsia-100 text-fuchsia-800',
    iconBg: 'bg-fuchsia-100/80 text-fuchsia-600 border border-fuchsia-200/80',
    idealForBg: 'bg-fuchsia-50/80 text-fuchsia-950 border border-fuchsia-100/80',
    checkColor: 'text-fuchsia-600',
    btnHover: 'hover:bg-fuchsia-600',
    badgeIcon: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 3h12l4 7-10 11L2 10l4-7z" />
      </svg>
    ),
    icon: (
      <svg className="w-5 h-5 sm:w-5.5 sm:h-5.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
  },
  {
    category: VehicleCategory.TEMPO_TRAVELER,
    name: 'Tempo Traveller (12+1)',
    models: 'Force Traveller 3350 AC',
    image: '/images/fleet-traveller.webp',
    ratePerKm: '₹28/km',
    capacity: '12-14 Passengers',
    luggage: 'Heavy Luggage Carrier',
    idealFor: 'Corporate outings, wedding parties & large groups',
    badge: 'GROUP TRAVEL',
    badgeBg: 'bg-amber-100 text-amber-800 font-extrabold',
    cardBorder: 'border-amber-200 hover:border-amber-400',
    cardHeaderGradient: 'bg-gradient-to-b from-amber-50/70 via-white to-white',
    rateBadge: 'bg-amber-100 text-amber-800',
    iconBg: 'bg-amber-100/80 text-amber-600 border border-amber-200/80',
    idealForBg: 'bg-amber-50/80 text-amber-950 border border-amber-100/80',
    checkColor: 'text-amber-600',
    btnHover: 'hover:bg-amber-600',
    badgeIcon: (
      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
      </svg>
    ),
    icon: (
      <svg className="w-5 h-5 sm:w-5.5 sm:h-5.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
];

export default function HomePage() {
  const router = useRouter();
  const { user, isAuthenticated, sendOtp, verifyOtp, logout } = useAuth();

  // Customer Sign In / Sign Up Modal State
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [driverAppModalOpen, setDriverAppModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentFleetSlide, setCurrentFleetSlide] = useState(0);
  const [prevFleetSlide, setPrevFleetSlide] = useState<number | null>(null);

  const goToSlide = (nextIndex: number) => {
    setPrevFleetSlide(currentFleetSlide);
    setCurrentFleetSlide(nextIndex);
  };

  useEffect(() => {
    if (HERO_FLEET_SLIDES.length <= 1) return;
    const interval = setInterval(() => {
      setPrevFleetSlide(currentFleetSlide);
      setCurrentFleetSlide((prev) => (prev + 1) % HERO_FLEET_SLIDES.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [currentFleetSlide]);

  const [showMobileDock, setShowMobileDock] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = Math.max(
        window.scrollY || 0,
        window.pageYOffset || 0,
        document.documentElement?.scrollTop || 0,
        document.body?.scrollTop || 0
      );
      // Show bottom dock when user scrolls (scrollY > 20px)
      setShowMobileDock(scrollY > 20);
      // Toggle header background to solid white on any scroll movement (scrollY > 5px)
      setIsScrolled(scrollY > 5);
    };

    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    document.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true } as any);
      document.removeEventListener('scroll', handleScroll, { capture: true } as any);
    };
  }, []);

  const [authPhone, setAuthPhone] = useState('');
  const [authFullName, setAuthFullName] = useState('');
  const [authOtp, setAuthOtp] = useState('');
  const [authStep, setAuthStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authDebugOtp, setAuthDebugOtp] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [existingName, setExistingName] = useState<string | null>(null);
  const [existingRoles, setExistingRoles] = useState<string[]>([]);

  const handleAuthSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authPhone.length !== 10) {
      setAuthError('Please enter a valid 10-digit mobile number');
      return;
    }
    setAuthError('');
    setAuthLoading(true);
    try {
      const res = await sendOtp(authPhone);
      if (res.success) {
        setAuthStep('OTP');
        setIsRegistered(!!res.isRegistered);
        setExistingName(res.existingName || null);
        setExistingRoles(res.roles || []);
        if (res.existingName) {
          setAuthFullName(res.existingName);
        } else {
          setAuthFullName('');
        }
        if (res.debugOtp) {
          setAuthDebugOtp(res.debugOtp);
          setAuthOtp(res.debugOtp);
        }
      } else {
        setAuthError(res.message);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Failed to send verification code');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAuthVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authOtp.length !== 4) {
      setAuthError('Please enter the 4-digit OTP');
      return;
    }
    if (!isRegistered && !authFullName.trim()) {
      setAuthError('Please enter your full name to complete registration');
      return;
    }
    setAuthError('');
    setAuthLoading(true);
    try {
      const res = await verifyOtp(authPhone, authOtp, authFullName);
      if (res.success) {
        setAuthModalOpen(false);
        setAuthStep('PHONE');
        setAuthOtp('');
        setAuthPhone('');
        setAuthFullName('');
      } else {
        setAuthError(res.message || 'Invalid verification code');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Verification failed');
    } finally {
      setAuthLoading(false);
    }
  };

  // Booking Widget State
  const [tripType, setTripType] = useState<TripType>(TripType.ONEWAY);
  const [airportTransferType, setAirportTransferType] = useState<'PICKUP' | 'DROP'>('PICKUP');
  const [pickupAddress, setPickupAddress] = useState(POPULAR_LOCATIONS[2]?.name || 'Indiranagar 100 Feet Rd, Bangalore');
  const [pickupLat, setPickupLat] = useState(POPULAR_LOCATIONS[2]?.lat || 12.9784);
  const [pickupLng, setPickupLng] = useState(POPULAR_LOCATIONS[2]?.lng || 77.6408);

  const [dropAddress, setDropAddress] = useState(POPULAR_LOCATIONS[5]?.name || 'Mysore Palace, Mysore');
  const [dropLat, setDropLat] = useState(POPULAR_LOCATIONS[5]?.lat || 12.3051);
  const [dropLng, setDropLng] = useState(POPULAR_LOCATIONS[5]?.lng || 76.6551);

  const handleAirportTransferSelect = (type: 'PICKUP' | 'DROP') => {
    setAirportTransferType(type);
    setQuoteData(null);
    const airportLoc = ALL_LOCATIONS.find((l) => l.category === 'AIRPORTS') || {
      label: 'Mangaluru Airport (IXE)',
      lat: 12.9613,
      lng: 74.8901,
    };
    const cityLoc = ALL_LOCATIONS.find((l) => l.category === 'MANGALURU') || {
      label: 'Mangaluru Central Railway Station',
      lat: 12.8634,
      lng: 74.8436,
    };

    if (type === 'PICKUP') {
      setPickupAddress(airportLoc.label);
      setPickupLat(airportLoc.lat);
      setPickupLng(airportLoc.lng);
      setDropAddress(cityLoc.label);
      setDropLat(cityLoc.lat);
      setDropLng(cityLoc.lng);
    } else {
      setPickupAddress(cityLoc.label);
      setPickupLat(cityLoc.lat);
      setPickupLng(cityLoc.lng);
      setDropAddress(airportLoc.label);
      setDropLat(airportLoc.lat);
      setDropLng(airportLoc.lng);
    }
  };

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
    setQuoteData(null);
  };

  // Round Trip Multiple Stops State (ONLY for Round Trip)
  interface TripStop {
    id: string;
    address: string;
    lat: number;
    lng: number;
  }
  const [stops, setStops] = useState<TripStop[]>([]);

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
    setQuoteData(null);
  };

  const handleRemoveStop = (id: string) => {
    setStops((prev) => prev.filter((s) => s.id !== id));
    setQuoteData(null);
  };

  const handleUpdateStop = (id: string, name: string) => {
    const loc = POPULAR_LOCATIONS.find((l) => l.name === name);
    if (loc) {
      setStops((prev) =>
        prev.map((s) => (s.id === id ? { ...s, address: loc.name, lat: loc.lat, lng: loc.lng } : s))
      );
      setQuoteData(null);
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
  const [selectedCategory, setSelectedCategory] = useState<VehicleCategory>(VehicleCategory.SEDAN);

  // Live estimate calculation
  const [isQuoting, setIsQuoting] = useState(false);
  const [quoteData, setQuoteData] = useState<QuoteResponse | null>(null);
  const [quoteError, setQuoteError] = useState('');

  // In-browser client quote cache & abort controller
  const clientQuoteCache = useRef<Map<string, QuoteResponse>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchQuickQuote = async () => {
    const scheduledAt = `${scheduledDate}T${scheduledTime}:00`;
    const stopsKey = tripType === TripType.ROUND ? stops.map((s) => `${s.lat?.toFixed(4)},${s.lng?.toFixed(4)}`).join('|') : '';
    const cacheKey = `${pickupLat?.toFixed(4)}_${pickupLng?.toFixed(4)}_${dropLat?.toFixed(4)}_${dropLng?.toFixed(4)}_${tripType}_${scheduledAt}_${durationDays}_${packageHours}_${stopsKey}`;

    // 0ms instant browser cache hit
    const cached = clientQuoteCache.current.get(cacheKey);
    if (cached) {
      setQuoteData(cached);
      setQuoteError('');
      setIsQuoting(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsQuoting(true);
    setQuoteError('');
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
        }),
      });

      if (res.ok) {
        const data: QuoteResponse = await res.json();
        clientQuoteCache.current.set(cacheKey, data);
        setQuoteData(data);
      } else {
        const err = await res.json();
        setQuoteError(err.error || 'Failed to calculate quote');
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setQuoteError(e.message || 'Error connecting to pricing engine');
      }
    } finally {
      if (abortControllerRef.current === controller) {
        setIsQuoting(false);
      }
    }
  };

  const handleSwapLocations = () => {
    const tempAddr = pickupAddress;
    const tempLt = pickupLat;
    const tempLg = pickupLng;
    setPickupAddress(dropAddress);
    setPickupLat(dropLat);
    setPickupLng(dropLng);
    setDropAddress(tempAddr);
    setDropLat(tempLt);
    setDropLng(tempLg);
    setQuoteData(null);
  };

  const handleStartBooking = (category?: VehicleCategory) => {
    const cat = category || selectedCategory;
    const params = new URLSearchParams({
      step: '2',
      tripType,
      pickup: pickupAddress,
      pickupLat: pickupLat.toString(),
      pickupLng: pickupLng.toString(),
      drop: dropAddress,
      dropLat: dropLat.toString(),
      dropLng: dropLng.toString(),
      date: scheduledDate,
      time: scheduledTime,
      category: cat,
      durationDays: durationDays.toString(),
      packageHours: packageHours.toString(),
    });
    if (tripType === TripType.ROUND && stops.length > 0) {
      params.set('stops', JSON.stringify(stops));
    }
    router.push(`/booking?${params.toString()}`);
  };

  const scrollToBookingEngine = (category?: VehicleCategory) => {
    if (category) {
      setSelectedCategory(category);
    }
    const el = document.getElementById('booking-engine');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Main Navigation Bar - Completely transparent at top, solid white on scroll */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-md text-slate-800'
            : 'bg-transparent border-b border-transparent shadow-none'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center group py-1.5">
            <Image
              src={isScrolled ? '/images/logo.webp' : '/images/logo-white.webp'}
              alt="Kandy Cabs - Safe | Reliable | Hassle Free"
              width={180}
              height={56}
              priority
              className="h-9 sm:h-11 lg:h-14 w-auto object-contain transition-transform group-hover:scale-[1.02]"
            />
          </Link>

          <nav
            className={`hidden lg:flex items-center space-x-8 font-semibold text-sm transition-colors duration-300 ${
              isScrolled ? 'text-slate-700' : 'text-white drop-shadow-sm'
            }`}
          >
            <a
              href="#booking-engine"
              onClick={(e) => {
                e.preventDefault();
                scrollToBookingEngine();
              }}
              className="hover:text-orange-500 transition cursor-pointer"
            >
              Book Cab
            </a>
            <a href="#fleet" className="hover:text-orange-500 transition">Fleet & Rates</a>
            <a href="#why-kandy" className="hover:text-orange-500 transition">Why Choose Us</a>
            <a href="#how-it-works" className="hover:text-orange-500 transition">How It Works</a>
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
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50/90 border border-orange-200 text-orange-900 rounded-xl text-xs font-bold hover:bg-orange-100 transition shadow-xs"
                  >
                    <span>Driver Partner</span>
                    <span className="text-[10px] bg-orange-600 text-white px-1.5 py-0.5 rounded font-black">App</span>
                  </button>
                )}
                <Link
                  href="/customer/dashboard"
                  className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border transition font-bold text-[11px] sm:text-xs flex items-center gap-1.5 shadow-xs ${
                    isScrolled
                      ? 'border-slate-300 text-slate-800 bg-slate-50 hover:bg-slate-100'
                      : 'border-white/30 text-white bg-black/40 hover:bg-black/60 backdrop-blur-md'
                  }`}
                >
                  <div className="w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full bg-orange-600 text-white text-[10px] flex items-center justify-center font-black">
                    {user?.fullName ? user.fullName[0].toUpperCase() : 'U'}
                  </div>
                  <span className="hidden xs:inline">My Bookings</span>
                </Link>
                <button
                  type="button"
                  onClick={() => logout()}
                  className={`hidden lg:inline-flex px-2 sm:px-2.5 py-1.5 text-xs font-semibold rounded-lg sm:rounded-xl transition ${
                    isScrolled
                      ? 'text-slate-500 hover:text-red-600 hover:bg-slate-100'
                      : 'text-slate-300 hover:text-red-400 hover:bg-white/10'
                  }`}
                  title="Sign Out"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAuthError('');
                  setAuthStep('PHONE');
                  setAuthModalOpen(true);
                }}
                className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border transition font-bold text-[11px] sm:text-xs flex items-center gap-1 sm:gap-1.5 shadow-xs ${
                  isScrolled
                    ? 'border-slate-300 bg-slate-50 hover:border-orange-500 hover:bg-orange-50 text-slate-800'
                    : 'border-white/30 bg-black/40 hover:bg-black/60 text-white backdrop-blur-md hover:border-orange-400'
                }`}
              >
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
              className={`lg:hidden p-1.5 sm:p-2 rounded-lg sm:rounded-xl border transition focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-xs ${
                isScrolled
                  ? 'border-slate-300 bg-slate-50 text-slate-800 hover:text-orange-600 hover:bg-slate-100'
                  : 'border-white/30 bg-black/40 text-white hover:bg-black/60 backdrop-blur-md hover:text-orange-400'
              }`}
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
          <div className="lg:hidden mx-3 sm:mx-6 rounded-2xl border border-slate-200 bg-white/98 backdrop-blur-2xl px-3 py-3 shadow-2xl animate-in slide-in-from-top-2 duration-200">
            <nav className="flex flex-col space-y-1 font-semibold text-slate-800 text-sm">
              <a
                href="#booking-engine"
                onClick={(e) => {
                  e.preventDefault();
                  setMobileMenuOpen(false);
                  scrollToBookingEngine();
                }}
                className="flex items-center justify-between px-3 py-2 bg-orange-600 text-white rounded-xl shadow-xs font-bold hover:bg-orange-700 transition text-xs sm:text-sm"
              >
                <span>Book Cab Online</span>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-medium">Instant</span>
              </a>

              <a
                href="#fleet"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-slate-100 text-slate-800 hover:text-orange-600 transition text-xs sm:text-sm"
              >
                <span>Fleet &amp; Rates</span>
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>

              <a
                href="#why-kandy"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-slate-100 text-slate-800 hover:text-orange-600 transition text-xs sm:text-sm"
              >
                <span>Why Choose Us</span>
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>

              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-slate-100 text-slate-800 hover:text-orange-600 transition text-xs sm:text-sm"
              >
                <span>How It Works</span>
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>

              <div className="pt-1.5 border-t border-slate-200 flex flex-col gap-1.5">
                {user?.roles?.includes(UserRole.ADMIN) && (
                  <a
                    href="http://localhost:3001"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-white border border-slate-200 text-slate-900 rounded-lg hover:bg-slate-50 transition font-bold text-xs text-left shadow-xs"
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
                  className="w-full flex items-center justify-between px-3 py-2 bg-orange-50 border border-orange-200 text-orange-950 rounded-lg hover:bg-orange-100 transition font-bold text-xs text-left"
                >
                  <span>Download KandyCabs App</span>
                  <span className="text-[9px] bg-orange-600 text-white px-1.5 py-0.5 rounded font-black">Download</span>
                </button>

                <a
                  href="tel:+918045689000"
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100 font-bold text-xs transition"
                >
                  <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs transition"
                  >
                    <svg className="w-3.5 h-3.5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

      {/* 3. Hero Header Section with Scenic Mountain Drive Visual & Value Proposition */}
      <section className="relative text-white overflow-hidden bg-slate-950">
        {/* MOBILE & TABLET (100vh Full Screen Image with Text Overlaid at Top) */}
        <div className="lg:hidden relative h-[100svh] min-h-[640px] max-h-[950px] sm:min-h-[780px] w-full flex flex-col justify-between pt-24 sm:pt-24 pb-4 sm:pb-6 px-4 sm:px-6 overflow-hidden">
          {/* 100vh Full Background Image */}
          <Image
            src="/images/hero-mountain-road.webp"
            alt="Kandy Cabs Scenic Western Ghats Mountain Highway"
            fill
            priority
            sizes="100vw"
            className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none"
          />
          {/* Subtle Top & Bottom Gradient Overlay for contrast */}
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/20 to-slate-950/90 pointer-events-none" />

          {/* Top Text Content Inside Image */}
          <div className="relative z-10 pt-0 text-center flex flex-col items-center space-y-3.5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-950/60 backdrop-blur-md border border-orange-500/40 text-orange-400 text-[11px] sm:text-xs font-bold tracking-wide uppercase shadow-lg">
              🚖 Safe • Reliable • Hassle Free
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-[1.15] drop-shadow-md">
              Comfortable Rides. <br />
              <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-300 bg-clip-text text-transparent">
                Honest Pricing.
              </span>
            </h1>
          </div>

          {/* Animated Fleet Slider on the Scenic Mountain Road */}
          <div className="absolute inset-0 flex items-end justify-end pr-1 sm:pr-4 pointer-events-none pb-64 sm:pb-56 overflow-hidden">
            {HERO_FLEET_SLIDES.map((slide, idx) => {
              const isActive = idx === currentFleetSlide;
              const isExiting = idx === prevFleetSlide;

              let animClasses = 'opacity-0 -translate-x-full scale-95 pointer-events-none transition-none';
              if (isActive) {
                animClasses = 'opacity-100 translate-x-0 scale-100 transition-all duration-1000 ease-out z-10';
              } else if (isExiting) {
                animClasses = 'opacity-0 translate-x-full scale-95 pointer-events-none transition-all duration-1000 ease-out z-0';
              }

              const mobileSize = slide.id === 'traveller'
                ? 'w-[114%] -right-4 sm:w-[96%] sm:right-2 max-w-[720px]'
                : 'w-[92%] sm:w-[86%] max-w-[580px] right-0 sm:right-2';

              const mobileBottom = slide.id === 'traveller'
                ? 'bottom-20 sm:bottom-20'
                : 'bottom-24 sm:bottom-20';

              return (
                <div
                  key={slide.id}
                  className={`absolute ${mobileBottom} ${mobileSize} transform ${animClasses}`}
                >
                  <div className="relative">
                    <Image
                      src={slide.image}
                      alt={slide.name}
                      width={580}
                      height={320}
                      priority={idx === 0}
                      className="w-full h-auto object-contain filter drop-shadow-[0_24px_28px_rgba(0,0,0,0.92)] select-none"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Fleet Info Badge with Centered Book Cab CTA Button at Top Middle Border */}
          <div className="relative z-30 w-full max-w-xl mx-auto pb-4 sm:pb-5">
            <div className="relative bg-slate-950/95 backdrop-blur-xl border border-slate-700/80 pt-5 pb-3.5 px-4 sm:pt-5.5 sm:pb-4 sm:px-5 rounded-2xl flex items-center justify-between shadow-2xl">
              {/* Floating Centered Book Cab Button at Top Middle of the Border */}
              <div className="absolute -top-4 sm:-top-4.5 left-1/2 -translate-x-1/2 z-20">
                <button
                  type="button"
                  onClick={() => {
                    const slideId = HERO_FLEET_SLIDES[currentFleetSlide]?.id;
                    const cat = slideId ? SLIDE_TO_CATEGORY[slideId] : undefined;
                    scrollToBookingEngine(cat);
                  }}
                  className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-extrabold text-xs sm:text-sm px-5 sm:px-6 py-2 sm:py-2.5 rounded-full shadow-lg shadow-orange-600/40 flex items-center gap-1.5 transition-all transform hover:scale-105 active:scale-95 shrink-0 border border-orange-400/40 cursor-pointer"
                >
                  <span>Book Cab</span>
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </div>

              {/* Left: Vehicle Details */}
              <div className="min-w-0 text-left pr-2">
                <div className="text-[10px] sm:text-[11px] text-orange-400 font-bold uppercase tracking-wider truncate">
                  {HERO_FLEET_SLIDES[currentFleetSlide]?.name || 'Verified Fleet & Drivers'}
                </div>
                <div className="text-xs sm:text-sm font-extrabold text-white mt-0.5 truncate">
                  {HERO_FLEET_SLIDES[currentFleetSlide]?.models || 'Sedan • SUV • Innova Crysta • Tempo'}
                </div>
              </div>

              {/* Right: Starting Price */}
              <div className="text-right pl-2 shrink-0">
                <div className="text-[9px] sm:text-[10px] text-slate-400 font-medium">Starting from</div>
                <div className="text-xs sm:text-sm md:text-base font-black text-orange-400">
                  {HERO_FLEET_SLIDES[currentFleetSlide]?.rate || '₹11 / km'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* DESKTOP VIEW (lg: 2-Column Side-by-Side Layout) */}
        <div className="hidden lg:block relative bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pt-28 pb-20 px-4 sm:px-6 lg:px-8">
          {/* Subtle decorative glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(234,88,12,0.18),transparent_50%)] pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(30,41,59,0.7),transparent_50%)] pointer-events-none" />

          <div className="max-w-7xl mx-auto grid grid-cols-12 gap-10 items-center relative z-10">
            {/* Left Column: Headline & Value Proposition */}
            <div className="col-span-6 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-xs font-bold tracking-wide uppercase">
                🚖 Safe • Reliable • Hassle Free
              </div>

              <h1 className="text-5xl lg:text-6xl font-black tracking-tight leading-[1.12]">
                Comfortable Rides. <br />
                <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-300 bg-clip-text text-transparent">
                  Honest Pricing.
                </span>
              </h1>

              <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-xl font-normal">
                Karnataka&apos;s premier intercity chauffeur cab service. Travel smoothly across Mangalore, Bangalore, Mysore, Coorg, Chikmagalur & Western Ghats with verified commercial drivers, zero surge pricing, and 20% advance booking.
              </p>

              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-800">
                <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 backdrop-blur-xs">
                  <div className="text-2xl font-black text-orange-400">0%</div>
                  <div className="text-xs text-slate-300 mt-0.5 font-medium">Surge Pricing</div>
                </div>
                <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 backdrop-blur-xs">
                  <div className="text-2xl font-black text-orange-400">4.9 ★</div>
                  <div className="text-xs text-slate-300 mt-0.5 font-medium">50k+ Happy Trips</div>
                </div>
                <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 backdrop-blur-xs">
                  <div className="text-2xl font-black text-orange-400">20%</div>
                  <div className="text-xs text-slate-300 mt-0.5 font-medium">Advance Only</div>
                </div>
              </div>
            </div>

            {/* Right Column: Option A Scenic Mountain Drive Visual Card */}
            <div className="col-span-6 relative pb-6 sm:pb-8">
              <div className="relative rounded-3xl shadow-2xl border-2 border-slate-800/80 group">
                {/* Mountain Drive Road Background Image */}
                <div className="relative rounded-[22px] overflow-hidden min-h-[340px] sm:min-h-[400px]">
                  <Image
                    src="/images/hero-mountain-road.webp"
                    alt="Kandy Cabs Scenic Western Ghats Mountain Highway"
                    width={800}
                    height={400}
                    priority
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="w-full h-[340px] sm:h-[400px] object-cover object-center group-hover:scale-105 transition-transform duration-700"
                  />
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent pointer-events-none" />

                  {/* Animated Fleet Slider (Coming Smoothly on the Mountain Road) */}
                  <div className="absolute inset-0 flex items-end justify-end pr-2 sm:pr-6 pointer-events-none pb-1 sm:pb-2 overflow-hidden">
                    {HERO_FLEET_SLIDES.map((slide, idx) => {
                      const isActive = idx === currentFleetSlide;
                      const isExiting = idx === prevFleetSlide;

                      let animClasses = 'opacity-0 -translate-x-full scale-95 pointer-events-none transition-none';
                      if (isActive) {
                        animClasses = 'opacity-100 translate-x-0 scale-100 transition-all duration-1000 ease-out z-10';
                      } else if (isExiting) {
                        animClasses = 'opacity-0 translate-x-full scale-95 pointer-events-none transition-all duration-1000 ease-out z-0';
                      }

                      return (
                        <div
                          key={slide.id}
                          className={`absolute bottom-0 sm:bottom-0.5 right-1 sm:right-4 ${slide.sizeClass || 'w-[74%] sm:w-[70%] max-w-[420px]'} transform ${animClasses}`}
                        >
                          <div className="relative">
                            <Image
                              src={slide.image}
                              alt={slide.name}
                              width={480}
                              height={260}
                              priority={idx === 0}
                              className="w-full h-auto object-contain filter drop-shadow-[0_18px_20px_rgba(0,0,0,0.85)] select-none"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Fleet Info Badge with Centered Book Cab CTA Button at Top Middle Border */}
                <div className="absolute -bottom-5 sm:-bottom-6 left-3 right-3 sm:left-4 sm:right-4 z-30">
                  <div className="relative bg-slate-950/95 backdrop-blur-md border border-slate-800/90 pt-5 pb-3.5 px-4 sm:pt-5.5 sm:pb-4 sm:px-5 rounded-2xl flex items-center justify-between shadow-2xl">
                    {/* Floating Centered Book Cab Button at Top Middle of the Border */}
                    <div className="absolute -top-4 sm:-top-4.5 left-1/2 -translate-x-1/2 z-20">
                      <button
                        type="button"
                        onClick={() => {
                          const slideId = HERO_FLEET_SLIDES[currentFleetSlide]?.id;
                          const cat = slideId ? SLIDE_TO_CATEGORY[slideId] : undefined;
                          scrollToBookingEngine(cat);
                        }}
                        className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-extrabold text-xs sm:text-sm px-5 sm:px-6 py-2 sm:py-2.5 rounded-full shadow-lg shadow-orange-600/40 flex items-center gap-1.5 transition-all transform hover:scale-105 active:scale-95 shrink-0 border border-orange-400/40 cursor-pointer"
                      >
                        <span>Book Cab</span>
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </button>
                    </div>

                    {/* Left: Vehicle Details */}
                    <div className="min-w-0 text-left pr-2">
                      <div className="text-[10px] sm:text-[11px] text-orange-400 font-bold uppercase tracking-wider truncate">
                        {HERO_FLEET_SLIDES[currentFleetSlide]?.name || 'Verified Fleet & Drivers'}
                      </div>
                      <div className="text-xs sm:text-sm font-extrabold text-white mt-0.5 truncate">
                        {HERO_FLEET_SLIDES[currentFleetSlide]?.models || 'Sedan • SUV • Innova Crysta • Tempo'}
                      </div>
                    </div>

                    {/* Right: Starting Price */}
                    <div className="text-right pl-2 shrink-0">
                      <div className="text-[9px] sm:text-[10px] text-slate-400 font-medium">Starting from</div>
                      <div className="text-xs sm:text-sm md:text-base font-black text-orange-400">
                        {HERO_FLEET_SLIDES[currentFleetSlide]?.rate || '₹11 / km'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Floating Main Booking Engine Card */}
      <section id="booking-engine" className="relative mt-6 lg:-mt-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-20 w-full mb-16">
        <div className="bg-white text-slate-900 rounded-3xl shadow-2xl p-4 sm:p-8 border border-slate-200">
          {/* Trip Type / Package Tabs */}
          {/* MOBILE ONLY (<sm): Dynamic sub-tabs for Local, Airport, and Outstation */}
          <div className="sm:hidden">
            {tripType === TripType.LOCAL ? (
              <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-slate-100 rounded-2xl mb-3.5">
                {[
                  { hours: 4, label: '4 hrs (40 km)' },
                  { hours: 8, label: '8 hrs (80 km)' },
                  { hours: 12, label: '12 hrs (120 km)' },
                ].map((pkg) => (
                  <button
                    key={pkg.hours}
                    type="button"
                    onClick={() => {
                      setPackageHours(pkg.hours);
                      setQuoteData(null);
                    }}
                    className={`py-2.5 px-1 rounded-xl text-xs font-bold transition-all text-center ${
                      packageHours === pkg.hours
                        ? 'bg-orange-600 text-white shadow-md shadow-orange-600/25'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    {pkg.label}
                  </button>
                ))}
              </div>
            ) : tripType === TripType.AIRPORT ? (
              <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-slate-100 rounded-2xl mb-3.5">
                {[
                  { type: 'PICKUP' as const, label: 'Pickup (From Airport)' },
                  { type: 'DROP' as const, label: 'Drop (To Airport)' },
                ].map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => handleAirportTransferSelect(item.type)}
                    className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all text-center ${
                      airportTransferType === item.type
                        ? 'bg-orange-600 text-white shadow-md shadow-orange-600/25'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-slate-100 rounded-2xl mb-3.5">
                {[
                  { id: TripType.ONEWAY, label: 'Outstation One-Way' },
                  { id: TripType.ROUND, label: 'Round Trip' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setTripType(t.id);
                      setQuoteData(null);
                    }}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all text-center ${
                      tripType === t.id
                        ? 'bg-orange-600 text-white shadow-md shadow-orange-600/25'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* TABLET, LAPTOP & DESKTOP (>=sm): Always display standard 4 Trip Type tabs */}
          <div className="hidden sm:grid sm:grid-cols-4 gap-2 p-1.5 bg-slate-100 rounded-2xl mb-6">
            {[
              { id: TripType.ONEWAY, label: 'Outstation One-Way' },
              { id: TripType.ROUND, label: 'Round Trip' },
              { id: TripType.AIRPORT, label: 'Airport Taxi' },
              { id: TripType.LOCAL, label: 'Local Rental' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTripType(t.id);
                  setQuoteData(null);
                }}
                className={`py-3 px-3 rounded-xl text-sm font-bold transition-all text-center ${
                  tripType === t.id
                    ? 'bg-orange-600 text-white shadow-md shadow-orange-600/25'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Form Controls */}
          <div className="space-y-3 sm:space-y-4">
            {/* Pickup, Swap & Drop inputs */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-1.5 md:gap-4 items-center relative">
              {/* Pickup Location Trigger */}
              <div className="md:col-span-5">
                <div className="flex justify-between items-center mb-1 sm:mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    {tripType === TripType.AIRPORT
                      ? airportTransferType === 'PICKUP'
                        ? 'Airport Pickup Point'
                        : 'Pickup Location'
                      : 'Pickup Location'}
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
                  className="w-full bg-slate-50 hover:bg-slate-100/90 border border-slate-300 rounded-xl px-3.5 py-2.5 sm:py-3 text-sm font-medium text-slate-900 text-left flex items-center justify-between transition focus:ring-2 focus:ring-orange-500 shadow-2xs group"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="text-base flex-shrink-0">🟢</span>
                    <span className="truncate font-semibold text-slate-900 group-hover:text-orange-600">
                      {pickupAddress}
                    </span>
                  </div>
                  <span className="text-slate-400 text-xs font-bold pl-2 flex-shrink-0">▾</span>
                </button>
              </div>

              {/* 1-Click Interactive Swap Button */}
              <div className="md:col-span-2 flex justify-center -my-2 md:my-0 pt-0 md:pt-5 z-10">
                <button
                  type="button"
                  onClick={handleSwapLocations}
                  className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full md:rounded-xl bg-orange-50 hover:bg-orange-600 text-orange-600 hover:text-white border border-orange-300 hover:border-orange-600 transition flex items-center justify-center font-bold text-xs sm:text-sm md:text-lg shadow-xs group"
                  title="Swap Pickup & Drop Locations"
                >
                  <span className="group-hover:rotate-180 transition-transform duration-300">⇅</span>
                </button>
              </div>

              {/* Drop Destination Trigger */}
              <div className="md:col-span-5">
                <div className="flex justify-between items-center mb-1 sm:mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    {tripType === TripType.LOCAL
                      ? 'Drop / Service Area'
                      : tripType === TripType.AIRPORT
                      ? airportTransferType === 'DROP'
                        ? 'Airport Drop Point'
                        : 'Drop Destination'
                      : 'Drop Destination'}
                  </label>
                  {/* ONLY in Round Trip: + Add Stop button */}
                  {tripType === TripType.ROUND && (
                    <button
                      type="button"
                      onClick={handleAddStop}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-700 hover:text-white bg-orange-100 hover:bg-orange-600 border border-orange-300 px-2 py-0.5 rounded-lg transition duration-150 shadow-xs"
                    >
                      <span className="text-sm font-extrabold leading-none">+</span>
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
                  className="w-full bg-slate-50 hover:bg-slate-100/90 border border-slate-300 rounded-xl px-3.5 py-2.5 sm:py-3 text-sm font-medium text-slate-900 text-left flex items-center justify-between transition focus:ring-2 focus:ring-orange-500 shadow-2xs group"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="text-base flex-shrink-0">🔴</span>
                    <span className="truncate font-semibold text-slate-900 group-hover:text-orange-600">
                      {dropAddress}
                    </span>
                  </div>
                  <span className="text-slate-400 text-xs font-bold pl-2 flex-shrink-0">▾</span>
                </button>
              </div>
            </div>

            {/* ONLY in Round Trip: Multiple Intermediate Stops List */}
            {tripType === TripType.ROUND && stops.length > 0 && (
              <div className="p-3.5 bg-orange-50/70 border border-orange-200/80 rounded-2xl space-y-3">
                <div className="flex justify-between items-center text-xs font-bold text-orange-950">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-orange-600"></span>
                    Multiple Route Stops ({stops.length})
                  </span>
                  <span className="text-[11px] font-normal text-slate-600">
                    Chauffeur covers all stops & returns to pickup
                  </span>
                </div>

                <div className="space-y-2.5">
                  {stops.map((stop, index) => (
                    <div
                      key={stop.id}
                      className="p-2.5 bg-white border border-orange-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center gap-2.5 shadow-xs"
                    >
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="w-5 h-5 rounded-full bg-orange-600 text-white font-black text-[10px] flex items-center justify-center">
                          {index + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-700 whitespace-nowrap">
                          Via Stop {index + 1}:
                        </span>
                      </div>

                      <div className="flex-1 w-full">
                        <button
                          type="button"
                          onClick={() => {
                            setLocationModalTarget(stop.id);
                            setLocationModalOpen(true);
                          }}
                          className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 text-left flex items-center justify-between transition"
                        >
                          <span className="truncate">{stop.address}</span>
                          <span className="text-slate-400 text-[10px] font-bold pl-1">▾</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveStop(stop.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition flex items-center gap-1 text-xs font-bold self-end sm:self-center"
                        title="Remove this stop"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span className="sm:hidden text-[11px]">Remove</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Date, Time & Trip Specifics */}
            <div
              className={`grid gap-3 sm:gap-4 ${
                tripType === TripType.ROUND
                  ? 'grid-cols-2 sm:grid-cols-3'
                  : tripType === TripType.LOCAL
                  ? 'grid-cols-1 sm:grid-cols-3'
                  : 'grid-cols-1 sm:grid-cols-2'
              }`}
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Pickup Date
                </label>
                <input
                  type="date"
                  value={scheduledDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => {
                    setScheduledDate(e.target.value);
                    setQuoteData(null);
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              {tripType === TripType.ROUND && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Duration (Days)
                  </label>
                  <select
                    value={durationDays}
                    onChange={(e) => {
                      setDurationDays(Number(e.target.value));
                      setQuoteData(null);
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  >
                    {[1, 2, 3, 4, 5, 7, 10].map((d) => (
                      <option key={d} value={d}>
                        {d} {d === 1 ? 'Day' : 'Days'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {tripType === TripType.LOCAL && (
                <div className="hidden sm:block">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Package Hours
                  </label>
                  <select
                    value={packageHours}
                    onChange={(e) => {
                      setPackageHours(Number(e.target.value));
                      setQuoteData(null);
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  >
                    <option value={4}>4 Hours (40 km)</option>
                    <option value={8}>8 Hours (80 km)</option>
                    <option value={12}>12 Hours (120 km)</option>
                  </select>
                </div>
              )}

              <div className={tripType === TripType.ROUND ? 'col-span-2 sm:col-span-1' : ''}>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Pickup Time
                </label>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => {
                    setScheduledTime(e.target.value);
                    setQuoteData(null);
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Estimate Result Box (if fetched) */}
            {quoteData && (
              <div className="mt-4 p-4 rounded-2xl bg-orange-50 border border-orange-200">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-orange-900 bg-orange-200/80 px-2 py-0.5 rounded">
                      Calculated Distance: {quoteData.distanceKm} km
                    </span>
                  </div>
                  <span className="text-xs text-slate-600 font-medium">Includes 5% GST & Driver Allowance</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {quoteData.quotes.map((q) => {
                    const isSelected = selectedCategory === q.category;
                    return (
                      <div
                        key={q.category}
                        onClick={() => setSelectedCategory(q.category)}
                        className={`p-2.5 rounded-xl border cursor-pointer transition text-center ${
                          isSelected
                            ? 'bg-orange-600 text-white border-orange-700 shadow-sm font-bold'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-orange-400'
                        }`}
                      >
                        <div className="text-xs font-bold truncate">{q.name}</div>
                        <div className="text-sm font-extrabold mt-1">₹{q.pricing.totalFare}</div>
                        <div className={`text-[10px] ${isSelected ? 'text-orange-100' : 'text-slate-500'}`}>
                          Advance: ₹{q.pricing.advanceAmount}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 pt-3 border-t border-orange-200 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleStartBooking()}
                    className="w-full sm:w-auto py-2.5 px-6 bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs sm:text-sm rounded-xl transition shadow-md shadow-orange-600/25 flex items-center justify-center gap-1.5"
                  >
                    <span>Proceed to Book {quoteData.quotes.find((q) => q.category === selectedCategory)?.name || 'Cab'} →</span>
                  </button>
                </div>
              </div>
            )}

            {quoteError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                ⚠️ {quoteError}
              </div>
            )}

            {/* Action CTA Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => handleStartBooking()}
                className="w-full py-3.5 px-4 bg-orange-600 hover:bg-orange-700 text-white font-black text-sm sm:text-base rounded-xl transition shadow-lg shadow-orange-600/25 flex items-center justify-center gap-2"
              >
                <span>⚡ Explore Cabs</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Fleet & Live Rates Showcase */}
      <section id="fleet" className="py-10 sm:py-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12">
          <span className="text-xs font-extrabold uppercase tracking-widest text-orange-600 bg-orange-50 border border-orange-200 px-3 py-1 rounded-full">
            Our Vehicle Fleet
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mt-3">
            Choose Your Travel Comfort
          </h2>
          <p className="text-slate-600 text-base mt-2">
            Every vehicle is thoroughly sanitized, GPS enabled, AC equipped, and driven by experienced commercial chauffeurs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {FLEET_DATA.map((car) => (
            <div
              key={car.category}
              className={`bg-white rounded-3xl border-2 ${car.cardBorder} overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition duration-300 flex flex-col justify-between group`}
            >
              <div className={`p-4 sm:p-5 ${car.cardHeaderGradient}`}>
                {/* Header Badge & Rate */}
                <div className="flex justify-between items-start mb-2">
                  <span className={`${car.badgeBg} text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full flex items-center gap-1.5 shadow-xs`}>
                    {car.badgeIcon}
                    <span>{car.badge}</span>
                  </span>
                  <div className="text-right">
                    <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{car.ratePerKm}</span>
                    <span className={`block text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md mt-0.5 ${car.rateBadge}`}>
                      BASE OUTSTATION RATE
                    </span>
                  </div>
                </div>

                {/* Car Image Showcase */}
                <div className="relative py-1 flex items-center justify-center min-h-[110px] sm:min-h-[125px]">
                  <div className="absolute inset-x-8 bottom-1.5 h-3.5 bg-slate-400/20 rounded-full blur-md" />
                  <Image
                    src={car.image}
                    alt={car.name}
                    width={260}
                    height={130}
                    className="relative z-10 h-24 sm:h-28 w-auto max-w-[90%] object-contain drop-shadow-md group-hover:scale-105 transition-transform duration-300 pointer-events-none"
                  />
                </div>

                {/* Icon & Vehicle Model */}
                <div className="flex items-center gap-3 mb-2.5 sm:mb-3">
                  <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${car.iconBg} flex items-center justify-center shrink-0`}>
                    {car.icon}
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-tight">{car.name}</h3>
                    <p className="text-[11px] sm:text-xs text-slate-500 font-medium">{car.models}</p>
                  </div>
                </div>

                {/* Highlight Description Box */}
                <p className={`text-[11px] sm:text-xs ${car.idealForBg} px-3 py-2 rounded-xl mb-3 sm:mb-3.5 font-medium leading-relaxed`}>
                  {car.idealFor}
                </p>

                {/* Features List with Themed Checkmarks */}
                <div className="space-y-1.5 sm:space-y-2 text-[11px] sm:text-xs text-slate-700 font-medium">
                  <div className="flex items-center gap-2">
                    <span className={`${car.checkColor} font-black text-xs sm:text-sm`}>✓</span>
                    <span>{car.capacity}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`${car.checkColor} font-black text-xs sm:text-sm`}>✓</span>
                    <span>{car.luggage}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`${car.checkColor} font-black text-xs sm:text-sm`}>✓</span>
                    <span>Air Conditioned & Clean Interiors</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`${car.checkColor} font-black text-xs sm:text-sm`}>✓</span>
                    <span>Real-time GPS Tracking + OTP Gate</span>
                  </div>
                </div>
              </div>

              {/* Bottom Action Button */}
              <div className="p-4 sm:p-5 pt-0 bg-white">
                <button
                  type="button"
                  onClick={() => handleStartBooking(car.category)}
                  className="w-full py-2.5 sm:py-3 bg-[#0f172a] hover:bg-[#1e293b] text-white font-bold text-xs sm:text-sm rounded-xl transition duration-200 flex items-center justify-center gap-2 shadow-sm"
                >
                  <span>Book {car.name}</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Why Choose Kandy Cabs */}
      <section id="why-kandy" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-extrabold uppercase tracking-widest text-orange-600 bg-orange-50 border border-orange-200 px-3 py-1 rounded-full">
            Our Commitment
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mt-3">
            Why Travelers Choose Kandy Cabs
          </h2>
          <p className="text-slate-600 text-base mt-2">
            Engineered for reliability, safety, and transparent customer-first service.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* 1. Zero Surge Guarantee */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-amber-200/90 hover:border-amber-400 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
            <div>
              <div className="flex items-start gap-3 mb-2.5 sm:mb-3">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 border border-orange-200/80 flex items-center justify-center text-orange-600 shadow-xs shrink-0">
                  <svg className="w-5 h-5 sm:w-5.5 sm:h-5.5 fill-orange-500 stroke-orange-600" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="#f97316" stroke="#ea580c" />
                    <path d="M9 12l2 2 4-4" fill="none" stroke="#ffffff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug">Zero Surge Guarantee</h3>
                  <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed mt-1 font-normal">
                    No rain surges, peak hour spikes, or last-minute extortion. You pay exact per-km rates calculated server-side with standard 5% GST.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 pt-2.5 sm:pt-3 mt-2 border-t border-slate-100">
              <span className="bg-orange-50/90 text-orange-700 border border-orange-200/80 text-[10px] sm:text-[11px] font-bold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full flex items-center gap-1.5 shadow-2xs">
                <svg className="w-3 h-3 fill-orange-600" viewBox="0 0 24 24">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="M9 12l2 2 4-4" fill="none" stroke="#ffffff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Fair Pricing. Always.</span>
              </span>
              <div className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-full border border-orange-200 bg-white text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition flex items-center justify-center font-bold text-xs shadow-2xs shrink-0">
                →
              </div>
            </div>
          </div>

          {/* 2. 4-Digit Security OTP */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-sky-200/90 hover:border-sky-400 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
            <div>
              <div className="flex items-start gap-3 mb-2.5 sm:mb-3">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-br from-sky-100 to-blue-100 border border-sky-200/80 flex items-center justify-center text-sky-600 shadow-xs shrink-0">
                  <svg className="w-5 h-5 sm:w-5.5 sm:h-5.5" viewBox="0 0 24 24" fill="#0284c7">
                    <rect x="5" y="11" width="14" height="10" rx="3" fill="#0284c7" />
                    <path d="M8 11V7a4 4 0 0 1 8 0v4" fill="none" stroke="#0284c7" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="12" cy="16" r="1.5" fill="#ffffff" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug">4-Digit Security OTP</h3>
                  <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed mt-1 font-normal">
                    Trips only start when you provide your secret 4-digit pickup OTP to the assigned chauffeur. Driver phone number is unlocked upon dispatch.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 pt-2.5 sm:pt-3 mt-2 border-t border-slate-100">
              <span className="bg-sky-50/90 text-sky-700 border border-sky-200/80 text-[10px] sm:text-[11px] font-bold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full flex items-center gap-1.5 shadow-2xs">
                <svg className="w-3 h-3 fill-sky-600" viewBox="0 0 24 24">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="M9 12l2 2 4-4" fill="none" stroke="#ffffff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Your Safety Comes First</span>
              </span>
              <div className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-full border border-sky-200 bg-white text-sky-600 group-hover:bg-sky-600 group-hover:text-white transition flex items-center justify-center font-bold text-xs shadow-2xs shrink-0">
                →
              </div>
            </div>
          </div>

          {/* 3. 20% Advance Booking */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-emerald-200/90 hover:border-emerald-400 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
            <div>
              <div className="flex items-start gap-3 mb-2.5 sm:mb-3">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 border border-emerald-200/80 flex items-center justify-center text-emerald-600 shadow-xs shrink-0">
                  <svg className="w-5 h-5 sm:w-5.5 sm:h-5.5" viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="5" width="20" height="14" rx="3" fill="#059669" />
                    <rect x="2" y="8.5" width="20" height="3" fill="#047857" />
                    <circle cx="6" cy="15" r="1.5" fill="#a7f3d0" />
                    <rect x="10" y="14" width="8" height="2" rx="1" fill="#a7f3d0" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug">20% Advance Booking</h3>
                  <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed mt-1 font-normal">
                    Lock in your vehicle with only a 20% advance payment via Razorpay / UPI. Pay the balance directly to the driver or upon trip completion.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 pt-2.5 sm:pt-3 mt-2 border-t border-slate-100">
              <span className="bg-emerald-50/90 text-emerald-700 border border-emerald-200/80 text-[10px] sm:text-[11px] font-bold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full flex items-center gap-1.5 shadow-2xs">
                <span className="font-extrabold text-xs">₹</span>
                <span>Easy & Secure Payments</span>
              </span>
              <div className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-full border border-emerald-200 bg-white text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition flex items-center justify-center font-bold text-xs shadow-2xs shrink-0">
                →
              </div>
            </div>
          </div>

          {/* 4. Verified Chauffeurs */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-indigo-200/90 hover:border-indigo-400 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
            <div>
              <div className="flex items-start gap-3 mb-2.5 sm:mb-3">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 border border-indigo-200/80 flex items-center justify-center text-indigo-700 shadow-xs shrink-0">
                  <svg className="w-5 h-5 sm:w-5.5 sm:h-5.5" viewBox="0 0 24 24" fill="#4338ca">
                    <path d="M12 2C8.5 2 6 4 6 5.5c0 .4.2.8.5 1.1L3 8.5c-.6.4-.4 1.5.3 1.5h17.4c.7 0 .9-1.1.3-1.5L17.5 6.6c.3-.3.5-.7.5-1.1C18 4 15.5 2 12 2z" />
                    <circle cx="12" cy="12" r="3.5" fill="#4338ca" />
                    <path d="M4 21c0-3.5 3.5-5.5 8-5.5s8 2 8 5.5v1H4v-1z" fill="#4338ca" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug">Verified Chauffeurs</h3>
                  <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed mt-1 font-normal">
                    All chauffeurs are background-verified, licensed for commercial passenger transport, and trained in polite highway etiquette.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 pt-2.5 sm:pt-3 mt-2 border-t border-slate-100">
              <span className="bg-indigo-50/90 text-indigo-700 border border-indigo-200/80 text-[10px] sm:text-[11px] font-bold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full flex items-center gap-1.5 shadow-2xs">
                <svg className="w-3 h-3 fill-indigo-600" viewBox="0 0 24 24">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="M9 12l2 2 4-4" fill="none" stroke="#ffffff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Trusted. Trained. Professional.</span>
              </span>
              <div className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-full border border-indigo-200 bg-white text-indigo-700 group-hover:bg-indigo-700 group-hover:text-white transition flex items-center justify-center font-bold text-xs shadow-2xs shrink-0">
                →
              </div>
            </div>
          </div>

          {/* 5. Official GST Invoices */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-rose-200/90 hover:border-rose-400 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
            <div>
              <div className="flex items-start gap-3 mb-2.5 sm:mb-3">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-br from-rose-100 to-red-100 border border-rose-200/80 flex items-center justify-center text-rose-600 shadow-xs shrink-0">
                  <svg className="w-5 h-5 sm:w-5.5 sm:h-5.5" viewBox="0 0 24 24" fill="none">
                    <path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill="#e11d48" />
                    <path d="M14 2v6h6" fill="#be123c" />
                    <rect x="7" y="11" width="10" height="2" rx="1" fill="#fecdd3" />
                    <rect x="7" y="15" width="7" height="2" rx="1" fill="#fecdd3" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug">Official GST Invoices</h3>
                  <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed mt-1 font-normal">
                    Download structured, printable GST tax invoices directly from your dashboard for corporate reimbursements and tax compliance.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 pt-2.5 sm:pt-3 mt-2 border-t border-slate-100">
              <span className="bg-rose-50/90 text-rose-700 border border-rose-200/80 text-[10px] sm:text-[11px] font-bold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full flex items-center gap-1.5 shadow-2xs">
                <svg className="w-3 h-3 fill-rose-600" viewBox="0 0 24 24">
                  <path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
                </svg>
                <span>100% Genuine & Compliant</span>
              </span>
              <div className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-full border border-rose-200 bg-white text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition flex items-center justify-center font-bold text-xs shadow-2xs shrink-0">
                →
              </div>
            </div>
          </div>

          {/* 6. Live Dual-Tier Tracking */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-teal-200/90 hover:border-teal-400 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
            <div>
              <div className="flex items-start gap-3 mb-2.5 sm:mb-3">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-br from-teal-100 to-cyan-100 border border-teal-200/80 flex items-center justify-center text-teal-600 shadow-xs shrink-0">
                  <svg className="w-5 h-5 sm:w-5.5 sm:h-5.5" viewBox="0 0 24 24" fill="#0d9488">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#0d9488" />
                    <circle cx="12" cy="9" r="2.5" fill="#ffffff" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug">Live Dual-Tier Tracking</h3>
                  <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed mt-1 font-normal">
                    Real-time GPS visibility ensures your family can track your journey securely while the driver navigates straight to your doorstep.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 pt-2.5 sm:pt-3 mt-2 border-t border-slate-100">
              <span className="bg-teal-50/90 text-teal-700 border border-teal-200/80 text-[10px] sm:text-[11px] font-bold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full flex items-center gap-1.5 shadow-2xs">
                <svg className="w-3 h-3 fill-teal-600" viewBox="0 0 24 24">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                </svg>
                <span>Track. Stay Informed. Travel Confidently.</span>
              </span>
              <div className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-full border border-teal-200 bg-white text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition flex items-center justify-center font-bold text-xs shadow-2xs shrink-0">
                →
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. How It Works Section */}
      <section id="how-it-works" className="py-10 sm:py-14 bg-slate-50/80 border-t border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-8 sm:mb-10">
            <span className="text-xs font-extrabold tracking-wider uppercase text-orange-600">
              — SIMPLE &amp; EASY
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight mt-1.5">
              How <span className="text-orange-600">Booking</span> Works
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-1.5 font-normal">
              Just a few simple steps and you&apos;re on your way. Fast, secure and hassle-free!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            {/* Step 01 */}
            <div className="bg-white rounded-2xl p-3.5 sm:p-4 border-2 border-orange-100 border-l-[4px] border-l-orange-500 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-full bg-orange-600 text-white font-black text-xs sm:text-sm flex items-center justify-center shadow-xs shadow-orange-600/20 shrink-0">
                    01
                  </div>
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-orange-50/80 border border-orange-100 flex items-center justify-center relative shrink-0">
                    <svg className="w-5 h-5 sm:w-5.5 sm:h-5.5" viewBox="0 0 48 48" fill="none">
                      <path d="M6 10L18 6L30 10L42 6V38L30 42L18 38L6 42V10Z" fill="#fff7ed" stroke="#fdba74" strokeWidth="2" strokeLinejoin="round" />
                      <path d="M14 26C18 20 22 28 28 20C32 15 36 24 36 24" stroke="#f97316" strokeWidth="2.5" strokeDasharray="3 3" strokeLinecap="round" />
                      <circle cx="14" cy="26" r="3.5" fill="#ea580c" />
                      <circle cx="14" cy="26" r="1.5" fill="#ffffff" />
                      <circle cx="36" cy="24" r="3.5" fill="#2563eb" />
                      <circle cx="36" cy="24" r="1.5" fill="#ffffff" />
                    </svg>
                  </div>
                </div>

                <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight mt-2.5 sm:mt-3 leading-snug">
                  Select Trip &amp; Route
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 leading-normal mt-1 font-normal">
                  Choose One-Way, Round Trip, Airport or Hourly rental and see instant fare estimates.
                </p>
              </div>

              <div className="flex items-center justify-between gap-1.5 pt-2 sm:pt-2.5 mt-2.5 border-t border-slate-100">
                <div className="bg-orange-50/90 text-slate-700 border border-orange-200/80 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold flex items-center gap-1 flex-wrap">
                  <span>🚗 One Way</span>
                  <span>🔄 Round Trip</span>
                  <span>✈ Airport</span>
                  <span>⏱ Hourly</span>
                </div>
                <div className="w-6 h-6 sm:w-6.5 sm:h-6.5 rounded-full bg-orange-600 text-white flex items-center justify-center font-bold text-[10px] shadow-xs shadow-orange-600/20 group-hover:scale-110 transition shrink-0">
                  →
                </div>
              </div>
            </div>

            {/* Step 02 */}
            <div className="bg-white rounded-2xl p-3.5 sm:p-4 border-2 border-blue-100 border-l-[4px] border-l-blue-600 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-black text-xs sm:text-sm flex items-center justify-center shadow-xs shadow-blue-600/20 shrink-0">
                    02
                  </div>
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-50/80 border border-blue-100 flex items-center justify-center relative shrink-0">
                    <svg className="w-5 h-5 sm:w-5.5 sm:h-5.5" viewBox="0 0 48 48" fill="none">
                      <rect x="12" y="6" width="24" height="36" rx="5" fill="#eff6ff" stroke="#93c5fd" strokeWidth="2" />
                      <rect x="16" y="12" width="16" height="12" rx="2" fill="#dbeafe" />
                      <circle cx="34" cy="34" r="7.5" fill="#0284c7" />
                      <path d="M31 34L33 36L37 32" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>

                <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight mt-2.5 sm:mt-3 leading-snug">
                  Pay 20% Advance
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 leading-normal mt-1 font-normal">
                  Confirm your ride securely with UPI / Card advance. Instantly receive your Booking ID.
                </p>
              </div>

              <div className="flex items-center justify-between gap-1.5 pt-2 sm:pt-2.5 mt-2.5 border-t border-slate-100">
                <div className="bg-blue-50 text-blue-800 border border-blue-200/80 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold flex items-center gap-1">
                  <svg className="w-2.5 h-2.5 fill-blue-600" viewBox="0 0 24 24">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="M9 12l2 2 4-4" fill="none" stroke="#ffffff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>Secure &amp; Trusted</span>
                </div>
                <div className="w-6 h-6 sm:w-6.5 sm:h-6.5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shadow-xs shadow-blue-600/20 group-hover:scale-110 transition shrink-0">
                  →
                </div>
              </div>
            </div>

            {/* Step 03 */}
            <div className="bg-white rounded-2xl p-3.5 sm:p-4 border-2 border-emerald-100 border-l-[4px] border-l-emerald-600 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-black text-xs sm:text-sm flex items-center justify-center shadow-xs shadow-emerald-600/20 shrink-0">
                    03
                  </div>
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-50/80 border border-emerald-100 flex items-center justify-center relative shrink-0">
                    <svg className="w-5 h-5 sm:w-5.5 sm:h-5.5" viewBox="0 0 48 48" fill="none">
                      <path d="M24 10C20 10 17 12 17 14c0 .4.2.8.5 1.1L14 17c-.6.4-.4 1.5.3 1.5h19.4c.7 0 .9-1.1.3-1.5l-3.5-1.9c.3-.3.5-.7.5-1.1 0-2-3-4-7-4z" fill="#047857" />
                      <circle cx="24" cy="22" r="4.5" fill="#047857" />
                      <path d="M14 34c0-4 4.5-6.5 10-6.5s10 2.5 10 6.5v2H14v-2z" fill="#047857" />
                      <path d="M34 38s6-3 6-7.5V25l-6-2.5-6 2.5v5.5c0 4.5 6 7.5 6 7.5z" fill="#059669" />
                      <path d="M31.5 30.5L33.5 32.5L36.5 28.5" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>

                <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight mt-2.5 sm:mt-3 leading-snug">
                  Driver Match &amp; OTP
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 leading-normal mt-1 font-normal">
                  Get assigned chauffeur details and share your 4-digit pickup OTP only when the car arrives.
                </p>
              </div>

              <div className="flex items-center justify-between gap-1.5 pt-2 sm:pt-2.5 mt-2.5 border-t border-slate-100">
                <div className="bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold flex items-center gap-1">
                  <span>📱</span>
                  <span>4-Digit OTP Gate</span>
                </div>
                <div className="w-6 h-6 sm:w-6.5 sm:h-6.5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px] shadow-xs shadow-emerald-600/20 group-hover:scale-110 transition shrink-0">
                  →
                </div>
              </div>
            </div>

            {/* Step 04 */}
            <div className="bg-white rounded-2xl p-3.5 sm:p-4 border-2 border-indigo-100 border-l-[4px] border-l-indigo-600 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-black text-xs sm:text-sm flex items-center justify-center shadow-xs shadow-indigo-600/20 shrink-0">
                    04
                  </div>
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-50/80 border border-indigo-100 flex items-center justify-center relative shrink-0">
                    <svg className="w-5 h-5 sm:w-5.5 sm:h-5.5" viewBox="0 0 48 48" fill="none">
                      <rect x="8" y="20" width="32" height="14" rx="4" fill="#6366f1" />
                      <path d="M12 20L15 11H33L36 20" fill="#818cf8" />
                      <circle cx="14" cy="27" r="2.5" fill="#ffffff" />
                      <circle cx="34" cy="27" r="2.5" fill="#ffffff" />
                      <circle cx="37" cy="35" r="7" fill="#4f46e5" />
                      <path d="M34 35L36 37L40 33" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>

                <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight mt-2.5 sm:mt-3 leading-snug">
                  Enjoy Ride &amp; Invoice
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 leading-normal mt-1 font-normal">
                  Enjoy your comfortable ride and download the official tax invoice right upon completion.
                </p>
              </div>

              <div className="flex items-center justify-between gap-1.5 pt-2 sm:pt-2.5 mt-2.5 border-t border-slate-100">
                <div className="bg-indigo-50 text-indigo-800 border border-indigo-200/80 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold flex items-center gap-1">
                  <span>📄</span>
                  <span>GST Invoice</span>
                </div>
                <div className="w-6 h-6 sm:w-6.5 sm:h-6.5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px] shadow-xs shadow-indigo-600/20 group-hover:scale-110 transition shrink-0">
                  →
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Call to Action Banner */}
      <section className="relative overflow-hidden bg-gradient-to-r from-orange-600 via-orange-600 to-amber-600 text-white py-10 sm:py-14 md:py-16 border-t border-orange-500">
        {/* Background Image on Left with Smooth Gradient Transition to Orange */}
        <div className="absolute inset-y-0 left-0 w-full md:w-2/5 overflow-hidden pointer-events-none">
          <Image
            src="/images/cta-scenic-drive.webp"
            alt="Scenic Outstation Highway Drive"
            fill
            sizes="(max-width: 768px) 100vw, 40vw"
            className="w-full h-full object-cover object-left opacity-85 md:opacity-100"
          />
          {/* Smooth Linear Gradient to Orange Content */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-600/60 to-orange-600 md:from-transparent md:via-orange-600/70 md:to-orange-600" />
          <div className="absolute inset-0 bg-gradient-to-t from-orange-600/90 via-transparent to-orange-600/30 md:hidden" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 grid grid-cols-1 md:grid-cols-12 items-center gap-6 md:gap-6 lg:gap-10">
          {/* Left Column Spacer for tablet & desktop so the car is prominently visible on the left */}
          <div className="hidden md:block md:col-span-3 lg:col-span-3" />

          {/* Middle Column Content */}
          <div className="md:col-span-5 lg:col-span-6 text-center md:text-left space-y-3.5">
            <div className="flex items-center justify-center md:justify-start gap-2 text-white/90 font-extrabold text-[10px] sm:text-[11px] tracking-widest uppercase">
              <span>YOUR NEXT JOURNEY AWAITS</span>
              <span className="w-8 h-0.5 bg-white/40 hidden sm:inline-block" />
            </div>

            <h2 className="text-2xl sm:text-3xl md:text-[1.65rem] lg:text-[2.25rem] font-black tracking-tight text-white leading-tight">
              Ready for Your Next <span className="text-slate-950 font-black">Outstation Journey?</span>
            </h2>

            <p className="text-white/90 font-normal text-xs sm:text-sm max-w-lg mx-auto md:mx-0 leading-relaxed">
              Book in under 2 minutes. Transparent pricing, sanitized cars, and dedicated 24/7 support.
            </p>

            <div className="pt-1.5 flex flex-wrap items-center justify-center md:justify-start gap-2.5 sm:gap-3.5">
              <button
                type="button"
                onClick={() => scrollToBookingEngine()}
                className="px-5 sm:px-6 py-2.5 sm:py-3 bg-[#0b1329] hover:bg-slate-900 text-white font-bold text-xs sm:text-sm rounded-xl sm:rounded-2xl shadow-lg transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer shrink-0"
              >
                <svg className="w-4 h-4 text-white shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="9" rx="3" />
                  <path d="M5 11l2-6h10l2 6" />
                  <circle cx="7" cy="15.5" r="1.5" />
                  <circle cx="17" cy="15.5" r="1.5" />
                  <path d="M10 15.5h4" />
                </svg>
                <span className="whitespace-nowrap">Book Your Cab Now</span>
                <span>→</span>
              </button>
              <a
                href="tel:+919876543210"
                className="px-5 sm:px-6 py-2.5 sm:py-3 bg-white hover:bg-slate-50 text-slate-900 font-bold text-xs sm:text-sm rounded-xl sm:rounded-2xl shadow-lg transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer shrink-0"
              >
                <svg className="w-4 h-4 text-orange-600 fill-orange-600 shrink-0" viewBox="0 0 24 24">
                  <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.57a1 1 0 01-.24 1.02l-2.21 2.2z" />
                </svg>
                <span className="whitespace-nowrap">Call Support (+91 98765 43210)</span>
              </a>
            </div>
          </div>

          {/* Right Column Value Props with vertical divider */}
          <div className="md:col-span-4 lg:col-span-3 border-t md:border-t-0 md:border-l border-white/25 pt-5 md:pt-0 md:pl-5 lg:pl-8 space-y-3.5">
            {/* Value Prop 1 */}
            <div className="flex items-center gap-3 text-left">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-white shrink-0">
                <svg className="w-4.5 h-4.5 sm:w-5 sm:h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="M9 12l2 2 4-4" fill="none" stroke="#f97316" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <div className="text-white font-bold text-xs sm:text-sm leading-snug">Safe &amp; Sanitized Vehicles</div>
                <div className="text-white/75 text-[10.5px] sm:text-[11px]">Your safety is our priority</div>
              </div>
            </div>

            {/* Value Prop 2 */}
            <div className="flex items-center gap-3 text-left">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-white shrink-0">
                <svg className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <circle cx="12" cy="12" r="9" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 3" />
                </svg>
              </div>
              <div>
                <div className="text-white font-bold text-xs sm:text-sm leading-snug">24/7 Customer Support</div>
                <div className="text-white/75 text-[10.5px] sm:text-[11px]">Always here for you</div>
              </div>
            </div>

            {/* Value Prop 3 */}
            <div className="flex items-center gap-3 text-left">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-white shrink-0">
                <svg className="w-4.5 h-4.5 sm:w-5 sm:h-5 fill-current text-white" viewBox="0 0 24 24">
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                </svg>
              </div>
              <div>
                <div className="text-white font-bold text-xs sm:text-sm leading-snug">Trusted by 10,000+ Customers</div>
                <div className="text-white/75 text-[10.5px] sm:text-[11px]">Rides you can rely on</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Footer */}
      <footer className="bg-slate-950 text-slate-400 pt-16 pb-20 sm:pb-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10 mb-12">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="bg-white rounded-xl p-2 inline-block">
                  <Image
                    src="/images/logo.webp"
                    alt="Kandy Cabs"
                    width={150}
                    height={40}
                    className="h-10 w-auto object-contain"
                  />
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Karnataka’s premier chauffeur-driven taxi service. Specializing in outstation round-trips, one-way drops, and airport transfers.
              </p>
              <div className="text-xs font-mono text-orange-400">
                Support: support@kandycabs.com
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Quick Links</h4>
              <ul className="space-y-2 text-xs">
                <li><Link href="/booking" className="hover:text-orange-400 transition">Book Online</Link></li>
                <li><Link href="/customer/dashboard" className="hover:text-orange-400 transition">Customer Dashboard</Link></li>
                <li><a href="#fleet" className="hover:text-orange-400 transition">Vehicle Fleet & Per-Km Rates</a></li>
                <li><a href="#why-kandy" className="hover:text-orange-400 transition">Why Choose Kandy Cabs</a></li>
                <li><a href="http://localhost:3001" target="_blank" rel="noopener noreferrer" className="hover:text-orange-400 transition text-orange-400 font-semibold">Admin Dispatch Portal ↗</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Security & Trust</h4>
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                  <span className="text-orange-400 font-bold block mb-1">Razorpay Verified</span>
                  <span className="text-[11px] text-slate-400">256-bit SSL encrypted advance payments and instant refunds.</span>
                </div>
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                  <span className="text-emerald-400 font-bold block mb-1">Live GPS & OTP Safety</span>
                  <span className="text-[11px] text-slate-400">Dual-tier location streaming and driver verification.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-900 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500">
            <div>
              © {new Date().getFullYear()} Kandy Cabs India. All rights reserved.
            </div>
            <div className="flex gap-6">
              <span>Privacy Policy</span>
              <span>Terms of Service</span>
              <span>Refund Policy</span>
              <span>Driver Onboarding</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Customer Sign In / Sign Up Modal */}
      {authModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full p-4 sm:p-7 shadow-2xl space-y-3.5 sm:space-y-5 border border-slate-100 animate-fade-in relative max-h-[92vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setAuthModalOpen(false)}
              className="absolute top-3.5 right-3.5 sm:top-5 sm:right-5 text-slate-400 hover:text-slate-700 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition text-base sm:text-lg font-bold"
            >
              ✕
            </button>

            <div className="text-center space-y-0.5 sm:space-y-1">
              <Image
                src="/images/logo.webp"
                alt="Kandy Cabs"
                width={140}
                height={44}
                className="h-8 sm:h-11 w-auto object-contain mx-auto mb-1.5 sm:mb-2"
              />
              <h3 className="text-lg sm:text-xl font-black text-slate-900">
                {authStep === 'PHONE' ? 'Sign In / Register' : 'Enter Verification Code'}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500">
                {authStep === 'PHONE'
                  ? 'Access your booking history, live driver tracking and invoices'
                  : `We sent a 4-digit code to +91 ${authPhone}`}
              </p>
            </div>

            {authError && (
              <div className="p-2.5 sm:p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
                ⚠️ {authError}
              </div>
            )}

            {authStep === 'PHONE' ? (
              <form onSubmit={handleAuthSendOtp} className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 sm:mb-1.5">
                    10-Digit Mobile Number *
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 sm:px-3.5 rounded-l-xl border border-r-0 border-slate-300 bg-slate-100 text-slate-700 text-sm font-bold">
                      +91
                    </span>
                    <input
                      type="tel"
                      maxLength={10}
                      required
                      autoFocus
                      value={authPhone}
                      onChange={(e) => setAuthPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="9876543210"
                      className="w-full rounded-r-xl border border-slate-300 px-3 sm:px-3.5 py-2 sm:py-2.5 text-sm text-slate-800 font-bold focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:outline-none transition tracking-wider"
                    />
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1">We will send a 4-digit OTP to verify your account</p>
                </div>

                <button
                  type="submit"
                  disabled={authLoading || authPhone.length !== 10}
                  className="w-full py-2.5 sm:py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-md shadow-orange-600/20 disabled:opacity-50 transition flex items-center justify-center gap-2"
                >
                  {authLoading ? 'Sending OTP...' : 'Send Verification OTP →'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleAuthVerifyOtp} className="space-y-3 sm:space-y-4">
                {isRegistered ? (
                  existingRoles.includes('DRIVER') ? (
                    <div className="p-2.5 sm:p-3.5 bg-orange-50 border border-orange-300 rounded-xl sm:rounded-2xl space-y-1.5 sm:space-y-2">
                      <div className="flex items-center gap-2 sm:gap-2.5">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-orange-600 text-white font-black flex items-center justify-center text-xs sm:text-sm shadow-xs flex-shrink-0">
                          🚕
                        </div>
                        <div>
                          <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-orange-900 bg-orange-200/80 px-1.5 sm:px-2 py-0.5 rounded inline-block">
                            Registered Driver Partner
                          </div>
                          <div className="text-xs sm:text-sm font-extrabold text-slate-900 mt-0.5">
                            Welcome back, {existingName || 'Driver Partner'}!
                          </div>
                        </div>
                      </div>
                      <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
                        To receive live trip requests & toggle duty status, please use the <strong>Kandy Driver App</strong>. You can also continue below to book cabs as a customer.
                      </p>
                      <div className="pt-0.5 flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <button
                          type="button"
                          onClick={() => setDriverAppModalOpen(true)}
                          className="text-xs bg-orange-600 hover:bg-orange-700 text-white font-bold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg transition shadow-xs flex items-center gap-1"
                        >
                          <span>📲 Get Driver App</span>
                        </button>
                        <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium">or continue as customer below</span>
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
                    <div className="p-2.5 sm:p-3 bg-orange-50 border border-orange-200 rounded-xl">
                      <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-orange-800">
                        New Customer Registration
                      </div>
                      <p className="text-[11px] sm:text-xs text-orange-700 mt-0.5">
                        Please enter your full name to complete your profile setup.
                      </p>
                    </div>

                    <div>
                      <label className="block text-[11px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 sm:mb-1.5">
                        Your Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={authFullName}
                        onChange={(e) => setAuthFullName(e.target.value)}
                        placeholder="e.g. Rachel Sharma"
                        className="w-full rounded-xl border border-slate-300 px-3 sm:px-3.5 py-2 sm:py-2.5 text-sm text-slate-800 font-medium focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:outline-none transition"
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
                      onClick={() => setAuthStep('PHONE')}
                      className="text-[10px] sm:text-xs font-semibold text-orange-600 hover:text-orange-800 underline transition truncate"
                    >
                      Change (+91 {authPhone})
                    </button>
                  </div>
                  <input
                    type="text"
                    maxLength={4}
                    autoFocus={isRegistered}
                    value={authOtp}
                    onChange={(e) => setAuthOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    className="w-full text-center text-2xl sm:text-3xl tracking-[0.4em] sm:tracking-[0.5em] font-mono font-black rounded-xl border border-slate-300 py-2 sm:py-3 text-slate-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:outline-none transition bg-slate-50"
                  />
                  {authDebugOtp && (
                    <div className="mt-1.5 sm:mt-2 text-center">
                      <span className="inline-flex items-center gap-1.5 bg-orange-100 border border-orange-300 text-orange-900 text-[11px] sm:text-xs font-bold px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full">
                        <span>⚡ Dev Code: {authDebugOtp}</span>
                        <span className="text-[9px] sm:text-[10px] font-normal text-orange-700">(Auto-filled)</span>
                      </span>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={authLoading || authOtp.length !== 4 || (!isRegistered && !authFullName.trim())}
                  className="w-full py-2.5 sm:py-3 rounded-xl bg-orange-600 text-white font-bold text-sm sm:text-base hover:bg-orange-700 transition shadow-md shadow-orange-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {authLoading
                    ? 'Verifying...'
                    : existingRoles.includes('DRIVER')
                    ? 'Verify & Continue as Customer →'
                    : 'Verify & Continue →'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

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

      {/* Mobile-Only Fixed Bottom Trip-Type Navigation Bar (Visible only when scrolling down) */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200 py-1.5 px-3 sm:hidden shadow-[0_-4px_24px_rgba(0,0,0,0.1)] transition-all duration-300 ease-in-out transform ${
          showMobileDock
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : 'translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="grid grid-cols-4 gap-1.5 items-center">
          {[
            {
              id: TripType.ONEWAY,
              label: 'ONE WAY',
              icon: (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="6" cy="18" r="2.5" />
                  <path d="M8.5 18H15a4 4 0 004-4v0a4 4 0 00-4-4H8" />
                  <path d="M11 6l-3 4 3 4" />
                </svg>
              ),
            },
            {
              id: TripType.ROUND,
              label: 'ROUND TRIP',
              icon: (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="6" width="14" height="15" rx="3" />
                  <path d="M9 6V4a2 2 0 012-2h2a2 2 0 012 2v2" />
                  <path d="M9 11v6" />
                  <path d="M15 11v6" />
                </svg>
              ),
            },
            {
              id: TripType.LOCAL,
              label: 'LOCAL',
              icon: (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              ),
            },
            {
              id: TripType.AIRPORT,
              label: 'AIRPORT',
              icon: (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3.5c-.5-.5-2.5 0-4 1.5L13.5 8.5 5.3 6.7c-.8-.2-1.5.3-1.7 1.1-.1.5.1 1 .5 1.4l5.6 4.6-2.5 2.5-2.8-.7c-.4-.1-.8.1-1 .4l-.4.5 2.7 1.9 1.9 2.7.5-.4c.3-.2.5-.6.4-1l-.7-2.8 2.5-2.5 4.6 5.6c.4.4.9.6 1.4.5.8-.2 1.3-.9 1.1-1.7z" />
                </svg>
              ),
            },
          ].map((item) => {
            const isActive = tripType === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setTripType(item.id);
                  setQuoteData(null);
                  scrollToBookingEngine();
                }}
                className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all ${
                  isActive
                    ? 'bg-orange-50 text-orange-600 border border-orange-400 font-black shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 font-semibold'
                }`}
              >
                <div className={`${isActive ? 'text-orange-600' : 'text-slate-500'}`}>
                  {item.icon}
                </div>
                <span className="text-[10px] tracking-tight mt-0.5 whitespace-nowrap">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
