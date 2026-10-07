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
import { reverseGeocodeAddress } from '../../lib/reverse-geocoding';
import { driverApiClient } from '../../lib/api';
import { setTripInProcess } from '../../lib/tripState';
import { Ionicons } from '@expo/vector-icons';

const ODOMETER_SAMPLE = require('../../assets/images/inspection/odometer_sample.jpg');

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
  const [ocrScanning, setOcrScanning] = useState(false);
  const [ocrResultText, setOcrResultText] = useState<{ status: 'success' | 'failed' | 'idle'; reading?: number; message?: string }>({ status: 'idle' });

  // Subscribe to live GPS coordinates and ensure active trip tracking is running
  useEffect(() => {
    if (bookingId) {
      locationTracker.startActiveTripTracking(bookingId);
    }
    const unsub = locationTracker.addListener((lat, lng) => {
      if (lat != null && lng != null) {
        setCurrentCoords({ lat, lng });
      }
    });
    return () => unsub();
  }, [bookingId]);

  const checkStatus = useCallback(async () => {
    try {
      const res = await driverApiClient.fetch('/api/driver/status');
      if (res.success && res.activeBooking) {
        setBooking(res.activeBooking);
        if (res.activeBooking.status === 'TRIP_STARTED') {
          setIsAdminAuthorized(true);
        }
        if (Array.isArray(res.activeBooking.vehicleInspectionPhotos) && res.activeBooking.vehicleInspectionPhotos.length > 0) {
          setInspectionPhotos([
            res.activeBooking.vehicleInspectionPhotos[0] || null,
            res.activeBooking.vehicleInspectionPhotos[1] || null,
            res.activeBooking.vehicleInspectionPhotos[2] || null,
            res.activeBooking.vehicleInspectionPhotos[3] || null,
          ]);
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

  // 4 Core Vehicle Inspection Angles: [Front, Back/Rear, Side, Inside]
  const inspectionAngles = [
    { id: 0, title: 'Front Photo', desc: 'Front bumper & plate visible', icon: 'car-outline' as const },
    { id: 1, title: 'Back / Rear Photo', desc: 'Rear bumper, tail lights & boot', icon: 'car-sport-outline' as const },
    { id: 2, title: 'Side Photo', desc: 'Full side profile & door panels', icon: 'browsers-outline' as const },
    { id: 3, title: 'Inside Photo', desc: 'Clean interior & dashboard', icon: 'speedometer-outline' as const },
  ];
  const [inspectionPhotos, setInspectionPhotos] = useState<(string | null)[]>([null, null, null, null]);

  const handlePickInspectionPhoto = async (index: number, mode: 'camera' | 'library') => {
    try {
      const pickerOptions: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.3,
        base64: true,
        allowsEditing: false,
      };
      let result;
      if (mode === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Camera access is required to capture vehicle photo.');
          return;
        }
        result = await ImagePicker.launchCameraAsync(pickerOptions);
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Photo library access is required.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync(pickerOptions);
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const dataUri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        setInspectionPhotos((prev) => {
          const next = [...prev];
          next[index] = dataUri;
          return next;
        });
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to capture vehicle photo');
    }
  };

  const handleInspectionOptions = (index: number) => {
    const title = inspectionAngles[index].title;
    Alert.alert(
      `Capture ${title}`,
      'Choose source for vehicle inspection photo:',
      [
        { text: '📷 Take Photo with Camera', onPress: () => handlePickInspectionPhoto(index, 'camera') },
        { text: '🖼️ Choose from Gallery', onPress: () => handlePickInspectionPhoto(index, 'library') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleFillDemoInspectionPhotos = () => {
    setInspectionPhotos([
      'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=80', // Front
      'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=800&auto=format&fit=crop&q=80', // Rear
      'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&auto=format&fit=crop&q=80', // Side
      'https://images.unsplash.com/photo-1563720223185-11003d516935?w=800&auto=format&fit=crop&q=80', // Inside
    ]);
  };


  const runOdometerOcr = async (uriOrBase64: string) => {
    setOcrScanning(true);
    setOcrResultText({ status: 'idle' });
    try {
      const res = await driverApiClient.fetch('/api/driver/odometer/ocr', {
        method: 'POST',
        body: JSON.stringify({ imageBase64: uriOrBase64 }),
      });
      if (res && res.success && res.reading) {
        setStartingOdometer(String(res.reading));
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

  const handleStartTrip = async () => {
    if (!isAdminAuthorized && pickupOtp.length < 4) {
      setError('Please enter the 4-digit pickup OTP from the customer');
      return;
    }
    if (!startingOdometer) {
      setError('Please enter the starting odometer reading');
      return;
    }
    if (!odometerImageUri) {
      setError('Starting odometer photo is mandatory. Please capture photo of the odometer.');
      Alert.alert(
        'Odometer Photo Required',
        'You must capture a clear photo of the vehicle starting odometer before starting the trip.',
        [
          { text: '📷 Capture Odometer Photo', onPress: handleOpenCamera },
          { text: 'OK' },
        ]
      );
      return;
    }

    setError('');
    setLoading(true);

    try {
      // Capture exact driver GPS location at OTP verification moment
      const latestCoords = locationTracker.getCurrentCoordinates();
      const actualLat = latestCoords.lat ?? currentCoords?.lat ?? photoLocation?.lat ?? booking?.pickupLat;
      const actualLng = latestCoords.lng ?? currentCoords?.lng ?? photoLocation?.lng ?? booking?.pickupLng;
      const actualAddress = await reverseGeocodeAddress(
        actualLat,
        actualLng,
        booking?.pickupAddress
      );

      const res = await driverApiClient.fetch('/api/driver/trip/start', {
        method: 'POST',
        body: JSON.stringify({
          bookingId,
          pickupOtp: isAdminAuthorized ? 'OVERRIDE' : pickupOtp,
          startingOdometer: parseFloat(startingOdometer),
          startingOdometerImagePath: odometerImageUri,
          vehicleInspectionPhotos: inspectionPhotos.filter(Boolean),
          actualPickupLat: actualLat,
          actualPickupLng: actualLng,
          actualPickupAddress: actualAddress,
        }),
      });

      if (res.success) {
        // Start background GPS tracking immediately
        if (bookingId) {
          await setTripInProcess(bookingId, true);
          locationTracker.startActiveTripTracking(bookingId);
        }
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

  const handleGoBack = async () => {
    if (bookingId) {
      await setTripInProcess(bookingId, true);
      driverApiClient.fetch('/api/driver/trip/en-route', {
        method: 'POST',
        body: JSON.stringify({ bookingId }),
      }).catch(() => {});
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/dashboard');
    }
  };

  const handleNotReached = async () => {
    if (bookingId) {
      await setTripInProcess(bookingId, false);
      driverApiClient.fetch('/api/driver/trip/en-route', {
        method: 'POST',
        body: JSON.stringify({ bookingId, action: 'NOT_REACHED' }),
      }).catch(() => {});
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/dashboard');
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

  const openPickupNavigation = () => {
    if (!booking) return;
    const hasCoords =
      typeof booking.pickupLat === 'number' &&
      typeof booking.pickupLng === 'number' &&
      !isNaN(booking.pickupLat) &&
      !isNaN(booking.pickupLng);

    const targetQuery = hasCoords
      ? `${booking.pickupLat},${booking.pickupLng}`
      : encodeURIComponent(booking.pickupAddress || '');

    if (!targetQuery) {
      Alert.alert('Location Notice', 'Pickup address or coordinates are not available.');
      return;
    }

    const androidNavUrl = `google.navigation:q=${targetQuery}&mode=d`;
    const universalFallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${targetQuery}&travelmode=driving`;
    const iosUrl = `maps:0,0?q=${targetQuery}`;

    if (Platform.OS === 'android') {
      Linking.openURL(androidNavUrl).catch(() => {
        Linking.openURL(universalFallbackUrl).catch(() => {});
      });
    } else if (Platform.OS === 'ios') {
      Linking.openURL(iosUrl).catch(() => {
        Linking.openURL(universalFallbackUrl).catch(() => {});
      });
    } else {
      Linking.openURL(universalFallbackUrl).catch(() => {});
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={false} />

      {/* Top Header Bar */}
      <View style={[styles.topHeaderBar, { paddingTop: topInset + 6 }]}>
        <View style={styles.headerLeftGroup}>
          <TouchableOpacity
            style={styles.headerBackBtn}
            onPress={handleGoBack}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={20} color="#0f172a" />
          </TouchableOpacity>

          <View style={styles.headerDividerV} />

          <View style={styles.headerTextCol}>
            <View style={styles.headerStepBadgeRow}>
              <View style={styles.headerLiveDot} />
              <Text style={styles.headerLiveRadarText}>START VERIFICATION</Text>
            </View>
            <Text style={styles.headerMainTitle}>Verify & Vehicle Inspection</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.headerHomeBtn}
          onPress={handleNotReached}
          activeOpacity={0.8}
        >
          <Ionicons name="close-circle-outline" size={14} color="#dc2626" />
          <Text style={styles.headerHomeText}>Not Reached</Text>
        </TouchableOpacity>
      </View>

      {/* Top Action Ribbon / Quick Nav */}
      <View style={styles.topActionRibbon}>
        <TouchableOpacity
          style={styles.ribbonHomeBtn}
          onPress={handleNotReached}
          activeOpacity={0.8}
        >
          <Ionicons name="close-circle-outline" size={16} color="#ffffff" />
          <Text style={styles.ribbonHomeText}>Not Reached</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.ribbonNavBtn}
          onPress={openPickupNavigation}
          activeOpacity={0.85}
        >
          <Ionicons name="navigate" size={15} color="#ffffff" />
          <Text style={styles.ribbonNavText}>Pickup Navigate</Text>
        </TouchableOpacity>
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

        {/* Passenger Information Card */}
        {booking && (
          <View style={styles.passengerCard}>
            <View style={styles.passengerHeaderRow}>
              <Text style={styles.passengerHeaderTitle}>PASSENGER DETAILS</Text>
              {booking.customerPhoneReleased ? (
                <View style={styles.releasedBadge}>
                  <Ionicons name="lock-open" size={11} color="#34d399" />
                  <Text style={styles.releasedBadgeText}>Phone Released</Text>
                </View>
              ) : (
                <View style={styles.lockedBadge}>
                  <Ionicons name="lock-closed" size={11} color="#94a3b8" />
                  <Text style={styles.lockedBadgeText}>Phone Protected</Text>
                </View>
              )}
            </View>

            <View style={styles.passengerMainRow}>
              <View style={styles.passengerAvatarCircle}>
                <Ionicons name="person" size={20} color="#38bdf8" />
              </View>
              <View style={styles.passengerInfoCol}>
                <Text style={styles.passengerName}>
                  {booking.customer?.user?.fullName || 'Customer'}
                </Text>
                <Text style={styles.passengerSubtitle}>Confirmed Passenger</Text>
              </View>
            </View>

            {booking.customerPhoneReleased && booking.customer?.user?.phone ? (
              <TouchableOpacity
                style={styles.callButton}
                activeOpacity={0.85}
                onPress={() => Linking.openURL(`tel:${booking.customer.user.phone}`)}
              >
                <View style={styles.callBtnLeft}>
                  <Ionicons name="call" size={16} color="#ffffff" />
                  <Text style={styles.callButtonText}>
                    Call Customer ({booking.customer.user.phone})
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.8)" />
              </TouchableOpacity>
            ) : (
              <View style={styles.phoneProtectedBox}>
                <Ionicons name="shield-checkmark" size={14} color="#64748b" />
                <Text style={styles.phoneProtectedText}>
                  Customer phone locked by admin privacy policy.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Admin Authorization Notice */}
        {isAdminAuthorized ? (
          <View style={styles.authorizedBox}>
            <View style={styles.authorizedHeader}>
              <Ionicons name="checkmark-circle" size={18} color="#34d399" />
              <Text style={styles.authorizedTitle}>Admin Authorized Trip Start</Text>
            </View>
            <Text style={styles.authorizedSubtitle}>
              Admin dispatch has authorized this ride. Customer OTP is waived. Enter starting odometer and start trip.
            </Text>
          </View>
        ) : (
          /* 1. Customer OTP Entry */
          <View style={styles.card}>
            <View style={styles.stepHeaderRow}>
              <View style={styles.stepCircle}>
                <Text style={styles.stepCircleText}>1</Text>
              </View>
              <Text style={styles.sectionTitle}>Customer Pickup OTP *</Text>
            </View>

            <Text style={styles.hint}>
              Ask the customer for their 4-digit start OTP shown on their booking screen:
            </Text>

            {/* Visual 4-Digit Box Container */}
            <View style={styles.otpRowContainer}>
              <View style={styles.otpBoxesWrapper}>
                {[0, 1, 2, 3].map((idx) => {
                  const digit = pickupOtp[idx] || '';
                  const isFocused = pickupOtp.length === idx;
                  const isFilled = Boolean(digit);
                  return (
                    <View
                      key={idx}
                      style={[
                        styles.otpBox,
                        isFilled && styles.otpBoxFilled,
                        isFocused && styles.otpBoxActive,
                      ]}
                    >
                      <Text style={[styles.otpDigit, isFilled && styles.otpDigitFilled]}>
                        {digit}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* Right Shield Graphic with progress indicator dots */}
              <View style={styles.shieldBadgeBox}>
                <Ionicons
                  name={pickupOtp.length === 4 ? 'shield-checkmark' : 'shield-outline'}
                  size={20}
                  color={pickupOtp.length === 4 ? '#10b981' : '#38bdf8'}
                />
                <View style={styles.shieldDotsRow}>
                  {[0, 1, 2, 3].map((i) => (
                    <View
                      key={i}
                      style={[
                        styles.shieldDot,
                        pickupOtp.length > i && styles.shieldDotActive,
                      ]}
                    />
                  ))}
                </View>
              </View>

              {/* Invisible Overlay Input to handle touch and keyboard */}
              <TextInput
                style={styles.hiddenOtpInput}
                value={pickupOtp}
                onChangeText={setPickupOtp}
                keyboardType="number-pad"
                maxLength={4}
                caretHidden={true}
              />
            </View>

            {/* Admin Override Banner */}
            <TouchableOpacity
              style={styles.overrideLinkBanner}
              onPress={handleRequestAdminOverride}
              disabled={overrideRequesting}
              activeOpacity={0.8}
            >
              <View style={styles.overrideBannerLeft}>
                <Ionicons name="warning" size={15} color="#f59e0b" />
                <Text style={styles.overrideLinkText}>
                  {overrideRequesting
                    ? 'Requesting Override...'
                    : overrideRequested
                    ? 'Override Requested — Waiting Approval'
                    : 'Customer Phone Unreachable? Request Admin Override'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color="#f59e0b" />
            </TouchableOpacity>
          </View>
        )}

        {/* 2. Starting Odometer Reading & Camera Photo */}
        <View style={styles.card}>
          <View style={styles.stepHeaderRow}>
            <View style={styles.stepCircle}>
              <Text style={styles.stepCircleText}>2</Text>
            </View>
            <Text style={styles.sectionTitle}>Starting Odometer Reading *</Text>
          </View>

          <Text style={styles.hint}>
            Enter current car dashboard reading & take mandatory photo:
          </Text>

          {/* Odometer Input with Speedometer Icon */}
          <View style={styles.odometerInputContainer}>
            <Ionicons name="speedometer-outline" size={20} color="#38bdf8" style={styles.odometerIcon} />
            <TextInput
              style={styles.odometerTextInput}
              value={startingOdometer}
              onChangeText={setStartingOdometer}
              keyboardType="decimal-pad"
              placeholder="e.g. 45210.5"
              placeholderTextColor="#64748b"
            />
            <View style={styles.odometerKmBadge}>
              <Text style={styles.odometerKmText}>KM</Text>
            </View>
          </View>

          {/* OCR Auto-Read Feedback Banner */}
          {ocrScanning ? (
            <View style={styles.ocrScanningBanner}>
              <ActivityIndicator size="small" color="#0284c7" />
              <Text style={styles.ocrScanningText}>⚡ Auto-reading odometer numbers from photo...</Text>
            </View>
          ) : ocrResultText.status === 'success' ? (
            <View style={styles.ocrSuccessBanner}>
              <Ionicons name="checkmark-circle" size={15} color="#16a34a" />
              <Text style={styles.ocrSuccessText}>
                ✨ {ocrResultText.message || `Auto-detected ${ocrResultText.reading} KM`}
              </Text>
            </View>
          ) : ocrResultText.status === 'failed' ? (
            <View style={styles.ocrFailedBanner}>
              <Ionicons name="information-circle-outline" size={15} color="#d97706" />
              <Text style={styles.ocrFailedText}>
                {ocrResultText.message || 'Please check and type odometer reading manually'}
              </Text>
            </View>
          ) : null}

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
                <Text style={styles.retakeBtnText}>Retake Camera Photo</Text>
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
                <Text style={styles.cameraPrimaryBtnText}>Open Camera & Capture Odometer</Text>
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

        {/* 3. Vehicle Inspection Photos (Front, Back/Rear, Side, Inside) */}
        <View style={styles.card}>
          <View style={styles.stepHeaderRow}>
            <View style={styles.stepCircle}>
              <Text style={styles.stepCircleText}>3</Text>
            </View>
            <View style={{ flex: 1, paddingRight: 4 }}>
              <Text style={styles.sectionTitle}>Vehicle Inspection Photos *</Text>
              <Text style={styles.sectionSubTitle}>Front, Rear, Side & Inside Views</Text>
            </View>
            <TouchableOpacity
              style={styles.demoFillMiniBtn}
              onPress={handleFillDemoInspectionPhotos}
              activeOpacity={0.7}
            >
              <Text style={styles.demoFillMiniBtnText}>⚡ Demo</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.hint}>
            Capture mandatory condition photos of your cab before starting the trip:
          </Text>

          {/* 2x2 Grid of Inspection Angles */}
          <View style={styles.inspectionGrid}>
            {inspectionAngles.map((angle, idx) => {
              const photo = inspectionPhotos[idx];
              return (
                <View key={angle.id} style={styles.inspectionCard}>
                  <View style={styles.inspectionCardHeader}>
                    <View style={styles.inspectionCardTitleRow}>
                      <Ionicons name={angle.icon} size={13} color="#0284c7" />
                      <Text style={styles.inspectionCardTitle} numberOfLines={1}>{angle.title}</Text>
                    </View>
                    <View style={[styles.inspectionBadge, photo ? styles.badgeGreen : styles.badgeAmber]}>
                      <Text style={photo ? styles.badgeTextGreen : styles.badgeTextAmber}>
                        {photo ? '✓ Done' : 'Req'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.inspectionCardDesc} numberOfLines={1}>{angle.desc}</Text>

                  {photo ? (
                    <View style={styles.inspectionPreviewWrapper}>
                      <Image
                        source={{ uri: photo }}
                        style={styles.inspectionThumbnail}
                        resizeMode="cover"
                      />
                      <TouchableOpacity
                        style={styles.inspectionRetakeBtn}
                        onPress={() => handleInspectionOptions(idx)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="camera-reverse" size={11} color="#ffffff" />
                        <Text style={styles.inspectionRetakeText}>Retake</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.inspectionPlaceholder}
                      onPress={() => handleInspectionOptions(idx)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.inspectionCameraCircle}>
                        <Ionicons name="camera" size={16} color="#0284c7" />
                      </View>
                      <Text style={styles.inspectionPlaceholderText}>Tap to Capture</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Pinned Bottom Action Bar for Exact 100vh Fit */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          style={[
            styles.startButton,
            odometerImageUri && startingOdometer && (isAdminAuthorized || pickupOtp.length === 4)
              ? styles.startButtonReady
              : styles.startButtonLocked,
            loading && styles.startButtonDisabled,
          ]}
          onPress={
            !isAdminAuthorized && pickupOtp.length < 4
              ? () => setError('Please enter the 4-digit pickup OTP')
              : !startingOdometer
              ? () => setError('Please enter the starting odometer reading')
              : !odometerImageUri
              ? handleOpenCamera
              : handleStartTrip
          }
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
              <Text style={styles.startButtonText}>ATTACH STARTING ODOMETER PHOTO</Text>
              <Ionicons name="camera-outline" size={18} color="#ffffff" />
            </>
          ) : !startingOdometer ? (
            <>
              <View style={styles.ctaIconCircleAmber}>
                <Ionicons name="speedometer" size={16} color="#d97706" />
              </View>
              <Text style={styles.startButtonText}>ENTER STARTING ODOMETER READING</Text>
              <Ionicons name="arrow-forward" size={18} color="#ffffff" />
            </>
          ) : !isAdminAuthorized && pickupOtp.length < 4 ? (
            <>
              <View style={styles.ctaIconCircleAmber}>
                <Ionicons name="key" size={16} color="#d97706" />
              </View>
              <Text style={styles.startButtonText}>ENTER 4-DIGIT PICKUP OTP</Text>
              <Ionicons name="arrow-forward" size={18} color="#ffffff" />
            </>
          ) : (
            <>
              <View style={styles.ctaIconCircleWhite}>
                <Ionicons name="checkmark-sharp" size={16} color="#059669" />
              </View>
              <Text style={styles.startButtonText}>VERIFY & START TRIP</Text>
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
    height: 28,
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
  headerHomeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  headerHomeText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#dc2626',
  },
  topActionRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 8,
  },
  ribbonHomeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 8,
    gap: 5,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  ribbonHomeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  ribbonNavBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 8,
    gap: 5,
    elevation: 2,
    shadowColor: '#2563eb',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  ribbonNavText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
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
  passengerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  passengerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  passengerHeaderTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.6,
  },
  releasedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    gap: 4,
  },
  releasedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    gap: 4,
  },
  lockedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563eb',
  },
  passengerMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  passengerAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    borderColor: '#bfdbfe',
  },
  passengerInfoCol: {
    flex: 1,
  },
  passengerName: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  passengerSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
    fontWeight: '500',
  },
  callButton: {
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  callBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  callButtonText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  phoneProtectedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
  },
  phoneProtectedText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
    flex: 1,
  },
  authorizedBox: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1.2,
    borderColor: '#10b981',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  authorizedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  authorizedTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#047857',
  },
  authorizedSubtitle: {
    fontSize: 11,
    color: '#065f46',
    lineHeight: 15,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  stepHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  stepCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '900',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  hint: {
    fontSize: 10.5,
    color: '#64748b',
    marginBottom: 8,
    lineHeight: 14,
  },
  otpRowContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  otpBoxesWrapper: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  otpBox: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1.2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxActive: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  otpBoxFilled: {
    borderColor: '#059669',
    backgroundColor: '#f0fdf4',
  },
  otpDigit: {
    fontSize: 20,
    fontWeight: '900',
    color: '#64748b',
  },
  otpDigitFilled: {
    color: '#0f172a',
  },
  shieldBadgeBox: {
    width: 42,
    height: 46,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    gap: 3,
  },
  shieldDotsRow: {
    flexDirection: 'row',
    gap: 2.5,
  },
  shieldDot: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
  },
  shieldDotActive: {
    backgroundColor: '#10b981',
  },
  hiddenOtpInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
  },
  overrideLinkBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fcd34d',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: 2,
  },
  overrideBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  overrideLinkText: {
    color: '#b45309',
    fontSize: 10.5,
    fontWeight: '700',
    flex: 1,
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
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: '#cbd5e1',
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 8,
  },
  odometerIcon: {
    marginRight: 8,
  },
  odometerTextInput: {
    flex: 1,
    color: '#0f172a',
    fontSize: 14.5,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  odometerKmBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  odometerKmText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#2563eb',
  },
  odometerSampleContainer: {
    width: '100%',
    gap: 8,
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
    marginTop: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  gpsLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  preCaptureGpsText: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  previewContainer: {
    alignItems: 'center',
    marginVertical: 4,
    width: '100%',
  },
  imageWrapper: {
    width: '100%',
    position: 'relative',
    borderRadius: 10,
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
  sectionSubTitle: {
    fontSize: 10.5,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 1,
  },
  demoFillMiniBtn: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#ea580c',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
  },
  demoFillMiniBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ea580c',
  },
  inspectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  inspectionCard: {
    width: '48.5%',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 8,
  },
  inspectionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  inspectionCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    marginRight: 4,
  },
  inspectionCardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
  },
  inspectionCardDesc: {
    fontSize: 9,
    color: '#64748b',
    marginBottom: 6,
  },
  inspectionBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  badgeGreen: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  badgeAmber: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  badgeTextGreen: {
    color: '#059669',
    fontSize: 8.5,
    fontWeight: '800',
  },
  badgeTextAmber: {
    color: '#d97706',
    fontSize: 8.5,
    fontWeight: '800',
  },
  inspectionPreviewWrapper: {
    width: '100%',
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  inspectionThumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e2e8f0',
  },
  inspectionRetakeBtn: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 4,
  },
  inspectionRetakeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
  inspectionPlaceholder: {
    width: '100%',
    height: 80,
    borderRadius: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  inspectionCameraCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inspectionPlaceholderText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#0284c7',
  },
  startButton: {
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
  startButtonReady: {
    backgroundColor: '#059669',
    shadowColor: '#059669',
    shadowOpacity: 0.35,
  },
  startButtonLocked: {
    backgroundColor: '#1e293b',
    shadowColor: '#0f172a',
    shadowOpacity: 0.25,
  },
  startButtonDisabled: {
    opacity: 0.6,
  },
  ctaIconCircleWhite: {
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
  startButtonText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '900',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
});

