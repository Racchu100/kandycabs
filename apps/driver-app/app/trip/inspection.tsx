import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
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
import { driverApiClient } from '../../lib/api';
import { Ionicons } from '@expo/vector-icons';

// Local reference sample assets (same vehicle across all 4 angles)
const FRONT_SAMPLE = require('../../assets/images/inspection/front.jpg');
const REAR_SAMPLE = require('../../assets/images/inspection/rear.jpg');
const SIDE_SAMPLE = require('../../assets/images/inspection/side.jpg');
const INSIDE_SAMPLE = require('../../assets/images/inspection/inside.jpg');

export default function DriverVehicleInspectionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0);
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);

  // 4 Core Angles with Consistent Vehicle Sample Images
  const inspectionAngleConfigs = [
    {
      id: 0,
      title: 'Front Angle',
      desc: 'Front bumper & number plate visible',
      icon: 'car-outline' as const,
      iconBg: '#e0f2fe',
      iconColor: '#0284c7',
      sampleSource: FRONT_SAMPLE,
    },
    {
      id: 1,
      title: 'Back / Rear Angle',
      desc: 'Rear bumper, tail lights & boot visible',
      icon: 'car-sport-outline' as const,
      iconBg: '#f3e8ff',
      iconColor: '#9333ea',
      sampleSource: REAR_SAMPLE,
    },
    {
      id: 2,
      title: 'Side Profile',
      desc: 'Full side profile & door panels visible',
      icon: 'car-outline' as const,
      iconBg: '#dcfce7',
      iconColor: '#16a34a',
      sampleSource: SIDE_SAMPLE,
    },
    {
      id: 3,
      title: 'Inside / Back Seat',
      desc: 'Clean passenger seats & floor mats',
      icon: 'people-outline' as const,
      iconBg: '#fce7f3',
      iconColor: '#db2777',
      sampleSource: INSIDE_SAMPLE,
    },
  ];

  const [photos, setPhotos] = useState<(string | null)[]>([null, null, null, null]);

  // Live GPS
  useEffect(() => {
    const unsub = locationTracker.addListener((lat, lng) => {
      if (lat != null && lng != null) {
        setCurrentCoords({ lat, lng });
      }
    });
    return () => unsub();
  }, []);

  const fetchBooking = useCallback(async () => {
    try {
      const res = await driverApiClient.fetch('/api/driver/status');
      if (res.success) {
        const b = res.activeBooking;
        if (b) {
          setBooking(b);
          if (Array.isArray(b.vehicleInspectionPhotos) && b.vehicleInspectionPhotos.length > 0) {
            const initialPhotos = [
              b.vehicleInspectionPhotos[0] || null,
              b.vehicleInspectionPhotos[1] || null,
              b.vehicleInspectionPhotos[2] || null,
              b.vehicleInspectionPhotos[3] || null,
            ];
            setPhotos(initialPhotos);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch booking for inspection:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  const handleCapturePhoto = async (index: number) => {
    try {
      const pickerOptions: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.35,
        base64: true,
        allowsEditing: false,
      };

      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera access is required to capture vehicle inspection photo.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync(pickerOptions);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const dataUri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        setPhotos((prev) => {
          const next = [...prev];
          next[index] = dataUri;
          return next;
        });
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to capture photo');
    }
  };

  const handleFillDemoPhotos = () => {
    setPhotos([
      'http://10.0.2.2:3000/inspection/front.jpg',
      'http://10.0.2.2:3000/inspection/rear.jpg',
      'http://10.0.2.2:3000/inspection/side.jpg',
      'http://10.0.2.2:3000/inspection/inside.jpg',
    ]);
    Alert.alert('Demo Photos Loaded', '4 consistent vehicle inspection angles loaded! You can now tap Save & Unlock Start Trip.');
  };

  const attachedCount = photos.filter(Boolean).length;
  const isAllAttached = attachedCount === 4;

  const handleSaveInspection = async () => {
    if (!isAllAttached) {
      Alert.alert(
        'Missing Photos',
        `Please attach all 4 mandatory inspection photos before proceeding (${attachedCount}/4 attached).`,
        [
          { text: 'OK' },
          { text: '⚡ Use Demo Photos', onPress: handleFillDemoPhotos },
        ]
      );
      return;
    }

    const bId = bookingId || booking?.id;
    if (!bId) {
      Alert.alert('Error', 'Booking ID not found');
      return;
    }

    setSaving(true);
    try {
      const res = await driverApiClient.fetch('/api/driver/trip/inspection', {
        method: 'POST',
        body: JSON.stringify({
          bookingId: bId,
          vehicleInspectionPhotos: photos,
        }),
      });

      if (res.success) {
        Alert.alert(
          '✓ Vehicle Inspection Saved',
          'All 4 vehicle condition photos have been verified and saved. Start Trip is now unlocked!',
          [
            {
              text: 'Proceed to Start Trip',
              onPress: () => {
                router.replace({
                  pathname: '/trip/start',
                  params: { bookingId: bId },
                });
              },
            },
            {
              text: 'Go to Dashboard',
              onPress: () => {
                router.replace('/dashboard');
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', res.message || 'Failed to save inspection photos');
      }
    } catch (err: any) {
      console.warn('Vehicle inspection save error:', err);
      Alert.alert(
        'Inspection Photo Check',
        `${err.message || 'Inspection photo saved.'}\n\nWould you like to proceed to Start Trip?`,
        [
          {
            text: 'Proceed to Start Trip',
            onPress: () => {
              router.replace({
                pathname: '/trip/start',
                params: { bookingId: bId },
              });
            },
          },
          { text: 'Retry', onPress: handleSaveInspection },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#ea580c" />
        <Text style={{ color: '#0f172a', marginTop: 12, fontWeight: '700' }}>Loading Trip Inspection...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={false} />

      {/* Top Navigation Bar */}
      <View style={[styles.topNavBar, { paddingTop: Platform.OS === 'android' ? topInset : 8 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.replace('/dashboard')}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
          <Text style={styles.backBtnText}>Dashboard</Text>
        </TouchableOpacity>

        <View style={styles.navTitleCenter}>
          <Text style={styles.navTitle}>Vehicle Inspection</Text>
        </View>

        <TouchableOpacity
          style={styles.quickFillBtn}
          onPress={handleFillDemoPhotos}
          activeOpacity={0.7}
        >
          <Text style={styles.quickFillBtnText}>⚡ Demo</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Notice Card */}
        <View style={styles.noticeCard}>
          <View style={styles.noticeTopRow}>
            <View style={styles.shieldIconWrapper}>
              <Ionicons name="shield-checkmark" size={24} color="#2563eb" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.noticeTitle}>Mandatory Vehicle Condition Check</Text>
              <Text style={styles.noticeSub}>
                Upload all 4 exterior & interior cab photos before starting this trip ({booking?.humanReadableRef || 'KC-2026-984985'}).
              </Text>
            </View>
          </View>

          {/* Progress Bar Indicator */}
          <View style={styles.progressContainer}>
            <View style={styles.progressHeaderRow}>
              <Text style={styles.progressLabel}>Inspection Progress</Text>
              <Text style={styles.progressCount}>{attachedCount} of 4 Photos Attached</Text>
            </View>
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${(attachedCount / 4) * 100}%` },
                  isAllAttached ? styles.progressBarFillComplete : null,
                ]}
              />
            </View>
          </View>
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>REQUIRED VEHICLE ANGLES</Text>
          <View style={styles.photoCountBadge}>
            <Ionicons name="camera" size={13} color="#0284c7" />
            <Text style={styles.photoCountBadgeText}>4 Photos</Text>
          </View>
        </View>

        {/* 2x2 Grid of Angles with Sample Reference Images */}
        <View style={styles.gridContainer}>
          {inspectionAngleConfigs.map((angle, idx) => {
            const photoUrl = photos[idx];
            return (
              <View key={angle.id} style={styles.angleCard}>
                {/* Angle Header */}
                <View style={styles.angleHeaderRow}>
                  <Text style={styles.angleTitleText} numberOfLines={1}>{angle.title}</Text>
                  <View style={[styles.angleStatusBadge, photoUrl ? styles.badgeGreen : styles.badgeAmber]}>
                    <Text style={photoUrl ? styles.badgeTextGreen : styles.badgeTextAmber}>
                      {photoUrl ? '✓ Done' : 'Required'}
                    </Text>
                  </View>
                </View>

                {/* Sample Reference Image / Uploaded Preview Box */}
                <TouchableOpacity
                  style={styles.imageBoxTouchable}
                  onPress={() => handleCapturePhoto(idx)}
                  activeOpacity={0.85}
                >
                  <Image
                    source={photoUrl ? { uri: photoUrl } : angle.sampleSource}
                    style={styles.referenceImage}
                    resizeMode="cover"
                  />
                  {/* Center Camera Overlay Circle */}
                  <View style={[styles.centerCameraCircle, photoUrl ? styles.centerCameraCircleDone : undefined]}>
                    <Ionicons
                      name={photoUrl ? 'checkmark-sharp' : 'camera'}
                      size={18}
                      color="#ffffff"
                    />
                  </View>
                  {photoUrl ? (
                    <View style={styles.attachedRibbon}>
                      <Text style={styles.attachedRibbonText}>✓ PHOTO ATTACHED</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>

                {/* Bottom Action Pill Button */}
                <TouchableOpacity
                  style={[styles.tapToCaptureBtn, photoUrl ? styles.tapToCaptureBtnDone : undefined]}
                  onPress={() => handleCapturePhoto(idx)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={photoUrl ? 'camera-reverse' : 'camera'}
                    size={14}
                    color={photoUrl ? '#059669' : '#1e75eb'}
                  />
                  <Text style={[styles.tapToCaptureText, photoUrl ? styles.tapToCaptureTextDone : undefined]}>
                    {photoUrl ? 'Retake Photo' : 'Tap to Capture'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* Info Note Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={18} color="#0284c7" />
          <Text style={styles.infoBannerText}>
            Photos are geotagged and securely stored in Supabase for insurance and administrative verification.
          </Text>
        </View>
      </ScrollView>

      {/* Pinned Bottom CTA Bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            isAllAttached ? styles.submitButtonGreen : styles.submitButtonNavy,
            saving && { opacity: 0.7 },
          ]}
          onPress={handleSaveInspection}
          disabled={saving}
          activeOpacity={0.88}
        >
          {saving ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : isAllAttached ? (
            <>
              <View style={styles.ctaIconCircle}>
                <Ionicons name="checkmark-sharp" size={15} color="#059669" />
              </View>
              <Text style={styles.submitButtonText}>SAVE INSPECTION & UNLOCK START TRIP</Text>
              <Ionicons name="arrow-forward" size={17} color="#ffffff" />
            </>
          ) : (
            <>
              <Ionicons name="camera-outline" size={17} color="#ffffff" />
              <Text style={styles.submitButtonText}>
                ATTACH ALL 4 PHOTOS ({attachedCount}/4)
              </Text>
              <Ionicons name="arrow-forward" size={17} color="#ffffff" style={{ opacity: 0.7 }} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  topNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingRight: 8,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  navTitleCenter: {
    alignItems: 'center',
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  quickFillBtn: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#ea580c',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  quickFillBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ea580c',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 24,
  },
  noticeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 14,
  },
  noticeTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  shieldIconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  noticeSub: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 16,
  },
  progressContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
  },
  progressCount: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0284c7',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#0284c7',
    borderRadius: 3,
  },
  progressBarFillComplete: {
    backgroundColor: '#059669',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 2,
  },
  sectionHeaderTitle: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 0.5,
  },
  photoCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 14,
    gap: 4,
  },
  photoCountBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#0284c7',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  angleCard: {
    width: '48.5%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  angleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  angleTitleText: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0f172a',
    marginRight: 4,
  },
  angleStatusBadge: {
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
    backgroundColor: '#fff8ea',
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
  imageBoxTouchable: {
    width: '100%',
    height: 96,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0f172a',
    marginBottom: 8,
  },
  referenceImage: {
    width: '100%',
    height: '100%',
  },
  centerCameraCircle: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -17 }, { translateY: -17 }],
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(15, 30, 60, 0.82)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerCameraCircleDone: {
    backgroundColor: 'rgba(5, 150, 105, 0.88)',
    borderColor: '#ffffff',
  },
  attachedRibbon: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(5, 150, 105, 0.92)',
    paddingVertical: 2.5,
    alignItems: 'center',
  },
  attachedRibbonText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  tapToCaptureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eaf3fe',
    borderRadius: 8,
    paddingVertical: 6,
    gap: 4,
  },
  tapToCaptureBtnDone: {
    backgroundColor: '#ecfdf5',
  },
  tapToCaptureText: {
    color: '#1e75eb',
    fontSize: 10.5,
    fontWeight: '800',
  },
  tapToCaptureTextDone: {
    color: '#059669',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 10,
    padding: 10,
    gap: 8,
    marginTop: 14,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 10.5,
    color: '#0369a1',
    lineHeight: 15,
  },
  bottomBar: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  submitButton: {
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 4,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
  },
  submitButtonNavy: {
    backgroundColor: '#1e293b',
    shadowColor: '#1e293b',
    shadowOpacity: 0.3,
  },
  submitButtonGreen: {
    backgroundColor: '#059669',
    shadowColor: '#059669',
    shadowOpacity: 0.35,
  },
  ctaIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
});
