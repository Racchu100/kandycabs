import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  StatusBar,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { locationTracker } from '../../lib/location-tracker';
import { driverApiClient } from '../../lib/api';
import { Ionicons } from '@expo/vector-icons';

export default function DriverTripStartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0);
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();

  const [booking, setBooking] = useState<any>(null);
  const [pickupOtp, setPickupOtp] = useState('');
  const [startingOdometer, setStartingOdometer] = useState('');
  const [odometerPhotoAttached, setOdometerPhotoAttached] = useState(false);
  const [loading, setLoading] = useState(false);
  const [overrideRequesting, setOverrideRequesting] = useState(false);
  const [overrideRequested, setOverrideRequested] = useState(false);
  const [isAdminAuthorized, setIsAdminAuthorized] = useState(false);
  const [error, setError] = useState('');
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [photoLocation, setPhotoLocation] = useState<{ lat: number; lng: number; time: string } | null>(null);

  // Subscribe to live GPS coordinates
  useEffect(() => {
    const unsub = locationTracker.addListener((lat, lng) => {
      if (lat != null && lng != null) {
        setCurrentCoords({ lat, lng });
      }
    });
    return () => unsub();
  }, []);

  const checkStatus = useCallback(async () => {
    try {
      const res = await driverApiClient.fetch('/api/driver/status');
      if (res.success && res.activeBooking) {
        setBooking(res.activeBooking);
        if (res.activeBooking.status === 'TRIP_STARTED') {
          setIsAdminAuthorized(true);
        }
      }
    } catch (_) {
      // Ignore polling errors
    }
  }, []);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  const [odometerImageUri, setOdometerImageUri] = useState<string | null>(null);

  const handleOpenCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is required to capture odometer photo.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.3,
        base64: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const dataUri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        setOdometerImageUri(dataUri);
        setOdometerPhotoAttached(true);
        // Lock location at the exact moment of photo capture
        const latest = locationTracker.getCurrentCoordinates();
        if (latest.lat != null && latest.lng != null) {
          setPhotoLocation({
            lat: latest.lat,
            lng: latest.lng,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          });
        }
      }
    } catch (err: any) {
      Alert.alert('Camera Error', err.message || 'Failed to open camera');
    }
  };

  const handleStartTrip = async () => {
    if (!isAdminAuthorized && pickupOtp.length < 4) {
      setError('Please enter the 4-digit pickup OTP from the customer');
      return;
    }
    if (!startingOdometer) {
      setError('Please enter the starting odometer reading');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await driverApiClient.fetch('/api/driver/trip/start', {
        method: 'POST',
        body: JSON.stringify({
          bookingId,
          pickupOtp: isAdminAuthorized ? 'OVERRIDE' : pickupOtp,
          startingOdometer: parseFloat(startingOdometer),
          startingOdometerImagePath: odometerImageUri || 'https://placehold.co/800x600/png?text=Start+Odometer+Photo',
        }),
      });

      if (res.success) {
        router.replace({
          pathname: '/trip/active',
          params: { bookingId },
        });
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to verify OTP and start trip');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAdminOverride = async () => {
    setOverrideRequesting(true);
    try {
      const res = await driverApiClient.fetch('/api/driver/trip/request-override', {
        method: 'POST',
        body: JSON.stringify({
          bookingId,
          note: 'Customer phone is unreachable / dead battery. Verbal ID checked.',
        }),
      });

      setOverrideRequested(true);
      Alert.alert(
        'Override Requested',
        'Admin dispatch has been notified to manually authorize trip start. Once approved, you can start the trip immediately.'
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to request override');
    } finally {
      setOverrideRequesting(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" translucent={true} />

      {/* Top Header Bar */}
      <View style={[styles.topHeaderBar, { paddingTop: topInset + 6 }]}>
        <TouchableOpacity
          style={styles.headerBackBtn}
          onPress={() => router.replace('/dashboard')}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color="#ffffff" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerStepBadge}>STEP 2 OF 3 • START VERIFICATION</Text>
          <Text style={styles.headerMainTitle}>Verify OTP & Odometer</Text>
        </View>

        <View style={styles.headerRefBox}>
          <Text style={styles.headerRefText}>{booking?.humanReadableRef || 'TRIP'}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Passenger Information Card */}
        {booking && (
          <View style={styles.passengerCard}>
            <View style={styles.passengerHeaderRow}>
              <Text style={styles.passengerTitle}>PASSENGER DETAILS</Text>
              {booking.customerPhoneReleased ? (
                <View style={styles.releasedBadge}>
                  <Text style={styles.releasedBadgeText}>🔓 Phone Released</Text>
                </View>
              ) : (
                <View style={styles.lockedBadge}>
                  <Text style={styles.lockedBadgeText}>🔒 Phone Protected</Text>
                </View>
              )}
            </View>

            <Text style={styles.passengerName}>
              👤 {booking.customer?.user?.fullName || 'Customer'}
            </Text>

            {booking.customerPhoneReleased && booking.customer?.user?.phone ? (
              <TouchableOpacity
                style={styles.callButton}
                onPress={() => Linking.openURL(`tel:${booking.customer.user.phone}`)}
              >
                <Text style={styles.callButtonText}>📞 Call Customer ({booking.customer.user.phone})</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.phoneProtectedText}>
                🔒 Customer phone locked by admin policy.
              </Text>
            )}
          </View>
        )}

        {/* Driver Allowance Card */}
        {booking && (
          <View style={styles.allowanceCard}>
            <View style={styles.allowanceHeaderRow}>
              <View style={styles.allowanceLeft}>
                <Text style={styles.allowanceEmoji}>🚗</Text>
                <View>
                  <Text style={styles.allowanceTitle}>DRIVER TRIP ALLOWANCE</Text>
                  <Text style={styles.allowanceSubtitle}>Paid by admin for this ride</Text>
                </View>
              </View>
              <Text style={styles.allowanceAmount}>
                ₹{Number(booking.driverAllowance || 350).toLocaleString('en-IN')}
              </Text>
            </View>
          </View>
        )}

        {/* Admin Authorization Notice */}
        {isAdminAuthorized ? (
          <View style={styles.authorizedBox}>
            <Text style={styles.authorizedTitle}>✅ Admin Authorized Trip Start</Text>
            <Text style={styles.authorizedSubtitle}>
              Admin dispatch has authorized this ride. Customer OTP is waived. Enter starting odometer and start trip.
            </Text>
          </View>
        ) : (
          /* 1. Customer OTP Entry */
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>1. Customer Pickup OTP *</Text>
            <Text style={styles.hint}>
              Ask the customer for their 4-digit start OTP shown on their booking screen:
            </Text>
            <TextInput
              style={styles.otpInput}
              value={pickupOtp}
              onChangeText={setPickupOtp}
              keyboardType="number-pad"
              maxLength={4}
              placeholder="••••"
              placeholderTextColor="#64748b"
            />

            <TouchableOpacity
              style={styles.overrideLink}
              onPress={handleRequestAdminOverride}
              disabled={overrideRequesting}
            >
              <Text style={styles.overrideLinkText}>
                {overrideRequesting
                  ? 'Requesting...'
                  : overrideRequested
                  ? '⏳ Override Requested — Waiting for Admin Approval'
                  : '⚠️ Customer Phone Unreachable? Request Admin Override'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 2. Starting Odometer Reading & Camera Photo */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>2. Starting Odometer Reading *</Text>
          <TextInput
            style={styles.input}
            value={startingOdometer}
            onChangeText={setStartingOdometer}
            keyboardType="decimal-pad"
            placeholder="e.g. 45210.5"
            placeholderTextColor="#64748b"
          />

          {odometerImageUri ? (
            <View style={styles.previewContainer}>
              <View style={styles.imageWrapper}>
                <Image
                  source={{ uri: odometerImageUri }}
                  style={styles.odometerPreviewImage}
                  resizeMode="cover"
                />
                
                {/* GPS Location Stamp Overlay at Bottom of Captured Photo */}
                <View style={styles.gpsWatermarkOverlay}>
                  <View style={styles.gpsWatermarkHeader}>
                    <View style={styles.gpsWatermarkDot} />
                    <Text style={styles.gpsWatermarkTitle}>📍 GPS LOCATION STAMP</Text>
                  </View>
                  <Text style={styles.gpsWatermarkCoords}>
                    {photoLocation
                      ? `${photoLocation.lat.toFixed(5)}° N, ${photoLocation.lng.toFixed(5)}° E`
                      : currentCoords
                      ? `${currentCoords.lat.toFixed(5)}° N, ${currentCoords.lng.toFixed(5)}° E`
                      : 'Acquiring GPS...'}
                  </Text>
                  <Text style={styles.gpsWatermarkTime}>
                    ⏱️ Captured: {photoLocation?.time || 'Just now'} • Verified Odometer Evidence
                  </Text>
                </View>
              </View>

              {/* Location Details Card at Bottom of Photo */}
              <View style={styles.photoLocationCard}>
                <View style={styles.photoLocationRow}>
                  <Text style={styles.photoLocationLabel}>📍 Latitude:</Text>
                  <Text style={styles.photoLocationVal}>
                    {photoLocation ? `${photoLocation.lat.toFixed(6)}°` : currentCoords ? `${currentCoords.lat.toFixed(6)}°` : 'Acquiring...'}
                  </Text>
                </View>
                <View style={styles.photoLocationRow}>
                  <Text style={styles.photoLocationLabel}>📍 Longitude:</Text>
                  <Text style={styles.photoLocationVal}>
                    {photoLocation ? `${photoLocation.lng.toFixed(6)}°` : currentCoords ? `${currentCoords.lng.toFixed(6)}°` : 'Acquiring...'}
                  </Text>
                </View>
                <View style={styles.photoLocationRow}>
                  <Text style={styles.photoLocationLabel}>⏱️ Time of Capture:</Text>
                  <Text style={styles.photoLocationVal}>{photoLocation?.time || 'Just now'}</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.retakeBtn} onPress={handleOpenCamera}>
                <Text style={styles.retakeBtnText}>📷 Retake Camera Photo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <TouchableOpacity
                style={styles.cameraPrimaryBtn}
                onPress={handleOpenCamera}
              >
                <Text style={styles.cameraPrimaryBtnText}>📷 Open Camera & Capture Odometer</Text>
              </TouchableOpacity>

              {/* Pre-capture Current Location Indicator */}
              <View style={styles.preCaptureGpsRow}>
                <View style={[styles.liveGpsDot, !currentCoords && { backgroundColor: '#f59e0b' }]} />
                <Text style={styles.preCaptureGpsText}>
                  {currentCoords
                    ? `📍 Current GPS: ${currentCoords.lat.toFixed(5)}, ${currentCoords.lng.toFixed(5)}`
                    : '⏳ Acquiring GPS position...'}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={styles.startButton}
          onPress={handleStartTrip}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.startButtonText}>VERIFY & START TRIP 🚀</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  topHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e293b',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 10,
  },
  headerStepBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#f59e0b',
    letterSpacing: 0.8,
  },
  headerMainTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#ffffff',
    marginTop: 2,
  },
  headerRefBox: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  headerRefText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#38bdf8',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  scroll: {
    padding: 20,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 6,
  },
  hint: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 12,
  },
  otpInput: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f59e0b',
    paddingVertical: 14,
    fontSize: 26,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: 12,
  },
  overrideLink: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  overrideLinkText: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#475569',
    padding: 12,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  photoButton: {
    backgroundColor: '#334155',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#475569',
  },
  photoAttached: {
    backgroundColor: '#065f46',
    borderColor: '#10b981',
  },
  photoButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  startButton: {
    backgroundColor: '#10b981',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  errorText: {
    color: '#f87171',
    backgroundColor: '#450a0a',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 12,
  },
  authorizedBox: {
    backgroundColor: '#064e3b',
    borderWidth: 1.5,
    borderColor: '#10b981',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  authorizedTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#34d399',
    marginBottom: 4,
  },
  authorizedSubtitle: {
    fontSize: 11,
    color: '#d1fae5',
    lineHeight: 16,
  },
  passengerCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  passengerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  passengerTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  passengerName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#ffffff',
    marginTop: 2,
    marginBottom: 6,
  },
  releasedBadge: {
    backgroundColor: '#064e3b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  releasedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#34d399',
  },
  lockedBadge: {
    backgroundColor: '#1e1b4b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#4338ca',
  },
  lockedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
  },
  callButton: {
    backgroundColor: '#10b981',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  callButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  phoneProtectedText: {
    fontSize: 11,
    color: '#64748b',
    fontStyle: 'italic',
  },
  previewContainer: {
    alignItems: 'center',
    marginVertical: 6,
    width: '100%',
  },
  imageWrapper: {
    width: '100%',
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#10b981',
  },
  odometerPreviewImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#000000',
  },
  gpsWatermarkOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(16, 185, 129, 0.4)',
  },
  gpsWatermarkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  gpsWatermarkDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  gpsWatermarkTitle: {
    fontSize: 9,
    fontWeight: '900',
    color: '#10b981',
    letterSpacing: 0.5,
  },
  gpsWatermarkCoords: {
    fontSize: 12,
    fontWeight: '900',
    color: '#ffffff',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  gpsWatermarkTime: {
    fontSize: 9,
    color: '#94a3b8',
    marginTop: 1,
  },
  photoLocationCard: {
    width: '100%',
    backgroundColor: '#0f172a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 10,
    marginTop: 8,
    gap: 4,
  },
  photoLocationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  photoLocationLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  photoLocationVal: {
    fontSize: 11,
    color: '#34d399',
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  preCaptureGpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  liveGpsDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10b981',
  },
  preCaptureGpsText: {
    fontSize: 11,
    color: '#94a3b8',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  cameraPrimaryBtn: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  cameraPrimaryBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  retakeBtn: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#334155',
    borderWidth: 1,
    borderColor: '#475569',
  },
  retakeBtnText: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '700',
  },
  allowanceCard: {
    backgroundColor: '#064e3b',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#059669',
    marginBottom: 16,
  },
  allowanceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  allowanceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  allowanceEmoji: {
    fontSize: 22,
  },
  allowanceTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#34d399',
    letterSpacing: 0.5,
  },
  allowanceSubtitle: {
    fontSize: 11,
    color: '#a7f3d0',
    marginTop: 2,
  },
  allowanceAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});
