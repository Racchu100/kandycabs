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
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { locationTracker } from '../../lib/location-tracker';
import { reverseGeocodeAddress } from '../../lib/reverse-geocoding';
import { driverApiClient } from '../../lib/api';
import { Ionicons } from '@expo/vector-icons';
import { setTripInProcess } from '../../lib/tripState';

const ODOMETER_SAMPLE = require('../../assets/images/inspection/odometer_sample.jpg');

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
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [photoLocation, setPhotoLocation] = useState<{ lat: number; lng: number; time: string } | null>(null);
  const [ocrScanning, setOcrScanning] = useState(false);
  const [ocrResultText, setOcrResultText] = useState<{ status: 'success' | 'failed' | 'idle'; reading?: number; message?: string }>({ status: 'idle' });

  // Subscribe to live GPS coordinates
  useEffect(() => {
    const unsub = locationTracker.addListener((lat, lng) => {
      if (lat != null && lng != null) {
        setCurrentCoords({ lat, lng });
      }
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


  const runOdometerOcr = async (uriOrBase64: string) => {
    setOcrScanning(true);
    setOcrResultText({ status: 'idle' });
    try {
      const res = await driverApiClient.fetch('/api/driver/odometer/ocr', {
        method: 'POST',
        body: JSON.stringify({ imageBase64: uriOrBase64 }),
      });
      if (res && res.success && res.reading) {
        setFinalOdometer(String(res.reading));
        setOcrResultText({
          status: 'success',
          reading: res.reading,
          message: `Auto-detected ${res.reading} KM from odometer photo`,
        });
      } else {
        setOcrResultText({
          status: 'failed',
          message: 'Could not auto-read gauge numbers. Please check and type reading manually.',
        });
      }
    } catch (err: any) {
      console.warn('Odometer OCR error:', err);
      setOcrResultText({
        status: 'failed',
        message: 'Could not auto-read. Please enter reading manually.',
      });
    } finally {
      setOcrScanning(false);
    }
  };

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
        runOdometerOcr(dataUri);
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

  const handleCompleteTrip = async () => {
    if (!finalOdometer) {
      setError('Please enter the final odometer reading');
      return;
    }
    if (!odometerImageUri) {
      setError('Final odometer photo is mandatory. Please capture photo of the odometer.');
      Alert.alert(
        'Final Odometer Photo Required',
        'You must capture a clear photo of the final vehicle odometer before completing the trip.',
        [
          { text: '📷 Capture Final Odometer Photo', onPress: handleOpenCamera },
          { text: 'OK' },
        ]
      );
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
      // Capture exact driver GPS location at completion moment
      const latestCoords = locationTracker.getCurrentCoordinates();
      const actualLat = latestCoords.lat ?? currentCoords?.lat ?? photoLocation?.lat ?? booking?.dropLat;
      const actualLng = latestCoords.lng ?? currentCoords?.lng ?? photoLocation?.lng ?? booking?.dropLng;
      const actualAddress = await reverseGeocodeAddress(
        actualLat,
        actualLng,
        booking?.dropAddress
      );

      const res = await driverApiClient.fetch('/api/driver/trip/complete', {
        method: 'POST',
        body: JSON.stringify({
          bookingId: bookingId || booking?.id,
          finalOdometer: endOdo,
          finalOdometerImagePath: odometerImageUri,
          tollAmount: parsedToll,
          parkingAmount: parsedParking,
          paymentMethod: 'CASH',
          actualDropLat: actualLat,
          actualDropLng: actualLng,
          actualDropAddress: actualAddress,
        }),
      });

      if (res.success) {
        // Send final tracking point and stop active background tracking
        if (bookingId || booking?.id) {
          await setTripInProcess(bookingId || booking?.id, false);
        }
        await locationTracker.sendFinalTrackingPoint(bookingId || booking?.id);
        await locationTracker.stopTracking();
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
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={false} />

      {/* Top Header Bar */}
      <View style={[styles.topHeaderBar, { paddingTop: topInset + 6 }]}>
        <View style={styles.headerLeftGroup}>
          <TouchableOpacity
            style={styles.headerBackBtn}
            onPress={() => router.replace('/dashboard')}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={20} color="#0f172a" />
          </TouchableOpacity>

          <View style={styles.headerDividerV} />

          <View style={styles.headerTextCol}>
            <View style={styles.headerStepBadgeRow}>
              <View style={styles.headerLiveDot} />
              <Text style={styles.headerLiveRadarText}>TRIP ACTIVE</Text>
            </View>
            <Text style={styles.headerMainTitle}>Final Odometer Reading</Text>
            <Text style={styles.headerSubtitleText}>Enter the final reading after the trip ends</Text>
          </View>
        </View>

        <View style={styles.headerRefCapsule}>
          <Ionicons name="car" size={15} color="#2563eb" />
          <Text style={styles.headerRefText}>{booking?.humanReadableRef || 'TRIP'}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={18} color="#f87171" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* 1. Final Odometer Reading Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.speedometerIconCircle}>
              <Ionicons name="speedometer" size={24} color="#1d63ed" />
            </View>
            <View style={styles.cardHeaderTextCol}>
              <View style={styles.sectionTitleRow}>
                <View style={styles.stepCircleBlue}>
                  <Text style={styles.stepCircleText}>1</Text>
                </View>
                <Text style={styles.sectionTitle}>
                  Final Odometer Reading <Text style={styles.redAsterisk}>*</Text>
                </Text>
              </View>
              <Text style={styles.sectionSubtitle}>Enter the final reading from the odometer</Text>
            </View>
          </View>

          {/* Odometer Numerical Input with km suffix */}
          <View style={styles.odometerInputContainer}>
            <Ionicons name="speedometer-outline" size={20} color="#1d63ed" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.odometerTextInput}
              value={finalOdometer}
              onChangeText={setFinalOdometer}
              keyboardType="decimal-pad"
              placeholder="e.g. 45310.2"
              placeholderTextColor="#94a3b8"
            />
            <View style={styles.odometerDividerV} />
            <View style={styles.odometerKmBadge}>
              <Text style={styles.odometerKmText}>km</Text>
            </View>
          </View>

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
                  <Text style={styles.photoLocationLabel}>Latitude:</Text>
                  <Text style={styles.photoLocationVal}>
                    {photoLocation ? `${photoLocation.lat.toFixed(6)}°` : currentCoords ? `${currentCoords.lat.toFixed(6)}°` : 'Acquiring...'}
                  </Text>
                </View>
                <View style={styles.photoLocationRow}>
                  <Text style={styles.photoLocationLabel}>Longitude:</Text>
                  <Text style={styles.photoLocationVal}>
                    {photoLocation ? `${photoLocation.lng.toFixed(6)}°` : currentCoords ? `${currentCoords.lng.toFixed(6)}°` : 'Acquiring...'}
                  </Text>
                </View>
                <View style={styles.photoLocationRow}>
                  <Text style={styles.photoLocationLabel}>Time of Capture:</Text>
                  <Text style={styles.photoLocationVal}>{photoLocation?.time || 'Just now'}</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.retakeBtn} onPress={handleOpenCamera} activeOpacity={0.85}>
                <Ionicons name="camera-reverse" size={15} color="#ffffff" />
                <Text style={styles.retakeBtnText}>Retake Final Odometer Photo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.odometerSampleContainer}>
              <View style={styles.sampleGuideHeader}>
                <Ionicons name="information-circle" size={14} color="#0284c7" />
                <Text style={styles.sampleGuideHeaderText}>Reference: Take a clear photo of your car odometer gauge</Text>
              </View>

              {/* Sample Reference Image with Center Camera Overlay */}
              <TouchableOpacity
                style={styles.odometerSampleImageBox}
                onPress={handleOpenCamera}
                activeOpacity={0.88}
              >
                <Image
                  source={ODOMETER_SAMPLE}
                  style={styles.odometerSampleImage}
                  resizeMode="cover"
                />
                <View style={styles.sampleBadgeOverlay}>
                  <Text style={styles.sampleBadgeText}>📷 Reference Sample Photo</Text>
                </View>
                <View style={styles.centerCameraCircleOverlay}>
                  <Ionicons name="camera" size={24} color="#ffffff" />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cameraPrimaryBtn}
                onPress={handleOpenCamera}
                activeOpacity={0.85}
              >
                <Ionicons name="camera" size={18} color="#ffffff" />
                <Text style={styles.cameraPrimaryBtnText}>Open Camera & Capture Final Odometer</Text>
              </TouchableOpacity>

              {/* Pre-capture Current Location Indicator Pill */}
              <View style={styles.preCaptureGpsRow}>
                <View style={styles.gpsLeftGroup}>
                  <Ionicons name="location" size={14} color="#10b981" />
                  <Text style={styles.preCaptureGpsText}>
                    {currentCoords
                      ? `GPS: ${currentCoords.lat.toFixed(5)}, ${currentCoords.lng.toFixed(5)}`
                      : 'Acquiring GPS position...'}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* 2. Extra Charges: Toll Gate & Parking */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.walletIconCircle}>
              <Ionicons name="card" size={24} color="#7c3aed" />
            </View>
            <View style={styles.cardHeaderTextCol}>
              <View style={styles.sectionTitleRow}>
                <View style={styles.stepCirclePurple}>
                  <Text style={styles.stepCircleText}>2</Text>
                </View>
                <Text style={styles.sectionTitle}>Additional Charges</Text>
              </View>
              <Text style={styles.sectionSubtitle}>
                Enter any toll or parking fees paid during this trip. Admin will include them in the customer's final invoice.
              </Text>
            </View>
          </View>

          <View style={styles.extraChargesRow}>
            {/* Toll Gate Fare Box */}
            <View style={styles.tollChargeBox}>
              <View style={styles.chargeHeaderRow}>
                <Ionicons name="business" size={16} color="#059669" />
                <Text style={styles.chargeLabel}>Toll Gate Fare (₹)</Text>
              </View>
              <TextInput
                style={styles.chargeInput}
                value={tollAmount}
                onChangeText={setTollAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#94a3b8"
              />
            </View>

            {/* Parking Fare Box */}
            <View style={styles.parkingChargeBox}>
              <View style={styles.chargeHeaderRow}>
                <View style={styles.parkingBadge}>
                  <Text style={styles.parkingBadgeText}>P</Text>
                </View>
                <Text style={styles.chargeLabel}>Parking Fare (₹)</Text>
              </View>
              <TextInput
                style={styles.chargeInput}
                value={parkingAmount}
                onChangeText={setParkingAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Pinned Bottom Complete CTA Bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          style={[
            styles.completeButton,
            odometerImageUri && finalOdometer ? styles.completeButtonReady : styles.completeButtonLocked,
            loading && styles.completeButtonDisabled,
          ]}
          onPress={odometerImageUri && finalOdometer ? handleCompleteTrip : (!odometerImageUri ? handleOpenCamera : handleCompleteTrip)}
          disabled={loading}
          activeOpacity={0.88}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : !odometerImageUri ? (
            <>
              <View style={styles.ctaIconCircleAmber}>
                <Ionicons name="camera" size={16} color="#d97706" />
              </View>
              <Text style={styles.completeButtonText}>ATTACH FINAL ODOMETER PHOTO</Text>
              <Ionicons name="camera-outline" size={18} color="#ffffff" />
            </>
          ) : !finalOdometer ? (
            <>
              <View style={styles.ctaIconCircleAmber}>
                <Ionicons name="speedometer" size={16} color="#d97706" />
              </View>
              <Text style={styles.completeButtonText}>ENTER FINAL ODOMETER READING</Text>
              <Ionicons name="arrow-forward" size={18} color="#ffffff" />
            </>
          ) : (
            <>
              <View style={styles.ctaIconCircle}>
                <Ionicons name="checkmark-sharp" size={16} color="#059669" />
              </View>
              <Text style={styles.completeButtonText}>COMPLETE TRIP</Text>
              <Ionicons name="arrow-forward" size={18} color="#ffffff" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  topHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  headerDividerV: {
    width: 1,
    height: 32,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 10,
  },
  headerTextCol: {
    flex: 1,
  },
  headerStepBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16a34a',
  },
  headerLiveRadarText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#16a34a',
    letterSpacing: 0.8,
  },
  headerMainTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 1,
    letterSpacing: -0.2,
  },
  headerSubtitleText: {
    fontSize: 10.5,
    color: '#64748b',
    marginTop: 1,
  },
  headerRefCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 5,
  },
  headerRefText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.2,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 8,
    gap: 6,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 11.5,
    fontWeight: '600',
    flex: 1,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  speedometerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#faf5ff',
    borderWidth: 1,
    borderColor: '#e9d5ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderTextCol: {
    flex: 1,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepCircleBlue: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#1d63ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCirclePurple: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '900',
  },
  sectionTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  redAsterisk: {
    color: '#ef4444',
    fontWeight: '900',
  },
  sectionSubtitle: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 15,
  },
  ocrScanningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 10,
  },
  ocrScanningText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0369a1',
  },
  ocrSuccessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 10,
  },
  ocrSuccessText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#15803d',
  },
  ocrFailedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 10,
  },
  ocrFailedText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#b45309',
  },
  odometerInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f7ff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#bae6fd',
    paddingHorizontal: 14,
    height: 50,
    marginTop: 10,
  },
  odometerTextInput: {
    flex: 1,
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  odometerDividerV: {
    width: 1,
    height: 24,
    backgroundColor: '#bfdbfe',
    marginHorizontal: 10,
  },
  odometerKmBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  odometerKmText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1d63ed',
  },
  odometerSampleContainer: {
    width: '100%',
    gap: 8,
    marginTop: 4,
  },
  sampleGuideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f0f9ff',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  sampleGuideHeaderText: {
    fontSize: 10.5,
    color: '#0369a1',
    fontWeight: '700',
    flex: 1,
  },
  odometerSampleImageBox: {
    width: '100%',
    height: 135,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0f172a',
    borderWidth: 1.5,
    borderColor: '#3b82f6',
  },
  odometerSampleImage: {
    width: '100%',
    height: '100%',
    opacity: 0.85,
  },
  sampleBadgeOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  sampleBadgeText: {
    color: '#ffffff',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  centerCameraCircleOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -24 }, { translateY: -24 }],
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(37, 99, 235, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  cameraPrimaryBtn: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 10,
    gap: 6,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  cameraPrimaryBtnText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  preCaptureGpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#f0fdf9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  gpsLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gpsLiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  preCaptureGpsText: {
    fontSize: 12.5,
    color: '#475569',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  extraChargesRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  tollChargeBox: {
    flex: 1,
    backgroundColor: '#f0fdf9',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    padding: 12,
  },
  parkingChargeBox: {
    flex: 1,
    backgroundColor: '#f0f7ff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#bae6fd',
    padding: 12,
  },
  chargeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  parkingBadge: {
    backgroundColor: '#0284c7',
    width: 18,
    height: 18,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  parkingBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
  },
  chargeLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  chargeInput: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 12,
    height: 42,
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
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
    borderWidth: 1.2,
    borderColor: '#059669',
  },
  odometerPreviewImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#f1f5f9',
  },
  gpsWatermarkOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(16, 185, 129, 0.4)',
  },
  gpsWatermarkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 1,
  },
  gpsWatermarkDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10b981',
  },
  gpsWatermarkTitle: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#10b981',
    letterSpacing: 0.5,
  },
  gpsWatermarkCoords: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#ffffff',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  gpsWatermarkTime: {
    fontSize: 8.5,
    color: '#cbd5e1',
    marginTop: 1,
  },
  photoLocationCard: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 8,
    marginTop: 6,
    gap: 3,
  },
  photoLocationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  photoLocationLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },
  photoLocationVal: {
    fontSize: 10,
    color: '#059669',
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  retakeBtn: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 5,
  },
  retakeBtnText: {
    color: '#0f172a',
    fontSize: 11,
    fontWeight: '700',
  },
  bottomBar: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  completeButton: {
    borderRadius: 30,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    elevation: 6,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },
  completeButtonReady: {
    backgroundColor: '#059669',
    shadowColor: '#059669',
    shadowOpacity: 0.35,
  },
  completeButtonLocked: {
    backgroundColor: '#1e293b',
    shadowColor: '#0f172a',
    shadowOpacity: 0.25,
  },
  completeButtonDisabled: {
    opacity: 0.6,
  },
  ctaIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaIconCircleAmber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  completeButtonText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '900',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
});

