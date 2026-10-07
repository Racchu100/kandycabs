import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
  Platform,
  SafeAreaView,
  StatusBar,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { driverApiClient } from '../lib/api';
import { Ionicons } from '@expo/vector-icons';

type VehicleCategoryType = 'HATCHBACK' | 'SEDAN' | 'SUV' | 'SUV_PREMIUM' | 'TEMPO_TRAVELER';
type FuelTypeVal = 'DIESEL' | 'PETROL' | 'CNG';

const VEHICLE_CATEGORIES: Array<{
  id: VehicleCategoryType;
  title: string;
  defaultModel: string;
  models: string;
  seats: string;
  icon: string;
}> = [
  {
    id: 'HATCHBACK',
    title: 'Hatchback',
    defaultModel: 'Maruti Suzuki WagonR',
    models: 'WagonR, Swift, Tiago, i10',
    seats: '4 Seats',
    icon: '🚗',
  },
  {
    id: 'SEDAN',
    title: 'Sedan',
    defaultModel: 'Maruti Suzuki Dzire',
    models: 'Dzire, Etios, Aura, Amaze',
    seats: '4 Seats',
    icon: '🚘',
  },
  {
    id: 'SUV',
    title: 'SUV 6+1',
    defaultModel: 'Maruti Suzuki Ertiga',
    models: 'Ertiga, Carens, Triber, XL6',
    seats: '6 Seats',
    icon: '🚙',
  },
  {
    id: 'SUV_PREMIUM',
    title: 'SUV Premium 7+1',
    defaultModel: 'Toyota Innova Crysta',
    models: 'Innova Crysta, Hycross, XUV700',
    seats: '7 Seats',
    icon: '🚐',
  },
  {
    id: 'TEMPO_TRAVELER',
    title: 'Tempo Traveller',
    defaultModel: 'Force Traveller 12 Seater',
    models: 'Force Traveller, Winger, Urbania',
    seats: '12 Seats',
    icon: '🚌',
  },
];

const FUEL_TYPES: Array<{ id: FuelTypeVal; label: string; icon: string }> = [
  { id: 'DIESEL', label: 'Diesel', icon: '⛽' },
  { id: 'PETROL', label: 'Petrol', icon: '⛽' },
  { id: 'CNG', label: 'CNG (Green)', icon: '🟢' },
];

const CARRIAGE_OPTIONS = [
  'None (No Carriage / Luggage Space)',
  '2 Large Bags (Standard Boot)',
  '3 Large Bags (Spacious Boot)',
  '4 Large Bags (SUV Boot Space)',
  '5+ Large Bags (Max Cargo)',
  'Roof Carrier Included 🧳 (Heavy Luggage / Hill Trips)',
];

export default function DriverDocumentsUploadScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Driver Identity & License
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseDocUrl, setLicenseDocUrl] = useState<string | null>(null);
  const [rcDocUrl, setRcDocUrl] = useState<string | null>(null);
  const [insuranceDocUrl, setInsuranceDocUrl] = useState<string | null>(null);

  // Vehicle & Carriage Specs (Starts completely empty / unselected)
  const [plateNumber, setPlateNumber] = useState('');
  const [category, setCategory] = useState<VehicleCategoryType | null>(null);
  const [carModel, setCarModel] = useState('');
  const [fuelType, setFuelType] = useState<FuelTypeVal | null>(null);
  const [carriageCapacity, setCarriageCapacity] = useState<string | null>(null);

  // Dropdown States
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [carriageDropdownOpen, setCarriageDropdownOpen] = useState(false);

  const [verificationStatus, setVerificationStatus] = useState('PENDING');
  const [adminNotes, setAdminNotes] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await driverApiClient.fetch('/api/driver/documents');
      if (res.success && res.documents) {
        const d = res.documents;
        setProfilePhotoUrl(d.profilePhotoUrl || null);
        setLicenseNumber(d.licenseNumber && d.licenseNumber !== 'PENDING' ? d.licenseNumber : '');
        setLicenseDocUrl(d.licenseDocUrl || null);
        setRcDocUrl(d.rcDocUrl || null);
        setInsuranceDocUrl(d.insuranceDocUrl || null);
        setVerificationStatus(d.verificationStatus || 'PENDING');
        setAdminNotes(d.adminNotes || null);

        if (d.vehicle) {
          if (
            d.vehicle.plateNumber &&
            d.vehicle.plateNumber !== 'PENDING' &&
            !d.vehicle.plateNumber.startsWith('KA 01 TR 0000')
          ) {
            setPlateNumber(d.vehicle.plateNumber);
            if (d.vehicle.category) {
              setCategory(d.vehicle.category as VehicleCategoryType);
            }
            if (d.vehicle.fuelType) {
              setFuelType(d.vehicle.fuelType as FuelTypeVal);
            }
          } else {
            setPlateNumber('');
            setCategory(null);
            setFuelType(null);
          }
        } else {
          setPlateNumber('');
          setCategory(null);
          setFuelType(null);
        }

        if (d.carModel) {
          setCarModel(d.carModel);
        } else if (d.adminNotes) {
          const matchModel = d.adminNotes.match(/\[Car Model:\s*([^\]]+)\]/);
          if (matchModel && matchModel[1]) {
            setCarModel(matchModel[1].trim());
          } else {
            setCarModel('');
          }
        } else {
          setCarModel('');
        }

        if (d.carriageCapacity) {
          setCarriageCapacity(d.carriageCapacity);
        } else if (d.adminNotes) {
          const match = d.adminNotes.match(/\[Luggage\/Carriage:\s*([^\]]+)\]/);
          if (match && match[1]) {
            setCarriageCapacity(match[1].trim());
          }
        }
      }
    } catch (err: any) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  // Image Picker Helper
  const pickImage = async (
    target: 'profile' | 'license' | 'rc' | 'insurance',
    mode: 'camera' | 'library'
  ) => {
    try {
      const isProfile = target === 'profile';
      const pickerOptions: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        base64: true,
        allowsEditing: true,
        aspect: isProfile ? [1, 1] : undefined,
      };

      let result;
      if (mode === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Camera access is required to take photo.');
          return;
        }
        result = await ImagePicker.launchCameraAsync(pickerOptions);
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Photo library access is required.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync(pickerOptions);
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const uri = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;

        if (target === 'profile') {
          setProfilePhotoUrl(uri);
        } else if (target === 'license') {
          setLicenseDocUrl(uri);
        } else if (target === 'rc') {
          setRcDocUrl(uri);
        } else if (target === 'insurance') {
          setInsuranceDocUrl(uri);
        }
      }
    } catch (err: any) {
      console.error('Error selecting image:', err);
      Alert.alert('Image Error', err.message || 'Failed to select image');
    }
  };

  const handleSelectOptions = (target: 'profile' | 'license' | 'rc' | 'insurance') => {
    const title = target === 'profile' ? 'Upload Driver Profile Photo' : 'Upload Document Photo';
    Alert.alert(
      title,
      'Choose source for uploading photo:',
      [
        { text: '📷 Take Photo with Camera', onPress: () => pickImage(target, 'camera') },
        { text: '🖼️ Choose from Photo Gallery', onPress: () => pickImage(target, 'library') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleFillDemoPhotos = () => {
    setProfilePhotoUrl('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80');
    setLicenseDocUrl('https://images.unsplash.com/photo-1584433144859-1fc3ab64a957?w=800&auto=format&fit=crop&q=80');
    setRcDocUrl('https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80');
    setInsuranceDocUrl('https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800&auto=format&fit=crop&q=80');
    if (!licenseNumber) setLicenseNumber('KA 01 2023 0089745');
    if (!plateNumber) setPlateNumber('KA 01 MJ 2023');
    setCategory('SEDAN');
    setCarModel('Maruti Suzuki Dzire VXI');
    setFuelType('DIESEL');
    setCarriageCapacity('3 Large Bags (Spacious Boot)');
    Alert.alert('Demo Details Loaded', 'Loaded sample verified KYC documents, vehicle specs (KA 01 MJ 2023 Maruti Suzuki Dzire) and carriage capacity. You can now tap Save & Submit!');
  };

  const handleSubmit = async () => {
    if (!plateNumber.trim()) {
      Alert.alert('Required Field', 'Please enter your Vehicle Plate / Registration number (e.g. KA 01 MJ 2023).');
      return;
    }

    if (!category) {
      Alert.alert('Required Field', 'Please select your Vehicle Category (Segment).');
      return;
    }

    if (!carModel.trim()) {
      Alert.alert('Required Field', 'Please enter which car make & model you drive (e.g. Maruti Suzuki Dzire / Toyota Innova).');
      return;
    }

    if (!fuelType) {
      Alert.alert('Required Field', 'Please select your Vehicle Fuel Type (Diesel, Petrol, or CNG).');
      return;
    }

    if (!carriageCapacity) {
      Alert.alert('Required Field', 'Please select your Vehicle Carriage / Luggage capacity.');
      return;
    }

    const allDocsAttached = !!(licenseDocUrl && rcDocUrl && insuranceDocUrl);

    setSubmitting(true);
    try {
      const res = await driverApiClient.fetch('/api/driver/documents', {
        method: 'POST',
        body: JSON.stringify({
          profilePhotoUrl,
          licenseNumber: licenseNumber ? licenseNumber.trim().toUpperCase() : 'PENDING',
          plateNumber: plateNumber ? plateNumber.trim().toUpperCase() : null,
          category,
          carModel: carModel.trim(),
          fuelType,
          carriageCapacity: carriageCapacity ? carriageCapacity.trim() : 'None',
          licenseDocUrl,
          rcDocUrl,
          insuranceDocUrl,
        }),
      });

      if (res.success) {
        await fetchDocuments();
        if (allDocsAttached) {
          Alert.alert(
            '✓ Submitted to Admin',
            'Your vehicle specifications and all KYC documents have been saved and sent for Admin Verification.',
            [
              {
                text: 'Back to Dashboard',
                onPress: () => router.replace('/dashboard'),
              },
            ]
          );
        } else {
          Alert.alert(
            '✓ Vehicle Details Saved',
            'Your vehicle specifications and plate have been updated. Remember to upload all 3 KYC certificates (DL, RC, Insurance) for final approval.',
            [
              {
                text: 'Back to Dashboard',
                onPress: () => router.replace('/dashboard'),
              },
              {
                text: 'Stay on Page',
                style: 'cancel',
              },
            ]
          );
        }
      } else {
        Alert.alert('Submission Error', res.message || 'Failed to submit documents');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save documents');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCategoryObj = VEHICLE_CATEGORIES.find((c) => c.id === category);

  const cleanFeedback = adminNotes
    ? adminNotes
        .replace(/\[Car Model:[^\]]+\]/g, '')
        .replace(/\[Luggage\/Carriage:[^\]]+\]/g, '')
        .trim()
    : '';

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#ea580c" />
        <Text style={{ color: '#0f172a', marginTop: 12, fontWeight: '700' }}>Loading Details...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Top Navigation Bar */}
      <View style={styles.topNavBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
          <Text style={styles.backBtnText}>Profile</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Vehicle & KYC Registration</Text>
        <TouchableOpacity
          style={styles.quickFillBtn}
          onPress={handleFillDemoPhotos}
          activeOpacity={0.7}
        >
          <Text style={styles.quickFillBtnText}>⚡ Demo</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Status / Notice Header */}
        <View style={styles.noticeCard}>
          <View style={styles.noticeTopRow}>
            <Text style={styles.noticeEmoji}>🛡️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.noticeTitle}>Driver & Vehicle Profile Setup</Text>
              <Text style={styles.noticeSub}>
                Select your vehicle category, input your car model, license number, carriage allowance, and KYC documents for admin approval.
              </Text>
            </View>
          </View>

          {cleanFeedback ? (
            <View style={styles.adminFeedbackBox}>
              <Text style={styles.adminFeedbackTitle}>⚠️ Admin Feedback:</Text>
              <Text style={styles.adminFeedbackText}>{cleanFeedback}</Text>
            </View>
          ) : null}
        </View>

        {/* ============================================================ */}
        {/* SECTION 1: VEHICLE & CARRIAGE DETAILS                        */}
        {/* ============================================================ */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>1. VEHICLE & CARRIAGE DETAILS</Text>
          <Text style={styles.sectionHeaderSub}>Car Specs</Text>
        </View>

        {/* Vehicle Plate / Reg Number */}
        <View style={styles.inputCard}>
          <View style={styles.inputLabelRow}>
            <Text style={styles.inputLabel}>VEHICLE PLATE / REGISTRATION NUMBER:</Text>
            <View style={[styles.badgePill, plateNumber ? styles.badgeGreen : styles.badgeAmber]}>
              <Text style={plateNumber ? styles.badgeTextGreen : styles.badgeTextAmber}>
                {plateNumber ? '✓ Filled' : 'Required'}
              </Text>
            </View>
          </View>
          <View style={styles.plateInputWrapper}>
            <View style={styles.plateIndBadge}>
              <Text style={styles.plateIndText}>IND</Text>
            </View>
            <TextInput
              style={styles.plateTextInput}
              value={plateNumber}
              onChangeText={setPlateNumber}
              placeholder="e.g. KA 01 MJ 2023"
              placeholderTextColor="#94a3b8"
              autoCapitalize="characters"
            />
          </View>
        </View>

        {/* Vehicle Category (Car Model) - DROPDOWN & EXACT CAR INPUT */}
        <View style={styles.inputCard}>
          <View style={styles.inputLabelRow}>
            <Text style={styles.inputLabel}>VEHICLE CATEGORY (SEGMENT):</Text>
            <View style={[styles.badgePill, selectedCategoryObj ? styles.badgeGreen : styles.badgeAmber]}>
              <Text style={selectedCategoryObj ? styles.badgeTextGreen : styles.badgeTextAmber}>
                {selectedCategoryObj ? selectedCategoryObj.seats : 'Required'}
              </Text>
            </View>
          </View>
          <Text style={styles.fieldSubHelp}>Tap to choose your vehicle category segment:</Text>

          {/* Dropdown Trigger */}
          <TouchableOpacity
            style={[styles.dropdownTrigger, categoryDropdownOpen && styles.dropdownTriggerOpen]}
            onPress={() => {
              setCategoryDropdownOpen(!categoryDropdownOpen);
              if (carriageDropdownOpen) setCarriageDropdownOpen(false);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.dropdownTriggerIcon}>{selectedCategoryObj?.icon || '🚗'}</Text>
            <View style={{ flex: 1, paddingHorizontal: 6 }}>
              {selectedCategoryObj ? (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.dropdownTriggerTitle}>{selectedCategoryObj.title}</Text>
                    <View style={styles.dropdownSeatBadge}>
                      <Text style={styles.dropdownSeatBadgeText}>{selectedCategoryObj.seats}</Text>
                    </View>
                  </View>
                  <Text style={styles.dropdownTriggerSub} numberOfLines={1}>
                    {selectedCategoryObj.models}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={[styles.dropdownTriggerTitle, { color: '#94a3b8' }]}>
                    Select Vehicle Category
                  </Text>
                  <Text style={styles.dropdownTriggerSub}>
                    Tap to select Hatchback, Sedan, SUV, TT
                  </Text>
                </>
              )}
            </View>
            <Ionicons
              name={categoryDropdownOpen ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={categoryDropdownOpen ? '#ea580c' : '#64748b'}
            />
          </TouchableOpacity>

          {/* Dropdown Menu Items */}
          {categoryDropdownOpen && (
            <View style={styles.dropdownMenu}>
              {VEHICLE_CATEGORIES.map((cat, idx) => {
                const isSelected = category === cat.id;
                const isLast = idx === VEHICLE_CATEGORIES.length - 1;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.dropdownMenuItem,
                      isSelected && styles.dropdownMenuItemSelected,
                      !isLast && styles.dropdownMenuItemBorder,
                    ]}
                    onPress={() => {
                      setCategory(cat.id);
                      setCategoryDropdownOpen(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.dropdownItemIcon}>{cat.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.dropdownItemTitle, isSelected && styles.dropdownItemTitleSelected]}>
                          {cat.title}
                        </Text>
                        <View style={[styles.dropdownItemSeatPill, isSelected && styles.dropdownItemSeatPillSelected]}>
                          <Text style={[styles.dropdownItemSeatText, isSelected && styles.dropdownItemSeatTextSelected]}>
                            {cat.seats}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.dropdownItemModels}>{cat.models}</Text>
                    </View>
                    <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                      {isSelected && <View style={styles.radioDot} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Exact Car Model Name Input (Which Car) */}
          <View style={{ marginTop: 12 }}>
            <View style={styles.inputLabelRow}>
              <Text style={styles.inputLabel}>WHICH CAR (MAKE & MODEL NAME):</Text>
              <View style={[styles.badgePill, carModel.trim() ? styles.badgeGreen : styles.badgeAmber]}>
                <Text style={carModel.trim() ? styles.badgeTextGreen : styles.badgeTextAmber}>
                  {carModel.trim() ? '✓ Filled' : 'Required'}
                </Text>
              </View>
            </View>
            <TextInput
              style={styles.textInput}
              value={carModel}
              onChangeText={setCarModel}
              placeholder="e.g. Maruti Suzuki Dzire / Toyota Innova Crysta / Tata Tiago"
              placeholderTextColor="#94a3b8"
            />
          </View>
        </View>

        {/* Fuel Type */}
        <View style={styles.inputCard}>
          <View style={styles.inputLabelRow}>
            <Text style={styles.inputLabel}>FUEL TYPE:</Text>
            <View style={[styles.badgePill, fuelType ? styles.badgeGreen : styles.badgeAmber]}>
              <Text style={fuelType ? styles.badgeTextGreen : styles.badgeTextAmber}>
                {fuelType ? `✓ ${fuelType}` : 'Required'}
              </Text>
            </View>
          </View>
          <Text style={styles.fieldSubHelp}>Select the fuel engine type of your vehicle:</Text>
          <View style={styles.pillsRow}>
            {FUEL_TYPES.map((f) => {
              const isSelected = fuelType === f.id;
              return (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.fuelPill, isSelected && styles.fuelPillSelected]}
                  onPress={() => setFuelType(f.id)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.fuelPillIcon}>{f.icon}</Text>
                  <Text style={[styles.fuelPillLabel, isSelected && styles.fuelPillLabelSelected]}>
                    {f.label}
                  </Text>
                  {isSelected && <Text style={styles.fuelPillCheck}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Carriage Included How Much - DROPDOWN */}
        <View style={styles.inputCard}>
          <View style={styles.inputLabelRow}>
            <Text style={styles.inputLabel}>CARRIAGE / LUGGAGE CAPACITY (HOW MUCH):</Text>
            <View style={[styles.badgePill, carriageCapacity ? styles.badgeGreen : styles.badgeAmber]}>
              <Text style={carriageCapacity ? styles.badgeTextGreen : styles.badgeTextAmber}>
                {carriageCapacity ? '✓ Selected' : 'Required'}
              </Text>
            </View>
          </View>
          <Text style={styles.fieldSubHelp}>Tap to select luggage boot / roof carrier allowance:</Text>

          {/* Dropdown Trigger */}
          <TouchableOpacity
            style={[styles.dropdownTrigger, carriageDropdownOpen && styles.dropdownTriggerOpen]}
            onPress={() => {
              setCarriageDropdownOpen(!carriageDropdownOpen);
              if (categoryDropdownOpen) setCategoryDropdownOpen(false);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.dropdownTriggerIcon}>
              {carriageCapacity?.startsWith('None') ? '🚫' : carriageCapacity?.includes('Roof') ? '🧳' : '👜'}
            </Text>
            <View style={{ flex: 1, paddingHorizontal: 6 }}>
              <Text
                style={[
                  styles.dropdownTriggerTitle,
                  !carriageCapacity && { color: '#94a3b8' },
                ]}
                numberOfLines={1}
              >
                {carriageCapacity || 'Select Luggage / Carriage Allowance'}
              </Text>
              <Text style={styles.dropdownTriggerSub}>
                {carriageCapacity ? 'Boot space or luggage carrier capacity' : 'Tap to select allowance'}
              </Text>
            </View>
            <Ionicons
              name={carriageDropdownOpen ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={carriageDropdownOpen ? '#ea580c' : '#64748b'}
            />
          </TouchableOpacity>

          {/* Dropdown Menu Items */}
          {carriageDropdownOpen && (
            <View style={styles.dropdownMenu}>
              {CARRIAGE_OPTIONS.map((opt, idx) => {
                const isSelected = carriageCapacity === opt;
                const isLast = idx === CARRIAGE_OPTIONS.length - 1;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      styles.dropdownMenuItem,
                      isSelected && styles.dropdownMenuItemSelected,
                      !isLast && styles.dropdownMenuItemBorder,
                    ]}
                    onPress={() => {
                      setCarriageCapacity(opt);
                      setCarriageDropdownOpen(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.dropdownItemIcon}>
                      {opt.startsWith('None') ? '🚫' : opt.includes('Roof') ? '🧳' : '👜'}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.dropdownItemTitle, isSelected && styles.dropdownItemTitleSelected]}>
                        {opt}
                      </Text>
                    </View>
                    <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                      {isSelected && <View style={styles.radioDot} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* ============================================================ */}
        {/* SECTION 2: DRIVER IDENTITY & OFFICIAL KYC DOCUMENTS          */}
        {/* ============================================================ */}
        <View style={[styles.sectionHeaderRow, { marginTop: 12 }]}>
          <Text style={styles.sectionHeaderTitle}>2. DRIVER IDENTITY & KYC DOCUMENTS</Text>
          <Text style={styles.sectionHeaderSub}>Verification</Text>
        </View>

        {/* Driver Profile Photo (Circular 1:1 Avatar) */}
        <View style={styles.docUploadCard}>
          <View style={styles.docCardHeader}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.docCardTitle}>📸 Driver Profile Photo (Selfie / Portrait)</Text>
              <Text style={styles.docCardSubtitle}>1:1 circle crop for your driver ID badge & passenger ride screen</Text>
            </View>
            <View style={[styles.badgePill, profilePhotoUrl ? styles.badgeGreen : styles.badgeAmber]}>
              <Text style={profilePhotoUrl ? styles.badgeTextGreen : styles.badgeTextAmber}>
                {profilePhotoUrl ? '✓ Attached' : '⏳ Pending'}
              </Text>
            </View>
          </View>

          {profilePhotoUrl ? (
            <View style={styles.profileCirclePreviewCard}>
              <View style={styles.profileCircleRing}>
                <Image
                  source={{ uri: profilePhotoUrl }}
                  style={styles.profileCircleImage}
                  resizeMode="cover"
                />
              </View>
              <View style={styles.profileCircleInfo}>
                <Text style={styles.profileCircleTitle}>✓ 1:1 Portrait Attached</Text>
                <Text style={styles.profileCircleSub}>Cropped in circle for passenger & badge display</Text>
                <TouchableOpacity
                  style={styles.changeProfileBtn}
                  onPress={() => handleSelectOptions('profile')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.changeProfileBtnText}>📷 Retake / Change Photo</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.profileUploadPlaceholder}
              onPress={() => handleSelectOptions('profile')}
              activeOpacity={0.8}
            >
              <View style={styles.profilePlaceholderCircle}>
                <Text style={styles.profilePlaceholderEmoji}>🤳</Text>
              </View>
              <Text style={styles.uploadPlaceholderTitle}>Tap to Upload Profile Photo (1:1 Crop)</Text>
              <Text style={styles.uploadPlaceholderSub}>Take camera selfie or choose portrait image</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Driving License Number Input */}
        <View style={styles.inputCard}>
          <View style={styles.inputLabelRow}>
            <Text style={styles.inputLabel}>DRIVING LICENSE NUMBER (DL):</Text>
            <View style={[styles.badgePill, licenseNumber ? styles.badgeGreen : styles.badgeAmber]}>
              <Text style={licenseNumber ? styles.badgeTextGreen : styles.badgeTextAmber}>
                {licenseNumber ? '✓ Filled' : 'Required'}
              </Text>
            </View>
          </View>
          <TextInput
            style={styles.textInput}
            value={licenseNumber}
            onChangeText={setLicenseNumber}
            placeholder="e.g. KA 01 2023 0012345"
            placeholderTextColor="#94a3b8"
            autoCapitalize="characters"
          />
        </View>

        {/* Doc 1: Driving License Photo */}
        <View style={styles.docUploadCard}>
          <View style={styles.docCardHeader}>
            <View>
              <Text style={styles.docCardTitle}>📄 Driving License (DL) Copy</Text>
              <Text style={styles.docCardSubtitle}>Front side photo showing DL number & validity</Text>
            </View>
            <View style={[styles.badgePill, licenseDocUrl ? styles.badgeGreen : styles.badgeAmber]}>
              <Text style={licenseDocUrl ? styles.badgeTextGreen : styles.badgeTextAmber}>
                {licenseDocUrl ? '✓ Attached' : '⏳ Pending'}
              </Text>
            </View>
          </View>

          {licenseDocUrl ? (
            <View style={styles.previewContainer}>
              <Image
                source={{ uri: licenseDocUrl }}
                style={styles.docPreviewImage}
                resizeMode="cover"
              />
              <TouchableOpacity
                style={styles.changePhotoOverlay}
                onPress={() => handleSelectOptions('license')}
                activeOpacity={0.8}
              >
                <Text style={styles.changePhotoText}>📷 Change Photo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.uploadPlaceholder}
              onPress={() => handleSelectOptions('license')}
              activeOpacity={0.8}
            >
              <Text style={styles.uploadPlaceholderIcon}>📷</Text>
              <Text style={styles.uploadPlaceholderTitle}>Tap to Upload Driving License</Text>
              <Text style={styles.uploadPlaceholderSub}>Take camera photo or pick from gallery</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Doc 2: RC Book */}
        <View style={styles.docUploadCard}>
          <View style={styles.docCardHeader}>
            <View>
              <Text style={styles.docCardTitle}>📄 RC Book / Certificate</Text>
              <Text style={styles.docCardSubtitle}>Vehicle Registration certificate with owner & plate</Text>
            </View>
            <View style={[styles.badgePill, rcDocUrl ? styles.badgeGreen : styles.badgeAmber]}>
              <Text style={rcDocUrl ? styles.badgeTextGreen : styles.badgeTextAmber}>
                {rcDocUrl ? '✓ Attached' : '⏳ Pending'}
              </Text>
            </View>
          </View>

          {rcDocUrl ? (
            <View style={styles.previewContainer}>
              <Image
                source={{ uri: rcDocUrl }}
                style={styles.docPreviewImage}
                resizeMode="cover"
              />
              <TouchableOpacity
                style={styles.changePhotoOverlay}
                onPress={() => handleSelectOptions('rc')}
                activeOpacity={0.8}
              >
                <Text style={styles.changePhotoText}>📷 Change Photo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.uploadPlaceholder}
              onPress={() => handleSelectOptions('rc')}
              activeOpacity={0.8}
            >
              <Text style={styles.uploadPlaceholderIcon}>📋</Text>
              <Text style={styles.uploadPlaceholderTitle}>Tap to Upload RC Certificate</Text>
              <Text style={styles.uploadPlaceholderSub}>Take camera photo or pick from gallery</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Doc 3: Vehicle Insurance */}
        <View style={styles.docUploadCard}>
          <View style={styles.docCardHeader}>
            <View>
              <Text style={styles.docCardTitle}>📄 Vehicle Insurance Policy</Text>
              <Text style={styles.docCardSubtitle}>Valid comprehensive or commercial cab insurance</Text>
            </View>
            <View style={[styles.badgePill, insuranceDocUrl ? styles.badgeGreen : styles.badgeAmber]}>
              <Text style={insuranceDocUrl ? styles.badgeTextGreen : styles.badgeTextAmber}>
                {insuranceDocUrl ? '✓ Attached' : '⏳ Pending'}
              </Text>
            </View>
          </View>

          {insuranceDocUrl ? (
            <View style={styles.previewContainer}>
              <Image
                source={{ uri: insuranceDocUrl }}
                style={styles.docPreviewImage}
                resizeMode="cover"
              />
              <TouchableOpacity
                style={styles.changePhotoOverlay}
                onPress={() => handleSelectOptions('insurance')}
                activeOpacity={0.8}
              >
                <Text style={styles.changePhotoText}>📷 Change Photo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.uploadPlaceholder}
              onPress={() => handleSelectOptions('insurance')}
              activeOpacity={0.8}
            >
              <Text style={styles.uploadPlaceholderIcon}>🛡️</Text>
              <Text style={styles.uploadPlaceholderTitle}>Tap to Upload Vehicle Insurance</Text>
              <Text style={styles.uploadPlaceholderSub}>Take camera photo or pick from gallery</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Submit Action */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <>
              <Text style={styles.submitBtnIcon}>🚀</Text>
              <Text style={styles.submitBtnText}>SAVE & SUBMIT TO ADMIN REVIEW</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          Once submitted, your vehicle specifications, license details, carriage capacity, and KYC documents will be reviewed in the Kandy Cabs Admin Panel.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  topNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingRight: 8,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  navTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
  },
  quickFillBtn: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#ea580c',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  quickFillBtnText: {
    color: '#ea580c',
    fontSize: 11,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  noticeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  noticeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  noticeEmoji: {
    fontSize: 32,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
  },
  noticeSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 16,
  },
  adminFeedbackBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#fff1f2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  adminFeedbackTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#e11d48',
  },
  adminFeedbackText: {
    fontSize: 11,
    color: '#be123c',
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#ea580c',
    letterSpacing: 0.5,
  },
  sectionHeaderSub: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  inputCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  inputLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
  },
  fieldSubHelp: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  plateInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#0f172a',
    borderRadius: 8,
    overflow: 'hidden',
  },
  plateIndBadge: {
    backgroundColor: '#1e3a8a',
    paddingHorizontal: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plateIndText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
  },
  plateTextInput: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 1,
  },

  // Dropdown Styles
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownTriggerOpen: {
    borderColor: '#ea580c',
    backgroundColor: '#fff7ed',
  },
  dropdownTriggerIcon: {
    fontSize: 22,
    marginRight: 4,
  },
  dropdownTriggerTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0f172a',
  },
  dropdownTriggerSub: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
  dropdownSeatBadge: {
    backgroundColor: '#ea580c',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dropdownSeatBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
  },
  dropdownMenu: {
    marginTop: 8,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#ea580c',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  dropdownMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    gap: 8,
  },
  dropdownMenuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownMenuItemSelected: {
    backgroundColor: '#fff7ed',
  },
  dropdownItemIcon: {
    fontSize: 18,
  },
  dropdownItemTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  dropdownItemTitleSelected: {
    color: '#ea580c',
    fontWeight: '900',
  },
  dropdownItemModels: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
  dropdownItemSeatPill: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dropdownItemSeatPillSelected: {
    backgroundColor: '#ea580c',
  },
  dropdownItemSeatText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#475569',
  },
  dropdownItemSeatTextSelected: {
    color: '#ffffff',
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: '#ea580c',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ea580c',
  },

  pillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  fuelPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
  },
  fuelPillSelected: {
    borderColor: '#ea580c',
    backgroundColor: '#fff7ed',
    borderWidth: 2,
  },
  fuelPillIcon: {
    fontSize: 14,
  },
  fuelPillLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  fuelPillLabelSelected: {
    color: '#ea580c',
    fontWeight: '900',
  },
  fuelPillCheck: {
    color: '#ea580c',
    fontSize: 11,
    fontWeight: '900',
  },
  docUploadCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  docCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  docCardTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0f172a',
  },
  docCardSubtitle: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeGreen: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  badgeAmber: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  badgeTextGreen: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  badgeTextAmber: {
    fontSize: 10,
    fontWeight: '800',
    color: '#b45309',
  },
  profileCirclePreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff7ed',
    borderWidth: 1.5,
    borderColor: '#fed7aa',
    borderRadius: 16,
    padding: 14,
    gap: 16,
  },
  profileCircleRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    borderColor: '#ea580c',
    backgroundColor: '#0f172a',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ea580c',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 4,
  },
  profileCircleImage: {
    width: '100%',
    height: '100%',
  },
  profileCircleInfo: {
    flex: 1,
  },
  profileCircleTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#9a3412',
  },
  profileCircleSub: {
    fontSize: 10,
    color: '#c2410c',
    marginTop: 2,
    lineHeight: 14,
  },
  changeProfileBtn: {
    backgroundColor: '#ea580c',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  changeProfileBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
  },
  profileUploadPlaceholder: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#ea580c',
    borderRadius: 16,
    backgroundColor: '#fff7ed',
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePlaceholderCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ffedd5',
    borderWidth: 2,
    borderColor: '#fdba74',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  profilePlaceholderEmoji: {
    fontSize: 26,
  },
  previewContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    position: 'relative',
    height: 160,
    backgroundColor: '#0f172a',
  },
  docPreviewImage: {
    width: '100%',
    height: '100%',
  },
  changePhotoOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  changePhotoText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  uploadPlaceholder: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadPlaceholderIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  uploadPlaceholderTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  uploadPlaceholderSub: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  submitBtn: {
    backgroundColor: '#ea580c',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    shadowColor: '#ea580c',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnIcon: {
    fontSize: 16,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  footerNote: {
    fontSize: 10,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 14,
  },
});
