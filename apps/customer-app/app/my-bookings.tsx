import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { customerApiClient, customerTokenStorage } from '../lib/api';
import { customerRealtimeTracker } from '../lib/realtime-client';
import { BookingStatus, TripType } from '@kandy-cabs/shared';
import { TaxInvoiceModal } from '../components/TaxInvoiceModal';

const STATUS_FILTERS = ['ALL', 'ACTIVE', 'COMPLETED', 'CANCELLED'] as const;

export default function MyBookingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0);

  const [user, setUser] = useState<any | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Load User & Bookings
  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      // 1. User Profile
      try {
        const meRes = await customerApiClient.fetch('/api/auth/me');
        if (meRes?.user) {
          setUser(meRes.user);
        }
      } catch {
        // guest
      }

      // 2. Bookings
      const res = await customerApiClient.fetch(`/api/customer/bookings/list?category=${activeFilter}`);
      if (res && res.bookings) {
        setBookings(res.bookings);
      }
    } catch (err: any) {
      if (err.status === 401) {
        customerTokenStorage.removeToken();
        router.replace('/login');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter, router]);

  useEffect(() => {
    loadData();

    // Listen for live booking status transitions
    const unsubStatus = customerRealtimeTracker.on('BOOKING_STATUS', (eventData: any) => {
      loadData(true);
    });

    // Gentle 60s background safety sync (reduced from 6s polling)
    const interval = setInterval(() => {
      loadData(true);
    }, 60000);

    return () => {
      unsubStatus();
      clearInterval(interval);
      customerRealtimeTracker.stop();
    };
  }, [loadData]);

  const handleCancelBooking = (bookingId: string, ref: string) => {
    Alert.alert(
      'Cancel Booking',
      `Are you sure you want to cancel booking ${ref}?`,
      [
        { text: 'No, Keep Booking', style: 'cancel' },
        {
          text: 'Yes, Cancel Ride',
          style: 'destructive',
          onPress: async () => {
            setCancellingId(bookingId);
            try {
              const res = await customerApiClient.fetch('/api/customer/cancel-booking', {
                method: 'POST',
                body: JSON.stringify({ bookingId, reason: 'Customer cancelled from mobile app' }),
              });
              if (res.success) {
                Alert.alert('Booking Cancelled', `Ride ${ref} has been cancelled.`);
                loadData();
              } else {
                Alert.alert('Notice', res.message || 'Cannot cancel booking at this time.');
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to cancel booking.');
            } finally {
              setCancellingId(null);
            }
          },
        },
      ]
    );
  };

  const getStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case BookingStatus.PENDING_ADMIN:
        return { label: 'Pending Dispatch', bg: '#fef3c7', text: '#92400e', border: '#fde68a' };
      case BookingStatus.DISPATCHED:
        return { label: 'Finding Driver', bg: '#dbeafe', text: '#1e40af', border: '#bfdbfe' };
      case BookingStatus.DRIVER_ACCEPTED:
        return { label: 'Driver Assigned', bg: '#e0e7ff', text: '#3730a3', border: '#c7d2fe' };
      case BookingStatus.DRIVER_EN_ROUTE:
        return { label: 'Driver En Route', bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' };
      case BookingStatus.TRIP_STARTED:
        return { label: 'Trip in Progress', bg: '#f3e8ff', text: '#6b21a8', border: '#e9d5ff' };
      case BookingStatus.TRIP_COMPLETED:
        return { label: 'Completed', bg: '#dcfce7', text: '#166534', border: '#bbf7d0' };
      case BookingStatus.CANCELLED:
        return { label: 'Cancelled', bg: '#fee2e2', text: '#991b1b', border: '#fecaca' };
      default:
        return { label: status, bg: '#f1f5f9', text: '#334155', border: '#e2e8f0' };
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={true} />

      {/* Top Header */}
      <View style={[styles.header, { paddingTop: topInset + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>My Profile & Bookings</Text>
          <Text style={styles.headerSub}>
            {user ? `${user.fullName || 'Customer'} • +91 ${user.phone}` : 'View your ride history'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.newRideBtn}
          onPress={() => router.push('/')}
        >
          <Text style={styles.newRideBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* Customer Profile Summary Card */}
      {user && (
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>
              {user.fullName ? user.fullName[0].toUpperCase() : 'U'}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.profileNameRow}>
              <Text style={styles.profileName}>{user.fullName || 'Valued Customer'}</Text>
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedBadgeText}>✓ Verified</Text>
              </View>
            </View>
            <Text style={styles.profilePhone}>📞 +91 {user.phone}</Text>
          </View>
        </View>
      )}

      {/* Filter Tabs */}
      <View style={styles.filterTabsContainer}>
        {STATUS_FILTERS.map((cat, idx) => (
          <React.Fragment key={cat}>
            {idx > 0 && <View style={styles.filterDivider} />}
            <TouchableOpacity
              style={[
                styles.filterTab,
                activeFilter === cat && styles.filterTabActive,
              ]}
              onPress={() => setActiveFilter(cat)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  activeFilter === cat && styles.filterTabTextActive,
                ]}
              >
                {cat === 'ALL' ? 'All Rides' : cat}
              </Text>
            </TouchableOpacity>
          </React.Fragment>
        ))}
      </View>

      {/* Bookings List */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
            tintColor="#ea580c"
          />
        }
      >
        {loading && bookings.length === 0 ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#ea580c" />
            <Text style={styles.loadingText}>Loading your bookings...</Text>
          </View>
        ) : bookings.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>🚕</Text>
            <Text style={styles.emptyTitle}>No bookings found</Text>
            <Text style={styles.emptySub}>
              {activeFilter === 'ACTIVE'
                ? 'You do not have any active rides right now.'
                : 'Ready for your next journey? Book a clean AC cab in seconds!'}
            </Text>
            <TouchableOpacity
              style={styles.bookNowBtn}
              onPress={() => router.push('/')}
            >
              <Text style={styles.bookNowBtnText}>Book a Cab Now ➔</Text>
            </TouchableOpacity>
          </View>
        ) : (
          bookings.map((booking) => {
            const badge = getStatusBadge(booking.status);
            const totalFare = Number(booking.estimatedFare || 0);
            const advancePaid = Number(booking.advanceAmount || 0);
            const balanceDue = Number(booking.balanceAmount || totalFare - advancePaid);
            const isBalancePending = booking.balancePaymentStatus === 'PENDING';

            const driver = booking.assignedDriver;
            const vehicle = booking.vehicle || driver?.vehicles?.[0];

            return (
              <View key={booking.id} style={styles.card}>
                {/* 1. Header: Ref, Status, Scheduled Date */}
                <View style={styles.cardHeader}>
                  <View>
                    <View style={styles.refRow}>
                      <Text style={styles.refText}>{booking.humanReadableRef}</Text>
                      <View
                        style={[
                          styles.statusPill,
                          { backgroundColor: badge.bg, borderColor: badge.border },
                        ]}
                      >
                        <Text style={[styles.statusPillText, { color: badge.text }]}>
                          {badge.label}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.scheduledText}>
                      Scheduled: <Text style={styles.scheduledBold}>
                        {new Date(booking.scheduledAt).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </Text>
                  </View>

                  <View style={styles.fareHeaderBlock}>
                    <Text style={styles.fareTotalAmount}>₹{totalFare.toFixed(2)}</Text>
                    <Text style={styles.advancePaidTag}>
                      Advance Paid: ₹{advancePaid.toFixed(2)} (25%)
                    </Text>
                  </View>
                </View>

                {/* 2. Trip Route Details */}
                <View style={styles.routeBox}>
                  <View style={styles.routeHeaderRow}>
                    <Text style={styles.routeBoxTitle}>
                      TRIP ROUTE ({booking.tripType})
                    </Text>
                    {booking.distanceKm ? (
                      <Text style={styles.routeDistanceText}>~{booking.distanceKm} km</Text>
                    ) : null}
                  </View>

                  <View style={styles.routePointRow}>
                    <Text style={styles.routeIcon}>📍</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pointLabel}>Pickup Location:</Text>
                      <Text style={styles.pointText}>{booking.pickupAddress}</Text>
                    </View>
                  </View>

                  <View style={styles.routePointRow}>
                    <Text style={styles.routeIcon}>🏁</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pointLabel}>Drop Destination:</Text>
                      <Text style={styles.pointText}>{booking.dropAddress}</Text>
                    </View>
                  </View>
                </View>

                {/* 3. Pickup OTP Box (If active ride) */}
                {booking.pickupOtp &&
                  booking.status !== BookingStatus.TRIP_COMPLETED &&
                  booking.status !== BookingStatus.CANCELLED && (
                    <View style={styles.otpBox}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.otpLabel}>🔑 PICKUP OTP</Text>
                        <Text style={styles.otpSub}>
                          Share this 4-digit code with your driver at pickup only to start the ride.
                        </Text>
                      </View>
                      <View style={styles.otpPill}>
                        <Text style={styles.otpPillText}>{booking.pickupOtp}</Text>
                      </View>
                    </View>
                  )}

                {/* 4. Driver & Vehicle Card */}
                <View style={styles.driverBox}>
                  <Text style={styles.driverBoxTitle}>🚖 DRIVER & VEHICLE</Text>
                  {driver ? (
                    <View style={styles.driverInfoRow}>
                      <View style={styles.driverAvatar}>
                        <Text style={styles.driverAvatarText}>
                          {driver.user?.fullName ? driver.user.fullName[0].toUpperCase() : 'D'}
                        </Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.driverName}>
                          {driver.user?.fullName || 'Assigned Driver'}
                        </Text>
                        <Text style={styles.driverVehicle}>
                          {vehicle?.category || booking.category || 'Prime Cab'} • {vehicle?.plateNumber || 'Verified Vehicle'}
                        </Text>
                      </View>
                      {driver.user?.phone && (
                        <TouchableOpacity
                          style={styles.driverCallBtn}
                          onPress={() => Linking.openURL(`tel:${driver.user.phone}`)}
                        >
                          <Ionicons name="call" size={14} color="#ffffff" />
                          <Text style={styles.driverCallBtnText}>Call</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : (
                    <View style={styles.unassignedRow}>
                      <Text style={styles.unassignedText}>
                        Dispatching to closest driver... Waiting for driver assignment
                      </Text>
                    </View>
                  )}
                </View>

                {/* 5. Payment & Invoice Breakdown */}
                <View style={styles.paymentBox}>
                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentLabel}>
                      Balance Due on Trip: <Text style={styles.paymentBold}>₹{balanceDue.toFixed(2)}</Text>{' '}
                      <Text style={[styles.paymentStatusTag, isBalancePending ? styles.statusPending : styles.statusPaid]}>
                        ({isBalancePending ? 'PENDING' : 'PAID'})
                      </Text>
                    </Text>
                  </View>
                </View>

                {/* 6. Action Buttons */}
                <View style={styles.cardActionsRow}>
                  <TouchableOpacity
                    style={styles.invoiceBtn}
                    onPress={() => setSelectedInvoiceId(booking.id)}
                  >
                    <Ionicons name="document-text-outline" size={15} color="#475569" />
                    <Text style={styles.invoiceBtnText}>View Tax Invoice</Text>
                  </TouchableOpacity>

                  {booking.status !== BookingStatus.TRIP_COMPLETED &&
                    booking.status !== BookingStatus.CANCELLED &&
                    booking.status !== BookingStatus.TRIP_STARTED && (
                      <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={() => handleCancelBooking(booking.id, booking.humanReadableRef)}
                        disabled={cancellingId === booking.id}
                      >
                        <Text style={styles.cancelBtnText}>
                          {cancellingId === booking.id ? 'Cancelling...' : 'Cancel Ride'}
                        </Text>
                      </TouchableOpacity>
                    )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Tax Invoice Modal */}
      {selectedInvoiceId && (
        <TaxInvoiceModal
          bookingId={selectedInvoiceId}
          isOpen={!!selectedInvoiceId}
          onClose={() => setSelectedInvoiceId(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  newRideBtn: {
    backgroundColor: '#ea580c',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  newRideBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  profileAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#ea580c',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  profileAvatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  verifiedBadge: {
    marginLeft: 8,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedBadgeText: {
    color: '#166534',
    fontSize: 10,
    fontWeight: '700',
  },
  profilePhone: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  filterTabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#e2e8f0',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  filterTabActive: {
    backgroundColor: '#0f172a',
  },
  filterTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  filterTabTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  centerBox: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  emptyBox: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 20,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  emptySub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 18,
  },
  bookNowBtn: {
    backgroundColor: '#ea580c',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  bookNowBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 12,
  },
  refRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  scheduledText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
  },
  scheduledBold: {
    color: '#334155',
    fontWeight: '700',
  },
  fareHeaderBlock: {
    alignItems: 'flex-end',
  },
  fareTotalAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  advancePaidTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16a34a',
    marginTop: 2,
  },
  routeBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  routeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  routeBoxTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  routeDistanceText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
  },
  routePointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
  },
  routeIcon: {
    fontSize: 14,
    marginRight: 8,
    marginTop: 1,
  },
  pointLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },
  pointText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 1,
  },
  otpBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
  },
  otpLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#92400e',
  },
  otpSub: {
    fontSize: 10,
    color: '#b45309',
    marginTop: 2,
    lineHeight: 14,
  },
  otpPill: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginLeft: 10,
  },
  otpPillText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#92400e',
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  driverBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  driverBoxTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  driverInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#ea580c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverAvatarText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  driverName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  driverVehicle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  driverCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16a34a',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 4,
  },
  driverCallBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  unassignedRow: {
    paddingVertical: 4,
  },
  unassignedText: {
    fontSize: 11,
    color: '#64748b',
    fontStyle: 'italic',
  },
  paymentBox: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paymentLabel: {
    fontSize: 12,
    color: '#475569',
  },
  paymentBold: {
    fontWeight: '800',
    color: '#0f172a',
  },
  paymentStatusTag: {
    fontSize: 11,
    fontWeight: '800',
  },
  statusPending: {
    color: '#ea580c',
  },
  statusPaid: {
    color: '#16a34a',
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 8,
  },
  invoiceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  invoiceBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#dc2626',
  },
});
