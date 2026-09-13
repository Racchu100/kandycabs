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
} from 'react-native';
import { KANDY_THEME } from '@kandycabs/shared';
import {
  driverLoginApi,
  fetchDriverDispatches,
  verifyPickupOtpApi,
  uploadOdometerPhotoApi,
  startTripApi,
  endTripApi,
  sendGpsPingApi,
  fetchDriverDocumentsApi,
} from './services/api';

export default function App() {
  const [driverPhone, setDriverPhone] = useState('8888888888');
  const [isLoggedIn, setIsLoggedIn] = useState(true);

  // Permission States for GPS + Camera Gating Enforcement
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState(true);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(true);

  // Active Trip State
  const [tripState, setTripState] = useState<'DISPATCH_PENDING' | 'ACCEPTED' | 'EN_ROUTE' | 'TRIP_STARTED' | 'COMPLETED'>('ACCEPTED');
  const [pickupOtpInput, setPickupOtpInput] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [startOdometerCaptured, setStartOdometerCaptured] = useState(false);
  const [endOdometerCaptured, setEndOdometerCaptured] = useState(false);
  const [tollAmountInput, setTollAmountInput] = useState('0');
  const [tollConfirmed, setTollConfirmed] = useState(false);

  // GPS Continuous Ping Loop State (§6a)
  const [speedKmh, setSpeedKmh] = useState(62);
  const [isPingActive, setIsPingActive] = useState(true);

  // Continuous background/foreground location ping loop simulation
  useEffect(() => {
    let pingTimer: NodeJS.Timeout;
    if (isLoggedIn && (tripState === 'EN_ROUTE' || tripState === 'TRIP_STARTED') && locationPermissionGranted) {
      pingTimer = setInterval(() => {
        const nextSpeed = Math.min(95, Math.max(45, Math.floor(Math.random() * 40) + 50));
        setSpeedKmh(nextSpeed);
        sendGpsPingApi('KC73744', 12.5218, 76.8951, nextSpeed);
        console.log(`[GPS PING LOOP] Sent ping to /api/driver/trips/KC73744/ping: 12.5218° N, 76.8951° E @ ${nextSpeed} km/h`);
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
      Alert.alert('📷 Photo Stamped', 'Start Odometer & Cleanliness photo captured with Timestamp: 2026-09-15 06:05 AM and GPS: 12.9716° N, 77.5946° E.');
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
      Alert.alert('Toll Gating Block', 'Cannot end trip while toll entries are unconfirmed! Please confirm toll fare (even if ₹0).');
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
      Alert.alert('🎉 Trip Completed!', 'End Odometer photo stamped with GPS & timestamp. Billing closed out for admin review.');
    } catch (err: any) {
      Alert.alert('Trip Completion Error', err.message || 'Failed to end trip.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={KANDY_THEME.colors.ink} />

      {/* Driver Header */}
      <View style={styles.header}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>KC</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>KANDY CABS DRIVER</Text>
          <Text style={styles.headerSubtitle}>Ramesh Kumar • Swift Dzire (Sedan)</Text>
        </View>
        <View style={styles.approvedBadge}>
          <Text style={styles.approvedText}>APPROVED</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollContent}>
        {/* Permission Hardware Controls (Testing GPS & Camera Gating) */}
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
  scrollContent: {
    padding: 16,
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
