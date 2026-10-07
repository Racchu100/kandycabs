import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Linking,
  ActivityIndicator,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { driverApiClient } from '../../lib/api';
import { locationTracker } from '../../lib/location-tracker';

export default function DriverTripActiveScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0);
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchTrip = useCallback(async () => {
    if (!bookingId) return;
    try {
      const res = await driverApiClient.fetch('/api/driver/status');
      if (res.success && res.activeBooking && res.activeBooking.id === bookingId) {
        if (res.activeBooking.status !== 'TRIP_STARTED' && res.activeBooking.status !== 'IN_PROGRESS') {
          router.replace({ pathname: '/trip/start', params: { bookingId } });
          return;
        }
        setBooking(res.activeBooking);
      }
    } catch (err) {
      console.error('Failed to fetch active trip:', err);
    } finally {
      setLoading(false);
    }
  }, [bookingId, router]);

  useEffect(() => {
    fetchTrip();
    if (bookingId) {
      // Active-Trip tier GPS logging (every 10s into TripTracking)
      locationTracker.startActiveTripTracking(bookingId);
    }
  }, [bookingId, fetchTrip]);

  const openDropNavigation = () => {
    if (!booking) return;
    const hasCoords = typeof booking.dropLat === 'number' && typeof booking.dropLng === 'number';
    const targetQuery = hasCoords
      ? `${booking.dropLat},${booking.dropLng}`
      : encodeURIComponent(booking.dropAddress || '');

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

  const handleProceedToComplete = () => {
    const dropLoc = booking?.dropAddress || 'Destination Drop Location';
    Alert.alert(
      'Confirm Destination Reached 📍',
      `Please confirm that you have reached the drop-off location:\n\n📍 ${dropLoc}`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Confirm & Complete',
          onPress: () => {
            router.push({
              pathname: '/trip/complete',
              params: { bookingId },
            });
          },
        },
      ]
    );
  };

  if (loading || !booking) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#f59e0b" />
      </View>
    );
  }

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
              <Text style={styles.headerLiveRadarText}>TRIP IN PROGRESS</Text>
            </View>
            <Text style={styles.headerMainTitle}>Trip In Progress</Text>
          </View>
        </View>

        <View style={styles.headerRefCapsule}>
          <Ionicons name="car" size={15} color="#2563eb" />
          <Text style={styles.headerRefText}>{booking.humanReadableRef || 'TRIP'}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Destination Drop Point Card & Navigation */}
        <View style={styles.dropCard}>
          <View style={styles.dropHeaderRow}>
            <Ionicons name="location-sharp" size={16} color="#059669" />
            <Text style={styles.dropCardLabel}>DESTINATION DROP POINT</Text>
          </View>
          
          <Text style={styles.dropAddressText} numberOfLines={2}>
            {booking.dropAddress || 'Destination Drop Location'}
          </Text>

          <View style={styles.dropInstructionNoteBox}>
            <View style={styles.dropNavIconBadge}>
              <Ionicons name="navigate" size={14} color="#ffffff" />
            </View>
            <Text style={styles.dropInstructionNote}>
              Drive towards <Text style={styles.highlightBlack}>{booking.dropAddress || 'Destination'}</Text>. After reaching the drop-off location, click <Text style={styles.highlightGreenInline}>REACHED DESTINATION</Text> below.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.navButton}
            onPress={openDropNavigation}
            activeOpacity={0.85}
          >
            <View style={styles.navBtnLeft}>
              <View style={styles.navIconCircle}>
                <Ionicons name="navigate" size={18} color="#ffffff" />
              </View>
              <Text style={styles.navButtonText}>Navigate to Drop Location</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Trip Meta & Locations Card */}
        <View style={styles.metaCard}>
          {/* Row 1: Passenger */}
          <View style={styles.metaItemRow}>
            <View style={styles.metaLeftGroup}>
              <View style={styles.metaIconCircle}>
                <Ionicons name="person" size={18} color="#1d63ed" />
              </View>
              <Text style={styles.metaLabel}>Passenger</Text>
            </View>
            <View style={styles.passengerRightCol}>
              <Text style={styles.passengerNameText}>
                {booking.customer?.user?.fullName || 'Customer'}
              </Text>
              {booking.customerPhoneReleased && booking.customer?.user?.phone ? (
                <TouchableOpacity
                  style={styles.passengerCallCapsule}
                  onPress={() => Linking.openURL(`tel:${booking.customer.user.phone}`)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="call" size={12} color="#059669" />
                  <Text style={styles.passengerCallText}>
                    +{booking.customer.user.phone.replace(/^\+/, '')}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.passengerLockedPill}>
                  <Ionicons name="lock-closed" size={10} color="#64748b" />
                  <Text style={styles.passengerLockedText}>Phone Protected</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.metaDivider} />

          {/* Row 2: Trip Type */}
          <View style={styles.metaItemRow}>
            <View style={styles.metaLeftGroup}>
              <View style={styles.metaIconCircle}>
                <Ionicons name="car" size={18} color="#1d63ed" />
              </View>
              <Text style={styles.metaLabel}>Trip Type</Text>
            </View>
            <Text style={styles.tripTypeVal}>
              {booking.tripType?.toUpperCase() || 'ONEWAY'}  ({booking.distanceKm || '367.8'} km)
            </Text>
          </View>

          <View style={styles.metaDivider} />

          {/* Row 3: Pickup Location */}
          <View style={styles.metaItemRow}>
            <View style={styles.metaLeftGroup}>
              <View style={styles.metaIconCircle}>
                <Ionicons name="location-sharp" size={18} color="#1d63ed" />
              </View>
              <Text style={styles.metaLabel}>Pickup Location</Text>
            </View>
            <View style={styles.pickupRightCol}>
              <Text style={styles.pickupLocationVal} numberOfLines={1}>
                {booking.pickupAddress || 'Pickup Point'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#64748b" />
            </View>
          </View>

          <View style={styles.metaDivider} />

          {/* Row 4: Starting Odometer */}
          <View style={styles.metaItemRow}>
            <View style={styles.metaLeftGroup}>
              <View style={styles.metaIconCircle}>
                <Ionicons name="speedometer" size={18} color="#1d63ed" />
              </View>
              <Text style={styles.metaLabel}>Starting Odometer</Text>
            </View>
            <Text style={styles.odometerVal}>
              {booking.startingOdometer || '12345'}{' '}
              <Text style={styles.odometerKmUnit}>km</Text>
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Pinned Bottom Complete CTA Bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {/* Clear Guidance Banner with Green Accent & Divider */}
        <View style={styles.destinationGuidanceBox}>
          <View style={styles.guidanceIconCircleGreen}>
            <Ionicons name="information" size={16} color="#ffffff" />
          </View>
          <View style={styles.guidanceDividerV} />
          <Text style={styles.destinationGuidanceText}>
            Drive to <Text style={styles.highlightBlack}>{booking.dropAddress || 'Destination'}</Text>. After reaching the drop-off location, click <Text style={styles.highlightGreenInline}>REACHED DESTINATION</Text> below.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.completeButton}
          onPress={handleProceedToComplete}
          activeOpacity={0.88}
        >
          <View style={styles.ctaIconCircleWhite}>
            <Ionicons name="location-sharp" size={16} color="#059669" />
          </View>
          <Text style={styles.completeButtonText}>REACHED DESTINATION</Text>
          <Ionicons name="arrow-forward" size={18} color="#ffffff" />
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
  telemetryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  telemetryIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  telemetryTextCol: {
    flex: 1,
  },
  telemetryTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#1d63ed',
    letterSpacing: 0.2,
  },
  telemetrySubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 15,
  },
  telemetryShieldBadge: {
    marginLeft: 8,
  },
  dropCard: {
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
  dropHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  dropCardLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.6,
  },
  dropAddressText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  dropInstructionNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f7ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    gap: 10,
  },
  dropNavIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1d63ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropInstructionNote: {
    fontSize: 11.5,
    color: '#475569',
    lineHeight: 17,
    flex: 1,
    fontWeight: '500',
  },
  highlightBlack: {
    color: '#0f172a',
    fontWeight: '800',
  },
  navButton: {
    backgroundColor: '#1d63ed',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#1d63ed',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  navBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  navIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonText: {
    color: '#ffffff',
    fontSize: 14.5,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  metaCard: {
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
  metaItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  metaDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 10,
  },
  metaLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaLabel: {
    fontSize: 13.5,
    color: '#64748b',
    fontWeight: '600',
  },
  passengerRightCol: {
    alignItems: 'flex-end',
  },
  passengerNameText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  passengerCallCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    gap: 5,
    marginTop: 4,
  },
  passengerCallText: {
    color: '#059669',
    fontSize: 11.5,
    fontWeight: '800',
  },
  passengerLockedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  passengerLockedText: {
    color: '#64748b',
    fontSize: 10.5,
    fontWeight: '600',
  },
  tripTypeVal: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#ea580c',
  },
  pickupRightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    justifyContent: 'flex-end',
    marginLeft: 10,
  },
  pickupLocationVal: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'right',
  },
  odometerVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  odometerKmUnit: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#0f172a',
  },
  bottomBar: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  destinationGuidanceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf9',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  guidanceIconCircleGreen: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guidanceDividerV: {
    width: 1,
    height: 22,
    backgroundColor: '#a7f3d0',
    marginHorizontal: 10,
  },
  destinationGuidanceText: {
    fontSize: 11.5,
    color: '#1e3a8a',
    lineHeight: 16,
    flex: 1,
    fontWeight: '500',
  },
  highlightWhite: {
    color: '#0f172a',
    fontWeight: '800',
  },
  highlightGreenInline: {
    color: '#059669',
    fontWeight: '900',
  },
  completeButton: {
    backgroundColor: '#059669',
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  ctaIconCircleWhite: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeButtonText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '900',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
});
