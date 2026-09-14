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
  Switch,
  Image,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KANDY_THEME } from '@kandycabs/shared';
import {
  sendDriverOtpApi,
  verifyDriverOtpApi,
  setDriverAuthToken,
  fetchDriverDispatches,
  verifyPickupOtpApi,
  uploadOdometerPhotoApi,
  startTripApi,
  endTripApi,
  sendGpsPingApi,
} from './services/api';

const SESSION_STORAGE_KEY = '@kandy_driver_session';

export default function App() {
  // ─── AUTHENTICATION STATE & SESSION PERSISTENCE ───
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [driverUser, setDriverUser] = useState<any>(null);

  // Login form state
  const [loginPhone, setLoginPhone] = useState('');
  const [loginOtp, setLoginOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ─── RESTORE PERSISTED SESSION ON APP LAUNCH ───
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const savedSession = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
        if (savedSession) {
          const parsed = JSON.parse(savedSession);
          if (parsed?.token && parsed?.user) {
            setDriverUser(parsed.user);
            setDriverAuthToken(parsed.token, parsed.user);
            setIsLoggedIn(true);
          }
        }
      } catch (err) {
        console.warn('[DriverApp] Failed to restore session:', err);
      } finally {
        setIsCheckingAuth(false);
      }
    };
    restoreSession();
  }, []);

  // ─── LOGIN HANDLERS ───
  const handleSendOtp = async () => {
    const digitsOnly = loginPhone.replace(/\D/g, '');
    if (digitsOnly.length < 10) {
      Alert.alert('Invalid Number', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    setIsSubmitting(true);
    try {
      await sendDriverOtpApi(digitsOnly);
      setOtpSent(true);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send OTP code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (loginOtp.length < 4) {
      Alert.alert('Invalid Code', 'Please enter the 4-digit verification code.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await verifyDriverOtpApi(loginPhone, loginOtp);
      if (res.token && res.user) {
        // Save session permanently to AsyncStorage
        await AsyncStorage.setItem(
          SESSION_STORAGE_KEY,
          JSON.stringify({
            token: res.token,
            user: res.user,
          })
        );
        setDriverUser(res.user);
        setIsLoggedIn(true);
        Alert.alert('✅ Login Successful', `Welcome back, ${res.user.fullName || 'Driver Partner'}!`);
      }
    } catch (err: any) {
      Alert.alert('Verification Failed', err.message || 'Incorrect OTP code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to sign out from the Driver Partner app?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
            } catch (e) {}
            setDriverAuthToken(null);
            setDriverUser(null);
            setIsLoggedIn(false);
            setOtpSent(false);
            setLoginOtp('');
          },
        },
      ]
    );
  };

  // ─── DRIVER DASHBOARD STATES ───
  const [isDriverOnline, setIsDriverOnline] = useState(true);
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState(true);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(true);

  // Active Trip State
  const [tripState, setTripState] = useState<
    'DISPATCH_PENDING' | 'ACCEPTED' | 'EN_ROUTE' | 'TRIP_STARTED' | 'COMPLETED'
  >('ACCEPTED');
  const [pickupOtpInput, setPickupOtpInput] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [startOdometerCaptured, setStartOdometerCaptured] = useState(false);
  const [endOdometerCaptured, setEndOdometerCaptured] = useState(false);
  const [tollAmountInput, setTollAmountInput] = useState('0');
  const [tollConfirmed, setTollConfirmed] = useState(false);

  // GPS Continuous Ping Loop State
  const [speedKmh, setSpeedKmh] = useState(62);

  // Continuous GPS ping telemetry simulation
  useEffect(() => {
    let pingTimer: NodeJS.Timeout;
    if (isLoggedIn && (tripState === 'EN_ROUTE' || tripState === 'TRIP_STARTED') && locationPermissionGranted) {
      pingTimer = setInterval(() => {
        const nextSpeed = Math.min(95, Math.max(45, Math.floor(Math.random() * 40) + 50));
        setSpeedKmh(nextSpeed);
        sendGpsPingApi('KC73744', 12.5218, 76.8951, nextSpeed);
      }, 5000);
    }
    return () => clearInterval(pingTimer);
  }, [isLoggedIn, tripState, locationPermissionGranted]);

  const canCapturePhoto = cameraPermissionGranted && locationPermissionGranted;

  const handleVerifyPickupOtp = async () => {
    if (pickupOtpInput.length !== 4) {
      Alert.alert('Error', 'Invalid Pickup OTP. Please ask customer for 4-digit code.');
      return;
    }
    try {
      await verifyPickupOtpApi('KC73744', pickupOtpInput);
      setOtpVerified(true);
      setTripState('TRIP_STARTED');
      Alert.alert('✅ OTP Verified!', 'Trip started successfully. Admin & customer notified in real time.');
    } catch (err: any) {
      Alert.alert('OTP Verification Failed', err.message || 'Invalid OTP code.');
    }
  };

  const handleCaptureStartOdometer = async () => {
    if (!canCapturePhoto) {
      Alert.alert('Permission Denied', 'Capture disabled! Both Camera and GPS Location permissions must be LIVE.');
      return;
    }
    try {
      await uploadOdometerPhotoApi({
        bookingId: 'KC73744',
        type: 'START',
        odometerReading: 45210,
        lat: 12.9716,
        lng: 77.5946,
      });
      await startTripApi('KC73744', 45210, 12.9716, 77.5946);
      setStartOdometerCaptured(true);
      Alert.alert('📷 Photo Stamped', 'Start Odometer photo captured with Timestamp and GPS coordinates.');
    } catch (err: any) {
      Alert.alert('Upload Error', err.message || 'Failed to upload start odometer photo.');
    }
  };

  const handleCaptureEndOdometer = async () => {
    if (!canCapturePhoto) {
      Alert.alert('Permission Denied', 'Capture disabled! Both Camera and GPS Location permissions must be LIVE.');
      return;
    }
    if (!tollConfirmed) {
      Alert.alert('Toll Required', 'Please confirm toll fare (enter 0 if none) before completing the trip.');
      return;
    }
    try {
      await uploadOdometerPhotoApi({
        bookingId: 'KC73744',
        type: 'END',
        odometerReading: 45460,
        lat: 12.3375,
        lng: 75.8069,
      });
      await endTripApi({
        bookingId: 'KC73744',
        finalReading: 45460,
        tollAmount: Number(tollAmountInput) || 0,
        lat: 12.3375,
        lng: 75.8069,
      });
      setEndOdometerCaptured(true);
      setTripState('COMPLETED');
      Alert.alert('🎉 Trip Completed!', 'End Odometer photo stamped. Billing closed out for admin review.');
    } catch (err: any) {
      Alert.alert('Trip Completion Error', err.message || 'Failed to end trip.');
    }
  };

  // ─── 1. LOADING SCREEN WHILE CHECKING SESSION ───
  if (isCheckingAuth) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B1A" />
        <Text style={styles.loadingText}>Loading Kandy Cabs Driver Partner...</Text>
      </View>
    );
  }

  // ─── 2. SIGN IN SCREEN (SHOWN ON FIRST TIME & WHEN LOGGED OUT) ───
  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.authContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
        <ScrollView contentContainerStyle={styles.authScrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.authCard}>
            {/* Logo */}
            <View style={styles.authLogoWrapper}>
              <Image
                source={require('./assets/kandycabs-logo.png')}
                style={styles.authLogo}
                resizeMode="contain"
              />
            </View>

            {/* Title & Subtitle */}
            <Text style={styles.authTitle}>Sign In to Kandy Cabs</Text>
            <Text style={styles.authSubtitle}>
              Unified Portal — Driver partners & customers are automatically directed to their account.
            </Text>

            {/* Step 1: Mobile Number Input */}
            {!otpSent ? (
              <View style={styles.authForm}>
                <Text style={styles.inputLabel}>MOBILE NUMBER</Text>
                <View style={styles.phoneInputRow}>
                  <View style={styles.phonePrefixBox}>
                    <Text style={styles.phonePrefixText}>+91</Text>
                  </View>
                  <TextInput
                    style={styles.phoneInput}
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={loginPhone}
                    onChangeText={setLoginPhone}
                    placeholder="98765 43210"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                <TouchableOpacity
                  style={styles.primaryAuthBtn}
                  onPress={handleSendOtp}
                  disabled={isSubmitting}
                >
                  <Text style={styles.lockIcon}>🔒</Text>
                  <Text style={styles.primaryAuthBtnText}>
                    {isSubmitting ? 'SENDING OTP...' : 'SEND OTP →'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* Step 2: OTP Verification */
              <View style={styles.authForm}>
                <View style={styles.demoOtpBanner}>
                  <Text style={styles.demoOtpText}>
                    Demo Verification Code: <Text style={{ fontWeight: '900', color: '#FF6B1A' }}>1234</Text> (Sent to +91 {loginPhone})
                  </Text>
                </View>

                <Text style={styles.inputLabel}>ENTER 4-DIGIT OTP</Text>
                <TextInput
                  style={styles.otpCodeInput}
                  keyboardType="number-pad"
                  maxLength={4}
                  value={loginOtp}
                  onChangeText={setLoginOtp}
                  placeholder="1234"
                  placeholderTextColor="#CBD5E1"
                />

                <TouchableOpacity
                  style={styles.primaryAuthBtn}
                  onPress={handleVerifyOtp}
                  disabled={isSubmitting}
                >
                  <Text style={styles.lockIcon}>✓</Text>
                  <Text style={styles.primaryAuthBtnText}>
                    {isSubmitting ? 'VERIFYING...' : 'VERIFY & ACCESS PORTAL →'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.changeNumberBtn}
                  onPress={() => {
                    setOtpSent(false);
                    setLoginOtp('');
                  }}
                >
                  <Text style={styles.changeNumberText}>← Change Mobile Number</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Bottom Trust Banner */}
          <View style={styles.authFooterBanner}>
            <Text style={styles.authFooterText}>
              South India's most trusted outstation & local cab booking platform. Premium chauffeur-driven cabs with transparent pricing.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── 3. LOGGED-IN DRIVER DASHBOARD ───
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={KANDY_THEME.colors.ink} />

      {/* Driver Header with Logout Button */}
      <View style={styles.header}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>KC</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>KANDY CABS DRIVER</Text>
          <Text style={styles.headerSubtitle}>
            {driverUser?.fullName || 'Ramesh Kumar'} • {driverUser?.vehicleName || 'Swift Dzire (Sedan)'}
          </Text>
        </View>
        <View style={styles.headerRightControls}>
          <View style={styles.approvedBadge}>
            <Text style={styles.approvedText}>{driverUser?.status || 'APPROVED'}</Text>
          </View>
          <TouchableOpacity style={styles.logoutHeaderBtn} onPress={handleLogout}>
            <Text style={styles.logoutHeaderBtnText}>LOG OUT</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollContent}>
        {/* Availability Switch */}
        <View style={styles.onlineStatusCard}>
          <View>
            <Text style={styles.onlineStatusTitle}>DUTY STATUS</Text>
            <Text style={[styles.onlineStatusSub, { color: isDriverOnline ? '#059669' : '#DC2626' }]}>
              {isDriverOnline ? '🟢 ONLINE (Ready for Bookings)' : '🔴 OFFLINE'}
            </Text>
          </View>
          <Switch
            value={isDriverOnline}
            onValueChange={setIsDriverOnline}
            trackColor={{ false: '#CBD5E1', true: '#A7F3D0' }}
            thumbColor={isDriverOnline ? '#059669' : '#64748B'}
          />
        </View>

        {/* Permission Hardware Controls */}
        <View style={styles.permissionBox}>
          <Text style={styles.permissionTitle}>GPS & CAMERA GATED HARDWARE CHECK (§6)</Text>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Camera Permission Live:</Text>
            <Switch value={cameraPermissionGranted} onValueChange={setCameraPermissionGranted} />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>GPS Location Permission Live (§6a):</Text>
            <Switch value={locationPermissionGranted} onValueChange={setLocationPermissionGranted} />
          </View>

          {!locationPermissionGranted && (
            <View style={styles.alertWarning}>
              <Text style={styles.alertWarningText}>
                ⚠️ GPS Location Disabled! Live tracking lost alert triggered for admin view.
              </Text>
            </View>
          )}
        </View>

        {/* Live GPS Telemetry Indicator */}
        <View style={styles.telemetryCard}>
          <View style={styles.telemetryRow}>
            <View>
              <Text style={styles.telemetryLabel}>GPS TRACKING LOOP (§6a)</Text>
              <Text style={styles.telemetrySpeed}>{speedKmh} km/h</Text>
            </View>
            <View style={styles.pingBadge}>
              <Text style={styles.pingText}>
                {locationPermissionGranted ? '📡 PINGING (5s)' : '❌ TRACKING LOST'}
              </Text>
            </View>
          </View>
        </View>

        {/* Active Trip Execution Card */}
        <View style={styles.tripCard}>
          <View style={styles.tripHeader}>
            <Text style={styles.tripRef}>Trip Ref: KC73744</Text>
            <Text style={styles.tripType}>ONEWAY OUTSTATION</Text>
          </View>

          <Text style={styles.routeText}>📍 Pickup: Bangalore, KA</Text>
          <Text style={styles.routeText}>🏁 Drop: Coorg (Madikeri), KA</Text>

          {/* STEP 1: Pickup OTP Verification */}
          <View style={styles.stepBox}>
            <Text style={styles.stepTitle}>STEP 1: PICKUP ARRIVAL & OTP</Text>
            {!otpVerified ? (
              <>
                <Text style={styles.stepDesc}>Ask customer for 4-digit pickup OTP:</Text>
                <TextInput
                  style={styles.otpInput}
                  keyboardType="number-pad"
                  maxLength={4}
                  value={pickupOtpInput}
                  onChangeText={setPickupOtpInput}
                  placeholder="Enter OTP (e.g. 1234)"
                />
                <TouchableOpacity style={styles.actionButton} onPress={handleVerifyPickupOtp}>
                  <Text style={styles.actionButtonText}>VERIFY PICKUP OTP →</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.successText}>✓ Pickup OTP Verified (DRIVER_ARRIVED logged)</Text>
            )}
          </View>

          {/* STEP 2: GPS+Camera Gated Start Odometer */}
          <View style={styles.stepBox}>
            <Text style={styles.stepTitle}>STEP 2: START ODOMETER & CLEANLINESS PHOTO</Text>
            {!startOdometerCaptured ? (
              <TouchableOpacity
                style={[styles.actionButton, !canCapturePhoto && styles.disabledButton]}
                onPress={handleCaptureStartOdometer}
              >
                <Text style={styles.actionButtonText}>📷 CAPTURE STAMPED START ODOMETER</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.successText}>✓ Start Odometer Stamped with GPS & Timestamp</Text>
            )}
          </View>

          {/* STEP 3: Toll Fare Gating */}
          <View style={styles.stepBox}>
            <Text style={styles.stepTitle}>STEP 3: TOLL FARE ENTRY (BLOCKS TRIP END)</Text>
            {!tollConfirmed ? (
              <>
                <Text style={styles.stepDesc}>Enter total toll amount paid (₹0 if none):</Text>
                <TextInput
                  style={styles.otpInput}
                  keyboardType="number-pad"
                  value={tollAmountInput}
                  onChangeText={setTollAmountInput}
                  placeholder="0"
                />
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => {
                    setTollConfirmed(true);
                    Alert.alert('Toll Confirmed', `Toll fare ₹${tollAmountInput} recorded for billing close-out.`);
                  }}
                >
                  <Text style={styles.actionButtonText}>CONFIRM TOLL FARE (₹{tollAmountInput}) →</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.successText}>✓ Toll Fare Confirmed: ₹{tollAmountInput}</Text>
            )}
          </View>

          {/* STEP 4: End Odometer & Trip Completion */}
          <View style={styles.stepBox}>
            <Text style={styles.stepTitle}>STEP 4: END ODOMETER & COMPLETE TRIP</Text>
            {tripState !== 'COMPLETED' ? (
              <TouchableOpacity
                style={[styles.completeButton, (!canCapturePhoto || !tollConfirmed) && styles.disabledButton]}
                onPress={handleCaptureEndOdometer}
              >
                <Text style={styles.actionButtonText}>🏁 CAPTURE END ODOMETER & COMPLETE TRIP</Text>
              </TouchableOpacity>
            ) : (
              <Text style={[styles.successText, { color: KANDY_THEME.colors.primary }]}>
                🎉 TRIP COMPLETED & BILLED
              </Text>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },

  // ─── AUTH SCREEN STYLES (MATCHES SCREENSHOT) ───
  authContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  authScrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    padding: 16,
  },
  authCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  authLogoWrapper: {
    alignItems: 'center',
    marginBottom: 16,
  },
  authLogo: {
    width: 150,
    height: 48,
  },
  authTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  authSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  authForm: {
    width: '100%',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#334155',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    overflow: 'hidden',
    height: 52,
    marginBottom: 20,
  },
  phonePrefixBox: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  phonePrefixText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#334155',
  },
  phoneInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  primaryAuthBtn: {
    backgroundColor: '#FF6B1A',
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#FF6B1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  lockIcon: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  primaryAuthBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  demoOtpBanner: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
  },
  demoOtpText: {
    fontSize: 11.5,
    color: '#9A3412',
    textAlign: 'center',
    fontWeight: '600',
  },
  otpCodeInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: 16,
  },
  changeNumberBtn: {
    alignItems: 'center',
    marginTop: 14,
  },
  changeNumberText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },
  authFooterBanner: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 14,
    marginTop: 20,
    alignItems: 'center',
  },
  authFooterText: {
    color: '#94A3B8',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },

  // ─── LOGGED-IN DASHBOARD STYLES ───
  container: {
    flex: 1,
    backgroundColor: KANDY_THEME.colors.bg,
  },
  header: {
    backgroundColor: KANDY_THEME.colors.ink,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 34,
    height: 34,
    backgroundColor: KANDY_THEME.colors.primary,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 16,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '900',
  },
  headerSubtitle: {
    color: '#9CA3AF',
    fontSize: 11,
  },
  headerRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  approvedBadge: {
    backgroundColor: '#059669',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  approvedText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 9,
  },
  logoutHeaderBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  logoutHeaderBtnText: {
    color: '#F87171',
    fontWeight: '800',
    fontSize: 9,
  },
  scrollContent: {
    padding: 16,
  },
  onlineStatusCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: KANDY_THEME.colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  onlineStatusTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  onlineStatusSub: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  permissionBox: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: KANDY_THEME.colors.border,
    marginBottom: 14,
  },
  permissionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: KANDY_THEME.colors.primary,
    marginBottom: 10,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  switchLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: KANDY_THEME.colors.ink,
  },
  alertWarning: {
    backgroundColor: '#FEF2F2',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  alertWarningText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '700',
  },
  telemetryCard: {
    backgroundColor: KANDY_THEME.colors.ink,
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
  },
  telemetryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  telemetryLabel: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '800',
  },
  telemetrySpeed: {
    color: KANDY_THEME.colors.primary,
    fontSize: 22,
    fontWeight: '900',
  },
  pingBadge: {
    backgroundColor: '#064E3B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  pingText: {
    color: '#34D399',
    fontWeight: '800',
    fontSize: 10,
  },
  tripCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: KANDY_THEME.colors.border,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  tripRef: {
    fontSize: 16,
    fontWeight: '900',
    color: KANDY_THEME.colors.primary,
  },
  tripType: {
    fontSize: 10,
    fontWeight: '800',
    color: KANDY_THEME.colors.ink,
  },
  routeText: {
    fontSize: 13,
    fontWeight: '700',
    color: KANDY_THEME.colors.ink,
    marginVertical: 2,
  },
  stepBox: {
    backgroundColor: KANDY_THEME.colors.bg,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: KANDY_THEME.colors.border,
  },
  stepTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: KANDY_THEME.colors.ink,
    marginBottom: 6,
  },
  stepDesc: {
    fontSize: 11,
    color: KANDY_THEME.colors.textMuted,
    marginBottom: 6,
  },
  otpInput: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: KANDY_THEME.colors.border,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  actionButton: {
    backgroundColor: KANDY_THEME.colors.primary,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  completeButton: {
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  actionButtonText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 11,
  },
  successText: {
    color: '#059669',
    fontWeight: '800',
    fontSize: 12,
  },
});

