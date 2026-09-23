import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { ALL_LOCATIONS, PlaceLocation } from '../lib/locations';

interface LocationPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (location: PlaceLocation) => void;
  title: string;
  currentValue?: string;
  isPickup?: boolean;
}

type TabCategory = 'ALL' | 'MANGALURU' | 'AIRPORTS' | 'OUTSTATION';

export function LocationPickerModal({
  visible,
  onClose,
  onSelect,
  title,
  currentValue,
  isPickup,
}: LocationPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<TabCategory>('ALL');
  const [gpsLoading, setGpsLoading] = useState(false);

  const filteredLocations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return ALL_LOCATIONS.filter((loc) => {
      // Category filter
      if (activeCategory === 'AIRPORTS') {
        if (loc.category !== 'AIRPORTS') return false;
      } else if (activeCategory === 'MANGALURU') {
        if (loc.category !== 'MANGALURU') return false;
      } else if (activeCategory === 'OUTSTATION') {
        if (loc.category !== 'OUTSTATION') return false;
      }

      if (!query) return true;

      const labelMatch = loc.label.toLowerCase().includes(query);
      const sublabelMatch = loc.sublabel?.toLowerCase().includes(query) || false;
      const keywordMatch = loc.keywords?.some((k) => k.toLowerCase().includes(query)) || false;

      return labelMatch || sublabelMatch || keywordMatch;
    });
  }, [searchQuery, activeCategory]);

  const handleUseCurrentLocation = async () => {
    setGpsLoading(true);
    try {
      // 1. Check if device master GPS / Location service is turned on
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        if (Platform.OS === 'android') {
          try {
            // Trigger native Android system "Turn on Location" prompt dialog
            await Location.enableNetworkProviderAsync();
          } catch {
            Alert.alert(
              'Location Services Disabled',
              'Please turn on GPS Location in your phone settings to detect your current position.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Open Settings', onPress: () => Linking.openSettings() },
              ]
            );
            setGpsLoading(false);
            return;
          }
        } else {
          Alert.alert(
            'Location Services Disabled',
            'Please turn on Location in Settings to detect your current position.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ]
          );
          setGpsLoading(false);
          return;
        }
      }

      // 2. Request / Check App Location Permission
      let { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        const req = await Location.requestForegroundPermissionsAsync();
        status = req.status;
      }

      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'Please allow location permission in Settings to auto-fill your current pickup point.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => Linking.openSettings() },
          ]
        );
        setGpsLoading(false);
        return;
      }

      // 3. Obtain fresh current GPS position (prevent cached stale points)
      let loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
        mayShowUserSettingsDialog: true,
      }).catch(async () => {
        return await Location.getLastKnownPositionAsync({
          maxAge: 3000,
        });
      });

      if (!loc) {
        throw new Error('Unable to obtain GPS fix');
      }

      const { latitude, longitude } = loc.coords;

      // 4. Reverse geocode coordinates using OpenStreetMap (OSM) Live Service
      let label = 'Current GPS Location';
      let sublabel = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

      // Try OpenStreetMap Nominatim for exact street & locality
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3500);

        const osmRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
          {
            headers: {
              'Accept-Language': 'en',
              'User-Agent': 'KandyCabsCustomerApp/1.0',
            },
            signal: controller.signal,
          }
        );
        clearTimeout(timeout);

        if (osmRes.ok) {
          const data = await osmRes.json();
          const addr = data.address || {};

          const road = addr.road || addr.pedestrian || addr.street || addr.amenity || addr.building || addr.shop || '';
          const locality = addr.suburb || addr.neighbourhood || addr.residential || addr.quarter || '';
          const city = addr.city || addr.town || addr.municipality || addr.village || addr.state_district || 'Mangaluru';
          const postcode = addr.postcode || '';

          const labelParts: string[] = [];
          if (road) labelParts.push(road);
          if (locality && locality !== road) labelParts.push(locality);
          if (city && !labelParts.some((p) => p.toLowerCase().includes(city.toLowerCase()))) {
            labelParts.push(city);
          }

          if (labelParts.length > 0) {
            label = labelParts.join(', ');
          } else if (data.display_name) {
            label = data.display_name.split(',').slice(0, 3).join(', ').trim();
          }

          const subParts = [locality, city, addr.state, postcode].filter(Boolean);
          sublabel = subParts.filter((v, i, a) => a.indexOf(v) === i).join(', ') || 'Detected via Live GPS';
        } else {
          throw new Error('OSM Reverse failed');
        }
      } catch {
        // Fallback to Native Expo Reverse Geocoder with clean formatting (stripping administrative division tags)
        try {
          const addresses = await Location.reverseGeocodeAsync({
            latitude,
            longitude,
          });

          if (addresses && addresses.length > 0) {
            const addr = addresses[0];
            const road = addr.street || addr.name || '';
            const district = addr.district || '';
            const cleanDistrict = district.toLowerCase().includes('division') ? '' : district;
            const city = addr.city || 'Mangaluru';

            const parts = [road, cleanDistrict, city].filter(Boolean);
            if (parts.length > 0) {
              label = parts.filter((v, i, a) => a.indexOf(v) === i).join(', ');
            }
            sublabel = [city, addr.region, addr.postalCode].filter(Boolean).join(', ') || sublabel;
          }
        } catch {
          // Final fallback: keep clean coordinate tags
        }
      }

      const placeLoc: PlaceLocation = {
        label,
        sublabel,
        lat: latitude,
        lng: longitude,
        source: 'OSM_LIVE',
      };

      onSelect(placeLoc);
      onClose();
    } catch (e: any) {
      Alert.alert(
        'GPS Location',
        'Could not get an accurate GPS fix. Please ensure GPS is enabled or select a nearby landmark from the list.',
        [{ text: 'OK' }]
      );
    } finally {
      setGpsLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.container}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#1e293b" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{title}</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#94a3b8" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search airport, railway station, locality..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && Platform.OS !== 'ios' && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>

          {/* GPS Location Button for Pickup */}
          {isPickup && (
            <TouchableOpacity
              style={styles.gpsButton}
              onPress={handleUseCurrentLocation}
              disabled={gpsLoading}
            >
              {gpsLoading ? (
                <ActivityIndicator size="small" color="#ea580c" />
              ) : (
                <Ionicons name="navigate" size={18} color="#ea580c" />
              )}
              <Text style={styles.gpsButtonText}>Use My Current Live Location</Text>
              <View style={styles.gpsBadge}>
                <Text style={styles.gpsBadgeText}>GPS</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Category Tabs */}
          <View style={styles.categoryTabs}>
            {[
              { id: 'ALL' as TabCategory, label: 'All' },
              { id: 'MANGALURU' as TabCategory, label: 'Mangaluru' },
              { id: 'AIRPORTS' as TabCategory, label: '✈️ Airports' },
              { id: 'OUTSTATION' as TabCategory, label: '🛣️ Outstation' },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.categoryTab,
                  activeCategory === tab.id && styles.categoryTabActive,
                ]}
                onPress={() => setActiveCategory(tab.id)}
              >
                <Text
                  style={[
                    styles.categoryTabText,
                    activeCategory === tab.id && styles.categoryTabTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Locations List */}
          <FlatList
            data={filteredLocations}
            keyExtractor={(item, index) => `${item.label}-${index}`}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const isSelected = currentValue === item.label;
              const isAirport = item.category === 'AIRPORTS';
              const isOutstation = item.category === 'OUTSTATION';

              return (
                <TouchableOpacity
                  style={[styles.locationItem, isSelected && styles.locationItemSelected]}
                  onPress={() => {
                    onSelect(item);
                    onClose();
                  }}
                >
                  <View
                    style={[
                      styles.iconContainer,
                      isAirport
                        ? styles.iconAirport
                        : isOutstation
                        ? styles.iconOutstation
                        : styles.iconLocal,
                    ]}
                  >
                    <Ionicons
                      name={isAirport ? 'airplane' : isOutstation ? 'car' : 'location'}
                      size={18}
                      color={isAirport ? '#0284c7' : isOutstation ? '#d97706' : '#16a34a'}
                    />
                  </View>
                  <View style={styles.locationTextContainer}>
                    <Text style={styles.locationLabel} numberOfLines={1}>
                      {item.label}
                    </Text>
                    {item.sublabel ? (
                      <Text style={styles.locationSublabel} numberOfLines={1}>
                        {item.sublabel}
                      </Text>
                    ) : null}
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={20} color="#ea580c" />
                  )}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="location-outline" size={48} color="#cbd5e1" />
                <Text style={styles.emptyTitle}>No matching locations found</Text>
                <Text style={styles.emptySubtitle}>Try searching by locality, area or station name</Text>
              </View>
            }
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '500',
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  gpsButtonText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#c2410c',
    marginLeft: 8,
  },
  gpsBadge: {
    backgroundColor: '#ea580c',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  gpsBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  categoryTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    gap: 6,
  },
  categoryTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  categoryTabActive: {
    backgroundColor: '#0f172a',
  },
  categoryTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  categoryTabTextActive: {
    color: '#ffffff',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  locationItemSelected: {
    borderColor: '#ea580c',
    backgroundColor: '#fff7ed',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconAirport: {
    backgroundColor: '#e0f2fe',
  },
  iconOutstation: {
    backgroundColor: '#fef3c7',
  },
  iconLocal: {
    backgroundColor: '#dcfce7',
  },
  locationTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  locationLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  locationSublabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
});
