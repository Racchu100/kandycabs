import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  Alert,
  StatusBar,
  Linking,
} from 'react-native';
import { KANDY_THEME } from './theme';
import { testSupabaseConnection } from './services/supabase';

// Types
type TabType = 'BOOKING' | 'TRIPS' | 'FLEET' | 'ACCOUNT';
type TripType = 'ONEWAY' | 'ROUNDTRIP' | 'RENTAL' | 'AIRPORT';

interface VehicleOption {
  id: string;
  name: string;
  category: string;
  capacity: string;
  luggage: string;
  ratePerKm: number;
  baseFare: number;
  tag: string;
}

const VEHICLE_OPTIONS: VehicleOption[] = [
  {
    id: 'sedan',
    name: 'Sedan (Dzire / Etios)',
    category: 'Economy Sedan',
    capacity: '4 Seater',
    luggage: '2 Bags',
    ratePerKm: 14,
    baseFare: 2800,
    tag: 'MOST POPULAR',
  },
  {
    id: 'ertiga',
    name: 'SUV Ertiga',
    category: 'Family MUV',
    capacity: '6 Seater',
    luggage: '3 Bags',
    ratePerKm: 18,
    baseFare: 3600,
    tag: 'FAMILY CHOICE',
  },
  {
    id: 'innova',
    name: 'Innova Crysta',
    category: 'Executive Luxury',
    capacity: '7 Seater',
    luggage: '4 Bags',
    ratePerKm: 24,
    baseFare: 4800,
    tag: 'LUXURY AC',
  },
  {
    id: 'tempo',
    name: 'Tempo Traveller',
    category: 'Group Minibus',
    capacity: '12 Seater',
    luggage: '8 Bags',
    ratePerKm: 32,
    baseFare: 6400,
    tag: 'LARGE GROUP',
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('BOOKING');
  const [dbStatus, setDbStatus] = useState<string>('Connecting...');
  const [dbConnected, setDbConnected] = useState<boolean>(true);

  // Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [phone, setPhone] = useState<string>('9876543210');
  const [otp, setOtp] = useState<string>('');
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [customerName, setCustomerName] = useState<string>('Rakshith M');

  // Booking Wizard State
  const [tripType, setTripType] = useState<TripType>('ONEWAY');
  const [pickupCity, setPickupCity] = useState<string>('Bangalore, KA');
  const [dropCity, setDropCity] = useState<string>('Coorg (Madikeri), KA');
  const [pickupDate, setPickupDate] = useState<string>('Tomorrow, 06:00 AM');
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleOption>(VEHICLE_OPTIONS[0]);
  const [estimatedDistanceKm] = useState<number>(250);

  // Active Bookings List State
  const [userBookings, setUserBookings] = useState([
    {
      id: 'KC73744',
      status: 'DRIVER EN ROUTE',
      pickup: 'Bangalore, KA',
      drop: 'Coorg (Madikeri), KA',
      date: '15 Sep 2026, 06:00 AM',
      vehicleName: 'Innova Crysta (KA-01-MJ-4892)',
      totalFare: 4250,
      advancePaid: 1063,
      balanceDue: 3187,
      driverName: 'Ramesh Kumar',
      driverPhone: '8888888888',
      driverRating: '4.9 ★',
    },
    {
      id: 'KC69820',
      status: 'COMPLETED',
      pickup: 'Colombo',
      drop: 'Kandy',
      date: '10 Aug 2026, 08:30 AM',
      vehicleName: 'Sedan (Dzire)',
      totalFare: 3500,
      advancePaid: 875,
      balanceDue: 0,
      driverName: 'Saman Perera',
      driverPhone: '7771234567',
      driverRating: '5.0 ★',
    },
  ]);

  useEffect(() => {
    testSupabaseConnection().then((res) => {
      setDbStatus(res.message);
      setDbConnected(res.success);
    });
  }, []);

  // Fare Calculation
  const calculatedFare = Math.max(selectedVehicle.baseFare, estimatedDistanceKm * selectedVehicle.ratePerKm);
  const advancePayable = Math.round(calculatedFare * 0.25);
  const balancePayable = calculatedFare - advancePayable;

  const handleSendOtp = () => {
    if (phone.trim().length < 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    setOtpSent(true);
    Alert.alert('SMS OTP Sent', 'Use demo 4-digit code: 1234');
  };

  const handleVerifyOtp = () => {
    if (otp === '1234' || otp === '') {
      setIsLoggedIn(true);
      Alert.alert('Welcome!', `Logged in successfully as ${customerName}`);
    } else {
      Alert.alert('Error', 'Invalid OTP. Please enter 1234');
    }
  };

  const handleConfirmBooking = () => {
    const newRef = `KC${Math.floor(10000 + Math.random() * 90000)}`;
    const newBooking = {
      id: newRef,
      status: 'CONFIRMED',
      pickup: pickupCity,
      drop: dropCity,
      date: pickupDate,
      vehicleName: selectedVehicle.name,
      totalFare: calculatedFare,
      advancePaid: advancePayable,
      balanceDue: balancePayable,
      driverName: 'Assigning Chauffeur...',
      driverPhone: '9876543210',
      driverRating: '5.0 ★',
    };

    setUserBookings([newBooking, ...userBookings]);
    Alert.alert(
      'Booking Confirmed! 🎉',
      `Booking Ref: ${newRef}\n\nPickup: ${pickupCity}\nDrop: ${dropCity}\nVehicle: ${selectedVehicle.name}\nTotal: ₹${calculatedFare.toLocaleString()}\nAdvance Paid: ₹${advancePayable.toLocaleString()}`,
      [{ text: 'View My Trips', onPress: () => setActiveTab('TRIPS') }]
    );
  };

  const handleCallDriver = (phoneNum: string) => {
    Linking.openURL(`tel:${phoneNum}`).catch(() => {
      Alert.alert('Call Chauffeur', `Dialing +91 ${phoneNum}`);
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={KANDY_THEME.colors.ink} />

      {/* Header Bar */}
      <View style={styles.header}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>KC</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>KANDY CABS</Text>
          <Text style={styles.headerSubtitle}>Intercity Chauffeur Mobile App</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: dbConnected ? '#065F46' : '#92400E' }]}>
          <Text style={styles.statusPillText}>{dbStatus}</Text>
        </View>
      </View>

      {/* Bottom/Top Tab Navigation Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'BOOKING' && styles.tabItemActive]}
          onPress={() => setActiveTab('BOOKING')}
        >
          <Text style={[styles.tabText, activeTab === 'BOOKING' && styles.tabTextActive]}>🚗 BOOK CAB</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'TRIPS' && styles.tabItemActive]}
          onPress={() => setActiveTab('TRIPS')}
        >
          <Text style={[styles.tabText, activeTab === 'TRIPS' && styles.tabTextActive]}>📍 MY TRIPS</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'FLEET' && styles.tabItemActive]}
          onPress={() => setActiveTab('FLEET')}
        >
          <Text style={[styles.tabText, activeTab === 'FLEET' && styles.tabTextActive]}>🚘 FLEET</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'ACCOUNT' && styles.tabItemActive]}
          onPress={() => setActiveTab('ACCOUNT')}
        >
          <Text style={[styles.tabText, activeTab === 'ACCOUNT' && styles.tabTextActive]}>👤 ACCOUNT</Text>
        </TouchableOpacity>
      </View>

      {/* TAB 1: CAB BOOKING WIZARD */}
      {activeTab === 'BOOKING' && (
        <ScrollView style={styles.scrollContent}>
          {/* Trip Type Selector */}
          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>SELECT TRIP TYPE</Text>
            <View style={styles.pillRow}>
              {(['ONEWAY', 'ROUNDTRIP', 'RENTAL', 'AIRPORT'] as TripType[]).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.pill, tripType === t && styles.pillActive]}
                  onPress={() => setTripType(t)}
                >
                  <Text style={[styles.pillText, tripType === t && styles.pillTextActive]}>
                    {t === 'ONEWAY'
                      ? 'ONE-WAY'
                      : t === 'ROUNDTRIP'
                      ? 'ROUND TRIP'
                      : t === 'RENTAL'
                      ? 'LOCAL RENTAL'
                      : 'AIRPORT TAXI'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Location Inputs */}
            <Text style={styles.inputLabel}>PICKUP LOCATION</Text>
            <TextInput
              style={styles.input}
              value={pickupCity}
              onChangeText={setPickupCity}
              placeholder="e.g. Bangalore, KA / Colombo"
            />

            <Text style={styles.inputLabel}>DROP LOCATION</Text>
            <TextInput
              style={styles.input}
              value={dropCity}
              onChangeText={setDropCity}
              placeholder="e.g. Coorg, KA / Kandy"
            />

            <Text style={styles.inputLabel}>SCHEDULED DATE & TIME</Text>
            <TextInput
              style={styles.input}
              value={pickupDate}
              onChangeText={setPickupDate}
              placeholder="e.g. Tomorrow, 06:00 AM"
            />
          </View>

          {/* Vehicle Category Selector */}
          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>CHOOSE VEHICLE CATEGORY</Text>
            {VEHICLE_OPTIONS.map((v) => {
              const isSelected = selectedVehicle.id === v.id;
              const fare = Math.max(v.baseFare, estimatedDistanceKm * v.ratePerKm);
              return (
                <TouchableOpacity
                  key={v.id}
                  style={[styles.vehicleCard, isSelected && styles.vehicleCardSelected]}
                  onPress={() => setSelectedVehicle(v)}
                >
                  <View style={{ flex: 1 }}>
                    <View style={styles.vehicleHeaderRow}>
                      <Text style={styles.vehicleTitle}>{v.name}</Text>
                      <Text style={styles.tagText}>{v.tag}</Text>
                    </View>
                    <Text style={styles.vehicleSub}>
                      {v.capacity} • {v.luggage} • AC
                    </Text>
                    <Text style={styles.vehicleRate}>₹{v.ratePerKm}/km (Min ₹{v.baseFare})</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.vehicleFare}>₹{fare.toLocaleString()}</Text>
                    <Text style={styles.vehicleFareSub}>Est. Total</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Fare Summary & Booking Action */}
          <View style={styles.fareSummaryCard}>
            <Text style={styles.fareSummaryTitle}>FARE ESTIMATE BREAKDOWN</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Estimated Distance:</Text>
              <Text style={styles.infoValue}>~{estimatedDistanceKm} km</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Selected Cab Rate:</Text>
              <Text style={styles.infoValue}>₹{selectedVehicle.ratePerKm}/km</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Total Estimated Fare:</Text>
              <Text style={styles.infoValueHighlight}>₹{calculatedFare.toLocaleString()}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>25% Advance Payable Now:</Text>
              <Text style={[styles.infoValue, { color: KANDY_THEME.colors.primary }]}>
                ₹{advancePayable.toLocaleString()}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Balance Due at Trip End:</Text>
              <Text style={styles.infoValue}>₹{balancePayable.toLocaleString()}</Text>
            </View>

            <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmBooking}>
              <Text style={styles.confirmButtonText}>
                CONFIRM & BOOK {selectedVehicle.name.toUpperCase()} (₹{advancePayable.toLocaleString()} ADVANCE) →
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* TAB 2: MY TRIPS & LIVE TRACKING */}
      {activeTab === 'TRIPS' && (
        <ScrollView style={styles.scrollContent}>
          <Text style={styles.pageHeading}>MY TRIPS & BOOKINGS</Text>
          {userBookings.map((b) => (
            <View key={b.id} style={styles.tripCard}>
              <View style={styles.tripHeader}>
                <Text style={styles.tripRef}>Ref: {b.id}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        b.status === 'COMPLETED' ? '#D1FAE5' : b.status === 'DRIVER EN ROUTE' ? '#FEF3C7' : '#DBEAFE',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color:
                          b.status === 'COMPLETED' ? '#065F46' : b.status === 'DRIVER EN ROUTE' ? '#92400E' : '#1E40AF',
                      },
                    ]}
                  >
                    {b.status}
                  </Text>
                </View>
              </View>

              <View style={styles.routeContainer}>
                <Text style={styles.routeText}>📍 Pickup: {b.pickup}</Text>
                <Text style={styles.routeArrow}>↓</Text>
                <Text style={styles.routeText}>🏁 Destination: {b.drop}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Scheduled Date:</Text>
                <Text style={styles.infoValue}>{b.date}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Vehicle Assigned:</Text>
                <Text style={styles.infoValue}>{b.vehicleName}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Estimated Fare:</Text>
                <Text style={styles.infoValue}>₹{b.totalFare.toLocaleString()}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>25% Advance Paid:</Text>
                <Text style={[styles.infoValue, { color: KANDY_THEME.colors.success }]}>
                  ₹{b.advancePaid.toLocaleString()} (PAID)
                </Text>
              </View>

              {b.balanceDue > 0 && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Balance Due at Trip End:</Text>
                  <Text style={[styles.infoValue, { color: KANDY_THEME.colors.primary }]}>
                    ₹{b.balanceDue.toLocaleString()}
                  </Text>
                </View>
              )}

              {/* Chauffeur Card */}
              {b.status !== 'COMPLETED' ? (
                <View style={styles.driverBox}>
                  <Text style={styles.driverTitle}>ASSIGNED CHAUFFEUR:</Text>
                  <Text style={styles.driverName}>
                    {b.driverName} ({b.driverRating})
                  </Text>
                  <TouchableOpacity style={styles.callButton} onPress={() => handleCallDriver(b.driverPhone)}>
                    <Text style={styles.callButtonText}>📞 CALL CHAUFFEUR (+91 {b.driverPhone})</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={[styles.driverBox, { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' }]}>
                  <Text style={[styles.driverTitle, { color: '#4B5563' }]}>COMPLETED CHAUFFEUR:</Text>
                  <Text style={[styles.driverName, { color: '#1F2937' }]}>{b.driverName}</Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {/* TAB 3: FLEET & RATES */}
      {activeTab === 'FLEET' && (
        <ScrollView style={styles.scrollContent}>
          <Text style={styles.pageHeading}>OUR FLEET & RATES</Text>
          {VEHICLE_OPTIONS.map((v) => (
            <View key={v.id} style={styles.fleetCard}>
              <View style={styles.fleetHeader}>
                <Text style={styles.fleetTitle}>{v.name}</Text>
                <Text style={styles.tagText}>{v.tag}</Text>
              </View>
              <Text style={styles.fleetSub}>{v.category}</Text>
              <View style={styles.fleetFeatureRow}>
                <Text style={styles.fleetFeature}>👥 {v.capacity}</Text>
                <Text style={styles.fleetFeature}>🧳 {v.luggage}</Text>
                <Text style={styles.fleetFeature}>❄️ AC Cabs</Text>
              </View>
              <View style={styles.fleetRateRow}>
                <Text style={styles.fleetRateText}>Rate: ₹{v.ratePerKm}/km</Text>
                <Text style={styles.fleetBaseText}>Min. Distance: 200 km/day</Text>
              </View>
              <TouchableOpacity
                style={styles.bookFleetBtn}
                onPress={() => {
                  setSelectedVehicle(v);
                  setActiveTab('BOOKING');
                }}
              >
                <Text style={styles.bookFleetBtnText}>BOOK THIS VEHICLE →</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {/* TAB 4: ACCOUNT & LOGIN */}
      {activeTab === 'ACCOUNT' && (
        <ScrollView style={styles.scrollContent}>
          {!isLoggedIn ? (
            <View style={styles.authCard}>
              <Text style={styles.cardTitle}>Customer Login / Signup</Text>
              <Text style={styles.cardDesc}>Enter your 10-digit mobile number for SMS OTP verification</Text>

              <Text style={styles.inputLabel}>YOUR FULL NAME</Text>
              <TextInput
                style={styles.input}
                value={customerName}
                onChangeText={setCustomerName}
                placeholder="Enter Full Name"
              />

              <Text style={styles.inputLabel}>MOBILE NUMBER</Text>
              <TextInput
                style={styles.input}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                placeholder="10-digit mobile number"
              />

              {!otpSent ? (
                <TouchableOpacity style={styles.primaryButton} onPress={handleSendOtp}>
                  <Text style={styles.buttonText}>SEND 4-DIGIT OTP →</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <View style={styles.demoOtpBox}>
                    <Text style={styles.demoOtpText}>Demo Master OTP: 1234</Text>
                  </View>
                  <Text style={styles.inputLabel}>ENTER 4-DIGIT OTP</Text>
                  <TextInput
                    style={[styles.input, { textAlign: 'center', fontSize: 20, letterSpacing: 6 }]}
                    keyboardType="number-pad"
                    maxLength={4}
                    value={otp}
                    onChangeText={setOtp}
                    placeholder="1234"
                  />
                  <TouchableOpacity style={styles.primaryButton} onPress={handleVerifyOtp}>
                    <Text style={styles.buttonText}>VERIFY & LOGIN →</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          ) : (
            <View style={styles.profileCard}>
              <Text style={styles.profileTitle}>CUSTOMER PROFILE</Text>
              <Text style={styles.profileName}>{customerName}</Text>
              <Text style={styles.profilePhone}>📱 +91 {phone}</Text>

              <View style={styles.profileStatsRow}>
                <View style={styles.profileStatItem}>
                  <Text style={styles.profileStatVal}>{userBookings.length}</Text>
                  <Text style={styles.profileStatLbl}>Total Trips</Text>
                </View>
                <View style={styles.profileStatItem}>
                  <Text style={styles.profileStatVal}>4.9 ★</Text>
                  <Text style={styles.profileStatLbl}>Rating</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.callSupportBtn} onPress={() => handleCallDriver('9876543210')}>
                <Text style={styles.callSupportText}>📞 24x7 CUSTOMER SUPPORT HELPLINE</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.logoutBtn} onPress={() => setIsLoggedIn(false)}>
                <Text style={styles.logoutBtnText}>LOGOUT OF ACCOUNT</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: KANDY_THEME.colors.bg,
  },
  header: {
    backgroundColor: KANDY_THEME.colors.ink,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 38,
    height: 38,
    backgroundColor: KANDY_THEME.colors.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 18,
  },
  headerTitle: {
    color: KANDY_THEME.colors.primary,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusPillText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: KANDY_THEME.colors.ink,
    borderTopWidth: 1,
    borderTopColor: '#2C3038',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabItemActive: {
    borderBottomWidth: 3,
    borderBottomColor: KANDY_THEME.colors.primary,
    backgroundColor: '#1F242D',
  },
  tabText: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '800',
  },
  tabTextActive: {
    color: KANDY_THEME.colors.primary,
  },
  scrollContent: {
    padding: 14,
  },
  pageHeading: {
    fontSize: 18,
    fontWeight: '900',
    color: KANDY_THEME.colors.ink,
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: KANDY_THEME.colors.border,
  },
  cardSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: KANDY_THEME.colors.ink,
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  pill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  pillActive: {
    backgroundColor: KANDY_THEME.colors.primary,
  },
  pillText: {
    color: KANDY_THEME.colors.ink,
    fontSize: 11,
    fontWeight: '800',
  },
  pillTextActive: {
    color: '#FFF',
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: KANDY_THEME.colors.textMuted,
    marginBottom: 4,
    marginTop: 6,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: KANDY_THEME.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: '600',
    color: KANDY_THEME.colors.ink,
    marginBottom: 10,
  },
  vehicleCard: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: KANDY_THEME.colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleCardSelected: {
    backgroundColor: '#FFF7ED',
    borderColor: KANDY_THEME.colors.primary,
    borderWidth: 2,
  },
  vehicleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vehicleTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: KANDY_THEME.colors.ink,
  },
  tagText: {
    fontSize: 9,
    fontWeight: '800',
    color: KANDY_THEME.colors.primary,
    backgroundColor: '#FFEDD5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  vehicleSub: {
    fontSize: 11,
    color: KANDY_THEME.colors.textMuted,
    marginTop: 2,
  },
  vehicleRate: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    marginTop: 4,
  },
  vehicleFare: {
    fontSize: 16,
    fontWeight: '900',
    color: KANDY_THEME.colors.primary,
  },
  vehicleFareSub: {
    fontSize: 9,
    color: KANDY_THEME.colors.textMuted,
  },
  fareSummaryCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: KANDY_THEME.colors.primary,
  },
  fareSummaryTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: KANDY_THEME.colors.ink,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 12,
    color: KANDY_THEME.colors.textMuted,
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '700',
    color: KANDY_THEME.colors.ink,
  },
  infoValueHighlight: {
    fontSize: 14,
    fontWeight: '900',
    color: KANDY_THEME.colors.ink,
  },
  confirmButton: {
    backgroundColor: KANDY_THEME.colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 14,
  },
  confirmButtonText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  tripCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: KANDY_THEME.colors.border,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tripRef: {
    fontSize: 15,
    fontWeight: '900',
    color: KANDY_THEME.colors.primary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontWeight: '800',
    fontSize: 10,
  },
  routeContainer: {
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  routeText: {
    fontSize: 12,
    fontWeight: '700',
    color: KANDY_THEME.colors.ink,
  },
  routeArrow: {
    fontSize: 12,
    color: KANDY_THEME.colors.primary,
    marginVertical: 2,
    marginLeft: 4,
  },
  driverBox: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  driverTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065F46',
  },
  driverName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#064E3B',
    marginVertical: 4,
  },
  callButton: {
    backgroundColor: '#059669',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 4,
  },
  callButtonText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 11,
  },
  fleetCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: KANDY_THEME.colors.border,
  },
  fleetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fleetTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: KANDY_THEME.colors.ink,
  },
  fleetSub: {
    fontSize: 12,
    color: KANDY_THEME.colors.textMuted,
    marginBottom: 8,
  },
  fleetFeatureRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 8,
  },
  fleetFeature: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
  },
  fleetRateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    padding: 8,
    borderRadius: 6,
    marginVertical: 8,
  },
  fleetRateText: {
    fontSize: 13,
    fontWeight: '900',
    color: KANDY_THEME.colors.primary,
  },
  fleetBaseText: {
    fontSize: 11,
    color: KANDY_THEME.colors.textMuted,
  },
  bookFleetBtn: {
    backgroundColor: KANDY_THEME.colors.ink,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 6,
  },
  bookFleetBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  authCard: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: KANDY_THEME.colors.border,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: KANDY_THEME.colors.ink,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    color: KANDY_THEME.colors.textMuted,
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: KANDY_THEME.colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 12,
  },
  demoOtpBox: {
    backgroundColor: '#FFEDD5',
    padding: 8,
    borderRadius: 6,
    marginVertical: 10,
  },
  demoOtpText: {
    color: KANDY_THEME.colors.primary,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  profileCard: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: KANDY_THEME.colors.border,
  },
  profileTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: KANDY_THEME.colors.textMuted,
    marginBottom: 6,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '900',
    color: KANDY_THEME.colors.ink,
  },
  profilePhone: {
    fontSize: 13,
    color: KANDY_THEME.colors.textMuted,
    marginTop: 2,
    marginBottom: 16,
  },
  profileStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  profileStatItem: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  profileStatVal: {
    fontSize: 18,
    fontWeight: '900',
    color: KANDY_THEME.colors.primary,
  },
  profileStatLbl: {
    fontSize: 10,
    color: KANDY_THEME.colors.textMuted,
    fontWeight: '700',
  },
  callSupportBtn: {
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  callSupportText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  logoutBtn: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutBtnText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '800',
  },
});
