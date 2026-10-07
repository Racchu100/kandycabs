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
  Animated,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { driverApiClient } from '../lib/api';
import { locationTracker, LocationState } from '../lib/location-tracker';
import { driverRealtimeClient } from '../lib/realtime-client';
import { BookingStatus } from '@kandy-cabs/shared';
import { SlideToAccept } from '../components/SlideToAccept';
import { getTripInProcessSync, getTripInProcess, setTripInProcess, subscribeTripState } from '../lib/tripState';

export default function DriverDashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [driver, setDriver] = useState<any>(null);
  const [onlineStatus, setOnlineStatus] = useState(false);
  const [activeBooking, setActiveBooking] = useState<any>(null);
  const [upcomingBookings, setUpcomingBookings] = useState<any[]>([]);
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsState, setGpsState] = useState<LocationState>(locationTracker.getState());
  const [tripInProcessRev, setTripInProcessRev] = useState(0);

  useEffect(() => {
    const unsub = subscribeTripState(() => {
      setTripInProcessRev((r) => r + 1);
    });
    return () => unsub();
  }, []);

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
    let paidTripsCount = 0;
    let unpaidTripsCount = 0;
    let completedTripsCount = 0;
    filteredTrips.forEach((t) => {
      if (t.status === 'TRIP_COMPLETED') {
        completedTripsCount++;
        if (t.driverPaymentStatus === 'PAID') {
          paidTripsCount++;
        } else {
          unpaidTripsCount++;
        }
      }
    });
    return {
      paidTripsCount,
      unpaidTripsCount,
      completedTripsCount,
    };
  }, [filteredTrips]);

  // Check if any KYC document or driver profile photo is missing (unfilled)
  const hasPendingDocuments = useMemo(() => {
    if (!driver) return false;
    if (!driver.profilePhotoUrl || !driver.licenseDocUrl || !driver.rcDocUrl || !driver.insuranceDocUrl) {
      return true;
    }
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

  const handleSessionExpired = useCallback(async (msg?: string) => {
    try {
      await locationTracker.stopTracking();
      await driverApiClient.auth.logout();
    } catch (_) {}
    Alert.alert(
      'Account Deactivated',
      msg || 'Your driver account has been deactivated or removed by Admin. Please contact support.',
      [
        {
          text: 'OK',
          onPress: () => router.replace('/login'),
        },
      ],
      { cancelable: false }
    );
  }, [router]);

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

      if (statusRes && statusRes.success && statusRes.driver) {
        setDriver(statusRes.driver);
        setOnlineStatus(statusRes.driver.onlineStatus);
        setActiveBooking(statusRes.activeBooking);
        setUpcomingBookings(statusRes.upcomingBookings || []);

        if (statusRes.activeBooking) {
          const isStarted =
            statusRes.activeBooking.status === BookingStatus.TRIP_STARTED ||
            statusRes.activeBooking.status === 'TRIP_STARTED' ||
            statusRes.activeBooking.status === 'IN_PROGRESS';
          if (isStarted) {
            await setTripInProcess(statusRes.activeBooking.id, true);
          } else {
            await getTripInProcess(statusRes.activeBooking.id);
          }
        }

        // Start/Stop GPS tracking based on online and trip status
        if (statusRes.driver.onlineStatus) {
          const isTripActiveOrEnRoute =
            statusRes.activeBooking &&
            (statusRes.activeBooking.status === BookingStatus.TRIP_STARTED ||
              statusRes.activeBooking.status === 'TRIP_STARTED' ||
              statusRes.activeBooking.status === 'IN_PROGRESS' ||
              statusRes.activeBooking.status === BookingStatus.DRIVER_EN_ROUTE ||
              statusRes.activeBooking.status === 'DRIVER_EN_ROUTE' ||
              getTripInProcessSync(statusRes.activeBooking.id));

          if (isTripActiveOrEnRoute) {
            locationTracker.startActiveTripTracking(statusRes.activeBooking.id);
          } else {
            locationTracker.startIdleTracking();
          }
        } else {
          locationTracker.stopTracking();
        }
      } else {
        handleSessionExpired(statusRes?.message);
        return;
      }

      if (dispatchRes.success) {
        setDispatches(dispatchRes.dispatches || []);
      }
    } catch (err: any) {
      console.error('Failed to fetch driver data:', err);
      if (
        err.status === 401 ||
        err.status === 403 ||
        err.message?.includes('Unauthorized') ||
        err.message?.includes('deactivated') ||
        err.message?.includes('deleted') ||
        err.message?.includes('Driver authentication required')
      ) {
        handleSessionExpired(err.message);
        return;
      }
    } finally {
      isFetchingRef.current = false;
      setLoading(false);

      // Perform at most one follow-up refresh if another request arrived while in flight
      if (pendingRefreshRef.current) {
        pendingRefreshRef.current = false;
        fetchDriverData();
      }
    }
  }, [handleSessionExpired]);

  useFocusEffect(
    useCallback(() => {
      fetchDriverData();
    }, [fetchDriverData])
  );

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

    const unsubProfile = driverRealtimeClient.on('PROFILE_UPDATED', (data: any) => {
      if (data?.accountDeleted) {
        handleSessionExpired('Your driver account has been deactivated or removed by Admin.');
      } else {
        triggerDebouncedFetch(200);
      }
    });

    // 4-second active trip & phone release sync interval
    const interval = setInterval(() => {
      triggerDebouncedFetch(0);
    }, 4000);

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
      unsubProfile();
      clearInterval(interval);
      appStateSubscription.remove();
      driverRealtimeClient.stop();
    };
  }, [fetchDriverData, fetchTripsData, triggerDebouncedFetch, handleSessionExpired]);

  const isTogglingDutyRef = useRef(false);

  const handleToggleOnline = async (val: boolean) => {
    // Prevent double taps while a toggle request is already in progress
    if (isTogglingDutyRef.current) return;
    isTogglingDutyRef.current = true;

    // Check verification status before attempting to go online
    if (val && driver?.verificationStatus !== 'APPROVED') {
      Alert.alert(
        'Verification In Review',
        'Your profile is currently under review by Admin. You will be able to go Online and receive rides once verified.'
      );
      isTogglingDutyRef.current = false;
      return;
    }

    // 1. INSTANT 0ms OPTIMISTIC UI FLIP (Provides immediate tactile visual response)
    const prevStatus = onlineStatus;
    setOnlineStatus(val);

    // 2. Hardware / Location Permission Checks
    if (val) {
      if (gpsState.status === 'SERVICES_DISABLED') {
        setOnlineStatus(prevStatus);
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

      if (gpsState.status === 'PERMISSION_DENIED' || gpsState.status === 'NOT_STARTED') {
        const permResult = await locationTracker.requestPermissions();
        if (!permResult.granted) {
          setOnlineStatus(prevStatus);
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
        // Remove this dispatch from the pending list
        setDispatches((prev) => prev.filter((d) => d.id !== dispatchId && d.booking?.id !== bookingId));

        if (currentTrip) {
          // If already on an active trip, immediately add this trip to upcoming queue
          setUpcomingBookings((prev) => {
            const filtered = prev.filter((b) => b.id !== res.booking.id);
            return [...filtered, res.booking];
          });
          setActiveCardTab('MY_TRIPS');
          await fetchDriverData();
          Alert.alert(
            'Ride Accepted & Queued! 🎉',
            `Trip ${res.booking.humanReadableRef || ''} is confirmed and added to your queue below your active trip. You can start it once your current trip is finished.`,
            [{ text: 'OK' }]
          );
        } else {
          setActiveBooking(res.booking);
          setActiveCardTab('MY_TRIPS');
          fetchDriverData();
          router.push({
            pathname: '/trip/inspection',
            params: { bookingId: res.booking.id || bookingId },
          });
        }
      } else if (res.alreadyTaken) {
        setDispatches((prev) => prev.filter((d) => d.id !== dispatchId));
        Alert.alert(
          'Ride Unavailable',
          'This ride was already accepted by another driver.'
        );
        fetchDriverData();
      }
    } catch (err: any) {
      if (err.status === 409) {
        setDispatches((prev) => prev.filter((d) => d.id !== dispatchId));
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
    const hasCoords =
      typeof destinationLat === 'number' &&
      typeof destinationLng === 'number' &&
      !isNaN(destinationLat) &&
      !isNaN(destinationLng);

    const targetQuery = hasCoords
      ? `${destinationLat},${destinationLng}`
      : encodeURIComponent(destinationAddress || '');

    if (!targetQuery || targetQuery === 'undefined' || targetQuery === 'null') {
      Alert.alert('Location Notice', 'Address or GPS coordinates are not available for navigation.');
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

  const HEADER_MAX_HEIGHT = topInset + 195;
  const HEADER_MIN_HEIGHT = topInset + 54;

  const heroTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_MAX_HEIGHT],
    outputRange: [0, -HEADER_MAX_HEIGHT * 0.45],
    extrapolate: 'clamp',
  });

  const heroOpacity = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const stickyBgOpacity = scrollY.interpolate({
    inputRange: [15, 65],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const whiteLogoOpacity = scrollY.interpolate({
    inputRange: [15, 45],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const darkLogoOpacity = scrollY.interpolate({
    inputRange: [25, 65],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const avatarScale = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [1, 0.60],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={activeBottomTab === 'HOME' ? 'light-content' : 'dark-content'}
        backgroundColor={activeBottomTab === 'HOME' ? '#000000' : '#ffffff'}
        translucent={false}
      />

      {/* STICKY TOP BRAND STRIP (zIndex: 100 - White background when scrolled) */}
      {activeBottomTab === 'HOME' ? (
        <View pointerEvents="box-none" style={[styles.stickyTopBarContainer, { height: HEADER_MIN_HEIGHT, paddingTop: topInset }]}>
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              styles.stickyHeaderBackdropWhite,
              { opacity: stickyBgOpacity },
            ]}
          />
          <View pointerEvents="box-none" style={[styles.heroTopBar, { marginBottom: 0 }]}>
            <View pointerEvents="none" style={styles.heroBrandLeft}>
              {/* White Logo for dark transparent hero */}
              <Animated.Image
                source={require('../assets/images/logo-white.png')}
                style={[styles.kandyCabsLogo, { opacity: whiteLogoOpacity }]}
                resizeMode="contain"
              />
              {/* Dark / Color Logo for white scrolled header */}
              <Animated.Image
                source={require('../assets/images/logo.png')}
                style={[styles.kandyCabsLogo, { position: 'absolute', left: 0, opacity: darkLogoOpacity }]}
                resizeMode="contain"
              />
            </View>

            <Animated.View style={{ transform: [{ scale: avatarScale }] }}>
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
            </Animated.View>
          </View>
        </View>
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

      {/* MAIN SCROLLABLE BODY */}
      <Animated.ScrollView
        style={[
          styles.mainScrollView,
          activeBottomTab === 'HOME' && styles.mainScrollViewHome,
        ]}
        contentContainerStyle={[
          styles.scrollContent,
          activeBottomTab === 'HOME' ? styles.scrollContentHome : null,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
      >
        {/* ============================================================ */}
        {/* TAB 1: HOME (Live Duty, Active Trip & Radar)                 */}
        {/* ============================================================ */}
        {activeBottomTab === 'HOME' && (
          <>
            {/* HERO BANNER SECTION (First child of scroll) */}
            <View style={[styles.heroBannerContainer, { height: HEADER_MAX_HEIGHT }]}>
              <ImageBackground
                source={require('../assets/images/hero-banner-scenic-night.jpg')}
                style={[styles.heroBannerBackground, { height: HEADER_MAX_HEIGHT }]}
                imageStyle={{ resizeMode: 'cover' }}
              >
                <View style={[styles.heroOverlay, { paddingTop: HEADER_MIN_HEIGHT + 8, minHeight: HEADER_MAX_HEIGHT }]}>
                  {/* Driver Snapshot Row with Duty Pill on Right */}
                  <View style={[styles.heroContentRow, { alignItems: 'flex-end', paddingBottom: 26 }]}>
                    {/* Left Driver Details */}
                    <View style={styles.heroDriverBox}>
                      <Text style={styles.heroDriverName} numberOfLines={1}>
                        {driver?.fullName || 'Driver Partner'}
                      </Text>
                      <Text style={styles.heroVehiclePlate}>
                        {driver?.vehicle?.plateNumber && driver.vehicle.plateNumber !== 'PENDING' && !driver.vehicle.plateNumber.startsWith('KA 01 TR 0000')
                          ? driver.vehicle.plateNumber.toUpperCase()
                          : 'Plate Not Added'}
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

                    {/* Right: Duty Pill */}
                    <TouchableOpacity
                      style={[
                        styles.dutyCapsule,
                        onlineStatus ? styles.dutyCapsuleOnline : styles.dutyCapsuleOffline,
                        { marginBottom: 2 },
                      ]}
                      onPress={() => handleToggleOnline(!onlineStatus)}
                      activeOpacity={0.8}
                      hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                    >
                      <View style={[styles.dutyDot, { backgroundColor: onlineStatus ? '#22c55e' : '#ef4444' }]} />
                      <Text style={styles.dutyCapsuleText}>
                        {onlineStatus ? 'Online' : 'Offline'}
                      </Text>
                      <Ionicons name="chevron-forward" size={13} color="#ffffff" style={{ marginLeft: 2 }} />
                    </TouchableOpacity>
                  </View>
                </View>
              </ImageBackground>
            </View>

            {/* FLOATING CARD CONTAINER REFLECTING ABOVE THE IMAGE */}
            <View style={styles.homeCardsContainer}>
            {/* Top Priority KYC Incomplete Banner on Home Tab */}
            {hasPendingDocuments && (
              <View style={styles.homePendingKycBanner}>
                <TouchableOpacity
                  style={styles.homePendingKycHeader}
                  onPress={() => router.push('/documents')}
                  activeOpacity={0.85}
                >
                  <View style={styles.homePendingKycIconBox}>
                    <Ionicons name="warning" size={24} color="#f97316" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.homePendingKycTitle}>KYC & Document Verification Required</Text>
                    <Text style={styles.homePendingKycSub}>
                      Please upload your Driver Profile Photo, Driving License, RC Book & 5-angle cab photos to complete verification.
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#ea580c" />
                </TouchableOpacity>

                {/* Quick Status Chips */}
                <View style={styles.homePendingChipsRow}>
                  {/* Profile Photo */}
                  <View style={[styles.homePendingChip, driver?.profilePhotoUrl ? styles.homeChipDone : styles.homeChipPending]}>
                    <Ionicons
                      name="person-outline"
                      size={14}
                      color={driver?.profilePhotoUrl ? '#16a34a' : '#ea580c'}
                    />
                    <Text style={[styles.homeChipText, driver?.profilePhotoUrl ? styles.homeChipTextDone : styles.homeChipTextPending]}>
                      Profile Photo
                    </Text>
                    <Ionicons
                      name={driver?.profilePhotoUrl ? 'checkmark-circle' : 'alert-circle'}
                      size={13}
                      color={driver?.profilePhotoUrl ? '#16a34a' : '#ea580c'}
                    />
                  </View>

                  {/* License DL */}
                  <View style={[styles.homePendingChip, driver?.licenseDocUrl ? styles.homeChipDone : styles.homeChipPending]}>
                    <Ionicons
                      name="card-outline"
                      size={14}
                      color={driver?.licenseDocUrl ? '#16a34a' : '#ea580c'}
                    />
                    <Text style={[styles.homeChipText, driver?.licenseDocUrl ? styles.homeChipTextDone : styles.homeChipTextPending]}>
                      License DL
                    </Text>
                    <Ionicons
                      name={driver?.licenseDocUrl ? 'checkmark-circle' : 'alert-circle'}
                      size={13}
                      color={driver?.licenseDocUrl ? '#16a34a' : '#ea580c'}
                    />
                  </View>

                  {/* RC Book */}
                  <View style={[styles.homePendingChip, driver?.rcDocUrl ? styles.homeChipDone : styles.homeChipPending]}>
                    <Ionicons
                      name="car-outline"
                      size={14}
                      color={driver?.rcDocUrl ? '#16a34a' : '#ea580c'}
                    />
                    <Text style={[styles.homeChipText, driver?.rcDocUrl ? styles.homeChipTextDone : styles.homeChipTextPending]}>
                      RC Book
                    </Text>
                    <Ionicons
                      name={driver?.rcDocUrl ? 'checkmark-circle' : 'alert-circle'}
                      size={13}
                      color={driver?.rcDocUrl ? '#16a34a' : '#ea580c'}
                    />
                  </View>

                  {/* Insurance */}
                  <View style={[styles.homePendingChip, driver?.insuranceDocUrl ? styles.homeChipDone : styles.homeChipPending]}>
                    <Ionicons
                      name="shield-outline"
                      size={14}
                      color={driver?.insuranceDocUrl ? '#16a34a' : '#ea580c'}
                    />
                    <Text style={[styles.homeChipText, driver?.insuranceDocUrl ? styles.homeChipTextDone : styles.homeChipTextPending]}>
                      Insurance
                    </Text>
                    <Ionicons
                      name={driver?.insuranceDocUrl ? 'checkmark-circle' : 'alert-circle'}
                      size={13}
                      color={driver?.insuranceDocUrl ? '#16a34a' : '#ea580c'}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.homeUploadDocsBtn}
                  onPress={() => router.push('/documents')}
                  activeOpacity={0.85}
                >
                  <Ionicons name="cloud-upload-outline" size={17} color="#ffffff" />
                  <Text style={styles.homeUploadDocsBtnText}>UPLOAD KYC DOCUMENTS NOW</Text>
                  <Ionicons name="arrow-forward" size={15} color="#ffffff" />
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
                    <Ionicons
                      name="car-sport"
                      size={17}
                      color={activeCardTab === 'MY_TRIPS' ? '#ea580c' : '#64748b'}
                    />
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
                    <Ionicons
                      name="calendar-outline"
                      size={16}
                      color={activeCardTab === 'UPCOMING' ? '#ea580c' : '#64748b'}
                    />
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
                    <Ionicons
                      name="time-outline"
                      size={16}
                      color={activeCardTab === 'HISTORY' ? '#ea580c' : '#64748b'}
                    />
                    <Text style={[styles.subTabText, activeCardTab === 'HISTORY' && styles.subTabTextActive]}>
                      History
                    </Text>
                    {activeCardTab === 'HISTORY' && <View style={styles.subTabUnderline} />}
                  </TouchableOpacity>
                </View>

                {/* CARD BODY: ACTIVE TRIP */}
                {activeCardTab === 'MY_TRIPS' ? (
                  (() => {
                    const isTripInProcess =
                      currentTrip.status === BookingStatus.TRIP_STARTED ||
                      currentTrip.status === 'TRIP_STARTED' ||
                      currentTrip.status === 'IN_PROGRESS' ||
                      getTripInProcessSync(currentTrip.id);

                    return (
                      <View style={styles.tripCardContent}>
                        {/* Top Row: Booking ID + ON ROUTE Badge */}
                        <View style={styles.bookingTopRow}>
                          <View>
                            <Text style={styles.bookingIdLabel}>Booking ID</Text>
                            <Text style={styles.bookingIdNumber}>{currentTrip.humanReadableRef}</Text>
                          </View>
                          <View style={isTripInProcess ? styles.onTripBadge : styles.onRouteBadge}>
                            <View style={isTripInProcess ? styles.onTripDot : styles.onRouteDot} />
                            <Text style={isTripInProcess ? styles.onTripBadgeText : styles.onRouteBadgeText}>
                              {isTripInProcess ? 'ON TRIP' : 'ON ROUTE'}
                            </Text>
                          </View>
                        </View>

                        {/* Stepper Route */}
                        <View style={styles.stepperContainer}>
                          <View style={[styles.stepperLeft, { flex: 1 }]}>
                            <TouchableOpacity
                              style={styles.stepPoint}
                              onPress={() => openNavigationMap(currentTrip.pickupLat, currentTrip.pickupLng, currentTrip.pickupAddress)}
                              activeOpacity={0.7}
                            >
                              <View style={styles.pickupCircle} />
                              <View style={styles.stepTextGroup}>
                                <Text style={styles.locationTitle}>{currentTrip.pickupAddress}</Text>
                                <Text style={styles.locationSubtitle}>Pickup Location 📍 (Tap to navigate)</Text>
                              </View>
                            </TouchableOpacity>

                            <View style={styles.dashedTrail} />

                            <TouchableOpacity
                              style={styles.stepPoint}
                              onPress={() => openNavigationMap(currentTrip.dropLat, currentTrip.dropLng, currentTrip.dropAddress)}
                              activeOpacity={0.7}
                            >
                              <View style={styles.dropCircle} />
                              <View style={styles.stepTextGroup}>
                                <Text style={styles.locationTitle}>{currentTrip.dropAddress}</Text>
                                <Text style={styles.locationSubtitle}>Destination 🏁 (Tap to navigate)</Text>
                              </View>
                            </TouchableOpacity>
                          </View>

                          <TouchableOpacity
                            style={styles.stepperViewRouteBtn}
                            onPress={() => {
                              const targetLat = isTripInProcess ? currentTrip.dropLat : currentTrip.pickupLat;
                              const targetLng = isTripInProcess ? currentTrip.dropLng : currentTrip.pickupLng;
                              const targetAddress = isTripInProcess ? currentTrip.dropAddress : currentTrip.pickupAddress;
                              openNavigationMap(targetLat, targetLng, targetAddress);
                            }}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="navigate" size={15} color="#2563eb" />
                            <Text style={styles.stepperViewRouteText}>
                              {isTripInProcess ? 'Drop-off Route' : 'Pickup Location'}
                            </Text>
                            <Ionicons name="chevron-forward" size={13} color="#2563eb" />
                          </TouchableOpacity>
                        </View>

                        {/* 3-Column Info Row */}
                        <View style={styles.infoThreeColsRow}>
                          {/* Col 1: Pickup Date & Time */}
                          <View style={styles.infoThreeCol}>
                            <View style={styles.infoColHeaderRow}>
                              <Ionicons name="calendar-outline" size={15} color="#0f294d" />
                              <Text style={styles.infoColHeaderLabel} numberOfLines={1}>Pickup Date & Time</Text>
                            </View>
                            <Text style={styles.infoColValDark}>
                              {new Date(currentTrip.scheduledAt || currentTrip.createdAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })},
                            </Text>
                            <Text style={styles.infoColValDark}>
                              {new Date(currentTrip.scheduledAt || currentTrip.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                          </View>

                          {/* Vertical Slash/Divider 1 */}
                          <View style={styles.infoColDivider} />

                          {/* Col 2: Customer */}
                          <View style={styles.infoThreeCol}>
                            <View style={styles.infoColHeaderRow}>
                              <Ionicons name="person" size={14} color="#2563eb" />
                              <Text style={styles.infoColHeaderLabel} numberOfLines={1}>Customer</Text>
                            </View>
                            <Text style={styles.infoColValDark} numberOfLines={1}>
                              {currentTrip.customer?.user?.fullName || 'manish'}
                            </Text>
                            <Text style={styles.infoColSubPhone}>
                              {(() => {
                                const isPhoneReleased =
                                  Boolean(currentTrip.customerPhoneReleased) ||
                                  (currentTrip.scheduledAt &&
                                    new Date(currentTrip.scheduledAt).getTime() - Date.now() <= 5 * 60 * 60 * 1000);

                                return isPhoneReleased && currentTrip.customer?.user?.phone
                                  ? currentTrip.customer.user.phone
                                  : 'Phone Protected';
                              })()}
                            </Text>
                          </View>

                          {/* Vertical Slash/Divider 2 */}
                          <View style={styles.infoColDivider} />

                          {/* Col 3: Distance / Trip Type */}
                          <View style={styles.infoThreeCol}>
                            <View style={styles.infoColHeaderRow}>
                              <Ionicons name="navigate-outline" size={14} color="#ea580c" />
                              <Text style={styles.infoColHeaderLabel} numberOfLines={1}>Distance</Text>
                            </View>
                            <Text style={styles.infoFareValBold}>
                              {currentTrip.distanceKm || '--'} km
                            </Text>
                            <Text style={styles.infoColSubPhone}>
                              {currentTrip.tripType || 'ONE WAY'}
                            </Text>
                          </View>
                        </View>

                        {/* 2 Primary Action Buttons */}
                        {(() => {
                          const inspectionPhotos = Array.isArray(currentTrip.vehicleInspectionPhotos)
                            ? currentTrip.vehicleInspectionPhotos.filter((p: string) => p && !p.includes('placehold.co') && p.trim().length > 0)
                            : [];
                          const hasCompletedInspection = inspectionPhotos.length >= 4;

                          return (
                            <View style={styles.primaryButtonsRow}>
                              {!hasCompletedInspection && !isTripInProcess ? (
                                <TouchableOpacity
                                  style={styles.blueInspectionBtn}
                                  onPress={() => router.push({ pathname: '/trip/inspection', params: { bookingId: currentTrip.id } })}
                                  activeOpacity={0.85}
                                >
                                  <Ionicons name="camera" size={15} color="#ffffff" style={{ marginRight: 2 }} />
                                  <Text style={styles.inspectionBtnText}>VEHICLE INSPECTION</Text>
                                </TouchableOpacity>
                              ) : (
                                <TouchableOpacity
                                  style={isTripInProcess ? styles.onTripBtn : styles.greenStartTripBtn}
                                  onPress={async () => {
                                    const isTripVerifiedAndStarted =
                                      currentTrip.status === BookingStatus.TRIP_STARTED ||
                                      currentTrip.status === 'TRIP_STARTED' ||
                                      currentTrip.status === 'IN_PROGRESS';

                                    if (isTripVerifiedAndStarted) {
                                      locationTracker.startActiveTripTracking(currentTrip.id);
                                      router.push({ pathname: '/trip/active', params: { bookingId: currentTrip.id } });
                                    } else {
                                      await setTripInProcess(currentTrip.id, true);
                                      driverApiClient.fetch('/api/driver/trip/en-route', {
                                        method: 'POST',
                                        body: JSON.stringify({ bookingId: currentTrip.id }),
                                      }).catch(() => {});
                                      locationTracker.startActiveTripTracking(currentTrip.id);
                                      router.push({ pathname: '/trip/start', params: { bookingId: currentTrip.id } });
                                    }
                                  }}
                                  activeOpacity={0.85}
                                >
                                  <Ionicons name={isTripInProcess ? 'navigate' : 'car'} size={17} color="#ffffff" style={{ marginRight: 4 }} />
                                  <Text style={styles.greenBtnText}>
                                    {isTripInProcess ? 'ON TRIP' : 'START TRIP'}
                                  </Text>
                                </TouchableOpacity>
                              )}

                              <TouchableOpacity
                                style={styles.creamViewRouteBtn}
                                onPress={() => {
                                  const targetLat = isTripInProcess ? currentTrip.dropLat : currentTrip.pickupLat;
                                  const targetLng = isTripInProcess ? currentTrip.dropLng : currentTrip.pickupLng;
                                  const targetAddress = isTripInProcess ? currentTrip.dropAddress : currentTrip.pickupAddress;
                                  openNavigationMap(targetLat, targetLng, targetAddress);
                                }}
                                activeOpacity={0.85}
                              >
                                <Ionicons name="location" size={17} color="#ea580c" />
                                <Text style={styles.creamBtnText}>
                                  {isTripInProcess ? 'DROP OFF LOCATION' : 'PICKUP LOCATION'}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          );
                        })()}

                        {/* 3 Quick Action Buttons */}
                        <View style={styles.quickActionsRow}>
                          <TouchableOpacity
                            style={styles.quickActionPill}
                            onPress={() => Linking.openURL(`tel:${currentTrip.customer?.user?.phone || '9342759612'}`)}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="call" size={14} color="#0f172a" />
                            <Text style={styles.quickActionText}>CALL CUSTOMER</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.quickActionPill}
                            onPress={() => Linking.openURL(`sms:${currentTrip.customer?.user?.phone || '9342759612'}`)}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="chatbox" size={14} color="#0f172a" />
                            <Text style={styles.quickActionText}>MESSAGE</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.quickActionPill}
                            onPress={() => {
                              Alert.alert(
                                `Trip: ${currentTrip.humanReadableRef}`,
                                `Pickup: ${currentTrip.pickupAddress}\nDrop: ${currentTrip.dropAddress}\nDistance: ${currentTrip.distanceKm || '--'} km\nTrip Type: ${currentTrip.tripType || 'ONE WAY'}`
                              );
                            }}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="document-text" size={14} color="#0f172a" />
                            <Text style={styles.quickActionText}>TRIP DETAILS</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })()
                ) : activeCardTab === 'UPCOMING' ? (
                  upcomingBookings.length === 0 ? (
                    <View style={styles.emptyCardInner}>
                      <Ionicons name="calendar-outline" size={32} color="#94a3b8" style={{ marginBottom: 8 }} />
                      <Text style={styles.emptyCardInnerTitle}>No Upcoming Scheduled Trips</Text>
                      <Text style={styles.emptyCardInnerSubtitle}>Accepted rides and advanced bookings allocated to you will appear here.</Text>
                    </View>
                  ) : (
                    <View style={{ gap: 14 }}>
                      {upcomingBookings.map((upBooking) => {
                        const isPrimaryTripActive = !!activeBooking;
                        const pickupDateStr = upBooking.scheduledAt
                          ? new Date(upBooking.scheduledAt).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '--';
                        const pickupTimeStr = upBooking.scheduledAt
                          ? new Date(upBooking.scheduledAt).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true,
                            })
                          : '--';

                        return (
                          <View key={upBooking.id} style={styles.upcomingBookingItemCard}>
                            {/* Top Row: Ref & Upcoming Tag */}
                            <View style={styles.bookingTopRow}>
                              <View>
                                <Text style={styles.bookingIdLabel}>Upcoming Booking</Text>
                                <Text style={styles.bookingIdNumber}>{upBooking.humanReadableRef}</Text>
                              </View>
                              <View style={styles.upcomingBadgePill}>
                                <Ionicons name="calendar" size={11} color="#2563eb" />
                                <Text style={styles.upcomingBadgeText}>NEXT IN QUEUE</Text>
                              </View>
                            </View>

                            {/* Stepper Route */}
                            <View style={[styles.stepperContainer, { marginTop: 10 }]}>
                              <View style={[styles.stepperLeft, { flex: 1 }]}>
                                <TouchableOpacity
                                  style={styles.stepPoint}
                                  onPress={() => openNavigationMap(upBooking.pickupLat, upBooking.pickupLng, upBooking.pickupAddress)}
                                  activeOpacity={0.7}
                                >
                                  <View style={styles.pickupCircle} />
                                  <View style={styles.stepTextGroup}>
                                    <Text style={styles.locationTitle}>{upBooking.pickupAddress}</Text>
                                    <Text style={styles.locationSubtitle}>Pickup Location 📍</Text>
                                  </View>
                                </TouchableOpacity>

                                <View style={styles.dashedTrail} />

                                <TouchableOpacity
                                  style={styles.stepPoint}
                                  onPress={() => openNavigationMap(upBooking.dropLat, upBooking.dropLng, upBooking.dropAddress)}
                                  activeOpacity={0.7}
                                >
                                  <View style={styles.dropCircle} />
                                  <View style={styles.stepTextGroup}>
                                    <Text style={styles.locationTitle}>{upBooking.dropAddress}</Text>
                                    <Text style={styles.locationSubtitle}>Destination 🏁</Text>
                                  </View>
                                </TouchableOpacity>
                              </View>
                            </View>

                            {/* Info 3 Columns Row */}
                            <View style={styles.infoThreeColsRow}>
                              <View style={styles.infoThreeCol}>
                                <View style={styles.infoColTopLabel}>
                                  <Ionicons name="calendar-outline" size={12} color="#64748b" />
                                  <Text style={styles.infoColLabel}>Scheduled</Text>
                                </View>
                                <Text style={styles.infoColMainText}>{pickupDateStr}</Text>
                                <Text style={styles.infoColSubPhone}>{pickupTimeStr}</Text>
                              </View>

                              <View style={styles.infoColDivider} />

                              <View style={styles.infoThreeCol}>
                                <View style={styles.infoColTopLabel}>
                                  <Ionicons name="person-outline" size={12} color="#64748b" />
                                  <Text style={styles.infoColLabel}>Customer</Text>
                                </View>
                                <Text style={styles.infoColMainText} numberOfLines={1}>
                                  {upBooking.customer?.user?.fullName || 'Customer'}
                                </Text>
                                <Text style={styles.infoColSubPhone}>
                                  {upBooking.customerPhoneReleased
                                    ? upBooking.customer?.user?.phone || 'Released'
                                    : 'Phone Released on Pickup'}
                                </Text>
                              </View>

                              <View style={styles.infoColDivider} />

                              <View style={styles.infoThreeCol}>
                                <View style={styles.infoColTopLabel}>
                                  <Ionicons name="navigate-outline" size={12} color="#64748b" />
                                  <Text style={styles.infoColLabel}>Distance</Text>
                                </View>
                                <Text style={styles.infoColMainText}>
                                  {upBooking.distanceKm || '--'} km
                                </Text>
                                <Text style={styles.infoColSubPhone}>
                                  {upBooking.tripType || 'ONE WAY'}
                                </Text>
                              </View>
                            </View>

                            {/* Action Button: Disabled/Locked if primary trip is ongoing */}
                            <View style={{ marginTop: 12 }}>
                              {isPrimaryTripActive ? (
                                <TouchableOpacity
                                  style={styles.lockedUpcomingStartBtn}
                                  onPress={() => {
                                    Alert.alert(
                                      'Active Trip Ongoing 🚗',
                                      'You are currently on an active trip. Complete your ongoing trip before starting this upcoming ride.'
                                    );
                                  }}
                                  activeOpacity={0.8}
                                >
                                  <Ionicons name="lock-closed" size={15} color="#64748b" />
                                  <Text style={styles.lockedUpcomingStartText}>
                                    LOCKED • FINISH ACTIVE TRIP FIRST
                                  </Text>
                                </TouchableOpacity>
                              ) : (
                                <TouchableOpacity
                                  style={styles.greenStartTripBtn}
                                  onPress={() => router.push({ pathname: '/trip/start', params: { bookingId: upBooking.id } })}
                                  activeOpacity={0.85}
                                >
                                  <Ionicons name="car" size={17} color="#ffffff" style={{ marginRight: 4 }} />
                                  <Text style={styles.greenBtnText}>START TRIP</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )
                ) : (
                  <View style={styles.emptyCardInner}>
                    <Ionicons name="time-outline" size={32} color="#94a3b8" style={{ marginBottom: 8 }} />
                    <Text style={styles.emptyCardInnerTitle}>Recent Trip History</Text>
                    <Text style={styles.emptyCardInnerSubtitle}>
                      {driverTrips.length} completed trips recorded. Switch to the 'My Trips' bottom tab for full accounting.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* SEPARATE STANDALONE CARD: Queued / Accepted Trips */}
            {activeCardTab === 'MY_TRIPS' && upcomingBookings.length > 0 && (
              <View style={styles.separateQueuedCardWrapper}>
                <View style={styles.separateQueuedHeader}>
                  <View style={styles.separateQueuedHeaderLeft}>
                    <Ionicons name="layers" size={17} color="#ea580c" />
                    <Text style={styles.separateQueuedTitle}>
                      Queued / Accepted Trips ({upcomingBookings.length})
                    </Text>
                  </View>
                  <View style={styles.queuedBadgeLight}>
                    <Ionicons name="time" size={11} color="#2563eb" />
                    <Text style={styles.queuedBadgeTextLight}>Next In Queue</Text>
                  </View>
                </View>

                <View style={styles.separateQueuedCardBody}>
                  {upcomingBookings.map((upBooking) => {
                    const pickupDateStr = upBooking.scheduledAt
                      ? new Date(upBooking.scheduledAt).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '--';
                    const pickupTimeStr = upBooking.scheduledAt
                      ? new Date(upBooking.scheduledAt).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                        })
                      : '--';

                    return (
                      <View key={upBooking.id} style={styles.separateQueuedItemCard}>
                        {/* Top Row: Ref & Tag */}
                        <View style={styles.bookingTopRow}>
                          <View>
                            <Text style={styles.bookingIdLabel}>Accepted Trip</Text>
                            <Text style={styles.bookingIdNumber}>{upBooking.humanReadableRef}</Text>
                          </View>
                          <View style={styles.availableQueueBadge}>
                            <Ionicons name="checkmark-circle" size={12} color="#15803d" />
                            <Text style={styles.availableQueueBadgeText}>ACCEPTED • QUEUED</Text>
                          </View>
                        </View>

                        {/* Stepper Route */}
                        <View style={styles.stepperContainer}>
                          <View style={[styles.stepperLeft, { flex: 1 }]}>
                            <TouchableOpacity
                              style={styles.stepPoint}
                              onPress={() => openNavigationMap(upBooking.pickupLat, upBooking.pickupLng, upBooking.pickupAddress)}
                              activeOpacity={0.7}
                            >
                              <View style={styles.pickupCircle} />
                              <View style={styles.stepTextGroup}>
                                <Text style={styles.locationTitle}>{upBooking.pickupAddress}</Text>
                                <Text style={styles.locationSubtitle}>Pickup Location 📍</Text>
                              </View>
                            </TouchableOpacity>

                            <View style={styles.dashedTrail} />

                            <TouchableOpacity
                              style={styles.stepPoint}
                              onPress={() => openNavigationMap(upBooking.dropLat, upBooking.dropLng, upBooking.dropAddress)}
                              activeOpacity={0.7}
                            >
                              <View style={styles.dropCircle} />
                              <View style={styles.stepTextGroup}>
                                <Text style={styles.locationTitle}>{upBooking.dropAddress}</Text>
                                <Text style={styles.locationSubtitle}>Destination 🏁</Text>
                              </View>
                            </TouchableOpacity>
                          </View>
                        </View>

                        {/* Info 3 Columns Row */}
                        <View style={styles.infoThreeColsRow}>
                          <View style={styles.infoThreeCol}>
                            <View style={styles.infoColTopLabel}>
                              <Ionicons name="calendar-outline" size={13} color="#64748b" />
                              <Text style={styles.infoColLabel}>Scheduled</Text>
                            </View>
                            <Text style={styles.infoColMainText}>{pickupDateStr}</Text>
                            <Text style={styles.infoColSubPhone}>{pickupTimeStr}</Text>
                          </View>

                          <View style={styles.infoColDivider} />

                          <View style={styles.infoThreeCol}>
                            <View style={styles.infoColTopLabel}>
                              <Ionicons name="person-outline" size={13} color="#64748b" />
                              <Text style={styles.infoColLabel}>Customer</Text>
                            </View>
                            <Text style={styles.infoColMainText} numberOfLines={1}>
                              {upBooking.customer?.user?.fullName || 'Customer'}
                            </Text>
                            <Text style={styles.infoColSubPhone}>
                              {upBooking.customerPhoneReleased
                                ? upBooking.customer?.user?.phone || 'Released'
                                : 'Phone on Pickup'}
                            </Text>
                          </View>

                          <View style={styles.infoColDivider} />

                          <View style={styles.infoThreeCol}>
                            <View style={styles.infoColTopLabel}>
                              <Ionicons name="navigate-outline" size={13} color="#64748b" />
                              <Text style={styles.infoColLabel}>Distance</Text>
                            </View>
                            <Text style={styles.infoColMainText}>
                              {upBooking.distanceKm || '--'} km
                            </Text>
                            <Text style={styles.infoColSubPhone}>
                              {upBooking.tripType || 'ONE WAY'}
                            </Text>
                          </View>
                        </View>

                        {/* Action Buttons: Locked Start Button + Trip Details */}
                        <View style={{ marginTop: 12, flexDirection: 'row', gap: 10 }}>
                          <TouchableOpacity
                            style={[styles.lockedUpcomingStartBtn, { flex: 2 }]}
                            onPress={() => {
                              Alert.alert(
                                'Active Trip Ongoing 🚗',
                                'This trip is in your queue. You will be able to start it as soon as your current active trip is completed.'
                              );
                            }}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="lock-closed" size={15} color="#64748b" />
                            <Text style={styles.lockedUpcomingStartText}>
                              UNABLE TO START • QUEUED
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.creamViewRouteBtn, { flex: 1, paddingVertical: 11 }]}
                            onPress={() => {
                              Alert.alert(
                                `Queued Trip: ${upBooking.humanReadableRef}`,
                                `Pickup: ${upBooking.pickupAddress}\nDrop: ${upBooking.dropAddress}\nDistance: ${upBooking.distanceKm || '--'} km\nCustomer: ${upBooking.customer?.user?.fullName || 'Customer'}\nScheduled: ${pickupDateStr} ${pickupTimeStr}`
                              );
                            }}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="document-text" size={15} color="#ea580c" />
                            <Text style={[styles.creamBtnText, { fontSize: 11.5 }]}>DETAILS</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Broadcast Dispatches List & Radar Section */}
            {!onlineStatus ? (
              <View style={styles.offlineBoxWhite}>
                <View style={styles.dispatchesCardHeader}>
                  <View style={styles.dispatchesHeaderLeft}>
                    <Ionicons name="car-sport" size={17} color="#ea580c" />
                    <Text style={styles.dispatchesTitle}>
                      Admin Bookings & Assignments
                    </Text>
                  </View>
                  <View style={styles.pausedBadge}>
                    <Ionicons name="pause" size={10} color="#475569" />
                    <Text style={styles.pausedText}>Off-Duty</Text>
                  </View>
                </View>

                <View style={styles.cardHeaderDivider} />

                <View style={styles.offlineCardBody}>
                  <View style={styles.offDutyIconContainer}>
                    <Ionicons name="power-outline" size={32} color="#94a3b8" />
                    <View style={styles.offDutyPauseBadge}>
                      <Ionicons name="pause" size={10} color="#ffffff" />
                    </View>
                  </View>
                  <Text style={styles.offDutyTitle}>You are currently OFF-DUTY</Text>
                  <Text style={styles.offDutySubtitle}>
                    Go On-Duty to receive direct ride assignments from Admin.
                  </Text>
                  <TouchableOpacity
                    style={styles.goDutyBtn}
                    onPress={() => handleToggleOnline(true)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.goDutyGreenDot} />
                    <Text style={styles.goDutyBtnText}>Go ON-DUTY NOW</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : dispatches.length === 0 ? (
              !currentTrip ? (
                /* Radar Scanner in Modern White Card (only shown when no active trip) */
                <View style={styles.radarCardWhite}>
                  <View style={styles.dispatchesCardHeader}>
                    <View style={styles.dispatchesHeaderLeft}>
                      <Ionicons name="car-sport" size={17} color="#ea580c" />
                      <Text style={styles.dispatchesTitle}>
                        Admin Bookings & Assignments
                      </Text>
                    </View>
                    <View style={styles.listeningBadgeLight}>
                      <View style={[styles.listeningDot, { backgroundColor: '#10b981' }]} />
                      <Text style={styles.listeningTextLight}>Ready for Duty</Text>
                    </View>
                  </View>

                  <View style={styles.cardHeaderDivider} />

                  <View style={styles.radarCardBody}>
                    <View style={styles.radarIconCircleDark}>
                      <Ionicons name="shield-checkmark" size={28} color="#ea580c" />
                    </View>
                    <Text style={styles.radarTitleDark}>Ready for Admin Assignment</Text>
                    <Text style={styles.radarSubtitleDark}>
                      You are On-Duty! When Admin directly assigns a booking for your vehicle ({driver?.vehicle?.category?.toUpperCase() || 'SEDAN'}), it will appear here immediately.
                    </Text>
                    <View style={styles.radarPillOrange}>
                      <View style={styles.radarPulseDot} />
                      <Text style={styles.radarPillTextOrange}>Direct Dispatch Active</Text>
                    </View>

                    {hasPendingDocuments && (
                      <TouchableOpacity
                        style={styles.radarKycNoticeBox}
                        onPress={() => router.push('/documents')}
                        activeOpacity={0.85}
                      >
                        <View style={styles.radarKycIconCircle}>
                          <Ionicons name="warning" size={18} color="#f97316" />
                        </View>
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
              ) : null
            ) : (
              <View style={{ gap: 12, marginTop: currentTrip ? 8 : 0 }}>
                {currentTrip && (
                  <View style={styles.otherTripsHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="radio" size={16} color="#ea580c" />
                      <Text style={styles.otherTripsHeaderTitle}>
                        Assigned Trips from Admin <Text style={styles.dispatchesCount}>({dispatches.length})</Text>
                      </Text>
                    </View>
                    <View style={styles.availableQueueBadge}>
                      <Ionicons name="checkmark-circle" size={11} color="#15803d" />
                      <Text style={styles.availableQueueBadgeText}>Accept Available</Text>
                    </View>
                  </View>
                )}

                {dispatches.map((d) => {
                  const b = d.booking;
                  const isAccepting = acceptingId === d.id;

                  return (
                    <View key={d.id} style={styles.floatingDispatchCardWhite}>
                      <View style={styles.dispatchHeaderRow}>
                        <View>
                          <View style={styles.newAlertBadge}>
                            <Text style={styles.newAlertText}>⚡ DIRECT ADMIN ASSIGNMENT</Text>
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
                        disabled={false}
                        title={currentTrip ? 'SLIDE TO ACCEPT (QUEUED TRIP)' : 'SLIDE RIGHT TO ACCEPT'}
                        acceptingTitle="ACCEPTING RIDE..."
                      />
                    </View>
                  );
                })}
              </View>
            )}
            </View>
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
                        ? '🌐 ALL TIME TRIPS'
                        : selectedMonthKey === currentMonthSummary?.monthKey
                        ? `📅 THIS MONTH (${(currentMonthSummary.monthName || '').toUpperCase()})`
                        : `🗓️ ${(selectedMonthKey).toUpperCase()} TRIPS`}
                    </Text>
                    <View style={styles.kpiTripsCountBadgeLight}>
                      <Text style={styles.kpiTripsCountTextGreen}>{activeKpiSummary.completedTripsCount || 0} Completed Trips</Text>
                    </View>
                  </View>

                  <View style={styles.kpiSettlementRowLight}>
                    <View style={styles.kpiSettledPillLight}>
                      <Text style={styles.kpiSettledLabel}>✓ PAID TRIPS</Text>
                      <Text style={styles.kpiSettledCountText}>{activeKpiSummary.paidTripsCount || 0} Settled</Text>
                    </View>
                    <View style={styles.kpiPendingPillLight}>
                      <Text style={styles.kpiPendingLabel}>⏳ NOT PAID TRIPS</Text>
                      <Text style={styles.kpiPendingCountText}>{activeKpiSummary.unpaidTripsCount || 0} Pending</Text>
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
                    ? 'Your assigned rides and payment statuses will appear here.'
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
                            {isSettled ? '✓ PAID' : '⏳ NOT PAID'}
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
                        🚗 Distance: {trip.distanceKm} km
                      </Text>
                    </View>

                    <View style={styles.tripPaymentStatusRow}>
                      <Text style={styles.tripPaymentStatusLabel}>Driver Payment Status:</Text>
                      <View style={[styles.settledBadgePillInline, isSettled ? styles.badgeGreen : styles.badgeAmber]}>
                        <Text style={isSettled ? styles.badgeTextGreen : styles.badgeTextAmber}>
                          {isSettled ? '✓ PAID' : '⏳ NOT PAID'}
                        </Text>
                      </View>
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
                  <Text style={styles.pendingKycAlertSub}>Upload pending KYC documents & vehicle specifications</Text>
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
                  {driver?.vehicle?.plateNumber && driver.vehicle.plateNumber !== 'PENDING' && !driver.vehicle.plateNumber.startsWith('KA 01 TR 0000')
                    ? driver.vehicle.plateNumber.toUpperCase()
                    : 'Not Added (Pending KYC)'}
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

              <TouchableOpacity
                style={styles.fullUploadBtnOrange}
                onPress={() => router.push('/documents')}
                activeOpacity={0.85}
              >
                <Text style={styles.fullUploadBtnIcon}>📸</Text>
                <Text style={styles.fullUploadBtnText}>UPLOAD VEHICLE SPECS & KYC DOCUMENTS</Text>
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
      </Animated.ScrollView>

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
  heroBannerContainer: {
    width: '100%',
    overflow: 'hidden',
  },
  homeCardsContainer: {
    marginTop: -26,
    paddingHorizontal: 14,
    zIndex: 20,
  },
  stickyTopBarContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  stickyHeaderBackdropWhite: {
    backgroundColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  heroBannerBackground: {
    width: '100%',
  },
  heroOverlay: {
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    paddingHorizontal: 16,
    paddingBottom: 20,
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
    marginLeft: -32,
  },
  kandyCabsLogo: {
    height: 46,
    width: 155,
  },
  chauffeurBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderWidth: 1.5,
    borderColor: '#ea580c',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  chauffeurBadgeText: {
    color: '#ea580c',
    fontSize: 9.5,
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
    fontSize: 27,
    fontWeight: '900',
    color: '#ffffff',
    lineHeight: 31,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroSloganOrange: {
    fontSize: 27,
    fontWeight: '900',
    color: '#ea580c',
    lineHeight: 31,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
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
    fontSize: 11.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '700',
    color: '#ffffff',
  },
  heroDriverBox: {
    alignItems: 'flex-start',
  },
  avatarRing: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 3,
    borderColor: '#ffffff',
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 5,
    position: 'relative',
  },
  avatarPhotoClipper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: '#1e293b',
  },
  avatarEmoji: {
    fontSize: 34,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  heroDriverName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  heroVehiclePlate: {
    fontSize: 12,
    fontWeight: '800',
    color: '#e2e8f0',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  heroVehicleModel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#cbd5e1',
    marginTop: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  heroTierBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#facc15',
    marginTop: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  dutyCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 22,
    borderWidth: 1.5,
  },
  dutyCapsuleOnline: {
    backgroundColor: 'rgba(6, 78, 59, 0.88)',
    borderColor: '#10b981',
  },
  dutyCapsuleOffline: {
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderColor: '#ef4444',
  },
  dutyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  dutyCapsuleText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.2,
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
    zIndex: 10,
  },
  mainScrollViewHome: {
    backgroundColor: 'transparent',
    zIndex: 10,
    marginTop: 0,
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 140,
  },
  scrollContentHome: {
    padding: 0,
    paddingBottom: 140,
  },
  cardWrapper: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
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
    paddingHorizontal: 12,
    paddingVertical: 14,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  onRouteDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#d97706',
  },
  onRouteBadgeText: {
    color: '#b45309',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  onTripBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#86efac',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  onTripDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#16a34a',
  },
  onTripBadgeText: {
    color: '#15803d',
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 14,
    marginVertical: 6,
  },
  stepperLeft: {
    flex: 1,
  },
  stepperViewRouteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  stepperViewRouteText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563eb',
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
  infoThreeColsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  infoThreeCol: {
    flex: 1,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  infoColDivider: {
    width: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 2,
    marginHorizontal: 2,
  },
  infoColHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    marginBottom: 4,
    width: '100%',
  },
  infoColHeaderLabel: {
    fontSize: 8.5,
    color: '#64748b',
    fontWeight: '700',
    textAlign: 'center',
  },
  infoColValDark: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 16,
    textAlign: 'center',
  },
  infoColSubPhone: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 1,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textAlign: 'center',
  },
  rupeeCircleBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#1d4ed8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rupeeCircleText: {
    color: '#ffffff',
    fontSize: 9.5,
    fontWeight: '900',
    lineHeight: 11,
  },
  infoFareValBold: {
    fontSize: 14.5,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 2,
    textAlign: 'center',
  },
  advancePaidBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 10,
    marginBottom: 4,
  },
  advancePaidLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  advancePaidLabel: {
    fontSize: 10.5,
    color: '#64748b',
    fontWeight: '700',
  },
  advancePaidValue: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#059669',
    marginTop: 1,
  },
  primaryButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  blueInspectionBtn: {
    flex: 1,
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  inspectionBtnText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  greenStartTripBtn: {
    flex: 1,
    backgroundColor: '#059669',
    borderRadius: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  onTripBtn: {
    flex: 1,
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  greenBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  creamViewRouteBtn: {
    flex: 1,
    backgroundColor: '#fffaf5',
    borderWidth: 1.5,
    borderColor: '#fed7aa',
    borderRadius: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  creamBtnText: {
    color: '#ea580c',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 10,
  },
  quickActionPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 10,
    borderRadius: 20,
  },
  quickActionText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0f172a',
  },
  emptyCardInner: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  upcomingBookingItemCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  upcomingBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  upcomingBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#2563eb',
    letterSpacing: 0.2,
  },
  infoColTopLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 2,
  },
  infoColLabel: {
    fontSize: 9,
    color: '#64748b',
    fontWeight: '700',
  },
  infoColMainText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  lockedUpcomingStartBtn: {
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  lockedUpcomingStartText: {
    color: '#64748b',
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  availableQueueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#86efac',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  availableQueueBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803d',
  },
  separateQueuedCardWrapper: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
    overflow: 'hidden',
    zIndex: 15,
  },
  separateQueuedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: '#fffaf5',
    borderBottomWidth: 1,
    borderBottomColor: '#fed7aa',
  },
  separateQueuedHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  separateQueuedTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  queuedBadgeLight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  queuedBadgeTextLight: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563eb',
  },
  separateQueuedCardBody: {
    padding: 16,
    gap: 14,
  },
  separateQueuedItemCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
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
    marginBottom: 12,
  },
  dispatchesCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
  },
  dispatchesHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  cardHeaderDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    width: '100%',
  },
  dispatchesTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  dispatchesCount: {
    color: '#64748b',
    fontWeight: '500',
  },
  pausedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  pausedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  listeningBadgeLight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 5,
  },
  listeningTextLight: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  listeningDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  offlineBoxWhite: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
    marginBottom: 16,
  },
  offlineCardBody: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
  },
  offDutyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 12,
  },
  offDutyPauseBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ea580c',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  offDutyTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
  },
  offDutySubtitle: {
    fontSize: 12.5,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    maxWidth: 290,
  },
  goDutyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ea580c',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 18,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  goDutyGreenDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#22c55e',
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  goDutyBtnText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  radarCardWhite: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
    marginBottom: 16,
  },
  radarCardBody: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
  },
  radarIconCircleDark: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ffedd5',
  },
  radarTitleDark: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
  },
  radarSubtitleDark: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    maxWidth: 300,
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
  otherTripsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 4,
  },
  otherTripsHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  lockedTripBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  lockedTripBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
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
    fontSize: 8.5,
    fontWeight: '800',
    color: '#059669',
  },
  kpiSettledCountText: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#059669',
    marginTop: 2,
  },
  kpiPendingPillLight: {
    flex: 1,
    backgroundColor: '#fffbeb',
    padding: 8,
    borderRadius: 8,
  },
  kpiPendingLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#b45309',
  },
  kpiPendingCountText: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#b45309',
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
  tripPaymentStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
    marginTop: 6,
  },
  tripPaymentStatusLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  settledBadgePillInline: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
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
    zIndex: 999,
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
    elevation: 25,
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
    backgroundColor: '#fffaf5',
    borderWidth: 1.5,
    borderColor: '#fed7aa',
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#0f172a',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 6,
  },
  homePendingKycHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  homePendingKycIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffedd5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  homePendingKycTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  homePendingKycSub: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 16,
  },
  homePendingChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
    marginBottom: 16,
  },
  homePendingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  homeChipDone: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  homeChipPending: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecaca',
  },
  homeChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  homeChipTextDone: {
    color: '#16a34a',
  },
  homeChipTextPending: {
    color: '#ea580c',
  },
  homeUploadDocsBtn: {
    backgroundColor: '#ea580c',
    borderRadius: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#ea580c',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 4,
  },
  homeUploadDocsBtnText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  radarKycNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffaf5',
    borderWidth: 1.5,
    borderColor: '#fed7aa',
    borderRadius: 14,
    padding: 12,
    marginTop: 14,
    gap: 10,
  },
  radarKycIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffedd5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarKycNoticeTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0f172a',
  },
  radarKycNoticeSub: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
  radarKycNoticeBtn: {
    backgroundColor: '#ea580c',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  radarKycNoticeBtnText: {
    color: '#ffffff',
    fontSize: 10.5,
    fontWeight: '900',
  },
});
