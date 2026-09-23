import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Platform,
  Alert,
  ActivityIndicator,
  Linking,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { LocationPickerModal } from '../components/LocationPickerModal';
import { DatePickerModal } from '../components/DatePickerModal';
import { TimePickerModal } from '../components/TimePickerModal';
import { AuthModal } from '../components/AuthModal';
import { HamburgerDrawer } from '../components/HamburgerDrawer';
import { CustomerBottomDock } from '../components/CustomerBottomDock';
import { customerApiClient, customerTokenStorage } from '../lib/api';
import { ALL_LOCATIONS, PlaceLocation } from '../lib/locations';

const { width } = Dimensions.get('window');

type TripType = 'ONEWAY' | 'ROUND' | 'LOCAL' | 'AIRPORT';

interface FleetItem {
  id: string;
  name: string;
  models: string;
  ratePerKm: number;
  badge: string;
  badgeIcon: string;
  primaryColor: string;
  badgeBg: string;
  lightBg: string;
  border: string;
  image: any;
  purpose: string;
  passengers: number;
  luggage: number;
  features: string[];
}

const FLEET_DATA: FleetItem[] = [
  {
    id: 'HATCHBACK',
    name: 'Hatchback',
    models: 'WagonR, Tiago, Celerio',
    ratePerKm: 11,
    badge: 'ECONOMY CHOICE',
    badgeIcon: 'leaf-outline',
    primaryColor: '#059669', // Vibrant Emerald Green
    badgeBg: '#059669',
    lightBg: '#f0fdf4',
    border: '#86efac',
    image: require('../assets/images/fleet-hatchback.png'),
    purpose: 'Budget city & short outstation trips',
    passengers: 4,
    luggage: 2,
    features: [
      '4 Passengers',
      '2 Luggage Bags',
      'Air Conditioned & Clean Interiors',
      'Real-time GPS Tracking + OTP Gate',
    ],
  },
  {
    id: 'SEDAN',
    name: 'Prime Sedan',
    models: 'Dzire, Etios, Honda Amaze',
    ratePerKm: 13,
    badge: 'MOST POPULAR',
    badgeIcon: 'ribbon-outline',
    primaryColor: '#2563eb', // Royal Blue
    badgeBg: '#2563eb',
    lightBg: '#eff6ff',
    border: '#bfdbfe',
    image: require('../assets/images/fleet-sedan.png'),
    purpose: 'Comfortable family & business highway rides',
    passengers: 4,
    luggage: 3,
    features: [
      '4 Passengers',
      '3 Large Luggage Bags',
      'High Trunk Space & Extra Legroom',
      'Real-time GPS Tracking + OTP Gate',
    ],
  },
  {
    id: 'SUV',
    name: 'Prime SUV (6+1)',
    models: 'Ertiga, Carens, Triber',
    ratePerKm: 16,
    badge: 'EXTRA SPACE',
    badgeIcon: 'star',
    primaryColor: '#7c3aed', // Purple / Violet
    badgeBg: '#7c3aed',
    lightBg: '#faf5ff',
    border: '#ddd6fe',
    image: require('../assets/images/fleet-suv.png'),
    purpose: 'Family vacations, hill stations & extra luggage',
    passengers: 6,
    luggage: 4,
    features: [
      '6 Passengers',
      '4 Large Bags',
      'Powerful AC & High Ground Clearance',
      'Real-time GPS Tracking + OTP Gate',
    ],
  },
  {
    id: 'CRYSTA',
    name: 'Innova Crysta Luxury',
    models: 'Toyota Innova Crysta / Hycross',
    ratePerKm: 20,
    badge: 'PREMIUM COMFORT',
    badgeIcon: 'diamond-outline',
    primaryColor: '#9333ea', // Deep Luxury Violet
    badgeBg: '#9333ea',
    lightBg: '#fdf4ff',
    border: '#f0abfc',
    image: require('../assets/images/fleet-crysta.png'),
    purpose: 'VIP travel, long distance hill tours & unmatched comfort',
    passengers: 7,
    luggage: 5,
    features: [
      '7 Passengers',
      '5 Luggage Bags',
      'Plush Captain Seats & Smooth Ride',
      'Top-rated Chauffeurs & Highway Expert',
    ],
  },
  {
    id: 'TRAVELLER',
    name: 'Tempo Traveller (12+1)',
    models: 'Force Traveller 3350 AC',
    ratePerKm: 26,
    badge: 'GROUP TRAVEL',
    badgeIcon: 'people-outline',
    primaryColor: '#b45309', // Amber / Gold
    badgeBg: '#b45309',
    lightBg: '#fffbeb',
    border: '#fde68a',
    image: require('../assets/images/fleet-traveller.png'),
    purpose: 'Corporate outings, wedding parties & large groups',
    passengers: 14,
    luggage: 10,
    features: [
      '12 - 17 Passengers',
      '10+ Luggage Capacity',
      'Reclining Seats & High Roof Walking Space',
      'Experienced Long-distance Chauffeurs',
    ],
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0);
  const scrollRef = useRef<ScrollView>(null);

  // User & Auth State
  const [user, setUser] = useState<any | null>(null);
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);

  // Booking Engine State
  const [tripType, setTripType] = useState<TripType>('ONEWAY');
  const [pickupLoc, setPickupLoc] = useState<PlaceLocation | null>(null);
  const [dropLoc, setDropLoc] = useState<PlaceLocation | null>(null);
  const [pickupDate, setPickupDate] = useState('22-09-2026');
  const [pickupTime, setPickupTime] = useState('09:00');
  const [localHours, setLocalHours] = useState<number>(8);
  const [airportMode, setAirportMode] = useState<'PICKUP' | 'DROP'>('DROP');

  // Modals
  const [locationPickerMode, setLocationPickerMode] = useState<'PICKUP' | 'DROP' | null>(null);
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [timeModalVisible, setTimeModalVisible] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Load User Session
  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await customerApiClient.fetch('/api/auth/me');
        if (res && res.user) {
          setUser(res.user);
        }
      } catch {
        // Guest mode
      }
    }
    fetchUser();
  }, []);

  const handleDirectLiveGps = async () => {
    setGpsLoading(true);
    try {
      // 1. Check if location services enabled
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled && Platform.OS === 'android') {
        try {
          await Location.enableNetworkProviderAsync();
        } catch {}
      }

      // 2. Request permission
      let { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        const req = await Location.requestForegroundPermissionsAsync();
        status = req.status;
      }
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Please allow location permission to auto-detect your location.', [
          { text: 'Cancel' },
          { text: 'Settings', onPress: () => Linking.openSettings() },
        ]);
        setGpsLoading(false);
        return;
      }

      // 3. Force fresh highest accuracy coordinates
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });

      const { latitude, longitude } = loc.coords;

      // 4. Reverse Geocode via OSM
      let label = 'Current GPS Location';
      let sublabel = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
          {
            headers: {
              'Accept-Language': 'en',
              'User-Agent': 'KandyCabsCustomerApp/1.0',
            },
          }
        );
        if (res.ok) {
          const data = await res.json();
          const addr = data.address || {};
          const road = addr.road || addr.pedestrian || addr.street || addr.amenity || addr.building || '';
          const locality = addr.suburb || addr.neighbourhood || addr.village || addr.residential || '';
          const city = addr.city || addr.town || addr.municipality || 'Mangaluru';

          const parts: string[] = [];
          if (road) parts.push(road);
          if (locality && locality !== road) parts.push(locality);
          if (city && !parts.some((p) => p.toLowerCase().includes(city.toLowerCase()))) {
            parts.push(city);
          }

          if (parts.length > 0) {
            label = parts.join(', ');
          }
          sublabel = [locality, city, addr.state].filter(Boolean).join(', ') || sublabel;
        }
      } catch {
        // Fallback to coordinates
      }

      setPickupLoc({
        label,
        sublabel,
        lat: latitude,
        lng: longitude,
        source: 'OSM_LIVE',
      });
    } catch (err: any) {
      Alert.alert('GPS Location', 'Could not get fresh GPS coordinates. Please check your location settings.');
    } finally {
      setGpsLoading(false);
    }
  };

  const handleLogout = () => {
    customerTokenStorage.removeToken();
    setUser(null);
    Alert.alert('Signed Out', 'You have been signed out successfully.');
  };

  const handleSwapLocations = () => {
    const temp = pickupLoc;
    setPickupLoc(dropLoc);
    setDropLoc(temp);
  };

  const handleExploreCabs = () => {
    if (!pickupLoc) {
      Alert.alert('Pickup Required', 'Please select your pickup point or tap Live GPS.');
      setLocationPickerMode('PICKUP');
      return;
    }
    if (!dropLoc && tripType !== 'LOCAL') {
      Alert.alert('Drop Destination Required', 'Please select your destination.');
      setLocationPickerMode('DROP');
      return;
    }

    router.push({
      pathname: '/select-cab',
      params: {
        pickup: pickupLoc.label,
        pickupLat: String(pickupLoc.lat),
        pickupLng: String(pickupLoc.lng),
        drop: dropLoc ? dropLoc.label : 'Local Rental',
        dropLat: String(dropLoc ? dropLoc.lat : pickupLoc.lat),
        dropLng: String(dropLoc ? dropLoc.lng : pickupLoc.lng),
        date: pickupDate,
        time: pickupTime,
        tripType,
        localHours: String(localHours),
      },
    });
  };

  const handleBookVehicle = (item: FleetItem) => {
    if (!pickupLoc) {
      Alert.alert('Pickup Required', 'Please select your pickup point or tap Live GPS.');
      setLocationPickerMode('PICKUP');
      return;
    }
    if (!dropLoc && tripType !== 'LOCAL') {
      Alert.alert('Drop Destination Required', 'Please select your destination.');
      setLocationPickerMode('DROP');
      return;
    }

    router.push({
      pathname: '/select-cab',
      params: {
        pickup: pickupLoc.label,
        pickupLat: String(pickupLoc.lat),
        pickupLng: String(pickupLoc.lng),
        drop: dropLoc ? dropLoc.label : 'Local Rental',
        dropLat: String(dropLoc ? dropLoc.lat : pickupLoc.lat),
        dropLng: String(dropLoc ? dropLoc.lng : pickupLoc.lng),
        date: pickupDate,
        time: pickupTime,
        tripType,
        localHours: String(localHours),
        selectedCategory: item.id,
      },
    });
  };

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={true} />

      {/* 1. Top Navigation Bar */}
      <View style={[styles.navBar, { paddingTop: topInset + 8 }]}>
        <Image
          source={require('../assets/images/logo.png')}
          style={styles.navLogo}
          contentFit="contain"
          cachePolicy="memory-disk"
          transition={200}
        />

        <View style={styles.navRight}>
          {user ? (
            <TouchableOpacity
              style={styles.avatarBtn}
              onPress={() => router.push('/my-bookings')}
              activeOpacity={0.8}
            >
              <Text style={styles.avatarLetter}>
                {user.fullName ? user.fullName[0].toUpperCase() : 'R'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.signInHeaderBtn}
              onPress={() => setAuthModalVisible(true)}
            >
              <Ionicons name="log-in-outline" size={15} color="#ea580c" />
              <Text style={styles.signInHeaderText}>Sign In</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.hamburgerBtn}
            onPress={() => setDrawerVisible(true)}
          >
            <Ionicons name="menu" size={20} color="#1e293b" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Scrollable Content */}
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. Main Booking Engine Card (Matching Screenshot 1) */}
        <View style={styles.bookingCard}>
          {/* Subtype Switcher */}
          {tripType === 'LOCAL' ? (
            <View style={styles.subtypeTabs}>
              {[
                { h: 4, label: '4 hrs (40 km)' },
                { h: 8, label: '8 hrs (80 km)' },
                { h: 12, label: '12 hrs (120 km)' },
              ].map((pkg) => (
                <TouchableOpacity
                  key={pkg.h}
                  style={[
                    styles.subtypeTab,
                    localHours === pkg.h && styles.subtypeTabActive,
                  ]}
                  onPress={() => setLocalHours(pkg.h)}
                >
                  <Text
                    style={[
                      styles.subtypeTabText,
                      localHours === pkg.h && styles.subtypeTabTextActive,
                    ]}
                  >
                    {pkg.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : tripType === 'AIRPORT' ? (
            <View style={styles.subtypeTabs}>
              {[
                { id: 'PICKUP' as const, label: 'Pickup (From Airport)' },
                { id: 'DROP' as const, label: 'Drop (To Airport)' },
              ].map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.subtypeTab,
                    airportMode === item.id && styles.subtypeTabActive,
                  ]}
                  onPress={() => setAirportMode(item.id)}
                >
                  <Text
                    style={[
                      styles.subtypeTabText,
                      airportMode === item.id && styles.subtypeTabTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.subtypeTabs}>
              <TouchableOpacity
                style={[
                  styles.subtypeTab,
                  tripType === 'ONEWAY' && styles.subtypeTabActive,
                ]}
                onPress={() => setTripType('ONEWAY')}
              >
                <Text
                  style={[
                    styles.subtypeTabText,
                    tripType === 'ONEWAY' && styles.subtypeTabTextActive,
                  ]}
                >
                  Outstation One-Way
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.subtypeTab,
                  tripType === 'ROUND' && styles.subtypeTabActive,
                ]}
                onPress={() => setTripType('ROUND')}
              >
                <Text
                  style={[
                    styles.subtypeTabText,
                    tripType === 'ROUND' && styles.subtypeTabTextActive,
                  ]}
                >
                  Round Trip
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Form Fields Container */}
          <View style={styles.formBody}>
            {/* Pickup Location */}
            <View style={styles.fieldGroup}>
              <View style={styles.fieldHeader}>
                <Text style={styles.fieldLabel}>PICKUP LOCATION</Text>
                <TouchableOpacity
                  style={styles.liveGpsTag}
                  onPress={handleDirectLiveGps}
                  disabled={gpsLoading}
                >
                  {gpsLoading ? (
                    <ActivityIndicator size="small" color="#ea580c" />
                  ) : (
                    <>
                      <Ionicons name="flash" size={11} color="#ea580c" />
                      <Text style={styles.liveGpsText}>Live GPS</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.fieldTrigger}
                onPress={() => setLocationPickerMode('PICKUP')}
              >
                <View style={[styles.dotIcon, { backgroundColor: pickupLoc ? '#22c55e' : '#cbd5e1' }]} />
                <Text
                  style={[styles.fieldValueText, !pickupLoc && styles.fieldPlaceholderText]}
                  numberOfLines={1}
                >
                  {pickupLoc ? pickupLoc.label : 'Select pickup location (or Live GPS)'}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {/* Swap Button */}
            <View style={styles.swapRow}>
              <TouchableOpacity style={styles.swapBtn} onPress={handleSwapLocations}>
                <Ionicons name="swap-vertical" size={16} color="#ea580c" />
              </TouchableOpacity>
            </View>

            {/* Drop Destination */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>DROP DESTINATION</Text>
              <TouchableOpacity
                style={styles.fieldTrigger}
                onPress={() => setLocationPickerMode('DROP')}
              >
                <View style={[styles.dotIcon, { backgroundColor: dropLoc ? '#ef4444' : '#cbd5e1' }]} />
                <Text
                  style={[styles.fieldValueText, !dropLoc && styles.fieldPlaceholderText]}
                  numberOfLines={1}
                >
                  {dropLoc ? dropLoc.label : 'Select drop destination'}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {/* Pickup Date */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>PICKUP DATE</Text>
              <TouchableOpacity
                style={styles.fieldTrigger}
                onPress={() => setDateModalVisible(true)}
              >
                <Text style={styles.fieldValueText}>{pickupDate}</Text>
                <Ionicons name="calendar-outline" size={18} color="#475569" />
              </TouchableOpacity>
            </View>

            {/* Pickup Time */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>PICKUP TIME</Text>
              <TouchableOpacity
                style={styles.fieldTrigger}
                onPress={() => setTimeModalVisible(true)}
              >
                <Text style={styles.fieldValueText}>{pickupTime}</Text>
                <Ionicons name="time-outline" size={18} color="#475569" />
              </TouchableOpacity>
            </View>

            {/* Explore Cabs Button */}
            <TouchableOpacity
              style={styles.exploreCabsBtn}
              onPress={handleExploreCabs}
            >
              <Ionicons name="flash" size={16} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.exploreCabsBtnText}>Explore Cabs</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. Fleet & Rates Section (2 in a Row Grid) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionBadge}>VERIFIED FLEET</Text>
          <Text style={styles.sectionTitle}>Select Your Perfect Ride</Text>
          <Text style={styles.sectionSubtitle}>
            Transparent fixed pricing • Clean AC cabs • Experienced verified chauffeurs
          </Text>
        </View>

        <View style={styles.fleetGrid}>
          {FLEET_DATA.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.fleetGridCard, { borderColor: item.border }]}
              onPress={() => handleBookVehicle(item)}
              activeOpacity={0.85}
            >
              {/* Distinct Colored Badge */}
              <View style={[styles.gridChoiceBadge, { backgroundColor: item.badgeBg }]}>
                <Ionicons name={item.badgeIcon as any} size={11} color="#ffffff" />
                <Text style={styles.gridChoiceBadgeText}>{item.badge}</Text>
              </View>

              {/* Car Image with Passengers */}
              <View style={styles.gridCarImageContainer}>
                <Image
                  source={item.image}
                  style={styles.gridCarImage}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                  transition={200}
                />
              </View>

              {/* Title & Models Row */}
              <View style={styles.gridVehicleInfo}>
                <View style={[styles.gridVehicleIconBox, { backgroundColor: item.lightBg }]}>
                  <Ionicons name="car-outline" size={18} color={item.primaryColor} />
                </View>
                <View style={styles.gridVehicleTextContainer}>
                  <Text style={styles.gridVehicleName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.gridVehicleModels} numberOfLines={1}>
                    {item.models}
                  </Text>
                </View>
              </View>

              {/* Purpose Subtitle Pill */}
              <View style={[styles.gridPurposePill, { backgroundColor: item.lightBg }]}>
                <Text style={[styles.gridPurposeText, { color: item.primaryColor }]} numberOfLines={1}>
                  {item.purpose}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Why Choose Us & Helpline */}
        <View style={styles.whyUsCard}>
          <Text style={styles.whyUsTitle}>Why Choose Kandy Cabs?</Text>
          <View style={styles.whyUsGrid}>
            {[
              { icon: 'shield-checkmark', title: 'Guaranteed Cabs', desc: 'No last minute driver cancellations' },
              { icon: 'pricetag', title: 'Transparent Rates', desc: 'Zero hidden surge fares or surprise bills' },
              { icon: 'navigate', title: 'Live GPS Tracking', desc: 'Realtime ride sharing with family & friends' },
              { icon: 'call', title: '24/7 Helpline Support', desc: 'Dedicated helpline: +91 80456 89000' },
            ].map((v, i) => (
              <View key={i} style={styles.whyUsItem}>
                <View style={styles.whyUsIconBox}>
                  <Ionicons name={v.icon as any} size={18} color="#ea580c" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.whyUsItemTitle}>{v.title}</Text>
                  <Text style={styles.whyUsItemDesc}>{v.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 90 }} />
      </ScrollView>

      {/* 4. Floating Bottom Dock (Memoized) */}
      <CustomerBottomDock activeType={tripType} onSelectType={setTripType} />

      {/* Location Picker Modal */}
      <LocationPickerModal
        visible={locationPickerMode !== null}
        onClose={() => setLocationPickerMode(null)}
        title={locationPickerMode === 'PICKUP' ? 'Select Pickup Location' : 'Select Drop Destination'}
        isPickup={locationPickerMode === 'PICKUP'}
        currentValue={locationPickerMode === 'PICKUP' ? pickupLoc?.label : dropLoc?.label}
        onSelect={(loc) => {
          if (locationPickerMode === 'PICKUP') setPickupLoc(loc);
          else setDropLoc(loc);
        }}
      />

      {/* Date Picker Modal */}
      <DatePickerModal
        visible={dateModalVisible}
        onClose={() => setDateModalVisible(false)}
        currentDate={pickupDate}
        onSelect={(raw, formatted) => setPickupDate(formatted)}
      />

      {/* Time Picker Modal */}
      <TimePickerModal
        visible={timeModalVisible}
        onClose={() => setTimeModalVisible(false)}
        currentTime={pickupTime}
        onSelect={(t) => setPickupTime(t)}
      />

      {/* Auth Modal */}
      <AuthModal
        visible={authModalVisible}
        onClose={() => setAuthModalVisible(false)}
        onSuccess={(u) => setUser(u)}
      />

      {/* Hamburger Drawer */}
      <HamburgerDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        user={user}
        onOpenAuth={() => setAuthModalVisible(true)}
        onLogout={handleLogout}
        onNavigateSection={(sec) => {
          if (sec === 'BOOKING') scrollRef.current?.scrollTo({ y: 0, animated: true });
          else if (sec === 'FLEET') scrollRef.current?.scrollTo({ y: 440, animated: true });
          else if (sec === 'WHY_US') scrollRef.current?.scrollToEnd({ animated: true });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  navLogo: {
    height: 38,
    width: 140,
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#ea580c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 14,
  },
  signInHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fed7aa',
    backgroundColor: '#fff7ed',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  signInHeaderText: {
    color: '#ea580c',
    fontSize: 12,
    fontWeight: '800',
  },
  hamburgerBtn: {
    padding: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  bookingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 24,
  },
  subtypeTabs: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
    padding: 4,
    gap: 4,
    marginBottom: 14,
  },
  subtypeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  subtypeTabActive: {
    backgroundColor: '#ea580c',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  subtypeTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  subtypeTabTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  formBody: {
    gap: 10,
  },
  fieldGroup: {},
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
  },
  liveGpsTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  liveGpsText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ea580c',
  },
  fieldTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },
  dotIcon: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  fieldValueText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  fieldPlaceholderText: {
    color: '#94a3b8',
    fontWeight: '500',
  },
  swapRow: {
    alignItems: 'center',
    marginVertical: -6,
    zIndex: 10,
  },
  swapBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff7ed',
    borderWidth: 1.5,
    borderColor: '#fed7aa',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  exploreCabsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ea580c',
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 4,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  exploreCabsBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  sectionHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionBadge: {
    color: '#ea580c',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 3,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 16,
  },
  fleetGrid: {
    flexDirection: 'column',
    gap: 16,
    marginBottom: 24,
  },
  fleetGridCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
    alignItems: 'flex-start',
  },
  gridChoiceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
    marginBottom: 10,
  },
  gridChoiceBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  gridCarImageContainer: {
    width: '100%',
    height: 125,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
  },
  gridCarImage: {
    width: '100%',
    height: '100%',
  },
  gridVehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    width: '100%',
  },
  gridVehicleIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#d1fae5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridVehicleTextContainer: {
    flex: 1,
  },
  gridVehicleName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  gridVehicleModels: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 2,
  },
  gridPurposePill: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    width: '100%',
  },
  gridPurposeText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  whyUsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  whyUsTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 12,
  },
  whyUsGrid: {
    gap: 10,
  },
  whyUsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  whyUsIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  whyUsItemTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  whyUsItemDesc: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  bottomDockContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingBottom: Platform.OS === 'ios' ? 16 : 8,
    paddingTop: 6,
    paddingHorizontal: 12,
  },
  bottomDock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dockTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 12,
  },
  dockTabActive: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  dockTabLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 3,
  },
  dockTabLabelActive: {
    color: '#ea580c',
    fontWeight: '900',
  },
});
