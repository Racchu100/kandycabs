import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Platform,
  Linking,
  ImageBackground,
  StatusBar,
  Image,
  AppState,
  AppStateStatus,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { driverApiClient } from '../lib/api';
import { locationTracker, LocationState } from '../lib/location-tracker';
import { driverRealtimeClient } from '../lib/realtime-client';
import { BookingStatus } from '@kandy-cabs/shared';
import { SlideToAccept } from '../components/SlideToAccept';

export default function DriverDashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [driver, setDriver] = useState<any>(null);
  const [onlineStatus, setOnlineStatus] = useState(false);
  const [activeBooking, setActiveBooking] = useState<any>(null);
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsState, setGpsState] = useState<LocationState>(locationTracker.getState());

  // Bottom Navigation State: 'HOME' | 'MY_TRIPS' | 'SUPPORT' | 'PROFILE'
  const [activeBottomTab, setActiveBottomTab] = useState<'HOME' | 'MY_TRIPS' | 'SUPPORT' | 'PROFILE'>('HOME');

  // Top Card Sub-Tab State: 'MY_TRIPS' | 'UPCOMING' | 'HISTORY'
  const [activeCardTab, setActiveCardTab] = useState<'MY_TRIPS' | 'UPCOMING' | 'HISTORY'>('MY_TRIPS');

  const [tripsLoading, setTripsLoading] = useState(false);
  const [tripsLoaded, setTripsLoaded] = useState(false);
  const [driverTrips, setDriverTrips] = useState<any[]>([]);
  const [earningsSummary, setEarningsSummary] = useState<any>({
    totalAllowanceEarned: 0,
    totalPayeeEarned: 0,
    totalEarnings: 0,
    totalSettled: 0,
    totalPending: 0,
    completedTripsCount: 0,
    totalTripsCount: 0,
  });

  // Monthly Earnings State
  const now = new Date();
  const defaultCurrentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(defaultCurrentMonthKey);
  const [monthlyBreakdown, setMonthlyBreakdown] = useState<any[]>([]);
  const [currentMonthSummary, setCurrentMonthSummary] = useState<any>(null);
  const [previousMonthSummary, setPreviousMonthSummary] = useState<any>(null);

  // Dynamically filter trips based on selected billing month
  const filteredTrips = useMemo(() => {
    if (selectedMonthKey === 'ALL') {
      return driverTrips;
    }
    return driverTrips.filter((t) => t.monthKey === selectedMonthKey);
  }, [driverTrips, selectedMonthKey]);

  // Dynamically calculate active KPI summary based on selected billing month
  const activeKpiSummary = useMemo(() => {
    if (selectedMonthKey === 'ALL') {
      return earningsSummary;
    }
    const matched = monthlyBreakdown.find((m) => m.monthKey === selectedMonthKey);
    if (matched) {
      return matched;
    }
    if (selectedMonthKey === currentMonthSummary?.monthKey && currentMonthSummary) {
      return currentMonthSummary;
    }
    if (selectedMonthKey === previousMonthSummary?.monthKey && previousMonthSummary) {
      return previousMonthSummary;
    }
    // Calculate dynamically from filteredTrips
    let totalAllowanceEarned = 0;
    let totalPayeeEarned = 0;
    let totalSettled = 0;
    let totalPending = 0;
    let completedTripsCount = 0;
    filteredTrips.forEach((t) => {
      const allowance = Number(t.driverAllowance || 0);
      const payee = Number(t.driverPayeeAmount || 0);
      const total = allowance + payee;
      if (t.status === 'TRIP_COMPLETED') {
        completedTripsCount++;
        totalAllowanceEarned += allowance;
        totalPayeeEarned += payee;
        if (t.driverPaymentStatus === 'PAID') {
          totalSettled += total;
        } else {
          totalPending += total;
        }
      }
    });
    return {
      totalAllowanceEarned,
      totalPayeeEarned,
      totalEarnings: totalAllowanceEarned + totalPayeeEarned,
      totalSettled,
      totalPending,
      completedTripsCount,
    };
  }, [selectedMonthKey, earningsSummary, monthlyBreakdown, currentMonthSummary, previousMonthSummary, filteredTrips]);

  // Check if any KYC document, driver profile photo, or vehicle inspection photo is missing (unfilled)
  const hasPendingDocuments = useMemo(() => {
    if (!driver) return false;
    // Check if any required document or photo is unfilled
    if (!driver.profilePhotoUrl || !driver.licenseDocUrl || !driver.rcDocUrl || !driver.insuranceDocUrl) {
      return true;
    }
    const photos = Array.isArray(driver.vehiclePhotos) ? driver.vehiclePhotos : [];
    const validPhotos = photos.filter((p: string) => p && !p.includes('placehold.co') && p.trim().length > 0);
    if (photos.length !== 5 || validPhotos.length !== 5) {
      return true;
    }
    // All documents are filled in
    return false;
  }, [driver]);

  // Listen to live GPS changes directly from device hardware/emulator
  useEffect(() => {
    const unsub = locationTracker.addListener((lat, lng, state) => {
      if (lat != null && lng != null) {
        setCurrentCoords({ lat, lng });
      }
      setGpsState(state);
    });
    return () => unsub();
  }, []);

  const isFetchingRef = useRef(false);
  const pendingRefreshRef = useRef(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tripsLoadedRef = useRef(tripsLoaded);
  tripsLoadedRef.current = tripsLoaded;

  const fetchDriverData = useCallback(async () => {
    // Prevent simultaneous in-flight fetches
    if (isFetchingRef.current) {
      pendingRefreshRef.current = true;
      return;
    }

    isFetchingRef.current = true;
    try {
      const [statusRes, dispatchRes] = await Promise.all([
        driverApiClient.fetch('/api/driver/status'),
        driverApiClient.fetch('/api/driver/dispatches'),
      ]);

      if (statusRes.success) {
        setDriver(statusRes.driver);
        setOnlineStatus(statusRes.driver.onlineStatus);
        setActiveBooking(statusRes.activeBooking);

        // Start/Stop GPS tracking based on online and trip status
        if (statusRes.driver.onlineStatus) {
          if (statusRes.activeBooking) {
            locationTracker.startActiveTripTracking(statusRes.activeBooking.id);
          } else {
            locationTracker.startIdleTracking();
          }
        } else {
          locationTracker.stopTracking();
        }
      }

      if (dispatchRes.success) {
        setDispatches(dispatchRes.dispatches || []);
      }
    } catch (err) {
      console.error('Failed to fetch driver data:', err);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);

      // Perform at most one follow-up refresh if another request arrived while in flight
      if (pendingRefreshRef.current) {
        pendingRefreshRef.current = false;
        fetchDriverData();
      }
    }
  }, []);

  // Coalesced / Debounced fetch trigger for rapid bursts of SSE events or reconnects
  const triggerDebouncedFetch = useCallback((delayMs: number = 600) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (delayMs <= 0) {
      fetchDriverData();
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      fetchDriverData();
    }, delayMs);
  }, [fetchDriverData]);

  const fetchTripsData = useCallback(async (force: boolean = false) => {
    if (tripsLoading) return;
    if (tripsLoaded && !force) return;

    setTripsLoading(true);
    try {
      const tripsRes = await driverApiClient.fetch('/api/driver/trips').catch(() => ({ success: false, trips: [] }));
      if (tripsRes.success) {
        setDriverTrips(tripsRes.trips || []);
        if (tripsRes.summary) {
          setEarningsSummary(tripsRes.summary);
        }
        if (tripsRes.monthlyBreakdown) {
          setMonthlyBreakdown(tripsRes.monthlyBreakdown);
        }
        if (tripsRes.currentMonthSummary) {
          setCurrentMonthSummary(tripsRes.currentMonthSummary);
        }
        if (tripsRes.previousMonthSummary) {
          setPreviousMonthSummary(tripsRes.previousMonthSummary);
        }
        setTripsLoaded(true);
      }
    } catch (err) {
      console.error('Failed to fetch trips data:', err);
    } finally {
      setTripsLoading(false);
    }
  }, [tripsLoading, tripsLoaded]);

  // Lazy-load trip history only when MY_TRIPS tab is opened
  useEffect(() => {
    if (activeBottomTab === 'MY_TRIPS' && !tripsLoaded && !tripsLoading) {
      fetchTripsData();
    }
  }, [activeBottomTab, tripsLoaded, tripsLoading, fetchTripsData]);

  useEffect(() => {
    // Initial fetch on mount
    fetchDriverData();

    // Start Realtime SSE Stream (guaranteed singleton connection)
    driverRealtimeClient.start();

    const unsubNew = driverRealtimeClient.on('DISPATCH_NEW', (newDispatch: any) => {
      setDispatches((prev) => {
        if (prev.some((d) => d.id === newDispatch.id)) return prev;
        return [newDispatch, ...prev];
      });
    });

    const unsubRevoke = driverRealtimeClient.on('DISPATCH_REVOKED', (data: any) => {
      setDispatches((prev) =>
        prev.filter((d) => d.id !== data.dispatchId && d.bookingId !== data.bookingId)
      );
    });

    const unsubTrip = driverRealtimeClient.on('TRIP_STATUS', () => {
      // Coalesce rapid trip status updates
      triggerDebouncedFetch(600);
      if (tripsLoadedRef.current) {
        fetchTripsData(true);
      }
    });

    // Gentle 60s background safety sync
    const interval = setInterval(() => {
      triggerDebouncedFetch(0);
    }, 60000);

    // AppState listener for background / foreground transitions
    const appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        driverRealtimeClient.start();
        triggerDebouncedFetch(500);
      }
    });

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      unsubNew();
      unsubRevoke();
      unsubTrip();
      clearInterval(interval);
      appStateSubscription.remove();
      driverRealtimeClient.stop();
    };
  }, [fetchDriverData, fetchTripsData, triggerDebouncedFetch]);

  const isTogglingDutyRef = useRef(false);

  const handleToggleOnline = async (val: boolean) => {
    // Prevent double taps while a toggle request is already in progress
    if (isTogglingDutyRef.current) return;
    isTogglingDutyRef.current = true;

    // Fast-path hardware / permission check only if going online
    if (val) {
      // Check if location services are already known to be disabled
      if (gpsState.status === 'SERVICES_DISABLED') {
        Alert.alert(
          'Location Services Required',
          'GPS/Location Services are currently disabled on your device. Please enable GPS in your device settings to go online and receive ride dispatches.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => locationTracker.openLocationSettings(),
            },
          ]
        );
        isTogglingDutyRef.current = false;
        return;
      }

      // If permissions haven't been granted yet, request them
      if (gpsState.status === 'PERMISSION_DENIED' || gpsState.status === 'NOT_STARTED') {
        const permResult = await locationTracker.requestPermissions();
        if (!permResult.granted) {
          if (permResult.status === 'SERVICES_DISABLED') {
            Alert.alert(
              'Location Services Required',
              'GPS/Location Services are currently disabled on your device. Please enable GPS in your device settings to go online and receive ride dispatches.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Open Settings',
                  onPress: () => locationTracker.openLocationSettings(),
                },
              ]
            );
          } else {
            Alert.alert(
              'Location Permission Required',
              'Location permission is required to detect nearby ride dispatches and navigate routes.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Settings',
                  onPress: () => Linking.openSettings(),
                },
              ]
            );
          }
          isTogglingDutyRef.current = false;
          return;
        }
      }
    }

    // 1. OPTIMISTIC 0ms UI FLIP
    const prevStatus = onlineStatus;
    setOnlineStatus(val);

    // 2. Immediate tracking start/stop
    if (val) {
      locationTracker.startIdleTracking();
    } else {
      locationTracker.stopTracking();
    }

    // 3. Background server synchronization with rollback on failure
    try {
      const res = await driverApiClient.fetch('/api/driver/toggle-online', {
        method: 'PATCH',
        body: JSON.stringify({ onlineStatus: val }),
      });

      if (!res.success) {
        // Rollback state
        setOnlineStatus(prevStatus);
        if (prevStatus) {
          locationTracker.startIdleTracking();
        } else {
          locationTracker.stopTracking();
        }
        Alert.alert('Status Error', res.message || 'Failed to update online status');
      }
    } catch (err: any) {
      // Rollback on network or server error (e.g. not verified)
      setOnlineStatus(prevStatus);
      if (prevStatus) {
        locationTracker.startIdleTracking();
      } else {
        locationTracker.stopTracking();
      }
      Alert.alert('Status Error', err.message || 'Failed to update online status');
    } finally {
      isTogglingDutyRef.current = false;
    }
  };

  const handleAcceptDispatch = async (dispatchId: string, bookingId: string) => {
    setAcceptingId(dispatchId);
    try {
      const res = await driverApiClient.fetch('/api/driver/dispatches/accept', {
        method: 'POST',
        body: JSON.stringify({ dispatchId, bookingId }),
      });

      if (res.success && res.booking) {
        // Start Active-Trip tier GPS tracking immediately
        locationTracker.startActiveTripTracking(bookingId);
        router.push({
          pathname: '/trip/en-route',
          params: { bookingId: res.booking.id },
        });
      } else if (res.alreadyTaken) {
        Alert.alert(
          'Ride Unavailable',
          'This ride was already accepted by another driver.'
        );
        fetchDriverData();
      }
    } catch (err: any) {
      if (err.status === 409) {
        Alert.alert('Ride Taken', 'This ride was already accepted by another driver.');
      } else {
        Alert.alert('Error', err.message || 'Failed to accept dispatch');
      }
      fetchDriverData();
    } finally {
      setAcceptingId(null);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out of Kandy Cabs Driver?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await driverApiClient.auth.logout();
          } catch (_) {
            // Ignore error
          }
          router.replace('/login');
        },
      },
    ]);
  };

  const openNavigationMap = (
    destinationLat?: number | null,
    destinationLng?: number | null,
    destinationAddress?: string
  ) => {
    const hasCoords = typeof destinationLat === 'number' && typeof destinationLng === 'number';
    const targetQuery = hasCoords
      ? `${destinationLat},${destinationLng}`
      : encodeURIComponent(destinationAddress || '');

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

  if (loading && !driver) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#ea580c" />
        <Text style={{ color: '#0f172a', marginTop: 12, fontWeight: '700' }}>Loading Driver Workspace...</Text>
      </View>
    );
  }

  // Display booking (either active booking or mock demo if none)
  const currentTrip = activeBooking;
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 20);

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={activeBottomTab === 'HOME' ? 'light-content' : 'dark-content'}
        backgroundColor={activeBottomTab === 'HOME' ? '#000000' : '#ffffff'}
        translucent={false}
      />

      {/* TOP HEADER SECTION */}
      {activeBottomTab === 'HOME' ? (
        /* FULL HERO BANNER ONLY FOR HOME TAB */
        <ImageBackground
          source={require('../assets/images/hero-banner.webp')}
          style={styles.heroBannerBackground}
          imageStyle={{ resizeMode: 'cover' }}
        >
          <View style={[styles.heroOverlay, { paddingTop: topInset + 6 }]}>
            {/* Top Brand Strip: Logo (Left) + Enlarged Profile Avatar (Right) */}
            <View style={styles.heroTopBar}>
              <View style={styles.heroBrandLeft}>
                <Image
                  source={require('../assets/images/logo-white.png')}
                  style={styles.kandyCabsLogo}
                  resizeMode="contain"
                />
                <View style={styles.chauffeurBadge}>
                  <Text style={styles.chauffeurBadgeText}>CHAUFFEUR</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.avatarRing}
                onPress={() => setActiveBottomTab('PROFILE')}
                activeOpacity={0.8}
              >
                {driver?.profilePhotoUrl ? (
                  <View style={styles.avatarPhotoClipper}>
                    <Image
                      source={{ uri: driver.profilePhotoUrl }}
                      style={styles.avatarImage}
                      resizeMode="cover"
                    />
                  </View>
                ) : (
                  <Text style={styles.avatarEmoji}>👨🏽‍✈️</Text>
                )}
                {hasPendingDocuments && (
                  <View style={styles.avatarPendingDot}>
                    <Text style={styles.avatarPendingDotText}>!</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Slogan + Driver Snapshot */}
            <View style={styles.heroContentRow}>
              {/* Left Slogan */}
              <View style={styles.heroSloganBox}>
                <Text style={styles.heroSloganWhite}>Drive Safe</Text>
                <Text style={styles.heroSloganOrange}>Drive Trusted</Text>
                <Text style={styles.heroSloganSub}>SAFE • RELIABLE • HASSLE FREE</Text>
              </View>

              {/* Right Driver Details */}
              <View style={styles.heroDriverBox}>
                <Text style={styles.heroDriverName} numberOfLines={1}>
                  {driver?.fullName || 'Mukesh'}
                </Text>
                <Text style={styles.heroVehiclePlate}>
                  {driver?.vehicle?.plateNumber ? driver.vehicle.plateNumber.toUpperCase() : 'KA 01 MJ 2023'}
                </Text>
                <Text style={styles.heroVehicleModel} numberOfLines={1}>
                  {driver?.vehicle
                    ? `${driver.vehicle.category} • ${driver.vehicle.fuelType || 'DIESEL'}`
                    : 'SEDAN • DIESEL'}
                </Text>
                <Text style={styles.heroTierBadge}>
                  {driver?.verificationStatus === 'APPROVED' ? '✓ Verified Partner' : '⏳ Verification In Review'}
                </Text>
              </View>
            </View>

            {/* Bottom Row across Hero: GPS Pill (Left) + Duty Pill (Right) */}
            <View style={styles.heroBottomBar}>
              <TouchableOpacity
                style={styles.heroGpsPill}
                onPress={() => {
                  if (gpsState.status === 'SERVICES_DISABLED' || gpsState.status === 'PERMISSION_DENIED') {
                    locationTracker.openLocationSettings();
                  } else {
                    locationTracker.forceImmediatePing();
                  }
                }}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.gpsDot,
                    gpsState.status === 'SERVICES_DISABLED' || gpsState.status === 'PERMISSION_DENIED'
                      ? { backgroundColor: '#ef4444' }
                      : currentCoords
                      ? onlineStatus
                        ? styles.gpsDotActive
                        : styles.gpsDotInactive
                      : { backgroundColor: '#f59e0b' },
                  ]}
                />
                <Text style={styles.heroGpsText} numberOfLines={1}>
                  {gpsState.status === 'SERVICES_DISABLED'
                    ? '⚠️ Please enable GPS'
                    : gpsState.status === 'PERMISSION_DENIED'
                    ? '⚠️ Location permission required'
                    : currentCoords
                    ? `📍 GPS: ${currentCoords.lat.toFixed(5)}, ${currentCoords.lng.toFixed(5)}`
                    : '⏳ Acquiring GPS...'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.dutyCapsule,
                  onlineStatus ? styles.dutyCapsuleOnline : styles.dutyCapsuleOffline,
                ]}
                onPress={() => handleToggleOnline(!onlineStatus)}
                activeOpacity={0.8}
              >
                <View style={[styles.dutyDot, { backgroundColor: onlineStatus ? '#10b981' : '#ef4444' }]} />
                <Text style={styles.dutyCapsuleText}>
                  {onlineStatus ? 'Online' : 'Offline'}
                </Text>
                <Text style={styles.dutyCapsuleArrow}>⌄</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ImageBackground>
      ) : (
        /* COMPACT LOGO HEADER ONLY FOR MY TRIPS, SUPPORT, AND PROFILE TABS (WHITE BG) */
        <View style={[styles.compactHeader, { paddingTop: topInset + 6 }]}>
          <View style={styles.heroTopBar}>
            <View style={styles.heroBrandLeft}>
              <Image
                source={require('../assets/images/logo.png')}
                style={styles.kandyCabsLogo}
                resizeMode="contain"
              />
              <View style={styles.chauffeurBadge}>
                <Text style={styles.chauffeurBadgeText}>CHAUFFEUR</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {/* Mini Duty Toggle Pill */}
              <TouchableOpacity
                style={[
                  styles.miniDutyBadge,
                  onlineStatus ? styles.miniDutyBadgeOnline : styles.miniDutyBadgeOffline,
                ]}
                onPress={() => handleToggleOnline(!onlineStatus)}
                activeOpacity={0.8}
              >
                <View style={[styles.dutyDot, { backgroundColor: onlineStatus ? '#10b981' : '#ef4444', marginRight: 0 }]} />
                <Text
                  style={[
                    styles.miniDutyText,
                    { color: onlineStatus ? '#059669' : '#dc2626' },
                  ]}
                >
                  {onlineStatus ? 'Online' : 'Offline'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.avatarRingCompact}
                onPress={() => setActiveBottomTab('PROFILE')}
                activeOpacity={0.8}
              >
                {driver?.profilePhotoUrl ? (
                  <View style={styles.avatarCompactPhotoClipper}>
                    <Image
                      source={{ uri: driver.profilePhotoUrl }}
                      style={styles.avatarImageCompact}
                      resizeMode="cover"
                    />
                  </View>
                ) : (
                  <Text style={styles.avatarEmojiCompact}>👨🏽‍✈️</Text>
                )}
                {hasPendingDocuments && (
                  <View style={styles.avatarPendingDotCompact}>
                    <Text style={styles.avatarPendingDotText}>!</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* MAIN SCROLLABLE BODY IN WHITE / BRIGHT CANVAS */}
      <ScrollView
        style={[
          styles.mainScrollView,
          activeBottomTab === 'HOME' && styles.mainScrollViewHome,
        ]}
        contentContainerStyle={[
          styles.scrollContent,
          activeBottomTab === 'HOME' && styles.scrollContentHome,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ============================================================ */}
        {/* TAB 1: HOME (Live Duty, Active Trip & Radar)                 */}
        {/* ============================================================ */}
        {activeBottomTab === 'HOME' && (
          <>
            {/* Top Priority KYC Incomplete Banner on Home Tab */}
            {hasPendingDocuments && (
              <View style={styles.homePendingKycBanner}>
                <View style={styles.homePendingKycHeader}>
                  <View style={styles.homePendingKycIconBox}>
                    <Text style={{ fontSize: 22 }}>⚠️</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.homePendingKycTitle}>KYC & Document Verification Required</Text>
                    <Text style={styles.homePendingKycSub}>
                      Please upload your Driver Profile Photo, Driving License, RC Book & 5-angle cab photos to complete verification.
                    </Text>
                  </View>
                </View>

                {/* Quick Status Chips */}
                <View style={styles.homePendingChipsRow}>
                  <View style={[styles.homePendingChip, driver?.profilePhotoUrl ? styles.homeChipDone : styles.homeChipPending]}>
                    <Text style={[styles.homeChipText, driver?.profilePhotoUrl ? styles.homeChipTextDone : styles.homeChipTextPending]}>
                      {driver?.profilePhotoUrl ? '✓ Profile Photo' : '⏳ Profile Photo'}
                    </Text>
                  </View>
                  <View style={[styles.homePendingChip, driver?.licenseDocUrl ? styles.homeChipDone : styles.homeChipPending]}>
                    <Text style={[styles.homeChipText, driver?.licenseDocUrl ? styles.homeChipTextDone : styles.homeChipTextPending]}>
                      {driver?.licenseDocUrl ? '✓ License DL' : '⏳ License DL'}
                    </Text>
                  </View>
                  <View style={[styles.homePendingChip, driver?.rcDocUrl ? styles.homeChipDone : styles.homeChipPending]}>
                    <Text style={[styles.homeChipText, driver?.rcDocUrl ? styles.homeChipTextDone : styles.homeChipTextPending]}>
                      {driver?.rcDocUrl ? '✓ RC Book' : '⏳ RC Book'}
                    </Text>
                  </View>
                  <View style={[styles.homePendingChip, driver?.insuranceDocUrl ? styles.homeChipDone : styles.homeChipPending]}>
                    <Text style={[styles.homeChipText, driver?.insuranceDocUrl ? styles.homeChipTextDone : styles.homeChipTextPending]}>
                      {driver?.insuranceDocUrl ? '✓ Insurance' : '⏳ Insurance'}
                    </Text>
                  </View>
                  {(() => {
                    const photos = Array.isArray(driver?.vehiclePhotos) ? driver.vehiclePhotos : [];
                    const validPhotos = photos.filter((p: string) => p && !p.includes('placehold.co') && p.trim().length > 0);
                    const hasAll5 = photos.length === 5 && validPhotos.length === 5;
                    return (
                      <View style={[styles.homePendingChip, hasAll5 ? styles.homeChipDone : styles.homeChipPending]}>
                        <Text style={[styles.homeChipText, hasAll5 ? styles.homeChipTextDone : styles.homeChipTextPending]}>
                          {hasAll5 ? '✓ 5 Cab Photos' : '⏳ 5 Cab Photos'}
                        </Text>
                      </View>
                    );
                  })()}
                </View>

                <TouchableOpacity
                  style={styles.homeUploadDocsBtn}
                  onPress={() => router.push('/documents')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.homeUploadDocsBtnText}>📤 UPLOAD KYC & CAB PHOTOS NOW →</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Top Sub-Tab Bar on White Card (Only shown when there is an active trip) */}
            {currentTrip && (
              <View style={styles.cardWrapper}>
                <View style={styles.subTabBar}>
                  <TouchableOpacity
                    style={[styles.subTabItem, activeCardTab === 'MY_TRIPS' && styles.subTabItemActive]}
                    onPress={() => setActiveCardTab('MY_TRIPS')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.subTabEmoji}>🚗</Text>
                    <Text style={[styles.subTabText, activeCardTab === 'MY_TRIPS' && styles.subTabTextActive]}>
                      My Trips
                    </Text>
                    {activeCardTab === 'MY_TRIPS' && <View style={styles.subTabUnderline} />}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.subTabItem, activeCardTab === 'UPCOMING' && styles.subTabItemActive]}
                    onPress={() => setActiveCardTab('UPCOMING')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.subTabEmoji}>📅</Text>
                    <Text style={[styles.subTabText, activeCardTab === 'UPCOMING' && styles.subTabTextActive]}>
                      Upcoming
                    </Text>
                    {activeCardTab === 'UPCOMING' && <View style={styles.subTabUnderline} />}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.subTabItem, activeCardTab === 'HISTORY' && styles.subTabItemActive]}
                    onPress={() => setActiveCardTab('HISTORY')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.subTabEmoji}>🕒</Text>
                    <Text style={[styles.subTabText, activeCardTab === 'HISTORY' && styles.subTabTextActive]}>
                      History
                    </Text>
                    {activeCardTab === 'HISTORY' && <View style={styles.subTabUnderline} />}
                  </TouchableOpacity>
                </View>

                {/* CARD BODY: ACTIVE TRIP */}
                {activeCardTab === 'MY_TRIPS' ? (
                  <View style={styles.tripCardContent}>
                    {/* Top Row: Booking ID + ON ROUTE Badge */}
                    <View style={styles.bookingTopRow}>
                      <View>
                        <Text style={styles.bookingIdLabel}>Booking ID</Text>
                        <Text style={styles.bookingIdNumber}>{currentTrip.humanReadableRef}</Text>
                      </View>
                      <View style={styles.onRouteBadge}>
                        <Text style={styles.onRouteBadgeText}>
                          {currentTrip.status === BookingStatus.TRIP_STARTED ? 'TRIP ACTIVE' : 'ON ROUTE'}
                        </Text>
                      </View>
                    </View>

                    {/* Stepper Route */}
                    <View style={styles.stepperContainer}>
                      <View style={[styles.stepperLeft, { flex: 1 }]}>
                        <View style={styles.stepPoint}>
                          <View style={styles.pickupCircle} />
                          <View style={styles.stepTextGroup}>
                            <Text style={styles.locationTitle}>{currentTrip.pickupAddress}</Text>
                            <Text style={styles.locationSubtitle}>Pickup Location</Text>
                          </View>
                        </View>

                        <View style={styles.dashedTrail} />

                        <View style={styles.stepPoint}>
                          <View style={styles.dropCircle} />
                          <View style={styles.stepTextGroup}>
                            <Text style={styles.locationTitle}>{currentTrip.dropAddress}</Text>
                            <Text style={styles.locationSubtitle}>Destination</Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    <View style={styles.cardDivider} />

                    {/* 2-Column Info Grid */}
                    <View style={styles.infoGrid}>
                      {/* Date & Time */}
                      <View style={styles.infoCol}>
                        <View style={styles.infoColHeader}>
                          <Text style={styles.infoIcon}>📅</Text>
                          <Text style={styles.infoLabel}>Pickup Date & Time</Text>
                        </View>
                        <Text style={styles.infoValue}>
                          {new Date(currentTrip.scheduledAt || currentTrip.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}, {new Date(currentTrip.scheduledAt || currentTrip.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>

                      {/* Customer */}
                      <View style={styles.infoCol}>
                        <View style={styles.infoColHeader}>
                          <Text style={styles.infoIcon}>👥</Text>
                          <Text style={styles.infoLabel}>Customer</Text>
                        </View>
                        <View style={styles.customerRowWithCall}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.infoValue} numberOfLines={1}>
                              {currentTrip.customer?.user?.fullName || 'Stewart Gangera'}
                            </Text>
                            <Text style={styles.customerPhoneSub}>
                              {currentTrip.customerPhoneReleased && currentTrip.customer?.user?.phone
                                ? currentTrip.customer.user.phone
                                : '9342759612'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Fare & Advance */}
                    <View style={[styles.infoGrid, { marginTop: 12 }]}>
                      <View style={styles.infoCol}>
                        <View style={styles.infoColHeader}>
                          <Text style={styles.infoIcon}>₹</Text>
                          <Text style={styles.infoLabel}>Total Fare</Text>
                        </View>
                        <Text style={styles.infoValueLarge}>
                          ₹{Number(currentTrip.totalEstimatedFare || currentTrip.finalPrice || 4250).toLocaleString('en-IN')}
                        </Text>
                      </View>

                      <View style={styles.infoCol}>
                        <View style={styles.infoColHeader}>
                          <Text style={styles.infoIcon}>💳</Text>
                          <Text style={styles.infoLabel}>Advance Paid</Text>
                        </View>
                        <Text style={styles.infoValueGreen}>
                          ₹{Number(currentTrip.advancePaid || currentTrip.driverAllowance || 1063).toLocaleString('en-IN')} (PAID)
                        </Text>
                      </View>
                    </View>

                    {/* 2 Primary Action Buttons */}
                    <View style={styles.primaryButtonsRow}>
                      <TouchableOpacity
                        style={styles.greenStartTripBtn}
                        onPress={() => {
                          if (
                            currentTrip.status === BookingStatus.DRIVER_ACCEPTED ||
                            currentTrip.status === BookingStatus.DRIVER_EN_ROUTE
                          ) {
                            router.push({ pathname: '/trip/en-route', params: { bookingId: currentTrip.id } });
                          } else if (currentTrip.status === BookingStatus.TRIP_STARTED) {
                            router.push({ pathname: '/trip/active', params: { bookingId: currentTrip.id } });
                          }
                        }}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.greenBtnIcon}>✈</Text>
                        <Text style={styles.greenBtnText}>
                          {currentTrip.status === BookingStatus.TRIP_STARTED ? 'MANAGE TRIP' : 'START TRIP'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.creamViewRouteBtn}
                        onPress={() => openNavigationMap(currentTrip.dropLat, currentTrip.dropLng, currentTrip.dropAddress)}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.creamBtnIcon}>📍</Text>
                        <Text style={styles.creamBtnText}>VIEW ROUTE</Text>
                      </TouchableOpacity>
                    </View>

                    {/* 3 Quick Action Buttons */}
                    <View style={styles.quickActionsRow}>
                      <TouchableOpacity
                        style={styles.quickActionPill}
                        onPress={() => Linking.openURL(`tel:${currentTrip.customer?.user?.phone || '9342759612'}`)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.quickActionIcon}>📞</Text>
                        <Text style={styles.quickActionText}>CALL CUSTOMER</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.quickActionPill}
                        onPress={() => Linking.openURL(`sms:${currentTrip.customer?.user?.phone || '9342759612'}`)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.quickActionIcon}>✉️</Text>
                        <Text style={styles.quickActionText}>MESSAGE</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.quickActionPill}
                        onPress={() => {
                          Alert.alert(
                            `Trip: ${currentTrip.humanReadableRef}`,
                            `Pickup: ${currentTrip.pickupAddress}\nDrop: ${currentTrip.dropAddress}\nDistance: ${currentTrip.distanceKm} km\nTotal Fare: ₹${currentTrip.totalEstimatedFare || 4250}\nDriver Allowance: ₹${currentTrip.driverAllowance || 1063}`
                          );
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.quickActionIcon}>📄</Text>
                        <Text style={styles.quickActionText}>TRIP DETAILS</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : activeCardTab === 'UPCOMING' ? (
                  <View style={styles.emptyCardInner}>
                    <Text style={styles.emptyCardInnerEmoji}>📅</Text>
                    <Text style={styles.emptyCardInnerTitle}>No Upcoming Scheduled Trips</Text>
                    <Text style={styles.emptyCardInnerSubtitle}>New advanced bookings allocated to you will appear here.</Text>
                  </View>
                ) : (
                  <View style={styles.emptyCardInner}>
                    <Text style={styles.emptyCardInnerEmoji}>🕒</Text>
                    <Text style={styles.emptyCardInnerTitle}>Recent Trip History</Text>
                    <Text style={styles.emptyCardInnerSubtitle}>
                      {driverTrips.length} completed trips recorded. Switch to the 'My Trips' bottom tab for full accounting.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Broadcast Dispatches List & Radar Section */}
            {!onlineStatus ? (
              <View style={styles.offlineBoxWhite}>
                <View style={styles.dispatchesCardHeader}>
                  <Text style={styles.dispatchesTitle}>
                    Incoming Broadcast Dispatches ({dispatches.length})
                  </Text>
                  <View style={styles.listeningBadgeLight}>
                    <View style={[styles.listeningDot, { backgroundColor: '#94a3b8' }]} />
                    <Text style={styles.listeningTextLight}>Paused</Text>
                  </View>
                </View>

                <View style={styles.cardHeaderDivider} />

                <View style={styles.offlineCardBody}>
                  <Text style={styles.offlineEmoji}>⏸️</Text>
                  <Text style={styles.offlineTitleDark}>You are currently OFF-DUTY</Text>
                  <Text style={styles.offlineSubtitleDark}>
                    Toggle the green Online status at the top to start receiving nearby ride dispatches.
                  </Text>
                  <TouchableOpacity
                    style={styles.goOnlineBtnOrange}
                    onPress={() => handleToggleOnline(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.goOnlineBtnText}>🟢 GO ON-DUTY NOW</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : dispatches.length === 0 && !currentTrip ? (
              /* Radar Scanner in Modern White Card */
              <View style={styles.radarCardWhite}>
                <View style={styles.dispatchesCardHeader}>
                  <Text style={styles.dispatchesTitle}>
                    Incoming Broadcast Dispatches ({dispatches.length})
                  </Text>
                  <View style={styles.listeningBadgeLight}>
                    <View style={[styles.listeningDot, { backgroundColor: '#10b981' }]} />
                    <Text style={styles.listeningTextLight}>Listening</Text>
                  </View>
                </View>

                <View style={styles.cardHeaderDivider} />

                <View style={styles.radarCardBody}>
                  <View style={styles.radarIconCircleDark}>
                    <Text style={styles.radarEmoji}>📡</Text>
                  </View>
                  <Text style={styles.radarTitleDark}>Scanning for nearby ride bookings...</Text>
                  <Text style={styles.radarSubtitleDark}>
                    New trip broadcasts matching your vehicle category ({driver?.vehicle?.category?.toUpperCase() || 'SEDAN'}) will appear here instantly.
                  </Text>
                  <View style={styles.radarPillOrange}>
                    <View style={styles.radarPulseDot} />
                    <Text style={styles.radarPillTextOrange}>Live Dispatch Radar Active</Text>
                  </View>

                  {hasPendingDocuments && (
                    <TouchableOpacity
                      style={styles.radarKycNoticeBox}
                      onPress={() => router.push('/documents')}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.radarKycNoticeIcon}>⚠️</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.radarKycNoticeTitle}>KYC Verification Incomplete</Text>
                        <Text style={styles.radarKycNoticeSub}>
                          Upload your Driver Profile Photo, DL, RC & Cab photos to accept rides.
                        </Text>
                      </View>
                      <View style={styles.radarKycNoticeBtn}>
                        <Text style={styles.radarKycNoticeBtnText}>Upload ›</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                <View style={styles.dispatchesSectionHeader}>
                  <Text style={styles.dispatchesTitle}>
                    Incoming Broadcast Dispatches ({dispatches.length})
                  </Text>
                  <View style={styles.listeningBadgeLight}>
                    <View style={[styles.listeningDot, { backgroundColor: onlineStatus ? '#10b981' : '#94a3b8' }]} />
                    <Text style={styles.listeningTextLight}>{onlineStatus ? 'Listening' : 'Paused'}</Text>
                  </View>
                </View>

                {dispatches.map((d) => {
                const b = d.booking;
                const isAccepting = acceptingId === d.id;

                return (
                  <View key={d.id} style={styles.floatingDispatchCardWhite}>
                    <View style={styles.dispatchHeaderRow}>
                      <View>
                        <View style={styles.newAlertBadge}>
                          <Text style={styles.newAlertText}>⚡ NEW RIDE ALERT</Text>
                        </View>
                        <Text style={styles.dispatchRefText}>{b.humanReadableRef}</Text>
                      </View>
                      <View style={styles.distanceBadgeLight}>
                        <Text style={styles.distanceBadgeTextLight}>📍 {b.distanceKm} km</Text>
                      </View>
                    </View>

                    {/* Stepper Route */}
                    <View style={styles.stepperContainer}>
                      <View style={styles.stepperLeft}>
                        <View style={styles.stepPoint}>
                          <View style={styles.pickupCircle} />
                          <View style={styles.stepTextGroup}>
                            <Text style={styles.locationTitle}>{b.pickupAddress}</Text>
                            <Text style={styles.locationSubtitle}>Pickup Location</Text>
                          </View>
                        </View>
                        <View style={styles.dashedTrail} />
                        <View style={styles.stepPoint}>
                          <View style={styles.dropCircle} />
                          <View style={styles.stepTextGroup}>
                            <Text style={styles.locationTitle}>{b.dropAddress}</Text>
                            <Text style={styles.locationSubtitle}>Destination</Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Passenger & Fare Row */}
                    <View style={styles.dispatchPassengerRowLight}>
                      <Text style={styles.dispatchPassengerNameDark}>
                        👤 {b.customer?.user?.fullName || 'Customer'}
                      </Text>
                      <Text style={styles.dispatchTripTypeOrange}>{b.tripType}</Text>
                    </View>

                    {/* Call-style Slide to Accept Ride Slider */}
                    <SlideToAccept
                      onAccept={() => handleAcceptDispatch(d.id, b.id)}
                      isAccepting={isAccepting}
                      title="SLIDE RIGHT TO ACCEPT"
                      acceptingTitle="ACCEPTING RIDE..."
                    />
                  </View>
                );
              })}
            </View>
          )}
          </>
        )}

        {/* ============================================================ */}
        {/* TAB 2: MY TRIPS (Monthly Breakdown & Settlement Receipts)    */}
        {/* ============================================================ */}
        {activeBottomTab === 'MY_TRIPS' && (
          <View style={styles.tabSectionContainer}>
            {tripsLoading && !tripsLoaded ? (
              <View style={{ paddingVertical: 48, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color="#ea580c" />
                <Text style={{ color: '#0f172a', marginTop: 14, fontWeight: '700', fontSize: 14 }}>
                  Loading Trip Accounting & History...
                </Text>
                <Text style={{ color: '#64748b', marginTop: 4, fontSize: 12 }}>
                  Fetching settlements and monthly breakdowns
                </Text>
              </View>
            ) : (
              <>
                {/* Month Selector Pills */}
                <View style={styles.monthSelectorBoxWhite}>
                  <Text style={styles.monthSelectorLabelDark}>📅 SELECT BILLING MONTH</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthPillsScroll}>
                    {currentMonthSummary && (
                      <TouchableOpacity
                        style={[styles.monthPillWhite, selectedMonthKey === currentMonthSummary.monthKey && styles.monthPillActiveOrange]}
                        onPress={() => setSelectedMonthKey(currentMonthSummary.monthKey)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.monthPillTextDark, selectedMonthKey === currentMonthSummary.monthKey && styles.monthPillTextWhite]}>
                          ⚡ {currentMonthSummary.shortMonth} (This Month)
                        </Text>
                      </TouchableOpacity>
                    )}

                    {previousMonthSummary && (
                      <TouchableOpacity
                        style={[styles.monthPillWhite, selectedMonthKey === previousMonthSummary.monthKey && styles.monthPillActiveOrange]}
                        onPress={() => setSelectedMonthKey(previousMonthSummary.monthKey)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.monthPillTextDark, selectedMonthKey === previousMonthSummary.monthKey && styles.monthPillTextWhite]}>
                          ⏮️ {previousMonthSummary.shortMonth} (Last Month)
                        </Text>
                      </TouchableOpacity>
                    )}

                    {monthlyBreakdown
                      .filter((m) => m.monthKey !== currentMonthSummary?.monthKey && m.monthKey !== previousMonthSummary?.monthKey)
                      .map((m) => (
                        <TouchableOpacity
                          key={m.monthKey}
                          style={[styles.monthPillWhite, selectedMonthKey === m.monthKey && styles.monthPillActiveOrange]}
                          onPress={() => setSelectedMonthKey(m.monthKey)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.monthPillTextDark, selectedMonthKey === m.monthKey && styles.monthPillTextWhite]}>
                            🗓️ {m.shortMonth}
                          </Text>
                        </TouchableOpacity>
                      ))}

                    <TouchableOpacity
                      style={[styles.monthPillWhite, selectedMonthKey === 'ALL' && styles.monthPillActiveOrange]}
                      onPress={() => setSelectedMonthKey('ALL')}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.monthPillTextDark, selectedMonthKey === 'ALL' && styles.monthPillTextWhite]}>
                        🌐 All Time
                      </Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>

                {/* KPI Summary Card */}
                <View style={styles.earningsKpiCardWhite}>
                  <View style={styles.kpiHeaderRow}>
                    <Text style={styles.kpiHeaderLabelOrange}>
                      {selectedMonthKey === 'ALL'
                        ? '🌐 LIFETIME TOTAL EARNINGS'
                        : selectedMonthKey === currentMonthSummary?.monthKey
                        ? `📅 THIS MONTH (${(currentMonthSummary.monthName || '').toUpperCase()})`
                        : `🗓️ ${(selectedMonthKey).toUpperCase()} EARNINGS`}
                    </Text>
                    <View style={styles.kpiTripsCountBadgeLight}>
                      <Text style={styles.kpiTripsCountTextGreen}>{activeKpiSummary.completedTripsCount || 0} Completed Trips</Text>
                    </View>
                  </View>

                  <Text style={styles.kpiTotalEarningsAmountDark}>
                    ₹{Number(activeKpiSummary.totalEarnings || 0).toLocaleString('en-IN')}
                  </Text>

                  <View style={styles.kpiSubBreakdownRow}>
                    <Text style={styles.kpiSubTextDark}>
                      🚗 Driver Allowance: ₹{Number(activeKpiSummary.totalAllowanceEarned || 0).toLocaleString('en-IN')}
                    </Text>
                    <Text style={styles.kpiSubTextDark}>
                      • 💰 Payee: ₹{Number(activeKpiSummary.totalPayeeEarned || 0).toLocaleString('en-IN')}
                    </Text>
                  </View>

                  <View style={styles.kpiSettlementRowLight}>
                    <View style={styles.kpiSettledPillLight}>
                      <Text style={styles.kpiSettledLabel}>✓ SETTLED (PAID)</Text>
                      <Text style={styles.kpiSettledAmountDark}>₹{Number(activeKpiSummary.totalSettled || 0).toLocaleString('en-IN')}</Text>
                    </View>
                    <View style={styles.kpiPendingPillLight}>
                      <Text style={styles.kpiPendingLabel}>⏳ PENDING PAYEE</Text>
                      <Text style={styles.kpiPendingAmountDark}>₹{Number(activeKpiSummary.totalPending || 0).toLocaleString('en-IN')}</Text>
                    </View>
                  </View>
                </View>

                {/* Trips List */}
                <View style={styles.tripsHeaderRow}>
                  <Text style={styles.tripsHeaderTitleDark}>
                    Trip History ({filteredTrips.length}{selectedMonthKey !== 'ALL' ? ' in selected month' : ''})
                  </Text>
                  <TouchableOpacity onPress={() => fetchTripsData(true)} style={styles.refreshBtnLight} disabled={tripsLoading}>
                    <Text style={styles.refreshBtnTextOrange}>
                      {tripsLoading ? '⏳ Refreshing...' : '🔄 Refresh'}
                    </Text>
                  </TouchableOpacity>
                </View>

            {filteredTrips.length === 0 ? (
              <View style={styles.emptyCardWhite}>
                <Text style={styles.emptyCardEmoji}>🧾</Text>
                <Text style={styles.emptyCardTitleDark}>No Trips in Selected Period</Text>
                <Text style={styles.emptyCardSubtitleDark}>
                  {selectedMonthKey === 'ALL'
                    ? 'Your assigned rides and payment settlements will appear here.'
                    : `No completed rides recorded for ${selectedMonthKey}. Select another month or All Time.`}
                </Text>
              </View>
            ) : (
              filteredTrips.map((trip) => {
                const isSettled = trip.driverPaymentStatus === 'PAID';
                const isCompleted = trip.status === 'TRIP_COMPLETED';

                return (
                  <View key={trip.id} style={styles.tripCardWhiteBorder}>
                    <View style={styles.tripCardTopRow}>
                      <View>
                        <Text style={styles.tripCardRef}>{trip.humanReadableRef}</Text>
                        <Text style={styles.tripCardDate}>
                          {new Date(trip.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })} • {trip.tripType}
                        </Text>
                      </View>
                      <View style={styles.tripStatusBadgeGroup}>
                        <View style={[styles.tripBadgePill, isCompleted ? styles.badgeGreen : styles.badgeAmber]}>
                          <Text style={isCompleted ? styles.badgeTextGreen : styles.badgeTextAmber}>
                            {trip.status.replace(/_/g, ' ')}
                          </Text>
                        </View>
                        <View style={[styles.settledBadgePill, isSettled ? styles.badgeGreen : styles.badgeAmber]}>
                          <Text style={isSettled ? styles.badgeTextGreen : styles.badgeTextAmber}>
                            {isSettled ? '✓ SETTLED (PAID)' : '⏳ NOT PAID (PENDING)'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.tripCardRoute}>
                      <Text style={styles.tripRouteLine} numberOfLines={1}>
                        📍 <Text style={{ fontWeight: '700' }}>Pickup:</Text> {trip.pickupAddress}
                      </Text>
                      <Text style={styles.tripRouteLine} numberOfLines={1}>
                        🏁 <Text style={{ fontWeight: '700' }}>Drop:</Text> {trip.dropAddress}
                      </Text>
                      <Text style={styles.tripDistanceLine}>
                        🚗 Distance: {trip.distanceKm} km {trip.tollAmount > 0 ? `• Toll: ₹${trip.tollAmount}` : ''} {trip.parkingAmount > 0 ? `• Parking: ₹${trip.parkingAmount}` : ''}
                      </Text>
                    </View>

                    <View style={styles.tripPayoutRow}>
                      <Text style={styles.tripPayoutLabel}>Driver Allowance:</Text>
                      <Text style={styles.tripPayoutVal}>₹{Number(trip.driverAllowance || 0).toLocaleString('en-IN')}</Text>
                    </View>
                    <View style={styles.tripPayoutRow}>
                      <Text style={styles.tripPayoutLabel}>Driver Final Payee:</Text>
                      <Text style={styles.tripPayoutVal}>₹{Number(trip.driverPayeeAmount || 0).toLocaleString('en-IN')}</Text>
                    </View>
                    <View style={[styles.tripPayoutRow, { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 4, marginTop: 4 }]}>
                      <Text style={[styles.tripPayoutLabel, { fontWeight: '800', color: '#0f172a' }]}>Total Driver Earnings:</Text>
                      <Text style={styles.tripPayoutValBold}>₹{Number(trip.totalEarnings || 0).toLocaleString('en-IN')}</Text>
                    </View>
                  </View>
                );
              })
            )}
            </>
          )}
          </View>
        )}

        {/* ============================================================ */}
        {/* TAB 3: SUPPORT (24x7 Helpline, WhatsApp & SOS)               */}
        {/* ============================================================ */}
        {activeBottomTab === 'SUPPORT' && (
          <View style={styles.tabSectionContainer}>
            <View style={styles.supportHeaderCardWhite}>
              <Text style={styles.supportHeaderEmoji}>🎧</Text>
              <Text style={styles.supportHeaderTitleDark}>Driver Partner Support Desk</Text>
              <Text style={styles.supportHeaderSubtitleDark}>
                We are here 24 hours a day, 7 days a week to ensure safe and comfortable driving operations.
              </Text>
            </View>

            {/* Helpline Card */}
            <TouchableOpacity
              style={styles.supportActionCardWhite}
              onPress={() => Linking.openURL('tel:+918888888888')}
              activeOpacity={0.8}
            >
              <View style={styles.supportActionIconCircleGreen}>
                <Text style={styles.supportActionIcon}>📞</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.supportActionTitle}>24x7 Driver Partner Helpline</Text>
                <Text style={styles.supportActionSubtitle}>Call dispatch desk for immediate roadside or trip assistance</Text>
                <Text style={styles.supportActionPhone}>+91 88888 88888 (Toll Free)</Text>
              </View>
              <Text style={styles.supportActionArrow}>›</Text>
            </TouchableOpacity>

            {/* WhatsApp Card */}
            <TouchableOpacity
              style={styles.supportActionCardWhite}
              onPress={() => Linking.openURL('https://wa.me/918888888888?text=Hello%20Kandy%20Cabs%20Driver%20Support')}
              activeOpacity={0.8}
            >
              <View style={styles.supportActionIconCircleEmerald}>
                <Text style={styles.supportActionIcon}>💬</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.supportActionTitle}>WhatsApp Dispatch Desk</Text>
                <Text style={styles.supportActionSubtitle}>Send trip screenshots, toll receipts, or ask billing questions</Text>
                <Text style={styles.supportActionEmeraldText}>Instant WhatsApp Response</Text>
              </View>
              <Text style={styles.supportActionArrow}>›</Text>
            </TouchableOpacity>

            {/* Emergency SOS */}
            <TouchableOpacity
              style={styles.supportSosCard}
              onPress={() => {
                Alert.alert(
                  '🚨 Emergency SOS',
                  'Are you in immediate physical danger or an accident? Tap below to call emergency services.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Call 112 Emergency', style: 'destructive', onPress: () => Linking.openURL('tel:112') },
                  ]
                );
              }}
              activeOpacity={0.8}
            >
              <View style={styles.sosIconBox}>
                <Text style={styles.sosIcon}>🚨</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sosTitle}>Emergency SOS & Police Beacon</Text>
                <Text style={styles.sosSubtitle}>Direct hotline to 112 & Kandy Emergency Incident Team</Text>
              </View>
            </TouchableOpacity>

            {/* Driver Policy & FAQs */}
            <View style={styles.faqBoxWhite}>
              <Text style={styles.faqTitleOrange}>Driver Partner Guidelines:</Text>
              <Text style={styles.faqItemDark}>• <Text style={{ fontWeight: '700' }}>Night Charges:</Text> ₹400/night applies for trips starting or ending between 10 PM and 6 AM.</Text>
              <Text style={styles.faqItemDark}>• <Text style={{ fontWeight: '700' }}>Toll & Parking:</Text> Always retain fastag receipts to claim toll balance reimbursement.</Text>
              <Text style={styles.faqItemDark}>• <Text style={{ fontWeight: '700' }}>Customer OTP:</Text> Never begin a ride before verifying the passenger's 4-digit code.</Text>
            </View>
          </View>
        )}

        {/* ============================================================ */}
        {/* TAB 4: PROFILE (Credentials, Vehicle & Sign Out)            */}
        {/* ============================================================ */}
        {activeBottomTab === 'PROFILE' && (
          <View style={styles.tabSectionContainer}>
            {/* Pending Alert Banner if any KYC document is pending */}
            {hasPendingDocuments && (
              <TouchableOpacity
                style={styles.pendingKycAlertCard}
                onPress={() => router.push('/documents')}
                activeOpacity={0.85}
              >
                <View style={styles.pendingKycAlertIconBox}>
                  <Text style={{ fontSize: 20 }}>⚠️</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pendingKycAlertTitle}>KYC Verification Incomplete</Text>
                  <Text style={styles.pendingKycAlertSub}>Upload pending certificates or 5-angle vehicle photos</Text>
                </View>
                <View style={styles.pendingKycActionBtn}>
                  <Text style={styles.pendingKycActionText}>Upload ›</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Driver Card */}
            <View style={styles.profileHeaderCardWhite}>
              <View style={styles.profileAvatarLarge}>
                {driver?.profilePhotoUrl ? (
                  <Image
                    source={{ uri: driver.profilePhotoUrl }}
                    style={styles.profileAvatarPhotoLarge}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={{ fontSize: 36 }}>👨🏽‍✈️</Text>
                )}
              </View>
              <Text style={styles.profileDriverNameDark}>{driver?.fullName || 'Driver Partner'}</Text>
              <Text style={styles.profileDriverPhoneDark}>📱 +91 {driver?.phone || '8888888888'}</Text>
              <View style={styles.profileTierBadgeRow}>
                <View style={driver?.verificationStatus === 'APPROVED' ? styles.verifiedBadgeLight : styles.pendingBadgeLight}>
                  <Text style={driver?.verificationStatus === 'APPROVED' ? styles.verifiedBadgeText : styles.pendingBadgeText}>
                    {driver?.verificationStatus === 'APPROVED' ? '✓ Verified Partner' : '⏳ Verification Pending'}
                  </Text>
                </View>
                <View style={styles.ratingBadgeLight}>
                  <Text style={styles.ratingBadgeText}>⭐ 4.9 Rating</Text>
                </View>
              </View>
            </View>

            {/* Vehicle Card */}
            <View style={styles.profileSectionCardWhite}>
              <Text style={styles.profileSectionTitle}>🚕 ASSIGNED CAB DETAILS</Text>
              <View style={styles.profileDetailRow}>
                <Text style={styles.profileDetailLabel}>Vehicle Plate:</Text>
                <Text style={styles.profileDetailValueBold}>
                  {driver?.vehicle?.plateNumber ? driver.vehicle.plateNumber.toUpperCase() : 'KA 01 MJ 2023'}
                </Text>
              </View>
              <View style={styles.profileDetailRow}>
                <Text style={styles.profileDetailLabel}>Category:</Text>
                <Text style={styles.profileDetailValue}>{driver?.vehicle?.category || 'SEDAN'}</Text>
              </View>
              <View style={styles.profileDetailRow}>
                <Text style={styles.profileDetailLabel}>Fuel / Emission:</Text>
                <Text style={styles.profileDetailValue}>{driver?.vehicle?.fuelType || 'CNG / Green Compliant'}</Text>
              </View>
              <View style={styles.profileDetailRow}>
                <Text style={styles.profileDetailLabel}>Seating Capacity:</Text>
                <Text style={styles.profileDetailValue}>
                  {driver?.vehicle?.seatCount ? `${driver.vehicle.seatCount} Passenger Seats` : '4 Passenger Seats'}
                </Text>
              </View>
            </View>

            {/* Verification Documents */}
            <View style={styles.profileSectionCardWhite}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={styles.profileSectionTitle}>📑 DOCUMENT BADGES</Text>
                <TouchableOpacity
                  style={styles.uploadBadgeBtn}
                  onPress={() => router.push('/documents')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.uploadBadgeBtnText}>📤 Upload / Edit</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.docRow}>
                <Text style={styles.docName}>Driver Profile Photo (Portrait / Selfie)</Text>
                <Text
                  style={
                    driver?.profilePhotoUrl
                      ? styles.docStatusGreen
                      : styles.docStatusAmber
                  }
                >
                  {driver?.verificationStatus === 'APPROVED' && driver?.profilePhotoUrl
                    ? '✓ Verified'
                    : driver?.profilePhotoUrl
                    ? '✓ Attached'
                    : '⏳ Pending'}
                </Text>
              </View>
              <View style={styles.docRow}>
                <Text style={styles.docName}>Driving License (DL): {driver?.licenseNumber || 'KA 202612356'}</Text>
                <Text
                  style={
                    driver?.licenseDocUrl
                      ? styles.docStatusGreen
                      : styles.docStatusAmber
                  }
                >
                  {driver?.verificationStatus === 'APPROVED' && driver?.licenseDocUrl
                    ? '✓ Verified'
                    : driver?.licenseDocUrl
                    ? '✓ Attached'
                    : '⏳ Pending'}
                </Text>
              </View>
              <View style={styles.docRow}>
                <Text style={styles.docName}>RC Certificate</Text>
                <Text
                  style={
                    driver?.rcDocUrl
                      ? styles.docStatusGreen
                      : styles.docStatusAmber
                  }
                >
                  {driver?.verificationStatus === 'APPROVED' && driver?.rcDocUrl
                    ? '✓ Verified'
                    : driver?.rcDocUrl
                    ? '✓ Attached'
                    : '⏳ Pending'}
                </Text>
              </View>
              <View style={styles.docRow}>
                <Text style={styles.docName}>Vehicle Insurance & Fitness</Text>
                <Text
                  style={
                    driver?.insuranceDocUrl
                      ? styles.docStatusGreen
                      : styles.docStatusAmber
                  }
                >
                  {driver?.verificationStatus === 'APPROVED' && driver?.insuranceDocUrl
                    ? '✓ Active'
                    : driver?.insuranceDocUrl
                    ? '✓ Attached'
                    : '⏳ Pending'}
                </Text>
              </View>
              <View style={styles.docRow}>
                <Text style={styles.docName}>Vehicle Photos (5 Angles)</Text>
                {(() => {
                  const photos = Array.isArray(driver?.vehiclePhotos) ? driver.vehiclePhotos : [];
                  const validPhotos = photos.filter((p: string) => p && !p.includes('placehold.co') && p.trim().length > 0);
                  const hasAll5 = photos.length === 5 && validPhotos.length === 5;
                  const isApproved = driver?.verificationStatus === 'APPROVED';

                  return (
                    <Text style={hasAll5 ? styles.docStatusGreen : styles.docStatusAmber}>
                      {hasAll5
                        ? isApproved
                          ? '✓ Active'
                          : '✓ Attached'
                        : '⏳ Pending'}
                    </Text>
                  );
                })()}
              </View>

              <TouchableOpacity
                style={styles.fullUploadBtnOrange}
                onPress={() => router.push('/documents')}
                activeOpacity={0.85}
              >
                <Text style={styles.fullUploadBtnIcon}>📸</Text>
                <Text style={styles.fullUploadBtnText}>UPLOAD KYC & 5 VEHICLE ANGLE PHOTOS</Text>
              </TouchableOpacity>
            </View>

            {/* Bank Payout Info */}
            <View style={styles.profileSectionCardWhite}>
              <Text style={styles.profileSectionTitle}>💳 SETTLEMENT & PAYOUT ACCOUNT</Text>
              <View style={styles.profileDetailRow}>
                <Text style={styles.profileDetailLabel}>Settlement Cycle:</Text>
                <Text style={styles.profileDetailValue}>Weekly Direct Bank / UPI</Text>
              </View>
              <View style={styles.profileDetailRow}>
                <Text style={styles.profileDetailLabel}>Bank Status:</Text>
                <Text style={styles.profileDetailValueGreen}>✓ Active on File</Text>
              </View>
            </View>

            {/* Sign Out Button */}
            <TouchableOpacity onPress={handleLogout} style={styles.profileLogoutBtnWhite} activeOpacity={0.8}>
              <Text style={styles.profileLogoutText}>🚪 Sign Out from Driver Account</Text>
            </TouchableOpacity>
            <Text style={styles.versionTextDark}>Kandy Cabs Driver App v1.0.0</Text>
          </View>
        )}
      </ScrollView>

      {/* ============================================================ */}
      {/* BOTTOM NAVIGATION BAR (HOME, MY TRIPS, SUPPORT, PROFILE)     */}
      {/* ============================================================ */}
      <View style={styles.bottomNavContainer}>
        {/* Home Tab */}
        <TouchableOpacity
          style={styles.bottomNavTab}
          onPress={() => setActiveBottomTab('HOME')}
          activeOpacity={0.7}
        >
          {activeBottomTab === 'HOME' && <View style={styles.bottomActiveBar} />}
          <Ionicons
            name={activeBottomTab === 'HOME' ? 'home' : 'home-outline'}
            size={22}
            color={activeBottomTab === 'HOME' ? '#ea580c' : '#ffffff'}
          />
          <Text style={[styles.bottomNavText, activeBottomTab === 'HOME' && styles.bottomNavTextActive]}>Home</Text>
        </TouchableOpacity>

        {/* My Trips Tab */}
        <TouchableOpacity
          style={styles.bottomNavTab}
          onPress={() => setActiveBottomTab('MY_TRIPS')}
          activeOpacity={0.7}
        >
          {activeBottomTab === 'MY_TRIPS' && <View style={styles.bottomActiveBar} />}
          <Ionicons
            name={activeBottomTab === 'MY_TRIPS' ? 'receipt' : 'receipt-outline'}
            size={22}
            color={activeBottomTab === 'MY_TRIPS' ? '#ea580c' : '#ffffff'}
          />
          <Text style={[styles.bottomNavText, activeBottomTab === 'MY_TRIPS' && styles.bottomNavTextActive]}>My Trips</Text>
        </TouchableOpacity>

        {/* Support Tab */}
        <TouchableOpacity
          style={styles.bottomNavTab}
          onPress={() => setActiveBottomTab('SUPPORT')}
          activeOpacity={0.7}
        >
          {activeBottomTab === 'SUPPORT' && <View style={styles.bottomActiveBar} />}
          <Ionicons
            name={activeBottomTab === 'SUPPORT' ? 'headset' : 'headset-outline'}
            size={22}
            color={activeBottomTab === 'SUPPORT' ? '#ea580c' : '#ffffff'}
          />
          <Text style={[styles.bottomNavText, activeBottomTab === 'SUPPORT' && styles.bottomNavTextActive]}>Support</Text>
        </TouchableOpacity>

        {/* Profile Tab */}
        <TouchableOpacity
          style={styles.bottomNavTab}
          onPress={() => setActiveBottomTab('PROFILE')}
          activeOpacity={0.7}
        >
          {activeBottomTab === 'PROFILE' && <View style={styles.bottomActiveBar} />}
          <View style={styles.tabIconWrapper}>
            <Ionicons
              name={activeBottomTab === 'PROFILE' ? 'person' : 'person-outline'}
              size={22}
              color={activeBottomTab === 'PROFILE' ? '#ea580c' : '#ffffff'}
            />
            {hasPendingDocuments && (
              <View style={styles.profilePendingNotificationBadge}>
                <Text style={styles.profilePendingNotificationBadgeText}>!</Text>
              </View>
            )}
          </View>
          <Text style={[styles.bottomNavText, activeBottomTab === 'PROFILE' && styles.bottomNavTextActive]}>Profile</Text>
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
  heroBannerBackground: {
    width: '100%',
  },
  heroOverlay: {
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    paddingHorizontal: 16,
    paddingBottom: 44,
  },
  compactHeader: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  miniDutyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  miniDutyBadgeOnline: {
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981',
  },
  miniDutyBadgeOffline: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
  },
  miniDutyText: {
    fontSize: 11,
    fontWeight: '800',
  },
  heroTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroBrandLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  kandyCabsLogo: {
    height: 46,
    width: 155,
  },
  chauffeurBadge: {
    backgroundColor: 'rgba(234, 88, 12, 0.15)',
    borderWidth: 1,
    borderColor: '#ea580c',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  chauffeurBadgeText: {
    color: '#ea580c',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  heroTopRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarRingTop: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: '#ffffff',
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  avatarEmojiTop: {
    fontSize: 20,
  },
  bellBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    position: 'relative',
  },
  bellIcon: {
    fontSize: 16,
  },
  bellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ea580c',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  bellBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
  },
  heroContentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroSloganBox: {
    flex: 1,
    paddingRight: 10,
  },
  heroSloganWhite: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
    lineHeight: 24,
  },
  heroSloganOrange: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ea580c',
    lineHeight: 24,
  },
  heroSloganSub: {
    fontSize: 9,
    fontWeight: '800',
    color: '#cbd5e1',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  heroBottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
  },
  heroGpsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.9)',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  heroGpsText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '700',
    color: '#cbd5e1',
  },
  heroDriverBox: {
    alignItems: 'flex-end',
  },
  avatarRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2.5,
    borderColor: '#ffffff',
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 4,
    position: 'relative',
  },
  avatarPhotoClipper: {
    width: 43,
    height: 43,
    borderRadius: 21.5,
    overflow: 'hidden',
    backgroundColor: '#1e293b',
  },
  avatarEmoji: {
    fontSize: 26,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  heroDriverName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
  },
  heroVehiclePlate: {
    fontSize: 12,
    fontWeight: '800',
    color: '#e2e8f0',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 1,
  },
  heroVehicleModel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    marginTop: 1,
  },
  heroTierBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#f59e0b',
    marginTop: 2,
  },
  dutyCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  dutyCapsuleOnline: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: '#10b981',
  },
  dutyCapsuleOffline: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: '#ef4444',
  },
  dutyDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 5,
  },
  dutyCapsuleText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },
  dutyCapsuleArrow: {
    fontSize: 11,
    fontWeight: '800',
    color: '#cbd5e1',
    marginLeft: 3,
  },
  gpsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  gpsBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gpsDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  gpsDotActive: {
    backgroundColor: '#10b981',
  },
  gpsDotInactive: {
    backgroundColor: '#64748b',
  },
  gpsCoordsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#cbd5e1',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  gpsRefreshBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  gpsRefreshText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ea580c',
  },
  mainScrollView: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  mainScrollViewHome: {
    backgroundColor: 'transparent',
    marginTop: -32,
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 90,
  },
  scrollContentHome: {
    paddingTop: 0,
  },
  cardWrapper: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 6,
    overflow: 'hidden',
    marginBottom: 20,
    zIndex: 20,
  },
  subTabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  subTabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    position: 'relative',
  },
  subTabItemActive: {
    backgroundColor: '#ffffff',
  },
  subTabEmoji: {
    fontSize: 14,
  },
  subTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  subTabTextActive: {
    color: '#ea580c',
    fontWeight: '900',
  },
  subTabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 12,
    right: 12,
    height: 3,
    backgroundColor: '#ea580c',
    borderRadius: 2,
  },
  tripCardContent: {
    padding: 16,
  },
  bookingTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bookingIdLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '700',
  },
  bookingIdNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ea580c',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 1,
  },
  onRouteBadge: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  onRouteBadgeText: {
    color: '#b45309',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 12,
    marginVertical: 4,
  },
  stepperLeft: {
    flex: 1,
  },
  stepPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  pickupCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ea580c',
    marginTop: 2,
  },
  dropCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#0f172a',
    marginTop: 2,
  },
  dashedTrail: {
    width: 2,
    height: 18,
    backgroundColor: '#cbd5e1',
    marginLeft: 5,
    marginVertical: 2,
  },
  stepTextGroup: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  locationSubtitle: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 1,
  },
  stepperRightGraphic: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 10,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 12,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  infoCol: {
    flex: 1,
  },
  infoColHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 3,
  },
  infoIcon: {
    fontSize: 12,
  },
  infoLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  infoValueLarge: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
  },
  infoValueGreen: {
    fontSize: 13,
    fontWeight: '900',
    color: '#059669',
  },
  customerRowWithCall: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  customerPhoneSub: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  callSquareBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#ea580c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callSquareIcon: {
    fontSize: 14,
  },
  primaryButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  greenStartTripBtn: {
    flex: 1.2,
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  greenBtnIcon: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  greenBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  creamViewRouteBtn: {
    flex: 1,
    backgroundColor: '#fff7ed',
    borderWidth: 1.5,
    borderColor: '#fdba74',
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  creamBtnIcon: {
    fontSize: 13,
  },
  creamBtnText: {
    color: '#ea580c',
    fontSize: 12,
    fontWeight: '900',
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 12,
  },
  quickActionPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingVertical: 8,
  },
  quickActionIcon: {
    fontSize: 11,
  },
  quickActionText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0f172a',
  },
  emptyCardInner: {
    padding: 32,
    alignItems: 'center',
  },
  emptyCardInnerEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyCardInnerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  emptyCardInnerSubtitle: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
  },
  dispatchesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dispatchesCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
  },
  cardHeaderDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    width: '100%',
  },
  dispatchesTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
  },
  listeningBadgeLight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  listeningTextLight: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  listeningDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  offlineBoxWhite: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 6,
    zIndex: 20,
  },
  offlineCardBody: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 28,
  },
  offlineEmoji: {
    fontSize: 32,
    marginBottom: 6,
  },
  offlineTitleDark: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
  },
  offlineSubtitleDark: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
  },
  goOnlineBtnOrange: {
    backgroundColor: '#ea580c',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 12,
  },
  goOnlineBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },
  radarCardWhite: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 6,
    zIndex: 20,
  },
  radarCardBody: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 28,
  },
  radarIconCircleDark: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  radarEmoji: {
    fontSize: 26,
  },
  radarTitleDark: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
  },
  radarSubtitleDark: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 16,
  },
  radarPillOrange: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff7ed',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 16,
    marginTop: 16,
    borderWidth: 1.5,
    borderColor: '#ea580c',
  },
  radarPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ea580c',
    marginRight: 8,
  },
  radarPillTextOrange: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ea580c',
  },
  floatingDispatchCardWhite: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  dispatchHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  newAlertBadge: {
    backgroundColor: '#fff7ed',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 2,
  },
  newAlertText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#ea580c',
  },
  dispatchRefText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  distanceBadgeLight: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  distanceBadgeTextLight: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0f172a',
  },
  dispatchPassengerRowLight: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 8,
    marginVertical: 8,
  },
  dispatchPassengerNameDark: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
  },
  dispatchTripTypeOrange: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ea580c',
  },
  acceptDispatchBtnGreen: {
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  acceptDispatchBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },
  acceptDispatchArrow: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
  tabSectionContainer: {
    gap: 12,
  },
  monthSelectorBoxWhite: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  monthSelectorLabelDark: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
    marginBottom: 8,
  },
  monthPillsScroll: {
    gap: 8,
  },
  monthPillWhite: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  monthPillActiveOrange: {
    backgroundColor: '#ea580c',
    borderColor: '#ea580c',
  },
  monthPillTextDark: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  monthPillTextWhite: {
    color: '#ffffff',
    fontWeight: '900',
  },
  earningsKpiCardWhite: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  kpiHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kpiHeaderLabelOrange: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ea580c',
  },
  kpiTripsCountBadgeLight: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  kpiTripsCountTextGreen: {
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
  },
  kpiTotalEarningsAmountDark: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    marginVertical: 4,
  },
  kpiSubBreakdownRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  kpiSubTextDark: {
    fontSize: 11,
    color: '#64748b',
  },
  kpiSettlementRowLight: {
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
  },
  kpiSettledPillLight: {
    flex: 1,
    backgroundColor: '#f0fdf4',
    padding: 8,
    borderRadius: 8,
  },
  kpiSettledLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#059669',
  },
  kpiSettledAmountDark: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 2,
  },
  kpiPendingPillLight: {
    flex: 1,
    backgroundColor: '#fffbeb',
    padding: 8,
    borderRadius: 8,
  },
  kpiPendingLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#b45309',
  },
  kpiPendingAmountDark: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 2,
  },
  tripsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  tripsHeaderTitleDark: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  refreshBtnLight: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  refreshBtnTextOrange: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ea580c',
  },
  emptyCardWhite: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyCardEmoji: {
    fontSize: 32,
    marginBottom: 6,
  },
  emptyCardTitleDark: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  emptyCardSubtitleDark: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
  },
  tripCardWhiteBorder: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tripCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  tripCardRef: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0f172a',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  tripCardDate: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
  tripStatusBadgeGroup: {
    alignItems: 'flex-end',
    gap: 4,
  },
  tripBadgePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  settledBadgePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeGreen: {
    backgroundColor: '#dcfce7',
  },
  badgeAmber: {
    backgroundColor: '#fef3c7',
  },
  badgeTextGreen: {
    fontSize: 8,
    fontWeight: '800',
    color: '#15803d',
  },
  badgeTextAmber: {
    fontSize: 8,
    fontWeight: '800',
    color: '#b45309',
  },
  tripCardRoute: {
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 8,
    marginVertical: 6,
  },
  tripRouteLine: {
    fontSize: 11,
    color: '#0f172a',
    marginVertical: 1,
  },
  tripDistanceLine: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  tripPayoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  tripPayoutLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  tripPayoutVal: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
  },
  tripPayoutValBold: {
    fontSize: 12,
    fontWeight: '900',
    color: '#059669',
  },
  supportHeaderCardWhite: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  supportHeaderEmoji: {
    fontSize: 32,
    marginBottom: 6,
  },
  supportHeaderTitleDark: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  supportHeaderSubtitleDark: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  supportActionCardWhite: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  supportActionIconCircleGreen: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportActionIconCircleEmerald: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportActionIcon: {
    fontSize: 20,
  },
  supportActionTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0f172a',
  },
  supportActionSubtitle: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
  supportActionPhone: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
    marginTop: 2,
  },
  supportActionEmeraldText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
    marginTop: 2,
  },
  supportActionArrow: {
    fontSize: 18,
    color: '#94a3b8',
    fontWeight: '800',
  },
  supportSosCard: {
    backgroundColor: '#450a0a',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#b91c1c',
  },
  sosIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#7f1d1d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosIcon: {
    fontSize: 20,
  },
  sosTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#fecaca',
  },
  sosSubtitle: {
    fontSize: 10,
    color: '#fca5a5',
    marginTop: 1,
  },
  faqBoxWhite: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  faqTitleOrange: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ea580c',
    marginBottom: 6,
  },
  faqItemDark: {
    fontSize: 11,
    color: '#334155',
    lineHeight: 16,
    marginVertical: 2,
  },
  profileHeaderCardWhite: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  profileAvatarLarge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2.5,
    borderColor: '#ea580c',
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    overflow: 'hidden',
  },
  profileAvatarPhotoLarge: {
    width: '100%',
    height: '100%',
  },
  profileDriverNameDark: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  profileDriverPhoneDark: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  profileTierBadgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  verifiedBadgeLight: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  verifiedBadgeText: {
    color: '#059669',
    fontSize: 10,
    fontWeight: '800',
  },
  pendingBadgeLight: {
    backgroundColor: '#fffbeb',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  pendingBadgeText: {
    color: '#b45309',
    fontSize: 10,
    fontWeight: '800',
  },
  ratingBadgeLight: {
    backgroundColor: '#fffbeb',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  ratingBadgeText: {
    color: '#b45309',
    fontSize: 10,
    fontWeight: '800',
  },
  profileSectionCardWhite: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  profileSectionTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#ea580c',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  profileDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  profileDetailLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  profileDetailValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
  },
  profileDetailValueBold: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0f172a',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  profileDetailValueGreen: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  docRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  docName: {
    fontSize: 11,
    color: '#0f172a',
    fontWeight: '600',
  },
  docStatusGreen: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '800',
  },
  docStatusAmber: {
    fontSize: 11,
    color: '#d97706',
    fontWeight: '800',
  },
  uploadBadgeBtn: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#ea580c',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  uploadBadgeBtnText: {
    color: '#ea580c',
    fontSize: 10,
    fontWeight: '800',
  },
  fullUploadBtnOrange: {
    backgroundColor: '#ea580c',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    shadowColor: '#ea580c',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  fullUploadBtnIcon: {
    fontSize: 14,
  },
  fullUploadBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  profileLogoutBtnWhite: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ef4444',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  profileLogoutText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '800',
  },
  versionTextDark: {
    color: '#94a3b8',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  bottomNavContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'android' ? 68 : 74,
    paddingBottom: Platform.OS === 'android' ? 8 : 16,
    backgroundColor: '#000000',
    flexDirection: 'row',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  bottomNavTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingTop: 4,
  },
  bottomActiveBar: {
    position: 'absolute',
    top: 0,
    left: '25%',
    right: '25%',
    height: 3,
    backgroundColor: '#ea580c',
    borderRadius: 2,
  },
  bottomNavEmoji: {
    fontSize: 18,
    opacity: 0.6,
  },
  bottomNavEmojiActive: {
    opacity: 1,
  },
  bottomNavText: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '800',
    marginTop: 3,
    letterSpacing: 0.2,
  },
  bottomNavTextActive: {
    color: '#ea580c',
    fontWeight: '900',
  },
  tabIconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePendingNotificationBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#ea580c',
    width: 15,
    height: 15,
    borderRadius: 7.5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  profilePendingNotificationBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
    lineHeight: 11,
  },
  avatarPendingDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ea580c',
    width: 17,
    height: 17,
    borderRadius: 8.5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  avatarPendingDotText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
    lineHeight: 11,
  },
  avatarRingCompact: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#ea580c',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarEmojiCompact: {
    fontSize: 18,
  },
  avatarCompactPhotoClipper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1e293b',
  },
  avatarImageCompact: {
    width: '100%',
    height: '100%',
  },
  avatarPendingDotCompact: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#ea580c',
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  pendingKycAlertCard: {
    backgroundColor: '#fff7ed',
    borderWidth: 1.5,
    borderColor: '#fdba74',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    shadowColor: '#ea580c',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  pendingKycAlertIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffedd5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingKycAlertTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#c2410c',
  },
  pendingKycAlertSub: {
    fontSize: 10,
    color: '#7c2d12',
    marginTop: 1,
  },
  pendingKycActionBtn: {
    backgroundColor: '#ea580c',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  pendingKycActionText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
  },
  homePendingKycBanner: {
    backgroundColor: '#fff7ed',
    borderWidth: 1.5,
    borderColor: '#fed7aa',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#ea580c',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  homePendingKycHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  homePendingKycIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ffedd5',
    borderWidth: 1,
    borderColor: '#fdba74',
    alignItems: 'center',
    justifyContent: 'center',
  },
  homePendingKycTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#9a3412',
  },
  homePendingKycSub: {
    fontSize: 10.5,
    color: '#c2410c',
    marginTop: 1,
    lineHeight: 14,
  },
  homePendingChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  homePendingChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  homeChipDone: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  homeChipPending: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  homeChipText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  homeChipTextDone: {
    color: '#059669',
  },
  homeChipTextPending: {
    color: '#dc2626',
  },
  homeUploadDocsBtn: {
    backgroundColor: '#ea580c',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ea580c',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  homeUploadDocsBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  radarKycNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff7ed',
    borderWidth: 1.5,
    borderColor: '#fed7aa',
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
    gap: 10,
  },
  radarKycNoticeIcon: {
    fontSize: 20,
  },
  radarKycNoticeTitle: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#9a3412',
  },
  radarKycNoticeSub: {
    fontSize: 9.5,
    color: '#c2410c',
    marginTop: 1,
  },
  radarKycNoticeBtn: {
    backgroundColor: '#ea580c',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  radarKycNoticeBtnText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
  },
});
