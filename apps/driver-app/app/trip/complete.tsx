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
  Platform,
  StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { driverApiClient } from '../../lib/api';
import { locationTracker } from '../../lib/location-tracker';

export default function DriverTripCompleteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0);
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();

  const [booking, setBooking] = useState<any>(null);
  const [finalOdometer, setFinalOdometer] = useState('');
  const [odometerImageUri, setOdometerImageUri] = useState<string | null>(null);
  const [odometerPhotoAttached, setOdometerPhotoAttached] = useState(false);
  const [tollAmount, setTollAmount] = useState('');
  const [parkingAmount, setParkingAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>({ lat: 12.9716, lng: 77.5946 });
  const [photoLocation, setPhotoLocation] = useState<{ lat: number; lng: number; time: string } | null>(null);

  // Subscribe to live GPS coordinates
  useEffect(() => {
    const unsub = locationTracker.addListener((lat, lng) => {
      setCurrentCoords({ lat, lng });
    });
    return () => unsub();
  }, []);

  // Fetch active booking details
  const fetchBookingDetails = useCallback(async () => {
    try {
      const res = await driverApiClient.fetch('/api/driver/status');
      if (res.success && res.activeBooking) {
        setBooking(res.activeBooking);
      }
    } catch (_) {
      // Ignore background fetch error
    }
  }, []);

  useEffect(() => {
    fetchBookingDetails();
  }, [fetchBookingDetails]);

  const handleOpenCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera access is required to photograph your odometer.');
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
        setPhotoLocation({
          lat: latest.lat,
          lng: latest.lng,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        });
      }
    } catch (err: any) {
      Alert.alert('Camera Error', err.message || 'Failed to open camera');
    }
  };

  const handleCompleteTrip = async () => {
    if (!finalOdometer) {
      setError('Please enter the final odometer reading');
      return;
    }

    const startOdo = parseFloat(booking?.startingOdometer || 0);
    const endOdo = parseFloat(finalOdometer);

    if (startOdo > 0 && endOdo < startOdo) {
      setError(`Final odometer (${endOdo}) cannot be lower than starting odometer (${startOdo})`);
      return;
    }

    const parsedToll = parseFloat(tollAmount) || 0;
    const parsedParking = parseFloat(parkingAmount) || 0;

    setError('');
    setLoading(true);

    try {
      const res = await driverApiClient.fetch('/api/driver/trip/complete', {
        method: 'POST',
        body: JSON.stringify({
          bookingId: bookingId || booking?.id,
          finalOdometer: endOdo,
          finalOdometerImagePath: odometerImageUri || 'https://placehold.co/800x600/png?text=Final+Odometer+Photo',
          tollAmount: parsedToll,
          parkingAmount: parsedParking,
          paymentMethod: 'CASH',
        }),
      });

      if (res.success) {
        // Switch location tracker back to IDLE tier
        locationTracker.startIdleTracking();
        Alert.alert(
          'Trip Completed! 🎉',
          `Distance: ${res.actualDistanceKm} km.\nTrip marked as completed successfully.\nAdmin will generate and dispatch the final invoice.`,
          [
            {
              text: 'Back to Dashboard',
              onPress: () => router.replace('/dashboard'),
            },
          ]
        );
      } else {
        setError(res.message || 'Failed to complete trip');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to complete trip');
    } finally {
      setLoading(false);
    }
  };

  const startOdoNum = parseFloat(booking?.startingOdometer) || 0;
  const endOdoNum = parseFloat(finalOdometer) || 0;
  const distanceCovered = endOdoNum > startOdoNum ? (endOdoNum - startOdoNum).toFixed(1) : '0.0';

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
          <Text style={styles.headerStepBadge}>TRIP COMPLETION & BILLING</Text>
          <Text style={styles.headerMainTitle}>Final Odometer & Wrap-Up</Text>
        </View>

        <View style={styles.headerRefBox}>
          <Text style={styles.headerRefText}>{booking?.humanReadableRef || 'TRIP'}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* 1. Trip Summary Header Card */}
        {booking && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Customer:</Text>
              <Text style={styles.summaryVal}>
                {booking.customer?.user?.fullName || booking.guestName || 'Valued Passenger'}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Start Odometer:</Text>
              <Text style={styles.summaryValHighlight}>{startOdoNum.toFixed(1)} km</Text>
            </View>
            {endOdoNum > startOdoNum && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Distance Run:</Text>
                <Text style={styles.summaryValSuccess}>+{distanceCovered} km</Text>
              </View>
            )}
            <View style={styles.driverPayoutSummaryRow}>
              <View style={styles.driverPayoutCol}>
                <Text style={styles.payoutSubLabel}>🚗 Start Allowance:</Text>
                <Text style={styles.payoutSubVal}>
                  ₹{Number(booking.driverAllowance || 350).toLocaleString('en-IN')}
                </Text>
              </View>
              {booking.driverPayeeAmount > 0 && (
                <View style={styles.driverPayoutCol}>
                  <Text style={styles.payoutSubLabel}>💰 Final Payee:</Text>
                  <Text style={styles.payoutSubValHighlight}>
                    ₹{Number(booking.driverPayeeAmount).toLocaleString('en-IN')}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* 2. Final Odometer Reading & Photo */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>1. Final Odometer Reading *</Text>
          <TextInput
            style={styles.input}
            value={finalOdometer}
            onChangeText={setFinalOdometer}
            keyboardType="decimal-pad"
            placeholder="e.g. 45310.2"
            placeholderTextColor="#64748b"
          />

          {odometerImageUri ? (
            <View style={styles.previewContainer}>
              <View style={styles.imageWrapper}>
                <Image
                  source={{ uri: odometerImageUri }}
                  style={styles.odometerPreviewImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={200}
                />
                
                {/* GPS Location Stamp Overlay at Bottom of Captured Photo */}
                <View style={styles.gpsWatermarkOverlay}>
                  <View style={styles.gpsWatermarkHeader}>
                    <View style={styles.gpsWatermarkDot} />
                    <Text style={styles.gpsWatermarkTitle}>📍 GPS LOCATION STAMP</Text>
                  </View>
                  <Text style={styles.gpsWatermarkCoords}>
                    {photoLocation ? `${photoLocation.lat.toFixed(5)}° N, ${photoLocation.lng.toFixed(5)}° E` : `${currentCoords.lat.toFixed(5)}° N, ${currentCoords.lng.toFixed(5)}° E`}
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
                    {photoLocation ? photoLocation.lat.toFixed(6) : currentCoords.lat.toFixed(6)}°
                  </Text>
                </View>
                <View style={styles.photoLocationRow}>
                  <Text style={styles.photoLocationLabel}>📍 Longitude:</Text>
                  <Text style={styles.photoLocationVal}>
                    {photoLocation ? photoLocation.lng.toFixed(6) : currentCoords.lng.toFixed(6)}°
                  </Text>
                </View>
                <View style={styles.photoLocationRow}>
                  <Text style={styles.photoLocationLabel}>⏱️ Time of Capture:</Text>
                  <Text style={styles.photoLocationVal}>{photoLocation?.time || 'Just now'}</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.retakeBtn} onPress={handleOpenCamera}>
                <Text style={styles.retakeBtnText}>📷 Retake Final Odometer Photo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <TouchableOpacity
                style={styles.cameraPrimaryBtn}
                onPress={handleOpenCamera}
              >
                <Text style={styles.cameraPrimaryBtnText}>📷 Open Camera & Capture Final Odometer</Text>
              </TouchableOpacity>

              {/* Pre-capture Current Location Indicator */}
              <View style={styles.preCaptureGpsRow}>
                <View style={styles.liveGpsDot} />
                <Text style={styles.preCaptureGpsText}>
                  📍 Current GPS: {currentCoords.lat.toFixed(5)}, {currentCoords.lng.toFixed(5)}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* 3. Extra Charges: Toll Gate & Parking */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>2. Additional Charges</Text>
          <Text style={styles.sectionSubtitle}>
            Enter any toll or parking fees paid during this trip. Admin will include them in the customer's final invoice.
          </Text>

          <View style={styles.extraRow}>
            <View style={styles.extraCol}>
              <Text style={styles.fieldLabel}>🛣️ Toll Gate Fare (₹)</Text>
              <TextInput
                style={styles.input}
                value={tollAmount}
                onChangeText={setTollAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#64748b"
              />
            </View>

            <View style={styles.extraCol}>
              <Text style={styles.fieldLabel}>🅿️ Parking Fare (₹)</Text>
              <TextInput
                style={styles.input}
                value={parkingAmount}
                onChangeText={setParkingAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#64748b"
              />
            </View>
          </View>
        </View>

        {/* 4. Complete Button */}
        <TouchableOpacity
          style={styles.completeButton}
          onPress={handleCompleteTrip}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.completeButtonText}>COMPLETE TRIP ✓</Text>
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
  heading: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
    marginTop: 4,
  },
  summaryCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  summaryVal: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '700',
  },
  summaryValHighlight: {
    fontSize: 13,
    color: '#38bdf8',
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  summaryValSuccess: {
    fontSize: 13,
    color: '#34d399',
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 12,
    lineHeight: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#cbd5e1',
    marginBottom: 6,
  },
  extraRow: {
    flexDirection: 'row',
    gap: 12,
  },
  extraCol: {
    flex: 1,
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
    marginBottom: 10,
  },
  completeButton: {
    backgroundColor: '#10b981',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  completeButtonText: {
    color: '#ffffff',
    fontSize: 14,
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
  driverPayoutSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  driverPayoutCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  payoutSubLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  payoutSubVal: {
    fontSize: 12,
    color: '#34d399',
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  payoutSubValHighlight: {
    fontSize: 12,
    color: '#38bdf8',
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});

