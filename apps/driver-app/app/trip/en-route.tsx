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

export default function DriverEnRouteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0);
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchBooking = useCallback(async () => {
    if (!bookingId) return;
    try {
      const res = await driverApiClient.fetch('/api/driver/status');
      if (res.success && res.activeBooking && res.activeBooking.id === bookingId) {
        setBooking(res.activeBooking);
      }
    } catch (err) {
      console.error('Failed to fetch en-route booking:', err);
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    fetchBooking();
    // Start active trip background GPS tracking
    if (bookingId) {
      locationTracker.startActiveTripTracking(bookingId);
      // Mark driver en-route on backend
      driverApiClient.fetch('/api/driver/trip/en-route', {
        method: 'POST',
        body: JSON.stringify({ bookingId }),
      }).catch(() => {});
    }

    // 15-second polling fallback for Flow B customer live location
    const interval = setInterval(fetchBooking, 15000);
    return () => clearInterval(interval);
  }, [bookingId, fetchBooking]);

  const openNavigation = () => {
    if (!booking) return;
    const hasCoords = typeof booking.pickupLat === 'number' && typeof booking.pickupLng === 'number';
    const targetQuery = hasCoords
      ? `${booking.pickupLat},${booking.pickupLng}`
      : encodeURIComponent(booking.pickupAddress || '');

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

  const handleArrived = () => {
    router.push({
      pathname: '/trip/start',
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

  const isCustomerSharing = booking.customerLocationSharingEnabled !== false;
  const hasCustomerCoords =
    isCustomerSharing &&
    typeof booking.customerCurrentLat === 'number' &&
    typeof booking.customerCurrentLng === 'number';

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
          <Text style={styles.headerStepBadge}>STEP 1 OF 3 • LIVE RADAR</Text>
          <Text style={styles.headerMainTitle}>En Route to Pickup</Text>
        </View>

        <View style={styles.headerRefBox}>
          <Text style={styles.headerRefText}>{booking.humanReadableRef}</Text>
        </View>
      </View>

      {/* FLOW B Visualization: Live Customer Radar */}
      <View style={styles.radarContainer}>
        <View style={styles.radarCard}>
          <Text style={styles.radarBadge}>FLOW B: LIVE PICKUP TELEMETRY</Text>

          {hasCustomerCoords ? (
            <View style={styles.customerLiveBox}>
              <View style={styles.livePulseDot} />
              <View>
                <Text style={styles.customerLiveTitle}>Live Customer Pin Moving</Text>
                <Text style={styles.coordsText}>
                  Customer GPS: {booking.customerCurrentLat.toFixed(4)}, {booking.customerCurrentLng.toFixed(4)}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.staticPickupBox}>
              <Text style={styles.staticPinTitle}>📍 Static Pickup Pin</Text>
              <Text style={styles.sharingNote}>
                {isCustomerSharing
                  ? 'Waiting for customer app live location signal...'
                  : 'Customer has live location sharing paused.'}
              </Text>
            </View>
          )}

          <TouchableOpacity style={styles.navButton} onPress={openNavigation}>
            <Text style={styles.navButtonText}>🗺️ Open Turn-by-Turn Navigation</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Trip Information Card */}
      <View style={styles.infoCard}>
        <View style={styles.customerHeaderRow}>
          <Text style={styles.customerName}>{booking.customer?.user?.fullName || 'Customer'}</Text>
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

        {booking.customerPhoneReleased && booking.customer?.user?.phone ? (
          <TouchableOpacity
            style={styles.callButton}
            onPress={() => Linking.openURL(`tel:${booking.customer.user.phone}`)}
          >
            <Text style={styles.callButtonText}>📞 Call Customer ({booking.customer.user.phone})</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.phoneProtectedText}>
            🔒 Customer phone number is protected by admin policy.
          </Text>
        )}

        <View style={styles.divider} />

        <Text style={styles.pickupLabel}>PICKUP LOCATION</Text>
        <Text style={styles.pickupAddress}>{booking.pickupAddress}</Text>

        <View style={styles.fareRow}>
          <Text style={styles.fareLabel}>Trip Type:</Text>
          <Text style={styles.fareVal}>{booking.tripType} ({booking.distanceKm} km)</Text>
        </View>
      </View>

      {/* Bottom Action */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity style={styles.arrivedButton} onPress={handleArrived}>
          <Text style={styles.arrivedButtonText}>ARRIVED AT PICKUP →</Text>
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
  radarContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  radarCard: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  radarBadge: {
    fontSize: 10,
    fontWeight: '900',
    color: '#38bdf8',
    letterSpacing: 1,
    marginBottom: 16,
  },
  customerLiveBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0c4a6e',
    padding: 16,
    borderRadius: 14,
    width: '100%',
    marginBottom: 16,
  },
  livePulseDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#38bdf8',
    marginRight: 12,
  },
  customerLiveTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  coordsText: {
    fontSize: 11,
    color: '#bae6fd',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  staticPickupBox: {
    backgroundColor: '#0f172a',
    padding: 16,
    borderRadius: 14,
    width: '100%',
    marginBottom: 16,
    alignItems: 'center',
  },
  staticPinTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  sharingNote: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
    textAlign: 'center',
  },
  navButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    width: '100%',
    alignItems: 'center',
  },
  navButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  infoCard: {
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  customerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
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
    marginVertical: 8,
  },
  callButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  phoneProtectedText: {
    fontSize: 11,
    color: '#64748b',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 10,
  },
  pickupLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
  },
  pickupAddress: {
    fontSize: 13,
    color: '#f8fafc',
    marginTop: 2,
    fontWeight: '600',
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  fareLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  fareVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#f59e0b',
  },
  bottomBar: {
    padding: 16,
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  arrivedButton: {
    backgroundColor: '#10b981',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  arrivedButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
