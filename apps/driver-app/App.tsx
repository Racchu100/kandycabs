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
import * as SecureStore from 'expo-secure-store';
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

const SESSION_STORAGE_KEY = 'kandy_driver_session';

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
        const savedSession = await SecureStore.getItemAsync(SESSION_STORAGE_KEY);
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
      Alert.alert('Driver Access', err.message || 'Driver number is not registered');
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
        // Save session permanently to SecureStore
        await SecureStore.setItemAsync(
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
      Alert.alert('Driver Access', err.message || 'Driver number is not registered');
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
              await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
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
              Sign in with your driver-partner number to go online
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
      <StatusBar barStyle="light-content" backgroundColor="#0B132B" />

      {/* Driver Header with Logout Button */}
      <View style={styles.header}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>KC</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.headerTitle}>KANDY CABS DRIVER</Text>
          <Text style={styles.headerSubtitle}>
            {driverUser?.fullName || 'Ranju'} - {driverUser?.vehicleName || 'Swift Dzire (Sedan)'}
          </Text>
        </View>
        <View style={styles.headerRightControls}>
          <View style={styles.approvedBadge}>
            <Text style={styles.approvedCheck}>✔</Text>
            <Text style={styles.approvedText}>APPROVED</Text>
          </View>
          <TouchableOpacity style={styles.logoutHeaderBtn} onPress={handleLogout}>
            <Text style={styles.logoutHeaderBtnIcon}>[→</Text>
            <Text style={styles.logoutHeaderBtnText}>LOG OUT</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner}>
        {/* GPS Location Permission Live Card */}
        <View style={styles.gpsPermCard}>
          <View style={styles.gpsPermIconBox}>
            <Text style={styles.gpsPermIcon}>📍</Text>
          </View>
          <View style={{ flex: 1, marginHorizontal: 10 }}>
            <Text style={styles.gpsPermTitle}>GPS Location Permission Live (§6a):</Text>
            <Text style={styles.gpsPermSub}>Your location is being tracked for better service.</Text>
          </View>
          <Switch
            value={locationPermissionGranted}
            onValueChange={setLocationPermissionGranted}
            trackColor={{ false: '#CBD5E1', true: '#10B981' }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Live GPS Telemetry Indicator */}
        <View style={styles.telemetryCard}>
          <View style={styles.telemetryLeft}>
            <Text style={styles.speedometerIcon}>⏲️</Text>
            <View>
              <Text style={styles.telemetryLabel}>GPS TRACKING LOOP (§6a)</Text>
              <Text style={styles.telemetrySpeed}>{speedKmh} <Text style={styles.speedUnit}>km/h</Text></Text>
            </View>
          </View>
          <View style={styles.pingBadge}>
            <Text style={styles.pingIcon}>📡</Text>
            <Text style={styles.pingText}>
              {locationPermissionGranted ? 'PINGING (5s)' : 'LOST'}
            </Text>
            <Text style={styles.pingChevron}>›</Text>
          </View>
        </View>

        {/* Active Trip Execution Card */}
        <View style={styles.tripCard}>
          <View style={styles.tripHeader}>
            <View style={styles.tripRefRow}>
              <Text style={styles.carIcon}>🚖</Text>
              <Text style={styles.tripRefLabel}>Trip Ref: </Text>
              <Text style={styles.tripRefVal}>KC73744</Text>
            </View>
            <View style={styles.tripTypeBadge}>
              <Text style={styles.tripTypeText}>ONEWAY OUTSTATION</Text>
            </View>
          </View>

          {/* Route Info */}
          <View style={styles.routeContainer}>
            <View style={styles.routeTextCol}>
              <View style={styles.routeRow}>
                <Text style={styles.pickupPin}>📍</Text>
                <Text style={styles.routeLabel}>Pickup: </Text>
                <Text style={styles.routeCity}>Bangalore, KA</Text>
              </View>
              <View style={styles.routeDottedLine} />
              <View style={styles.routeRow}>
                <Text style={styles.dropPin}>🏁</Text>
                <Text style={styles.routeLabel}>Drop: </Text>
                <Text style={styles.routeCity}>Coorg (Madikeri), KA</Text>
              </View>
            </View>
            <View style={styles.mountainGraphic}>
              <Text style={styles.mountainIcon}>⛰️ 🌲</Text>
            </View>
          </View>

          {/* STEP 1: Pickup OTP Verification */}
          <View style={styles.stepBox1}>
            <View style={styles.stepTitleRow}>
              <View style={styles.stepCircle1}>
                <Text style={styles.stepNum}>1</Text>
              </View>
              <Text style={styles.stepTitle1}>STEP 1: PICKUP ARRIVAL & OTP</Text>
            </View>
            {!otpVerified ? (
              <>
                <Text style={styles.stepDesc}>Ask customer for 4-digit pickup OTP:</Text>
                <View style={styles.otpInputBox}>
                  <Text style={styles.shieldIcon}>🛡️</Text>
                  <TextInput
                    style={styles.otpInput}
                    keyboardType="number-pad"
                    maxLength={4}
                    value={pickupOtpInput}
                    onChangeText={setPickupOtpInput}
                    placeholder="Enter OTP (e.g. 1234)"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
                <TouchableOpacity style={styles.actionButton1} onPress={handleVerifyPickupOtp}>
                  <Text style={styles.actionButtonText}>VERIFY PICKUP OTP →</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.stepCompletedBox}>
                <Text style={styles.successText1}>✓ Pickup OTP Verified (DRIVER_ARRIVED logged)</Text>
              </View>
            )}
          </View>

          {/* STEP 2: GPS+Camera Gated Start Odometer */}
          <View style={styles.stepBox2}>
            <View style={styles.stepTitleRow}>
              <View style={styles.stepCircle2}>
                <Text style={styles.stepNum}>2</Text>
              </View>
              <Text style={styles.stepTitle2}>STEP 2: START ODOMETER & CLEANLINESS PHOTO</Text>
            </View>
            {!startOdometerCaptured ? (
              <TouchableOpacity
                style={[styles.actionButton2, !canCapturePhoto && styles.disabledButton]}
                onPress={handleCaptureStartOdometer}
              >
                <Text style={styles.camIconGreen}>📷</Text>
                <Text style={styles.actionButtonText2}>CAPTURE STAMPED START ODOMETER</Text>
                <Text style={styles.chevronGreen}>›</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.stepCompletedBox}>
                <Text style={styles.successText2}>✓ Start Odometer Stamped with GPS & Timestamp</Text>
              </View>
            )}
          </View>

          {/* STEP 3: Toll Fare Gating */}
          <View style={styles.stepBox3}>
            <View style={styles.stepTitleRow}>
              <View style={styles.stepCircle3}>
                <Text style={styles.stepNum}>3</Text>
              </View>
              <Text style={styles.stepTitle3}>STEP 3: TOLL FARE ENTRY (BLOCKS TRIP END)</Text>
            </View>
            {!tollConfirmed ? (
              <>
                <Text style={styles.stepDesc}>Enter total toll amount paid (₹0 if none):</Text>
                <View style={styles.tollInputBox}>
                  <Text style={styles.rupeePrefix}>₹</Text>
                  <TextInput
                    style={styles.tollInput}
                    keyboardType="number-pad"
                    value={tollAmountInput}
                    onChangeText={setTollAmountInput}
                    placeholder="0"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
                <TouchableOpacity
                  style={styles.actionButton3}
                  onPress={() => {
                    setTollConfirmed(true);
                    Alert.alert('Toll Confirmed', `Toll fare ₹${tollAmountInput} recorded for billing close-out.`);
                  }}
                >
                  <Text style={styles.actionButtonText}>CONFIRM TOLL FARE (₹{tollAmountInput || '0'}) →</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.stepCompletedBox}>
                <Text style={styles.successText3}>✓ Toll Fare Confirmed: ₹{tollAmountInput}</Text>
              </View>
            )}
          </View>

          {/* STEP 4: End Odometer & Trip Completion */}
          <View style={styles.stepBox4}>
            <View style={styles.stepTitleRow}>
              <View style={styles.stepCircle4}>
                <Text style={styles.stepNum}>4</Text>
              </View>
              <Text style={styles.stepTitle4}>STEP 4: END ODOMETER & COMPLETE TRIP</Text>
            </View>
            {tripState !== 'COMPLETED' ? (
              <TouchableOpacity
                style={[styles.actionButton4, (!canCapturePhoto || !tollConfirmed) && styles.disabledButton]}
                onPress={handleCaptureEndOdometer}
              >
                <Text style={styles.camIconWhite}>📷</Text>
                <Text style={styles.actionButtonText4}>CAPTURE END ODOMETER & COMPLETE TRIP</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.stepCompletedBox}>
                <Text style={styles.successText4}>🎉 TRIP COMPLETED & BILLED</Text>
              </View>
            )}
          </View>
        </View>

        {/* Footer Accent */}
        <View style={styles.bottomFooter}>
          <Text style={styles.driveSafeText}>—— Drive Safe ——</Text>
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
    justifyContent: 'center',
    padding: 20,
  },
  authCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
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
    paddingHorizontal: 16,
    paddingTop: 24,
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
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#0B132B',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBadge: {
    width: 38,
    height: 38,
    backgroundColor: '#FF6B1A',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 18,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  headerRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  approvedBadge: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
    gap: 3,
  },
  approvedCheck: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  approvedText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 9,
    letterSpacing: 0.5,
  },
  logoutHeaderBtn: {
    borderWidth: 1,
    borderColor: '#EF4444',
    backgroundColor: 'transparent',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  logoutHeaderBtnIcon: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '900',
  },
  logoutHeaderBtnText: {
    color: '#EF4444',
    fontWeight: '800',
    fontSize: 9,
    letterSpacing: 0.5,
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    padding: 14,
    gap: 12,
    paddingBottom: 24,
  },
  gpsPermCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  gpsPermIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0D9488',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gpsPermIcon: {
    fontSize: 14,
  },
  gpsPermTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E293B',
  },
  gpsPermSub: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 2,
  },
  telemetryCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  telemetryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  speedometerIcon: {
    fontSize: 24,
  },
  telemetryLabel: {
    color: '#94A3B8',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  telemetrySpeed: {
    color: '#F59E0B',
    fontSize: 24,
    fontWeight: '900',
  },
  speedUnit: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F59E0B',
  },
  pingBadge: {
    backgroundColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pingIcon: {
    fontSize: 11,
  },
  pingText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  pingChevron: {
    color: '#A7F3D0',
    fontWeight: '900',
    fontSize: 14,
  },
  tripCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tripRefRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  carIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  tripRefLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FF6B1A',
  },
  tripRefVal: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FF6B1A',
  },
  tripTypeBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tripTypeText: {
    color: '#92400E',
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  routeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 14,
  },
  routeTextCol: {
    flex: 1,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickupPin: {
    fontSize: 12,
    marginRight: 6,
  },
  dropPin: {
    fontSize: 12,
    marginRight: 6,
  },
  routeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  routeCity: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  routeDottedLine: {
    width: 2,
    height: 10,
    marginLeft: 5,
    borderLeftWidth: 1.5,
    borderLeftColor: '#CBD5E1',
    borderStyle: 'dotted',
    marginVertical: 2,
  },
  mountainGraphic: {
    opacity: 0.6,
    paddingRight: 4,
  },
  mountainIcon: {
    fontSize: 24,
  },
  stepBox1: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  stepBox2: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  stepBox3: {
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  stepBox4: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 16,
    padding: 14,
  },
  stepTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepCircle1: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  stepCircle2: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  stepCircle3: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  stepCircle4: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EA580C',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  stepNum: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  stepTitle1: {
    color: '#1E3A8A',
    fontSize: 11.5,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  stepTitle2: {
    color: '#065F46',
    fontSize: 11.5,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  stepTitle3: {
    color: '#4C1D95',
    fontSize: 11.5,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  stepTitle4: {
    color: '#9A3412',
    fontSize: 11.5,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  stepDesc: {
    fontSize: 11,
    color: '#475569',
    marginBottom: 8,
  },
  otpInputBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#93C5FD',
    borderRadius: 12,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  shieldIcon: {
    fontSize: 15,
    marginRight: 8,
  },
  otpInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  actionButton1: {
    backgroundColor: '#FF6B1A',
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B1A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  actionButton2: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    height: 44,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    gap: 8,
  },
  camIconGreen: {
    fontSize: 15,
  },
  actionButtonText2: {
    color: '#065F46',
    fontSize: 11.5,
    fontWeight: '900',
    letterSpacing: 0.3,
    flex: 1,
    textAlign: 'center',
  },
  chevronGreen: {
    color: '#059669',
    fontSize: 18,
    fontWeight: '900',
  },
  tollInputBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#C4B5FD',
    borderRadius: 12,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  rupeePrefix: {
    fontSize: 16,
    fontWeight: '900',
    color: '#6B7280',
    marginRight: 8,
  },
  tollInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  actionButton3: {
    backgroundColor: '#6366F1',
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  actionButton4: {
    backgroundColor: '#64748B',
    height: 46,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  camIconWhite: {
    fontSize: 15,
  },
  actionButtonText4: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  disabledButton: {
    opacity: 0.6,
  },
  stepCompletedBox: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
  },
  successText1: {
    color: '#2563EB',
    fontWeight: '800',
    fontSize: 11.5,
  },
  successText2: {
    color: '#059669',
    fontWeight: '800',
    fontSize: 11.5,
  },
  successText3: {
    color: '#7C3AED',
    fontWeight: '800',
    fontSize: 11.5,
  },
  successText4: {
    color: '#EA580C',
    fontWeight: '800',
    fontSize: 12,
  },
  bottomFooter: {
    alignItems: 'center',
    marginTop: 10,
    paddingBottom: 10,
  },
  driveSafeText: {
    color: '#64748B',
    fontSize: 12,
    fontStyle: 'italic',
    fontWeight: '600',
  },
});

