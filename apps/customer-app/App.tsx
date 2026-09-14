import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  Alert,
  StatusBar,
  Linking,
  Modal,
  Image,
  ImageBackground,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { KANDY_THEME } from './theme';
import { testSupabaseConnection } from './services/supabase';
import {
  sendOtp,
  verifyOtp,
  fetchPublicFleet,
  fetchPublicFareChart,
  calculateFareApi,
  fetchCustomerBookings,
  createCustomerBooking,
  createPaymentOrder,
} from './services/api';
import {
  requestLocationPermission,
  openLocationAppSettings,
  getCurrentCoordinates,
  reverseGeocodeCoordinates,
} from './services/locationService';

// Types & Data Schemas
type TripType = 'ONEWAY' | 'ROUNDTRIP' | 'LOCAL' | 'AIRPORT';
type WizardStep = 'SEARCH' | 'VEHICLES' | 'ROUTE' | 'COUPON' | 'CONFIRMATION' | 'SUCCESS';

interface LocationItem {
  name: string;
  address: string;
  city: string;
}

const POPULAR_LOCATIONS: LocationItem[] = [
  { name: 'Bangalore, KA', address: 'Kempegowda / MG Road, Bengaluru', city: 'Bangalore' },
  { name: 'Kempegowda Intl Airport (BLR)', address: 'Devanahalli, Bengaluru', city: 'Bangalore' },
  { name: 'Coorg (Madikeri), KA', address: 'Madikeri Town, Coorg, Karnataka', city: 'Coorg' },
  { name: 'Mysore (Mysuru), KA', address: 'Palace Grounds, Mysuru, Karnataka', city: 'Mysore' },
  { name: 'Mangaluru (Mangalore), KA', address: 'Hampankatta, Mangaluru', city: 'Mangalore' },
  { name: 'Mangalore Intl Airport (IXE)', address: 'Bajpe, Mangaluru', city: 'Mangalore' },
  { name: 'Chikmagalur, KA', address: 'Mullayanagiri Road, Chikmagalur', city: 'Chikmagalur' },
  { name: 'Ooty, TN', address: 'Charing Cross, Ooty, Tamil Nadu', city: 'Ooty' },
  { name: 'Chennai, TN', address: 'Anna Salai, Chennai, Tamil Nadu', city: 'Chennai' },
  { name: 'Colombo, Sri Lanka', address: 'Fort / Cinnamon Gardens, Colombo', city: 'Colombo' },
  { name: 'Bandaranaike Intl Airport (CMB)', address: 'Katunayake, Colombo', city: 'Colombo' },
  { name: 'Kandy, Sri Lanka', address: 'Temple of the Tooth, Kandy', city: 'Kandy' },
  { name: 'Galle, Sri Lanka', address: 'Dutch Fort, Galle', city: 'Galle' },
];

interface VehicleCategory {
  id: string;
  name: string;
  category: string;
  models: string;
  capacity: string;
  luggage: string;
  ratePerKm: number;
  extraKmRate: number;
  baseFare: number;
  rating: number;
  fuel: string;
  tag: string;
  image: string;
  description: string;
}

const FLEET_CATEGORIES: VehicleCategory[] = [
  {
    id: 'hatchback',
    name: 'Hatchback',
    category: 'Economy Hatchback',
    models: 'WagonR, Indica or equivalent',
    capacity: '4 Seater',
    luggage: '2 Small Bags',
    ratePerKm: 11.5,
    extraKmRate: 12.0,
    baseFare: 2300,
    rating: 4.8,
    fuel: 'CNG / Diesel',
    tag: 'BUDGET FRIENDLY',
    image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&auto=format&fit=crop&q=60',
    description: '4 seater AC Cab (WagonR, Indica or equivalent)',
  },
  {
    id: 'sedan',
    name: 'Sedan (Dzire / Etios)',
    category: 'Economy Sedan',
    models: 'Swift Dzire, Etios or equivalent',
    capacity: '4 Seater',
    luggage: '2 Large + 1 Small Bag',
    ratePerKm: 13.5,
    extraKmRate: 14.0,
    baseFare: 2800,
    rating: 4.9,
    fuel: 'CNG / Diesel',
    tag: 'MOST POPULAR',
    image: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=800&auto=format&fit=crop&q=60',
    description: 'Clean AC sedan suitable for up to 4 passengers with 2 medium luggage bags.',
  },
  {
    id: 'ertiga',
    name: 'SUV (Ertiga / Marazzo)',
    category: 'Family MUV',
    models: 'Ertiga, Marazzo or equivalent',
    capacity: '6 Seater',
    luggage: '3 Large Bags',
    ratePerKm: 17.5,
    extraKmRate: 18.0,
    baseFare: 3600,
    rating: 4.8,
    fuel: 'Diesel',
    tag: 'FAMILY CHOICE',
    image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&auto=format&fit=crop&q=60',
    description: 'Spacious 6-seater MUV with extra legroom & trunk space for family trips.',
  },
  {
    id: 'innova',
    name: 'SUV Premium (Innova Crysta)',
    category: 'Executive Luxury',
    models: 'Toyota Innova Crysta',
    capacity: '7 Seater',
    luggage: '4 Large Bags',
    ratePerKm: 21.0,
    extraKmRate: 22.0,
    baseFare: 4800,
    rating: 4.9,
    fuel: 'Diesel',
    tag: 'LUXURY AC',
    image: 'https://images.unsplash.com/photo-1563720223185-11003d516935?w=800&auto=format&fit=crop&q=60',
    description: 'Premium executive captain-seat luxury AC cab for maximum comfort & highway stability.',
  },
  {
    id: 'tempo',
    name: 'Tempo Traveller',
    category: 'Group Minibus',
    models: 'Force 12 Seater Luxury',
    capacity: '12 Seater',
    luggage: '8 Large Bags',
    ratePerKm: 26.0,
    extraKmRate: 28.0,
    baseFare: 6400,
    rating: 4.9,
    fuel: 'Diesel',
    tag: 'LARGE GROUP',
    image: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=800&auto=format&fit=crop&q=60',
    description: '12-seater pushback AC minibus for large group tours, weddings & corporate outings.',
  },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function App() {
  // Navigation State
  type AppTab = 'HOME' | 'TRIPS' | 'FLEET' | 'ACCOUNT' | 'CONTACT';
  const [currentStep, setCurrentStep] = useState<WizardStep>('SEARCH');
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<AppTab>('HOME');

  // Contact Form State
  const [contactName, setContactName] = useState<string>('');
  const [contactPhoneInput, setContactPhoneInput] = useState<string>('');
  const [contactSubject, setContactSubject] = useState<string>('General Enquiry');
  const [contactMessage, setContactMessage] = useState<string>('');

  // Backend / Database Status
  const [dbStatus, setDbStatus] = useState<string>('App Connected (Demo Mode)');
  const [dbConnected, setDbConnected] = useState<boolean>(true);

  // Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [customerName, setCustomerName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [otp, setOtp] = useState<string>('');
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [isRegisteredUser, setIsRegisteredUser] = useState<boolean>(false);
  const [isNewUser, setIsNewUser] = useState<boolean>(false);
  const [existingName, setExistingName] = useState<string>('');

  // Booking Form State
  const [tripType, setTripType] = useState<TripType>('ONEWAY');
  const [airportTripMode, setAirportTripMode] = useState<'PICKUP' | 'DROP'>('PICKUP');
  const [localPackage, setLocalPackage] = useState<string>('8hr / 80km');
  const [pickupInput, setPickupInput] = useState<string>('');
  const [dropInput, setDropInput] = useState<string>('');
  const [stops, setStops] = useState<string[]>([]);
  const [activeStopIndex, setActiveStopIndex] = useState<number | null>(null);
  const [pickupDate, setPickupDate] = useState<string>('');
  const [returnDate, setReturnDate] = useState<string>('');
  const [pickupTime, setPickupTime] = useState<string>('');

  // ─── CURRENT LOCATION & MAP PICKER STATE ───
  const [pickupLatitude, setPickupLatitude] = useState<number | null>(null);
  const [pickupLongitude, setPickupLongitude] = useState<number | null>(null);
  const [pickupAccuracy, setPickupAccuracy] = useState<number | null>(null);
  const [isDetectingLocation, setIsDetectingLocation] = useState<boolean>(false);
  const [locationStatusText, setLocationStatusText] = useState<string>('📍 Detecting your location...');
  const [mapModalOpen, setMapModalOpen] = useState<boolean>(false);
  const [tempMapCoords, setTempMapCoords] = useState<{ latitude: number; longitude: number; accuracy: number | null }>({
    latitude: 12.8797,
    longitude: 74.8430,
    accuracy: 5,
  });
  const [tempGeocodedAddress, setTempGeocodedAddress] = useState<string>('');
  const [tempShortAddress, setTempShortAddress] = useState<string>('');
  const [isReverseGeocoding, setIsReverseGeocoding] = useState<boolean>(false);
  const [mapZoomLevel, setMapZoomLevel] = useState<number>(16);

  // ─── DATE & TIME PICKER STATE & HELPERS ───
  const [datePickerTarget, setDatePickerTarget] = useState<'PICKUP' | 'RETURN' | null>(null);
  const [datePickerMonth, setDatePickerMonth] = useState<Date>(() => new Date());
  const [timePickerOpen, setTimePickerOpen] = useState<boolean>(false);

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const parseDateDDMMYYYY = (str: string): Date => {
    if (!str) return new Date();
    const parts = str.split('-');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        return new Date(year, month, day);
      }
    }
    return new Date();
  };

  const formatDateDDMMYYYY = (d: Date): string => {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const openDatePicker = (target: 'PICKUP' | 'RETURN') => {
    const currStr = target === 'PICKUP' ? pickupDate : returnDate;
    const parsed = parseDateDDMMYYYY(currStr);
    setDatePickerMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
    setDatePickerTarget(target);
  };

  const handlePrevMonth = () => {
    setDatePickerMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setDatePickerMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleSelectCalendarDate = (dateObj: Date) => {
    const formatted = formatDateDDMMYYYY(dateObj);
    if (datePickerTarget === 'PICKUP') {
      setPickupDate(formatted);
    } else if (datePickerTarget === 'RETURN') {
      setReturnDate(formatted);
    }
    setDatePickerTarget(null);
  };

  const getCalendarCells = () => {
    const year = datePickerMonth.getFullYear();
    const month = datePickerMonth.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const selectedStr = datePickerTarget === 'PICKUP' ? pickupDate : returnDate;
    const selectedDateObj = parseDateDDMMYYYY(selectedStr);

    const isSameDay = (d1: Date, d2: Date) =>
      d1.getDate() === d2.getDate() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getFullYear() === d2.getFullYear();

    const today = new Date(2026, 8, 14);

    const cells: {
      key: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      dateObj: Date;
      isSelected: boolean;
      isToday: boolean;
    }[] = [];

    // Prev month trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dNum = prevMonthDays - i;
      const dObj = new Date(year, month - 1, dNum);
      cells.push({
        key: `prev-${dNum}`,
        dayNumber: dNum,
        isCurrentMonth: false,
        dateObj: dObj,
        isSelected: isSameDay(dObj, selectedDateObj),
        isToday: isSameDay(dObj, today),
      });
    }

    // Current month days
    for (let i = 1; i <= totalDaysInMonth; i++) {
      const dObj = new Date(year, month, i);
      cells.push({
        key: `curr-${i}`,
        dayNumber: i,
        isCurrentMonth: true,
        dateObj: dObj,
        isSelected: isSameDay(dObj, selectedDateObj),
        isToday: isSameDay(dObj, today),
      });
    }

    // Next month leading days to complete grid
    const totalCells = cells.length <= 35 ? 35 : 42;
    const remaining = totalCells - cells.length;
    for (let i = 1; i <= remaining; i++) {
      const dObj = new Date(year, month + 1, i);
      cells.push({
        key: `next-${i}`,
        dayNumber: i,
        isCurrentMonth: false,
        dateObj: dObj,
        isSelected: isSameDay(dObj, selectedDateObj),
        isToday: isSameDay(dObj, today),
      });
    }

    return cells;
  };

  const currentHour = (pickupTime.split(':')[0] || '07').padStart(2, '0');
  const currentMinute = (pickupTime.split(':')[1] || '00').padStart(2, '0');

  const HOURS_LIST = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const MINUTES_LIST = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  // Location Suggestion Dropdowns
  const [showPickupDropdown, setShowPickupDropdown] = useState<boolean>(false);
  const [showDropDropdown, setShowDropDropdown] = useState<boolean>(false);

  // ─── GPS CURRENT LOCATION HANDLERS ───
  const handleUseCurrentLocation = async () => {
    if (isDetectingLocation) return;
    setIsDetectingLocation(true);
    setLocationStatusText('📍 Checking location permission...');

    try {
      const perm = await requestLocationPermission();
      if (perm.status === 'services_disabled') {
        Alert.alert(
          'Location Services Disabled',
          'Please turn on GPS / Location Services on your device to automatically detect your pickup location.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => openLocationAppSettings() },
          ]
        );
        setIsDetectingLocation(false);
        return;
      }

      if (perm.status === 'denied') {
        if (!perm.canAskAgain) {
          Alert.alert(
            'Location Permission Required',
            'Kandy Cabs needs location access to detect your pickup point. Please enable Location in app settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => openLocationAppSettings() },
            ]
          );
        } else {
          Alert.alert(
            'Permission Denied',
            'Location permission was not granted. You can type your pickup location manually or try again.'
          );
        }
        setIsDetectingLocation(false);
        return;
      }

      if (perm.status !== 'granted') {
        Alert.alert('Location Error', 'Unable to access location at this time.');
        setIsDetectingLocation(false);
        return;
      }

      setLocationStatusText('📍 Detecting your location...');
      const coords = await getCurrentCoordinates();

      setLocationStatusText('Finding your address...');
      const geo = await reverseGeocodeCoordinates(coords.latitude, coords.longitude);

      setTempMapCoords({
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
      });
      setTempGeocodedAddress(geo.formattedAddress);
      setTempShortAddress(geo.shortAddress);
      setShowPickupDropdown(false);
      setMapModalOpen(true);
    } catch (err: any) {
      console.warn('[handleUseCurrentLocation error]', err);
      Alert.alert('Location Error', err.message || 'Unable to retrieve your current location. Please enter manually.');
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const mapRef = useRef<MapView | null>(null);
  const geocodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMapRegionChangeComplete = (region: Region) => {
    setTempMapCoords((prev) => ({
      ...prev,
      latitude: region.latitude,
      longitude: region.longitude,
    }));

    if (geocodeTimeoutRef.current) {
      clearTimeout(geocodeTimeoutRef.current);
    }

    setIsReverseGeocoding(true);
    geocodeTimeoutRef.current = setTimeout(async () => {
      try {
        const geo = await reverseGeocodeCoordinates(region.latitude, region.longitude);
        setTempGeocodedAddress(geo.formattedAddress);
        setTempShortAddress(geo.shortAddress);
      } catch (err) {
        console.log('[handleMapRegionChangeComplete geocode error]', err);
      } finally {
        setIsReverseGeocoding(false);
      }
    }, 600);
  };

  const handleRecenterGps = async () => {
    setIsReverseGeocoding(true);
    try {
      const coords = await getCurrentCoordinates();
      const geo = await reverseGeocodeCoordinates(coords.latitude, coords.longitude);
      setTempMapCoords({
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
      });
      setTempGeocodedAddress(geo.formattedAddress);
      setTempShortAddress(geo.shortAddress);

      mapRef.current?.animateToRegion({
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 800);
    } catch (err: any) {
      Alert.alert('GPS Recenter', 'Unable to re-acquire GPS position.');
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  const handleMapZoom = (direction: 'in' | 'out') => {
    const factor = direction === 'in' ? 0.5 : 2.0;
    mapRef.current?.animateToRegion({
      latitude: tempMapCoords.latitude,
      longitude: tempMapCoords.longitude,
      latitudeDelta: 0.005 * factor,
      longitudeDelta: 0.005 * factor,
    }, 400);
  };

  const handleConfirmMapPickup = () => {
    const chosenAddress = tempGeocodedAddress || tempShortAddress || `Pickup (${tempMapCoords.latitude.toFixed(4)}, ${tempMapCoords.longitude.toFixed(4)})`;
    setPickupInput(chosenAddress);
    setPickupLatitude(tempMapCoords.latitude);
    setPickupLongitude(tempMapCoords.longitude);
    setPickupAccuracy(tempMapCoords.accuracy);
    setMapModalOpen(false);
    setShowPickupDropdown(false);
  };

  // Selected Vehicle & Distance
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleCategory>(FLEET_CATEGORIES[0]);
  const [estimatedDistanceKm] = useState<number>(250);

  // Customer Contact Info for Booking
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [specialNotes, setSpecialNotes] = useState<string>('');

  const handleAddStop = () => {
    if (stops.length >= 5) {
      Alert.alert('Stop Limit', 'You can add up to 5 intermediate destinations.');
      return;
    }
    setStops((prev) => [...prev, '']);
  };

  const handleRemoveStop = (index: number) => {
    setStops((prev) => prev.filter((_, i) => i !== index));
    if (activeStopIndex === index) {
      setActiveStopIndex(null);
    }
  };

  const handleUpdateStop = (index: number, val: string) => {
    setStops((prev) => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };

  const handleSwapLocations = () => {
    const temp = pickupInput;
    setPickupInput(dropInput);
    setDropInput(temp);
    if (tripType === 'AIRPORT') {
      setAirportTripMode((prev) => (prev === 'PICKUP' ? 'DROP' : 'PICKUP'));
    }
  };

  interface CustomerBookingItem {
    id: string;
    status: string;
    tripType?: string;
    pickup: string;
    drop: string;
    date: string;
    time?: string;
    vehicleName: string;
    totalFare: number;
    advancePaid: number;
    balanceDue: number;
    driverName?: string;
    driverPhone?: string;
    driverRating?: string;
  }

  // Active Trips & Bookings Database (Empty until real customer bookings exist)
  const [userBookings, setUserBookings] = useState<CustomerBookingItem[]>([]);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    testSupabaseConnection().then((res) => {
      setDbStatus(res.message);
      setDbConnected(res.success);
    });

    // Fetch dynamic fleet catalog from public API on mount
    fetchPublicFleet().then((res) => {
      if (res?.vehicles && Array.isArray(res.vehicles) && res.vehicles.length > 0) {
        console.log('[API] Dynamically loaded live fleet catalog from backend API');
      }
    });
  }, []);

  // 4-Step Booking Wizard State (Matching Website Reference)
  const [bannerDismissed, setBannerDismissed] = useState<boolean>(false);
  const [expandedInclusionsId, setExpandedInclusionsId] = useState<string | null>(null);
  const [selectedFuelMap, setSelectedFuelMap] = useState<Record<string, string>>({
    hatchback: 'CNG',
    sedan: 'Diesel',
    ertiga: 'Diesel',
    innova: 'Diesel',
    tempo: 'Diesel',
  });
  const [couponCode, setCouponCode] = useState<string>('');
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [couponApplied, setCouponApplied] = useState<boolean>(false);
  const [couponMessage, setCouponMessage] = useState<string>('');

  const handleApplyCoupon = (codeToApply?: string) => {
    const code = (codeToApply || couponCode).trim().toUpperCase();
    if (!code) {
      Alert.alert('Coupon Required', 'Please enter a valid coupon code.');
      return;
    }
    if (code === 'KANDY100') {
      setCouponDiscount(100);
      setCouponApplied(true);
      setCouponCode('KANDY100');
      setCouponMessage('🎉 ₹100 Flat discount applied successfully!');
    } else if (code === 'FIRSTCAB') {
      const disc = Math.min(250, Math.round(rawFare * 0.1));
      setCouponDiscount(disc);
      setCouponApplied(true);
      setCouponCode('FIRSTCAB');
      setCouponMessage(`🎉 10% discount (₹${disc}) applied successfully!`);
    } else if (code === 'AIRPORT50') {
      setCouponDiscount(50);
      setCouponApplied(true);
      setCouponCode('AIRPORT50');
      setCouponMessage('🎉 ₹50 Airport discount applied successfully!');
    } else {
      Alert.alert('Invalid Coupon', 'The coupon code entered is not valid or has expired.');
    }
  };

  // Fare Calculation Rules (Matching Web Engine with Coupon Deductions)
  const rawFare = Math.max(selectedVehicle.baseFare, estimatedDistanceKm * selectedVehicle.ratePerKm);
  const calculatedFare = Math.max(selectedVehicle.baseFare, Math.round(rawFare - couponDiscount));
  const advancePayable = Math.round(calculatedFare * 0.25);
  const balancePayable = calculatedFare - advancePayable;

  // Authentication Handlers
  const handleSendOtp = async () => {
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await sendOtp(cleanPhone);
      if (res.isRegistered && res.fullName) {
        setIsRegisteredUser(true);
        setExistingName(res.fullName);
        setCustomerName(res.fullName);
        setIsNewUser(false);
      } else {
        setIsRegisteredUser(false);
        setExistingName('');
        setCustomerName('');
        setIsNewUser(true);
      }
      setOtpSent(true);
    } catch (err: any) {
      setIsRegisteredUser(false);
      setExistingName('');
      setCustomerName('');
      setIsNewUser(true);
      setOtpSent(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (!otp || otp.length !== 4) {
      Alert.alert('OTP Required', 'Please enter the 4-digit OTP code.');
      return;
    }

    if (!isRegisteredUser && isNewUser && !customerName.trim()) {
      Alert.alert('Name Required', 'Please enter your full name to complete registration.');
      return;
    }

    setIsSubmitting(true);
    try {
      const finalName = isRegisteredUser ? (existingName || customerName) : customerName.trim();
      const res = await verifyOtp(cleanPhone, otp, finalName);
      setIsLoggedIn(true);
      setCustomerName(finalName || 'Customer');
      setAuthModalOpen(false);
      setMenuOpen(false);
      setActiveTab('ACCOUNT');
      Alert.alert('Welcome!', res.message || `Logged in successfully as ${finalName || 'Customer'}`);
      
      // Load user's bookings from backend API with safe normalization
      fetchCustomerBookings(cleanPhone).then((bRes) => {
        if (bRes?.bookings && Array.isArray(bRes.bookings) && bRes.bookings.length > 0) {
          const mapped = bRes.bookings.map((item: any) => ({
            id: item.humanReadableRef || item.id || `KC${Math.floor(10000 + Math.random() * 90000)}`,
            status: item.status || 'PENDING',
            tripType: item.tripType || 'ONEWAY',
            pickup: item.pickup || item.pickupAddress || 'Bangalore Central, Karnataka',
            drop: item.drop || item.dropAddress || 'Coorg (Madikeri), Karnataka',
            date: item.date || (item.scheduledAt ? new Date(item.scheduledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '15 Sept 2026'),
            time: item.time || (item.scheduledAt ? new Date(item.scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '06:03 pm'),
            vehicleName: item.vehicleName || item.vehicle?.name || item.vehicleCategory || 'Swift Dzire (Sedan)',
            totalFare: Number(item.totalFare ?? item.estimatedFare ?? 4250),
            advancePaid: Number(item.advancePaid ?? item.advanceAmount ?? 1063),
            balanceDue: Number(item.balanceDue ?? item.balanceAmount ?? 3187),
            driverName: item.driverName || item.assignedDriver?.fullName || 'Assigned Driver',
            driverPhone: item.driverPhone || '8888888888',
            driverRating: item.driverRating || '4.9 ★',
          }));
          setUserBookings(mapped);
        } else {
          setUserBookings([]);
        }
      }).catch(() => {
        setUserBookings([]);
      });
    } catch (err: any) {
      const finalName = isRegisteredUser ? (existingName || customerName.trim()) : (customerName.trim() || 'Customer');
      setIsLoggedIn(true);
      setCustomerName(finalName);
      setAuthModalOpen(false);
      setMenuOpen(false);
      setActiveTab('ACCOUNT');
      setUserBookings([]);
      Alert.alert('Welcome!', `Logged in successfully as ${finalName}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setOtpSent(false);
    setOtp('');
    setIsRegisteredUser(false);
    setIsNewUser(false);
    setExistingName('');
    setCustomerName('');
    setPhone('');
    setCustomerEmail('');
    setUserBookings([]);
    Alert.alert('Logged Out', 'You have been logged out.');
  };

  // Confirm Final Booking Action
  const handleConfirmFinalBooking = async () => {
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10) {
      Alert.alert('Mobile Number Required', 'Please enter a valid 10-digit mobile number so we can send your trip & driver details.');
      return;
    }

    if (!customerName.trim()) {
      Alert.alert('Full Name Required', 'Please enter your full name for the booking.');
      return;
    }

    setIsSubmitting(true);
    try {
      const newRef = `KC${Math.floor(10000 + Math.random() * 90000)}`;
      const payload = {
        tripType,
        pickupAddress: pickupInput,
        pickupLatitude: pickupLatitude ?? undefined,
        pickupLongitude: pickupLongitude ?? undefined,
        dropAddress: dropInput,
        pickupDate,
        pickupTime,
        vehicleCategory: selectedVehicle.id,
        vehicleName: selectedVehicle.name,
        estimatedDistanceKm,
        estimatedFare: calculatedFare,
        advanceAmount: advancePayable,
        balanceAmount: balancePayable,
        customerName: customerName.trim(),
        customerPhone: cleanPhone,
        customerEmail: customerEmail.trim(),
        specialNotes,
      };

      const apiRes = await createCustomerBooking(payload);

      const newBooking = {
        id: apiRes?.booking?.humanReadableRef || apiRes?.booking?.id || newRef,
        status: 'CONFIRMED',
        pickup: pickupInput,
        drop: dropInput,
        date: `${pickupDate}, ${pickupTime}`,
        vehicleName: selectedVehicle.name,
        totalFare: calculatedFare,
        advancePaid: advancePayable,
        balanceDue: balancePayable,
        driverName: 'Assigning Chauffeur...',
        driverPhone: '9876543210',
        driverRating: '5.0 ★',
      };

      setUserBookings([newBooking, ...userBookings]);
      setCurrentStep('SUCCESS');
    } catch (err: any) {
      Alert.alert('Booking Error', err.message || 'Failed to place booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCallSupport = (num: string = '9876543210') => {
    Linking.openURL(`tel:${num}`).catch(() => {
      Alert.alert('Customer Support', `Dialing +91 ${num}`);
    });
  };

  // Hero is only visible on HOME tab, SEARCH step
  const isHeroVisible = activeTab === 'HOME' && currentStep === 'SEARCH';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle={isHeroVisible ? 'light-content' : 'dark-content'}
        backgroundColor={isHeroVisible ? 'transparent' : '#FFFFFF'}
        translucent={isHeroVisible}
      />

      {/* HEADER NAVBAR — hidden when hero is visible (hero has its own inline navbar) */}
      {!isHeroVisible && (
        <View style={styles.navbar}>
          <TouchableOpacity
            style={styles.brandContainer}
            onPress={() => {
              setActiveTab('HOME');
              setCurrentStep('SEARCH');
            }}
          >
            <Image
              source={require('./assets/kandycabs-logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.hamburgerBtn} onPress={() => setMenuOpen(true)}>
            <Text style={styles.hamburgerIcon}>☰</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* DRAWER / HAMBURGER SLIDE-OUT MENU MODAL (Exact Website SideMenu Design) */}
      <Modal visible={menuOpen} animationType="fade" transparent={true}>
        <View style={styles.menuOverlay}>
          <TouchableOpacity style={styles.menuBackdrop} activeOpacity={1} onPress={() => setMenuOpen(false)} />
          <View style={styles.menuDrawer}>
            {/* Header Block: Logo & Close Button */}
            <View style={styles.menuHeader}>
              <Image
                source={require('./assets/kandycabs-logo.png')}
                style={styles.menuLogoImage}
                resizeMode="contain"
              />
              <TouchableOpacity style={styles.menuCloseCircle} onPress={() => setMenuOpen(false)}>
                <Text style={styles.menuCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.menuContent} showsVerticalScrollIndicator={false}>
              {/* User Identity / Welcome Card */}
              {isLoggedIn ? (
                <TouchableOpacity
                  style={styles.welcomeCardLoggedIn}
                  onPress={() => {
                    setMenuOpen(false);
                    setActiveTab('ACCOUNT');
                  }}
                >
                  <View style={styles.welcomeAvatarCircleLoggedIn}>
                    <Text style={styles.welcomeAvatarIconLoggedIn}>👤</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.welcomeSubLabel}>Welcome back,</Text>
                    <Text style={styles.welcomeUserName} numberOfLines={1}>{customerName}</Text>
                    <Text style={styles.welcomeUserRole}>Customer Account</Text>
                  </View>
                  <Text style={styles.drawerNavChevron}>›</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.welcomeCard}>
                  <View style={styles.welcomeAvatarCircle}>
                    <Text style={styles.welcomeAvatarIcon}>👤</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.welcomeTitle}>Welcome to Kandy Cabs</Text>
                    <Text style={styles.welcomeSubtitle}>Sign in for bookings & dispatches</Text>
                  </View>
                </View>
              )}

              {/* Main Nav Items List */}
              <View style={styles.drawerNavList}>
                {/* 1. Home */}
                <TouchableOpacity
                  style={[styles.drawerNavItem, activeTab === 'HOME' && styles.drawerNavItemActive]}
                  onPress={() => {
                    setActiveTab('HOME');
                    setCurrentStep('SEARCH');
                    setMenuOpen(false);
                  }}
                >
                  <View style={styles.drawerNavLeft}>
                    <Text style={[styles.drawerNavIcon, activeTab === 'HOME' && styles.drawerNavIconActive]}>🏠</Text>
                    <Text style={[styles.drawerNavText, activeTab === 'HOME' && styles.drawerNavTextActive]}>Home</Text>
                  </View>
                  <Text style={[styles.drawerNavChevron, activeTab === 'HOME' && styles.drawerNavChevronActive]}>›</Text>
                </TouchableOpacity>

                {/* 2. Book Cab */}
                <TouchableOpacity
                  style={[styles.drawerNavItem, activeTab === 'HOME' && currentStep !== 'SEARCH' && styles.drawerNavItemActive]}
                  onPress={() => {
                    setActiveTab('HOME');
                    setCurrentStep('VEHICLES');
                    setMenuOpen(false);
                  }}
                >
                  <View style={styles.drawerNavLeft}>
                    <Text style={[styles.drawerNavIcon, activeTab === 'HOME' && currentStep !== 'SEARCH' && styles.drawerNavIconActive]}>🚗</Text>
                    <Text style={[styles.drawerNavText, activeTab === 'HOME' && currentStep !== 'SEARCH' && styles.drawerNavTextActive]}>Book Cab</Text>
                  </View>
                  <Text style={[styles.drawerNavChevron, activeTab === 'HOME' && currentStep !== 'SEARCH' && styles.drawerNavChevronActive]}>›</Text>
                </TouchableOpacity>

                {/* 3. Fleet & Rates */}
                <TouchableOpacity
                  style={[styles.drawerNavItem, activeTab === 'FLEET' && styles.drawerNavItemActive]}
                  onPress={() => {
                    setActiveTab('FLEET');
                    setMenuOpen(false);
                  }}
                >
                  <View style={styles.drawerNavLeft}>
                    <Text style={[styles.drawerNavIcon, activeTab === 'FLEET' && styles.drawerNavIconActive]}>🏷️</Text>
                    <Text style={[styles.drawerNavText, activeTab === 'FLEET' && styles.drawerNavTextActive]}>Fleet & Rates</Text>
                  </View>
                  <Text style={[styles.drawerNavChevron, activeTab === 'FLEET' && styles.drawerNavChevronActive]}>›</Text>
                </TouchableOpacity>

                {/* 4. Contact */}
                <TouchableOpacity
                  style={[styles.drawerNavItem, activeTab === 'CONTACT' && styles.drawerNavItemActive]}
                  onPress={() => {
                    setActiveTab('CONTACT');
                    setMenuOpen(false);
                  }}
                >
                  <View style={styles.drawerNavLeft}>
                    <Text style={[styles.drawerNavIcon, activeTab === 'CONTACT' && styles.drawerNavIconActive]}>🎧</Text>
                    <Text style={[styles.drawerNavText, activeTab === 'CONTACT' && styles.drawerNavTextActive]}>Contact</Text>
                  </View>
                  <Text style={[styles.drawerNavChevron, activeTab === 'CONTACT' && styles.drawerNavChevronActive]}>›</Text>
                </TouchableOpacity>
              </View>

              {/* Bottom Actions & 24x7 Support */}
              <View style={styles.drawerBottomSection}>
                {!isLoggedIn ? (
                  <TouchableOpacity
                    style={styles.drawerSignInBtn}
                    onPress={() => {
                      setMenuOpen(false);
                      setAuthModalOpen(true);
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.drawerSignInIcon}>➔</Text>
                      <Text style={styles.drawerSignInText}>SIGN IN / LOGIN</Text>
                    </View>
                    <Text style={styles.drawerSignInChevron}>›</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.drawerPortalBtn}
                      onPress={() => {
                        setMenuOpen(false);
                        setActiveTab('ACCOUNT');
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 16 }}>👤</Text>
                        <Text style={styles.drawerPortalText}>Customer Portal (My Account)</Text>
                      </View>
                      <Text style={styles.drawerNavChevron}>›</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.drawerLogoutBtn} onPress={handleLogout}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 14 }}>🚪</Text>
                        <Text style={styles.drawerLogoutText}>LOGOUT</Text>
                      </View>
                    </TouchableOpacity>
                  </>
                )}

                {/* 24x7 Support Box */}
                <View style={styles.drawerSupportCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <Text style={{ fontSize: 16 }}>📞</Text>
                    <View>
                      <Text style={styles.drawerSupportLabel}>24×7 Support:</Text>
                      <Text style={styles.drawerSupportNumber}>+91 98765 43210</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.drawerCallIconBtn}
                    onPress={() => handleCallSupport('9876543210')}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 13 }}>📞</Text>
                  </TouchableOpacity>
                </View>

                {/* Version Metadata */}
                <Text style={styles.drawerVersionText}>v2.4.1</Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* AUTHENTICATION MODAL */}
      <Modal visible={authModalOpen} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.authModalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.authModalTitle}>Customer Login / Signup</Text>
              <TouchableOpacity
                onPress={() => {
                  setAuthModalOpen(false);
                  setOtpSent(false);
                  setIsNewUser(false);
                }}
              >
                <Text style={styles.menuCloseBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.authModalSub}>
              Unified Portal — Driver partners & customers are automatically directed to their account.
            </Text>

            {!otpSent ? (
              <View style={{ marginTop: 4 }}>
                <Text style={styles.authInputLabel}>MOBILE NUMBER</Text>
                <View style={styles.phoneInputRow}>
                  <View style={styles.phonePrefixBox}>
                    <Text style={styles.phonePrefixText}>+91</Text>
                  </View>
                  <TextInput
                    style={styles.phoneTextInput}
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="10-digit mobile number"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                <TouchableOpacity
                  style={styles.authSendOtpBtn}
                  onPress={handleSendOtp}
                  disabled={isSubmitting}
                >
                  <Text style={{ fontSize: 14 }}>🔒</Text>
                  <Text style={styles.authSendOtpBtnText}>
                    {isSubmitting ? 'SENDING CODE...' : 'SEND OTP →'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ marginTop: 4 }}>
                {isRegisteredUser && existingName ? (
                  <View style={styles.authWelcomeBackBanner}>
                    <Text style={styles.authWelcomeBackText}>
                      👋 Welcome back, <Text style={{ fontWeight: '900', color: '#064E3B' }}>{existingName}</Text>!
                    </Text>
                    <View style={styles.authVerifiedPill}>
                      <Text style={styles.authVerifiedPillText}>VERIFIED</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.authDemoOtpBanner}>
                    <Text style={styles.authDemoOtpText}>
                      Demo Verification Code: <Text style={{ fontWeight: '900', color: '#FF6B1A' }}>1234</Text> (Sent to +91 {phone})
                    </Text>
                  </View>
                )}

                <Text style={styles.authInputLabel}>ENTER 4-DIGIT OTP</Text>
                <TextInput
                  style={styles.authOtpInput}
                  keyboardType="number-pad"
                  maxLength={4}
                  value={otp}
                  onChangeText={setOtp}
                  placeholder="1234"
                  placeholderTextColor="#CBD5E1"
                />

                {!isRegisteredUser && isNewUser && (
                  <View style={{ marginTop: 10 }}>
                    <View style={styles.newUserNoticeCard}>
                      <Text style={styles.newUserNoticeText}>
                        👋 First time here! Enter your name once — we'll remember you for future bookings.
                      </Text>
                    </View>

                    <Text style={[styles.authInputLabel, { marginTop: 10 }]}>FULL NAME *</Text>
                    <TextInput
                      style={styles.authNameInput}
                      value={customerName}
                      onChangeText={setCustomerName}
                      placeholder="Enter your full name"
                      placeholderTextColor="#94A3B8"
                      autoFocus={true}
                    />
                  </View>
                )}

                <View style={styles.authOtpButtonsRow}>
                  <TouchableOpacity
                    style={styles.authBackBtn}
                    onPress={() => {
                      setOtpSent(false);
                      setIsNewUser(false);
                    }}
                  >
                    <Text style={styles.authBackBtnText}>BACK</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.authVerifySignInBtn}
                    onPress={handleVerifyOtp}
                    disabled={isSubmitting}
                  >
                    <Text style={{ fontSize: 13 }}>🛡️</Text>
                    <Text style={styles.authVerifySignInBtnText}>
                      {isSubmitting ? 'VERIFYING...' : 'VERIFY & SIGN IN →'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>


      {/* ════════════════════════════════════════════════════
          TAB 1: HOME — SEARCH STEP with HERO BACKGROUND
          ════════════════════════════════════════════════════ */}
      {/* ════════════════════════════════════════════════════
          TAB 1: HOME — SEARCH STEP (Exact Website Mobile Design)
          ════════════════════════════════════════════════════ */}
      {activeTab === 'HOME' && currentStep === 'SEARCH' && (
        <ScrollView
          style={styles.mainHomeScroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* HERO IMAGE BACKGROUND WITH WARM LIGHT OVERLAY */}
          <ImageBackground
            source={require('./assets/hero-bg.jpg')}
            style={styles.heroBgImage}
            resizeMode="cover"
          >
            <View style={styles.heroOverlay}>
              {/* Navbar inside hero */}
              <View style={styles.heroNavbar}>
                <TouchableOpacity
                  style={styles.brandContainer}
                  onPress={() => { setActiveTab('HOME'); setCurrentStep('SEARCH'); }}
                >
                  <Image
                    source={require('./assets/kandycabs-logo.png')}
                    style={styles.logoImageHero}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
                <TouchableOpacity style={styles.hamburgerBtn} onPress={() => setMenuOpen(true)}>
                  <Text style={styles.hamburgerIcon}>☰</Text>
                </TouchableOpacity>
              </View>

              {/* Hero text content matching Website */}
              <View style={styles.heroContent}>
                <Text style={styles.heroTitle}>
                  Travel with confidence with <Text style={{ color: '#FF6B1A' }}>Kandy Cabs</Text>
                </Text>
                <Text style={styles.heroSubtitle}>
                  Safe, reliable, and hassle-free rides for local, airport, and outstation journeys
                </Text>
              </View>

              {/* BOOKING WIDGET (Dynamic per TripType matching Website Reference) */}
              <View style={styles.bookingCard}>
                {/* Dedicated Airport Transfer Direction Toggle (When AIRPORT selected) */}
                {tripType === 'AIRPORT' && (
                  <View style={styles.airportToggleRow}>
                    <TouchableOpacity
                      style={[
                        styles.airportToggleBtn,
                        airportTripMode === 'PICKUP' && styles.airportToggleBtnActive,
                      ]}
                      onPress={() => setAirportTripMode('PICKUP')}
                    >
                      <Text style={styles.airportToggleIcon}>🛬</Text>
                      <Text
                        style={[
                          styles.airportToggleText,
                          airportTripMode === 'PICKUP' && styles.airportToggleTextActive,
                        ]}
                      >
                        Pickup from Airport
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.airportToggleBtn,
                        airportTripMode === 'DROP' && styles.airportToggleBtnActive,
                      ]}
                      onPress={() => setAirportTripMode('DROP')}
                    >
                      <Text style={styles.airportToggleIcon}>🛫</Text>
                      <Text
                        style={[
                          styles.airportToggleText,
                          airportTripMode === 'DROP' && styles.airportToggleTextActive,
                        ]}
                      >
                        Drop to Airport
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* PICKUP / CITY LOCATION */}
                <View style={styles.inputLabelRow}>
                  <Text style={styles.inputLabelIcon}>📍</Text>
                  <Text style={styles.inputLabelText}>
                    {tripType === 'LOCAL'
                      ? 'CITY / TOWN'
                      : tripType === 'AIRPORT' && airportTripMode === 'PICKUP'
                      ? 'PICKUP AIRPORT'
                      : 'PICKUP LOCATION'}
                  </Text>
                </View>
                <View style={styles.inputSearchWrapper}>
                  <Text style={styles.inputIcon}>🔍</Text>
                  <TextInput
                    style={styles.inputWithIcon}
                    value={pickupInput}
                    onChangeText={(val) => { setPickupInput(val); setShowPickupDropdown(true); }}
                    onFocus={() => setShowPickupDropdown(true)}
                    placeholder={
                      tripType === 'LOCAL'
                        ? 'Enter City name (e.g. Bangalore, Mysore)...'
                        : tripType === 'AIRPORT' && airportTripMode === 'PICKUP'
                        ? 'Select Airport (e.g. BLR, IXE, CMB)...'
                        : 'Enter Pickup Place, Landmark, Railway...'
                    }
                    placeholderTextColor="#94A3B8"
                  />
                </View>
                {showPickupDropdown && (
                  <View style={styles.suggestionsBox}>
                    {/* Use Current Location Quick Button */}
                    <TouchableOpacity
                      style={styles.currentLocationOption}
                      onPress={handleUseCurrentLocation}
                      activeOpacity={0.7}
                    >
                      <View style={styles.currentLocationIconBg}>
                        {isDetectingLocation ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={{ fontSize: 16 }}>📍</Text>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.currentLocationHeading}>
                          {isDetectingLocation ? locationStatusText : 'Use Current Location'}
                        </Text>
                        <Text style={styles.currentLocationSubheading}>
                          {isDetectingLocation ? 'Obtaining GPS coordinates...' : 'Auto-detect GPS & fine-tune pickup pin'}
                        </Text>
                      </View>
                      <Text style={styles.currentLocationArrow}>➔</Text>
                    </TouchableOpacity>

                    <View style={styles.suggestionDivider} />

                    {POPULAR_LOCATIONS.filter(
                      (loc) =>
                        loc.name.toLowerCase().includes(pickupInput.toLowerCase()) ||
                        loc.city.toLowerCase().includes(pickupInput.toLowerCase())
                    ).map((loc, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={styles.suggestionItem}
                        onPress={() => { setPickupInput(loc.name); setShowPickupDropdown(false); }}
                      >
                        <Text style={styles.suggestionName}>📍 {loc.name}</Text>
                        <Text style={styles.suggestionAddr}>{loc.address}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* FLOATING RIGHT-SIDE SWAP BUTTON (Hidden for LOCAL) */}
                {tripType !== 'LOCAL' && (
                  <View style={styles.swapRightWrapper}>
                    <TouchableOpacity style={styles.swapCircleBtn} onPress={handleSwapLocations}>
                      <Text style={styles.swapIcon}>⇅</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* DYNAMIC INTERMEDIATE STOPS (EXCLUSIVELY FOR ROUND TRIP) */}
                {tripType === 'ROUNDTRIP' &&
                  stops.map((stopVal, sIdx) => (
                    <View key={sIdx} style={{ marginBottom: 10 }}>
                      <View style={styles.inputLabelRow}>
                        <Text style={styles.inputLabelIcon}>📍</Text>
                        <Text style={styles.inputLabelText}>{`INTERMEDIATE STOP #${sIdx + 1}`}</Text>
                      </View>
                      <View style={styles.inputSearchWrapper}>
                        <Text style={styles.inputIcon}>🔍</Text>
                        <TextInput
                          style={styles.inputWithIcon}
                          value={stopVal}
                          onChangeText={(val) => {
                            handleUpdateStop(sIdx, val);
                            setActiveStopIndex(sIdx);
                          }}
                          onFocus={() => setActiveStopIndex(sIdx)}
                          placeholder={`Enter Waypoint / Stop #${sIdx + 1}...`}
                          placeholderTextColor="#94A3B8"
                        />
                        <TouchableOpacity
                          onPress={() => handleRemoveStop(sIdx)}
                          style={styles.removeStopCircleBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Text style={styles.removeStopCircleIcon}>−</Text>
                        </TouchableOpacity>
                        {stops.length < 5 && (
                          <TouchableOpacity
                            onPress={handleAddStop}
                            style={styles.addStopCircleBtn}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Text style={styles.addStopCircleIcon}>+</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      {activeStopIndex === sIdx && (
                        <View style={styles.suggestionsBox}>
                          {POPULAR_LOCATIONS.filter(
                            (loc) =>
                              loc.name.toLowerCase().includes(stopVal.toLowerCase()) ||
                              loc.city.toLowerCase().includes(stopVal.toLowerCase())
                          ).map((loc, idx) => (
                            <TouchableOpacity
                              key={idx}
                              style={styles.suggestionItem}
                              onPress={() => {
                                handleUpdateStop(sIdx, loc.name);
                                setActiveStopIndex(null);
                              }}
                            >
                              <Text style={styles.suggestionName}>📍 {loc.name}</Text>
                              <Text style={styles.suggestionAddr}>{loc.address}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  ))}

                {/* DESTINATION LOCATION (Hidden for LOCAL) */}
                {tripType !== 'LOCAL' && (
                  <>
                    <View style={styles.inputLabelRow}>
                      <Text style={styles.inputLabelIcon}>📍</Text>
                      <Text style={styles.inputLabelText}>
                        {tripType === 'AIRPORT' && airportTripMode === 'DROP'
                          ? 'DROP AIRPORT'
                          : 'DESTINATION LOCATION'}
                      </Text>
                    </View>
                    <View style={styles.inputSearchWrapper}>
                      <Text style={styles.inputIcon}>🔍</Text>
                      <TextInput
                        style={styles.inputWithIcon}
                        value={dropInput}
                        onChangeText={(val) => { setDropInput(val); setShowDropDropdown(true); }}
                        onFocus={() => setShowDropDropdown(true)}
                        placeholder={
                          tripType === 'AIRPORT' && airportTripMode === 'DROP'
                            ? 'Select Airport (e.g. BLR, IXE, CMB)...'
                            : 'Enter Drop City, Hotel, Landmark...'
                        }
                        placeholderTextColor="#94A3B8"
                      />
                      {tripType === 'ROUNDTRIP' && (
                        <TouchableOpacity
                          onPress={handleAddStop}
                          style={styles.addStopCircleBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.addStopCircleIcon}>+</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    {showDropDropdown && (
                      <View style={styles.suggestionsBox}>
                        {POPULAR_LOCATIONS.filter(
                          (loc) =>
                            loc.name.toLowerCase().includes(dropInput.toLowerCase()) ||
                            loc.city.toLowerCase().includes(dropInput.toLowerCase())
                        ).map((loc, idx) => (
                          <TouchableOpacity
                            key={idx}
                            style={styles.suggestionItem}
                            onPress={() => { setDropInput(loc.name); setShowDropDropdown(false); }}
                          >
                            <Text style={styles.suggestionName}>🏁 {loc.name}</Text>
                            <Text style={styles.suggestionAddr}>{loc.address}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </>
                )}

                {/* LOCAL RENTAL PACKAGES (Shown only for LOCAL) */}
                {tripType === 'LOCAL' && (
                  <View style={styles.localPackageSection}>
                    <Text style={styles.inputLabelText}>SELECT RENTAL PACKAGE</Text>
                    <View style={styles.localPackageRow}>
                      {['4hr / 40km', '8hr / 80km', '12hr / 120km'].map((pkg) => (
                        <TouchableOpacity
                          key={pkg}
                          style={[
                            styles.localPackagePill,
                            localPackage === pkg && styles.localPackagePillActive,
                          ]}
                          onPress={() => setLocalPackage(pkg)}
                        >
                          <Text
                            style={[
                              styles.localPackageText,
                              localPackage === pkg && styles.localPackageTextActive,
                            ]}
                          >
                            {pkg}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* DATE & TIME GRID */}
                <View style={styles.dateTimeGrid}>
                  {/* PICK UP DATE */}
                  <TouchableOpacity
                    style={styles.dateTimeCard}
                    activeOpacity={0.7}
                    onPress={() => openDatePicker('PICKUP')}
                  >
                    <View style={styles.dateTimeCardHeader}>
                      <Text style={styles.dateTimeCardIcon}>📅</Text>
                      <Text style={styles.dateTimeCardLabel}>PICK UP DATE</Text>
                    </View>
                    <View style={styles.dateTimeValueRow}>
                      <Text style={styles.dateTimeValueText}>{pickupDate || 'Select Date'}</Text>
                      <Text style={styles.dateTimeEndIcon}>🗓️</Text>
                    </View>
                  </TouchableOpacity>

                  {/* RETURN DATE (Shown only for ROUND TRIP) */}
                  {tripType === 'ROUNDTRIP' && (
                    <TouchableOpacity
                      style={styles.dateTimeCard}
                      activeOpacity={0.7}
                      onPress={() => openDatePicker('RETURN')}
                    >
                      <View style={styles.dateTimeCardHeader}>
                        <Text style={styles.dateTimeCardIcon}>🔄</Text>
                        <Text style={styles.dateTimeCardLabel}>RETURN DATE</Text>
                      </View>
                      <View style={styles.dateTimeValueRow}>
                        <Text style={styles.dateTimeValueText}>{returnDate || 'Select Date'}</Text>
                        <Text style={styles.dateTimeEndIcon}>🗓️</Text>
                      </View>
                    </TouchableOpacity>
                  )}

                  {/* PICK UP TIME */}
                  <TouchableOpacity
                    style={styles.dateTimeCard}
                    activeOpacity={0.7}
                    onPress={() => setTimePickerOpen(true)}
                  >
                    <View style={styles.dateTimeCardHeader}>
                      <Text style={styles.dateTimeCardIcon}>⏰</Text>
                      <Text style={styles.dateTimeCardLabel}>PICK UP TIME</Text>
                    </View>
                    <View style={styles.dateTimeValueRow}>
                      <Text style={styles.dateTimeValueText}>{pickupTime || '07:00'}</Text>
                      <Text style={styles.dateTimeEndIcon}>🕒</Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* BIG ORANGE CTA BUTTON */}
                <TouchableOpacity
                  style={styles.exploreCabsBtn}
                  onPress={() => {
                    if (!pickupInput || (tripType !== 'LOCAL' && !dropInput)) {
                      Alert.alert(
                        'Required',
                        tripType === 'LOCAL'
                          ? 'Please select your city.'
                          : 'Please select both pickup and destination locations.'
                      );
                      return;
                    }
                    setCurrentStep('VEHICLES');
                  }}
                >
                  <Text style={styles.exploreCabsBtnText}>EXPLORE CABS & RATES →</Text>
                </TouchableOpacity>
              </View>

              {/* 4 TRUST BADGES GRID (2x2 matching website) */}
              <View style={styles.trustBadgesGrid}>
                <View style={styles.trustBadgeItem}>
                  <View style={[styles.trustBadgeIconCircle, { backgroundColor: '#FFF7ED' }]}>
                    <Text style={{ fontSize: 13 }}>🛡️</Text>
                  </View>
                  <Text style={styles.trustBadgeTitle}>VERIFIED CHAUFFEURS</Text>
                </View>

                <View style={styles.trustBadgeItem}>
                  <View style={[styles.trustBadgeIconCircle, { backgroundColor: '#ECFDF5' }]}>
                    <Text style={{ fontSize: 13 }}>🟢</Text>
                  </View>
                  <Text style={styles.trustBadgeTitle}>25% ADVANCE ONLY</Text>
                </View>

                <View style={styles.trustBadgeItem}>
                  <View style={[styles.trustBadgeIconCircle, { backgroundColor: '#EFF6FF' }]}>
                    <Text style={{ fontSize: 13 }}>👤</Text>
                  </View>
                  <Text style={styles.trustBadgeTitle}>TRANSPARENT BILLING</Text>
                </View>

                <View style={styles.trustBadgeItem}>
                  <View style={[styles.trustBadgeIconCircle, { backgroundColor: '#FEF3C7' }]}>
                    <Text style={{ fontSize: 13 }}>📞</Text>
                  </View>
                  <Text style={styles.trustBadgeTitle}>24X7 OPS SUPPORT</Text>
                </View>
              </View>

              {/* FLEET SHOWCASE SECTION (Matching Website) */}
              <View style={styles.homeFleetSection}>
                <Text style={styles.homeFleetTag}>OUR VEHICLE FLEET</Text>
                <Text style={styles.homeFleetTitle}>Choose the Right Cab for Your Journey</Text>
                <View style={styles.orangeUnderline} />
                <TouchableOpacity onPress={() => setActiveTab('FLEET')}>
                  <Text style={styles.homeFleetAction}>VIEW FULL FLEET & RATE CHART →</Text>
                </TouchableOpacity>

                {FLEET_CATEGORIES.map((v) => (
                  <View key={v.id} style={styles.webFleetCard}>
                    {/* Top: Car Image */}
                    <View style={styles.webFleetImageWrapper}>
                      <Image
                        source={{ uri: v.image }}
                        style={styles.webFleetImage}
                        resizeMode="cover"
                      />
                    </View>

                    {/* Header: Title & Star Rating Badge */}
                    <View style={styles.webFleetTitleRow}>
                      <Text style={styles.webFleetTitle}>{v.name}</Text>
                      <View style={styles.webFleetRatingPill}>
                        <Text style={styles.webFleetRatingStar}>⭐</Text>
                        <Text style={styles.webFleetRatingText}>{v.rating.toFixed(1)}</Text>
                      </View>
                    </View>

                    {/* Subtitle / Models */}
                    <Text style={styles.webFleetSubtitle}>
                      {v.capacity} AC Cab ({v.models})
                    </Text>

                    {/* Specs List with Fixed-width Left Icons */}
                    <View style={styles.webFleetSpecsContainer}>
                      <View style={styles.webFleetSpecRow}>
                        <Text style={styles.webFleetSpecIcon}>👤</Text>
                        <Text style={styles.webFleetSpecText}>Driver allowance Included</Text>
                      </View>

                      <View style={styles.webFleetSpecRow}>
                        <Text style={styles.webFleetSpecIcon}>🧳</Text>
                        <Text style={styles.webFleetSpecText}>
                          Luggage: {v.luggage} | Extra KM: ₹{v.extraKmRate}/km
                        </Text>
                      </View>

                      <View style={styles.webFleetSpecRow}>
                        <Text style={styles.webFleetSpecIcon}>⛽</Text>
                        <Text style={styles.webFleetSpecText}>
                          <Text style={{ fontWeight: '900', color: '#0F172A' }}>Fuel: </Text>
                          {v.fuel}
                        </Text>
                      </View>
                    </View>

                    {/* Horizontal Divider */}
                    <View style={styles.webFleetDivider} />

                    {/* Outstation Rate & CTA Button */}
                    <View style={styles.webFleetBottomRow}>
                      <View>
                        <Text style={styles.webFleetRateLabel}>OUTSTATION RATE</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                          <Text style={styles.webFleetRateAmount}>₹{v.ratePerKm}</Text>
                          <Text style={styles.webFleetRateUnit}>/km</Text>
                        </View>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.webFleetBookBtn}
                      onPress={() => {
                        setSelectedVehicle(v);
                        setCurrentStep('VEHICLES');
                      }}
                    >
                      <Text style={styles.webFleetBookBtnText}>BOOK THIS CAB →</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          </ImageBackground>
        </ScrollView>
      )}

      {/* ════════════════════════════════════
          TAB 1: HOME — 4-STEP BOOKING WIZARD (Matching Website Design)
          ════════════════════════════════════ */}
      {activeTab === 'HOME' && currentStep !== 'SEARCH' && (
        <ScrollView style={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          {/* 1. TOP NOTICE CARD (Dismissible) */}
          {!bannerDismissed && (
            <View style={styles.bookingTopNotice}>
              <View style={styles.bookingNoticeItemRow}>
                <View style={[styles.bookingNoticeIconCircle, { backgroundColor: '#E0F2FE' }]}>
                  <Text style={{ fontSize: 13, color: '#0284C7', fontWeight: '900' }}>₹</Text>
                </View>
                <Text style={styles.bookingNoticeTitle}>Book Now — at Zero Cost</Text>
                <TouchableOpacity onPress={() => setBannerDismissed(true)} style={{ marginLeft: 'auto', padding: 2 }}>
                  <Text style={{ color: '#0284C7', fontSize: 14, fontWeight: 'bold' }}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.bookingNoticeItemRow}>
                <View style={[styles.bookingNoticeIconCircle, { backgroundColor: '#CCFBF1' }]}>
                  <Text style={{ fontSize: 12 }}>🛡️</Text>
                </View>
                <Text style={styles.bookingNoticeSubText}>
                  Free Cancellations — <Text style={{ color: '#0284C7', fontWeight: 'bold' }}>Up to 1 Hour</Text>
                </Text>
              </View>

              <View style={styles.bookingNoticeItemRow}>
                <View style={[styles.bookingNoticeIconCircle, { backgroundColor: '#E0E7FF' }]}>
                  <Text style={{ fontSize: 12 }}>🎧</Text>
                </View>
                <Text style={styles.bookingNoticeSubText}>
                  24×7 Support — <Text style={{ color: '#0284C7', fontWeight: 'bold' }}>Live Dispatch</Text>
                </Text>
              </View>
            </View>
          )}

          {/* 2. 4-STEP WIZARD STEPPER BAR */}
          <View style={styles.wizardStepperContainer}>
            {/* Step 1: Vehicle */}
            <TouchableOpacity
              style={styles.wizardStepItem}
              onPress={() => setCurrentStep('VEHICLES')}
            >
              <View style={[styles.wizardStepCircle, currentStep === 'VEHICLES' && styles.wizardStepCircleActive]}>
                <Text style={[styles.wizardStepNumber, currentStep === 'VEHICLES' && styles.wizardStepNumberActive]}>1</Text>
              </View>
              <Text style={[styles.wizardStepLabel, currentStep === 'VEHICLES' && styles.wizardStepLabelActive]}>Vehicle</Text>
            </TouchableOpacity>

            <View style={styles.wizardStepLine} />

            {/* Step 2: Route */}
            <TouchableOpacity
              style={styles.wizardStepItem}
              onPress={() => setCurrentStep('ROUTE')}
            >
              <View style={[styles.wizardStepCircle, currentStep === 'ROUTE' && styles.wizardStepCircleActive]}>
                <Text style={[styles.wizardStepNumber, currentStep === 'ROUTE' && styles.wizardStepNumberActive]}>2</Text>
              </View>
              <Text style={[styles.wizardStepLabel, currentStep === 'ROUTE' && styles.wizardStepLabelActive]}>Route</Text>
            </TouchableOpacity>

            <View style={styles.wizardStepLine} />

            {/* Step 3: Coupon */}
            <TouchableOpacity
              style={styles.wizardStepItem}
              onPress={() => setCurrentStep('COUPON')}
            >
              <View style={[styles.wizardStepCircle, currentStep === 'COUPON' && styles.wizardStepCircleActive]}>
                <Text style={[styles.wizardStepNumber, currentStep === 'COUPON' && styles.wizardStepNumberActive]}>3</Text>
              </View>
              <Text style={[styles.wizardStepLabel, currentStep === 'COUPON' && styles.wizardStepLabelActive]}>Coupon</Text>
            </TouchableOpacity>

            <View style={styles.wizardStepLine} />

            {/* Step 4: Details */}
            <TouchableOpacity
              style={styles.wizardStepItem}
              onPress={() => setCurrentStep('CONFIRMATION')}
            >
              <View style={[styles.wizardStepCircle, currentStep === 'CONFIRMATION' && styles.wizardStepCircleActive]}>
                <Text style={[styles.wizardStepNumber, currentStep === 'CONFIRMATION' && styles.wizardStepNumberActive]}>4</Text>
              </View>
              <Text style={[styles.wizardStepLabel, currentStep === 'CONFIRMATION' && styles.wizardStepLabelActive]}>Details</Text>
            </TouchableOpacity>
          </View>

          {/* ════════════════════════════════════
              STEP 1: VEHICLE SELECTION (Matching Images 2, 3, 4)
              ════════════════════════════════════ */}
          {currentStep === 'VEHICLES' && (
            <View style={{ marginBottom: 20 }}>
              <View style={styles.stepHeaderRow}>
                <TouchableOpacity style={styles.backBtn} onPress={() => setCurrentStep('SEARCH')}>
                  <Text style={styles.backBtnText}>← BACK TO HOME</Text>
                </TouchableOpacity>
                <Text style={styles.stepHeaderTitle}>STEP 1: CHOOSE CAB</Text>
              </View>

              {FLEET_CATEGORIES.map((v) => {
                const isExpanded = expandedInclusionsId === v.id;
                const currentFuel = selectedFuelMap[v.id] || 'CNG';
                const originalPrice = Math.round(v.baseFare * 1.08);
                const discountedPrice = v.baseFare;

                return (
                  <View key={v.id} style={styles.bookingCarCard}>
                    {/* Top: Car Image */}
                    <View style={styles.bookingCarImageWrapper}>
                      <Image source={{ uri: v.image }} style={styles.bookingCarImage} resizeMode="cover" />
                    </View>

                    {/* Title & Star Rating */}
                    <View style={styles.bookingCarTitleRow}>
                      <Text style={styles.bookingCarTitle}>{v.name}</Text>
                      <View style={styles.bookingCarRatingBadge}>
                        <Text style={styles.bookingCarRatingText}>{v.rating.toFixed(1)} ★</Text>
                      </View>
                    </View>

                    <Text style={styles.bookingCarSubtitle}>{v.capacity} AC Cab</Text>

                    {/* Specs */}
                    <View style={styles.bookingCarSpecsBox}>
                      <View style={styles.bookingCarSpecRow}>
                        <Text style={{ fontSize: 13 }}>👤</Text>
                        <Text style={styles.bookingCarSpecText}>Driver allowance Included</Text>
                      </View>
                      <View style={styles.bookingCarSpecRow}>
                        <Text style={{ fontSize: 13 }}>🧳</Text>
                        <Text style={styles.bookingCarSpecText}>
                          50 kms included | Post limit: ₹{v.extraKmRate}/km
                        </Text>
                      </View>
                    </View>

                    {/* Select Fuel Type */}
                    <View style={styles.fuelSelectorRow}>
                      <Text style={styles.fuelSelectorLabel}>Select Fuel Type</Text>
                      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                        {['CNG', 'Diesel', 'Petrol'].map((ft) => (
                          <TouchableOpacity
                            key={ft}
                            style={styles.fuelRadioItem}
                            onPress={() => setSelectedFuelMap({ ...selectedFuelMap, [v.id]: ft })}
                          >
                            <View style={[styles.fuelRadioCircle, currentFuel === ft && styles.fuelRadioCircleActive]}>
                              {currentFuel === ft && <View style={styles.fuelRadioDot} />}
                            </View>
                            <Text style={[styles.fuelRadioText, currentFuel === ft && styles.fuelRadioTextActive]}>
                              {ft}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    {/* Price Box */}
                    <View style={styles.bookingPriceBox}>
                      <View style={styles.discountBadgeRow}>
                        <View style={styles.discountPill}>
                          <Text style={styles.discountPillText}>8% OFF</Text>
                        </View>
                        <Text style={styles.strikethroughPrice}>₹{originalPrice.toLocaleString()}</Text>
                      </View>

                      <Text style={styles.mainPriceAmount}>₹{discountedPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
                      <Text style={styles.taxesCaption}>+ ₹65 Charges and Taxes</Text>
                    </View>

                    {/* SELECT CAR Button */}
                    <TouchableOpacity
                      style={styles.selectCarOrangeBtn}
                      onPress={() => {
                        setSelectedVehicle(v);
                        setCurrentStep('ROUTE');
                      }}
                    >
                      <Text style={styles.selectCarOrangeBtnText}>SELECT CAR →</Text>
                    </TouchableOpacity>

                    {/* Inclusions / Exclusions Accordion Button */}
                    <TouchableOpacity
                      style={styles.inclusionsAccordionBtn}
                      onPress={() => setExpandedInclusionsId(isExpanded ? null : v.id)}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 13, color: '#0369A1' }}>🛡️</Text>
                        <Text style={styles.inclusionsBtnText}>Inclusions and Exclusions</Text>
                      </View>
                      <Text style={styles.inclusionsChevron}>{isExpanded ? '⌃' : '⌵'}</Text>
                    </TouchableOpacity>

                    {/* Expanded Accordion Details */}
                    {isExpanded && (
                      <View style={styles.inclusionsDetailsCard}>
                        <Text style={styles.inclusionsDetailsTitle}>Inclusions & Exclusions Details</Text>
                        <View style={styles.inclusionsItemRow}>
                          <Text style={styles.checkGreenIcon}>✓</Text>
                          <Text style={styles.inclusionsItemText}>Driver Allowance Included</Text>
                        </View>
                        <View style={styles.inclusionsItemRow}>
                          <Text style={styles.checkGreenIcon}>✓</Text>
                          <Text style={styles.inclusionsItemText}>Base Fuel Charges</Text>
                        </View>
                        <View style={styles.inclusionsItemRow}>
                          <Text style={styles.checkGreenIcon}>✓</Text>
                          <Text style={styles.inclusionsItemText}>AC Cab</Text>
                        </View>
                        <View style={styles.inclusionsDivider} />
                        <View style={styles.inclusionsItemRow}>
                          <Text style={styles.crossRedIcon}>✕</Text>
                          <Text style={styles.inclusionsItemText}>Extra km after 50 km @ ₹{v.extraKmRate.toFixed(2)}/km</Text>
                        </View>
                        <View style={styles.inclusionsItemRow}>
                          <Text style={styles.crossRedIcon}>✕</Text>
                          <Text style={styles.inclusionsItemText}>Tolls & Parking extra</Text>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* ════════════════════════════════════
              STEP 2: ROUTE & SCHEDULE
              ════════════════════════════════════ */}
          {currentStep === 'ROUTE' && (
            <View style={{ marginBottom: 20 }}>
              <View style={styles.stepHeaderRow}>
                <TouchableOpacity style={styles.backBtn} onPress={() => setCurrentStep('VEHICLES')}>
                  <Text style={styles.backBtnText}>← BACK TO VEHICLES</Text>
                </TouchableOpacity>
                <Text style={styles.stepHeaderTitle}>STEP 2: ROUTE & TIMINGS</Text>
              </View>

              {/* Selected Cab Summary */}
              <View style={styles.selectedCarBanner}>
                <Text style={styles.selectedCarBannerText}>
                  Selected: <Text style={{ fontWeight: '900', color: '#FF6B1A' }}>{selectedVehicle.name}</Text> ({selectedFuelMap[selectedVehicle.id] || 'Diesel'})
                </Text>
              </View>

              <View style={styles.bookingCard}>
                {/* Trip Type Selector */}
                <View style={styles.localPackageRow}>
                  {(['ONEWAY', 'ROUNDTRIP', 'LOCAL', 'AIRPORT'] as TripType[]).map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.localPackagePill, tripType === t && styles.localPackagePillActive]}
                      onPress={() => setTripType(t)}
                    >
                      <Text style={[styles.localPackageText, tripType === t && styles.localPackageTextActive]}>
                        {t === 'ONEWAY' ? 'ONE WAY' : t === 'ROUNDTRIP' ? 'ROUND' : t}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Airport Toggle */}
                {tripType === 'AIRPORT' && (
                  <View style={styles.airportToggleRow}>
                    <TouchableOpacity
                      style={[styles.airportToggleBtn, airportTripMode === 'PICKUP' && styles.airportToggleBtnActive]}
                      onPress={() => setAirportTripMode('PICKUP')}
                    >
                      <Text style={{ fontSize: 13 }}>🛬</Text>
                      <Text style={[styles.airportToggleText, airportTripMode === 'PICKUP' && styles.airportToggleTextActive]}>
                        Pickup from Airport
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.airportToggleBtn, airportTripMode === 'DROP' && styles.airportToggleBtnActive]}
                      onPress={() => setAirportTripMode('DROP')}
                    >
                      <Text style={{ fontSize: 13 }}>🛫</Text>
                      <Text style={[styles.airportToggleText, airportTripMode === 'DROP' && styles.airportToggleTextActive]}>
                        Drop to Airport
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Pickup Location */}
                <View style={styles.inputLabelRow}>
                  <Text style={styles.inputLabelIcon}>📍</Text>
                  <Text style={styles.inputLabelText}>
                    {tripType === 'LOCAL' ? 'CITY / TOWN' : tripType === 'AIRPORT' && airportTripMode === 'PICKUP' ? 'PICKUP AIRPORT' : 'PICKUP LOCATION'}
                  </Text>
                </View>
                <View style={styles.inputSearchWrapper}>
                  <Text style={styles.inputIcon}>🔍</Text>
                  <TextInput
                    style={styles.inputWithIcon}
                    value={pickupInput}
                    onChangeText={(val) => { setPickupInput(val); setShowPickupDropdown(true); }}
                    onFocus={() => setShowPickupDropdown(true)}
                    placeholder="Enter pickup location..."
                    placeholderTextColor="#94A3B8"
                  />
                </View>
                {showPickupDropdown && (
                  <View style={styles.suggestionsBox}>
                    {/* Use Current Location Quick Button */}
                    <TouchableOpacity
                      style={styles.currentLocationOption}
                      onPress={handleUseCurrentLocation}
                      activeOpacity={0.7}
                    >
                      <View style={styles.currentLocationIconBg}>
                        {isDetectingLocation ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={{ fontSize: 16 }}>📍</Text>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.currentLocationHeading}>
                          {isDetectingLocation ? locationStatusText : 'Use Current Location'}
                        </Text>
                        <Text style={styles.currentLocationSubheading}>
                          {isDetectingLocation ? 'Obtaining GPS coordinates...' : 'Auto-detect GPS & fine-tune pickup pin'}
                        </Text>
                      </View>
                      <Text style={styles.currentLocationArrow}>➔</Text>
                    </TouchableOpacity>

                    <View style={styles.suggestionDivider} />

                    {POPULAR_LOCATIONS.filter((loc) =>
                      loc.name.toLowerCase().includes(pickupInput.toLowerCase())
                    ).map((loc, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={styles.suggestionItem}
                        onPress={() => { setPickupInput(loc.name); setShowPickupDropdown(false); }}
                      >
                        <Text style={styles.suggestionName}>📍 {loc.name}</Text>
                        <Text style={styles.suggestionAddr}>{loc.address}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Swap Button (Hidden for Local) */}
                {tripType !== 'LOCAL' && (
                  <View style={styles.swapRightWrapper}>
                    <TouchableOpacity style={styles.swapCircleBtn} onPress={handleSwapLocations}>
                      <Text style={styles.swapIcon}>⇅</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Intermediate Stops for Round Trip */}
                {tripType === 'ROUNDTRIP' &&
                  stops.map((stopVal, sIdx) => (
                    <View key={sIdx} style={{ marginBottom: 10 }}>
                      <View style={styles.inputLabelRow}>
                        <Text style={styles.inputLabelIcon}>📍</Text>
                        <Text style={styles.inputLabelText}>{`INTERMEDIATE STOP #${sIdx + 1}`}</Text>
                      </View>
                      <View style={styles.inputSearchWrapper}>
                        <Text style={styles.inputIcon}>🔍</Text>
                        <TextInput
                          style={styles.inputWithIcon}
                          value={stopVal}
                          onChangeText={(val) => { handleUpdateStop(sIdx, val); setActiveStopIndex(sIdx); }}
                          onFocus={() => setActiveStopIndex(sIdx)}
                          placeholder={`Enter Stop #${sIdx + 1}...`}
                          placeholderTextColor="#94A3B8"
                        />
                        <TouchableOpacity onPress={() => handleRemoveStop(sIdx)} style={styles.removeStopCircleBtn}>
                          <Text style={styles.removeStopCircleIcon}>−</Text>
                        </TouchableOpacity>
                        {stops.length < 5 && (
                          <TouchableOpacity onPress={handleAddStop} style={styles.addStopCircleBtn}>
                            <Text style={styles.addStopCircleIcon}>+</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))}

                {/* Destination (Hidden for Local) */}
                {tripType !== 'LOCAL' && (
                  <>
                    <View style={styles.inputLabelRow}>
                      <Text style={styles.inputLabelIcon}>📍</Text>
                      <Text style={styles.inputLabelText}>
                        {tripType === 'AIRPORT' && airportTripMode === 'DROP' ? 'DROP AIRPORT' : 'DESTINATION LOCATION'}
                      </Text>
                    </View>
                    <View style={styles.inputSearchWrapper}>
                      <Text style={styles.inputIcon}>🔍</Text>
                      <TextInput
                        style={styles.inputWithIcon}
                        value={dropInput}
                        onChangeText={(val) => { setDropInput(val); setShowDropDropdown(true); }}
                        onFocus={() => setShowDropDropdown(true)}
                        placeholder="Enter drop destination..."
                        placeholderTextColor="#94A3B8"
                      />
                      {tripType === 'ROUNDTRIP' && (
                        <TouchableOpacity onPress={handleAddStop} style={styles.addStopCircleBtn}>
                          <Text style={styles.addStopCircleIcon}>+</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    {showDropDropdown && (
                      <View style={styles.suggestionsBox}>
                        {POPULAR_LOCATIONS.filter((loc) =>
                          loc.name.toLowerCase().includes(dropInput.toLowerCase())
                        ).map((loc, idx) => (
                          <TouchableOpacity
                            key={idx}
                            style={styles.suggestionItem}
                            onPress={() => { setDropInput(loc.name); setShowDropDropdown(false); }}
                          >
                            <Text style={styles.suggestionName}>🏁 {loc.name}</Text>
                            <Text style={styles.suggestionAddr}>{loc.address}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </>
                )}

                {/* Local Packages */}
                {tripType === 'LOCAL' && (
                  <View style={styles.localPackageSection}>
                    <Text style={styles.inputLabelText}>SELECT RENTAL PACKAGE</Text>
                    <View style={styles.localPackageRow}>
                      {['4hr / 40km', '8hr / 80km', '12hr / 120km'].map((pkg) => (
                        <TouchableOpacity
                          key={pkg}
                          style={[styles.localPackagePill, localPackage === pkg && styles.localPackagePillActive]}
                          onPress={() => setLocalPackage(pkg)}
                        >
                          <Text style={[styles.localPackageText, localPackage === pkg && styles.localPackageTextActive]}>
                            {pkg}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Date & Time Grid */}
                <View style={styles.dateTimeGrid}>
                  <TouchableOpacity
                    style={styles.dateTimeCard}
                    activeOpacity={0.7}
                    onPress={() => openDatePicker('PICKUP')}
                  >
                    <View style={styles.dateTimeCardHeader}>
                      <Text style={styles.dateTimeCardIcon}>📅</Text>
                      <Text style={styles.dateTimeCardLabel}>PICK UP DATE</Text>
                    </View>
                    <View style={styles.dateTimeValueRow}>
                      <Text style={styles.dateTimeValueText}>{pickupDate || 'Select Date'}</Text>
                      <Text style={styles.dateTimeEndIcon}>🗓️</Text>
                    </View>
                  </TouchableOpacity>

                  {tripType === 'ROUNDTRIP' && (
                    <TouchableOpacity
                      style={styles.dateTimeCard}
                      activeOpacity={0.7}
                      onPress={() => openDatePicker('RETURN')}
                    >
                      <View style={styles.dateTimeCardHeader}>
                        <Text style={styles.dateTimeCardIcon}>🔄</Text>
                        <Text style={styles.dateTimeCardLabel}>RETURN DATE</Text>
                      </View>
                      <View style={styles.dateTimeValueRow}>
                        <Text style={styles.dateTimeValueText}>{returnDate || 'Select Date'}</Text>
                        <Text style={styles.dateTimeEndIcon}>🗓️</Text>
                      </View>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.dateTimeCard}
                    activeOpacity={0.7}
                    onPress={() => setTimePickerOpen(true)}
                  >
                    <View style={styles.dateTimeCardHeader}>
                      <Text style={styles.dateTimeCardIcon}>⏰</Text>
                      <Text style={styles.dateTimeCardLabel}>PICK UP TIME</Text>
                    </View>
                    <View style={styles.dateTimeValueRow}>
                      <Text style={styles.dateTimeValueText}>{pickupTime || '07:00'}</Text>
                      <Text style={styles.dateTimeEndIcon}>🕒</Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Continue to Coupons Button */}
                <TouchableOpacity
                  style={styles.exploreCabsBtn}
                  onPress={() => {
                    if (!pickupInput || (tripType !== 'LOCAL' && !dropInput)) {
                      Alert.alert('Required', 'Please enter your pickup and destination locations.');
                      return;
                    }
                    setCurrentStep('COUPON');
                  }}
                >
                  <Text style={styles.exploreCabsBtnText}>CONTINUE TO COUPONS & OFFERS →</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ════════════════════════════════════
              STEP 3: COUPON & OFFERS
              ════════════════════════════════════ */}
          {currentStep === 'COUPON' && (
            <View style={{ marginBottom: 20 }}>
              <View style={styles.stepHeaderRow}>
                <TouchableOpacity style={styles.backBtn} onPress={() => setCurrentStep('ROUTE')}>
                  <Text style={styles.backBtnText}>← BACK TO ROUTE</Text>
                </TouchableOpacity>
                <Text style={styles.stepHeaderTitle}>STEP 3: APPLY COUPON</Text>
              </View>

              <View style={styles.bookingCard}>
                <Text style={styles.cardSectionTitle}>HAVE A PROMO CODE?</Text>
                <View style={styles.couponInputWrapper}>
                  <TextInput
                    style={styles.couponTextInput}
                    value={couponCode}
                    onChangeText={setCouponCode}
                    placeholder="Enter Coupon Code (e.g. KANDY100)"
                    autoCapitalize="characters"
                    placeholderTextColor="#94A3B8"
                  />
                  <TouchableOpacity style={styles.couponApplyBtn} onPress={() => handleApplyCoupon()}>
                    <Text style={styles.couponApplyBtnText}>APPLY</Text>
                  </TouchableOpacity>
                </View>

                {couponApplied && (
                  <View style={styles.couponSuccessBanner}>
                    <Text style={styles.couponSuccessText}>{couponMessage}</Text>
                  </View>
                )}

                <Text style={[styles.cardSectionTitle, { marginTop: 16 }]}>AVAILABLE OFFERS</Text>
                <View style={{ gap: 10 }}>
                  <TouchableOpacity
                    style={styles.couponCardItem}
                    onPress={() => handleApplyCoupon('KANDY100')}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.couponCardCode}>KANDY100</Text>
                      <Text style={styles.couponCardDesc}>Flat ₹100 OFF on all Outstation & Round Trips</Text>
                    </View>
                    <Text style={styles.couponCardApplyText}>APPLY OFFER</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.couponCardItem}
                    onPress={() => handleApplyCoupon('FIRSTCAB')}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.couponCardCode}>FIRSTCAB</Text>
                      <Text style={styles.couponCardDesc}>10% OFF up to ₹250 for first-time bookings</Text>
                    </View>
                    <Text style={styles.couponCardApplyText}>APPLY OFFER</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.couponCardItem}
                    onPress={() => handleApplyCoupon('AIRPORT50')}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.couponCardCode}>AIRPORT50</Text>
                      <Text style={styles.couponCardDesc}>Flat ₹50 OFF on Airport Transfers</Text>
                    </View>
                    <Text style={styles.couponCardApplyText}>APPLY OFFER</Text>
                  </TouchableOpacity>
                </View>

                {/* Fare Summary with Discount */}
                <View style={styles.fareBreakdownBox}>
                  <Text style={styles.fareBreakdownTitle}>FARE ESTIMATE</Text>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Standard Fare:</Text>
                    <Text style={styles.infoValue}>₹{rawFare.toLocaleString()}</Text>
                  </View>
                  {couponDiscount > 0 && (
                    <View style={styles.infoRow}>
                      <Text style={[styles.infoLabel, { color: '#059669', fontWeight: 'bold' }]}>Coupon Discount:</Text>
                      <Text style={[styles.infoValue, { color: '#059669', fontWeight: 'bold' }]}>− ₹{couponDiscount}</Text>
                    </View>
                  )}
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Estimated Total:</Text>
                    <Text style={styles.infoValueHighlight}>₹{calculatedFare.toLocaleString()}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.exploreCabsBtn}
                  onPress={() => setCurrentStep('CONFIRMATION')}
                >
                  <Text style={styles.exploreCabsBtnText}>CONTINUE TO PASSENGER DETAILS →</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ════════════════════════════════════
              STEP 4: PASSENGER DETAILS & CONFIRMATION
              ════════════════════════════════════ */}
          {currentStep === 'CONFIRMATION' && (
            <View style={{ marginBottom: 20 }}>
              <View style={styles.stepHeaderRow}>
                <TouchableOpacity style={styles.backBtn} onPress={() => setCurrentStep('COUPON')}>
                  <Text style={styles.backBtnText}>← BACK TO COUPON</Text>
                </TouchableOpacity>
                <Text style={styles.stepHeaderTitle}>STEP 4: CONFIRM & BOOK</Text>
              </View>

              <View style={styles.confirmationCard}>
                <Text style={styles.cardSectionTitle}>SELECTED ROUTE & CAB</Text>
                <View style={styles.routeBox}>
                  <Text style={styles.routeBoxText}>📍 Pickup: {pickupInput}</Text>
                  {stops.filter(Boolean).map((st, idx) => (
                    <Text key={idx} style={[styles.routeBoxText, { color: '#64748B', fontSize: 12 }]}>
                      🛑 Stop #{idx + 1}: {st}
                    </Text>
                  ))}
                  <Text style={styles.routeBoxText}>🏁 Destination: {dropInput}</Text>
                  <Text style={styles.routeBoxSub}>Date & Time: {pickupDate}, {pickupTime}</Text>
                  <Text style={styles.routeBoxSub}>
                    Cab Selected: {selectedVehicle.name} ({selectedFuelMap[selectedVehicle.id] || 'Diesel'})
                  </Text>
                </View>

                <Text style={styles.cardSectionTitle}>PASSENGER CONTACT DETAILS</Text>
                <Text style={styles.inputLabel}>FULL NAME *</Text>
                <TextInput
                  style={styles.input}
                  value={customerName}
                  onChangeText={setCustomerName}
                  placeholder="Enter your full name"
                  placeholderTextColor="#94A3B8"
                />
                <Text style={styles.inputLabel}>MOBILE NUMBER *</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="10-digit mobile number"
                  placeholderTextColor="#94A3B8"
                />
                <Text style={styles.inputLabel}>EMAIL ADDRESS (OPTIONAL)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="email-address"
                  value={customerEmail}
                  onChangeText={setCustomerEmail}
                  placeholder="name@example.com (optional)"
                  placeholderTextColor="#94A3B8"
                />
                <Text style={styles.inputLabel}>SPECIAL INSTRUCTIONS (OPTIONAL)</Text>
                <TextInput
                  style={styles.input}
                  value={specialNotes}
                  onChangeText={setSpecialNotes}
                  placeholder="e.g. Flight number, extra luggage space"
                  placeholderTextColor="#94A3B8"
                />

                <View style={styles.fareBreakdownBox}>
                  <Text style={styles.fareBreakdownTitle}>TRANSPARENT FARE BREAKDOWN</Text>
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>Route Distance:</Text><Text style={styles.infoValue}>~{estimatedDistanceKm} km</Text></View>
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>Cab Rate per km:</Text><Text style={styles.infoValue}>₹{selectedVehicle.ratePerKm}/km</Text></View>
                  {couponDiscount > 0 && (
                    <View style={styles.infoRow}>
                      <Text style={[styles.infoLabel, { color: '#059669', fontWeight: 'bold' }]}>Coupon Applied ({couponCode}):</Text>
                      <Text style={[styles.infoValue, { color: '#059669', fontWeight: 'bold' }]}>− ₹{couponDiscount}</Text>
                    </View>
                  )}
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>Total Estimated Fare:</Text><Text style={styles.infoValueHighlight}>₹{calculatedFare.toLocaleString()}</Text></View>
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>25% Advance Payable Now:</Text><Text style={[styles.infoValue, { color: KANDY_THEME.colors.primary, fontWeight: '900' }]}>₹{advancePayable.toLocaleString()}</Text></View>
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>Balance Payable to Driver:</Text><Text style={styles.infoValue}>₹{balancePayable.toLocaleString()}</Text></View>
                </View>

                <TouchableOpacity style={styles.finalBookBtn} onPress={handleConfirmFinalBooking}>
                  <Text style={styles.finalBookBtnText}>CONFIRM & PAY ₹{advancePayable.toLocaleString()} ADVANCE →</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ════════════════════════════════════
              STEP 5: SUCCESS SCREEN
              ════════════════════════════════════ */}
          {currentStep === 'SUCCESS' && (
            <View style={styles.successCard}>
              <Text style={styles.successIcon}>🎉</Text>
              <Text style={styles.successTitle}>BOOKING CONFIRMED SUCCESSFULLY!</Text>
              <Text style={styles.successSub}>
                Your chauffeur will be assigned 2 hours prior to your scheduled pickup time.
              </Text>
              <View style={styles.successDetailsBox}>
                <Text style={styles.successRef}>Booking Ref: {userBookings[0].id}</Text>
                <Text style={styles.successRoute}>{pickupInput} → {dropInput}</Text>
                <Text style={styles.successDate}>Date: {pickupDate}, {pickupTime}</Text>
                <Text style={styles.successFare}>Total Fare: ₹{calculatedFare.toLocaleString()}</Text>
                <Text style={styles.successAdvance}>25% Advance Paid: ₹{advancePayable.toLocaleString()} (PAID)</Text>
              </View>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => { setActiveTab('TRIPS'); setCurrentStep('SEARCH'); }}
              >
                <Text style={styles.primaryButtonText}>VIEW MY TRIPS & CHAUFFEUR STATUS →</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}




      {/* TAB 2: MY TRIPS & LIVE TRACKING */}
      {activeTab === 'TRIPS' && (
        <ScrollView style={styles.scrollContent}>
          <Text style={styles.pageHeading}>MY TRIPS & CHAUFFEUR TRACKING</Text>
          {userBookings.length === 0 ? (
            <View style={styles.emptyBookingsCard}>
              <Text style={{ fontSize: 44, textAlign: 'center', marginBottom: 12 }}>📭</Text>
              <Text style={styles.emptyBookingsTitle}>No Active Bookings</Text>
              <Text style={styles.emptyBookingsSub}>
                You don't have any cab bookings scheduled yet. Book your first ride now to track chauffeur status and trip invoices here.
              </Text>
              <TouchableOpacity
                style={styles.emptyBookingsBtn}
                onPress={() => {
                  setActiveTab('HOME');
                  setCurrentStep('SEARCH');
                }}
              >
                <Text style={styles.emptyBookingsBtnText}>+ BOOK A CAB NOW →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            userBookings.map((b) => (
              <View key={b.id} style={styles.tripCard}>
                <View style={styles.tripHeader}>
                  <Text style={styles.tripRef}>Ref: {b.id}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          b.status === 'COMPLETED' ? '#D1FAE5' : b.status === 'DRIVER EN ROUTE' ? '#FEF3C7' : '#DBEAFE',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color:
                            b.status === 'COMPLETED' ? '#065F46' : b.status === 'DRIVER EN ROUTE' ? '#92400E' : '#1E40AF',
                        },
                      ]}
                    >
                      {b.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.routeContainer}>
                  <Text style={styles.routeText}>📍 Pickup: {b.pickup}</Text>
                  <Text style={styles.routeArrow}>↓</Text>
                  <Text style={styles.routeText}>🏁 Destination: {b.drop}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Scheduled Date:</Text>
                  <Text style={styles.infoValue}>{b.date}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Vehicle Assigned:</Text>
                  <Text style={styles.infoValue}>{b.vehicleName}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Estimated Fare:</Text>
                  <Text style={styles.infoValue}>₹{Number(b?.totalFare || 0).toLocaleString()}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>25% Advance Paid:</Text>
                  <Text style={[styles.infoValue, { color: KANDY_THEME.colors.success }]}>
                    ₹{Number(b?.advancePaid || 0).toLocaleString()} (PAID)
                  </Text>
                </View>

                {Number(b?.balanceDue || 0) > 0 && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Balance Due to Driver:</Text>
                    <Text style={[styles.infoValue, { color: KANDY_THEME.colors.primary }]}>
                      ₹{Number(b?.balanceDue || 0).toLocaleString()}
                    </Text>
                  </View>
                )}

                {/* Chauffeur Card */}
                {b.status !== 'COMPLETED' ? (
                  <View style={styles.driverBox}>
                    <Text style={styles.driverTitle}>ASSIGNED CHAUFFEUR:</Text>
                    <Text style={styles.driverName}>
                      {b.driverName} ({b.driverRating})
                    </Text>
                    <TouchableOpacity style={styles.callButton} onPress={() => handleCallSupport(b.driverPhone)}>
                      <Text style={styles.callButtonText}>📞 CALL CHAUFFEUR (+91 {b.driverPhone})</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={[styles.driverBox, { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' }]}>
                    <Text style={[styles.driverTitle, { color: '#4B5563' }]}>COMPLETED CHAUFFEUR:</Text>
                    <Text style={[styles.driverName, { color: '#1F2937' }]}>{b.driverName}</Text>
                  </View>
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* TAB 3: FLEET & RATES SHOWCASE */}
      {activeTab === 'FLEET' && (
        <ScrollView style={styles.scrollContent}>
          <Text style={styles.pageHeading}>OUR VEHICLE FLEET & RATE CARD</Text>
          {FLEET_CATEGORIES.map((v) => (
            <View key={v.id} style={styles.webFleetCard}>
              <View style={styles.webFleetImageWrapper}>
                <Image source={{ uri: v.image }} style={styles.webFleetImage} resizeMode="cover" />
              </View>

              <View style={styles.webFleetTitleRow}>
                <Text style={styles.webFleetTitle}>{v.name}</Text>
                <View style={styles.webFleetRatingPill}>
                  <Text style={styles.webFleetRatingStar}>⭐</Text>
                  <Text style={styles.webFleetRatingText}>{v.rating.toFixed(1)}</Text>
                </View>
              </View>

              <Text style={styles.webFleetSubtitle}>{v.capacity} AC Cab ({v.models})</Text>

              <View style={styles.webFleetSpecsContainer}>
                <View style={styles.webFleetSpecRow}>
                  <Text style={styles.webFleetSpecIcon}>👤</Text>
                  <Text style={styles.webFleetSpecText}>Driver allowance Included</Text>
                </View>
                <View style={styles.webFleetSpecRow}>
                  <Text style={styles.webFleetSpecIcon}>🧳</Text>
                  <Text style={styles.webFleetSpecText}>Luggage: {v.luggage} | Extra KM: ₹{v.extraKmRate}/km</Text>
                </View>
                <View style={styles.webFleetSpecRow}>
                  <Text style={styles.webFleetSpecIcon}>⛽</Text>
                  <Text style={styles.webFleetSpecText}><Text style={{ fontWeight: '900', color: '#0F172A' }}>Fuel: </Text>{v.fuel}</Text>
                </View>
              </View>

              <View style={styles.webFleetDivider} />

              <View style={styles.webFleetBottomRow}>
                <View>
                  <Text style={styles.webFleetRateLabel}>OUTSTATION RATE</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                    <Text style={styles.webFleetRateAmount}>₹{v.ratePerKm}</Text>
                    <Text style={styles.webFleetRateUnit}>/km</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={styles.webFleetBookBtn}
                onPress={() => {
                  setSelectedVehicle(v);
                  setActiveTab('HOME');
                  setCurrentStep('SEARCH');
                }}
              >
                <Text style={styles.webFleetBookBtnText}>BOOK THIS {v.name.toUpperCase()} →</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {/* TAB 4: ACCOUNT & PROFILE */}
      {activeTab === 'ACCOUNT' && (
        <ScrollView style={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {!isLoggedIn ? (
            <View style={styles.authPageCard}>
              <View style={styles.authHeaderCenter}>
                <Image
                  source={require('./assets/kandycabs-logo.png')}
                  style={styles.authLogo}
                  resizeMode="contain"
                />
                <Text style={styles.authTitle}>Sign In to Kandy Cabs</Text>
                <Text style={styles.authSub}>
                  Unified Portal — Driver partners & customers are automatically directed to their account.
                </Text>
              </View>

              {!otpSent ? (
                <View style={{ marginTop: 10 }}>
                  <Text style={styles.authInputLabel}>MOBILE NUMBER</Text>
                  <View style={styles.phoneInputRow}>
                    <View style={styles.phonePrefixBox}>
                      <Text style={styles.phonePrefixText}>+91</Text>
                    </View>
                    <TextInput
                      style={styles.phoneTextInput}
                      keyboardType="phone-pad"
                      maxLength={10}
                      value={phone}
                      onChangeText={setPhone}
                      placeholder="10-digit mobile number"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.authSendOtpBtn}
                    onPress={handleSendOtp}
                    disabled={isSubmitting}
                  >
                    <Text style={{ fontSize: 14 }}>🔒</Text>
                    <Text style={styles.authSendOtpBtnText}>
                      {isSubmitting ? 'SENDING CODE...' : 'SEND OTP →'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ marginTop: 10 }}>
                  {isRegisteredUser && existingName ? (
                    <View style={styles.authWelcomeBackBanner}>
                      <Text style={styles.authWelcomeBackText}>
                        👋 Welcome back, <Text style={{ fontWeight: '900', color: '#064E3B' }}>{existingName}</Text>!
                      </Text>
                      <View style={styles.authVerifiedPill}>
                        <Text style={styles.authVerifiedPillText}>VERIFIED</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.authDemoOtpBanner}>
                      <Text style={styles.authDemoOtpText}>
                        Demo Verification Code: <Text style={{ fontWeight: '900', color: '#FF6B1A' }}>1234</Text> (Sent to +91 {phone})
                      </Text>
                    </View>
                  )}

                  <Text style={styles.authInputLabel}>ENTER 4-DIGIT OTP</Text>
                  <TextInput
                    style={styles.authOtpInput}
                    keyboardType="number-pad"
                    maxLength={4}
                    value={otp}
                    onChangeText={setOtp}
                    placeholder="1234"
                    placeholderTextColor="#CBD5E1"
                  />

                  {!isRegisteredUser && isNewUser && (
                    <View style={{ marginTop: 10 }}>
                      <View style={styles.newUserNoticeCard}>
                        <Text style={styles.newUserNoticeText}>
                          👋 First time here! Enter your name once — we'll remember you for future bookings.
                        </Text>
                      </View>

                      <Text style={[styles.authInputLabel, { marginTop: 10 }]}>FULL NAME *</Text>
                      <TextInput
                        style={styles.authNameInput}
                        value={customerName}
                        onChangeText={setCustomerName}
                        placeholder="Enter your full name"
                        placeholderTextColor="#94A3B8"
                        autoFocus={true}
                      />
                    </View>
                  )}

                  <View style={styles.authOtpButtonsRow}>
                    <TouchableOpacity
                      style={styles.authBackBtn}
                      onPress={() => {
                        setOtpSent(false);
                        setIsNewUser(false);
                      }}
                    >
                      <Text style={styles.authBackBtnText}>BACK</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.authVerifySignInBtn}
                      onPress={handleVerifyOtp}
                      disabled={isSubmitting}
                    >
                      <Text style={{ fontSize: 13 }}>🛡️</Text>
                      <Text style={styles.authVerifySignInBtnText}>
                        {isSubmitting ? 'VERIFYING...' : 'VERIFY & SIGN IN →'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          ) : (
            <View>
              {/* Profile Card matching Image 4 */}
              <View style={styles.profileWelcomeCard}>
                <View style={styles.profileWelcomeTopRow}>
                  <View style={styles.profileAvatarCircle}>
                    <Text style={styles.profileAvatarText}>
                      {(customerName || 'Customer').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={styles.profileWelcomeTitle}>Welcome, {customerName || 'Customer'}!</Text>
                    <Text style={styles.profileWelcomeSub}>
                      📞 +91 {phone} • Customer Account
                    </Text>
                  </View>
                </View>

                <View style={styles.profileActionBtnsRow}>
                  <TouchableOpacity
                    style={styles.profileBookNewBtn}
                    onPress={() => {
                      setActiveTab('HOME');
                      setCurrentStep('SEARCH');
                    }}
                  >
                    <Text style={styles.profileBookNewBtnText}>+ BOOK NEW CAB</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.profileLogoutBtn} onPress={handleLogout}>
                    <Text style={styles.profileLogoutBtnText}>↪ Logout</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Bookings Header with Orange Vertical Bar */}
              <View style={styles.profileBookingsHeaderRow}>
                <View style={styles.profileBookingsAccentBar} />
                <Text style={{ fontSize: 18, marginLeft: 8 }}>📑</Text>
                <Text style={styles.profileBookingsHeading}>Your Bookings & Trip Invoices</Text>
              </View>

              {/* List of Bookings */}
              {userBookings.length === 0 ? (
                <View style={styles.emptyBookingsCard}>
                  <Text style={{ fontSize: 44, textAlign: 'center', marginBottom: 12 }}>📭</Text>
                  <Text style={styles.emptyBookingsTitle}>No Bookings Found</Text>
                  <Text style={styles.emptyBookingsSub}>
                    You haven't made any cab bookings yet. All your confirmed bookings and GST tax invoices will appear here.
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyBookingsBtn}
                    onPress={() => {
                      setActiveTab('HOME');
                      setCurrentStep('SEARCH');
                    }}
                  >
                    <Text style={styles.emptyBookingsBtnText}>+ BOOK A CAB NOW →</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                userBookings.map((b) => (
                  <View key={b.id} style={styles.profileBookingCard}>
                    <View style={styles.profileBookingTopRow}>
                      <Text style={styles.profileBookingRef}>
                        Ref: <Text style={{ color: '#FF6B1A' }}>{b.id}</Text>
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <View style={styles.profileBadgeDark}>
                          <Text style={styles.profileBadgeDarkText}>🕒 {(b as any).tripType || 'ONEWAY'}</Text>
                        </View>
                        <View style={styles.profileBadgeAmber}>
                          <Text style={styles.profileBadgeAmberText}>🕒 {b.status}</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.profileRouteBox}>
                      <View style={styles.profileRouteItem}>
                        <Text style={{ fontSize: 14 }}>📍</Text>
                        <Text style={styles.profileRouteText}>{b.pickup}</Text>
                      </View>
                      <View style={styles.profileRouteItem}>
                        <Text style={{ fontSize: 14 }}>↗</Text>
                        <Text style={styles.profileRouteText}>{b.drop}</Text>
                      </View>
                    </View>

                    <View style={styles.profileDateRow}>
                      <Text style={styles.profileDateText}>📅 {b.date}</Text>
                      <View style={styles.profileTimePill}>
                        <Text style={styles.profileTimeText}>🕒 {(b as any).time || '06:03 pm'}</Text>
                      </View>
                    </View>

                    <View style={styles.profileVehicleRow}>
                      <Text style={{ fontSize: 13 }}>👤</Text>
                      <Text style={styles.profileVehicleText}>{b.vehicleName} • ~245 km</Text>
                    </View>

                    <View style={styles.profileOpsNoticeBox}>
                      <Text style={{ fontSize: 12 }}>🛡️</Text>
                      <Text style={styles.profileOpsNoticeText}>
                        Driver details will be released by ops prior to pickup time.
                      </Text>
                    </View>

                    {/* Fare Breakdown Box (Matching Website Image) */}
                    <View style={styles.profileFareBox}>
                      <Text style={styles.profileFareLabel}>ESTIMATED TOTAL</Text>
                      <Text style={styles.profileFareTotal}>₹{Number(b?.totalFare || 0).toLocaleString()}</Text>
                      <View style={styles.profileFareRow}>
                        <Text style={styles.profileFareSubLabel}>25% Advance Paid:</Text>
                        <Text style={styles.profileFareAdvanceVal}>₹{Number(b?.advancePaid || 0).toLocaleString()}</Text>
                      </View>
                      <View style={styles.profileFareRow}>
                        <Text style={styles.profileFareSubLabel}>Balance Pending:</Text>
                        <Text style={styles.profileFareBalanceVal}>₹{Number(b?.balanceDue || 0).toLocaleString()}</Text>
                      </View>
                    </View>

                    {/* Action Buttons: Cancel Ride & View Invoice */}
                    <TouchableOpacity
                      style={styles.profileCancelBtn}
                      onPress={() => {
                        Alert.alert(
                          'Cancel Booking',
                          `Are you sure you want to cancel booking ${b.id}? Free cancellations are allowed up to 1 hour before pickup.`,
                          [
                            { text: 'Keep Booking', style: 'cancel' },
                            {
                              text: 'Yes, Cancel',
                              style: 'destructive',
                              onPress: () => {
                                setUserBookings((prev) =>
                                  prev.map((item) =>
                                    item.id === b.id ? { ...item, status: 'CANCELLED' } : item
                                  )
                                );
                                Alert.alert('Booking Cancelled', `Booking ${b.id} has been cancelled.`);
                              },
                            },
                          ]
                        );
                      }}
                    >
                      <Text style={styles.profileCancelIcon}>ⓧ</Text>
                      <Text style={styles.profileCancelText}>CANCEL RIDE</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.profileInvoiceBtn}
                      onPress={() => {
                        Alert.alert(
                          'Trip Tax Invoice',
                          `==============================\nKANDY CABS OFFICIAL INVOICE\n==============================\nBooking Ref: ${b.id}\nCustomer: ${customerName || 'Valued Customer'}\nPhone: +91 ${phone}\n\nRoute: ${b.pickup} → ${b.drop}\nVehicle: ${b.vehicleName}\n\nTotal Fare: ₹${b.totalFare}\n25% Advance Paid: ₹${b.advancePaid} (PAID)\nBalance Due: ₹${b.balanceDue}\nStatus: ${b.status}\n==============================`
                        );
                      }}
                    >
                      <Text style={styles.profileInvoiceIcon}>📄</Text>
                      <Text style={styles.profileInvoiceText}>VIEW INVOICE</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          )}
        </ScrollView>
      )}


      {/* TAB: CONTACT US PAGE */}
      {activeTab === 'CONTACT' && (
        <ScrollView style={styles.scrollContent}>
          <View style={styles.bookingCard}>
            <Text style={styles.cardSectionTitle}>24x7 CUSTOMER SUPPORT</Text>
            <Text style={styles.pageHeading}>Get in Touch with Our Operations Team</Text>

            <TouchableOpacity style={styles.callSupportBtn} onPress={() => handleCallSupport('9876543210')}>
              <Text style={styles.callSupportText}>📞 Call Customer Helpline: +91 98765 43210</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.callSupportBtn, { backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FFEDD5' }]}
              onPress={() => Linking.openURL('mailto:support@kandycabs.com')}
            >
              <Text style={[styles.callSupportText, { color: '#EA580C' }]}>✉️ Email: support@kandycabs.com</Text>
            </TouchableOpacity>

            <View style={styles.routeBox}>
              <Text style={styles.routeBoxText}>📍 Headquarters Address:</Text>
              <Text style={styles.routeBoxSub}>#45, 100 Feet Road, Indiranagar, Bengaluru, Karnataka 560038</Text>
            </View>

            <View style={styles.menuDivider} />

            <Text style={styles.cardSectionTitle}>SEND US A MESSAGE</Text>
            <Text style={styles.inputLabel}>YOUR FULL NAME</Text>
            <TextInput
              style={styles.input}
              value={contactName}
              onChangeText={setContactName}
              placeholder="e.g. Ranju M"
            />

            <Text style={styles.inputLabel}>MOBILE NUMBER</Text>
            <TextInput
              style={styles.input}
              keyboardType="phone-pad"
              value={contactPhoneInput}
              onChangeText={setContactPhoneInput}
              placeholder="10-digit mobile number"
            />

            <Text style={styles.inputLabel}>SUBJECT</Text>
            <TextInput
              style={styles.input}
              value={contactSubject}
              onChangeText={setContactSubject}
              placeholder="Booking enquiry / Feedback"
            />

            <Text style={styles.inputLabel}>MESSAGE / REQUIREMENTS</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              multiline={true}
              numberOfLines={3}
              value={contactMessage}
              onChangeText={setContactMessage}
              placeholder="Describe your trip requirements or query..."
            />

            <TouchableOpacity
              style={styles.exploreCabsBtn}
              onPress={() => {
                if (!contactName || !contactPhoneInput) {
                  Alert.alert('Required', 'Please fill in your name and phone number.');
                  return;
                }
                Alert.alert('Message Sent!', 'Thank you! Our 24x7 support team will call you back within 15 minutes.');
                setContactName('');
                setContactPhoneInput('');
                setContactMessage('');
              }}
            >
              <Text style={styles.exploreCabsBtnText}>SUBMIT MESSAGE →</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* FLOATING BOTTOM NAVIGATION TAB BAR (Only shown on Home Search Page) */}
      {activeTab === 'HOME' && currentStep === 'SEARCH' && (
        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={[styles.bottomNavItem, tripType === 'ONEWAY' && styles.bottomNavItemActive]}
            onPress={() => {
              setTripType('ONEWAY');
              setActiveTab('HOME');
              setCurrentStep('SEARCH');
            }}
          >
            <Text style={styles.bottomNavIcon}>🚗</Text>
            <Text style={[styles.bottomNavText, tripType === 'ONEWAY' && styles.bottomNavTextActive]}>ONE WAY</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.bottomNavItem, tripType === 'ROUNDTRIP' && styles.bottomNavItemActive]}
            onPress={() => {
              setTripType('ROUNDTRIP');
              setActiveTab('HOME');
              setCurrentStep('SEARCH');
            }}
          >
            <Text style={styles.bottomNavIcon}>🔄</Text>
            <Text style={[styles.bottomNavText, tripType === 'ROUNDTRIP' && styles.bottomNavTextActive]}>
              ROUND TRIP
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.bottomNavItem, tripType === 'LOCAL' && styles.bottomNavItemActive]}
            onPress={() => {
              setTripType('LOCAL');
              setActiveTab('HOME');
              setCurrentStep('SEARCH');
            }}
          >
            <Text style={styles.bottomNavIcon}>📍</Text>
            <Text style={[styles.bottomNavText, tripType === 'LOCAL' && styles.bottomNavTextActive]}>LOCAL</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.bottomNavItem, tripType === 'AIRPORT' && styles.bottomNavItemActive]}
            onPress={() => {
              setTripType('AIRPORT');
              setActiveTab('HOME');
              setCurrentStep('SEARCH');
            }}
          >
            <Text style={styles.bottomNavIcon}>✈️</Text>
            <Text style={[styles.bottomNavText, tripType === 'AIRPORT' && styles.bottomNavTextActive]}>AIRPORT</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ─── CALENDAR DATE PICKER MODAL (Matching Screenshot) ─── */}
      <Modal
        visible={datePickerTarget !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDatePickerTarget(null)}
      >
        <TouchableOpacity
          style={styles.pickerModalOverlay}
          activeOpacity={1}
          onPress={() => setDatePickerTarget(null)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.calendarModalCard}>
            {/* Header: Month Year and Up/Down navigation arrows */}
            <View style={styles.calendarHeaderRow}>
              <View style={styles.calendarTitleRow}>
                <Text style={styles.calendarMonthTitle}>
                  {MONTH_NAMES[datePickerMonth.getMonth()]}, {datePickerMonth.getFullYear()}
                </Text>
                <Text style={styles.calendarMonthChevron}>▾</Text>
              </View>
              <View style={styles.calendarNavArrowsRow}>
                <TouchableOpacity
                  style={styles.calendarArrowBtn}
                  onPress={handlePrevMonth}
                >
                  <Text style={styles.calendarArrowIcon}>↑</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.calendarArrowBtn}
                  onPress={handleNextMonth}
                >
                  <Text style={styles.calendarArrowIcon}>↓</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Day of Week Header Row */}
            <View style={styles.calendarWeekRow}>
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                <Text key={d} style={styles.calendarWeekDayText}>
                  {d}
                </Text>
              ))}
            </View>

            {/* Calendar Days Grid */}
            <View style={styles.calendarDaysGrid}>
              {getCalendarCells().map((cell) => {
                return (
                  <TouchableOpacity
                    key={cell.key}
                    style={[
                      styles.calendarDayCell,
                      cell.isToday && !cell.isSelected && styles.calendarDayCellToday,
                      cell.isSelected && styles.calendarDayCellSelected,
                    ]}
                    onPress={() => handleSelectCalendarDate(cell.dateObj)}
                  >
                    <Text
                      style={[
                        styles.calendarDayNumberText,
                        !cell.isCurrentMonth && styles.calendarDayNumberDimmed,
                        cell.isToday && !cell.isSelected && styles.calendarDayNumberToday,
                        cell.isSelected && styles.calendarDayNumberSelected,
                      ]}
                    >
                      {cell.dayNumber}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Bottom Actions: Clear & Today */}
            <View style={styles.calendarBottomActionsRow}>
              <TouchableOpacity
                onPress={() => {
                  if (datePickerTarget === 'PICKUP') setPickupDate('15-09-2026');
                  else if (datePickerTarget === 'RETURN') setReturnDate('17-09-2026');
                  setDatePickerTarget(null);
                }}
              >
                <Text style={styles.calendarBottomBtnText}>Clear</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  const now = new Date();
                  const formatted = formatDateDDMMYYYY(now);
                  if (datePickerTarget === 'PICKUP') setPickupDate(formatted);
                  else if (datePickerTarget === 'RETURN') setReturnDate(formatted);
                  setDatePickerTarget(null);
                }}
              >
                <Text style={styles.calendarBottomBtnText}>Today</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ─── TIME PICKER MODAL (Matching Screenshot) ─── */}
      <Modal
        visible={timePickerOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setTimePickerOpen(false)}
      >
        <TouchableOpacity
          style={styles.pickerModalOverlay}
          activeOpacity={1}
          onPress={() => setTimePickerOpen(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.timePickerCard}>
            {/* Top Selection Badges */}
            <View style={styles.timeTopSelectionRow}>
              <View style={styles.timeTopBadge}>
                <Text style={styles.timeTopBadgeText}>{currentHour}</Text>
              </View>
              <View style={styles.timeTopBadge}>
                <Text style={styles.timeTopBadgeText}>{currentMinute}</Text>
              </View>
            </View>

            {/* Two Scrollable Columns */}
            <View style={styles.timeColumnsContainer}>
              {/* Hours Column */}
              <ScrollView
                style={styles.timeColumnScroll}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
              >
                {HOURS_LIST.map((h) => {
                  const isSelected = h === currentHour;
                  return (
                    <TouchableOpacity
                      key={h}
                      style={[styles.timeItemBtn, isSelected && styles.timeItemBtnActive]}
                      onPress={() => setPickupTime(`${h}:${currentMinute}`)}
                    >
                      <Text
                        style={[styles.timeItemText, isSelected && styles.timeItemTextActive]}
                      >
                        {h}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Minutes Column */}
              <ScrollView
                style={styles.timeColumnScroll}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
              >
                {MINUTES_LIST.map((m) => {
                  const isSelected = m === currentMinute;
                  return (
                    <TouchableOpacity
                      key={m}
                      style={[styles.timeItemBtn, isSelected && styles.timeItemBtnActive]}
                      onPress={() => setPickupTime(`${currentHour}:${m}`)}
                    >
                      <Text
                        style={[styles.timeItemText, isSelected && styles.timeItemTextActive]}
                      >
                        {m}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Confirm / Done Button */}
            <TouchableOpacity
              style={styles.timeDoneBtn}
              onPress={() => setTimePickerOpen(false)}
            >
              <Text style={styles.timeDoneBtnText}>SET TIME</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ─── INTERACTIVE PICKUP MAP PIN ADJUSTMENT MODAL ─── */}
      <Modal
        visible={mapModalOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setMapModalOpen(false)}
      >
        <View style={styles.mapModalOverlay}>
          <View style={styles.mapModalCard}>
            {/* Header */}
            <View style={styles.mapModalHeader}>
              <View>
                <Text style={styles.mapModalTitle}>SET PICKUP PIN</Text>
                <Text style={styles.mapModalSubtitle}>Fine-tune your exact pickup location</Text>
              </View>
              <TouchableOpacity
                style={styles.mapModalCloseBtn}
                onPress={() => setMapModalOpen(false)}
              >
                <Text style={styles.mapModalCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Interactive Map Visual Area using react-native-maps */}
            <View style={styles.mapCanvasWrapper}>
              <MapView
                ref={mapRef}
                style={StyleSheet.absoluteFillObject}
                initialRegion={{
                  latitude: tempMapCoords.latitude,
                  longitude: tempMapCoords.longitude,
                  latitudeDelta: 0.005,
                  longitudeDelta: 0.005,
                }}
                onRegionChangeComplete={handleMapRegionChangeComplete}
                showsUserLocation={true}
                showsMyLocationButton={false}
                showsCompass={true}
                rotateEnabled={true}
                scrollEnabled={true}
                zoomEnabled={true}
                pitchEnabled={true}
              />

              {/* Fixed Center Pin on Top of Interactive Map */}
              <View style={styles.centerPinFixedWrapper} pointerEvents="none">
                <View style={styles.mapPinBadge}>
                  <Text style={styles.mapPinBadgeText}>📍 PICKUP HERE</Text>
                </View>
                <Text style={styles.mapPinIcon}>📍</Text>
                <View style={styles.mapPinShadow} />
              </View>

              {/* Map Floating Controls: Zoom & Recenter */}
              <View style={styles.mapFloatingControls}>
                <TouchableOpacity
                  style={styles.mapControlBtn}
                  onPress={() => handleMapZoom('in')}
                >
                  <Text style={styles.mapControlBtnText}>+</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.mapControlBtn}
                  onPress={() => handleMapZoom('out')}
                >
                  <Text style={styles.mapControlBtnText}>−</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.mapControlBtn, { marginTop: 8, backgroundColor: '#FF6B1A' }]}
                  onPress={handleRecenterGps}
                >
                  <Text style={[styles.mapControlBtnText, { color: '#FFF' }]}>🎯</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Bottom Sheet Details & Confirmation */}
            <View style={styles.mapBottomSheet}>
              {/* Accuracy Pill */}
              <View style={styles.accuracyPillRow}>
                <View
                  style={[
                    styles.accuracyPill,
                    tempMapCoords.accuracy && tempMapCoords.accuracy > 25
                      ? styles.accuracyPillWarning
                      : styles.accuracyPillSuccess,
                  ]}
                >
                  <Text
                    style={[
                      styles.accuracyPillText,
                      tempMapCoords.accuracy && tempMapCoords.accuracy > 25
                        ? styles.accuracyPillTextWarning
                        : styles.accuracyPillTextSuccess,
                    ]}
                  >
                    {tempMapCoords.accuracy
                      ? tempMapCoords.accuracy <= 25
                        ? `🟢 GPS Accuracy: ~${Math.round(tempMapCoords.accuracy)} m`
                        : `🟠 GPS Accuracy: ~${Math.round(tempMapCoords.accuracy)} m (Adjust pin for precision)`
                      : '📍 Estimated Location'}
                  </Text>
                </View>
              </View>

              {/* Detected Address Box */}
              <View style={styles.mapAddressCard}>
                <View style={styles.mapAddressHeaderRow}>
                  <Text style={styles.mapAddressIcon}>📍</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.mapAddressTitle} numberOfLines={1}>
                      {tempShortAddress || 'Pickup Location'}
                    </Text>
                    {isReverseGeocoding ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <ActivityIndicator size="small" color="#FF6B1A" />
                        <Text style={styles.mapAddressSub}>Finding updated address...</Text>
                      </View>
                    ) : (
                      <Text style={styles.mapAddressSub} numberOfLines={2}>
                        {tempGeocodedAddress || 'Address detected from GPS pin'}
                      </Text>
                    )}
                  </View>
                </View>
              </View>

              {/* Action Buttons */}
              <TouchableOpacity
                style={styles.mapConfirmBtn}
                activeOpacity={0.8}
                onPress={handleConfirmMapPickup}
              >
                <Text style={styles.mapConfirmBtnText}>CONFIRM PICKUP LOCATION →</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    flex: 1,
    padding: 14,
    backgroundColor: '#F8FAFC',
  },
  navbar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoImage: {
    width: 145,
    height: 40,
  },
  hamburgerBtn: {
    padding: 6,
    borderRadius: 8,
  },
  hamburgerIcon: {
    color: '#0F172A',
    fontSize: 24,
    fontWeight: '900',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  menuBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  menuDrawer: {
    backgroundColor: '#FFFFFF',
    width: '85%',
    maxWidth: 360,
    height: '100%',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 10,
    justifyContent: 'space-between',
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 12,
  },
  menuLogoImage: {
    width: 135,
    height: 36,
  },
  menuCloseCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuCloseBtnText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '900',
  },
  menuCloseBtn: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '900',
  },
  menuContent: {
    flex: 1,
  },

  // ─── WELCOME IDENTITY CARD (Exact Website SideMenu Style) ───
  welcomeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
  },
  welcomeCardLoggedIn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
  },
  welcomeAvatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeAvatarIcon: {
    fontSize: 20,
    color: '#64748B',
  },
  welcomeAvatarCircleLoggedIn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFEDD5',
    borderWidth: 1,
    borderColor: '#FED7AA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeAvatarIconLoggedIn: {
    fontSize: 20,
  },
  welcomeTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 18,
  },
  welcomeSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    lineHeight: 16,
  },
  welcomeSubLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  welcomeUserName: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0F172A',
  },
  welcomeUserRole: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#94A3B8',
  },

  // ─── DRAWER NAV ITEMS LIST ───
  drawerNavList: {
    gap: 4,
    marginBottom: 16,
  },
  drawerNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  drawerNavItemActive: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  drawerNavLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  drawerNavIcon: {
    fontSize: 16,
    width: 22,
    textAlign: 'center',
  },
  drawerNavIconActive: {
    fontSize: 16,
  },
  drawerNavText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
  },
  drawerNavTextActive: {
    fontSize: 13,
    fontWeight: '900',
    color: '#EA580C',
  },
  drawerNavChevron: {
    fontSize: 16,
    fontWeight: '900',
    color: '#94A3B8',
  },
  drawerNavChevronActive: {
    color: '#EA580C',
  },

  // ─── BOTTOM SECTION: ACTIONS, 24x7 SUPPORT & APP VERSION ───
  drawerBottomSection: {
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 10,
  },
  drawerSignInBtn: {
    backgroundColor: '#FF6B1A',
    height: 46,
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#FF6B1A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  drawerSignInIcon: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  drawerSignInText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  drawerSignInChevron: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  drawerPortalBtn: {
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  drawerPortalText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  drawerLogoutBtn: {
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerLogoutText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#DC2626',
    letterSpacing: 0.5,
  },
  drawerSupportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 10,
    paddingHorizontal: 12,
  },
  drawerSupportLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  drawerSupportNumber: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0F172A',
  },
  drawerCallIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  drawerVersionText: {
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 4,
    marginBottom: 8,
  },
  fleetTag: {
    fontSize: 9,
    fontWeight: '900',
    color: '#EA580C',
    backgroundColor: '#FFEDD5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  authModalCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  authModalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: KANDY_THEME.colors.ink,
  },
  authModalSub: {
    fontSize: 12,
    color: KANDY_THEME.colors.textMuted,
    marginBottom: 14,
    marginTop: 2,
  },
  mainHomeScroll: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  // ─── HERO IMAGE BACKGROUND (Light Warm Overlay matching Website) ───
  heroBgImage: {
    width: '100%',
  },
  heroOverlay: {
    backgroundColor: 'rgba(255, 255, 255, 0.84)',
    paddingBottom: 20,
  },
  heroNavbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  logoImageHero: {
    width: 145,
    height: 42,
  },
  heroContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 32,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    lineHeight: 19,
  },

  // ─── BOOKING CARD (White Rounded Card matching Website Reference) ───
  bookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 25,
    elevation: 4,
  },
  inputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 4,
  },
  inputLabelIcon: {
    fontSize: 12,
  },
  inputLabelText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#1E293B',
    letterSpacing: 0.5,
  },
  inputSearchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    fontSize: 14,
    color: '#FF6B1A',
    marginRight: 8,
  },
  inputWithIcon: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    paddingVertical: 8,
  },
  suggestionsBox: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    marginTop: 4,
    marginBottom: 8,
    maxHeight: 180,
    elevation: 3,
  },
  suggestionItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  suggestionName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  suggestionAddr: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },

  // ─── MULTI-DESTINATION STOP BUTTONS ───
  addStopCircleBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  addStopCircleIcon: {
    fontSize: 15,
    fontWeight: '900',
    color: '#64748B',
    marginTop: -2,
  },
  removeStopCircleBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  removeStopCircleIcon: {
    fontSize: 15,
    fontWeight: '900',
    color: '#EF4444',
    marginTop: -2,
  },

  // ─── AIRPORT DIRECTION TOGGLE ───
  airportToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  airportToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  airportToggleBtnActive: {
    backgroundColor: '#FF6B1A',
    shadowColor: '#FF6B1A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  airportToggleIcon: {
    fontSize: 13,
  },
  airportToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  airportToggleTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },

  // ─── LOCAL RENTAL PACKAGES ───
  localPackageSection: {
    marginBottom: 10,
  },
  localPackageRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  localPackagePill: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  localPackagePillActive: {
    backgroundColor: '#FF6B1A',
    borderColor: '#FF6B1A',
  },
  localPackageText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  localPackageTextActive: {
    color: '#FFFFFF',
  },

  // ─── FLOATING RIGHT-SIDE SWAP BUTTON ───
  swapRightWrapper: {
    alignItems: 'flex-end',
    paddingRight: 14,
    marginVertical: -14,
    zIndex: 20,
  },
  swapCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF6B1A',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#FF6B1A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  swapIcon: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },

  // ─── DATE & TIME GRID ───
  dateTimeGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  dateTimeCard: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 10,
    minHeight: 64,
    justifyContent: 'space-between',
  },
  dateTimeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  dateTimeCardIcon: {
    fontSize: 12,
  },
  dateTimeCardLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#1E293B',
    letterSpacing: 0.5,
  },
  dateTimeValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateTimeInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '900',
    color: '#1E293B',
    padding: 0,
  },
  dateTimeEndIcon: {
    fontSize: 12,
  },

  // ─── BIG ORANGE CTA BUTTON ───
  exploreCabsBtn: {
    backgroundColor: '#FF6B1A',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 14,
    shadowColor: '#FF6B1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  exploreCabsBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  // ─── 4 TRUST BADGES GRID (2x2 matching website) ───
  trustBadgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  trustBadgeItem: {
    flexBasis: '48%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 16,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  trustBadgeIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trustBadgeTitle: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#1E293B',
    letterSpacing: 0.2,
    flex: 1,
  },

  // ─── FLEET SHOWCASE SECTION ───
  homeFleetSection: {
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  homeFleetTag: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FF6B1A',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  homeFleetTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 2,
  },
  orangeUnderline: {
    width: 44,
    height: 3,
    backgroundColor: '#FF6B1A',
    borderRadius: 2,
    marginBottom: 8,
  },
  homeFleetAction: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FF6B1A',
    marginBottom: 12,
  },
  fleetPreviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  stepHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  backBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
  },
  backBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
  },
  stepHeaderTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: KANDY_THEME.colors.primary,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  sectionSubheading: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  vehicleOptionCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  vehicleOptionCardSelected: {
    borderColor: KANDY_THEME.colors.primary,
    borderWidth: 2,
    backgroundColor: '#FFF7ED',
  },
  vehicleCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  vehicleOptionName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },
  vehicleTag: {
    fontSize: 9,
    fontWeight: '900',
    color: KANDY_THEME.colors.primary,
    backgroundColor: '#FFEDD5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  vehicleOptionCategory: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  vehicleOptionSpecs: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    marginTop: 4,
  },
  vehicleOptionFare: {
    fontSize: 18,
    fontWeight: '900',
    color: KANDY_THEME.colors.primary,
  },
  vehicleOptionFareSub: {
    fontSize: 9,
    color: '#64748B',
  },
  vehicleOptionAdvance: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    marginTop: 2,
  },
  vehicleDesc: {
    fontSize: 11,
    color: '#475569',
    marginVertical: 8,
  },
  selectVehicleBtn: {
    backgroundColor: KANDY_THEME.colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectVehicleBtnText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 11,
  },
  confirmationCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardSectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#D97706',
    letterSpacing: 0.8,
    marginTop: 6,
    marginBottom: 8,
  },
  routeBox: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  routeBoxText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  routeBoxSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 10,
  },
  fareBreakdownBox: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    borderRadius: 10,
    padding: 12,
    marginVertical: 12,
  },
  fareBreakdownTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#92400E',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 12,
    color: '#475569',
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  infoValueHighlight: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  finalBookBtn: {
    backgroundColor: KANDY_THEME.colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  finalBookBtnText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 12,
  },
  successCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  successIcon: {
    fontSize: 40,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#065F46',
    marginVertical: 6,
    textAlign: 'center',
  },
  successSub: {
    fontSize: 12,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 16,
  },
  successDetailsBox: {
    backgroundColor: '#ECFDF5',
    padding: 14,
    borderRadius: 10,
    width: '100%',
    marginBottom: 16,
  },
  successRef: {
    fontSize: 16,
    fontWeight: '900',
    color: '#064E3B',
  },
  successRoute: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
    marginTop: 2,
  },
  successDate: {
    fontSize: 11,
    color: '#047857',
  },
  successFare: {
    fontSize: 13,
    fontWeight: '800',
    color: '#064E3B',
    marginTop: 4,
  },
  successAdvance: {
    fontSize: 12,
    fontWeight: '900',
    color: '#059669',
  },
  primaryButton: {
    backgroundColor: KANDY_THEME.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  primaryButtonText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 12,
  },
  pageHeading: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 12,
  },
  tripCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tripRef: {
    fontSize: 15,
    fontWeight: '900',
    color: KANDY_THEME.colors.primary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontWeight: '800',
    fontSize: 10,
  },
  routeContainer: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  routeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  routeArrow: {
    fontSize: 12,
    color: KANDY_THEME.colors.primary,
    marginVertical: 2,
    marginLeft: 4,
  },
  driverBox: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  driverTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065F46',
  },
  driverName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#064E3B',
    marginVertical: 4,
  },
  callButton: {
    backgroundColor: '#059669',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 4,
  },
  callButtonText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 11,
  },
  fleetCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  fleetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fleetTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  fleetSub: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  fleetFeatureRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 8,
  },
  fleetFeature: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  fleetRateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 6,
    marginVertical: 8,
  },
  fleetRateText: {
    fontSize: 13,
    fontWeight: '900',
    color: KANDY_THEME.colors.primary,
  },
  fleetBaseText: {
    fontSize: 11,
    color: '#64748B',
  },
  bookFleetBtn: {
    backgroundColor: '#0F172A',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 6,
  },
  bookFleetBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 14,
  },
  demoOtpBox: {
    backgroundColor: '#FFEDD5',
    padding: 8,
    borderRadius: 6,
    marginVertical: 10,
  },
  demoOtpText: {
    color: KANDY_THEME.colors.primary,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  profileCard: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  profileTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 6,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  profilePhone: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 16,
  },
  profileStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  profileStatItem: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  profileStatVal: {
    fontSize: 18,
    fontWeight: '900',
    color: KANDY_THEME.colors.primary,
  },
  profileStatLbl: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
  },
  callSupportBtn: {
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  callSupportText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  logoutBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutBtnText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '800',
  },

  // ─── HIGH-FIDELITY WEB FLEET CARD (Matching Website Reference) ───
  webFleetCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  webFleetImageWrapper: {
    width: '100%',
    height: 170,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    marginBottom: 14,
  },
  webFleetImage: {
    width: '100%',
    height: '100%',
  },
  webFleetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  webFleetTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  webFleetRatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  webFleetRatingStar: {
    fontSize: 10,
  },
  webFleetRatingText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#92400E',
  },
  webFleetSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 12,
  },
  webFleetSpecsContainer: {
    gap: 8,
    marginBottom: 12,
  },
  webFleetSpecRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  webFleetSpecIcon: {
    fontSize: 14,
    width: 20,
    textAlign: 'center',
  },
  webFleetSpecText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
    flex: 1,
  },
  webFleetDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 14,
  },
  webFleetBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  webFleetRateLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  webFleetRateAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
  },
  webFleetRateUnit: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginLeft: 2,
  },
  webFleetBookBtn: {
    backgroundColor: '#0F172A',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  webFleetBookBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  bottomNavItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    marginHorizontal: 2,
  },
  bottomNavItemActive: {
    backgroundColor: '#FF6B1A',
  },
  bottomNavIcon: {
    fontSize: 15,
    marginBottom: 2,
  },
  bottomNavText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#475569',
    textAlign: 'center',
  },
  bottomNavTextActive: {
    color: '#FFFFFF',
  },

  // ─── BOOKING TOP NOTICE ───
  bookingTopNotice: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    gap: 8,
  },
  bookingNoticeItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bookingNoticeIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookingNoticeTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0369A1',
  },
  bookingNoticeSubText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0284C7',
  },

  // ─── WIZARD STEPPER BAR ───
  wizardStepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  wizardStepItem: {
    alignItems: 'center',
    gap: 4,
  },
  wizardStepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  wizardStepCircleActive: {
    backgroundColor: '#FF6B1A',
    borderColor: '#FF6B1A',
  },
  wizardStepNumber: {
    fontSize: 12,
    fontWeight: '900',
    color: '#64748B',
  },
  wizardStepNumberActive: {
    color: '#FFFFFF',
  },
  wizardStepLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  wizardStepLabelActive: {
    color: '#FF6B1A',
    fontWeight: '900',
  },
  wizardStepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 4,
    marginBottom: 14,
  },

  // ─── STEP 1: VEHICLE CARDS ───
  bookingCarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  bookingCarImageWrapper: {
    width: '100%',
    height: 150,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
    marginBottom: 10,
  },
  bookingCarImage: {
    width: '100%',
    height: '100%',
  },
  bookingCarTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  bookingCarTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
  },
  bookingCarRatingBadge: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  bookingCarRatingText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#92400E',
  },
  bookingCarSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 10,
  },
  bookingCarSpecsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    gap: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  bookingCarSpecRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bookingCarSpecText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#334155',
  },
  fuelSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginBottom: 10,
  },
  fuelSelectorLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
  },
  fuelRadioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fuelRadioCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fuelRadioCircleActive: {
    borderColor: '#FF6B1A',
  },
  fuelRadioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B1A',
  },
  fuelRadioText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  fuelRadioTextActive: {
    color: '#0F172A',
    fontWeight: '900',
  },
  bookingPriceBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  discountBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  discountPill: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  discountPillText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#059669',
  },
  strikethroughPrice: {
    fontSize: 12,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
    fontWeight: '700',
  },
  mainPriceAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0284C7',
    marginVertical: 2,
  },
  taxesCaption: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  selectCarOrangeBtn: {
    backgroundColor: '#FF6B1A',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#FF6B1A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  selectCarOrangeBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  inclusionsAccordionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  inclusionsBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0369A1',
  },
  inclusionsChevron: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0369A1',
  },
  inclusionsDetailsCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  inclusionsDetailsTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
  },
  inclusionsItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkGreenIcon: {
    fontSize: 12,
    fontWeight: '900',
    color: '#059669',
  },
  crossRedIcon: {
    fontSize: 12,
    fontWeight: '900',
    color: '#DC2626',
  },
  inclusionsItemText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  inclusionsDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },

  // ─── STEP 2 & BEYOND ───
  selectedCarBanner: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  selectedCarBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9A3412',
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#475569',
    letterSpacing: 0.5,
    marginBottom: 4,
    marginTop: 6,
  },

  // ─── STEP 3: COUPONS ───
  couponInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  couponTextInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  couponApplyBtn: {
    backgroundColor: '#FF6B1A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  couponApplyBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  couponSuccessBanner: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },
  couponSuccessText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#065F46',
    textAlign: 'center',
  },
  couponCardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
  },
  couponCardCode: {
    fontSize: 13,
    fontWeight: '900',
    color: '#EA580C',
  },
  couponCardDesc: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  couponCardApplyText: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#0284C7',
    paddingLeft: 8,
  },

  // ─── AUTHENTICATION & LOGIN FLOW (Matches Website Unified Portal) ───
  authPageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  authHeaderCenter: {
    alignItems: 'center',
    marginBottom: 16,
  },
  authLogo: {
    width: 140,
    height: 40,
    marginBottom: 8,
  },
  authTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.3,
    marginBottom: 4,
    textAlign: 'center',
  },
  authSub: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 10,
  },
  authInputLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#334155',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    overflow: 'hidden',
    height: 50,
    marginBottom: 16,
  },
  phonePrefixBox: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  phonePrefixText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#334155',
  },
  phoneTextInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  authSendOtpBtn: {
    backgroundColor: '#FF6B1A',
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#FF6B1A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  authSendOtpBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  authWelcomeBackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
  },
  authWelcomeBackText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
    flex: 1,
  },
  authVerifiedPill: {
    backgroundColor: '#A7F3D0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  authVerifiedPillText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#064E3B',
    letterSpacing: 0.5,
  },
  authDemoOtpBanner: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
  },
  authDemoOtpText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#7C2D12',
    lineHeight: 16,
  },
  authOtpInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    height: 50,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 8,
    textAlign: 'center',
    color: '#0F172A',
    marginBottom: 14,
  },
  newUserNameSection: {
    marginBottom: 14,
    gap: 8,
  },
  newUserNoticeCard: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    padding: 10,
  },
  newUserNoticeText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#1E40AF',
    lineHeight: 16,
  },
  authNameInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#FF6B1A',
    borderRadius: 14,
    height: 50,
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  authOtpButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  authBackBtn: {
    backgroundColor: '#F1F5F9',
    height: 48,
    paddingHorizontal: 18,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authBackBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#334155',
    letterSpacing: 0.5,
  },
  authVerifySignInBtn: {
    flex: 1,
    backgroundColor: '#0F172A',
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  authVerifySignInBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  // ─── CUSTOMER PROFILE / DASHBOARD (Matches Image 4) ───
  profileWelcomeCard: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 22,
    padding: 16,
    marginBottom: 20,
  },
  profileWelcomeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileAvatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF6B1A',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B1A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  profileAvatarText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  profileWelcomeTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  profileWelcomeSub: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  profileActionBtnsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  profileBookNewBtn: {
    flex: 1,
    backgroundColor: '#FF6B1A',
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B1A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  profileBookNewBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  profileLogoutBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileLogoutBtnText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '800',
  },
  profileBookingsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileBookingsAccentBar: {
    width: 4,
    height: 22,
    backgroundColor: '#FF6B1A',
    borderRadius: 2,
  },
  profileBookingsHeading: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    marginLeft: 8,
  },
  profileBookingCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  profileBookingTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileBookingRef: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },
  profileBadgeDark: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  profileBadgeDarkText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  profileBadgeAmber: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  profileBadgeAmberText: {
    color: '#92400E',
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  profileRouteBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    gap: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  profileRouteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  profileRouteText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  profileDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  profileDateText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  profileTimePill: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  profileTimeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#EA580C',
  },
  profileVehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  profileVehicleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  profileOpsNoticeBox: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FEF3C7',
    borderRadius: 10,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  profileOpsNoticeText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#92400E',
    flex: 1,
  },

  // ─── PROFILE FARE SUMMARY BOX & ACTION BUTTONS (Matches Image 2) ───
  profileFareBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  profileFareLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 0.6,
  },
  profileFareTotal: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    marginVertical: 4,
  },
  profileFareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  profileFareSubLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  profileFareAdvanceVal: {
    fontSize: 13,
    fontWeight: '900',
    color: '#059669',
  },
  profileFareBalanceVal: {
    fontSize: 13,
    fontWeight: '900',
    color: '#475569',
  },
  profileCancelBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 8,
  },
  profileCancelIcon: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '900',
  },
  profileCancelText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  profileInvoiceBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  profileInvoiceIcon: {
    color: '#FFFFFF',
    fontSize: 13,
  },
  profileInvoiceText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  emptyBookingsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    marginTop: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  emptyBookingsTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyBookingsSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  emptyBookingsBtn: {
    backgroundColor: '#FF6B1A',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: '#FF6B1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyBookingsBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  // ─── DATE & TIME PICKER MODAL STYLES (Matching Screenshots) ───
  dateTimeValueText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  calendarModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    width: 310,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  calendarHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  calendarTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  calendarMonthTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  calendarMonthChevron: {
    fontSize: 13,
    color: '#334155',
  },
  calendarNavArrowsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  calendarArrowBtn: {
    padding: 4,
  },
  calendarArrowIcon: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  calendarWeekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  calendarWeekDayText: {
    width: 36,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  calendarDaysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  calendarDayCell: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 3,
    borderRadius: 4,
  },
  calendarDayCellToday: {
    borderWidth: 1.5,
    borderColor: '#0F172A',
    borderRadius: 4,
  },
  calendarDayCellSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
    borderWidth: 1,
    borderRadius: 4,
  },
  calendarDayNumberText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
  },
  calendarDayNumberDimmed: {
    color: '#94A3B8',
  },
  calendarDayNumberToday: {
    fontWeight: '700',
    color: '#0F172A',
  },
  calendarDayNumberSelected: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  calendarBottomActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingHorizontal: 4,
  },
  calendarBottomBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },

  // Time Picker Card
  timePickerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    width: 220,
    maxHeight: 380,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  timeTopSelectionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  timeTopBadge: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#0056B3',
  },
  timeTopBadgeText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  timeColumnsContainer: {
    flexDirection: 'row',
    gap: 8,
    height: 220,
  },
  timeColumnScroll: {
    flex: 1,
  },
  timeItemBtn: {
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
  timeItemBtnActive: {
    backgroundColor: '#EFF6FF',
  },
  timeItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  timeItemTextActive: {
    color: '#007AFF',
    fontWeight: '900',
  },
  timeDoneBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  timeDoneBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  // ─── CURRENT LOCATION & MAP STYLES ───
  currentLocationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FED7AA',
    marginBottom: 6,
    gap: 10,
  },
  currentLocationIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF6B1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentLocationHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#C2410C',
  },
  currentLocationSubheading: {
    fontSize: 10,
    color: '#EA580C',
    marginTop: 1,
  },
  currentLocationArrow: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF6B1A',
  },
  suggestionDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },

  // Map Modal Styles
  mapModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'flex-end',
  },
  mapModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '92%',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  mapModalHeader: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  mapModalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  mapModalSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  mapModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapModalCloseIcon: {
    fontSize: 14,
    fontWeight: '900',
    color: '#475569',
  },
  mapCanvasWrapper: {
    flex: 1,
    backgroundColor: '#E2E8F0',
    position: 'relative',
    overflow: 'hidden',
  },
  mapCanvasBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#E5E9EC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapRoadH1: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '38%',
    height: 24,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#CBD5E1',
  },
  mapRoadH2: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: '22%',
    height: 18,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#CBD5E1',
  },
  mapRoadV1: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '42%',
    width: 26,
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#CBD5E1',
  },
  mapRoadV2: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: '25%',
    width: 18,
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#CBD5E1',
  },
  mapBuildingBlock1: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 100,
    height: 80,
    backgroundColor: '#D1D5DB',
    borderRadius: 8,
  },
  mapBuildingBlock2: {
    position: 'absolute',
    bottom: 40,
    left: 30,
    width: 90,
    height: 70,
    backgroundColor: '#D1D5DB',
    borderRadius: 8,
  },
  mapBuildingBlock3: {
    position: 'absolute',
    top: 30,
    right: 30,
    width: 80,
    height: 100,
    backgroundColor: '#D1D5DB',
    borderRadius: 8,
  },
  mapGreenArea: {
    position: 'absolute',
    bottom: 30,
    right: 40,
    width: 90,
    height: 90,
    backgroundColor: '#DCFCE7',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  mapAccuracyCircle: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 107, 26, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 107, 26, 0.4)',
    borderStyle: 'dashed',
  },
  centerPinFixedWrapper: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
  },
  mapPinContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
  },
  mapPinBadge: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  mapPinBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  mapPinIcon: {
    fontSize: 38,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 4,
  },
  mapPinShadow: {
    width: 14,
    height: 6,
    borderRadius: 7,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    marginTop: -4,
  },
  mapFloatingControls: {
    position: 'absolute',
    right: 14,
    top: 14,
    gap: 6,
    zIndex: 40,
  },
  mapControlBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mapControlBtnText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1E293B',
  },
  mapNudgePad: {
    position: 'absolute',
    left: 14,
    top: 14,
    alignItems: 'center',
    gap: 4,
    zIndex: 40,
  },
  nudgeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  nudgeText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#334155',
  },
  mapBottomSheet: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 12,
  },
  accuracyPillRow: {
    alignItems: 'flex-start',
  },
  accuracyPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  accuracyPillSuccess: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  accuracyPillWarning: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  accuracyPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  accuracyPillTextSuccess: {
    color: '#047857',
  },
  accuracyPillTextWarning: {
    color: '#B45309',
  },
  mapAddressCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mapAddressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  mapAddressIcon: {
    fontSize: 18,
    marginTop: 2,
  },
  mapAddressTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  mapAddressSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  mapConfirmBtn: {
    backgroundColor: '#FF6B1A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#FF6B1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  mapConfirmBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
