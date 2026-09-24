import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  StatusBar,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthModal } from '../components/AuthModal';

const { width } = Dimensions.get('window');

interface FleetItem {
  id: string;
  name: string;
  models: string;
  ratePerKm: number;
  minKm: number;
  badge: string;
  badgeColor: string;
  badgeBg: string;
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
    minKm: 50,
    badge: 'ECONOMY CHOICE',
    badgeColor: '#059669',
    badgeBg: '#d1fae5',
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
    name: 'Sedan',
    models: 'Dzire, Etios, Aura',
    ratePerKm: 13,
    minKm: 60,
    badge: 'MOST POPULAR',
    badgeColor: '#ea580c',
    badgeBg: '#ffedd5',
    image: require('../assets/images/fleet-sedan.png'),
    purpose: 'Comfortable sedan for families & business travel',
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
    name: 'SUV',
    models: 'Ertiga, Carens, XL6',
    ratePerKm: 16,
    minKm: 80,
    badge: 'FAMILY & GROUP',
    badgeColor: '#0284c7',
    badgeBg: '#e0f2fe',
    image: require('../assets/images/fleet-suv.png'),
    purpose: 'Spacious 6-7 seater for ghats & family vacations',
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
    name: 'Innova Crysta',
    models: 'Toyota Innova Crysta Luxury',
    ratePerKm: 20,
    minKm: 100,
    badge: 'EXECUTIVE LUXURY',
    badgeColor: '#7c3aed',
    badgeBg: '#ede9fe',
    image: require('../assets/images/fleet-crysta.png'),
    purpose: 'VIP highway cruising with premium captain seats',
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
    name: 'Tempo Traveller',
    models: '12-17 Seater AC Luxury',
    ratePerKm: 26,
    minKm: 150,
    badge: 'LARGE GROUP',
    badgeColor: '#b45309',
    badgeBg: '#fef3c7',
    image: require('../assets/images/fleet-traveller.png'),
    purpose: 'Pilgrimage, marriage & corporate tour outings',
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

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straight = R * c;
  // Road distance factor ~1.3x
  return Math.max(15, Math.round(straight * 1.3));
}

export default function SelectCabScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0);

  const pickup = (params.pickup as string) || 'Mangaluru';
  const drop = (params.drop as string) || 'Udupi';
  const pickupDate = (params.date as string) || 'Today';
  const pickupTime = (params.time as string) || '09:00';
  const tripType = (params.tripType as string) || 'ONEWAY';
  const localHours = Number(params.localHours) || 8;

  const pickupLat = Number(params.pickupLat) || 12.8634;
  const pickupLng = Number(params.pickupLng) || 74.8436;
  const dropLat = Number(params.dropLat) || 13.348;
  const dropLng = Number(params.dropLng) || 74.782;

  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  // Distance estimate
  const estimatedKm = useMemo(() => {
    if (tripType === 'LOCAL') {
      return localHours === 4 ? 40 : localHours === 8 ? 80 : 120;
    }
    return calculateDistanceKm(pickupLat, pickupLng, dropLat, dropLng);
  }, [tripType, localHours, pickupLat, pickupLng, dropLat, dropLng]);

  const estimatedHours = useMemo(() => {
    if (tripType === 'LOCAL') return `${localHours} hrs`;
    const h = (estimatedKm / 45).toFixed(1);
    return `${h} hrs approx`;
  }, [tripType, localHours, estimatedKm]);

  const handleBookNow = (item: FleetItem) => {
    // Navigate to the multi-step booking funnel with all route, schedule, and vehicle parameters
    router.push({
      pathname: '/booking',
      params: {
        pickup,
        pickupLat: String(pickupLat),
        pickupLng: String(pickupLng),
        drop,
        dropLat: String(dropLat),
        dropLng: String(dropLng),
        date: pickupDate,
        time: pickupTime,
        tripType,
        localHours: String(localHours),
        category: item.id,
        selectedVehicleName: item.name,
        ratePerKm: String(item.ratePerKm),
        minKm: String(item.minKm),
      },
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={true} />

      {/* 1. Header Bar */}
      <View style={[styles.header, { paddingTop: topInset + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Select a Cab</Text>
          <Text style={styles.headerSubtitle}>
            {tripType === 'ROUND'
              ? 'Round Trip Outstation'
              : tripType === 'LOCAL'
              ? `Local Rental (${localHours} hrs)`
              : tripType === 'AIRPORT'
              ? 'Airport Transfer'
              : 'Outstation One-Way'}
          </Text>
        </View>

        <TouchableOpacity style={styles.editBtn} onPress={() => router.back()}>
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
      </View>

      {/* 2. Route Summary Card */}
      <View style={styles.routeSummaryCard}>
        <View style={styles.routeRow}>
          <View style={styles.routeIconColumn}>
            <View style={[styles.routeDot, { backgroundColor: '#22c55e' }]} />
            <View style={styles.routeLine} />
            <View style={[styles.routeDot, { backgroundColor: '#ef4444' }]} />
          </View>

          <View style={styles.routeTextColumn}>
            <Text style={styles.routePointText} numberOfLines={1}>
              {pickup}
            </Text>
            <Text style={styles.routePointText} numberOfLines={1}>
              {drop}
            </Text>
          </View>
        </View>

        <View style={styles.routeMetaRow}>
          <View style={styles.metaChip}>
            <Ionicons name="calendar-outline" size={13} color="#ea580c" />
            <Text style={styles.metaChipText}>{pickupDate}</Text>
          </View>
          <View style={styles.metaChip}>
            <Ionicons name="time-outline" size={13} color="#ea580c" />
            <Text style={styles.metaChipText}>{pickupTime}</Text>
          </View>
          <View style={styles.metaChip}>
            <Ionicons name="speedometer-outline" size={13} color="#059669" />
            <Text style={[styles.metaChipText, { color: '#059669', fontWeight: '800' }]}>
              ~{estimatedKm} km • {estimatedHours}
            </Text>
          </View>
        </View>
      </View>

      {/* 3. Available Cabs List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionHeading}>Available Verified Cabs ({FLEET_DATA.length})</Text>

        <View style={styles.fleetList}>
          {FLEET_DATA.map((item) => {
            const totalFare = Math.round(Math.max(item.minKm, estimatedKm) * item.ratePerKm);

            return (
              <View key={item.id} style={styles.fleetCard}>
                {/* Top Row: Badge & Fare */}
                <View style={styles.fleetTopRow}>
                  <View style={[styles.choiceBadge, { backgroundColor: item.badgeBg }]}>
                    <Ionicons name="shield-checkmark" size={12} color={item.badgeColor} />
                    <Text style={[styles.choiceBadgeText, { color: item.badgeColor }]}>
                      {item.badge}
                    </Text>
                  </View>

                  <View style={styles.rateContainer}>
                    <Text style={styles.totalFareText}>₹{totalFare.toLocaleString('en-IN')}</Text>
                    <View style={styles.rateTag}>
                      <Text style={styles.rateTagText}>₹{item.ratePerKm}/km BASE RATE</Text>
                    </View>
                  </View>
                </View>

                {/* Car Image */}
                <View style={styles.carImageContainer}>
                  <Image
                    source={item.image}
                    style={styles.carImage}
                    resizeMode="contain"
                  />
                </View>

                {/* Title & Category Box */}
                <View style={styles.vehicleTitleRow}>
                  <View style={styles.vehicleIconBox}>
                    <Ionicons name="car-outline" size={20} color="#059669" />
                  </View>
                  <View style={styles.vehicleTitleTextContainer}>
                    <Text style={styles.vehicleName}>{item.name}</Text>
                    <Text style={styles.vehicleModels}>{item.models}</Text>
                  </View>
                </View>

                {/* Purpose Pill */}
                <View style={styles.purposePill}>
                  <Text style={styles.purposePillText}>{item.purpose}</Text>
                </View>

                {/* Feature Checklist */}
                <View style={styles.featureList}>
                  {item.features.map((feat, idx) => (
                    <View key={idx} style={styles.featureItem}>
                      <Ionicons name="checkmark" size={16} color="#059669" />
                      <Text style={styles.featureItemText}>{feat}</Text>
                    </View>
                  ))}
                </View>

                {/* Book Button */}
                <TouchableOpacity
                  style={styles.bookCarBtn}
                  onPress={() => handleBookNow(item)}
                >
                  <Text style={styles.bookCarBtnText}>Book {item.name} →</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* Guaranteed Pricing Banner */}
        <View style={styles.guaranteeCard}>
          <Ionicons name="lock-closed" size={20} color="#ea580c" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.guaranteeTitle}>Transparent Fixed Price Policy</Text>
            <Text style={styles.guaranteeSubtitle}>
              Zero surge pricing • Clean AC cabs • Fuel, driver allowance & GST included
            </Text>
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Auth Modal if needed */}
      <AuthModal
        visible={authModalVisible}
        onClose={() => setAuthModalVisible(false)}
        onSuccess={() => {}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ea580c',
    marginTop: 1,
  },
  editBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  editBtnText: {
    color: '#ea580c',
    fontSize: 12,
    fontWeight: '800',
  },
  routeSummaryCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 14,
    marginTop: 12,
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeIconColumn: {
    alignItems: 'center',
    marginRight: 10,
    paddingVertical: 2,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  routeLine: {
    width: 2,
    height: 16,
    backgroundColor: '#cbd5e1',
    marginVertical: 2,
  },
  routeTextColumn: {
    flex: 1,
    gap: 8,
  },
  routePointText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  routeMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 4,
  },
  metaChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  fleetList: {
    gap: 16,
    marginBottom: 20,
  },
  fleetCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#a7f3d0',
    padding: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  fleetTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  choiceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  choiceBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  rateContainer: {
    alignItems: 'flex-end',
  },
  totalFareText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
  },
  rateTag: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  rateTagText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#065f46',
    letterSpacing: 0.4,
  },
  carImageContainer: {
    height: 125,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  carImage: {
    width: '100%',
    height: '100%',
  },
  vehicleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  vehicleIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#d1fae5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleTitleTextContainer: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
  },
  vehicleModels: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 1,
  },
  purposePill: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  purposePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#15803d',
  },
  featureList: {
    gap: 6,
    marginBottom: 14,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureItemText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  bookCarBtn: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookCarBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  guaranteeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    padding: 14,
    borderRadius: 18,
    marginBottom: 16,
  },
  guaranteeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  guaranteeSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
});
