import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { safeNavigate } from '../lib/safeNav';
import { LocationPickerModal } from '../components/LocationPickerModal';
import { DatePickerModal } from '../components/DatePickerModal';
import { TimePickerModal, isDateToday } from '../components/TimePickerModal';
import { ALL_LOCATIONS, PlaceLocation } from '../lib/locations';

type TripType = 'ONEWAY' | 'ROUND' | 'LOCAL' | 'AIRPORT' | 'CORPORATE' | 'TOUR';

interface TripTypeMeta {
  id: TripType;
  label: string;
  subtitle: string;
  iconName: keyof typeof Ionicons.glyphMap;
}

function getUpcomingPickupTime(dateStr?: string, currentVal?: string): string {
  const isToday = isDateToday(dateStr);
  if (!isToday) {
    return currentVal || '09:00';
  }
  const now = new Date();
  let h = now.getHours();
  let m = now.getMinutes();
  
  if (m < 30) {
    m = 30;
  } else {
    h += 1;
    m = 0;
  }
  
  if (h >= 24) return '23:30';

  const defaultSlot = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  if (currentVal && currentVal.includes(':')) {
    const [ch, cm] = currentVal.split(':').map(Number);
    const currTotal = ch * 60 + cm;
    const nowTotal = now.getHours() * 60 + now.getMinutes();
    if (currTotal >= nowTotal) {
      return currentVal;
    }
  }
  return defaultSlot;
}

const TRIP_TYPES_META: TripTypeMeta[] = [
  { id: 'ONEWAY', label: 'One-Way Drop', subtitle: 'Inter-city & inter-state travel', iconName: 'car-sport' },
  { id: 'ROUND', label: 'Round Trip', subtitle: 'Multi-day journeys', iconName: 'car' },
  { id: 'AIRPORT', label: 'Airport Transfer', subtitle: 'Pickup & drop to airport', iconName: 'airplane' },
  { id: 'LOCAL', label: 'Local Rental', subtitle: 'Hourly packages', iconName: 'time' },
  { id: 'CORPORATE', label: 'Corporate Travel', subtitle: 'Business & official travel', iconName: 'briefcase' },
  { id: 'TOUR', label: 'Tour & Pilgrimage', subtitle: 'Family tours and pilgrimages', iconName: 'business' },
];

const AIRPORT_LIST: PlaceLocation[] = [
  { label: 'Mangaluru Airport (IXE)', sublabel: 'Bajpe Terminal, Mangaluru', category: 'AIRPORTS', lat: 12.9613, lng: 74.8901 },
  { label: 'Kempegowda Intl Airport (BLR)', sublabel: 'Devanahalli Airport, Bengaluru', category: 'AIRPORTS', lat: 13.1986, lng: 77.7066 },
  { label: 'Mysuru Airport (MYQ)', sublabel: 'Mandakalli, Mysuru', category: 'AIRPORTS', lat: 12.2289, lng: 76.6543 },
  { label: 'Goa Dabolim Airport (GOI)', sublabel: 'Dabolim, South Goa', category: 'AIRPORTS', lat: 15.3808, lng: 73.8314 },
];

export default function TripDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0);

  // Active Trip Type
  const initialType = ((params.tripType as string) || (params.category as string) || 'ONEWAY') as TripType;
  const [tripType, setTripType] = useState<TripType>(initialType);
  const [showTypePickerModal, setShowTypePickerModal] = useState(false);

  // Locations (Default to null so customer explicitly selects them)
  const [pickupLocation, setPickupLocation] = useState<PlaceLocation | null>(() => {
    if (params.pickup) {
      const found = ALL_LOCATIONS.find((l) => l.label.toLowerCase().includes((params.pickup as string).toLowerCase()));
      if (found) return found;
    }
    return null;
  });

  const [dropLocation, setDropLocation] = useState<PlaceLocation | null>(() => {
    if (params.drop) {
      const found = ALL_LOCATIONS.find((l) => l.label.toLowerCase().includes((params.drop as string).toLowerCase()));
      if (found) return found;
    }
    return null;
  });

  // Intermediate / Via Stops
  const [viaStops, setViaStops] = useState<PlaceLocation[]>([]);
  const [activeStopIndex, setActiveStopIndex] = useState<number | null>(null);
  const [isStopModalOpen, setIsStopModalOpen] = useState(false);

  const handleAddStop = () => {
    if (viaStops.length >= 4) {
      Alert.alert('Maximum Stops', 'You can add up to 4 intermediate stops.');
      return;
    }
    setActiveStopIndex(viaStops.length);
    setIsStopModalOpen(true);
  };

  const handleEditStop = (index: number) => {
    setActiveStopIndex(index);
    setIsStopModalOpen(true);
  };

  const handleRemoveStop = (index: number) => {
    setViaStops((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSelectStop = (location: PlaceLocation) => {
    if (activeStopIndex !== null) {
      setViaStops((prev) => {
        const next = [...prev];
        next[activeStopIndex] = location;
        return next;
      });
    }
    setIsStopModalOpen(false);
    setActiveStopIndex(null);
  };

  // Modals
  const [isPickupModalOpen, setIsPickupModalOpen] = useState(false);
  const [isDropModalOpen, setIsDropModalOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [isReturnDatePickerOpen, setIsReturnDatePickerOpen] = useState(false);
  const [isReturnTimePickerOpen, setIsReturnTimePickerOpen] = useState(false);

  // Date & Time
  const todayStr = useMemo(() => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }, []);

  const [pickupDate, setPickupDate] = useState<string>(todayStr);
  const [pickupTime, setPickupTime] = useState<string>(() => getUpcomingPickupTime(todayStr, '09:00'));

  // Return Date & Time for Round trips
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }, []);

  const [returnDate, setReturnDate] = useState<string>(tomorrowStr);
  const [returnTime, setReturnTime] = useState<string>('18:00');

  // Airport transfer direction & airport
  const [airportDirection, setAirportDirection] = useState<'TO_AIRPORT' | 'FROM_AIRPORT'>('TO_AIRPORT');
  const [selectedAirport, setSelectedAirport] = useState<PlaceLocation | null>(null);

  // Local rental package
  const [localHours, setLocalHours] = useState<number>(8);

  const activeTypeMeta = useMemo(() => {
    return TRIP_TYPES_META.find((t) => t.id === tripType) || TRIP_TYPES_META[0];
  }, [tripType]);

  const handleSwapLocations = () => {
    const temp = pickupLocation;
    setPickupLocation(dropLocation);
    setDropLocation(temp);
  };

  const handleProceed = () => {
    let finalPickup = pickupLocation?.label || '';
    let finalDrop = dropLocation?.label || '';
    let pLat = pickupLocation?.lat || 12.8634;
    let pLng = pickupLocation?.lng || 74.8436;
    let dLat = dropLocation?.lat || 12.9716;
    let dLng = dropLocation?.lng || 77.5946;

    if (tripType === 'AIRPORT') {
      if (airportDirection === 'TO_AIRPORT') {
        if (!pickupLocation) {
          Alert.alert('Pickup Location Required', 'Please select your pickup location.');
          return;
        }
        if (!selectedAirport) {
          Alert.alert('Airport Required', 'Please select a destination airport.');
          return;
        }
        finalPickup = pickupLocation.label;
        pLat = pickupLocation.lat;
        pLng = pickupLocation.lng;
        finalDrop = selectedAirport.label;
        dLat = selectedAirport.lat;
        dLng = selectedAirport.lng;
      } else {
        if (!selectedAirport) {
          Alert.alert('Airport Required', 'Please select a pickup airport.');
          return;
        }
        if (!dropLocation) {
          Alert.alert('Drop Location Required', 'Please select your drop location.');
          return;
        }
        finalPickup = selectedAirport.label;
        pLat = selectedAirport.lat;
        pLng = selectedAirport.lng;
        finalDrop = dropLocation.label;
        dLat = dropLocation.lat;
        dLng = dropLocation.lng;
      }
    } else if (tripType === 'LOCAL') {
      if (!pickupLocation) {
        Alert.alert('Pickup Location Required', 'Please select your pickup location.');
        return;
      }
      finalDrop = `${localHours} Hours Package Area`;
      dLat = pLat + 0.05;
      dLng = pLng + 0.05;
    } else {
      if (!finalPickup) {
        Alert.alert('Pickup Location Required', 'Please select a pickup location.');
        return;
      }
      if (!finalDrop) {
        Alert.alert('Drop Location Required', 'Please select a drop location.');
        return;
      }
    }

    const validViaStops = viaStops.filter((s) => s && s.label);

    // Navigate to Page 4 (Select a Cab) with all trip details
    safeNavigate(() => {
      router.push({
        pathname: '/select-cab',
        params: {
          tripType,
          pickup: finalPickup,
          drop: finalDrop,
          viaStops: JSON.stringify(validViaStops),
          date: pickupDate,
          time: pickupTime,
          returnDate: tripType === 'ROUND' || tripType === 'TOUR' ? returnDate : '',
          returnTime: tripType === 'ROUND' || tripType === 'TOUR' ? returnTime : '',
          localHours: String(localHours),
          pickupLat: String(pLat),
          pickupLng: String(pLng),
          dropLat: String(dLat),
          dropLng: String(dLng),
        },
      });
    });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: topInset }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Enter Trip Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Field 1: Trip Type Dropdown */}
        <View style={styles.formGroup}>
          <Text style={styles.fieldLabel}>Trip Type</Text>
          <TouchableOpacity
            style={styles.dropdownCard}
            onPress={() => setShowTypePickerModal(true)}
            activeOpacity={0.8}
          >
            <View style={styles.dropdownLeft}>
              <View style={styles.typeIconBox}>
                <Ionicons name={activeTypeMeta.iconName} size={20} color="#ea580c" />
              </View>
              <Text style={styles.dropdownText}>{activeTypeMeta.label}</Text>
            </View>
            <Ionicons name="chevron-down" size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Airport Transfer Direction Toggle */}
        {tripType === 'AIRPORT' && (
          <View style={styles.airportToggleGroup}>
            <TouchableOpacity
              style={[
                styles.airportToggleBtn,
                airportDirection === 'TO_AIRPORT' && styles.airportToggleBtnActive,
              ]}
              onPress={() => setAirportDirection('TO_AIRPORT')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="airplane-outline"
                size={18}
                color={airportDirection === 'TO_AIRPORT' ? '#ffffff' : '#475569'}
              />
              <Text
                style={[
                  styles.airportToggleText,
                  airportDirection === 'TO_AIRPORT' && styles.airportToggleTextActive,
                ]}
              >
                Going to Airport
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.airportToggleBtn,
                airportDirection === 'FROM_AIRPORT' && styles.airportToggleBtnActive,
              ]}
              onPress={() => setAirportDirection('FROM_AIRPORT')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="car-outline"
                size={18}
                color={airportDirection === 'FROM_AIRPORT' ? '#ffffff' : '#475569'}
              />
              <Text
                style={[
                  styles.airportToggleText,
                  airportDirection === 'FROM_AIRPORT' && styles.airportToggleTextActive,
                ]}
              >
                Pickup from Airport
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Field 2: Pickup Location */}
        <View style={styles.formGroup}>
          <Text style={styles.fieldLabel}>Pickup Location</Text>
          {tripType === 'AIRPORT' && airportDirection === 'FROM_AIRPORT' ? (
            <TouchableOpacity
              style={styles.inputCard}
              onPress={() => setIsPickupModalOpen(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="airplane" size={20} color="#ea580c" style={styles.inputIcon} />
              <View style={styles.inputTextContainer}>
                <Text
                  style={[
                    styles.inputText,
                    !selectedAirport && styles.placeholderText,
                  ]}
                  numberOfLines={1}
                >
                  {selectedAirport ? selectedAirport.label : 'Select pickup airport'}
                </Text>
                {selectedAirport && (
                  <Text style={styles.inputSubtext}>{selectedAirport.sublabel || 'Terminal pickup point'}</Text>
                )}
              </View>
              <Ionicons name="chevron-down" size={18} color="#94a3b8" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.inputCard}
              onPress={() => setIsPickupModalOpen(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="location" size={20} color="#ea580c" style={styles.inputIcon} />
              <View style={styles.inputTextContainer}>
                <Text
                  style={[
                    styles.inputText,
                    !pickupLocation && styles.placeholderText,
                  ]}
                  numberOfLines={1}
                >
                  {pickupLocation ? pickupLocation.label : 'Enter pickup location'}
                </Text>
                {pickupLocation && (
                  <Text style={styles.inputSubtext}>
                    {pickupLocation.sublabel || pickupLocation.category || 'Selected Location'}
                  </Text>
                )}
              </View>
              <Ionicons name="search" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Dynamic Intermediate Stops / Multiple Drop Locations */}
        {viaStops.map((stop, index) => (
          <View key={`via-stop-${index}`} style={styles.formGroup}>
            <View style={styles.stopHeaderRow}>
              <View style={styles.stopBadge}>
                <Ionicons name="location" size={13} color="#d97706" />
                <Text style={styles.stopBadgeText}>STOP {index + 1} (VIA LOCATION)</Text>
              </View>
              <TouchableOpacity
                style={styles.removeStopBtn}
                onPress={() => handleRemoveStop(index)}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="trash-outline" size={14} color="#ef4444" />
                <Text style={styles.removeStopText}>Remove</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.inputCard, styles.stopInputCard]}
              onPress={() => handleEditStop(index)}
              activeOpacity={0.8}
            >
              <Ionicons name="pin" size={20} color="#d97706" style={styles.inputIcon} />
              <View style={styles.inputTextContainer}>
                <Text
                  style={[
                    styles.inputText,
                    !stop?.label && styles.placeholderText,
                  ]}
                  numberOfLines={1}
                >
                  {stop?.label || `Select Stop ${index + 1}`}
                </Text>
                {stop?.sublabel ? (
                  <Text style={styles.inputSubtext}>{stop.sublabel}</Text>
                ) : null}
              </View>
              <Ionicons name="search" size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        ))}

        {/* Add Stop Button (for One-Way, Round Trip, Tour, Corporate) */}
        {tripType !== 'LOCAL' && tripType !== 'AIRPORT' && viaStops.length < 4 && (
          <View style={styles.addStopRow}>
            <TouchableOpacity
              style={styles.addStopBtn}
              onPress={handleAddStop}
              activeOpacity={0.7}
            >
              <Ionicons name="add-circle" size={16} color="#ea580c" />
              <Text style={styles.addStopBtnText}>
                {viaStops.length === 0 ? 'Add Multiple Drops' : 'Add Another Drop'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Swap Button for Inter-city (Shown when no intermediate stops are added) */}
        {tripType !== 'LOCAL' && tripType !== 'AIRPORT' && viaStops.length === 0 && (
          <View style={styles.swapContainer}>
            <TouchableOpacity
              style={styles.swapButton}
              onPress={handleSwapLocations}
              activeOpacity={0.8}
            >
              <Ionicons name="swap-vertical" size={20} color="#ea580c" />
            </TouchableOpacity>
          </View>
        )}

        {/* Field 3: Drop Location / Local Hours */}
        {tripType === 'LOCAL' ? (
          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>Rental Duration & Distance</Text>
            <View style={styles.packageRow}>
              {[
                { h: 4, km: 40, label: '4 hrs / 40 km' },
                { h: 8, km: 80, label: '8 hrs / 80 km' },
                { h: 12, km: 120, label: '12 hrs / 120 km' },
              ].map((pkg) => {
                const isActive = localHours === pkg.h;
                return (
                  <TouchableOpacity
                    key={pkg.h}
                    style={[styles.packageCard, isActive && styles.packageCardActive]}
                    onPress={() => setLocalHours(pkg.h)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.packageHourText, isActive && styles.packageTextActive]}>
                      {pkg.h} Hours
                    </Text>
                    <Text style={[styles.packageKmText, isActive && styles.packageSubtextActive]}>
                      {pkg.km} km included
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : tripType === 'AIRPORT' && airportDirection === 'TO_AIRPORT' ? (
          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>Drop Airport</Text>
            <TouchableOpacity
              style={styles.inputCard}
              onPress={() => setIsDropModalOpen(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="airplane" size={20} color="#ea580c" style={styles.inputIcon} />
              <View style={styles.inputTextContainer}>
                <Text
                  style={[
                    styles.inputText,
                    !selectedAirport && styles.placeholderText,
                  ]}
                  numberOfLines={1}
                >
                  {selectedAirport ? selectedAirport.label : 'Select destination airport'}
                </Text>
                {selectedAirport && (
                  <Text style={styles.inputSubtext}>{selectedAirport.sublabel || 'Direct Departure Drop'}</Text>
                )}
              </View>
              <Ionicons name="chevron-down" size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>Drop Location</Text>
            <TouchableOpacity
              style={styles.inputCard}
              onPress={() => setIsDropModalOpen(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="location" size={20} color="#ea580c" style={styles.inputIcon} />
              <View style={styles.inputTextContainer}>
                <Text
                  style={[
                    styles.inputText,
                    !dropLocation && styles.placeholderText,
                  ]}
                  numberOfLines={1}
                >
                  {dropLocation ? dropLocation.label : 'Enter drop location'}
                </Text>
                {dropLocation && (
                  <Text style={styles.inputSubtext}>
                    {dropLocation.sublabel || dropLocation.category || 'Selected Location'}
                  </Text>
                )}
              </View>
              <Ionicons name="search" size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        )}

        {/* Field 4: Pickup Date */}
        <View style={styles.formGroup}>
          <Text style={styles.fieldLabel}>Pickup Date</Text>
          <TouchableOpacity
            style={styles.inputCard}
            onPress={() => setIsDatePickerOpen(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="calendar-outline" size={20} color="#ea580c" style={styles.inputIcon} />
            <Text style={styles.inputText}>{pickupDate}</Text>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Field 5: Pickup Time */}
        <View style={styles.formGroup}>
          <Text style={styles.fieldLabel}>Pickup Time</Text>
          <TouchableOpacity
            style={styles.inputCard}
            onPress={() => setIsTimePickerOpen(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="time-outline" size={20} color="#ea580c" style={styles.inputIcon} />
            <Text style={styles.inputText}>{pickupTime}</Text>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Return Date & Time for Round Trip */}
        {(tripType === 'ROUND' || tripType === 'TOUR') && (
          <>
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>Return Date</Text>
              <TouchableOpacity
                style={styles.inputCard}
                onPress={() => setIsReturnDatePickerOpen(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar" size={20} color="#0284c7" style={styles.inputIcon} />
                <Text style={styles.inputText}>{returnDate}</Text>
                <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>Return Time</Text>
              <TouchableOpacity
                style={styles.inputCard}
                onPress={() => setIsReturnTimePickerOpen(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="time" size={20} color="#0284c7" style={styles.inputIcon} />
                <Text style={styles.inputText}>{returnTime}</Text>
                <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Big Orange Next Button */}
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleProceed}
          activeOpacity={0.85}
        >
          <Text style={styles.nextButtonText}>Next</Text>
          <Ionicons name="arrow-forward" size={20} color="#ffffff" />
        </TouchableOpacity>
      </ScrollView>

      {/* Trip Type Selector Modal */}
      <Modal
        visible={showTypePickerModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTypePickerModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowTypePickerModal(false)}
        >
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Change Trip Type</Text>
            {TRIP_TYPES_META.map((item) => {
              const isSelected = tripType === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.typeOptionRow, isSelected && styles.typeOptionRowSelected]}
                  onPress={() => {
                    setTripType(item.id);
                    setShowTypePickerModal(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.typeIconBox, isSelected && styles.typeIconBoxSelected]}>
                    <Ionicons
                      name={item.iconName}
                      size={20}
                      color={isSelected ? '#ea580c' : '#64748b'}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.typeOptionText, isSelected && styles.typeOptionTextSelected]}>
                      {item.label}
                    </Text>
                    <Text style={styles.typeOptionSubtext}>{item.subtitle}</Text>
                  </View>
                  {isSelected && <Ionicons name="checkmark-circle" size={22} color="#ea580c" />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Location Picker Modals */}
      <LocationPickerModal
        visible={isPickupModalOpen}
        title={tripType === 'AIRPORT' && airportDirection === 'FROM_AIRPORT' ? 'Select Airport' : 'Select Pickup Location'}
        isPickup={true}
        onSelect={(loc) => {
          if (tripType === 'AIRPORT' && airportDirection === 'FROM_AIRPORT') {
            setSelectedAirport(loc);
          } else {
            setPickupLocation(loc);
          }
          setIsPickupModalOpen(false);
        }}
        onClose={() => setIsPickupModalOpen(false)}
      />

      <LocationPickerModal
        visible={isDropModalOpen}
        title={tripType === 'AIRPORT' && airportDirection === 'TO_AIRPORT' ? 'Select Destination Airport' : 'Select Drop Location'}
        isPickup={false}
        onSelect={(loc) => {
          if (tripType === 'AIRPORT' && airportDirection === 'TO_AIRPORT') {
            setSelectedAirport(loc);
          } else {
            setDropLocation(loc);
          }
          setIsDropModalOpen(false);
        }}
        onClose={() => setIsDropModalOpen(false)}
      />

      <LocationPickerModal
        visible={isStopModalOpen}
        title={`Select Stop ${activeStopIndex !== null ? activeStopIndex + 1 : ''} (Via Location)`}
        isPickup={false}
        onSelect={(loc) => {
          handleSelectStop(loc);
        }}
        onClose={() => {
          setIsStopModalOpen(false);
          setActiveStopIndex(null);
        }}
      />

      {/* Date & Time Modals */}
      <DatePickerModal
        visible={isDatePickerOpen}
        currentDate={pickupDate}
        onSelect={(key, formatted) => {
          const newDate = formatted || key;
          setPickupDate(newDate);
          setPickupTime((prev) => getUpcomingPickupTime(newDate, prev));
          setIsDatePickerOpen(false);
        }}
        onClose={() => setIsDatePickerOpen(false)}
      />

      <TimePickerModal
        visible={isTimePickerOpen}
        currentTime={pickupTime}
        selectedDate={pickupDate}
        title="Select Pickup Time"
        onSelect={(time) => {
          setPickupTime(time);
          setIsTimePickerOpen(false);
        }}
        onClose={() => setIsTimePickerOpen(false)}
      />

      <DatePickerModal
        visible={isReturnDatePickerOpen}
        currentDate={returnDate}
        onSelect={(key, formatted) => {
          const newReturnDate = formatted || key;
          setReturnDate(newReturnDate);
          setIsReturnDatePickerOpen(false);
        }}
        onClose={() => setIsReturnDatePickerOpen(false)}
      />

      <TimePickerModal
        visible={isReturnTimePickerOpen}
        currentTime={returnTime}
        selectedDate={returnDate}
        minTime={returnDate === pickupDate ? pickupTime : undefined}
        title="Select Return Time"
        onSelect={(time) => {
          setReturnTime(time);
          setIsReturnTimePickerOpen(false);
        }}
        onClose={() => setIsReturnTimePickerOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 40,
  },
  formGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  dropdownCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  dropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  typeIconBoxSelected: {
    backgroundColor: '#ffedd5',
  },
  dropdownText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  inputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  inputIcon: {
    marginRight: 12,
  },
  inputTextContainer: {
    flex: 1,
  },
  inputText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  inputSubtext: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  placeholderText: {
    color: '#94a3b8',
    fontWeight: '400',
  },
  swapContainer: {
    alignItems: 'center',
    marginVertical: -6,
    zIndex: 10,
  },
  swapButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  airportToggleGroup: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  airportToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  airportToggleBtnActive: {
    backgroundColor: '#ea580c',
    borderColor: '#ea580c',
  },
  airportToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  airportToggleTextActive: {
    color: '#ffffff',
  },
  packageRow: {
    flexDirection: 'row',
    gap: 8,
  },
  packageCard: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
  },
  packageCardActive: {
    borderColor: '#ea580c',
    backgroundColor: '#fff7ed',
  },
  packageHourText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  packageKmText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  packageTextActive: {
    color: '#ea580c',
  },
  packageSubtextActive: {
    color: '#9a3412',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ea580c',
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#ea580c',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  nextButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
  },
  typeOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 6,
  },
  typeOptionRowSelected: {
    backgroundColor: '#fff7ed',
  },
  typeOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  typeOptionTextSelected: {
    color: '#ea580c',
    fontWeight: '700',
  },
  typeOptionSubtext: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  stopHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  stopBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stopBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#b45309',
    letterSpacing: 0.5,
  },
  removeStopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
  },
  removeStopText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ef4444',
  },
  stopInputCard: {
    borderColor: '#fef3c7',
    backgroundColor: '#fffbeb',
  },
  addStopRow: {
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 2,
  },
  addStopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 24,
    borderRadius: 30,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#fdba74',
    backgroundColor: '#fffaf5',
    alignSelf: 'center',
  },
  addStopBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#ea580c',
  },
});
