import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Platform,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { customerApiClient, customerTokenStorage } from '../../lib/api';
import { VehicleCategory, TripType, FuelType } from '@kandy-cabs/shared';

const { width } = Dimensions.get('window');

const FLEET_INFO: Record<
  string,
  {
    name: string;
    models: string;
    ratePerKm: number;
    minKm: number;
    passengers: number;
    luggage: number;
    badge: string;
    image: any;
    color: string;
    category: VehicleCategory;
  }
> = {
  HATCHBACK: {
    name: 'Hatchback',
    models: 'WagonR, Tiago, Celerio',
    ratePerKm: 11,
    minKm: 50,
    passengers: 4,
    luggage: 2,
    badge: 'ECONOMY CHOICE',
    image: require('../../assets/images/fleet-hatchback.png'),
    color: '#059669',
    category: VehicleCategory.HATCHBACK,
  },
  SEDAN: {
    name: 'Prime Sedan',
    models: 'Dzire, Etios, Honda Amaze',
    ratePerKm: 13,
    minKm: 60,
    passengers: 4,
    luggage: 3,
    badge: 'MOST POPULAR',
    image: require('../../assets/images/fleet-sedan.png'),
    color: '#ea580c',
    category: VehicleCategory.SEDAN,
  },
  SUV: {
    name: 'Prime SUV',
    models: 'Ertiga, Carens, XL6',
    ratePerKm: 16,
    minKm: 80,
    passengers: 6,
    luggage: 4,
    badge: 'FAMILY & GROUP',
    image: require('../../assets/images/fleet-suv.png'),
    color: '#0284c7',
    category: VehicleCategory.SUV,
  },
  CRYSTA: {
    name: 'Innova Crysta Luxury',
    models: 'Toyota Innova Crysta / Hycross',
    ratePerKm: 20,
    minKm: 100,
    passengers: 7,
    luggage: 5,
    badge: 'EXECUTIVE LUXURY',
    image: require('../../assets/images/fleet-crysta.png'),
    color: '#7c3aed',
    category: VehicleCategory.SUV_PREMIUM,
  },
  SUV_PREMIUM: {
    name: 'Innova Crysta Luxury',
    models: 'Toyota Innova Crysta / Hycross',
    ratePerKm: 20,
    minKm: 100,
    passengers: 7,
    luggage: 5,
    badge: 'EXECUTIVE LUXURY',
    image: require('../../assets/images/fleet-crysta.png'),
    color: '#7c3aed',
    category: VehicleCategory.SUV_PREMIUM,
  },
  TRAVELLER: {
    name: 'Tempo Traveller',
    models: 'Force Traveller 3350 AC (12+1)',
    ratePerKm: 26,
    minKm: 150,
    passengers: 14,
    luggage: 10,
    badge: 'LARGE GROUP',
    image: require('../../assets/images/fleet-traveller.png'),
    color: '#b45309',
    category: VehicleCategory.TEMPO_TRAVELER,
  },
  TEMPO_TRAVELER: {
    name: 'Tempo Traveller',
    models: 'Force Traveller 3350 AC (12+1)',
    ratePerKm: 26,
    minKm: 150,
    passengers: 14,
    luggage: 10,
    badge: 'LARGE GROUP',
    image: require('../../assets/images/fleet-traveller.png'),
    color: '#b45309',
    category: VehicleCategory.TEMPO_TRAVELER,
  },
};

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straight = R * c;
  return Math.max(15, Math.round(straight * 1.3));
}

export default function BookingFunnelScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0);

  // Stepper: 1: Contact Info / Login, 2: Review & Payment, 3: Success Confirmation
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Route & Vehicle Info
  const pickup = (params.pickup as string) || 'Mangaluru';
  const drop = (params.drop as string) || 'Udupi';
  const pickupDate = (params.date as string) || 'Today';
  const pickupTime = (params.time as string) || '09:00';
  const tripTypeParam = (params.tripType as string) || 'ONEWAY';
  const localHours = Number(params.localHours) || 8;
  const rawCategory = (params.category as string) || 'SEDAN';

  const pickupLat = Number(params.pickupLat) || 12.8634;
  const pickupLng = Number(params.pickupLng) || 74.8436;
  const dropLat = Number(params.dropLat) || 13.348;
  const dropLng = Number(params.dropLng) || 74.782;

  const vehicleInfo = FLEET_INFO[rawCategory] || FLEET_INFO.SEDAN;

  // Estimated Distance & Time
  const estimatedKm = useMemo(() => {
    if (tripTypeParam === 'LOCAL') {
      return localHours === 4 ? 40 : localHours === 8 ? 80 : 120;
    }
    return calculateDistanceKm(pickupLat, pickupLng, dropLat, dropLng);
  }, [tripTypeParam, localHours, pickupLat, pickupLng, dropLat, dropLng]);

  const estimatedHours = useMemo(() => {
    if (tripTypeParam === 'LOCAL') return `${localHours} hrs`;
    const h = (estimatedKm / 45).toFixed(1);
    return `${h} hrs approx`;
  }, [tripTypeParam, localHours, estimatedKm]);

  // Pricing Calculation
  const baseEstimatedFare = useMemo(() => {
    const billableKm = Math.max(vehicleInfo.minKm, estimatedKm);
    return Math.round(billableKm * vehicleInfo.ratePerKm);
  }, [vehicleInfo, estimatedKm]);

  // Auth & User Profile State
  const [user, setUser] = useState<any | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Guest Auth form state (if not logged in)
  const [authPhone, setAuthPhone] = useState('');
  const [authName, setAuthName] = useState('');
  const [authOtp, setAuthOtp] = useState('');
  const [authStep, setAuthStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [authLoading, setAuthLoading] = useState(false);
  const [authDevOtp, setAuthDevOtp] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Step 1: Passenger Contact Info
  const [passengerName, setPassengerName] = useState('');
  const [passengerPhone, setPassengerPhone] = useState('');
  const [passengerEmail, setPassengerEmail] = useState('');
  const [pickupNotes, setPickupNotes] = useState('');

  // Step 2: Promo Coupon & Payment Mode
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [paymentMode, setPaymentMode] = useState<'ADVANCE_25' | 'PAY_ON_DROP' | 'CORPORATE'>('ADVANCE_25');

  // Step 3: Booking Confirmation & Submitting
  const [submitting, setSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<any | null>(null);

  // Check user authentication on mount
  useEffect(() => {
    async function checkAuth() {
      setAuthChecking(true);
      try {
        const res = await customerApiClient.fetch('/api/auth/me');
        if (res?.user) {
          setUser(res.user);
          setPassengerName(res.user.fullName || '');
          setPassengerPhone(res.user.phone ? res.user.phone.replace(/\D/g, '').slice(-10) : '');
          setPassengerEmail(res.user.email || '');
        }
      } catch {
        // Guest mode
      } finally {
        setAuthChecking(false);
      }
    }
    checkAuth();
  }, []);

  // Handle Send OTP for Guest Auth
  const handleSendOtp = async () => {
    const cleaned = authPhone.trim().replace(/\D/g, '');
    if (cleaned.length !== 10) {
      setAuthError('Please enter a valid 10-digit mobile number');
      return;
    }
    setAuthError(null);
    setAuthLoading(true);

    try {
      const res = await customerApiClient.fetch('/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ phone: cleaned }),
      });

      if (res && res.success) {
        const devCode = res.debugOtp || res.devOtp || '1234';
        setAuthDevOtp(devCode);
        setAuthOtp(devCode);
        setAuthStep('OTP');
      } else {
        setAuthError(res?.message || 'Failed to send OTP code.');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Connection error. Please retry.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle Verify OTP for Guest Auth
  const handleVerifyOtp = async () => {
    if (authOtp.trim().length !== 4) {
      setAuthError('Please enter the 4-digit code sent to your phone');
      return;
    }
    setAuthError(null);
    setAuthLoading(true);

    try {
      const cleaned = authPhone.trim().replace(/\D/g, '');
      const res = await customerApiClient.fetch('/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          phone: cleaned,
          otp: authOtp.trim(),
          fullName: authName.trim() || undefined,
        }),
      });

      if (res && res.success) {
        if (res.token) {
          customerTokenStorage.setToken(res.token);
        }
        setUser(res.user);
        setPassengerName(res.user?.fullName || authName.trim() || 'Customer');
        setPassengerPhone(cleaned);
        setPassengerEmail(res.user?.email || '');
        Alert.alert('Signed In Successfully! 👋', `Welcome, ${res.user?.fullName || 'Traveler'}!`);
      } else {
        setAuthError(res?.message || 'Invalid verification code.');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Verification failed. Please retry.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle Apply Coupon
  const handleApplyCoupon = () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) {
      setCouponMsg('Please enter a coupon code.');
      return;
    }

    if (code === 'KANDY10' || code === 'SAVE10') {
      const discount = Math.round(baseEstimatedFare * 0.1);
      setCouponDiscount(discount);
      setCouponApplied(true);
      setCouponMsg(`🎉 Promo "${code}" applied! You saved ₹${discount}`);
    } else if (code === 'FIRST50' || code === 'WELCOME50') {
      const discount = 50;
      setCouponDiscount(discount);
      setCouponApplied(true);
      setCouponMsg(`🎉 Promo "${code}" applied! You saved ₹${discount}`);
    } else {
      setCouponApplied(false);
      setCouponDiscount(0);
      setCouponMsg('Invalid coupon code. Try KANDY10 or FIRST50.');
    }
  };

  // Calculate final totals
  const subtotal = Math.max(0, baseEstimatedFare - couponDiscount);
  const gstAmount = Math.round(subtotal * 0.05);
  const totalFare = subtotal + gstAmount;
  const advanceAmount = Math.round(totalFare * 0.25);
  const balanceAmount = totalFare - advanceAmount;

  // Proceed to Step 2
  const handleProceedToStep2 = () => {
    if (!passengerName.trim()) {
      Alert.alert('Name Required', 'Please enter the passenger full name.');
      return;
    }
    const cleanPhone = passengerPhone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      Alert.alert('Phone Required', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    setStep(2);
  };

  // Step 2 -> Step 3: Create Booking
  const handleConfirmBooking = async () => {
    setSubmitting(true);
    try {
      const idempotencyKey = `idemp_app_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const scheduledAt = new Date().toISOString();

      const res = await customerApiClient.fetch('/api/customer/bookings', {
        method: 'POST',
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          pickupAddress: pickup,
          pickupLat,
          pickupLng,
          dropAddress: drop,
          dropLat,
          dropLng,
          category: vehicleInfo.category,
          fuelType: FuelType.DIESEL,
          tripType: tripTypeParam as TripType,
          scheduledAt,
          durationDays: 1,
          packageHours: localHours,
          couponCode: couponApplied ? couponCode.trim().toUpperCase() : undefined,
          passengerName: passengerName.trim(),
          passengerPhone: passengerPhone.trim(),
          passengerEmail: passengerEmail.trim() || undefined,
          paymentMode: paymentMode === 'PAY_ON_DROP' ? 'PAY_ON_DROP' : 'ADVANCE',
          notes: pickupNotes.trim() || undefined,
        }),
      });

      if (res && res.success && res.booking) {
        setConfirmedBooking(res.booking);
        setStep(3);
      } else {
        Alert.alert('Booking Error', res?.message || 'Could not place booking request.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to connect with server.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={true} />

      {/* 1. Header Bar */}
      <View style={[styles.header, { paddingTop: topInset + 8 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (step === 3) {
              router.replace('/my-bookings');
            } else if (step === 2) {
              setStep(1);
            } else {
              router.back();
            }
          }}
        >
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {step === 3 ? 'Booking Confirmed' : step === 2 ? 'Review & Payment' : 'Passenger Details'}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {pickup} ➔ {drop}
          </Text>
        </View>

        <View style={{ width: 40 }} />
      </View>

      {/* 2. Stepper Indicator */}
      <View style={styles.stepperContainer}>
        {[
          { num: 1, label: 'Contact Info', icon: 'person-outline' },
          { num: 2, label: 'Review & Pay', icon: 'card-outline' },
          { num: 3, label: 'Confirmed', icon: 'checkmark-circle-outline' },
        ].map((s, idx) => {
          const isActive = step >= s.num;
          const isCurrent = step === s.num;

          return (
            <React.Fragment key={s.num}>
              {idx > 0 && (
                <View
                  style={[
                    styles.stepLine,
                    step >= s.num && styles.stepLineActive,
                  ]}
                />
              )}
              <View style={styles.stepItem}>
                <View
                  style={[
                    styles.stepCircle,
                    isActive && styles.stepCircleActive,
                    isCurrent && styles.stepCircleCurrent,
                  ]}
                >
                  <Ionicons
                    name={s.icon as any}
                    size={14}
                    color={isActive ? '#ffffff' : '#94a3b8'}
                  />
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    isActive && styles.stepLabelActive,
                    isCurrent && styles.stepLabelCurrent,
                  ]}
                >
                  {s.label}
                </Text>
              </View>
            </React.Fragment>
          );
        })}
      </View>

      {/* 3. Main Body Content */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ========================================================= */}
          {/* STEP 1: CONTACT INFO & GUEST LOGIN                        */}
          {/* ========================================================= */}
          {step === 1 && (
            <View style={styles.stepSection}>
              {/* If user is not logged in: Show Login / OTP Card */}
              {!user && !authChecking && (
                <View style={styles.authNoticeCard}>
                  <View style={styles.authNoticeHeader}>
                    <Ionicons name="lock-closed" size={18} color="#ea580c" />
                    <Text style={styles.authNoticeTitle}>
                      {authStep === 'PHONE' ? 'Sign In / Register First' : 'Enter 4-Digit OTP'}
                    </Text>
                  </View>
                  <Text style={styles.authNoticeSub}>
                    {authStep === 'PHONE'
                      ? 'Please enter your mobile number to receive driver updates and ride OTP.'
                      : `Enter the code sent to +91 ${authPhone}`}
                  </Text>

                  {authError && (
                    <View style={styles.errorBox}>
                      <Ionicons name="alert-circle" size={16} color="#dc2626" />
                      <Text style={styles.errorText}>{authError}</Text>
                    </View>
                  )}

                  {authStep === 'PHONE' ? (
                    <>
                      <View style={styles.phoneInputRow}>
                        <View style={styles.countryCodeBadge}>
                          <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
                        </View>
                        <TextInput
                          style={styles.phoneInput}
                          placeholder="9876543210"
                          placeholderTextColor="#94a3b8"
                          keyboardType="phone-pad"
                          maxLength={10}
                          value={authPhone}
                          onChangeText={(t) => {
                            setAuthPhone(t.replace(/\D/g, ''));
                            setAuthError(null);
                          }}
                        />
                      </View>

                      <TouchableOpacity
                        style={[styles.authActionBtn, authLoading && { opacity: 0.6 }]}
                        onPress={handleSendOtp}
                        disabled={authLoading}
                      >
                        {authLoading ? (
                          <ActivityIndicator color="#ffffff" />
                        ) : (
                          <>
                            <Text style={styles.authActionBtnText}>Get Verification Code</Text>
                            <Ionicons name="arrow-forward" size={16} color="#ffffff" style={{ marginLeft: 6 }} />
                          </>
                        )}
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>FULL NAME</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="e.g. Rachel Sharma"
                          placeholderTextColor="#94a3b8"
                          value={authName}
                          onChangeText={setAuthName}
                        />
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>4-DIGIT OTP CODE</Text>
                        <TextInput
                          style={styles.otpInput}
                          placeholder="••••"
                          placeholderTextColor="#cbd5e1"
                          keyboardType="number-pad"
                          maxLength={4}
                          value={authOtp}
                          onChangeText={(t) => {
                            setAuthOtp(t.replace(/\D/g, ''));
                            setAuthError(null);
                          }}
                          autoFocus
                        />
                      </View>

                      {authDevOtp && (
                        <TouchableOpacity
                          style={styles.devCodeBadge}
                          onPress={() => setAuthOtp(authDevOtp)}
                        >
                          <Text style={styles.devCodeText}>⚡ Tap to use Dev OTP: {authDevOtp}</Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        style={[styles.authActionBtn, authLoading && { opacity: 0.6 }]}
                        onPress={handleVerifyOtp}
                        disabled={authLoading}
                      >
                        {authLoading ? (
                          <ActivityIndicator color="#ffffff" />
                        ) : (
                          <Text style={styles.authActionBtnText}>Verify & Proceed</Text>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.changePhoneBtn}
                        onPress={() => setAuthStep('PHONE')}
                      >
                        <Text style={styles.changePhoneText}>← Change Phone Number</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              )}

              {/* Logged in User Profile Banner */}
              {user && (
                <View style={styles.verifiedUserCard}>
                  <View style={styles.userAvatarBox}>
                    <Text style={styles.userAvatarText}>
                      {user.fullName ? user.fullName[0].toUpperCase() : 'U'}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.verifiedRow}>
                      <Text style={styles.verifiedName}>{user.fullName || 'Valued Customer'}</Text>
                      <View style={styles.greenBadge}>
                        <Text style={styles.greenBadgeText}>✓ Logged In</Text>
                      </View>
                    </View>
                    <Text style={styles.verifiedPhone}>📞 +91 {user.phone}</Text>
                  </View>
                </View>
              )}

              {/* Passenger Details Form Card */}
              <View style={styles.formCard}>
                <Text style={styles.formCardTitle}>Passenger & Pickup Info</Text>
                <Text style={styles.formCardSub}>
                  Driver and vehicle live tracking will be sent to this contact.
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    PASSENGER FULL NAME <Text style={{ color: '#ef4444' }}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter full name"
                    placeholderTextColor="#94a3b8"
                    value={passengerName}
                    onChangeText={setPassengerName}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    MOBILE NUMBER <Text style={{ color: '#ef4444' }}>*</Text>
                  </Text>
                  <View style={styles.phoneInputRow}>
                    <View style={styles.countryCodeBadge}>
                      <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
                    </View>
                    <TextInput
                      style={styles.phoneInput}
                      placeholder="9876543210"
                      placeholderTextColor="#94a3b8"
                      keyboardType="phone-pad"
                      maxLength={10}
                      value={passengerPhone}
                      onChangeText={(t) => setPassengerPhone(t.replace(/\D/g, ''))}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>EMAIL ADDRESS (FOR GST TAX INVOICE)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="rachel@example.com (optional)"
                    placeholderTextColor="#94a3b8"
                    keyboardType="email-address"
                    value={passengerEmail}
                    onChangeText={setPassengerEmail}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>SPECIAL PICKUP NOTES / LANDMARK</Text>
                  <TextInput
                    style={[styles.textInput, { height: 75, textAlignVertical: 'top', paddingTop: 10 }]}
                    placeholder="e.g. Near Gate 2 / Flight No: 6E-204 / Extra luggage"
                    placeholderTextColor="#94a3b8"
                    multiline
                    numberOfLines={3}
                    value={pickupNotes}
                    onChangeText={setPickupNotes}
                  />
                </View>
              </View>

              {/* Selected Vehicle Summary Pill */}
              <View style={styles.vehicleSummaryPill}>
                <Image
                  source={vehicleInfo.image}
                  style={styles.vehiclePillImage}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                  transition={200}
                />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.vehiclePillName}>{vehicleInfo.name}</Text>
                  <Text style={styles.vehiclePillModels}>{vehicleInfo.models}</Text>
                  <Text style={styles.vehiclePillRate}>
                    ₹{vehicleInfo.ratePerKm}/km • {vehicleInfo.passengers} Seats • {vehicleInfo.luggage} Bags
                  </Text>
                </View>
                <View style={styles.vehiclePillPrice}>
                  <Text style={styles.vehiclePillFare}>₹{baseEstimatedFare.toLocaleString('en-IN')}</Text>
                  <Text style={styles.vehiclePillEst}>Estimated</Text>
                </View>
              </View>

              {/* Step 1 Action Button */}
              <TouchableOpacity
                style={styles.primaryActionBtn}
                onPress={handleProceedToStep2}
              >
                <Text style={styles.primaryActionBtnText}>Review Fare & Payment →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ========================================================= */}
          {/* STEP 2: REVIEW ROUTE & PAYMENT SELECTION                   */}
          {/* ========================================================= */}
          {step === 2 && (
            <View style={styles.stepSection}>
              {/* 1. Trip & Route Summary Card */}
              <View style={styles.reviewRouteCard}>
                <View style={styles.reviewRouteHeader}>
                  <View style={styles.tripTypeBadge}>
                    <Text style={styles.tripTypeBadgeText}>
                      {tripTypeParam === 'ROUND'
                        ? 'ROUND TRIP'
                        : tripTypeParam === 'LOCAL'
                        ? `LOCAL (${localHours} HRS)`
                        : 'ONE-WAY OUTSTATION'}
                    </Text>
                  </View>
                  <Text style={styles.distanceBadge}>~{estimatedKm} km • {estimatedHours}</Text>
                </View>

                {/* Pickup & Drop Points */}
                <View style={styles.routePointsContainer}>
                  <View style={styles.routeIconColumn}>
                    <View style={[styles.routeDot, { backgroundColor: '#22c55e' }]} />
                    <View style={styles.routeLine} />
                    <View style={[styles.routeDot, { backgroundColor: '#ef4444' }]} />
                  </View>
                  <View style={styles.routeTextColumn}>
                    <View>
                      <Text style={styles.pointSub}>PICKUP</Text>
                      <Text style={styles.pointMain} numberOfLines={1}>{pickup}</Text>
                    </View>
                    <View style={{ marginTop: 10 }}>
                      <Text style={styles.pointSub}>DROP</Text>
                      <Text style={styles.pointMain} numberOfLines={1}>{drop}</Text>
                    </View>
                  </View>
                </View>

                {/* Date, Time & Passenger */}
                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Ionicons name="calendar-outline" size={13} color="#ea580c" />
                    <Text style={styles.metaText}>{pickupDate}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={13} color="#ea580c" />
                    <Text style={styles.metaText}>{pickupTime}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="person-outline" size={13} color="#059669" />
                    <Text style={styles.metaText} numberOfLines={1}>{passengerName}</Text>
                  </View>
                </View>
              </View>

              {/* 2. Promo Code Box */}
              <View style={styles.couponCard}>
                <Text style={styles.couponTitle}>Apply Promo / Corporate Coupon</Text>
                <View style={styles.couponInputRow}>
                  <TextInput
                    style={styles.couponInput}
                    placeholder="Try KANDY10 or FIRST50"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="characters"
                    value={couponCode}
                    onChangeText={setCouponCode}
                  />
                  <TouchableOpacity
                    style={styles.applyCouponBtn}
                    onPress={handleApplyCoupon}
                  >
                    <Text style={styles.applyCouponBtnText}>Apply</Text>
                  </TouchableOpacity>
                </View>
                {couponMsg && (
                  <Text
                    style={[
                      styles.couponFeedback,
                      couponApplied ? { color: '#16a34a' } : { color: '#dc2626' },
                    ]}
                  >
                    {couponMsg}
                  </Text>
                )}
              </View>

              {/* 3. Transparent Fare Breakdown Card */}
              <View style={styles.fareBreakdownCard}>
                <Text style={styles.fareTitle}>Transparent Fare Summary</Text>

                <View style={styles.fareRow}>
                  <Text style={styles.fareLabel}>
                    Base Estimated Fare ({estimatedKm} km @ ₹{vehicleInfo.ratePerKm}/km)
                  </Text>
                  <Text style={styles.fareVal}>₹{baseEstimatedFare.toLocaleString('en-IN')}</Text>
                </View>

                {couponDiscount > 0 && (
                  <View style={styles.fareRow}>
                    <Text style={[styles.fareLabel, { color: '#16a34a', fontWeight: '700' }]}>
                      Coupon Discount ({couponCode})
                    </Text>
                    <Text style={[styles.fareVal, { color: '#16a34a', fontWeight: '800' }]}>
                      -₹{couponDiscount.toLocaleString('en-IN')}
                    </Text>
                  </View>
                )}

                <View style={styles.fareRow}>
                  <Text style={styles.fareLabel}>GST (5% Government Tax)</Text>
                  <Text style={styles.fareVal}>₹{gstAmount.toLocaleString('en-IN')}</Text>
                </View>

                <View style={styles.fareDivider} />

                <View style={[styles.fareRow, { marginTop: 4 }]}>
                  <Text style={styles.totalFareLabel}>Total Estimated Amount</Text>
                  <Text style={styles.totalFareVal}>₹{totalFare.toLocaleString('en-IN')}</Text>
                </View>

                {/* 25% Advance vs 75% Balance Split */}
                <View style={styles.splitFareBox}>
                  <View style={styles.splitBoxCol}>
                    <Text style={styles.splitBoxLabel}>25% Advance (Pay Now)</Text>
                    <Text style={styles.splitBoxAdv}>₹{advanceAmount.toLocaleString('en-IN')}</Text>
                    <Text style={styles.splitBoxNote}>Guaranteed instant dispatch</Text>
                  </View>
                  <View style={styles.splitDivider} />
                  <View style={styles.splitBoxCol}>
                    <Text style={styles.splitBoxLabel}>75% Balance (At Drop)</Text>
                    <Text style={styles.splitBoxBal}>₹{balanceAmount.toLocaleString('en-IN')}</Text>
                    <Text style={styles.splitBoxNote}>Pay to chauffeur (UPI/Cash)</Text>
                  </View>
                </View>
              </View>

              {/* 4. Payment Mode Options */}
              <View style={styles.paymentOptionsCard}>
                <Text style={styles.paymentOptionsTitle}>Select Payment Option</Text>

                {/* Option 1: 25% Advance Online */}
                <TouchableOpacity
                  style={[
                    styles.paymentOptionItem,
                    paymentMode === 'ADVANCE_25' && styles.paymentOptionActive,
                  ]}
                  onPress={() => setPaymentMode('ADVANCE_25')}
                >
                  <View style={styles.radioCircle}>
                    {paymentMode === 'ADVANCE_25' && <View style={styles.radioInner} />}
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.paymentOptionName}>Pay 25% Advance (₹{advanceAmount})</Text>
                      <View style={styles.recommendedBadge}>
                        <Text style={styles.recommendedBadgeText}>RECOMMENDED</Text>
                      </View>
                    </View>
                    <Text style={styles.paymentOptionDesc}>
                      UPI / GPay / PhonePe / Card / NetBanking • Instant Driver Allocation
                    </Text>
                  </View>
                  <Ionicons name="flash" size={18} color="#ea580c" />
                </TouchableOpacity>

                {/* Option 2: Pay Full at Drop */}
                <TouchableOpacity
                  style={[
                    styles.paymentOptionItem,
                    paymentMode === 'PAY_ON_DROP' && styles.paymentOptionActive,
                  ]}
                  onPress={() => setPaymentMode('PAY_ON_DROP')}
                >
                  <View style={styles.radioCircle}>
                    {paymentMode === 'PAY_ON_DROP' && <View style={styles.radioInner} />}
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.paymentOptionName}>Pay Full to Chauffeur on Drop</Text>
                    <Text style={styles.paymentOptionDesc}>
                      Zero upfront payment • Pay ₹{totalFare} via Cash or UPI directly to driver
                    </Text>
                  </View>
                  <Ionicons name="cash-outline" size={18} color="#059669" />
                </TouchableOpacity>
              </View>

              {/* Action Buttons Row */}
              <View style={styles.actionBtnRow}>
                <TouchableOpacity
                  style={styles.backStepBtn}
                  onPress={() => setStep(1)}
                  disabled={submitting}
                >
                  <Text style={styles.backStepBtnText}>← Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.confirmPayBtn, submitting && { opacity: 0.7 }]}
                  onPress={handleConfirmBooking}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.confirmPayBtnText}>
                      {paymentMode === 'ADVANCE_25'
                        ? `Pay ₹${advanceAmount} & Book Ride 🔒`
                        : 'Confirm & Place Booking ➔'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ========================================================= */}
          {/* STEP 3: BOOKING CONFIRMED SUCCESS SCREEN                  */}
          {/* ========================================================= */}
          {step === 3 && confirmedBooking && (
            <View style={styles.stepSection}>
              <View style={styles.successCard}>
                {/* Big Celebration Icon */}
                <View style={styles.successIconCircle}>
                  <Ionicons name="checkmark" size={40} color="#ffffff" />
                </View>

                <Text style={styles.successTitle}>Booking Confirmed! 🎉</Text>
                <Text style={styles.successSub}>
                  Your verified cab booking has been created and dispatched.
                </Text>

                {/* Reference ID Pill */}
                <View style={styles.refPill}>
                  <Text style={styles.refPillLabel}>BOOKING REFERENCE</Text>
                  <Text style={styles.refPillValue}>{confirmedBooking.humanReadableRef}</Text>
                </View>

                {/* 4-Digit Pickup OTP Box */}
                {confirmedBooking.pickupOtp && (
                  <View style={styles.pickupOtpBox}>
                    <View style={styles.otpHeader}>
                      <Ionicons name="key-outline" size={16} color="#92400e" />
                      <Text style={styles.otpHeaderTitle}>YOUR 4-DIGIT PICKUP OTP</Text>
                    </View>
                    <View style={styles.otpNumberDisplay}>
                      <Text style={styles.otpNumberText}>{confirmedBooking.pickupOtp}</Text>
                    </View>
                    <Text style={styles.otpInstructions}>
                      Please share this code with your driver partner only when they arrive at pickup.
                    </Text>
                  </View>
                )}

                {/* Trip Details Summary */}
                <View style={styles.confirmedDetailsBox}>
                  <View style={styles.confirmedRow}>
                    <Text style={styles.confirmedLabel}>Vehicle:</Text>
                    <Text style={styles.confirmedValue}>{vehicleInfo.name}</Text>
                  </View>
                  <View style={styles.confirmedRow}>
                    <Text style={styles.confirmedLabel}>Route:</Text>
                    <Text style={styles.confirmedValue} numberOfLines={1}>
                      {pickup} ➔ {drop}
                    </Text>
                  </View>
                  <View style={styles.confirmedRow}>
                    <Text style={styles.confirmedLabel}>Scheduled Date:</Text>
                    <Text style={styles.confirmedValue}>{pickupDate} at {pickupTime}</Text>
                  </View>
                  <View style={styles.confirmedRow}>
                    <Text style={styles.confirmedLabel}>Passenger:</Text>
                    <Text style={styles.confirmedValue}>{passengerName} (+91 {passengerPhone})</Text>
                  </View>
                  <View style={styles.confirmedDivider} />
                  <View style={styles.confirmedRow}>
                    <Text style={styles.confirmedLabel}>Advance Status:</Text>
                    <Text style={[styles.confirmedValue, { color: '#16a34a', fontWeight: '800' }]}>
                      {confirmedBooking.advanceAmount > 0
                        ? `₹${confirmedBooking.advanceAmount} (PAID)`
                        : 'Pay at Drop'}
                    </Text>
                  </View>
                  <View style={styles.confirmedRow}>
                    <Text style={styles.confirmedLabel}>Balance Due on Trip:</Text>
                    <Text style={[styles.confirmedValue, { fontWeight: '800', color: '#0f172a' }]}>
                      ₹{confirmedBooking.balanceAmount}
                    </Text>
                  </View>
                </View>

                {/* Dispatch Status Notice */}
                <View style={styles.dispatchNoticeBox}>
                  <Ionicons name="navigate-outline" size={20} color="#ea580c" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.dispatchNoticeTitle}>Driver Partner Assignment</Text>
                    <Text style={styles.dispatchNoticeDesc}>
                      Our dispatch system has notified nearby verified drivers. Driver details & vehicle plate number will appear in your rides dashboard.
                    </Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <TouchableOpacity
                  style={styles.viewMyRidesBtn}
                  onPress={() => router.replace('/my-bookings')}
                >
                  <Ionicons name="car-outline" size={18} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.viewMyRidesBtnText}>Track Ride in My Bookings</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.backHomeBtn}
                  onPress={() => router.replace('/')}
                >
                  <Text style={styles.backHomeBtnText}>Back to Home</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ea580c',
    marginTop: 1,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  stepItem: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  stepCircleActive: {
    backgroundColor: '#ea580c',
    borderColor: '#ea580c',
  },
  stepCircleCurrent: {
    backgroundColor: '#ea580c',
    borderColor: '#fed7aa',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
    marginTop: 4,
  },
  stepLabelActive: {
    color: '#334155',
  },
  stepLabelCurrent: {
    color: '#ea580c',
    fontWeight: '800',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 8,
    marginBottom: 14,
  },
  stepLineActive: {
    backgroundColor: '#ea580c',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  stepSection: {
    gap: 16,
  },
  authNoticeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#fed7aa',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  authNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  authNoticeTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
  },
  authNoticeSub: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 17,
    marginBottom: 14,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    gap: 6,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
    marginBottom: 12,
  },
  countryCodeBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 13,
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
  },
  countryCodeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  authActionBtn: {
    backgroundColor: '#ea580c',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  authActionBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  otpInput: {
    borderWidth: 1.5,
    borderColor: '#ea580c',
    borderRadius: 14,
    backgroundColor: '#fff7ed',
    paddingVertical: 12,
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
    letterSpacing: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  devCodeBadge: {
    backgroundColor: '#ffedd5',
    borderWidth: 1,
    borderColor: '#fed7aa',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'center',
    marginBottom: 12,
  },
  devCodeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#c2410c',
  },
  changePhoneBtn: {
    alignItems: 'center',
    marginTop: 10,
    padding: 6,
  },
  changePhoneText: {
    fontSize: 12,
    color: '#ea580c',
    fontWeight: '700',
  },
  verifiedUserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  userAvatarBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ea580c',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  verifiedName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  greenBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  greenBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#166534',
  },
  verifiedPhone: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  formCardTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
  },
  formCardSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 14,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  vehicleSummaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  vehiclePillImage: {
    width: 65,
    height: 45,
  },
  vehiclePillName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  vehiclePillModels: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  vehiclePillRate: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
    marginTop: 2,
  },
  vehiclePillPrice: {
    alignItems: 'flex-end',
  },
  vehiclePillFare: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  vehiclePillEst: {
    fontSize: 10,
    color: '#94a3b8',
  },
  primaryActionBtn: {
    backgroundColor: '#ea580c',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryActionBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  reviewRouteCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  reviewRouteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tripTypeBadge: {
    backgroundColor: '#fff7ed',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  tripTypeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ea580c',
  },
  distanceBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  routePointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 14,
  },
  routeIconColumn: {
    alignItems: 'center',
    marginRight: 12,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  routeLine: {
    width: 2,
    height: 22,
    backgroundColor: '#cbd5e1',
    marginVertical: 2,
  },
  routeTextColumn: {
    flex: 1,
  },
  pointSub: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  pointMain: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 1,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  couponCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  couponTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 8,
  },
  couponInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  couponInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  applyCouponBtn: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyCouponBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  couponFeedback: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
  },
  fareBreakdownCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  fareTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 12,
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fareLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  fareVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  fareDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 8,
  },
  totalFareLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
  },
  totalFareVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ea580c',
  },
  splitFareBox: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  splitBoxCol: {
    flex: 1,
    alignItems: 'center',
  },
  splitBoxLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  splitBoxAdv: {
    fontSize: 16,
    fontWeight: '900',
    color: '#16a34a',
    marginTop: 2,
  },
  splitBoxBal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 2,
  },
  splitBoxNote: {
    fontSize: 9,
    color: '#94a3b8',
    marginTop: 2,
  },
  splitDivider: {
    width: 1,
    height: '100%',
    backgroundColor: '#cbd5e1',
    marginHorizontal: 8,
  },
  paymentOptionsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  paymentOptionsTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 12,
  },
  paymentOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    marginBottom: 10,
  },
  paymentOptionActive: {
    borderColor: '#ea580c',
    backgroundColor: '#fff7ed',
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#ea580c',
  },
  paymentOptionName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  recommendedBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  recommendedBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#166534',
    letterSpacing: 0.4,
  },
  paymentOptionDesc: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  backStepBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  backStepBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#475569',
  },
  confirmPayBtn: {
    flex: 2.5,
    backgroundColor: '#ea580c',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  confirmPayBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  successCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
  },
  successSub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 18,
  },
  refPill: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    marginBottom: 16,
  },
  refPillLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.6,
  },
  refPillValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  pickupOtpBox: {
    backgroundColor: '#fffbeb',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#fde68a',
    padding: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  otpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  otpHeaderTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#92400e',
    letterSpacing: 0.5,
  },
  otpNumberDisplay: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f59e0b',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 12,
    marginVertical: 4,
  },
  otpNumberText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#b45309',
    letterSpacing: 6,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  otpInstructions: {
    fontSize: 10,
    color: '#92400e',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 14,
  },
  confirmedDetailsBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 14,
    width: '100%',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  confirmedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  confirmedLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  confirmedValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
    textAlign: 'right',
  },
  confirmedDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 8,
  },
  dispatchNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    padding: 12,
    borderRadius: 14,
    width: '100%',
    marginBottom: 18,
  },
  dispatchNoticeTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9a3412',
  },
  dispatchNoticeDesc: {
    fontSize: 10,
    color: '#c2410c',
    marginTop: 2,
    lineHeight: 14,
  },
  viewMyRidesBtn: {
    backgroundColor: '#ea580c',
    paddingVertical: 14,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 10,
  },
  viewMyRidesBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  backHomeBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  backHomeBtnText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
  },
});
