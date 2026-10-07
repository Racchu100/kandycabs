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
  TextInput,
  Modal,
  Image,
  Dimensions,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const LUGGAGE_OPTIONS = [
  { id: 'NORMAL', label: 'Normal Luggage', description: 'Standard suitcases and travel bags' },
  { id: 'HAND_BAGS', label: 'Hand Bags / Backpacks Only', description: 'Small laptop bags or backpacks' },
  { id: 'EXTRA_HEAVY', label: 'Heavy / Extra Luggage', description: 'Multiple large suitcases or bulky items' },
  { id: 'NO_LUGGAGE', label: 'No Luggage', description: 'Travelers with no cargo or bags' },
];

export default function AdditionalDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0);

  // Vehicle and Route params passed from select-cab
  const pickup = (params.pickup as string) || 'Mangaluru Airport (IXE)';
  const drop = (params.drop as string) || 'Bengaluru (Bangalore)';
  const pickupDate = (params.date as string) || '28-09-2026';
  const pickupTime = (params.time as string) || '09:00';
  const tripType = (params.tripType as string) || 'ONEWAY';
  const localHours = (params.localHours as string) || '8';
  const category = (params.category as string) || 'HATCHBACK';
  const selectedVehicleName = (params.selectedVehicleName as string) || 'Hatchback';
  const ratePerKm = (params.ratePerKm as string) || '11';
  const minKm = (params.minKm as string) || '50';
  const maxSeats = Number(params.maxSeats) || 4;
  const hasCarrier = (params.hasCarrier as string) === 'true';
  const carrierText = (params.carrierText as string) || '';
  const carrierExcludedCars = (params.carrierExcludedCars as string) || '';
  const seaterVariant = (params.seaterVariant as string) || '';
  const seaterLabel = (params.seaterLabel as string) || '';
  const wheelbase = (params.wheelbase as string) || '';

  // 1. Number of Passengers state (Default to maxSeats or 4)
  const [passengerCount, setPassengerCount] = useState<number>(
    maxSeats >= 10 ? Math.min(maxSeats, 10) : Math.min(4, maxSeats)
  );

  // 2. Luggage Details state
  const [selectedLuggage, setSelectedLuggage] = useState<string>('Normal Luggage');
  const [showLuggageModal, setShowLuggageModal] = useState<boolean>(false);

  // 3. Roof Carrier state
  const [requestCarrier, setRequestCarrier] = useState<boolean>(false);

  // 4. Special Requirements state
  const [specialRequirements, setSpecialRequirements] = useState<string>('');

  const handleDecrement = () => {
    if (passengerCount > 1) {
      setPassengerCount((prev) => prev - 1);
    }
  };

  const handleIncrement = () => {
    if (passengerCount < maxSeats) {
      setPassengerCount((prev) => prev + 1);
    }
  };

  const handleProceed = () => {
    router.push({
      pathname: '/booking',
      params: {
        ...params,
        passengers: String(passengerCount),
        luggage: selectedLuggage,
        requestCarrier: requestCarrier ? 'true' : 'false',
        specialRequirements: specialRequirements.trim(),
      },
    });
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: topInset }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color="#0f172a" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Additional Details</Text>

        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Trip Summary Mini Banner */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryTopRow}>
              <View style={styles.cabBadge}>
                <Ionicons name="car-sport" size={14} color="#ea580c" />
                <Text style={styles.cabBadgeText}>{selectedVehicleName}</Text>
              </View>
              <Text style={styles.seatLimitText}>Max {maxSeats} seats</Text>
            </View>
            <View style={styles.routeSummaryRow}>
              <Text style={styles.routeText} numberOfLines={1}>
                {pickup} ➔ {drop}
              </Text>
            </View>
          </View>

          {/* 1. Number of Passengers */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Number of Passengers</Text>
            <View style={styles.counterBox}>
              <TouchableOpacity
                style={[styles.counterBtn, passengerCount <= 1 && styles.counterBtnDisabled]}
                onPress={handleDecrement}
                disabled={passengerCount <= 1}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="remove"
                  size={20}
                  color={passengerCount <= 1 ? '#cbd5e1' : '#0f172a'}
                />
              </TouchableOpacity>

              <View style={styles.counterValueBox}>
                <Text style={styles.counterValueText}>{passengerCount}</Text>
              </View>

              <TouchableOpacity
                style={[styles.counterBtn, passengerCount >= maxSeats && styles.counterBtnDisabled]}
                onPress={handleIncrement}
                disabled={passengerCount >= maxSeats}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="add"
                  size={20}
                  color={passengerCount >= maxSeats ? '#cbd5e1' : '#0f172a'}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* 2. Luggage Details */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Luggage Details</Text>
            <TouchableOpacity
              style={styles.dropdownSelector}
              onPress={() => setShowLuggageModal(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.dropdownText}>{selectedLuggage}</Text>
              <Ionicons name="chevron-down" size={18} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* 3. Roof Carrier / Luggage Carriage Option */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Roof Luggage Carrier</Text>
            {hasCarrier ? (
              <View style={{ gap: 8 }}>
                <TouchableOpacity
                  style={[
                    styles.dropdownSelector,
                    requestCarrier && { borderColor: '#16a34a', backgroundColor: '#f0fdf4' },
                  ]}
                  onPress={() => setRequestCarrier(!requestCarrier)}
                  activeOpacity={0.8}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.dropdownText,
                        requestCarrier && { color: '#15803d', fontWeight: '800' },
                      ]}
                    >
                      {requestCarrier ? '✓ Roof Carrier Requested' : 'Add Roof Carrier (Optional)'}
                    </Text>
                    <Text style={{ fontSize: 11, color: requestCarrier ? '#166534' : '#64748b', marginTop: 2 }}>
                      {carrierText || 'Up to 50 kg / 2 extra suitcases on rooftop'}
                    </Text>
                  </View>
                  <Ionicons
                    name={requestCarrier ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={requestCarrier ? '#16a34a' : '#94a3b8'}
                  />
                </TouchableOpacity>

                {carrierExcludedCars ? (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      padding: 10,
                      borderRadius: 10,
                      backgroundColor: '#fffbeb',
                      borderWidth: 1,
                      borderColor: '#fde68a',
                    }}
                  >
                    <Ionicons name="information-circle" size={16} color="#d97706" />
                    <Text style={{ fontSize: 11, color: '#92400e', fontWeight: '600', flex: 1 }}>
                      Note: {carrierExcludedCars}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : (
              <View
                style={{
                  backgroundColor: '#f8fafc',
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  borderRadius: 14,
                  padding: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <Ionicons name="alert-circle-outline" size={20} color="#64748b" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155' }}>
                    Carrier Excluded / Not Available
                  </Text>
                  <Text style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                    {carrierText || 'No roof carrier available on this vehicle. Boot luggage space only.'}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* 4. Special Requirements (Optional) */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Special Requirements (Optional)</Text>
            <TextInput
              style={styles.textAreaInput}
              placeholder="Any special requests (e.g. child seat, extra stops, etc.)"
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={4}
              value={specialRequirements}
              onChangeText={setSpecialRequirements}
              textAlignVertical="top"
            />
          </View>

          <View style={{ height: 90 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Sticky Action Button */}
      <View style={styles.bottomDock}>
        <TouchableOpacity
          style={styles.proceedButton}
          onPress={handleProceed}
          activeOpacity={0.85}
        >
          <Text style={styles.proceedButtonText}>Continue to Passenger Info</Text>
          <Ionicons name="arrow-forward" size={18} color="#ffffff" style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      </View>

      {/* Luggage Selection Modal */}
      <Modal
        visible={showLuggageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLuggageModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowLuggageModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Luggage Type</Text>
              <TouchableOpacity onPress={() => setShowLuggageModal(false)}>
                <Ionicons name="close-circle" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {LUGGAGE_OPTIONS.map((item) => {
              const isSelected = selectedLuggage === item.label;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.luggageOptionItem, isSelected && styles.luggageOptionItemSelected]}
                  onPress={() => {
                    setSelectedLuggage(item.label);
                    setShowLuggageModal(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.luggageOptionLabel,
                        isSelected && styles.luggageOptionLabelSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                    <Text style={styles.luggageOptionDesc}>{item.description}</Text>
                  </View>
                  {isSelected && <Ionicons name="checkmark-circle" size={20} color="#ea580c" />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  summaryCard: {
    backgroundColor: '#fff7ed',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#fed7aa',
    marginBottom: 24,
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cabBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 5,
  },
  cabBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ea580c',
  },
  seatLimitText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9a3412',
  },
  routeSummaryRow: {
    marginTop: 2,
  },
  routeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 10,
  },
  counterBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    height: 54,
    padding: 4,
  },
  counterBtn: {
    width: 48,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBtnDisabled: {
    opacity: 0.4,
  },
  counterValueBox: {
    flex: 1,
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  counterValueText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  dropdownSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dropdownText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  textAreaInput: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 110,
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '500',
  },
  bottomDock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  proceedButton: {
    backgroundColor: '#ea580c',
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  proceedButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  luggageOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 8,
    backgroundColor: '#ffffff',
  },
  luggageOptionItemSelected: {
    borderColor: '#ea580c',
    backgroundColor: '#fff7ed',
  },
  luggageOptionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  luggageOptionLabelSelected: {
    color: '#ea580c',
  },
  luggageOptionDesc: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
});
