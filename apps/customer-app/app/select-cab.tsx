import React, { useState, useMemo, useEffect } from 'react';
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
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthModal } from '../components/AuthModal';
import { safeNavigate } from '../lib/safeNav';
import { trackAppEvent } from '../lib/analytics';

const { width } = Dimensions.get('window');

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.210.115.146:3000';

export interface SeaterOption {
  id: string;
  wheelbaseName: string;
  wheelbaseMm: number;
  seats: number;
  label: string;
  shortLabel: string;
  badge: string;
  baseRatePerKm: number;
  extraKmRate: number;
  extraKmThreshold?: number | null;
  luggageBags: number;
  minKm: number;
  description: string;
}

export const URBANIA_SEATER_OPTIONS: SeaterOption[] = [
  {
    id: 'SWB_10',
    wheelbaseName: 'Short Wheelbase (3350 mm)',
    wheelbaseMm: 3350,
    seats: 10,
    label: '10-Seater (10 + Driver)',
    shortLabel: '10-Seater • SWB 3350 mm',
    badge: '10 + Driver',
    baseRatePerKm: 28,
    extraKmRate: 28,
    extraKmThreshold: null,
    luggageBags: 8,
    minKm: 150,
    description: 'Compact executive van for comfortable 10 passengers with plush reclining seats',
  },
  {
    id: 'MWB_12',
    wheelbaseName: 'Medium Wheelbase (3615 mm)',
    wheelbaseMm: 3615,
    seats: 12,
    label: '12-Seater (12 + Driver)',
    shortLabel: '12-Seater • MWB 3615 mm',
    badge: '12 + Driver',
    baseRatePerKm: 30,
    extraKmRate: 30,
    extraKmThreshold: null,
    luggageBags: 10,
    minKm: 150,
    description: 'Medium luxury wheelbase with extra legroom for 12 passengers',
  },
  {
    id: 'MWB_13',
    wheelbaseName: 'Medium Wheelbase (3615 mm)',
    wheelbaseMm: 3615,
    seats: 13,
    label: '13-Seater (13 + Driver)',
    shortLabel: '13-Seater • MWB 3615 mm',
    badge: '13 + Driver',
    baseRatePerKm: 32,
    extraKmRate: 32,
    extraKmThreshold: null,
    luggageBags: 10,
    minKm: 150,
    description: 'Optimal 13-passenger luxury seating with gangway aisle and panoramic windows',
  },
  {
    id: 'MWB_14',
    wheelbaseName: 'Medium Wheelbase (3615 mm)',
    wheelbaseMm: 3615,
    seats: 14,
    label: '14-Seater (14 + Driver)',
    shortLabel: '14-Seater • MWB 3615 mm',
    badge: '14 + Driver',
    baseRatePerKm: 34,
    extraKmRate: 34,
    extraKmThreshold: null,
    luggageBags: 10,
    minKm: 150,
    description: '14-passenger medium wheelbase configuration for corporate & family travel',
  },
  {
    id: 'LWB_16',
    wheelbaseName: 'Long Wheelbase (4400 mm)',
    wheelbaseMm: 4400,
    seats: 16,
    label: '16-Seater (16 + Driver)',
    shortLabel: '16-Seater • LWB 4400 mm',
    badge: '16 + Driver',
    baseRatePerKm: 36,
    extraKmRate: 36,
    extraKmThreshold: null,
    luggageBags: 12,
    minKm: 150,
    description: 'Long wheelbase luxury carrier for 16 passengers with heavy luggage boot',
  },
  {
    id: 'LWB_17',
    wheelbaseName: 'Long Wheelbase (4400 mm)',
    wheelbaseMm: 4400,
    seats: 17,
    label: '17-Seater (17 + Driver)',
    shortLabel: '17-Seater • LWB 4400 mm',
    badge: '17 + Driver',
    baseRatePerKm: 38,
    extraKmRate: 38,
    extraKmThreshold: null,
    luggageBags: 12,
    minKm: 150,
    description: 'Maximum capacity 17-passenger long wheelbase flagship luxury cruiser',
  },
];

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
  fuelTypes: string[];
  hasCarrier: boolean;
  carrierCapacityText: string;
  carrierExcludedCars?: string;
  carrierExcludedReason?: string;
  features: string[];
}

const DEFAULT_FLEET_DATA: FleetItem[] = [
  {
    id: 'HATCHBACK',
    name: 'WagonR or equivalent',
    models: 'WagonR, Swift, Tiago, Celerio',
    ratePerKm: 11,
    minKm: 50,
    badge: 'ECONOMY CHOICE',
    badgeColor: '#1e293b',
    badgeBg: '#f1f5f9',
    image: require('../assets/images/fleet-hatchback.png'),
    purpose: 'Budget city & short outstation trips',
    passengers: 4,
    luggage: 2,
    fuelTypes: ['CNG', 'PETROL'],
    hasCarrier: true,
    carrierCapacityText: 'Roof Carrier Available on WagonR & Swift (Up to 45 kg space)',
    carrierExcludedCars: 'Tata Tiago (No Roof Carrier - Boot space only)',
    features: [
      '4 Passengers Capacity',
      '2 Standard Luggage Bags',
      'Roof Carrier on WagonR & Swift',
      'Air Conditioned & Clean Interiors',
      'Real-time GPS Tracking + OTP Gate',
    ],
  },
  {
    id: 'SEDAN',
    name: 'Dzire or equivalent',
    models: 'Dzire, Etios, Aura, Amaze',
    ratePerKm: 13,
    minKm: 60,
    badge: 'MOST POPULAR',
    badgeColor: '#1e293b',
    badgeBg: '#f1f5f9',
    image: require('../assets/images/fleet-sedan.png'),
    purpose: 'Comfortable sedan for families & business travel',
    passengers: 4,
    luggage: 3,
    fuelTypes: ['CNG', 'PETROL', 'DIESEL'],
    hasCarrier: false,
    carrierCapacityText: '',
    carrierExcludedReason: 'Sedan Class (Large Trunk Boot Space - No Roof Carrier)',
    features: [
      '4 Passengers Capacity',
      '3 Large Trunk Luggage Bags',
      'High Trunk Space & Extra Legroom',
      'Real-time GPS Tracking + OTP Gate',
    ],
  },
  {
    id: 'SUV',
    name: 'Ertiga or equivalent',
    models: 'Ertiga, Carens, XL6, Triber',
    ratePerKm: 16,
    minKm: 80,
    badge: 'FAMILY & GROUP',
    badgeColor: '#1e293b',
    badgeBg: '#f1f5f9',
    image: require('../assets/images/fleet-suv.png'),
    purpose: 'Spacious 6-7 seater for ghats & family vacations',
    passengers: 6,
    luggage: 4,
    fuelTypes: ['CNG', 'PETROL', 'DIESEL'],
    hasCarrier: true,
    carrierCapacityText: 'Roof Carrier Available (Up to 50 kg space)',
    carrierExcludedCars: '',
    features: [
      '6 Passengers Capacity',
      '4 Large Bags + Roof Carrier Option',
      'Powerful AC & High Ground Clearance',
      'Real-time GPS Tracking + OTP Gate',
    ],
  },
  {
    id: 'SUV_PREMIUM',
    name: 'Innova Crysta or equivalent',
    models: 'Innova Crysta, Hycross, Safari',
    ratePerKm: 20,
    minKm: 100,
    badge: 'EXECUTIVE LUXURY',
    badgeColor: '#1e293b',
    badgeBg: '#f1f5f9',
    image: require('../assets/images/fleet-crysta.png'),
    purpose: 'VIP highway cruising with premium captain seats',
    passengers: 7,
    luggage: 5,
    fuelTypes: ['PETROL', 'DIESEL'],
    hasCarrier: true,
    carrierCapacityText: 'Roof Carrier Available (Up to 60 kg space)',
    carrierExcludedCars: '',
    features: [
      '7 Passengers Capacity',
      '5 Luggage Bags + Top Carrier',
      'Plush Captain Seats & Smooth Ride',
      'Top-rated Chauffeurs & Highway Expert',
    ],
  },
  {
    id: 'TEMPO_TRAVELER',
    name: 'Tempo Traveller or equivalent',
    models: '12-17 Seater Force Traveller AC Luxury',
    ratePerKm: 26,
    minKm: 150,
    badge: 'LARGE GROUP',
    badgeColor: '#1e293b',
    badgeBg: '#f1f5f9',
    image: require('../assets/images/fleet-traveller.png'),
    purpose: 'Pilgrimage, marriage & corporate tour outings',
    passengers: 14,
    luggage: 10,
    fuelTypes: ['DIESEL'],
    hasCarrier: true,
    carrierCapacityText: 'Heavy Roof Carrier Available (Up to 150 kg space)',
    carrierExcludedCars: '',
    features: [
      '12 - 17 Passengers Capacity',
      '10+ Heavy Luggage Capacity (Roof Carrier)',
      'Reclining Seats & High Roof Walking Space',
      'Experienced Long-distance Chauffeurs',
    ],
  },
  {
    id: 'URBANIA',
    name: 'Force Urbania Luxury',
    models: '10/13/17 Seater Force Urbania AC Luxury Van',
    ratePerKm: 32,
    minKm: 150,
    badge: 'LUXURY VAN',
    badgeColor: '#1e293b',
    badgeBg: '#f1f5f9',
    image: require('../assets/images/vehicle-urbania.jpg'),
    purpose: 'Executive group trips, corporate delegates & VIP tours',
    passengers: 17,
    luggage: 10,
    fuelTypes: ['DIESEL'],
    hasCarrier: true,
    carrierCapacityText: 'Spacious Boot & Roof Luggage Space',
    carrierExcludedCars: '',
    features: [
      '10 - 17 Passengers Capacity',
      '10+ Heavy Luggage Capacity',
      'Ultra Luxury Reclining Push-back Seats',
      'Individual AC Vents & USB Charging Ports',
      'Panoramic Windows & Ambient Cabin Lighting',
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

  const viaStopsRaw = (params.viaStops as string) || '[]';
  const viaStops: any[] = useMemo(() => {
    try {
      return JSON.parse(viaStopsRaw);
    } catch {
      return [];
    }
  }, [viaStopsRaw]);

  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [fleetList, setFleetList] = useState<FleetItem[]>(DEFAULT_FLEET_DATA);
  const [selectedUrbaniaSeaterId, setSelectedUrbaniaSeaterId] = useState<string>('MWB_13');
  const [showSeaterModal, setShowSeaterModal] = useState<boolean>(false);

  const selectedUrbaniaSeater = useMemo(() => {
    return URBANIA_SEATER_OPTIONS.find((s) => s.id === selectedUrbaniaSeaterId) || URBANIA_SEATER_OPTIONS[2];
  }, [selectedUrbaniaSeaterId]);

  // Fetch live fleet specs from Admin Backend
  const loadLiveFleets = React.useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/fleets?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.fleets) && data.fleets.length > 0) {
          const merged = DEFAULT_FLEET_DATA.map((def) => {
            const live = data.fleets.find((f: any) => f.category === def.id || f.id === def.id);
            if (!live) return def;

            const enabledFuels: string[] = [];
            if (Array.isArray(live.fuelTypes)) {
              enabledFuels.push(...live.fuelTypes);
            } else {
              if (live.cngEnabled) enabledFuels.push('CNG');
              if (live.petrolEnabled) enabledFuels.push('PETROL');
              if (live.dieselEnabled) enabledFuels.push('DIESEL');
            }

            return {
              ...def,
              name: live.name || def.name,
              models: live.description || def.models,
              passengers: live.seatCount || def.passengers,
              luggage: live.luggageCount !== undefined ? live.luggageCount : def.luggage,
              fuelTypes: enabledFuels.length > 0 ? enabledFuels : def.fuelTypes,
              hasCarrier: live.hasCarrier !== undefined ? Boolean(live.hasCarrier) : def.hasCarrier,
              carrierCapacityText: live.carrierCapacityText || def.carrierCapacityText,
              carrierExcludedCars: live.carrierExcludedCars || '',
              carrierExcludedReason: live.carrierExcludedReason || def.carrierExcludedReason,
            };
          });
          setFleetList(merged);
        }
      }
    } catch (err) {
      console.log('Using default fleet specs:', err);
    }
  }, []);

  useEffect(() => {
    loadLiveFleets();
    trackAppEvent('VIEW_RATES', {
      tripType,
      pickup: typeof pickup === 'string' ? pickup : '',
      drop: typeof drop === 'string' ? drop : '',
    });
    // Poll every 4 seconds to instantly reflect any Admin Panel changes
    const interval = setInterval(loadLiveFleets, 4000);
    return () => clearInterval(interval);
  }, [loadLiveFleets]);

  // Distance estimate across all waypoints
  const estimatedKm = useMemo(() => {
    if (tripType === 'LOCAL') {
      return localHours === 4 ? 40 : localHours === 8 ? 80 : 120;
    }
    if (viaStops && viaStops.length > 0) {
      let total = 0;
      let currLat = pickupLat;
      let currLng = pickupLng;
      for (const stop of viaStops) {
        if (stop && stop.lat && stop.lng) {
          total += calculateDistanceKm(currLat, currLng, stop.lat, stop.lng);
          currLat = stop.lat;
          currLng = stop.lng;
        }
      }
      total += calculateDistanceKm(currLat, currLng, dropLat, dropLng);
      return Math.max(15, total);
    }
    return calculateDistanceKm(pickupLat, pickupLng, dropLat, dropLng);
  }, [tripType, localHours, pickupLat, pickupLng, dropLat, dropLng, viaStops]);

  const estimatedHours = useMemo(() => {
    if (tripType === 'LOCAL') return `${localHours} hrs`;
    const totalMinutes = Math.round((estimatedKm / 45) * 60);
    if (totalMinutes < 60) {
      return `${Math.max(5, totalMinutes)} mins approx`;
    }
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (mins === 0) {
      return `${hours} hr${hours > 1 ? 's' : ''} approx`;
    }
    return `${hours} hr${hours > 1 ? 's' : ''} ${mins} mins approx`;
  }, [tripType, localHours, estimatedKm]);

  const selectedVehicle = useMemo(() => {
    return fleetList.find((f) => f.id === selectedVehicleId) || fleetList[0];
  }, [selectedVehicleId, fleetList]);

  const handleBookNow = (item: FleetItem) => {
    trackAppEvent('STARTED_BOOKING', {
      category: item.id,
      tripType,
      pickup: typeof pickup === 'string' ? pickup : '',
      drop: typeof drop === 'string' ? drop : '',
    });

    const isUrbania = item.id === 'URBANIA';
    const effectiveRatePerKm = isUrbania ? selectedUrbaniaSeater.baseRatePerKm : item.ratePerKm;
    const effectiveExtraKmRate = isUrbania ? selectedUrbaniaSeater.extraKmRate : item.ratePerKm;
    const effectiveThreshold = isUrbania ? (selectedUrbaniaSeater.extraKmThreshold || selectedUrbaniaSeater.minKm || 150) : item.minKm;
    const effectiveSeats = isUrbania ? selectedUrbaniaSeater.seats : item.passengers;
    const effectiveLuggage = isUrbania ? selectedUrbaniaSeater.luggageBags : item.luggage;
    const displayName = isUrbania ? `${item.name} (${selectedUrbaniaSeater.shortLabel})` : item.name;

    safeNavigate(() => {
      router.push({
        pathname: '/additional-details',
        params: {
          pickup,
          pickupLat: String(pickupLat),
          pickupLng: String(pickupLng),
          drop,
          dropLat: String(dropLat),
          dropLng: String(dropLng),
          viaStops: viaStopsRaw,
          date: pickupDate,
          time: pickupTime,
          tripType,
          localHours: String(localHours),
          category: item.id,
          selectedVehicleName: displayName,
          ratePerKm: String(effectiveRatePerKm),
          extraKmRate: String(effectiveExtraKmRate),
          extraKmThreshold: String(effectiveThreshold),
          minKm: String(item.minKm),
          maxSeats: String(effectiveSeats),
          maxLuggage: String(effectiveLuggage),
          hasCarrier: item.hasCarrier ? 'true' : 'false',
          carrierText: item.carrierCapacityText || item.carrierExcludedCars || item.carrierExcludedReason || '',
          seaterVariant: isUrbania ? selectedUrbaniaSeater.id : '',
          seaterLabel: isUrbania ? selectedUrbaniaSeater.label : '',
          wheelbase: isUrbania ? selectedUrbaniaSeater.wheelbaseName : '',
        },
      });
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
              : viaStops.length > 0
              ? `Multi-Stop One-Way (${viaStops.length} via)`
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
            {viaStops.map((_, i) => (
              <React.Fragment key={`vdot-${i}`}>
                <View style={[styles.routeDot, { backgroundColor: '#f59e0b', width: 8, height: 8, borderRadius: 4 }]} />
                <View style={styles.routeLine} />
              </React.Fragment>
            ))}
            <View style={[styles.routeDot, { backgroundColor: '#ef4444' }]} />
          </View>

          <View style={styles.routeTextColumn}>
            <Text style={styles.routePointText} numberOfLines={1}>
              {pickup}
            </Text>
            {viaStops.map((stop: any, i: number) => (
              <Text key={`vtxt-${i}`} style={[styles.routePointText, { color: '#b45309', fontSize: 13 }]} numberOfLines={1}>
                Via: {stop.label}
              </Text>
            ))}
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
        <Text style={styles.compactHeading}>Choose Your Travel Comfort</Text>

        <View style={styles.fleetAccordionList}>
          {fleetList.map((item) => {
            const isExpanded = selectedVehicleId === item.id;
            const isUrbania = item.id === 'URBANIA';
            const effectiveRatePerKm = isUrbania ? selectedUrbaniaSeater.baseRatePerKm : item.ratePerKm;
            const effectiveExtraKmRate = isUrbania ? selectedUrbaniaSeater.extraKmRate : item.ratePerKm;
            const effectiveSeats = isUrbania ? selectedUrbaniaSeater.seats : item.passengers;
            const effectiveLuggage = isUrbania ? selectedUrbaniaSeater.luggageBags : item.luggage;
            const hasThreshold = isUrbania && typeof selectedUrbaniaSeater.extraKmThreshold === 'number' && selectedUrbaniaSeater.extraKmThreshold > 0;
            const isBeyondThreshold = Boolean(hasThreshold && selectedUrbaniaSeater.extraKmThreshold && estimatedKm > selectedUrbaniaSeater.extraKmThreshold);

            let totalFare: number;
            let calculationBreakdown = '';

            if (isBeyondThreshold && selectedUrbaniaSeater.extraKmThreshold) {
              const threshold = selectedUrbaniaSeater.extraKmThreshold;
              const baseFare = threshold * effectiveRatePerKm;
              const extraKm = estimatedKm - threshold;
              const extraFare = extraKm * effectiveExtraKmRate;
              totalFare = Math.round(baseFare + extraFare);
              calculationBreakdown = `₹${baseFare.toLocaleString('en-IN')} (first ${threshold} km) + ₹${extraFare.toLocaleString('en-IN')} (${extraKm} extra km @ ₹${effectiveExtraKmRate}/km)`;
            } else {
              totalFare = Math.round(
                Math.max(item.minKm, estimatedKm) * effectiveRatePerKm
              );
            }

            const specText = isUrbania
              ? `${selectedUrbaniaSeater.shortLabel} | ${effectiveLuggage} Bags | A/C`
              : item.id === 'TEMPO_TRAVELER'
              ? '12-17 Seats | Bags as per seats | A/C'
              : `${item.passengers} Seats | ${item.luggage} Bags | A/C`;

            if (isExpanded) {
              return (
                <View key={item.id} style={styles.fleetCard}>
                  {/* Top Row: Badge & Fare */}
                  <TouchableOpacity
                    style={styles.fleetTopRow}
                    onPress={() =>
                      setSelectedVehicleId(
                        selectedVehicleId === item.id ? null : item.id
                      )
                    }
                    activeOpacity={0.8}
                  >
                    <View style={styles.choiceBadge}>
                      <Ionicons name="shield-checkmark" size={12} color="#1e293b" />
                      <Text style={styles.choiceBadgeText}>{item.badge}</Text>
                    </View>

                    <View style={styles.rateContainer}>
                      <Text style={styles.totalFareText}>
                        ₹{totalFare.toLocaleString('en-IN')}
                      </Text>
                      <View style={styles.rateTag}>
                        <Text style={styles.rateTagText}>
                          ₹{effectiveRatePerKm}/km BASE RATE
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>

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
                      <Ionicons name="car-outline" size={20} color="#ea580c" />
                    </View>
                    <View style={styles.vehicleTitleTextContainer}>
                      <Text style={styles.vehicleName}>{item.name}</Text>
                      <Text style={styles.vehicleModels}>{item.models}</Text>
                    </View>
                  </View>

                  {/* URBANIA Seater & Wheelbase Clean Single-Layer Card */}
                  {isUrbania && (
                    <TouchableOpacity
                      style={styles.singleSeaterPicker}
                      onPress={() => setShowSeaterModal(true)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.seaterTextGroup}>
                        <View style={styles.seaterTitleRow}>
                          <Text style={styles.seaterPickerMainText}>
                            {selectedUrbaniaSeater.label}
                          </Text>
                          <View style={styles.inlineWheelbaseBadge}>
                            <Text style={styles.inlineWheelbaseBadgeText}>
                              {selectedUrbaniaSeater.wheelbaseName.split('(')[1]?.replace(')', '') || '3615 mm'}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.seaterPickerSubText} numberOfLines={1}>
                          {selectedUrbaniaSeater.wheelbaseName.split('(')[0].trim()} • ₹{selectedUrbaniaSeater.baseRatePerKm}/km • {selectedUrbaniaSeater.luggageBags} Bags
                        </Text>
                      </View>

                      <View style={styles.seaterPickerChangePill}>
                        <Text style={styles.seaterPickerChangeText}>Change</Text>
                        <Ionicons name="chevron-down" size={13} color="#ea580c" />
                      </View>
                    </TouchableOpacity>
                  )}

                  {/* Purpose Pill */}
                  <View style={styles.purposePill}>
                    <Text style={styles.purposePillText}>{item.purpose}</Text>
                  </View>

                  {/* Feature Checklist */}
                  <View style={styles.featureList}>
                    {item.features.map((feat, idx) => (
                      <View key={idx} style={styles.featureItem}>
                        <Ionicons name="checkmark" size={16} color="#ea580c" />
                        <Text style={styles.featureItemText}>{feat}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Fuel Types & Roof Carrier Row */}
                  <View style={{ marginBottom: 14, gap: 8 }}>
                    {/* Fuel Options */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b' }}>Fuels:</Text>
                      {item.fuelTypes.map((fuel) => (
                        <View
                          key={fuel}
                          style={{
                            backgroundColor: '#f1f5f9',
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: '#e2e8f0',
                          }}
                        >
                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#334155' }}>{fuel}</Text>
                        </View>
                      ))}
                    </View>

                    {/* Carrier Badge */}
                    {item.hasCarrier ? (
                      <View style={{ gap: 6 }}>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            padding: 8,
                            borderRadius: 10,
                            backgroundColor: '#f0fdf4',
                            borderWidth: 1,
                            borderColor: '#bbf7d0',
                          }}
                        >
                          <Ionicons name="checkbox" size={15} color="#16a34a" />
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: '700',
                              color: '#15803d',
                              flex: 1,
                            }}
                          >
                            {item.carrierCapacityText || 'Roof Carrier Available'}
                          </Text>
                        </View>

                        {item.carrierExcludedCars ? (
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 6,
                              padding: 8,
                              borderRadius: 10,
                              backgroundColor: '#fffbeb',
                              borderWidth: 1,
                              borderColor: '#fde68a',
                            }}
                          >
                            <Ionicons name="alert-circle" size={15} color="#d97706" />
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: '700',
                                color: '#92400e',
                                flex: 1,
                              }}
                            >
                              Excluded: {item.carrierExcludedCars}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    ) : (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          padding: 8,
                          borderRadius: 10,
                          backgroundColor: '#f8fafc',
                          borderWidth: 1,
                          borderColor: '#e2e8f0',
                        }}
                      >
                        <Ionicons name="alert-circle-outline" size={15} color="#64748b" />
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '700',
                            color: '#64748b',
                            flex: 1,
                          }}
                        >
                          {item.carrierExcludedReason || 'No Roof Carrier (Trunk Boot Space Only)'}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Book Button */}
                  <TouchableOpacity
                    style={styles.bookCarBtn}
                    onPress={() => handleBookNow(item)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.bookCarBtnText}>
                      Book {isUrbania ? `Urbania (${selectedUrbaniaSeater.shortLabel})` : item.name} →
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            }

            return (
              <TouchableOpacity
                key={item.id}
                style={styles.compactCard}
                onPress={() => setSelectedVehicleId(item.id)}
                activeOpacity={0.8}
              >
                <Image
                  source={item.image}
                  style={styles.compactCarImage}
                  resizeMode="contain"
                />
                <View style={styles.compactInfo}>
                  <Text style={styles.compactName}>{item.name}</Text>
                  <Text style={styles.compactSpec}>{specText}</Text>
                </View>
                <View style={styles.compactChevronBtn}>
                  <Ionicons
                    name="chevron-forward"
                    size={15}
                    color="#94a3b8"
                  />
                </View>
              </TouchableOpacity>
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

      {/* Urbania Seater & Wheelbase Selector Modal */}
      <Modal
        visible={showSeaterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSeaterModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSeaterModal(false)}
        >
          <View style={styles.seaterModalSheet}>
            <View style={styles.seaterModalHeader}>
              <View>
                <Text style={styles.seaterModalTitle}>Select Seater & Wheelbase</Text>
                <Text style={styles.seaterModalSubtitle}>Choose the optimal Force Urbania configuration</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowSeaterModal(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
              {/* Group 1: Short Wheelbase (3350 mm) */}
              <View style={styles.wheelbaseGroupHeader}>
                <Ionicons name="layers-outline" size={14} color="#ea580c" />
                <Text style={styles.wheelbaseGroupTitle}>Short Wheelbase (3350 mm)</Text>
                <Text style={styles.wheelbaseGroupTag}>10-Seater Options</Text>
              </View>
              {URBANIA_SEATER_OPTIONS.filter((s) => s.wheelbaseMm === 3350).map((opt) => {
                const isSelected = selectedUrbaniaSeaterId === opt.id;
                const optTotalFare = Math.round(Math.max(150, estimatedKm) * opt.baseRatePerKm);
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.seaterOptionCard, isSelected && styles.seaterOptionCardSelected]}
                    onPress={() => {
                      setSelectedUrbaniaSeaterId(opt.id);
                      setShowSeaterModal(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.seaterOptionLeft}>
                      <View style={[styles.seaterBadgeBox, isSelected && styles.seaterBadgeBoxSelected]}>
                        <Ionicons name="people" size={16} color={isSelected ? '#ffffff' : '#ea580c'} />
                        <Text style={[styles.seaterBadgeText, isSelected && { color: '#ffffff' }]}>
                          {opt.seats}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.seaterOptionLabel, isSelected && styles.seaterOptionLabelSelected]}>
                          {opt.label}
                        </Text>
                        <Text style={styles.seaterOptionDesc}>{opt.description}</Text>
                        <View style={styles.seaterMetaRow}>
                          <Text style={styles.seaterMetaPill}>🧳 {opt.luggageBags} Bags</Text>
                          <Text style={styles.seaterMetaPill}>📏 3350 mm SWB</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.seaterOptionRight}>
                      <Text style={styles.seaterOptionRate}>₹{opt.baseRatePerKm}/km</Text>
                      <Text style={styles.seaterOptionTotal}>Est: ₹{optTotalFare.toLocaleString('en-IN')}</Text>
                      {isSelected ? (
                        <Ionicons name="checkmark-circle" size={22} color="#ea580c" style={{ marginTop: 4 }} />
                      ) : (
                        <Ionicons name="radio-button-off" size={20} color="#cbd5e1" style={{ marginTop: 4 }} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* Group 2: Medium Wheelbase (3615 mm) */}
              <View style={[styles.wheelbaseGroupHeader, { marginTop: 14 }]}>
                <Ionicons name="layers-outline" size={14} color="#0284c7" />
                <Text style={styles.wheelbaseGroupTitle}>Medium Wheelbase (3615 mm)</Text>
                <Text style={[styles.wheelbaseGroupTag, { color: '#0369a1', backgroundColor: '#e0f2fe' }]}>
                  12 / 13 / 14-Seater Options
                </Text>
              </View>
              {URBANIA_SEATER_OPTIONS.filter((s) => s.wheelbaseMm === 3615).map((opt) => {
                const isSelected = selectedUrbaniaSeaterId === opt.id;
                const optTotalFare = Math.round(Math.max(150, estimatedKm) * opt.baseRatePerKm);
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.seaterOptionCard, isSelected && styles.seaterOptionCardSelected]}
                    onPress={() => {
                      setSelectedUrbaniaSeaterId(opt.id);
                      setShowSeaterModal(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.seaterOptionLeft}>
                      <View style={[styles.seaterBadgeBox, isSelected && styles.seaterBadgeBoxSelected]}>
                        <Ionicons name="people" size={16} color={isSelected ? '#ffffff' : '#0284c7'} />
                        <Text style={[styles.seaterBadgeText, isSelected && { color: '#ffffff' }]}>
                          {opt.seats}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.seaterOptionLabel, isSelected && styles.seaterOptionLabelSelected]}>
                          {opt.label}
                        </Text>
                        <Text style={styles.seaterOptionDesc}>{opt.description}</Text>
                        <View style={styles.seaterMetaRow}>
                          <Text style={styles.seaterMetaPill}>🧳 {opt.luggageBags} Bags</Text>
                          <Text style={styles.seaterMetaPill}>📏 3615 mm MWB</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.seaterOptionRight}>
                      <Text style={styles.seaterOptionRate}>₹{opt.baseRatePerKm}/km</Text>
                      <Text style={styles.seaterOptionTotal}>Est: ₹{optTotalFare.toLocaleString('en-IN')}</Text>
                      {isSelected ? (
                        <Ionicons name="checkmark-circle" size={22} color="#ea580c" style={{ marginTop: 4 }} />
                      ) : (
                        <Ionicons name="radio-button-off" size={20} color="#cbd5e1" style={{ marginTop: 4 }} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* Group 3: Long Wheelbase (4400 mm) */}
              <View style={[styles.wheelbaseGroupHeader, { marginTop: 14 }]}>
                <Ionicons name="layers-outline" size={14} color="#7c3aed" />
                <Text style={styles.wheelbaseGroupTitle}>Long Wheelbase (4400 mm)</Text>
                <Text style={[styles.wheelbaseGroupTag, { color: '#6d28d9', backgroundColor: '#ede9fe' }]}>
                  16 / 17-Seater Options
                </Text>
              </View>
              {URBANIA_SEATER_OPTIONS.filter((s) => s.wheelbaseMm === 4400).map((opt) => {
                const isSelected = selectedUrbaniaSeaterId === opt.id;
                const optTotalFare = Math.round(Math.max(150, estimatedKm) * opt.baseRatePerKm);
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.seaterOptionCard, isSelected && styles.seaterOptionCardSelected]}
                    onPress={() => {
                      setSelectedUrbaniaSeaterId(opt.id);
                      setShowSeaterModal(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.seaterOptionLeft}>
                      <View style={[styles.seaterBadgeBox, isSelected && styles.seaterBadgeBoxSelected]}>
                        <Ionicons name="people" size={16} color={isSelected ? '#ffffff' : '#7c3aed'} />
                        <Text style={[styles.seaterBadgeText, isSelected && { color: '#ffffff' }]}>
                          {opt.seats}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.seaterOptionLabel, isSelected && styles.seaterOptionLabelSelected]}>
                          {opt.label}
                        </Text>
                        <Text style={styles.seaterOptionDesc}>{opt.description}</Text>
                        <View style={styles.seaterMetaRow}>
                          <Text style={styles.seaterMetaPill}>🧳 {opt.luggageBags} Bags</Text>
                          <Text style={styles.seaterMetaPill}>📏 4400 mm LWB</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.seaterOptionRight}>
                      <Text style={styles.seaterOptionRate}>₹{opt.baseRatePerKm}/km</Text>
                      <Text style={styles.seaterOptionTotal}>Est: ₹{optTotalFare.toLocaleString('en-IN')}</Text>
                      {isSelected ? (
                        <Ionicons name="checkmark-circle" size={22} color="#ea580c" style={{ marginTop: 4 }} />
                      ) : (
                        <Ionicons name="radio-button-off" size={20} color="#cbd5e1" style={{ marginTop: 4 }} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

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
  compactSection: {
    marginBottom: 20,
  },
  compactHeading: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  fleetAccordionList: {
    gap: 12,
    marginBottom: 20,
  },
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    paddingVertical: 10,
    paddingHorizontal: 14,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  compactCardSelected: {
    borderColor: '#ea580c',
    backgroundColor: '#fffdfa',
  },
  compactCarImage: {
    width: 80,
    height: 52,
    marginRight: 12,
  },
  compactInfo: {
    flex: 1,
  },
  compactName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  compactNameSelected: {
    color: '#ea580c',
  },
  compactSpec: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 2,
  },
  compactChevronBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  compactChevronBtnSelected: {
    backgroundColor: '#fff7ed',
    borderColor: '#fed7aa',
  },
  selectedCardSection: {
    marginBottom: 20,
  },
  selectedCardHeading: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  fleetCard: {
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
  },
  fleetTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  choiceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  choiceBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#1e293b',
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
    backgroundColor: '#fff7ed',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  rateTagText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#c2410c',
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
    backgroundColor: '#fff7ed',
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
    backgroundColor: '#fff7ed',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  purposePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#c2410c',
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
  singleSeaterPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    marginBottom: 12,
  },
  seaterLeftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  seaterPickerIconBox: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: '#ffedd5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  seaterTextGroup: {
    flex: 1,
    marginRight: 8,
  },
  seaterTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  seaterPickerMainText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  inlineWheelbaseBadge: {
    backgroundColor: '#ffedd5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  inlineWheelbaseBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#c2410c',
    letterSpacing: 0.3,
  },
  seaterPickerSubText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#c2410c',
    marginTop: 2,
  },
  seaterPickerChangePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#fdba74',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  seaterPickerChangeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ea580c',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  seaterModalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  seaterModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginBottom: 10,
  },
  seaterModalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  seaterModalSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelbaseGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 8,
    paddingHorizontal: 4,
  },
  wheelbaseGroupTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  wheelbaseGroupTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#c2410c',
    backgroundColor: '#fff7ed',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 'auto',
  },
  seaterOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 8,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  seaterOptionCardSelected: {
    borderColor: '#ea580c',
    backgroundColor: '#fffdfa',
  },
  seaterOptionLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    flex: 1,
  },
  seaterBadgeBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  seaterBadgeBoxSelected: {
    backgroundColor: '#ea580c',
    borderColor: '#c2410c',
  },
  seaterBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#c2410c',
    marginTop: 1,
  },
  seaterOptionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  seaterOptionLabelSelected: {
    color: '#ea580c',
  },
  seaterOptionDesc: {
    fontSize: 10.5,
    color: '#64748b',
    marginTop: 1,
  },
  seaterMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  seaterMetaPill: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#475569',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  seaterOptionRight: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  seaterOptionRate: {
    fontSize: 13,
    fontWeight: '900',
    color: '#059669',
  },
  seaterOptionTotal: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 1,
  },
});
