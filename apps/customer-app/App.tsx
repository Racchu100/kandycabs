import React, { useState, useEffect } from 'react';
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
} from 'react-native';
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

// Types & Data Schemas
type TripType = 'ONEWAY' | 'ROUNDTRIP' | 'LOCAL' | 'AIRPORT';
type WizardStep = 'SEARCH' | 'VEHICLES' | 'CONFIRMATION' | 'SUCCESS';

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
  capacity: string;
  luggage: string;
  ratePerKm: number;
  baseFare: number;
  tag: string;
  description: string;
}

const FLEET_CATEGORIES: VehicleCategory[] = [
  {
    id: 'sedan',
    name: 'Sedan (Dzire / Etios)',
    category: 'Economy Sedan',
    capacity: '4 Seater',
    luggage: '2 Bags',
    ratePerKm: 14,
    baseFare: 2800,
    tag: 'MOST POPULAR',
    description: 'Clean AC sedan suitable for up to 4 passengers with 2 medium luggage bags.',
  },
  {
    id: 'ertiga',
    name: 'SUV Ertiga',
    category: 'Family MUV',
    capacity: '6 Seater',
    luggage: '3 Bags',
    ratePerKm: 18,
    baseFare: 3600,
    tag: 'FAMILY CHOICE',
    description: 'Spacious 6-seater MUV with extra legroom & trunk space for family trips.',
  },
  {
    id: 'innova',
    name: 'Innova Crysta',
    category: 'Executive Luxury',
    capacity: '7 Seater',
    luggage: '4 Bags',
    ratePerKm: 24,
    baseFare: 4800,
    tag: 'LUXURY AC',
    description: 'Premium executive captain-seat luxury AC cab for maximum comfort & highway stability.',
  },
  {
    id: 'tempo',
    name: 'Tempo Traveller',
    category: 'Group Minibus',
    capacity: '12 Seater',
    luggage: '8 Bags',
    ratePerKm: 32,
    baseFare: 6400,
    tag: 'LARGE GROUP',
    description: '12-seater pushback AC minibus for large group tours, weddings & corporate outings.',
  },
];

export default function App() {
  // Navigation State
  type AppTab = 'HOME' | 'TRIPS' | 'FLEET' | 'ACCOUNT' | 'ABOUT' | 'CONTACT';
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
  const [customerName, setCustomerName] = useState<string>('Rakshith M');
  const [phone, setPhone] = useState<string>('9876543210');
  const [otp, setOtp] = useState<string>('');
  const [otpSent, setOtpSent] = useState<boolean>(false);

  // Booking Form State
  const [tripType, setTripType] = useState<TripType>('ONEWAY');
  const [pickupInput, setPickupInput] = useState<string>('Bangalore, KA');
  const [dropInput, setDropInput] = useState<string>('Coorg (Madikeri), KA');
  const [pickupDate, setPickupDate] = useState<string>('15-09-2026');
  const [pickupTime, setPickupTime] = useState<string>('07:00');

  // Location Suggestion Dropdowns
  const [showPickupDropdown, setShowPickupDropdown] = useState<boolean>(false);
  const [showDropDropdown, setShowDropDropdown] = useState<boolean>(false);

  // Selected Vehicle & Distance
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleCategory>(FLEET_CATEGORIES[0]);
  const [estimatedDistanceKm] = useState<number>(250);

  // Customer Contact Info for Booking
  const [customerEmail, setCustomerEmail] = useState<string>('customer@kandycabs.com');
  const [specialNotes, setSpecialNotes] = useState<string>('');

  // Active Trips & Bookings Database
  const [userBookings, setUserBookings] = useState([
    {
      id: 'KC73744',
      status: 'DRIVER EN ROUTE',
      pickup: 'Bangalore, KA',
      drop: 'Coorg (Madikeri), KA',
      date: '15 Sep 2026, 07:00 AM',
      vehicleName: 'Innova Crysta (KA-01-MJ-4892)',
      totalFare: 4250,
      advancePaid: 1063,
      balanceDue: 3187,
      driverName: 'Ramesh Kumar',
      driverPhone: '8888888888',
      driverRating: '4.9 ★',
    },
    {
      id: 'KC69820',
      status: 'COMPLETED',
      pickup: 'Colombo Fort',
      drop: 'Kandy City',
      date: '10 Aug 2026, 08:30 AM',
      vehicleName: 'Sedan (Dzire)',
      totalFare: 3500,
      advancePaid: 875,
      balanceDue: 0,
      driverName: 'Saman Perera',
      driverPhone: '7771234567',
      driverRating: '5.0 ★',
    },
  ]);

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

  // Location Swap Handler (Reverse Pickup and Drop)
  const handleSwapLocations = () => {
    const temp = pickupInput;
    setPickupInput(dropInput);
    setDropInput(temp);
  };

  // Fare Calculation Rules (Matching Web Engine)
  const calculatedFare = Math.max(selectedVehicle.baseFare, estimatedDistanceKm * selectedVehicle.ratePerKm);
  const advancePayable = Math.round(calculatedFare * 0.25);
  const balancePayable = calculatedFare - advancePayable;

  // Authentication Handlers
  const handleSendOtp = async () => {
    if (phone.trim().length < 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await sendOtp(phone);
      setOtpSent(true);
      Alert.alert('SMS OTP Sent', res.message || 'Use demo 4-digit code: 1234');
    } catch (err: any) {
      Alert.alert('Authentication Error', err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) {
      Alert.alert('OTP Required', 'Please enter the 4-digit OTP code.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await verifyOtp(phone, otp, customerName);
      setIsLoggedIn(true);
      setAuthModalOpen(false);
      Alert.alert('Welcome!', res.message || `Logged in successfully as ${customerName}`);
      
      // Load user's bookings from backend API
      fetchCustomerBookings().then((bRes) => {
        if (bRes?.bookings && Array.isArray(bRes.bookings)) {
          setUserBookings(bRes.bookings);
        }
      });
    } catch (err: any) {
      Alert.alert('Verification Error', err.message || 'Invalid OTP code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setOtpSent(false);
    setOtp('');
    Alert.alert('Logged Out', 'You have been logged out.');
  };

  // Confirm Final Booking Action
  const handleConfirmFinalBooking = async () => {
    setIsSubmitting(true);
    try {
      const newRef = `KC${Math.floor(10000 + Math.random() * 90000)}`;
      const payload = {
        tripType,
        pickupAddress: pickupInput,
        dropAddress: dropInput,
        pickupDate,
        pickupTime,
        vehicleCategory: selectedVehicle.id,
        vehicleName: selectedVehicle.name,
        estimatedDistanceKm,
        estimatedFare: calculatedFare,
        advanceAmount: advancePayable,
        balanceAmount: balancePayable,
        customerName,
        customerPhone: phone,
        customerEmail,
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* HEADER NAVBAR (Matching Web Header Image 1 & 2) */}
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

        {/* Hamburger Menu Icon (☰) */}
        <TouchableOpacity style={styles.hamburgerBtn} onPress={() => setMenuOpen(true)}>
          <Text style={styles.hamburgerIcon}>☰</Text>
        </TouchableOpacity>
      </View>

      {/* DRAWER / HAMBURGER SLIDE-OUT MENU MODAL (Matching Web Drawer Image 3) */}
      <Modal visible={menuOpen} animationType="fade" transparent={true}>
        <View style={styles.menuOverlay}>
          <TouchableOpacity style={styles.menuBackdrop} activeOpacity={1} onPress={() => setMenuOpen(false)} />
          <View style={styles.menuDrawer}>
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
              <TouchableOpacity
                style={styles.menuLinkRow}
                onPress={() => {
                  setActiveTab('HOME');
                  setCurrentStep('SEARCH');
                  setMenuOpen(false);
                }}
              >
                <Text style={styles.menuLinkText}>Home</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuLinkRow}
                onPress={() => {
                  setActiveTab('HOME');
                  setCurrentStep('SEARCH');
                  setMenuOpen(false);
                }}
              >
                <Text style={styles.menuLinkText}>Book Cab</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuLinkRow}
                onPress={() => {
                  setActiveTab('FLEET');
                  setMenuOpen(false);
                }}
              >
                <Text style={styles.menuLinkText}>Fleet & Rates</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuLinkRow}
                onPress={() => {
                  setActiveTab('ABOUT');
                  setMenuOpen(false);
                }}
              >
                <Text style={styles.menuLinkText}>About Us</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuLinkRow}
                onPress={() => {
                  setActiveTab('CONTACT');
                  setMenuOpen(false);
                }}
              >
                <Text style={styles.menuLinkText}>Contact Us</Text>
              </TouchableOpacity>

              <View style={styles.menuDivider} />

              <Text style={styles.menuUserLabel}>
                LOGGED IN AS: <Text style={{ fontWeight: '900', color: '#0F172A' }}>{isLoggedIn ? customerName.toUpperCase() : 'GUEST USER'}</Text>
              </Text>

              <TouchableOpacity
                style={styles.customerPortalBtn}
                onPress={() => {
                  setMenuOpen(false);
                  if (!isLoggedIn) {
                    setAuthModalOpen(true);
                  } else {
                    setActiveTab('ACCOUNT');
                  }
                }}
              >
                <Text style={styles.customerPortalBtnText}>👤 Customer Portal (My Account)</Text>
              </TouchableOpacity>

              {isLoggedIn && (
                <TouchableOpacity style={styles.logoutDrawerBtn} onPress={handleLogout}>
                  <Text style={styles.logoutDrawerBtnText}>🚪 LOGOUT</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.supportCallBtn} onPress={() => handleCallSupport('9876543210')}>
                <Text style={styles.supportCallBtnText}>📞 Call 24×7 Support: +91 98765 43210</Text>
              </TouchableOpacity>
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
              <TouchableOpacity onPress={() => setAuthModalOpen(false)}>
                <Text style={styles.menuCloseBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.authModalSub}>Enter your details for SMS OTP verification</Text>

            <Text style={styles.inputLabel}>YOUR FULL NAME</Text>
            <TextInput
              style={styles.input}
              value={customerName}
              onChangeText={setCustomerName}
              placeholder="e.g. Rakshith M"
            />

            <Text style={styles.inputLabel}>MOBILE NUMBER</Text>
            <TextInput
              style={styles.input}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              placeholder="10-digit mobile number"
            />

            {!otpSent ? (
              <TouchableOpacity style={styles.primaryButton} onPress={handleSendOtp}>
                <Text style={styles.primaryButtonText}>SEND 4-DIGIT OTP →</Text>
              </TouchableOpacity>
            ) : (
              <>
                <View style={styles.demoOtpBox}>
                  <Text style={styles.demoOtpText}>Demo Master OTP: 1234</Text>
                </View>
                <Text style={styles.inputLabel}>ENTER 4-DIGIT OTP</Text>
                <TextInput
                  style={[styles.input, { textAlign: 'center', fontSize: 20, letterSpacing: 6 }]}
                  keyboardType="number-pad"
                  maxLength={4}
                  value={otp}
                  onChangeText={setOtp}
                  placeholder="1234"
                />
                <TouchableOpacity style={styles.primaryButton} onPress={handleVerifyOtp}>
                  <Text style={styles.primaryButtonText}>VERIFY & LOGIN →</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* TAB 1: HOME & BOOKING WIZARD */}
      {activeTab === 'HOME' && (
        <ScrollView style={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* HERO BANNER SECTION (Matching Image 2) */}
          <View style={styles.heroSection}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>✨ SOUTH INDIA'S PREMIUM INTERCITY CAB SERVICE</Text>
            </View>
            <Text style={styles.heroTitle}>
              Book Outstation & Local Cabs with <Text style={{ color: KANDY_THEME.colors.primary }}>Transparent Fares</Text>
            </Text>
            <Text style={styles.heroSubtitle}>
              Pay 25% advance only. Clean sanitized cabs, courteous verified drivers, and doorstep pickup.
            </Text>
          </View>

          {/* STEP 1: INTERCITY CAB BOOKING WIDGET (Matching Image 2) */}
          {currentStep === 'SEARCH' && (
            <View style={styles.bookingCard}>
              {/* PICKUP LOCATION WITH SEARCH DROPDOWN */}
              <Text style={styles.inputLabel}>PICKUP LOCATION</Text>
              <View style={styles.inputSearchWrapper}>
                <Text style={styles.inputIcon}>🔍</Text>
                <TextInput
                  style={styles.inputWithIcon}
                  value={pickupInput}
                  onChangeText={(val) => {
                    setPickupInput(val);
                    setShowPickupDropdown(true);
                  }}
                  onFocus={() => setShowPickupDropdown(true)}
                  placeholder="Enter Pickup Place, Landmark, Railway Station..."
                />
              </View>
              {showPickupDropdown && (
                <View style={styles.suggestionsBox}>
                  {POPULAR_LOCATIONS.filter(
                    (loc) =>
                      loc.name.toLowerCase().includes(pickupInput.toLowerCase()) ||
                      loc.city.toLowerCase().includes(pickupInput.toLowerCase())
                  ).map((loc, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.suggestionItem}
                      onPress={() => {
                        setPickupInput(loc.name);
                        setShowPickupDropdown(false);
                      }}
                    >
                      <Text style={styles.suggestionName}>📍 {loc.name}</Text>
                      <Text style={styles.suggestionAddr}>{loc.address}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* SWAP LOCATION BUTTON (⇅) */}
              <View style={styles.swapContainer}>
                <View style={styles.swapLine} />
                <TouchableOpacity style={styles.swapCircleBtn} onPress={handleSwapLocations}>
                  <Text style={styles.swapIcon}>⇅</Text>
                </TouchableOpacity>
                <View style={styles.swapLine} />
              </View>

              {/* DESTINATION LOCATION WITH SEARCH DROPDOWN */}
              <Text style={styles.inputLabel}>DESTINATION LOCATION</Text>
              <View style={styles.inputSearchWrapper}>
                <Text style={styles.inputIcon}>🔍</Text>
                <TextInput
                  style={styles.inputWithIcon}
                  value={dropInput}
                  onChangeText={(val) => {
                    setDropInput(val);
                    setShowDropDropdown(true);
                  }}
                  onFocus={() => setShowDropDropdown(true)}
                  placeholder="Enter Drop City, Hotel, Landmark..."
                />
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
                      onPress={() => {
                        setDropInput(loc.name);
                        setShowDropDropdown(false);
                      }}
                    >
                      <Text style={styles.suggestionName}>🏁 {loc.name}</Text>
                      <Text style={styles.suggestionAddr}>{loc.address}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* SIDE-BY-SIDE DATE & TIME PICKER GRID (Matching Image 2) */}
              <View style={styles.dateTimeGrid}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>PICK UP DATE</Text>
                  <View style={styles.inputSearchWrapper}>
                    <Text style={styles.inputIcon}>📅</Text>
                    <TextInput
                      style={styles.inputWithIcon}
                      value={pickupDate}
                      onChangeText={setPickupDate}
                      placeholder="DD-MM-YYYY"
                    />
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>PICK UP TIME</Text>
                  <View style={styles.inputSearchWrapper}>
                    <Text style={styles.inputIcon}>⏰</Text>
                    <TextInput
                      style={styles.inputWithIcon}
                      value={pickupTime}
                      onChangeText={setPickupTime}
                      placeholder="HH:MM"
                    />
                  </View>
                </View>
              </View>

              {/* BIG ORANGE ACTION BUTTON (Matching Image 2) */}
              <TouchableOpacity
                style={styles.exploreCabsBtn}
                onPress={() => {
                  if (!pickupInput || !dropInput) {
                    Alert.alert('Required', 'Please select both pickup and destination locations.');
                    return;
                  }
                  setCurrentStep('VEHICLES');
                }}
              >
                <Text style={styles.exploreCabsBtnText}>EXPLORE CABS & RATES →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 4 TRUST BADGES GRID (Matching Image 2) */}
          <View style={styles.trustBadgesGrid}>
            <View style={styles.trustBadgeItem}>
              <Text style={styles.trustBadgeIcon}>🛡️</Text>
              <View>
                <Text style={styles.trustBadgeTitle}>VERIFIED CHAUFFEURS</Text>
                <Text style={styles.trustBadgeSub}>Background Checked</Text>
              </View>
            </View>

            <View style={styles.trustBadgeItem}>
              <Text style={styles.trustBadgeIcon}>🟢</Text>
              <View>
                <Text style={styles.trustBadgeTitle}>25% ADVANCE ONLY</Text>
                <Text style={styles.trustBadgeSub}>Pay Rest to Driver</Text>
              </View>
            </View>

            <View style={styles.trustBadgeItem}>
              <Text style={styles.trustBadgeIcon}>🎗️</Text>
              <View>
                <Text style={styles.trustBadgeTitle}>TRANSPARENT BILLING</Text>
                <Text style={styles.trustBadgeSub}>Zero Hidden Fees</Text>
              </View>
            </View>

            <View style={styles.trustBadgeItem}>
              <Text style={styles.trustBadgeIcon}>📞</Text>
              <View>
                <Text style={styles.trustBadgeTitle}>24X7 OPS SUPPORT</Text>
                <Text style={styles.trustBadgeSub}>On-Road Assistance</Text>
              </View>
            </View>
          </View>

          {/* OUR VEHICLE FLEET SECTION (Matching Image 1) */}
          {currentStep === 'SEARCH' && (
            <View style={styles.homeFleetSection}>
              <Text style={styles.homeFleetTag}>OUR VEHICLE FLEET</Text>
              <Text style={styles.homeFleetTitle}>Choose the Right Cab for Your Journey</Text>
              <TouchableOpacity onPress={() => setActiveTab('FLEET')}>
                <Text style={styles.homeFleetAction}>VIEW FULL FLEET & RATE CHART →</Text>
              </TouchableOpacity>

              {FLEET_CATEGORIES.slice(0, 3).map((v) => (
                <TouchableOpacity
                  key={v.id}
                  style={styles.fleetPreviewCard}
                  onPress={() => {
                    setSelectedVehicle(v);
                    setCurrentStep('VEHICLES');
                  }}
                >
                  <View style={styles.fleetHeader}>
                    <Text style={styles.fleetTitle}>{v.name}</Text>
                    <Text style={styles.fleetTag}>{v.tag}</Text>
                  </View>
                  <Text style={styles.fleetSub}>{v.description}</Text>
                  <View style={styles.fleetFeatureRow}>
                    <Text style={styles.fleetFeature}>👥 {v.capacity}</Text>
                    <Text style={styles.fleetFeature}>🧳 {v.luggage}</Text>
                    <Text style={styles.fleetFeature}>❄️ AC Cab</Text>
                  </View>
                  <View style={styles.fleetRateRow}>
                    <Text style={styles.fleetRateText}>₹{v.ratePerKm}/km</Text>
                    <Text style={styles.fleetBaseText}>Base Fare: ₹{v.baseFare}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* STEP 2: VEHICLE CATEGORY SELECTION & RATES */}
          {currentStep === 'VEHICLES' && (
            <View style={{ marginBottom: 20 }}>
              <View style={styles.stepHeaderRow}>
                <TouchableOpacity style={styles.backBtn} onPress={() => setCurrentStep('SEARCH')}>
                  <Text style={styles.backBtnText}>← BACK TO SEARCH</Text>
                </TouchableOpacity>
                <Text style={styles.stepHeaderTitle}>STEP 2: CHOOSE CAB</Text>
              </View>

              <Text style={styles.sectionHeading}>AVAILABLE CABS FOR YOUR ROUTE</Text>
              <Text style={styles.sectionSubheading}>
                {pickupInput} → {dropInput} (~{estimatedDistanceKm} km)
              </Text>

              {FLEET_CATEGORIES.map((v) => {
                const isSelected = selectedVehicle.id === v.id;
                const fare = Math.max(v.baseFare, estimatedDistanceKm * v.ratePerKm);
                const advance = Math.round(fare * 0.25);
                return (
                  <View
                    key={v.id}
                    style={[styles.vehicleOptionCard, isSelected && styles.vehicleOptionCardSelected]}
                  >
                    <View style={styles.vehicleCardTopRow}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.vehicleOptionName}>{v.name}</Text>
                          <Text style={styles.vehicleTag}>{v.tag}</Text>
                        </View>
                        <Text style={styles.vehicleOptionCategory}>{v.category}</Text>
                        <Text style={styles.vehicleOptionSpecs}>
                          👥 {v.capacity} • 🧳 {v.luggage} • ❄️ AC Cab
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.vehicleOptionFare}>₹{fare.toLocaleString()}</Text>
                        <Text style={styles.vehicleOptionFareSub}>Est. Total</Text>
                        <Text style={styles.vehicleOptionAdvance}>₹{advance.toLocaleString()} Advance</Text>
                      </View>
                    </View>
                    <Text style={styles.vehicleDesc}>{v.description}</Text>

                    <TouchableOpacity
                      style={styles.selectVehicleBtn}
                      onPress={() => {
                        setSelectedVehicle(v);
                        setCurrentStep('CONFIRMATION');
                      }}
                    >
                      <Text style={styles.selectVehicleBtnText}>SELECT {v.name.toUpperCase()} →</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}

          {/* STEP 3: BOOKING CONFIRMATION & FARE BREAKDOWN */}
          {currentStep === 'CONFIRMATION' && (
            <View style={{ marginBottom: 20 }}>
              <View style={styles.stepHeaderRow}>
                <TouchableOpacity style={styles.backBtn} onPress={() => setCurrentStep('VEHICLES')}>
                  <Text style={styles.backBtnText}>← BACK TO CABS</Text>
                </TouchableOpacity>
                <Text style={styles.stepHeaderTitle}>STEP 3: CONFIRM BOOKING</Text>
              </View>

              <View style={styles.confirmationCard}>
                <Text style={styles.cardSectionTitle}>SELECTED ROUTE & CAB</Text>
                <View style={styles.routeBox}>
                  <Text style={styles.routeBoxText}>📍 Pickup: {pickupInput}</Text>
                  <Text style={styles.routeBoxText}>🏁 Destination: {dropInput}</Text>
                  <Text style={styles.routeBoxSub}>Date & Time: {pickupDate}, {pickupTime}</Text>
                  <Text style={styles.routeBoxSub}>Cab Selected: {selectedVehicle.name}</Text>
                </View>

                <Text style={styles.cardSectionTitle}>PASSENGER CONTACT DETAILS</Text>
                <Text style={styles.inputLabel}>FULL NAME</Text>
                <TextInput
                  style={styles.input}
                  value={customerName}
                  onChangeText={setCustomerName}
                  placeholder="Your Full Name"
                />

                <Text style={styles.inputLabel}>MOBILE NUMBER</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="10-digit mobile number"
                />

                <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="email-address"
                  value={customerEmail}
                  onChangeText={setCustomerEmail}
                  placeholder="customer@email.com"
                />

                <Text style={styles.inputLabel}>SPECIAL INSTRUCTIONS (OPTIONAL)</Text>
                <TextInput
                  style={styles.input}
                  value={specialNotes}
                  onChangeText={setSpecialNotes}
                  placeholder="e.g. Flight number, extra luggage space"
                />

                {/* FARE BREAKDOWN BOX */}
                <View style={styles.fareBreakdownBox}>
                  <Text style={styles.fareBreakdownTitle}>TRANSPARENT FARE BREAKDOWN</Text>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Route Distance:</Text>
                    <Text style={styles.infoValue}>~{estimatedDistanceKm} km</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Cab Rate per km:</Text>
                    <Text style={styles.infoValue}>₹{selectedVehicle.ratePerKm}/km</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Total Estimated Fare:</Text>
                    <Text style={styles.infoValueHighlight}>₹{calculatedFare.toLocaleString()}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>25% Advance Payable Now:</Text>
                    <Text style={[styles.infoValue, { color: KANDY_THEME.colors.primary }]}>
                      ₹{advancePayable.toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Balance Payable to Driver:</Text>
                    <Text style={styles.infoValue}>₹{balancePayable.toLocaleString()}</Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.finalBookBtn} onPress={handleConfirmFinalBooking}>
                  <Text style={styles.finalBookBtnText}>
                    CONFIRM & PAY ₹{advancePayable.toLocaleString()} ADVANCE →
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* SUCCESS SCREEN */}
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
                onPress={() => {
                  setActiveTab('TRIPS');
                  setCurrentStep('SEARCH');
                }}
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
          {userBookings.map((b) => (
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
                <Text style={styles.infoValue}>₹{b.totalFare.toLocaleString()}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>25% Advance Paid:</Text>
                <Text style={[styles.infoValue, { color: KANDY_THEME.colors.success }]}>
                  ₹{b.advancePaid.toLocaleString()} (PAID)
                </Text>
              </View>

              {b.balanceDue > 0 && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Balance Due to Driver:</Text>
                  <Text style={[styles.infoValue, { color: KANDY_THEME.colors.primary }]}>
                    ₹{b.balanceDue.toLocaleString()}
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
          ))}
        </ScrollView>
      )}

      {/* TAB 3: FLEET & RATES SHOWCASE */}
      {activeTab === 'FLEET' && (
        <ScrollView style={styles.scrollContent}>
          <Text style={styles.pageHeading}>OUR VEHICLE FLEET & RATE CARD</Text>
          {FLEET_CATEGORIES.map((v) => (
            <View key={v.id} style={styles.fleetCard}>
              <View style={styles.fleetHeader}>
                <Text style={styles.fleetTitle}>{v.name}</Text>
                <Text style={styles.vehicleTag}>{v.tag}</Text>
              </View>
              <Text style={styles.fleetSub}>{v.category}</Text>
              <Text style={styles.vehicleDesc}>{v.description}</Text>
              <View style={styles.fleetFeatureRow}>
                <Text style={styles.fleetFeature}>👥 {v.capacity}</Text>
                <Text style={styles.fleetFeature}>🧳 {v.luggage}</Text>
                <Text style={styles.fleetFeature}>❄️ AC Cabs</Text>
              </View>
              <View style={styles.fleetRateRow}>
                <Text style={styles.fleetRateText}>Rate: ₹{v.ratePerKm}/km</Text>
                <Text style={styles.fleetBaseText}>Min Base Fare: ₹{v.baseFare}</Text>
              </View>
              <TouchableOpacity
                style={styles.bookFleetBtn}
                onPress={() => {
                  setSelectedVehicle(v);
                  setActiveTab('HOME');
                  setCurrentStep('CONFIRMATION');
                }}
              >
                <Text style={styles.bookFleetBtnText}>BOOK THIS VEHICLE →</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {/* TAB 4: ACCOUNT & PROFILE */}
      {activeTab === 'ACCOUNT' && (
        <ScrollView style={styles.scrollContent}>
          {!isLoggedIn ? (
            <View style={styles.bookingCard}>
              <Text style={styles.cardTitle}>Customer Login / Signup</Text>
              <Text style={styles.cardDesc}>Enter mobile number for SMS OTP verification</Text>

              <Text style={styles.inputLabel}>YOUR FULL NAME</Text>
              <TextInput
                style={styles.input}
                value={customerName}
                onChangeText={setCustomerName}
                placeholder="e.g. Rakshith M"
              />

              <Text style={styles.inputLabel}>MOBILE NUMBER</Text>
              <TextInput
                style={styles.input}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                placeholder="10-digit mobile number"
              />

              {!otpSent ? (
                <TouchableOpacity style={styles.primaryButton} onPress={handleSendOtp}>
                  <Text style={styles.primaryButtonText}>SEND 4-DIGIT OTP →</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <View style={styles.demoOtpBox}>
                    <Text style={styles.demoOtpText}>Demo Master OTP: 1234</Text>
                  </View>
                  <Text style={styles.inputLabel}>ENTER 4-DIGIT OTP</Text>
                  <TextInput
                    style={[styles.input, { textAlign: 'center', fontSize: 20, letterSpacing: 6 }]}
                    keyboardType="number-pad"
                    maxLength={4}
                    value={otp}
                    onChangeText={setOtp}
                    placeholder="1234"
                  />
                  <TouchableOpacity style={styles.primaryButton} onPress={handleVerifyOtp}>
                    <Text style={styles.primaryButtonText}>VERIFY & LOGIN →</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          ) : (
            <View style={styles.profileCard}>
              <Text style={styles.profileTitle}>CUSTOMER ACCOUNT PROFILE</Text>
              <Text style={styles.profileName}>{customerName}</Text>
              <Text style={styles.profilePhone}>📱 +91 {phone}</Text>

              <View style={styles.profileStatsRow}>
                <View style={styles.profileStatItem}>
                  <Text style={styles.profileStatVal}>{userBookings.length}</Text>
                  <Text style={styles.profileStatLbl}>Total Trips</Text>
                </View>
                <View style={styles.profileStatItem}>
                  <Text style={styles.profileStatVal}>4.9 ★</Text>
                  <Text style={styles.profileStatLbl}>Rating</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.callSupportBtn} onPress={() => handleCallSupport('9876543210')}>
                <Text style={styles.callSupportText}>📞 24x7 CUSTOMER SUPPORT HELPLINE</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <Text style={styles.logoutBtnText}>LOGOUT OF ACCOUNT</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {/* TAB: ABOUT US PAGE */}
      {activeTab === 'ABOUT' && (
        <ScrollView style={styles.scrollContent}>
          <View style={styles.bookingCard}>
            <Text style={styles.cardSectionTitle}>ABOUT KANDY CABS</Text>
            <Text style={styles.pageHeading}>South India & Sri Lanka's Premier Intercity Taxi Service</Text>
            <Text style={styles.heroSubtitle}>
              Kandy Cabs provides premium outstation, intercity, local hourly rental, and airport transfer cab services with 100% verified chauffeurs, sanitized vehicles, and transparent billing.
            </Text>

            <View style={styles.menuDivider} />

            <Text style={styles.cardSectionTitle}>WHY CHOOSE US</Text>
            <View style={styles.trustBadgesGrid}>
              <View style={styles.trustBadgeItem}>
                <Text style={styles.trustBadgeIcon}>🛡️</Text>
                <View>
                  <Text style={styles.trustBadgeTitle}>Police Verified Drivers</Text>
                  <Text style={styles.trustBadgeSub}>Background Checked</Text>
                </View>
              </View>
              <View style={styles.trustBadgeItem}>
                <Text style={styles.trustBadgeIcon}>🟢</Text>
                <View>
                  <Text style={styles.trustBadgeTitle}>25% Advance Only</Text>
                  <Text style={styles.trustBadgeSub}>Pay Rest on Trip Completion</Text>
                </View>
              </View>
              <View style={styles.trustBadgeItem}>
                <Text style={styles.trustBadgeIcon}>🎗️</Text>
                <View>
                  <Text style={styles.trustBadgeTitle}>Zero Hidden Fees</Text>
                  <Text style={styles.trustBadgeSub}>Itemized Billing</Text>
                </View>
              </View>
              <View style={styles.trustBadgeItem}>
                <Text style={styles.trustBadgeIcon}>📞</Text>
                <View>
                  <Text style={styles.trustBadgeTitle}>24x7 Ops Support</Text>
                  <Text style={styles.trustBadgeSub}>Dedicated Helpline</Text>
                </View>
              </View>
            </View>

            <View style={styles.menuDivider} />

            <Text style={styles.cardSectionTitle}>OPERATING CITIES & REGIONS</Text>
            <Text style={styles.heroSubtitle}>
              • Karnataka: Bangalore, Mysore, Coorg, Chikmagalur, Mangalore{"\n"}
              • Tamil Nadu: Chennai, Ooty, Madurai, Coimbatore{"\n"}
              • Sri Lanka: Colombo, Kandy, Galle, Negombo, Nuwara Eliya
            </Text>

            <TouchableOpacity style={styles.primaryButton} onPress={() => { setActiveTab('HOME'); setCurrentStep('SEARCH'); }}>
              <Text style={styles.primaryButtonText}>BOOK A CAB NOW →</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* TAB: CONTACT US PAGE */}
      {activeTab === 'CONTACT' && (
        <ScrollView style={styles.scrollContent}>
          <View style={styles.bookingCard}>
            <Text style={styles.cardSectionTitle}>24x7 CUSTOMER SUPPORT</Text>
            <Text style={styles.pageHeading}>Get in Touch with Our Operations Team</Text>

            <TouchableOpacity style={styles.supportCallBtn} onPress={() => handleCallSupport('9876543210')}>
              <Text style={styles.supportCallBtnText}>📞 Call Customer Helpline: +91 98765 43210</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.supportCallBtn, { backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FFEDD5' }]} onPress={() => Linking.openURL('mailto:support@kandycabs.com')}>
              <Text style={[styles.supportCallBtnText, { color: '#EA580C' }]}>✉️ Email Support: support@kandycabs.com</Text>
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
              style={styles.primaryButton}
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
              <Text style={styles.primaryButtonText}>SUBMIT MESSAGE →</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}



      {/* FLOATING BOTTOM NAVIGATION TAB BAR (Matching Image 2 Bottom Selector) */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[styles.bottomNavItem, tripType === 'ONEWAY' && styles.bottomNavItemActive]}
          onPress={() => {
            setTripType('ONEWAY');
            setActiveTab('HOME');
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
          }}
        >
          <Text style={styles.bottomNavIcon}>✈️</Text>
          <Text style={[styles.bottomNavText, tripType === 'AIRPORT' && styles.bottomNavTextActive]}>AIRPORT</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  menuBackdrop: {
    flex: 1,
  },
  menuDrawer: {
    backgroundColor: '#FFFFFF',
    width: '85%',
    maxWidth: 340,
    height: '100%',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 10,
  },
  menuLogoImage: {
    width: 130,
    height: 36,
  },
  menuCloseCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuCloseBtnText: {
    color: '#475569',
    fontSize: 16,
    fontWeight: '900',
  },
  menuContent: {
    flex: 1,
  },
  menuLinkRow: {
    paddingVertical: 14,
  },
  menuLinkText: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 16,
  },
  menuUserLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 14,
    letterSpacing: 0.5,
  },
  driverPortalBtn: {
    backgroundColor: '#0F172A',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  driverPortalBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  customerPortalBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#EA580C',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  customerPortalBtnText: {
    color: '#EA580C',
    fontSize: 13,
    fontWeight: '900',
  },
  logoutDrawerBtn: {
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  logoutDrawerBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  menuCloseBtn: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '900',
  },
  supportCallBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  supportCallBtnText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '800',
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
  homeFleetSection: {
    marginVertical: 16,
  },
  homeFleetTag: {
    fontSize: 11,
    fontWeight: '900',
    color: '#EA580C',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  homeFleetTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
  },
  homeFleetAction: {
    fontSize: 12,
    fontWeight: '900',
    color: '#EA580C',
    marginBottom: 14,
  },
  fleetPreviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
  scrollContent: {
    padding: 14,
  },
  heroSection: {
    marginVertical: 10,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 8,
  },
  heroBadgeText: {
    color: KANDY_THEME.colors.primary,
    fontSize: 10,
    fontWeight: '900',
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 28,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 14,
  },
  bookingCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  inputSearchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 6,
  },
  inputIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  inputWithIcon: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  suggestionsBox: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    marginBottom: 10,
    maxHeight: 180,
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
  swapContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  swapLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  swapCircleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  swapIcon: {
    color: KANDY_THEME.colors.primary,
    fontSize: 18,
    fontWeight: '900',
  },
  dateTimeGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  exploreCabsBtn: {
    backgroundColor: KANDY_THEME.colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  exploreCabsBtnText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  trustBadgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  trustBadgeItem: {
    flexBasis: '48%',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trustBadgeIcon: {
    fontSize: 18,
  },
  trustBadgeTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#0F172A',
  },
  trustBadgeSub: {
    fontSize: 9,
    color: '#64748B',
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
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  bottomNavItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 8,
  },
  bottomNavItemActive: {
    backgroundColor: KANDY_THEME.colors.primary,
  },
  bottomNavIcon: {
    fontSize: 16,
  },
  bottomNavText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#475569',
    marginTop: 2,
  },
  bottomNavTextActive: {
    color: '#FFF',
  },
});
