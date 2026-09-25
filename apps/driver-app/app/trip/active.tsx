import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Linking,
  ActivityIndicator,
  Platform,
  StatusBar,
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
        setBooking(res.activeBooking);
      }
    } catch (err) {
      console.error('Failed to fetch active trip:', err);
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

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
    router.push({
      pathname: '/trip/complete',
      params: { bookingId },
    });
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
          <Text style={styles.headerStepBadge}>STEP 3 OF 3 • TRIP ACTIVE</Text>
          <Text style={styles.headerMainTitle}>Trip In Progress</Text>
        </View>

        <View style={styles.headerRefBox}>
          <Text style={styles.headerRefText}>{booking.humanReadableRef}</Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Active GPS Telemetry Badge */}
        <View style={styles.telemetryCard}>
          <View style={styles.pulseDot} />
          <View>
            <Text style={styles.telemetryTitle}>FLOW A: ACTIVE TRIP GPS LOGGING</Text>
            <Text style={styles.telemetrySubtitle}>
              Breadcrumb route recording every 10s for route polyline & odometer audit
            </Text>
          </View>
        </View>

        {/* Drop Location Card & Navigation */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>DESTINATION DROP POINT</Text>
          <Text style={styles.dropAddress}>{booking.dropAddress}</Text>

          <TouchableOpacity style={styles.navButton} onPress={openDropNavigation}>
            <Text style={styles.navButtonText}>🏁 Navigate to Drop Location</Text>
          </TouchableOpacity>
        </View>

        {/* Trip Meta & Locations */}
        <View style={styles.card}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Passenger:</Text>
            <View style={styles.passengerMetaCol}>
              <Text style={styles.metaVal}>{booking.customer?.user?.fullName || 'Customer'}</Text>
              {booking.customerPhoneReleased && booking.customer?.user?.phone ? (
                <TouchableOpacity
                  style={styles.passengerCallBtn}
                  onPress={() => Linking.openURL(`tel:${booking.customer.user.phone}`)}
                >
                  <Text style={styles.passengerCallText}>📞 {booking.customer.user.phone}</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.passengerLockedText}>🔒 Phone Protected</Text>
              )}
            </View>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Trip Type:</Text>
            <Text style={[styles.metaVal, { color: '#38bdf8' }]}>
              {booking.tripType} ({booking.distanceKm} km)
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Pickup Location:</Text>
            <Text style={[styles.metaVal, { flex: 1, textAlign: 'right' }]} numberOfLines={2}>
              {booking.pickupAddress}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Starting Odometer:</Text>
            <Text style={styles.metaVal}>{booking.startingOdometer || 'Recorded'} km</Text>
          </View>
        </View>
      </View>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity style={styles.completeButton} onPress={handleProceedToComplete}>
          <Text style={styles.completeButtonText}>REACHED DESTINATION / COMPLETE TRIP →</Text>
        </TouchableOpacity>
      </View>
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
  content: {
    flex: 1,
    padding: 16,
  },
  telemetryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1b4b',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#4338ca',
    marginBottom: 16,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#38bdf8',
    marginRight: 10,
  },
  telemetryTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#38bdf8',
    letterSpacing: 0.5,
  },
  telemetrySubtitle: {
    fontSize: 10,
    color: '#cbd5e1',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  dropAddress: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    marginVertical: 8,
  },
  navButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  navButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  metaLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  metaVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  passengerMetaCol: {
    alignItems: 'flex-end',
  },
  passengerCallBtn: {
    backgroundColor: '#064e3b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#10b981',
    marginTop: 4,
  },
  passengerCallText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '800',
  },
  passengerLockedText: {
    color: '#64748b',
    fontSize: 10,
    fontStyle: 'italic',
    marginTop: 2,
  },
  bottomBar: {
    padding: 16,
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  completeButton: {
    backgroundColor: '#10b981',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  completeButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
