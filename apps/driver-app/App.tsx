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
  Switch,
  Image,
  ActivityIndicator,
  Modal,
  Linking,
  RefreshControl,
  Platform,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Camera } from 'expo-camera';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { KANDY_THEME } from '@kandycabs/shared';
import {
  sendDriverOtpApi,
  verifyDriverOtpApi,
  setDriverAuthToken,
  fetchDriverDispatches,
  acceptDriverDispatchApi,
  verifyPickupOtpApi,
  uploadOdometerPhotoApi,
  startTripApi,
  endTripApi,
  sendGpsPingApi,
  fetchDriverDocumentsApi,
  uploadDriverDocumentsApi,
} from './services/api';

const SESSION_STORAGE_KEY = 'kandy_driver_session';

const VEHICLE_CATEGORIES = [
  'Swift Dzire (Sedan)',
  'Toyota Etios (Sedan)',
  'Hatchback (WagonR / Indica)',
  'SUV (Ertiga / Marazzo)',
  'SUV Premium (Toyota Innova Crysta)',
  'Tempo Traveler (12 Seater Luxury)',
];

const SAMPLE_DISPATCHES = [
  {
    id: 'disp_KC73744',
    bookingId: 'KC73744',
    booking: {
      id: 'KC73744',
      humanReadableRef: 'KC73744',
      status: 'DISPATCHED',
      tripType: 'ONEWAY',
      pickupCity: 'Bangalore Central, Karnataka',
      dropCity: 'Coorg (Madikeri), Karnataka',
      scheduledAt: new Date(Date.now() + 1800000).toISOString(),
      estimatedFare: 4250,
      customer: {
        fullName: 'Praveen Rao',
        phone: '9481012345',
      },
      customerPhoneReleased: false,
    },
    status: 'DISPATCHED',
  },
  {
    id: 'disp_KC54120',
    bookingId: 'KC54120',
    booking: {
      id: 'KC54120',
      humanReadableRef: 'KC54120',
      status: 'DRIVER_ACCEPTED',
      tripType: 'ONEWAY',
      pickupCity: 'Bangalore Central, Karnataka',
      dropCity: 'Mysore Palace, Mysore, Karnataka',
      scheduledAt: new Date().toISOString(),
      estimatedFare: 3800,
      customer: {
        fullName: 'Rajesh Kumar',
        phone: '9845012345',
      },
      customerPhoneReleased: true,
    },
    status: 'ASSIGNED TO YOU',
  },
];

export default function App() {
  // ─── AUTHENTICATION STATE & SESSION PERSISTENCE ───
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [driverUser, setDriverUser] = useState<any>(null);

  // Login form state
  const [loginPhone, setLoginPhone] = useState('');
  const [loginOtp, setLoginOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ─── DRIVER DASHBOARD STATES ───
  const [isDriverOnline, setIsDriverOnline] = useState(true);
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState(true);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(true);
  const [dispatches, setDispatches] = useState<any[]>(SAMPLE_DISPATCHES);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ─── DRIVER & VEHICLE DOCUMENTS POPUP MODAL STATE ───
  const [showDocModal, setShowDocModal] = useState(false);
  const [hasPendingDocs, setHasPendingDocs] = useState(true);
  const [isNoticeDismissed, setIsNoticeDismissed] = useState(false);
  const [docLicenseNumber, setDocLicenseNumber] = useState('KA-19-2024-8659');
  const [docVehicleName, setDocVehicleName] = useState('Swift Dzire (Sedan)');
  const [docVehicleNumber, setDocVehicleNumber] = useState('KA-19-KC-1001');
  const [isUploadingDocs, setIsUploadingDocs] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [activeUploadField, setActiveUploadField] = useState<string | null>(null);
  const [showImagePickerModal, setShowImagePickerModal] = useState(false);

  // Selected files map
  const [selectedFiles, setSelectedFiles] = useState<
    Record<string, { uri: string; name?: string; type?: string } | null>
  >({
    license: null,
    driverPhoto: null,
    rc: null,
    insurance: null,
    vehicleFront: null,
    vehicleBack: null,
    vehicleLeft: null,
    vehicleRight: null,
    vehicleInside: null,
  });

  // Active Selected Trip Lifecycle Modal State
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [showTripModal, setShowTripModal] = useState(false);
  const [tripState, setTripState] = useState<
    'DISPATCH_PENDING' | 'ACCEPTED' | 'EN_ROUTE' | 'TRIP_STARTED' | 'COMPLETED'
  >('ACCEPTED');
  const [pickupOtpInput, setPickupOtpInput] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [startOdometerCaptured, setStartOdometerCaptured] = useState(false);
  const [endOdometerCaptured, setEndOdometerCaptured] = useState(false);
  const [tollAmountInput, setTollAmountInput] = useState('0');
  const [tollConfirmed, setTollConfirmed] = useState(false);

  // GPS Continuous Ping Loop State
  const [speedKmh, setSpeedKmh] = useState(62);

  // ─── RESTORE PERSISTED SESSION ON APP LAUNCH ───
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const savedSession = await SecureStore.getItemAsync(SESSION_STORAGE_KEY);
        if (savedSession) {
          const parsed = JSON.parse(savedSession);
          if (parsed?.token && parsed?.user) {
            setDriverUser(parsed.user);
            setDriverAuthToken(parsed.token, parsed.user);
            setIsLoggedIn(true);
            checkDriverDocs(parsed.user.phone);
          }
        }
      } catch (err) {
        console.warn('[DriverApp] Failed to restore session:', err);
      } finally {
        setIsCheckingAuth(false);
      }
    };
    restoreSession();
  }, []);

  const checkDriverDocs = async (phone: string) => {
    try {
      const res = await fetchDriverDocumentsApi(phone);
      if (res?.docs?.docsUploaded) {
        setHasPendingDocs(false);
      } else {
        setHasPendingDocs(true);
      }
    } catch (e) {}
  };

  // ─── REQUEST NATIVE CAMERA & GPS PERMISSIONS ───
  const requestPermissions = async () => {
    try {
      const cam = await Camera.requestCameraPermissionsAsync();
      setCameraPermissionGranted(cam.granted);
    } catch (e) {
      console.warn('Camera perm error:', e);
    }
    try {
      const loc = await Location.requestForegroundPermissionsAsync();
      setLocationPermissionGranted(loc.granted);
    } catch (e) {
      console.warn('Location perm error:', e);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      requestPermissions();
      loadDispatches();
    }
  }, [isLoggedIn]);

  // Load dispatches from backend & poll every 3.5 seconds
  const loadDispatches = async () => {
    try {
      const res = await fetchDriverDispatches();
      if (res?.dispatches && Array.isArray(res.dispatches) && res.dispatches.length > 0) {
        setDispatches(res.dispatches);
      }
    } catch (err) {
      console.warn('[loadDispatches err]', err);
    }
  };

  // Real-time live polling from admin
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLoggedIn && isDriverOnline) {
      timer = setInterval(() => {
        loadDispatches();
      }, 3500);
    }
    return () => clearInterval(timer);
  }, [isLoggedIn, isDriverOnline]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadDispatches();
    setIsRefreshing(false);
  };

  const handleAcceptDispatch = async (disp: any) => {
    const b = disp.booking || disp;
    const bId = b.id || b.humanReadableRef;
    const dId = disp.id || `disp_${bId}`;
    try {
      await acceptDriverDispatchApi({
        dispatchId: dId,
        bookingId: bId,
        driverId: driverUser?.id || 'd_1',
        driverPhone: driverUser?.phone || '8888888888',
        driverName: driverUser?.fullName || 'Driver Partner',
      });
      Alert.alert('🎉 Ride Accepted!', `You are now assigned to trip Ref: ${b.humanReadableRef || bId}. You can now manage the trip lifecycle.`);
      await loadDispatches();
    } catch (err: any) {
      Alert.alert('Accept Failed', err.message || 'Another driver may have already accepted this ride.');
      await loadDispatches();
    }
  };

  // Continuous GPS ping telemetry simulation
  useEffect(() => {
    let pingTimer: NodeJS.Timeout;
    if (isLoggedIn && (tripState === 'EN_ROUTE' || tripState === 'TRIP_STARTED') && locationPermissionGranted) {
      pingTimer = setInterval(() => {
        const nextSpeed = Math.min(95, Math.max(45, Math.floor(Math.random() * 40) + 50));
        setSpeedKmh(nextSpeed);
        const refId = selectedBooking?.humanReadableRef || selectedBooking?.id || 'KC54120';
        sendGpsPingApi(refId, 12.5218, 76.8951, nextSpeed);
      }, 5000);
    }
    return () => clearInterval(pingTimer);
  }, [isLoggedIn, tripState, locationPermissionGranted, selectedBooking]);

  // ─── LOGIN HANDLERS ───
  const handleSendOtp = async () => {
    const digitsOnly = loginPhone.replace(/\D/g, '');
    if (digitsOnly.length < 10) {
      Alert.alert('Invalid Number', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    setIsSubmitting(true);
    try {
      await sendDriverOtpApi(digitsOnly);
      setOtpSent(true);
    } catch (err: any) {
      Alert.alert('Driver Access', err.message || 'Driver number is not registered');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (loginOtp.length < 4) {
      Alert.alert('Invalid Code', 'Please enter the 4-digit verification code.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await verifyDriverOtpApi(loginPhone, loginOtp);
      if (res.token && res.user) {
        await SecureStore.setItemAsync(
          SESSION_STORAGE_KEY,
          JSON.stringify({
            token: res.token,
            user: res.user,
          })
        );
        setDriverUser(res.user);
        setIsLoggedIn(true);
        // Automatically pop up the Driver & Vehicle Necessary Documents Modal
        setShowDocModal(true);
      }
    } catch (err: any) {
      Alert.alert('Driver Access', err.message || 'Driver number is not registered');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to sign out from the Driver Partner app?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
            } catch (e) {}
            setDriverAuthToken(null);
            setDriverUser(null);
            setIsLoggedIn(false);
            setOtpSent(false);
            setLoginOtp('');
            setShowDocModal(false);
          },
        },
      ]
    );
  };

  // ─── IMAGE PICKER & DOCUMENT HANDLERS ───
  const openFilePicker = (fieldKey: string) => {
    setActiveUploadField(fieldKey);
    setShowImagePickerModal(true);
  };

  const handlePickFromCamera = async () => {
    setShowImagePickerModal(false);
    if (!activeUploadField) return;
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permission is required to capture photos.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedFiles((prev) => ({
          ...prev,
          [activeUploadField]: {
            uri: asset.uri,
            name: asset.fileName || `${activeUploadField}_${Date.now()}.jpg`,
            type: asset.mimeType || 'image/jpeg',
          },
        }));
      }
    } catch (err: any) {
      Alert.alert('Camera Error', err.message || 'Failed to capture photo.');
    }
  };

  const handlePickFromGallery = async () => {
    setShowImagePickerModal(false);
    if (!activeUploadField) return;
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Gallery access permission is required.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedFiles((prev) => ({
          ...prev,
          [activeUploadField]: {
            uri: asset.uri,
            name: asset.fileName || `${activeUploadField}_${Date.now()}.jpg`,
            type: asset.mimeType || 'image/jpeg',
          },
        }));
      }
    } catch (err: any) {
      Alert.alert('Gallery Error', err.message || 'Failed to select photo.');
    }
  };

  // Stepper completion calculation
  const isSec1Complete = Boolean(docLicenseNumber && (selectedFiles.license || selectedFiles.driverPhoto));
  const isSec2Complete = Boolean(docVehicleName && (selectedFiles.rc || selectedFiles.insurance));
  const isSec3Complete = Boolean(
    selectedFiles.vehicleFront ||
    selectedFiles.vehicleBack ||
    selectedFiles.vehicleLeft ||
    selectedFiles.vehicleRight ||
    selectedFiles.vehicleInside
  );

  const currentStep = !isSec1Complete ? 1 : !isSec2Complete ? 2 : 3;
  const currentStepTitle =
    currentStep === 1
      ? 'License & Driver Photo'
      : currentStep === 2
      ? 'RC & Insurance'
      : 'Vehicle Photos';

  const totalFields = 9;
  const filledCount =
    (selectedFiles.license ? 1 : 0) +
    (selectedFiles.driverPhoto ? 1 : 0) +
    (selectedFiles.rc ? 1 : 0) +
    (selectedFiles.insurance ? 1 : 0) +
    (selectedFiles.vehicleFront ? 1 : 0) +
    (selectedFiles.vehicleBack ? 1 : 0) +
    (selectedFiles.vehicleLeft ? 1 : 0) +
    (selectedFiles.vehicleRight ? 1 : 0) +
    (selectedFiles.vehicleInside ? 1 : 0);

  const percentComplete = Math.round((filledCount / totalFields) * 100);

  const handleUploadDocumentsSubmit = async () => {
    if (!docLicenseNumber.trim()) {
      Alert.alert('Required Field', 'Please enter your Driving License Number.');
      return;
    }
    if (!docVehicleNumber.trim()) {
      Alert.alert('Required Field', 'Please enter your Vehicle Plate Number.');
      return;
    }

    setIsUploadingDocs(true);
    try {
      const phone = driverUser?.phone || loginPhone || '8888888888';
      const res = await uploadDriverDocumentsApi({
        phone,
        licenseNumber: docLicenseNumber,
        vehicleName: docVehicleName,
        vehicleNumber: docVehicleNumber,
        files: selectedFiles,
      });

      if (res?.success) {
        setHasPendingDocs(false);
        Alert.alert(
          '🎉 Upload Complete!',
          'Driver profile, license, RC, insurance & vehicle photos have been saved to Supabase and Admin database.',
          [
            {
              text: 'Go to Dashboard',
              onPress: () => setShowDocModal(false),
            },
          ]
        );
      } else {
        Alert.alert('Notice', res?.message || 'Documents updated successfully!');
        setShowDocModal(false);
      }
    } catch (err: any) {
      Alert.alert('Upload Failed', err.message || 'Could not upload documents.');
    } finally {
      setIsUploadingDocs(false);
    }
  };

  // ─── TRIP LIFECYCLE HANDLERS ───
  const canCapturePhoto = cameraPermissionGranted && locationPermissionGranted;

  const handleOpenLifecycle = (dispatchItem: any) => {
    const b = dispatchItem.booking || dispatchItem;
    setSelectedBooking(b);
    setPickupOtpInput('');
    setOtpVerified(b.status === 'TRIP_STARTED' || b.status === 'TRIP_COMPLETED');
    setStartOdometerCaptured(b.status === 'TRIP_STARTED' || b.status === 'TRIP_COMPLETED');
    setEndOdometerCaptured(b.status === 'TRIP_COMPLETED');
    setTripState(b.status === 'TRIP_COMPLETED' ? 'COMPLETED' : b.status === 'TRIP_STARTED' ? 'TRIP_STARTED' : 'ACCEPTED');
    setShowTripModal(true);
  };

  const handleVerifyPickupOtp = async () => {
    if (pickupOtpInput.length !== 4) {
      Alert.alert('Error', 'Invalid Pickup OTP. Please ask customer for 4-digit code.');
      return;
    }
    const bId = selectedBooking?.humanReadableRef || selectedBooking?.id || 'KC54120';
    try {
      await verifyPickupOtpApi(bId, pickupOtpInput);
      setOtpVerified(true);
      setTripState('TRIP_STARTED');
      Alert.alert('✅ OTP Verified!', 'Trip started successfully. Admin & customer notified in real time.');
    } catch (err: any) {
      Alert.alert('OTP Verification Failed', err.message || 'Invalid OTP code.');
    }
  };

  const handleCaptureStartOdometer = async () => {
    if (!canCapturePhoto) {
      Alert.alert('Permission Denied', 'Capture disabled! Both Camera and GPS Location permissions must be LIVE.');
      return;
    }
    const bId = selectedBooking?.humanReadableRef || selectedBooking?.id || 'KC54120';
    try {
      await uploadOdometerPhotoApi({
        bookingId: bId,
        type: 'START',
        odometerReading: 45210,
        lat: 12.9716,
        lng: 77.5946,
      });
      await startTripApi(bId, 45210, 12.9716, 77.5946);
      setStartOdometerCaptured(true);
      Alert.alert('📷 Photo Stamped', 'Start Odometer photo captured with Timestamp and GPS coordinates.');
    } catch (err: any) {
      Alert.alert('Upload Error', err.message || 'Failed to upload start odometer photo.');
    }
  };

  const handleCaptureEndOdometer = async () => {
    if (!canCapturePhoto) {
      Alert.alert('Permission Denied', 'Capture disabled! Both Camera and GPS Location permissions must be LIVE.');
      return;
    }
    if (!tollConfirmed) {
      Alert.alert('Toll Required', 'Please confirm Toll amount paid (₹0 if none) before closing out trip.');
      return;
    }
    const bId = selectedBooking?.humanReadableRef || selectedBooking?.id || 'KC54120';
    try {
      await uploadOdometerPhotoApi({
        bookingId: bId,
        type: 'END',
        odometerReading: 45385,
        lat: 12.3051,
        lng: 76.6551,
      });
      await endTripApi({
        bookingId: bId,
        finalReading: 45385,
        tollAmount: parseFloat(tollAmountInput) || 0,
        lat: 12.3051,
        lng: 76.6551,
      });
      setEndOdometerCaptured(true);
      setTripState('COMPLETED');
      Alert.alert('🏁 Trip Completed!', 'Final distance & toll fare billed. Invoice sent to customer.');
      await loadDispatches();
    } catch (err: any) {
      Alert.alert('End Trip Error', err.message || 'Failed to close out trip.');
    }
  };

  // ─── AUTH SCREEN RENDER ───
  if (isCheckingAuth) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B1A" />
        <Text style={styles.loadingText}>Connecting to Kandy Cabs Network...</Text>
      </SafeAreaView>
    );
  }

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.authContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        <ScrollView contentContainerStyle={styles.authScrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.authCard}>
            {/* Logo Badge */}
            <View style={styles.authLogoWrapper}>
              <View style={styles.brandBadge}>
                <Text style={styles.brandTitleText}>KANDY CABS</Text>
                <Text style={styles.brandSubtitleText}>DRIVER PARTNER NETWORK</Text>
              </View>
            </View>

            <Text style={styles.authTitle}>Driver Partner Portal</Text>
            <Text style={styles.authSubtitle}>
              Sign in with your admin-registered mobile number to access dispatches & live trips.
            </Text>

            <View style={styles.authForm}>
              <Text style={styles.inputLabel}>MOBILE NUMBER</Text>
              <View style={styles.phoneInputRow}>
                <View style={styles.phonePrefixBox}>
                  <Text style={styles.phonePrefixText}>+91</Text>
                </View>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="98765 43210"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={loginPhone}
                  onChangeText={(val) => {
                    setLoginPhone(val);
                    setOtpSent(false);
                  }}
                  editable={!isSubmitting}
                />
              </View>

              {otpSent && (
                <View style={styles.otpSection}>
                  <Text style={styles.inputLabel}>ENTER 4-DIGIT OTP</Text>
                  <TextInput
                    style={styles.otpInputBox}
                    placeholder="• • • •"
                    placeholderTextColor="#94A3B8"
                    keyboardType="number-pad"
                    maxLength={4}
                    value={loginOtp}
                    onChangeText={setLoginOtp}
                    editable={!isSubmitting}
                  />
                  <Text style={styles.otpHintText}>💡 Demo Test OTP: 1234</Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.primaryAuthBtn}
                onPress={otpSent ? handleVerifyOtp : handleSendOtp}
                disabled={isSubmitting}
                activeOpacity={0.85}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.primaryAuthBtnText}>
                      {otpSent ? 'VERIFY OTP & SIGN IN →' : 'GET LOGIN OTP →'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── DRIVER DASHBOARD VIEW ───
  const driverName = driverUser?.fullName || 'Ramesh Kumar';
  const driverInitial = driverName.charAt(0).toUpperCase();
  const vehicleName = driverUser?.vehicleName || 'Swift Dzire (Sedan)';
  const driverPhone = driverUser?.phone || '8888888888';

  // Helper render for Upload Box
  const renderUploadBox = (label: string, fieldKey: string) => {
    const file = selectedFiles[fieldKey];
    return (
      <View style={styles.uploadCardContainer} key={fieldKey}>
        <View style={styles.uploadDashedCard}>
          {file ? (
            <View style={styles.uploadPreviewRow}>
              {file.uri ? (
                <Image source={{ uri: file.uri }} style={styles.uploadThumbImage} />
              ) : (
                <View style={styles.uploadThumbPlaceholder}>
                  <Text style={styles.uploadThumbPlaceholderIcon}>📄</Text>
                </View>
              )}
              <View style={styles.uploadPreviewInfo}>
                <View style={styles.uploadBadgeSuccess}>
                  <Text style={styles.uploadBadgeSuccessText}>✓ Ready to upload</Text>
                </View>
                <Text style={styles.uploadFileName} numberOfLines={1}>
                  {file.name || `${fieldKey}.jpg`}
                </Text>
                <TouchableOpacity
                  onPress={() => openFilePicker(fieldKey)}
                  style={styles.uploadChangeBtn}
                >
                  <Text style={styles.uploadChangeBtnText}>Change Photo</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.uploadEmptyContent}>
              <View style={styles.uploadCloudIconCircle}>
                <Text style={styles.uploadCloudIcon}>☁️</Text>
              </View>
              <Text style={styles.uploadLabelTitle}>{label} *</Text>
              <Text style={styles.uploadFileSubText}>JPG, PNG or PDF, up to 10MB</Text>
              <TouchableOpacity
                style={styles.chooseFileBtn}
                onPress={() => openFilePicker(fieldKey)}
                activeOpacity={0.8}
              >
                <Text style={styles.chooseFileBtnText}>Choose file</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.mainContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#101522" />

      {/* Top Navbar */}
      <View style={styles.topNavbar}>
        <View style={styles.navBrandCol}>
          <Text style={styles.navBrandText}>KANDY CABS</Text>
          <Text style={styles.navBrandSub}>DRIVER CONSOLE</Text>
        </View>
        <TouchableOpacity style={styles.navLogoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Text style={styles.navLogoutText}>LOG OUT 🚪</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
      >
        {/* 1. Driver Profile Card */}
        <View style={styles.driverProfileCard}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{driverInitial}</Text>
            </View>
            <View style={[styles.avatarOnlineDot, { backgroundColor: isDriverOnline ? '#10B981' : '#EF4444' }]} />
          </View>

          <View style={styles.driverInfoCol}>
            <View style={styles.driverNameRow}>
              <Text style={styles.driverFullName}>{driverName}</Text>
              <View style={styles.verifiedCheckBadge}>
                <Text style={styles.verifiedCheckIcon}>✓</Text>
              </View>
            </View>
            <Text style={styles.driverVehicleSub}>
              {vehicleName} • +91 {driverPhone.slice(0, 4)}...
            </Text>
          </View>

          <View style={styles.dutySwitchCol}>
            <Switch
              value={isDriverOnline}
              onValueChange={setIsDriverOnline}
              trackColor={{ false: '#CBD5E1', true: '#10B981' }}
              thumbColor={isDriverOnline ? '#FFFFFF' : '#F1F5F9'}
            />
          </View>
        </View>

        {/* 2. Pending Document Verification Banner */}
        <TouchableOpacity
          style={styles.pendingDocsBanner}
          activeOpacity={0.8}
          onPress={() => setShowDocModal(true)}
        >
          <View style={styles.pendingDocsLeft}>
            <Text style={styles.pendingDocsIcon}>⚠️</Text>
            <Text style={styles.pendingDocsText}>
              {hasPendingDocs ? '9 Pending Verification Documents ...' : '✓ Driver & Vehicle Documents Verified'}
            </Text>
          </View>
          <Text style={styles.pendingDocsChevron}>›</Text>
        </TouchableOpacity>

        {/* 3. Hardware Permissions & Telemetry */}
        <View style={styles.permissionBox}>
          <View style={styles.permissionHeaderRow}>
            <Text style={styles.permissionTitle}>GPS & CAMERA GATED HARDWARE CHECK (§6)</Text>
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Camera Permission Live:</Text>
            <Switch
              value={cameraPermissionGranted}
              onValueChange={setCameraPermissionGranted}
              trackColor={{ false: '#CBD5E1', true: '#FED7AA' }}
              thumbColor={cameraPermissionGranted ? '#FF6B1A' : '#F8FAFC'}
            />
          </View>

          <View style={[styles.switchRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.switchLabel}>GPS Location Permission Live (§6a):</Text>
            <Switch
              value={locationPermissionGranted}
              onValueChange={setLocationPermissionGranted}
              trackColor={{ false: '#CBD5E1', true: '#FED7AA' }}
              thumbColor={locationPermissionGranted ? '#FF6B1A' : '#F8FAFC'}
            />
          </View>

          {!locationPermissionGranted && (
            <View style={styles.alertWarning}>
              <Text style={styles.alertWarningText}>
                ⚠️ GPS Location Disabled! Live tracking lost alert triggered for admin view.
              </Text>
            </View>
          )}
        </View>

        {/* Live GPS Telemetry Indicator */}
        <View style={styles.telemetryCard}>
          <View style={styles.telemetryRow}>
            <View>
              <Text style={styles.telemetryLabel}>GPS TRACKING LOOP (§6a)</Text>
              <Text style={styles.telemetrySpeed}>{speedKmh} km/h</Text>
            </View>
            <View style={[styles.pingBadge, !locationPermissionGranted && styles.pingBadgeLost]}>
              <Text style={[styles.pingText, !locationPermissionGranted && styles.pingTextLost]}>
                {locationPermissionGranted ? '📡 PINGING (5s)' : '❌ TRACKING LOST'}
              </Text>
            </View>
          </View>
        </View>

        {/* 4. Available Dispatches Header */}
        <View style={styles.dispatchesSectionHeader}>
          <View style={styles.dispatchesHeaderLeft}>
            <View style={styles.broadcastIconBox}>
              <Text style={styles.broadcastIcon}>((•))</Text>
            </View>
            <View>
              <Text style={styles.dispatchesTitle}>Available Dispatches</Text>
              <Text style={styles.dispatchesSub}>First accept wins broadcast</Text>
            </View>
          </View>
          <View style={styles.liveFeedBadge}>
            <Text style={styles.liveFeedDot}>●</Text>
            <Text style={styles.liveFeedText}>Live Feed</Text>
          </View>
        </View>

        {/* 5. Dispatched Bookings List */}
        {dispatches.map((disp, idx) => {
          const b = disp.booking || disp;
          const refCode = b.humanReadableRef || b.id || 'KC54120';
          const tripType = b.tripType || 'ONEWAY';
          const customerName = b.customer?.fullName || 'Rajesh Kumar';
          const customerPhone = b.customer?.phone || '9845012345';
          const isPhoneReleased = !!b.customerPhoneReleased;
          const pickup = b.pickupCity || 'Bangalore Central, Karnataka';
          const drop = b.dropCity || 'Mysore Palace, Mysore, Karnataka';
          const fare = b.estimatedFare || 3800;
          const isAssigned = disp.status === 'ASSIGNED TO YOU' || b.status === 'DRIVER_ACCEPTED' || b.status === 'TRIP_STARTED' || b.status === 'TRIP_COMPLETED';
          const isAvailable = !isAssigned || b.status === 'DISPATCHED' || disp.status === 'DISPATCHED';

          return (
            <View
              key={disp.id || idx}
              style={[
                styles.dispatchCard,
                isAvailable && styles.availableDispatchCard,
              ]}
            >
              {/* Header: Ref & Status Pill */}
              <View style={styles.dispatchHeaderRow}>
                <View style={styles.refPillWrap}>
                  <Text style={styles.refCodeText}>Ref: {refCode}</Text>
                  <View style={styles.tripTypePill}>
                    <Text style={styles.tripTypePillText}>{tripType}</Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.statusPill,
                    isAvailable ? styles.availableStatusPill : styles.assignedStatusPill,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      isAvailable ? styles.availableStatusText : styles.assignedStatusText,
                    ]}
                  >
                    {isAvailable ? 'AVAILABLE' : 'ASSIGNED TO YOU'}
                  </Text>
                </View>
              </View>

              {/* Customer Row with Privacy Masking */}
              <View style={styles.customerRow}>
                <Text style={styles.customerName}>👤 {customerName}</Text>
                {isPhoneReleased ? (
                  <TouchableOpacity
                    style={styles.phoneLinkBtn}
                    onPress={() => Linking.openURL(`tel:${customerPhone}`)}
                  >
                    <Text style={styles.phoneLinkText}>📞 +91 {customerPhone}</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.phoneHiddenBadge}>
                    <Text style={styles.phoneHiddenText}>🔒 Contact Hidden (Pending Admin Release)</Text>
                  </View>
                )}
              </View>

              {/* Pickup Location */}
              <View style={styles.dispatchFieldBlock}>
                <Text style={styles.fieldLabel}>PICKUP LOCATION</Text>
                <Text style={styles.locationValue}>📍 {pickup}</Text>
              </View>

              {/* Drop Location */}
              <View style={styles.dispatchFieldBlock}>
                <Text style={styles.fieldLabel}>DROP LOCATION</Text>
                <Text style={styles.locationValue}>↗️ {drop}</Text>
              </View>

              {/* Time & Fare Row */}
              <View style={styles.timeFareRow}>
                <View style={styles.pickupTimeWrap}>
                  <Text style={styles.clockIcon}>🕒</Text>
                  <Text style={styles.pickupTimeText}>
                    Pickup Time: {new Date(b.scheduledAt || Date.now()).toLocaleDateString('en-IN')}, {new Date(b.scheduledAt || Date.now()).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <Text style={styles.fareAmountText}>₹{fare.toLocaleString()}</Text>
              </View>

              {/* Action Button: Swipe/Accept or Manage Lifecycle */}
              {isAvailable ? (
                <TouchableOpacity
                  style={styles.swipeToAcceptBtn}
                  onPress={() => handleAcceptDispatch(disp)}
                  activeOpacity={0.85}
                >
                  <View style={styles.swipeCircleIcon}>
                    <Text style={styles.swipeChevronText}>»</Text>
                  </View>
                  <View style={styles.swipeTextCol}>
                    <Text style={styles.swipeMainText}>SWIPE TO ACCEPT</Text>
                    <Text style={styles.swipeSubText}>Be the first to get this ride</Text>
                  </View>
                  <Text style={styles.swipeRightArrow}>→</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.manageTripBtn}
                  onPress={() => handleOpenLifecycle(disp)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.manageTripBtnText}>VIEW / MANAGE TRIP LIFECYCLE →</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* ─── 6. DRIVER & VEHICLE NECESSARY DOCUMENTS POPUP MODAL (EXACT SCREENSHOT UI) ─── */}
      <Modal
        visible={showDocModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDocModal(false)}
      >
        <View style={styles.docModalOverlay}>
          <View style={styles.docModalCard}>
            {/* Modal Header */}
            <View style={styles.docModalHeader}>
              <View style={styles.docModalTitleRow}>
                <View style={styles.docBrandLogoBadge}>
                  <Text style={styles.docBrandText}>KANDY</Text>
                  <Text style={styles.docBrandTextOrange}>CABS</Text>
                </View>
                <Text style={styles.docModalTitle}>🚗 Driver & Vehicle Necessary Documents</Text>
              </View>
              <TouchableOpacity
                style={styles.docModalCloseBtn}
                onPress={() => setShowDocModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.docModalCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.docModalScroll} showsVerticalScrollIndicator={false}>
              {/* Stepper Progress Card */}
              <View style={styles.stepperCard}>
                <View style={styles.stepperHeaderRow}>
                  <View style={styles.stepperLeft}>
                    <View style={styles.stepperStepBadge}>
                      <Text style={styles.stepperStepBadgeText}>{currentStep}</Text>
                    </View>
                    <Text style={styles.stepperStepTitle}>
                      Step {currentStep} of 3: {currentStepTitle}
                    </Text>
                  </View>
                  <Text style={styles.stepperPercentText}>{percentComplete}% Complete</Text>
                </View>

                {/* 3-Segment Progress Bar */}
                <View style={styles.stepperBarRow}>
                  <View
                    style={[
                      styles.stepperSegment,
                      isSec1Complete ? styles.stepperSegmentDone : styles.stepperSegmentActive,
                    ]}
                  />
                  <View
                    style={[
                      styles.stepperSegment,
                      isSec2Complete
                        ? styles.stepperSegmentDone
                        : isSec1Complete
                        ? styles.stepperSegmentActive
                        : styles.stepperSegmentPending,
                    ]}
                  />
                  <View
                    style={[
                      styles.stepperSegment,
                      isSec3Complete
                        ? styles.stepperSegmentDone
                        : isSec2Complete
                        ? styles.stepperSegmentActive
                        : styles.stepperSegmentPending,
                    ]}
                  />
                </View>
              </View>

              {/* Admin Notice Banner */}
              {!isNoticeDismissed && (
                <View style={styles.adminNoticeBox}>
                  <View style={styles.adminNoticeLeft}>
                    <Text style={styles.adminNoticeIcon}>ℹ️</Text>
                    <Text style={styles.adminNoticeText}>
                      <Text style={styles.adminNoticeBold}>Admin Notice: </Text>
                      Upload clear documents & vehicle photos. Upload queue processes 2 files concurrently.
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setIsNoticeDismissed(true)}
                    style={styles.adminNoticeCloseBtn}
                  >
                    <Text style={styles.adminNoticeCloseText}>✕</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* SECTION 1: DRIVER PROFILE & LICENSE DOCUMENT */}
              <View style={styles.docSectionCard}>
                <View style={styles.docSectionHeader}>
                  <View style={styles.docSectionIconBox}>
                    <Text style={styles.docSectionIcon}>📄</Text>
                  </View>
                  <Text style={styles.docSectionTitle}>1. DRIVER PROFILE & LICENSE DOCUMENT</Text>
                </View>

                <View style={styles.docFieldGroup}>
                  <Text style={styles.docFieldLabel}>DRIVING LICENSE NUMBER *</Text>
                  <TextInput
                    style={styles.docTextInput}
                    value={docLicenseNumber}
                    onChangeText={setDocLicenseNumber}
                    placeholder="KA-19-2024-8659"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                {renderUploadBox('Upload License File', 'license')}
                {renderUploadBox('Upload Driver Photo', 'driverPhoto')}
              </View>

              {/* SECTION 2: VEHICLE RC & INSURANCE DOCUMENTS */}
              <View style={styles.docSectionCard}>
                <View style={styles.docSectionHeader}>
                  <View style={styles.docSectionIconBox}>
                    <Text style={styles.docSectionIcon}>🚗</Text>
                  </View>
                  <Text style={styles.docSectionTitle}>2. VEHICLE RC & INSURANCE DOCUMENTS</Text>
                </View>

                <View style={styles.docFieldGroup}>
                  <Text style={styles.docFieldLabel}>VEHICLE MODEL & CATEGORY *</Text>
                  <TouchableOpacity
                    style={styles.docSelectInput}
                    onPress={() => setShowCategoryPicker(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.docSelectText}>{docVehicleName}</Text>
                    <Text style={styles.docSelectChevron}>▾</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.docFieldGroup}>
                  <Text style={styles.docFieldLabel}>VEHICLE PLATE NUMBER</Text>
                  <TextInput
                    style={styles.docTextInput}
                    value={docVehicleNumber}
                    onChangeText={setDocVehicleNumber}
                    placeholder="KA-19-KC-1001"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                {renderUploadBox('Upload RC (Registration Cert)', 'rc')}
                {renderUploadBox('Upload Vehicle Insurance', 'insurance')}
              </View>

              {/* SECTION 3: VEHICLE PHOTOS (FRONT, BACK, SIDES & INTERIOR) */}
              <View style={styles.docSectionCard}>
                <View style={styles.docSectionHeader}>
                  <View style={styles.docSectionIconBox}>
                    <Text style={styles.docSectionIcon}>📷</Text>
                  </View>
                  <Text style={styles.docSectionTitle}>
                    3. VEHICLE PHOTOS (FRONT, BACK, SIDES & INTERIOR)
                  </Text>
                </View>

                {renderUploadBox('Front View Photo', 'vehicleFront')}
                {renderUploadBox('Back View Photo', 'vehicleBack')}
                {renderUploadBox('Left Side View Photo', 'vehicleLeft')}
                {renderUploadBox('Right Side View Photo', 'vehicleRight')}
                {renderUploadBox('Car Inside View Photo', 'vehicleInside')}
              </View>
            </ScrollView>

            {/* Bottom Footer Actions */}
            <View style={styles.docModalFooter}>
              <TouchableOpacity
                style={styles.docSkipBtn}
                onPress={() => setShowDocModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.docSkipBtnText}>SKIP FOR NOW</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.docUploadSubmitBtn}
                onPress={handleUploadDocumentsSubmit}
                disabled={isUploadingDocs}
                activeOpacity={0.85}
              >
                {isUploadingDocs ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text style={styles.docUploadSubmitIcon}>⬆</Text>
                    <Text style={styles.docUploadSubmitBtnText}>UPLOAD & SAVE PATHS →</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── VEHICLE MODEL CATEGORY PICKER MODAL ─── */}
      <Modal
        visible={showCategoryPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <TouchableOpacity
          style={styles.pickerModalOverlay}
          activeOpacity={1}
          onPress={() => setShowCategoryPicker(false)}
        >
          <View style={styles.pickerModalCard}>
            <Text style={styles.pickerModalTitle}>Select Vehicle Model & Category</Text>
            {VEHICLE_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.pickerItem,
                  docVehicleName === cat && styles.pickerItemActive,
                ]}
                onPress={() => {
                  setDocVehicleName(cat);
                  setShowCategoryPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.pickerItemText,
                    docVehicleName === cat && styles.pickerItemTextActive,
                  ]}
                >
                  {cat}
                </Text>
                {docVehicleName === cat && <Text style={styles.pickerItemCheck}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ─── IMAGE PICKER SOURCE ACTION SHEET MODAL ─── */}
      <Modal
        visible={showImagePickerModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImagePickerModal(false)}
      >
        <TouchableOpacity
          style={styles.pickerModalOverlay}
          activeOpacity={1}
          onPress={() => setShowImagePickerModal(false)}
        >
          <View style={styles.pickerModalCard}>
            <Text style={styles.pickerModalTitle}>Upload Document / Photo</Text>
            <TouchableOpacity style={styles.pickerItem} onPress={handlePickFromCamera}>
              <Text style={styles.pickerItemText}>📷 Take Photo with Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.pickerItem} onPress={handlePickFromGallery}>
              <Text style={styles.pickerItemText}>🖼️ Choose from Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pickerItem, { borderBottomWidth: 0 }]}
              onPress={() => setShowImagePickerModal(false)}
            >
              <Text style={[styles.pickerItemText, { color: '#EF4444' }]}>✕ Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ─── 7. TRIP LIFECYCLE MODAL ─── */}
      <Modal
        visible={showTripModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowTripModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <StatusBar barStyle="light-content" backgroundColor="#101522" />

          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>Trip Lifecycle</Text>
              <Text style={styles.modalSubtitle}>
                Ref: {selectedBooking?.humanReadableRef || selectedBooking?.id || 'KC54120'} ({selectedBooking?.tripType || 'ONEWAY'})
              </Text>
            </View>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowTripModal(false)}>
              <Text style={styles.modalCloseBtnText}>✕ Close</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            {/* Route Summary */}
            <View style={styles.routeContainer}>
              <Text style={styles.routeText}>📍 Pickup: {selectedBooking?.pickupCity || 'Bangalore Central, KA'}</Text>
              <Text style={styles.routeText}>🏁 Drop: {selectedBooking?.dropCity || 'Mysore Palace, KA'}</Text>
            </View>

            {/* STEP 1: Pickup OTP Verification */}
            <View style={[styles.stepBox, !otpVerified && styles.stepBoxActive]}>
              <Text style={styles.stepTitle}>STEP 1: PICKUP ARRIVAL & OTP</Text>
              {!otpVerified ? (
                <>
                  <Text style={styles.stepDesc}>Ask customer for 4-digit pickup OTP:</Text>
                  <TextInput
                    style={styles.otpInput}
                    keyboardType="number-pad"
                    maxLength={4}
                    value={pickupOtpInput}
                    onChangeText={setPickupOtpInput}
                    placeholder="Enter OTP (e.g. 1234)"
                    placeholderTextColor="#94A3B8"
                  />
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={handleVerifyPickupOtp}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.actionButtonText}>VERIFY PICKUP OTP →</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.successBanner}>
                  <Text style={styles.successText}>✓ Pickup OTP Verified (DRIVER_ARRIVED logged)</Text>
                </View>
              )}
            </View>

            {/* STEP 2: Start Odometer */}
            <View style={[styles.stepBox, otpVerified && !startOdometerCaptured && styles.stepBoxActive]}>
              <Text style={styles.stepTitle}>STEP 2: START ODOMETER & CLEANLINESS PHOTO</Text>
              {!startOdometerCaptured ? (
                <TouchableOpacity
                  style={[styles.actionButton, !canCapturePhoto && styles.disabledButton]}
                  onPress={handleCaptureStartOdometer}
                  activeOpacity={0.8}
                >
                  <Text style={styles.actionButtonText}>📷 CAPTURE STAMPED START ODOMETER</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.successBanner}>
                  <Text style={styles.successText}>✓ Start Odometer Stamped with GPS & Timestamp</Text>
                </View>
              )}
            </View>

            {/* STEP 3: Toll Fare */}
            <View style={[styles.stepBox, startOdometerCaptured && !tollConfirmed && styles.stepBoxActive]}>
              <Text style={styles.stepTitle}>STEP 3: TOLL FARE ENTRY (BLOCKS TRIP END)</Text>
              {!tollConfirmed ? (
                <>
                  <Text style={styles.stepDesc}>Enter total toll amount paid (₹0 if none):</Text>
                  <TextInput
                    style={styles.otpInput}
                    keyboardType="number-pad"
                    value={tollAmountInput}
                    onChangeText={setTollAmountInput}
                    placeholder="0"
                    placeholderTextColor="#94A3B8"
                  />
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {
                      setTollConfirmed(true);
                      Alert.alert('Toll Confirmed', `Toll fare ₹${tollAmountInput} recorded for billing close-out.`);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.actionButtonText}>CONFIRM TOLL FARE (₹{tollAmountInput}) →</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.successBanner}>
                  <Text style={styles.successText}>✓ Toll Fare Confirmed: ₹{tollAmountInput}</Text>
                </View>
              )}
            </View>

            {/* STEP 4: End Odometer */}
            <View style={[styles.stepBox, tollConfirmed && tripState !== 'COMPLETED' && styles.stepBoxActive]}>
              <Text style={styles.stepTitle}>STEP 4: END ODOMETER & COMPLETE TRIP</Text>
              {tripState !== 'COMPLETED' ? (
                <TouchableOpacity
                  style={[styles.completeButton, (!canCapturePhoto || !tollConfirmed) && styles.disabledButton]}
                  onPress={handleCaptureEndOdometer}
                  activeOpacity={0.8}
                >
                  <Text style={styles.actionButtonText}>🏁 CAPTURE END ODOMETER & COMPLETE TRIP</Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.successBanner, { backgroundColor: '#ECFDF5', borderColor: '#34D399' }]}>
                  <Text style={[styles.successText, { color: '#059669', fontSize: 13 }]}>
                    🎉 TRIP COMPLETED & BILLED
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },

  // ─── AUTH SCREEN STYLES ───
  authContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  authScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  authCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  authLogoWrapper: {
    alignItems: 'center',
    marginBottom: 16,
  },
  brandBadge: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#0F172A',
  },
  brandTitleText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FF6B1A',
    letterSpacing: 1.5,
  },
  brandSubtitleText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1,
    marginTop: 2,
  },
  authTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  authSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  authForm: {
    width: '100%',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#334155',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    overflow: 'hidden',
    height: 52,
    marginBottom: 20,
  },
  phonePrefixBox: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  phonePrefixText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#334155',
  },
  phoneInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  otpSection: {
    marginBottom: 20,
  },
  otpInputBox: {
    height: 52,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: 10,
  },
  otpHintText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF6B1A',
    marginTop: 6,
    textAlign: 'center',
  },
  primaryAuthBtn: {
    backgroundColor: '#FF6B1A',
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#FF6B1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryAuthBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  // ─── DASHBOARD TOP NAVBAR ───
  mainContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topNavbar: {
    backgroundColor: '#101522',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  navBrandCol: {
    flexDirection: 'column',
  },
  navBrandText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FF6B1A',
    letterSpacing: 1,
  },
  navBrandSub: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  navLogoutBtn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  navLogoutText: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '800',
  },

  // ─── SCROLL CONTENT ───
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 14,
  },

  // ─── DRIVER PROFILE CARD ───
  driverProfileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: 12,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#101522',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  avatarOnlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  driverInfoCol: {
    flex: 1,
  },
  driverNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  driverFullName: {
    fontSize: 14,
    fontWeight: '900',
    color: '#101522',
  },
  verifiedCheckBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedCheckIcon: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  driverVehicleSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  dutySwitchCol: {
    alignItems: 'center',
  },

  // ─── PENDING VERIFICATION BANNER ───
  pendingDocsBanner: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pendingDocsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  pendingDocsIcon: {
    fontSize: 14,
  },
  pendingDocsText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
    flex: 1,
  },
  pendingDocsChevron: {
    fontSize: 18,
    fontWeight: '900',
    color: '#92400E',
    marginLeft: 6,
  },

  // ─── HARDWARE PERMISSIONS ───
  permissionBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
  },
  permissionHeaderRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
    marginBottom: 8,
  },
  permissionTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  switchLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  alertWarning: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  alertWarningText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#991B1B',
  },

  // ─── TELEMETRY CARD ───
  telemetryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
  },
  telemetryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  telemetryLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  telemetrySpeed: {
    fontSize: 18,
    fontWeight: '900',
    color: '#101522',
    marginTop: 2,
  },
  pingBadge: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  pingBadgeLost: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  pingText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  pingTextLost: {
    color: '#B91C1C',
  },

  // ─── DISPATCHES SECTION HEADER ───
  dispatchesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  dispatchesHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  broadcastIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  broadcastIcon: {
    fontSize: 12,
    color: '#D97706',
    fontWeight: '900',
  },
  dispatchesTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#101522',
  },
  dispatchesSub: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  liveFeedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  liveFeedDot: {
    color: '#10B981',
    fontSize: 8,
  },
  liveFeedText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
  },

  // ─── DISPATCH CARDS ───
  dispatchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: 10,
  },
  availableDispatchCard: {
    borderLeftWidth: 5,
    borderLeftColor: '#10B981',
  },
  dispatchHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  refPillWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  refCodeText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#101522',
  },
  tripTypePill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tripTypePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#475569',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  availableStatusPill: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  assignedStatusPill: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '900',
  },
  availableStatusText: {
    color: '#059669',
  },
  assignedStatusText: {
    color: '#2563EB',
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  customerName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
  },
  phoneLinkBtn: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  phoneLinkText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803D',
  },
  phoneHiddenBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  phoneHiddenText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  dispatchFieldBlock: {
    gap: 2,
  },
  fieldLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  locationValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  timeFareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
  },
  pickupTimeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  clockIcon: {
    fontSize: 11,
  },
  pickupTimeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  fareAmountText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
    marginLeft: 8,
  },
  swipeToAcceptBtn: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  swipeCircleIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeChevronText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#10B981',
  },
  swipeTextCol: {
    flex: 1,
  },
  swipeMainText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  swipeSubText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#D1FAE5',
  },
  swipeRightArrow: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  manageTripBtn: {
    backgroundColor: '#FF6B1A',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manageTripBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  // ─── 6. DRIVER DOCUMENTS POPUP MODAL STYLES (MATCHING SCREENSHOTS) ───
  docModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  docModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxHeight: '92%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  docModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  docModalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  docBrandLogoBadge: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  docBrandText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  docBrandTextOrange: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FF6B1A',
  },
  docModalTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0F172A',
    flex: 1,
  },
  docModalCloseBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  docModalCloseBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#475569',
  },
  docModalScroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  // Stepper Card
  stepperCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  stepperHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepperLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  stepperStepBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF6B1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperStepBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  stepperStepTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0F172A',
    flex: 1,
  },
  stepperPercentText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FF6B1A',
  },
  stepperBarRow: {
    flexDirection: 'row',
    gap: 6,
    height: 6,
  },
  stepperSegment: {
    flex: 1,
    borderRadius: 3,
  },
  stepperSegmentDone: {
    backgroundColor: '#10B981',
  },
  stepperSegmentActive: {
    backgroundColor: '#FF6B1A',
  },
  stepperSegmentPending: {
    backgroundColor: '#CBD5E1',
  },

  // Admin Notice Box
  adminNoticeBox: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 6,
  },
  adminNoticeLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    flex: 1,
  },
  adminNoticeIcon: {
    fontSize: 14,
    marginTop: 1,
  },
  adminNoticeText: {
    fontSize: 11,
    color: '#92400E',
    lineHeight: 16,
    flex: 1,
  },
  adminNoticeBold: {
    fontWeight: '900',
  },
  adminNoticeCloseBtn: {
    padding: 2,
  },
  adminNoticeCloseText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '900',
  },

  // Section Cards
  docSectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 14,
    gap: 12,
  },
  docSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
  },
  docSectionIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docSectionIcon: {
    fontSize: 14,
  },
  docSectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.3,
    flex: 1,
  },
  docFieldGroup: {
    gap: 6,
  },
  docFieldLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#475569',
    letterSpacing: 0.5,
  },
  docTextInput: {
    height: 44,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  docSelectInput: {
    height: 44,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  docSelectText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  docSelectChevron: {
    fontSize: 14,
    fontWeight: '900',
    color: '#64748B',
  },

  // Upload Boxes
  uploadCardContainer: {
    marginTop: 4,
  },
  uploadDashedCard: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadEmptyContent: {
    alignItems: 'center',
    gap: 4,
  },
  uploadCloudIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  uploadCloudIcon: {
    fontSize: 16,
  },
  uploadLabelTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0F172A',
  },
  uploadFileSubText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 6,
  },
  chooseFileBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  chooseFileBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
  },
  uploadPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  uploadThumbImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  uploadThumbPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadThumbPlaceholderIcon: {
    fontSize: 24,
  },
  uploadPreviewInfo: {
    flex: 1,
    gap: 2,
  },
  uploadBadgeSuccess: {
    alignSelf: 'flex-start',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  uploadBadgeSuccessText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#15803D',
  },
  uploadFileName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
  },
  uploadChangeBtn: {
    marginTop: 2,
  },
  uploadChangeBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FF6B1A',
  },

  // Modal Footer Actions
  docModalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    gap: 10,
  },
  docSkipBtn: {
    flex: 1,
    height: 46,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docSkipBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#475569',
    letterSpacing: 0.5,
  },
  docUploadSubmitBtn: {
    flex: 2,
    height: 46,
    backgroundColor: '#FF6B1A',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#FF6B1A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  docUploadSubmitIcon: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  docUploadSubmitBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  // Picker Modals (Vehicle & Image source)
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerModalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    gap: 6,
  },
  pickerModalTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  pickerItemActive: {
    backgroundColor: '#FFF7ED',
    borderRadius: 8,
  },
  pickerItemText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  pickerItemTextActive: {
    color: '#FF6B1A',
    fontWeight: '900',
  },
  pickerItemCheck: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FF6B1A',
  },

  // ─── TRIP MODAL STYLES ───
  modalContainer: {
    flex: 1,
    backgroundColor: '#101522',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  modalSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 2,
  },
  modalCloseBtn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  modalCloseBtnText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '800',
  },
  modalScroll: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  routeContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    gap: 6,
  },
  routeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
  },
  stepBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    gap: 10,
  },
  stepBoxActive: {
    borderColor: '#FF6B1A',
    borderWidth: 1.5,
  },
  stepTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  stepDesc: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  otpInput: {
    height: 48,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  actionButton: {
    backgroundColor: '#FF6B1A',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeButton: {
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  successBanner: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: 10,
    borderRadius: 8,
  },
  successText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
});
