'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { calculateFareSync, FareCalculationResult } from '@/lib/pricingEngine';
import { FleetItem, FuelType, PricingRule } from '@/lib/pricingTypes';
import { getMultiStopRouteEstimate, RouteEstimate } from '@/lib/googleMaps';
import { SelectedLocation } from '@/lib/locationProvider';
import { LocationSearchInput } from '@/components/LocationSearchInput';
import { useAuth } from '@/context/AuthContext';
import { TripType, VehicleCategory } from '@kandycabs/shared';
import {
  MapPin,
  Calendar,
  Clock,
  Car,
  Tag,
  ChevronRight,
  ArrowLeft,
  Navigation,
  Info,
  CreditCard,
  Plus,
  Trash2,
  Map,
  Compass,
  AlertCircle,
  Headphones,
  Ban,
} from 'lucide-react';

const INITIAL_VEHICLE_OPTIONS = [
  {
    category: VehicleCategory.HATCHBACK,
    name: 'Hatchback (WagonR / Indica)',
    seats: 4,
    perKmRate: 11.5,
    driverAllowance: 300,
    image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&auto=format&fit=crop&q=60',
  },
  {
    category: VehicleCategory.SEDAN,
    name: 'Sedan (Swift Dzire / Etios)',
    seats: 4,
    perKmRate: 13.5,
    driverAllowance: 350,
    image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&auto=format&fit=crop&q=60',
  },
  {
    category: VehicleCategory.SUV,
    name: 'SUV (Ertiga / Marazzo)',
    seats: 6,
    perKmRate: 17.5,
    driverAllowance: 400,
    image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&auto=format&fit=crop&q=60',
  },
  {
    category: VehicleCategory.SUV_PREMIUM,
    name: 'SUV Premium (Toyota Innova Crysta)',
    seats: 7,
    perKmRate: 21.0,
    driverAllowance: 500,
    image: 'https://images.unsplash.com/photo-1563720223185-11003d516935?w=800&auto=format&fit=crop&q=60',
  },
  {
    category: VehicleCategory.TEMPO_TRAVELER,
    name: 'Tempo Traveler (12 Seater Luxury)',
    seats: 12,
    perKmRate: 26.0,
    driverAllowance: 600,
    image: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=800&auto=format&fit=crop&q=60',
  },
];

function BookingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Wizard state
  const [step, setStep] = useState<number>(1);
  const [tripType, setTripType] = useState<TripType>(
    (searchParams?.get('tripType') as TripType) || TripType.ONEWAY
  );

  const [pickupLocation, setPickupLocation] = useState<SelectedLocation>(() => {
    try {
      const raw = searchParams?.get('pickup');
      if (raw) {
        if (raw.startsWith('{')) {
          const parsed = JSON.parse(raw);
          if (parsed.placeName) return parsed;
        } else if (raw.trim()) {
          return {
            placeName: raw,
            address: raw,
            latitude: 12.8687,
            longitude: 74.8427,
            isSelected: true,
          };
        }
      }
    } catch (e) {}
    return {
      placeName: '',
      address: '',
      latitude: 0,
      longitude: 0,
      isSelected: false,
    };
  });

  const [dropLocation, setDropLocation] = useState<SelectedLocation>(() => {
    try {
      const raw = searchParams?.get('drop');
      if (raw) {
        if (raw.startsWith('{')) {
          const parsed = JSON.parse(raw);
          if (parsed.placeName) return parsed;
        } else if (raw.trim()) {
          return {
            placeName: raw,
            address: raw,
            latitude: 12.9716,
            longitude: 77.5946,
            isSelected: true,
          };
        }
      }
    } catch (e) {}
    return {
      placeName: '',
      address: '',
      latitude: 0,
      longitude: 0,
      isSelected: false,
    };
  });

  const [stops, setStops] = useState<SelectedLocation[]>(() => {
    try {
      const raw = searchParams?.get('stops');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.map((item) =>
            typeof item === 'string'
              ? { placeName: item, address: item, latitude: 0, longitude: 0, isSelected: true }
              : item
          );
        }
      }
    } catch (e) {}
    return [];
  });

  const [pickupDate, setPickupDate] = useState(
    searchParams?.get('date') || '2026-09-15'
  );
  const [pickupTime, setPickupTime] = useState(
    searchParams?.get('time') || '06:00'
  );
  const [returnDate, setReturnDate] = useState(
    searchParams?.get('returnDate') || '2026-09-17'
  );

  const [stepError, setStepError] = useState<string | null>(null);

  const [vehicleOptions, setVehicleOptions] = useState(INITIAL_VEHICLE_OPTIONS);
  const [selectedCategory, setSelectedCategory] = useState<VehicleCategory>(
    VehicleCategory.SEDAN
  );
  const [expandedInclusionsCategory, setExpandedInclusionsCategory] = useState<string | null>(null);
  const [activePricingRules, setActivePricingRules] = useState<PricingRule[]>([]);
  const [selectedFuelMap, setSelectedFuelMap] = useState<Record<string, FuelType>>({
    SEDAN: 'DIESEL',
    HATCHBACK: 'CNG',
    SUV: 'DIESEL',
    SUV_PREMIUM: 'DIESEL',
    TEMPO_TRAVELER: 'DIESEL',
  });
  const [fleets, setFleets] = useState<FleetItem[]>([]);

  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponMessage, setCouponMessage] = useState('');

  useEffect(() => {
    fetch('/api/admin/pricing')
      .then((res) => res.json())
      .then((data) => {
        if (data.rules) setActivePricingRules(data.rules);
      })
      .catch(() => {});

    fetch('/api/admin/fleets')
      .then((res) => res.json())
      .then((data) => {
        if (data.fleets && data.fleets.length > 0) {
          const activeList = data.fleets.filter((f: any) => f.active !== false);
          setFleets(activeList);
        }
      })
      .catch(() => {});
  }, []);

  // Scroll page to top whenever step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const getAvailableFuelTypesForCategory = (category: string, currentTripType: TripType): FuelType[] => {
    const fleetObj = fleets.find(
      (f) =>
        f.category === category ||
        f.id === category ||
        f.fleetName.toLowerCase() === category.toLowerCase()
    );
    const enabledInFleet = fleetObj?.enabledFuelTypes || ['CNG', 'DIESEL', 'PETROL'];

    const available = enabledInFleet.filter((ft) =>
      activePricingRules.some(
        (r) =>
          r.status === 'ACTIVE' &&
          r.tripType === currentTripType &&
          r.vehicleCategory === category &&
          r.fuelType === ft
      )
    ) as FuelType[];

    if (available.length === 0 && activePricingRules.length === 0) {
      return enabledInFleet as FuelType[];
    }

    return available;
  };

  const getSelectedFuelForCategory = (category: string, currentTripType: TripType): FuelType | null => {
    const available = getAvailableFuelTypesForCategory(category, currentTripType);
    const raw = selectedFuelMap[category];
    if (raw && available.includes(raw)) {
      return raw;
    }
    return available.length > 0 ? available[0] : null;
  };

  useEffect(() => {
    fetch('/api/admin/fleet')
      .then((res) => res.json())
      .then((data) => {
        if (data.vehicles && data.vehicles.length > 0) {
          const activeList = data.vehicles.filter((v: any) => v.isActive !== false);
          if (activeList.length > 0) {
            setVehicleOptions(
              activeList.map((v: any) => ({
                category: v.category as VehicleCategory,
                name: v.name,
                seats: v.seatCount,
                perKmRate: v.baseFarePerKm,
                driverAllowance: v.driverAllowance,
                image: v.imageUrl || 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&auto=format&fit=crop&q=60',
              }))
            );
          }
        }
      })
      .catch(() => {});
  }, []);

  // Customer Details
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  const auth = useAuth();
  const { user: authUser } = auth;

  useEffect(() => {
    if (authUser) {
      setIsLoggedIn(true);
      if (authUser.fullName) setCustomerName(authUser.fullName);
      if (authUser.phone) setCustomerPhone(authUser.phone);
      if (authUser.customer?.email) setCustomerEmail(authUser.customer.email);
    }
  }, [authUser]);

  const executeBookingCreation = async (phoneToUse?: string, nameToUse?: string) => {
    const finalPhone = (phoneToUse || customerPhone).replace(/\D/g, '').slice(-10);
    const finalName = nameToUse || customerName || 'Valued Customer';

    if (!finalName || finalPhone.length !== 10) {
      setStepError('Please enter your full name and 10-digit mobile number.');
      return;
    }

    setBookingLoading(true);
    setStepError(null);
    try {
      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripType,
          vehicleCategory: selectedCategory,
          fuelType: getSelectedFuelForCategory(selectedCategory, tripType) || 'DIESEL',
          distanceKm: fareResult.actualDistance,
          perKmRate: fareResult.extraKmRate,
          pickupAddress: pickupLocation.placeName || pickupLocation.address,
          dropAddress: dropLocation.placeName || dropLocation.address,
          scheduledAt: `${pickupDate}T${pickupTime || '06:00'}:00.000Z`,
          customerPhone: finalPhone,
          customerName: finalName,
          customerEmail,
          couponCode,
          couponDiscount,
        }),
      });

      const data = await res.json();
      if (data.bookingId || data.success) {
        const loggedUser = data.user || {
          id: 'u_' + finalPhone,
          phone: finalPhone,
          fullName: finalName,
          roles: ['CUSTOMER'],
          customer: { fullName: finalName, email: customerEmail || null },
        };
        auth.login(loggedUser, data.token);
        router.push('/customer/dashboard');
      } else {
        setStepError(data.error || 'Failed to create booking.');
      }
    } catch (err: any) {
      setStepError(err.message || 'Booking submission failed.');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCreateBooking = async () => {
    if (!isLoggedIn && !otpSent) {
      const cleanP = customerPhone.replace(/\D/g, '').slice(-10);
      if (cleanP.length !== 10) {
        setStepError('Please enter a valid 10-digit mobile number to verify & book.');
        return;
      }
      if (!customerName) {
        setStepError('Please enter your full name.');
        return;
      }
      setBookingLoading(true);
      try {
        await fetch('/api/auth/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: cleanP }),
        });
        setOtpSent(true);
      } catch (e) {
        setOtpSent(true);
      } finally {
        setBookingLoading(false);
      }
      return;
    }

    if (!isLoggedIn && otpSent) {
      if (!otpCode || otpCode.length !== 4) {
        setStepError('Please enter 4-digit verification OTP (1234).');
        return;
      }
      setBookingLoading(true);
      const cleanP = customerPhone.replace(/\D/g, '').slice(-10);
      try {
        const res = await fetch('/api/auth/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: cleanP, otp: otpCode, fullName: customerName }),
        });
        const data = await res.json();
        setIsLoggedIn(true);
        const nameToUse = customerName || data.user?.fullName || 'Valued Customer';
        const loggedUser = data.user || {
          id: 'u_' + cleanP,
          phone: cleanP,
          fullName: nameToUse,
          roles: ['CUSTOMER'],
          customer: { fullName: nameToUse },
        };
        auth.login(loggedUser, data.token);
        await executeBookingCreation(cleanP, nameToUse);
      } catch (e) {
        setStepError('OTP verification failed. Use demo code 1234');
        setBookingLoading(false);
      }
      return;
    }

    await executeBookingCreation();
  };

  // Multi-stop Route Distance Calculation using Selected Location Coordinates
  const [routeEstimate, setRouteEstimate] = useState<RouteEstimate | null>(null);

  useEffect(() => {
    let isMounted = true;
    getMultiStopRouteEstimate(
      pickupLocation,
      dropLocation,
      stops,
      tripType === TripType.ROUND
    ).then((res) => {
      if (isMounted) setRouteEstimate(res);
    });
    return () => {
      isMounted = false;
    };
  }, [pickupLocation, dropLocation, stops, tripType]);

  const distanceKm = useMemo(() => {
    return routeEstimate ? routeEstimate.distanceKm : 180;
  }, [routeEstimate]);

  const durationDays = useMemo(() => {
    if (tripType !== TripType.ROUND || !pickupDate || !returnDate) return 1;
    const start = new Date(pickupDate).getTime();
    const end = new Date(returnDate).getTime();
    const diffDays = Math.ceil((end - start) / (1000 * 3600 * 24));
    return Math.max(1, diffDays || 1);
  }, [tripType, pickupDate, returnDate]);

  const selectedVehicleObj = useMemo(() => {
    return (
      vehicleOptions.find((v) => v.category === selectedCategory) ||
      vehicleOptions[0] ||
      INITIAL_VEHICLE_OPTIONS[0]
    );
  }, [selectedCategory, vehicleOptions]);

  const fareResult: FareCalculationResult = useMemo(() => {
    const currentFuel = getSelectedFuelForCategory(selectedCategory, tripType);
    const activeRule = currentFuel
      ? activePricingRules.find(
          (r) =>
            r.status === 'ACTIVE' &&
            r.tripType === tripType &&
            r.vehicleCategory === selectedCategory &&
            r.fuelType === currentFuel
        )
      : null;

    return calculateFareSync(
      {
        tripType,
        vehicleCategory: selectedCategory,
        fuelType: currentFuel || 'DIESEL',
        distanceKm,
        durationDays,
        couponDiscount,
      },
      activeRule
    );
  }, [tripType, selectedCategory, selectedFuelMap, fleets, distanceKm, durationDays, couponDiscount, activePricingRules]);

  const insertStopAfter = (index: number) => {
    const updated = [...stops];
    const emptyStop: SelectedLocation = {
      placeName: '',
      address: '',
      latitude: 0,
      longitude: 0,
      isSelected: false,
    };
    updated.splice(index + 1, 0, emptyStop);
    setStops(updated);
  };

  const removeStop = (index: number) => {
    setStops(stops.filter((_, i) => i !== index));
  };

  const handleStopChange = (index: number, val: SelectedLocation) => {
    const updated = [...stops];
    updated[index] = val;
    setStops(updated);
  };

  const handleProceedToStep2 = () => {
    setStepError(null);
    if (!pickupLocation.isSelected || !pickupLocation.placeName) {
      setStepError('Please select a pickup location from the suggestions.');
      return;
    }
    if (tripType !== TripType.LOCAL && (!dropLocation.isSelected || !dropLocation.placeName)) {
      setStepError('Please select a destination location from the suggestions.');
      return;
    }
    if (tripType === TripType.ROUND) {
      const invalidStop = stops.find((s) => s.placeName.trim() !== '' && !s.isSelected);
      if (invalidStop) {
        setStepError('Please select all intermediate stops from the suggestions.');
        return;
      }
    }
    setStep(2);
  };

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (couponCode.toUpperCase() === 'KANDY100') {
      setCouponDiscount(100);
      setCouponApplied(true);
      setCouponMessage('🎉 Coupon KANDY100 applied! ₹100 OFF');
    } else if (couponCode.toUpperCase() === 'FIRST250') {
      setCouponDiscount(250);
      setCouponApplied(true);
      setCouponMessage('🎉 Coupon FIRST250 applied! ₹250 OFF');
    } else {
      setCouponMessage('❌ Invalid or expired coupon code.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-kandy-bg">
      <Navbar />

      <main className="flex-1 pt-1 sm:pt-2 pb-6">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">

          {/* Trust Banner (100% Fit Non-Scrollable Responsive Layout) */}
          <div className="bg-[#EBF6FF] border border-[#D0EAFF] rounded-2xl py-2 px-1.5 sm:py-2.5 sm:px-4 mb-3 sm:mb-4 shadow-xs grid grid-cols-[1fr_1.2fr_1fr] items-center">
            {/* Item 1: Book Now at Zero Cost */}
            <div className="flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 min-w-0 pr-1">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-[#0088FF] text-white rounded-full flex items-center justify-center text-xs sm:text-sm font-black shrink-0 shadow-2xs">
                ₹
              </div>
              <div className="min-w-0">
                <h4 className="text-[10.5px] sm:text-xs font-extrabold text-[#0F172A] leading-tight whitespace-nowrap">Book Now</h4>
                <p className="text-[8.5px] sm:text-[10px] font-medium text-[#64748B] leading-none mt-0.5 whitespace-nowrap">at Zero Cost</p>
              </div>
            </div>

            {/* Item 2: Free Cancellation Upto 1 Hour (With vertical border dividers) */}
            <div className="flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 border-x border-sky-200/80 px-1 sm:px-3 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-tr from-red-500 to-rose-500 text-white rounded-full flex items-center justify-center shrink-0 shadow-2xs">
                <Ban className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
              </div>
              <div className="min-w-0">
                <h4 className="text-[10.5px] sm:text-xs font-extrabold text-[#0F172A] leading-tight whitespace-nowrap">Free Cancellation</h4>
                <p className="text-[8.5px] sm:text-[10px] font-medium text-[#64748B] leading-none mt-0.5 whitespace-nowrap">Upto 1 Hour</p>
              </div>
            </div>

            {/* Item 3: 24x7 Support */}
            <div className="flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 min-w-0 pl-1">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-[#0088FF] text-white rounded-full flex items-center justify-center shrink-0 shadow-2xs">
                <Headphones className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
              </div>
              <div className="min-w-0">
                <h4 className="text-[10.5px] sm:text-xs font-extrabold text-[#0F172A] leading-tight whitespace-nowrap">24x7 Support</h4>
                <p className="text-[8.5px] sm:text-[10px] font-medium text-[#64748B] leading-none mt-0.5 whitespace-nowrap">Always Ready</p>
              </div>
            </div>
          </div>

          {/* Progress Indicator (Auto-triggers step progress as user completes details) */}
          <div className="mb-3 sm:mb-4 bg-white p-2 sm:p-3 rounded-xl border border-kandy-border shadow-sm">
            <div className="flex items-center justify-between max-w-3xl mx-auto text-xs font-bold text-kandy-muted">
              {/* Step 1 */}
              <button
                type="button"
                onClick={() => setStep(1)}
                className={`flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-1 rounded-lg transition ${
                  step === 1
                    ? 'text-kandy-orange font-black cursor-default'
                    : 'text-emerald-700 font-bold hover:bg-orange-50 cursor-pointer'
                }`}
              >
                <div
                  className={`w-7 h-7 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                    step === 1
                      ? 'bg-kandy-orange text-white shadow-sm ring-2 ring-orange-200'
                      : step > 1
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {step > 1 ? '✓' : '1'}
                </div>
                <span className="hidden sm:inline">Select Vehicle</span>
              </button>

              <ChevronRight className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${step > 1 ? 'text-emerald-600' : 'text-gray-300'}`} />

              {/* Step 2 */}
              <button
                type="button"
                onClick={() => {
                  if (step > 2) setStep(2);
                }}
                disabled={step < 2}
                className={`flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-1 rounded-lg transition ${
                  step === 2
                    ? 'text-kandy-orange font-black cursor-default'
                    : step > 2
                    ? 'text-emerald-700 font-bold hover:bg-orange-50 cursor-pointer'
                    : 'text-gray-400 cursor-not-allowed pointer-events-none'
                }`}
              >
                <div
                  className={`w-7 h-7 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                    step === 2
                      ? 'bg-kandy-orange text-white shadow-sm ring-2 ring-orange-200'
                      : step > 2
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {step > 2 ? '✓' : '2'}
                </div>
                <span className="hidden sm:inline">Route & Schedule</span>
              </button>

              <ChevronRight className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${step > 2 ? 'text-emerald-600' : 'text-gray-300'}`} />

              {/* Step 3 */}
              <button
                type="button"
                onClick={() => {
                  if (step > 3) setStep(3);
                }}
                disabled={step < 3}
                className={`flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-1 rounded-lg transition ${
                  step === 3
                    ? 'text-kandy-orange font-black cursor-default'
                    : step > 3
                    ? 'text-emerald-700 font-bold hover:bg-orange-50 cursor-pointer'
                    : 'text-gray-400 cursor-not-allowed pointer-events-none'
                }`}
              >
                <div
                  className={`w-7 h-7 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                    step === 3
                      ? 'bg-kandy-orange text-white shadow-sm ring-2 ring-orange-200'
                      : step > 3
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {step > 3 ? '✓' : '3'}
                </div>
                <span className="hidden sm:inline">Apply Coupon</span>
              </button>

              <ChevronRight className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${step > 3 ? 'text-emerald-600' : 'text-gray-300'}`} />

              {/* Step 4 */}
              <button
                type="button"
                onClick={() => {
                  if (step > 4) setStep(4);
                }}
                disabled={step < 4}
                className={`flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-1 rounded-lg transition ${
                  step === 4
                    ? 'text-kandy-orange font-black cursor-default'
                    : 'text-gray-400 cursor-not-allowed pointer-events-none'
                }`}
              >
                <div
                  className={`w-7 h-7 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                    step === 4
                      ? 'bg-kandy-orange text-white shadow-sm ring-2 ring-orange-200'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  4
                </div>
                <span className="hidden sm:inline">Review & Pay 25%</span>
              </button>
            </div>
          </div>

          <div className={`grid grid-cols-1 ${step > 1 ? 'lg:grid-cols-3' : 'max-w-4xl mx-auto'} gap-8`}>
            {/* Left Main Wizard Form */}
            <div className={`${step > 1 ? 'lg:col-span-2' : 'w-full'} space-y-6`}>
              {/* STEP 1: Select Vehicle */}
              {step === 1 && (
                <div className="space-y-4">
                  {vehicleOptions.map((v) => {
                    const availableFuelTypes = getAvailableFuelTypesForCategory(v.category, tripType);
                    const currentFuel = getSelectedFuelForCategory(v.category, tripType);
                    const activeRule = currentFuel
                      ? activePricingRules.find(
                          (r) =>
                            r.status === 'ACTIVE' &&
                            r.tripType === tripType &&
                            r.vehicleCategory === v.category &&
                            r.fuelType === currentFuel
                        )
                      : null;

                    const vFare = calculateFareSync(
                      {
                        tripType,
                        vehicleCategory: v.category,
                        fuelType: currentFuel || 'DIESEL',
                        distanceKm,
                        durationDays,
                      },
                      activeRule
                    );

                    const isSelected = selectedCategory === v.category;
                    const isAvailable = vFare.isConfigured && availableFuelTypes.length > 0;
                    const originalPrice = Math.round(vFare.finalPrice * 1.09);
                    const discountPercent = Math.round(((originalPrice - vFare.finalPrice) / originalPrice) * 100) || 8;
                    const taxesAmount = Math.round(vFare.gstAmount);

                    return (
                      <div
                        key={v.category}
                        className={`bg-white rounded-xl border transition overflow-hidden shadow-sm hover:shadow-md ${
                          isSelected ? 'border-2 border-kandy-orange' : 'border-gray-200'
                        }`}
                      >
                        <div className="p-0 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-0 sm:gap-6">
                          {/* Left: Car Image & Details */}
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-0 sm:gap-6 flex-1 w-full">
                            <img
                              src={v.image}
                              alt={v.name}
                              className="w-full sm:w-60 md:w-64 h-48 sm:h-40 object-cover sm:object-contain rounded-t-xl sm:rounded-xl shrink-0"
                            />
                            <div className="p-3 pt-2.5 sm:p-0 space-y-1.5 text-left min-w-0 flex-1 w-full">
                              <div className="flex items-center gap-2 justify-start flex-wrap">
                                <h3 className="text-base sm:text-lg font-black text-gray-900">
                                  {v.name}
                                </h3>
                                <span className="bg-black text-amber-400 text-[10px] sm:text-[11px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                  4.8 ★
                                </span>
                              </div>
                              <p className="text-[11px] sm:text-xs text-gray-500 font-semibold">
                                {v.seats} seater AC Cab
                              </p>

                              <div className="pt-0.5 space-y-0.5 text-[11px] sm:text-xs text-gray-700 font-medium">
                                <div className="flex items-center gap-1.5 justify-start">
                                  <span>🧑‍✈️</span>
                                  <span>Driver allowance Included</span>
                                </div>
                                {vFare.isConfigured ? (
                                  <div className="flex items-center gap-1.5 justify-start">
                                    <span>🧳</span>
                                    <span>{vFare.includedKm} kms included | Post limit: ₹{vFare.extraKmRate}/km</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 justify-start text-rose-600 font-bold">
                                    <span>⚠️</span>
                                    <span>Pricing rule not configured in Admin</span>
                                  </div>
                                )}
                              </div>

                              {/* Fuel Type Selector */}
                              {availableFuelTypes.length > 0 ? (
                                <div className="pt-1 flex flex-wrap items-center gap-2 sm:gap-3 justify-start text-[11px] sm:text-xs">
                                  <span className="font-bold text-gray-700">Select Fuel Type</span>
                                  {availableFuelTypes.map((ft) => (
                                    <label key={ft} className="inline-flex items-center gap-1 text-gray-700 cursor-pointer font-semibold">
                                      <input
                                        type="radio"
                                        name={`fuel_${v.category}`}
                                        checked={currentFuel === ft}
                                        onChange={() =>
                                          setSelectedFuelMap((prev) => ({
                                            ...prev,
                                            [v.category]: ft,
                                          }))
                                        }
                                        className="accent-kandy-orange"
                                      />
                                      <span>{ft}</span>
                                    </label>
                                  ))}
                                </div>
                              ) : (
                                <div className="pt-1 text-[11px] sm:text-xs font-bold text-rose-600">
                                  ✕ Unavailable for {tripType.replace(/_/g, ' ')}
                                </div>
                              )}

                              {/* Toggle Inclusions & Exclusions */}
                              <div className="pt-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedInclusionsCategory((prev) => (prev === v.category ? null : v.category));
                                  }}
                                  className="text-[11px] sm:text-xs font-bold text-sky-600 hover:text-sky-800 flex items-center gap-1 cursor-pointer"
                                >
                                  <span>Inclusions and Exclusions</span>
                                  <span className="text-[10px]">{expandedInclusionsCategory === v.category ? '▲' : '▼'}</span>
                                </button>
                              </div>

                              {/* Mobile Expandable Inclusions (Appears ABOVE Fare Cost & CTA on Mobile) */}
                              {expandedInclusionsCategory === v.category && (
                                <div className="block sm:hidden mt-2 bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
                                  <h4 className="text-xs font-black text-gray-900 mb-1.5">
                                    Inclusions and Exclusions
                                  </h4>
                                  <ul className="space-y-1.5 text-[11px] font-bold text-gray-800">
                                    {vFare.inclusions?.map((inc, i) => (
                                      <li key={i} className="flex items-center gap-2 text-emerald-700">
                                        <span className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center font-black text-emerald-600 text-[10px] shrink-0">✓</span>
                                        <span>{inc}</span>
                                      </li>
                                    ))}
                                    {vFare.exclusions?.map((exc, eIdx) => (
                                      <li key={eIdx} className="flex items-center gap-2 text-rose-600 pt-1 border-t border-gray-200">
                                        <span className="w-4 h-4 rounded-full bg-rose-100 flex items-center justify-center font-black text-rose-600 text-[10px] shrink-0">✕</span>
                                        <span>{exc}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Right: Pricing & CTA Button */}
                          <div className="px-3 pb-3 sm:p-0 text-center md:text-right shrink-0 space-y-2 border-t md:border-t-0 md:border-l border-gray-200 pt-3 md:pt-0 md:pl-6 w-full md:w-auto">
                            {isAvailable ? (
                              <>
                                <div className="flex items-center justify-center md:justify-end gap-1.5 text-[11px] sm:text-xs">
                                  <span className="text-emerald-600 font-black bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                    {discountPercent}% OFF
                                  </span>
                                  <span className="line-through text-gray-400 font-bold">
                                    ₹{originalPrice.toLocaleString()}
                                  </span>
                                </div>
                                <div className="text-2xl sm:text-3xl font-black text-sky-600">
                                  ₹{vFare.finalPrice.toLocaleString()}
                                </div>
                                <div className="text-[10px] sm:text-[11px] text-gray-500 font-semibold">
                                  + ₹{taxesAmount.toLocaleString()} Charges and Taxes
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedCategory(v.category);
                                    setStep(2);
                                  }}
                                  className="w-full md:w-auto px-6 py-2 sm:px-8 sm:py-2.5 bg-kandy-orange hover:bg-orange-600 text-white font-black text-xs sm:text-sm uppercase tracking-wider rounded-lg shadow-md hover:shadow-lg transition transform active:scale-95 cursor-pointer"
                                >
                                  SELECT CAR
                                </button>
                              </>
                            ) : (
                              <div className="space-y-1.5 py-1">
                                <div className="text-[11px] sm:text-xs font-black text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded">
                                  UNAVAILABLE
                                </div>
                                <button
                                  type="button"
                                  disabled
                                  className="w-full md:w-auto px-6 py-2 sm:px-8 sm:py-2.5 bg-gray-200 text-gray-400 font-black text-xs sm:text-sm uppercase tracking-wider rounded-lg cursor-not-allowed"
                                >
                                  UNAVAILABLE
                                </button>
                              </div>
                            )}
                          </div>
                        </div>


                        {/* Desktop Expandable Inclusions and Exclusions Section */}
                        {expandedInclusionsCategory === v.category && (
                          <div className="hidden sm:block bg-gray-50 border-t border-gray-200 p-5 space-y-3">
                            <h4 className="text-sm font-black text-gray-900 mb-3">
                              Inclusions and Exclusions
                            </h4>

                            <ul className="space-y-2 text-xs font-bold text-gray-800">
                              {vFare.inclusions?.map((inc, i) => (
                                <li key={i} className="flex items-center gap-2.5 text-emerald-700">
                                  <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center font-black text-emerald-600 text-xs shrink-0">✓</span>
                                  <span>{inc}</span>
                                </li>
                              ))}
                              {vFare.exclusions?.map((exc, eIdx) => (
                                <li key={eIdx} className="flex items-center gap-2.5 text-rose-600 pt-1 border-t border-gray-200">
                                  <span className="w-5 h-5 rounded-full bg-rose-100 flex items-center justify-center font-black text-rose-600 text-xs shrink-0">✕</span>
                                  <span>{exc}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* STEP 2: Route & Schedule */}
              {step === 2 && (
                <div className="bg-white p-3.5 sm:p-4.5 rounded-card border border-kandy-border shadow-card space-y-3.5 sm:space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm sm:text-lg md:text-xl font-bold text-kandy-ink flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-kandy-orange shrink-0" />
                      <span>Step 2: Confirm Route & Schedule</span>
                    </h2>
                    <button
                      onClick={() => setStep(1)}
                      className="text-xs font-bold text-kandy-muted hover:text-kandy-ink flex items-center gap-1 shrink-0 ml-2"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Back to Vehicles
                    </button>
                  </div>

                  {stepError && (
                    <div className="p-2.5 bg-red-50 border-2 border-red-200 rounded-lg text-xs font-extrabold text-red-700 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>{stepError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    <LocationSearchInput
                      label="Pickup Location"
                      placeholder="Search Pickup City, Railway Station, Landmark..."
                      value={pickupLocation}
                      onChange={(loc) => {
                        setPickupLocation(loc);
                        setStepError(null);
                      }}
                      validationError={
                        !pickupLocation.isSelected && pickupLocation.placeName ? 'Please select a location from the suggestions.' : null
                      }
                    />

                    {tripType !== TripType.LOCAL && (
                      <LocationSearchInput
                        label="Final Destination"
                        placeholder="Search Drop City, Hotel, Landmark..."
                        value={dropLocation}
                        onChange={(loc) => {
                          setDropLocation(loc);
                          setStepError(null);
                        }}
                        validationError={
                          !dropLocation.isSelected && dropLocation.placeName ? 'Please select a location from the suggestions.' : null
                        }
                      />
                    )}

                    <div>
                      <label className="block text-[10px] sm:text-xs font-bold text-kandy-muted uppercase mb-0.5 sm:mb-1">
                        Pickup Date
                      </label>
                      <input
                        type="date"
                        value={pickupDate}
                        onChange={(e) => setPickupDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 sm:py-2 bg-kandy-bg border border-kandy-border rounded text-xs sm:text-sm font-semibold"
                      />
                    </div>

                    {tripType === TripType.ROUND ? (
                      <div>
                        <label className="block text-[10px] sm:text-xs font-bold text-kandy-muted uppercase mb-0.5 sm:mb-1">
                          Return Date ({durationDays} {durationDays === 1 ? 'day' : 'days'})
                        </label>
                        <input
                          type="date"
                          value={returnDate}
                          onChange={(e) => setReturnDate(e.target.value)}
                          className="w-full px-2.5 py-1.5 sm:py-2 bg-kandy-bg border border-kandy-border rounded text-xs sm:text-sm font-semibold"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[10px] sm:text-xs font-bold text-kandy-muted uppercase mb-0.5 sm:mb-1">
                          Pickup Time
                        </label>
                        <input
                          type="time"
                          value={pickupTime}
                          onChange={(e) => setPickupTime(e.target.value)}
                          className="w-full px-2.5 py-1.5 sm:py-2 bg-kandy-bg border border-kandy-border rounded text-xs sm:text-sm font-semibold"
                        />
                      </div>
                    )}
                  </div>

                  {/* DYNAMIC INTERMEDIATE STOPS UI (ROUND TRIP ONLY) */}
                  {tripType === TripType.ROUND && (
                    <div className="bg-orange-50/70 p-3 rounded-card border border-orange-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] sm:text-xs font-extrabold uppercase text-kandy-orange tracking-wider flex items-center gap-1.5">
                          <Navigation className="w-3.5 h-3.5 rotate-90" />
                          Multi-Stop Waypoints ({stops.length})
                        </span>
                        <button
                          type="button"
                          onClick={() => insertStopAfter(stops.length - 1)}
                          className="px-2.5 py-1 bg-kandy-orange hover:bg-kandy-orangeHover text-white font-bold rounded text-[11px] sm:text-xs transition flex items-center gap-1 shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Location</span>
                        </button>
                      </div>

                      {stops.length === 0 ? (
                        <p className="text-[11px] text-kandy-muted italic">
                          No intermediate stops added. Click &quot;Add Location&quot; to add waypoints like Udupi, Mysore, or Temple stops.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {stops.map((stopLoc, sIdx) => (
                            <LocationSearchInput
                              key={sIdx}
                              label={`Stop #${sIdx + 1}`}
                              placeholder={`Search Intermediate Stop #${sIdx + 1}...`}
                              value={stopLoc}
                              onChange={(loc) => {
                                handleStopChange(sIdx, loc);
                                setStepError(null);
                              }}
                              showDelete={true}
                              showAdd={true}
                              onDelete={() => removeStop(sIdx)}
                              onAddNext={() => insertStopAfter(sIdx)}
                              validationError={
                                !stopLoc.isSelected && stopLoc.placeName ? 'Please select a location from the suggestions.' : null
                              }
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TEXT-BASED LOCATION & ROUTE KM ANALYSIS */}
                  <div className="bg-kandy-ink text-white p-3 sm:p-4 rounded-card border border-gray-800 space-y-2.5 sm:space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                      <div className="flex items-center gap-2">
                        <Compass className="w-4 h-4 sm:w-5 sm:h-5 text-kandy-orange" />
                        <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-white">
                          Route & Distance Analysis (Coordinate Derived)
                        </h3>
                      </div>
                      <span className="bg-kandy-orange text-white text-[9px] sm:text-[10px] font-extrabold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded shadow-sm flex items-center gap-1">
                        {tripType === TripType.ROUND ? 'ROUND TRIP ROUTE' : 'ONE WAY ROUTE'}
                      </span>
                    </div>

                    {/* Multi-Leg Route Breakdown */}
                    <div className="space-y-2">
                      <div className="text-[11px] sm:text-xs font-bold text-gray-300">Sequential Route Breakdown:</div>
                      
                      {routeEstimate?.legBreakdown && routeEstimate.legBreakdown.length > 0 ? (
                        <div className="space-y-1.5">
                          {routeEstimate.legBreakdown.map((leg, lIdx) => (
                            <div
                              key={lIdx}
                              className="flex items-center justify-between bg-gray-900/80 p-2 sm:p-2.5 rounded border border-gray-800 text-xs"
                            >
                              <div className="flex items-center gap-2 truncate max-w-[75%]">
                                <span className="w-4.5 h-4.5 rounded-full bg-kandy-orange text-white font-extrabold text-[9px] sm:text-[10px] flex items-center justify-center shrink-0">
                                  {lIdx + 1}
                                </span>
                                <span className="font-bold text-gray-200 truncate text-[11px] sm:text-xs">{leg.from}</span>
                                <span className="text-kandy-orange font-bold shrink-0">➔</span>
                                <span className="font-bold text-white truncate text-[11px] sm:text-xs">{leg.to}</span>
                              </div>
                              <span className="font-extrabold text-kandy-orange bg-black/60 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded border border-orange-500/30 shrink-0 text-[11px] sm:text-xs">
                                {leg.km} km
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between bg-gray-900 p-2 sm:p-2.5 rounded border border-gray-800 text-xs">
                          <div className="flex items-center gap-2 truncate max-w-[75%]">
                            <span className="font-bold text-gray-200 truncate text-[11px] sm:text-xs">{pickupLocation.placeName}</span>
                            <span className="text-kandy-orange font-bold shrink-0">➔</span>
                            <span className="font-bold text-white truncate text-[11px] sm:text-xs">{dropLocation.placeName}</span>
                          </div>
                          <span className="font-extrabold text-kandy-orange text-[11px] sm:text-xs">{distanceKm} km</span>
                        </div>
                      )}
                    </div>

                    {/* Total Cumulative & Billed KM Summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-gray-800 text-xs">
                      <div className="bg-gray-900 p-2 sm:p-2.5 rounded border border-gray-800">
                        <div className="text-gray-400 text-[10px] sm:text-[11px] mb-0.5">Total Cumulative Route Distance</div>
                        <div className="text-base sm:text-lg font-black text-white">{distanceKm} KM</div>
                      </div>
                      <div className="bg-gray-900 p-2 sm:p-2.5 rounded border border-gray-800">
                        <div className="text-gray-400 text-[10px] sm:text-[11px] mb-0.5">
                          Billed Distance ({tripType === TripType.ROUND ? `Min ${250 * durationDays} km for ${durationDays} days` : 'Actuals'})
                        </div>
                        <div className="text-base sm:text-lg font-black text-kandy-orange">
                          {fareResult.actualDistance} KM
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setStepError(null);
                      if (!pickupLocation.isSelected || !pickupLocation.placeName) {
                        setStepError('Please select a pickup location from the suggestions.');
                        return;
                      }
                      if (tripType !== TripType.LOCAL && (!dropLocation.isSelected || !dropLocation.placeName)) {
                        setStepError('Please select a destination location from the suggestions.');
                        return;
                      }
                      setStep(3);
                    }}
                    className="w-full py-2.5 sm:py-3 bg-kandy-orange hover:bg-kandy-orangeHover text-white font-extrabold rounded text-xs sm:text-sm uppercase tracking-wider transition shadow-md"
                  >
                    CONTINUE TO APPLY COUPON →
                  </button>
                </div>
              )}

              {/* STEP 3: Apply Coupon */}
              {step === 3 && (
                <div className="bg-white p-3.5 sm:p-4.5 rounded-card border border-kandy-border shadow-card">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm sm:text-lg md:text-xl font-bold text-kandy-ink flex items-center gap-2">
                      <Tag className="w-5 h-5 text-kandy-orange shrink-0" />
                      <span>Step 3: Coupon & Discounts</span>
                    </h2>
                    <button
                      onClick={() => setStep(2)}
                      className="text-xs font-bold text-kandy-muted hover:text-kandy-ink flex items-center gap-1 shrink-0 ml-2"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Back
                    </button>
                  </div>

                  <form onSubmit={handleApplyCoupon} className="mb-3.5 sm:mb-4">
                    <label className="block text-[10px] sm:text-xs font-bold text-kandy-muted uppercase mb-0.5 sm:mb-1">
                      Enter Coupon Code
                    </label>
                    <div className="flex gap-1.5 sm:gap-2">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        placeholder="Try KANDY100 or FIRST250"
                        className="flex-1 px-2.5 py-1.5 sm:py-2 bg-kandy-bg border border-kandy-border rounded text-xs sm:text-sm font-semibold uppercase"
                      />
                      <button
                        type="submit"
                        className="px-3.5 sm:px-5 py-1.5 sm:py-2 bg-kandy-ink text-white font-bold text-xs uppercase rounded hover:bg-black transition shrink-0"
                      >
                        APPLY
                      </button>
                    </div>
                    {couponMessage && (
                      <p
                        className={`text-xs font-bold mt-1.5 ${
                          couponApplied ? 'text-emerald-600' : 'text-red-500'
                        }`}
                      >
                        {couponMessage}
                      </p>
                    )}
                  </form>

                  <div className="space-y-2 mb-3.5 sm:mb-4">
                    <div
                      onClick={() => {
                        setCouponCode('KANDY100');
                        setCouponDiscount(100);
                        setCouponApplied(true);
                        setCouponMessage('🎉 Coupon KANDY100 applied! ₹100 OFF');
                      }}
                      className="p-2 sm:p-2.5 bg-kandy-orangeLight border border-orange-200 rounded cursor-pointer flex items-center justify-between text-[11px] sm:text-xs"
                    >
                      <div>
                        <span className="font-extrabold text-kandy-orange mr-1.5">KANDY100</span>
                        <span className="text-kandy-ink font-medium">Flat ₹100 Discount on outstation bookings</span>
                      </div>
                      <span className="font-bold text-kandy-orange underline shrink-0 ml-1">APPLY</span>
                    </div>

                    <div
                      onClick={() => {
                        setCouponCode('FIRST250');
                        setCouponDiscount(250);
                        setCouponApplied(true);
                        setCouponMessage('🎉 Coupon FIRST250 applied! ₹250 OFF');
                      }}
                      className="p-2 sm:p-2.5 bg-blue-50 border border-blue-200 rounded cursor-pointer flex items-center justify-between text-[11px] sm:text-xs"
                    >
                      <div>
                        <span className="font-extrabold text-blue-600 mr-1.5">FIRST250</span>
                        <span className="text-kandy-ink font-medium">Flat ₹250 Discount for first-time users</span>
                      </div>
                      <span className="font-bold text-blue-600 underline shrink-0 ml-1">APPLY</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setStep(4)}
                    className="w-full py-2.5 sm:py-3 bg-kandy-orange hover:bg-kandy-orangeHover text-white font-extrabold rounded text-xs sm:text-sm uppercase tracking-wider transition shadow-md"
                  >
                    CONTINUE TO CHECKOUT →
                  </button>
                </div>
              )}

              {/* STEP 4: Review & Customer Details */}
              {step === 4 && (
                <div className="bg-white p-3.5 sm:p-4.5 rounded-card border border-kandy-border shadow-card">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm sm:text-lg md:text-xl font-bold text-kandy-ink flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-kandy-orange shrink-0" />
                      <span>Step 4: Customer Details & 25% Advance</span>
                    </h2>
                    <button
                      onClick={() => setStep(3)}
                      className="text-xs font-bold text-kandy-muted hover:text-kandy-ink flex items-center gap-1 shrink-0 ml-2"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Back
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-3.5 sm:mb-4">
                    <div>
                      <label className="block text-[10px] sm:text-xs font-bold text-kandy-muted uppercase mb-0.5 sm:mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Enter your name"
                        className="w-full px-2.5 py-1.5 sm:py-2 bg-kandy-bg border border-kandy-border rounded text-xs sm:text-sm font-semibold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] sm:text-xs font-bold text-kandy-muted uppercase mb-0.5 sm:mb-1">
                        Mobile Number *
                      </label>
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="10-digit mobile number"
                        className="w-full px-2.5 py-1.5 sm:py-2 bg-kandy-bg border border-kandy-border rounded text-xs sm:text-sm font-semibold"
                        required
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] sm:text-xs font-bold text-kandy-muted uppercase mb-0.5 sm:mb-1">
                        Email Address (for PDF Invoice)
                      </label>
                      <input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="yourname@example.com"
                        className="w-full px-2.5 py-1.5 sm:py-2 bg-kandy-bg border border-kandy-border rounded text-xs sm:text-sm font-semibold"
                      />
                    </div>
                    {!isLoggedIn && otpSent && (
                      <div className="sm:col-span-2 bg-orange-50 border border-orange-200 p-2.5 sm:p-3 rounded-lg space-y-1.5">
                        <div className="text-xs font-bold text-orange-950 flex items-center justify-between">
                          <span>Enter 4-digit OTP code sent to +91 {customerPhone}:</span>
                          <span className="bg-orange-200 text-orange-900 px-2 py-0.5 rounded font-mono font-black text-[10px]">
                            Demo Code: 1234
                          </span>
                        </div>
                        <input
                          type="password"
                          maxLength={4}
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          placeholder="1234"
                          className="w-full px-2.5 py-1.5 sm:py-2 bg-white border border-kandy-border rounded text-center text-base font-black tracking-widest text-kandy-ink focus:outline-none focus:border-kandy-orange"
                        />
                      </div>
                    )}
                  </div>

                  <div className="bg-emerald-50 border border-emerald-200 p-2.5 sm:p-3 rounded-md mb-3.5 sm:mb-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] sm:text-xs font-bold text-emerald-800 uppercase">
                        Razorpay 25% Advance Checkout
                      </span>
                      <span className="text-xs font-black text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200">
                        ₹{fareResult.advanceAmount.toLocaleString()} Only
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-emerald-700">
                      Remaining 75% balance (₹{fareResult.balanceAmount.toLocaleString()}) + tolls will be requested after trip completion.
                    </p>
                  </div>

                  <button
                    onClick={handleCreateBooking}
                    disabled={bookingLoading || !fareResult.isConfigured}
                    className="w-full py-2.5 sm:py-3 bg-kandy-orange hover:bg-kandy-orangeHover text-white font-extrabold rounded-md text-[10.5px] sm:text-xs md:text-sm uppercase tracking-wider transition shadow-lg flex items-center justify-center gap-1.5 sm:gap-2"
                  >
                    <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                    <span>
                      {bookingLoading
                        ? 'PROCESSING BOOKING...'
                        : !isLoggedIn
                        ? !otpSent
                          ? 'VERIFY PHONE & CONFIRM BOOKING →'
                          : 'VERIFY OTP & PAY ADVANCE →'
                        : `PAY ₹${fareResult.advanceAmount.toLocaleString()} ADVANCE & CONFIRM BOOKING →`}
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Right Fare Breakdown Summary Sidebar (Only shown after vehicle selection, step > 1) */}
            {step > 1 && (
              <div className="lg:col-span-1">
                <div className="bg-white rounded-card border border-kandy-border shadow-card overflow-hidden sticky top-24">
                  <div className="bg-kandy-ink text-white p-3 sm:p-3.5">
                    <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-kandy-orange">
                      Fare Breakdown Summary
                    </h3>
                    <div className="text-[11px] sm:text-xs text-gray-300">
                      {tripType} • {selectedVehicleObj.name} ({fareResult.fuelType})
                    </div>
                  </div>

                  <div className="p-3 sm:p-4 space-y-2 text-xs text-kandy-ink font-medium">
                    {/* Leg breakdown list for sidebar */}
                    {routeEstimate?.legBreakdown && routeEstimate.legBreakdown.length > 0 && (
                      <div className="bg-gray-50 p-2.5 rounded border border-gray-200 space-y-1.5 mb-2">
                        <div className="text-[10px] font-extrabold text-kandy-orange uppercase">
                          Leg-by-Leg Route Distance:
                        </div>
                        {routeEstimate.legBreakdown.map((l, idx) => (
                          <div key={idx} className="flex justify-between text-[11px] text-gray-700">
                            <span className="truncate max-w-[170px]">{l.from} → {l.to}</span>
                            <span className="font-bold">{l.km} km</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-between py-1 border-b border-gray-100">
                      <span className="text-kandy-muted">Actual Route Distance</span>
                      <span className="font-bold">{fareResult.actualDistance} km</span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-gray-100">
                      <span className="text-kandy-muted">Included KM</span>
                      <span className="font-bold">{fareResult.includedKm} km</span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-gray-100">
                      <span className="text-kandy-muted">Package Price</span>
                      <span className="font-bold">₹{fareResult.basePrice.toLocaleString()}</span>
                    </div>

                    {fareResult.extraKm > 0 && (
                      <div className="flex justify-between py-1 border-b border-gray-100 text-orange-600 font-bold">
                        <span>Extra KM ({fareResult.extraKm} km @ ₹{fareResult.extraKmRate})</span>
                        <span>+₹{fareResult.extraKmCharge.toLocaleString()}</span>
                      </div>
                    )}

                    {fareResult.tripType === TripType.LOCAL && fareResult.extraHours > 0 && (
                      <div className="flex justify-between py-1 border-b border-gray-100 text-orange-600 font-bold">
                        <span>Extra Hours ({fareResult.extraHours} hr @ ₹{fareResult.extraHourRate})</span>
                        <span>+₹{fareResult.extraHourCharge.toLocaleString()}</span>
                      </div>
                    )}

                    <div className="flex justify-between py-1 border-b border-gray-100">
                      <span className="text-kandy-muted">Driver Allowance ({durationDays} days)</span>
                      <span className="font-bold text-emerald-600">Included</span>
                    </div>

                    {couponDiscount > 0 && (
                      <div className="flex justify-between py-1 border-b border-gray-100 text-emerald-600 font-bold">
                        <span>Coupon Discount</span>
                        <span>-₹{couponDiscount}</span>
                      </div>
                    )}

                    <div className="flex justify-between py-1 border-b border-gray-100">
                      <span className="text-kandy-muted">GST ({fareResult.gstPercent}%)</span>
                      <span className="font-bold">₹{fareResult.gstAmount.toLocaleString()}</span>
                    </div>

                    <div className="pt-2 flex justify-between items-center text-sm font-extrabold border-t-2 border-kandy-border text-kandy-ink">
                      <span>Estimated Total</span>
                      <span className="text-base text-kandy-orange">
                        ₹{fareResult.finalPrice.toLocaleString()}
                      </span>
                    </div>

                    {/* Advance & Balance Split */}
                    <div className="bg-kandy-bg p-3 rounded space-y-1.5 mt-3 border border-kandy-border">
                      <div className="flex justify-between text-xs font-bold text-emerald-700">
                        <span>25% Advance Payable Now:</span>
                        <span>₹{fareResult.advanceAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-[11px] font-semibold text-kandy-muted">
                        <span>75% Balance at Trip End:</span>
                        <span>₹{fareResult.balanceAmount.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="text-[10px] text-kandy-muted pt-2 flex items-start gap-1">
                      <Info className="w-3 h-3 text-kandy-orange shrink-0 mt-0.5" />
                      <span>Tolls ({fareResult.tollMode}) & Parking ({fareResult.parkingMode}) charges apply as configured.</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center font-bold">Loading Kandy Cabs Booking Engine...</div>}>
      <BookingContent />
    </Suspense>
  );
}
