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

export default function DriverDocumentsUploadScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // KYC Fields
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseDocUrl, setLicenseDocUrl] = useState<string | null>(null);
  const [rcDocUrl, setRcDocUrl] = useState<string | null>(null);
  const [insuranceDocUrl, setInsuranceDocUrl] = useState<string | null>(null);

  // 5 Vehicle Inspection Angles: [Front, Rear, Left, Right, Interior]
  const [vehiclePhotos, setVehiclePhotos] = useState<(string | null)[]>([
    null,
    null,
    null,
    null,
    null,
  ]);

  const [verificationStatus, setVerificationStatus] = useState('PENDING');
  const [adminNotes, setAdminNotes] = useState<string | null>(null);

  const angleNames = [
    { title: 'Front Angle', desc: 'Front bumper & number plate visible' },
    { title: 'Rear Angle', desc: 'Rear bumper, tail lights & boot visible' },
    { title: 'Left Side Angle', desc: 'Full left profile & door panels' },
    { title: 'Right Side Angle', desc: 'Full right profile & door panels' },
    { title: 'Interior View', desc: 'Clean dashboard, seats & seatbelts' },
  ];

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
        setLicenseNumber(d.licenseNumber || '');
        setLicenseDocUrl(d.licenseDocUrl || null);
        setRcDocUrl(d.rcDocUrl || null);
        setInsuranceDocUrl(d.insuranceDocUrl || null);

        const photos = Array.isArray(d.vehiclePhotos) && d.vehiclePhotos.length === 5
          ? d.vehiclePhotos
          : [null, null, null, null, null];
        setVehiclePhotos(photos);

        setVerificationStatus(d.verificationStatus || 'PENDING');
        setAdminNotes(d.adminNotes || null);
      }
    } catch (err: any) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  // Image Picker Helper
  const pickImage = async (
    target: 'profile' | 'license' | 'rc' | 'insurance' | number,
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
        // Create base64 data uri or uri
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
        } else if (typeof target === 'number') {
          setVehiclePhotos((prev) => {
            const next = [...prev];
            next[target] = uri;
            return next;
          });
        }
      }
    } catch (err: any) {
      console.error('Error selecting image:', err);
      Alert.alert('Image Error', err.message || 'Failed to select image');
    }
  };

  const handleSelectOptions = (target: 'profile' | 'license' | 'rc' | 'insurance' | number) => {
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
    setVehiclePhotos([
      'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=80', // Front
      'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=800&auto=format&fit=crop&q=80', // Rear
      'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&auto=format&fit=crop&q=80', // Left
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&auto=format&fit=crop&q=80', // Right
      'https://images.unsplash.com/photo-1563720223185-11003d516935?w=800&auto=format&fit=crop&q=80', // Interior
    ]);
    Alert.alert('Demo Photos Loaded', 'Loaded driver profile portrait, 3 verified sample KYC documents and 5-angle vehicle photos. You can now tap Submit!');
  };

  const handleSubmit = async () => {
    if (!licenseNumber.trim()) {
      Alert.alert('Required Field', 'Please enter your Driving License (DL) number.');
      return;
    }

    if (!licenseDocUrl || !rcDocUrl || !insuranceDocUrl) {
      Alert.alert(
        'Incomplete Documents',
        'Please upload all 3 official KYC documents (Driving License, RC Certificate, and Insurance).',
        [
          { text: 'OK' },
          { text: '⚡ Use Demo Images', onPress: handleFillDemoPhotos },
        ]
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await driverApiClient.fetch('/api/driver/documents', {
        method: 'POST',
        body: JSON.stringify({
          profilePhotoUrl,
          licenseNumber: licenseNumber.trim().toUpperCase(),
          licenseDocUrl,
          rcDocUrl,
          insuranceDocUrl,
          vehiclePhotos: vehiclePhotos.map((p) => p || 'https://placehold.co/800x600/png?text=Vehicle+Inspection+Photo'),
        }),
      });

      if (res.success) {
        Alert.alert(
          '✓ Documents Submitted',
          'Your profile photo, KYC documents, and 5-angle vehicle photos have been saved to the database. The admin panel will review and verify your profile.',
          [
            {
              text: 'Back to Dashboard',
              onPress: () => router.replace('/dashboard'),
            },
          ]
        );
      } else {
        Alert.alert('Submission Error', res.message || 'Failed to submit documents');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save documents');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#ea580c" />
        <Text style={{ color: '#0f172a', marginTop: 12, fontWeight: '700' }}>Loading Documents...</Text>
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
        <Text style={styles.navTitle}>Upload KYC Documents</Text>
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
              <Text style={styles.noticeTitle}>KYC & Vehicle Evidence</Text>
              <Text style={styles.noticeSub}>
                Upload clear photos of your official documents and all 5 angles of your cab for verification.
              </Text>
            </View>
          </View>

          {adminNotes ? (
            <View style={styles.adminFeedbackBox}>
              <Text style={styles.adminFeedbackTitle}>⚠️ Admin Feedback:</Text>
              <Text style={styles.adminFeedbackText}>{adminNotes}</Text>
            </View>
          ) : null}
        </View>

        {/* ============================================================ */}
        {/* SECTION 1: OFFICIAL KYC & PROFILE DOCUMENTS                  */}
        {/* ============================================================ */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>1. OFFICIAL KYC & PROFILE DOCUMENTS</Text>
          <Text style={styles.sectionHeaderSub}>4 Documents</Text>
        </View>

        {/* Doc 0: Driver Profile Photo (Circular 1:1 Avatar) */}
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

        {/* License Number Input */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>DRIVING LICENSE NUMBER (DL):</Text>
          <TextInput
            style={styles.textInput}
            value={licenseNumber}
            onChangeText={setLicenseNumber}
            placeholder="e.g. KA 202612356"
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

        {/* ============================================================ */}
        {/* SECTION 2: VEHICLE INSPECTION PHOTOS (5 ANGLES)              */}
        {/* ============================================================ */}
        <View style={[styles.sectionHeaderRow, { marginTop: 16 }]}>
          <Text style={styles.sectionHeaderTitle}>2. VEHICLE INSPECTION PHOTOS (5 ANGLES)</Text>
          <Text style={styles.sectionHeaderSub}>5 Angles</Text>
        </View>

        <View style={styles.anglesGrid}>
          {angleNames.map((angle, idx) => {
            const photoUrl = vehiclePhotos[idx];
            return (
              <View key={angle.title} style={styles.angleCard}>
                <View style={styles.angleHeader}>
                  <Text style={styles.angleTitle}>{angle.title}</Text>
                  <View style={[styles.angleBadge, photoUrl ? styles.badgeGreen : styles.badgeAmber]}>
                    <Text style={photoUrl ? styles.badgeTextGreen : styles.badgeTextAmber}>
                      {photoUrl ? '✓ Attached' : '⏳ Pending'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.angleDesc}>{angle.desc}</Text>

                {photoUrl ? (
                  <View style={styles.anglePreviewBox}>
                    <Image
                      source={{ uri: photoUrl }}
                      style={styles.angleImage}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      style={styles.angleChangeBtn}
                      onPress={() => handleSelectOptions(idx)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.angleChangeText}>📷 Retake</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.anglePlaceholder}
                    onPress={() => handleSelectOptions(idx)}
                    activeOpacity={0.8}
                  >
                    <Text style={{ fontSize: 24 }}>📸</Text>
                    <Text style={styles.anglePlaceholderText}>Upload {angle.title}</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
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
          Once submitted, your official documents and cab photos will be reviewed in the Kandy Cabs Admin Evidence Panel.
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
    fontSize: 15,
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
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 6,
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
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
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
  anglesGrid: {
    gap: 10,
  },
  angleCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  angleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  angleTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  angleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  angleDesc: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
    marginBottom: 8,
  },
  anglePreviewBox: {
    height: 120,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    position: 'relative',
    backgroundColor: '#0f172a',
  },
  angleImage: {
    width: '100%',
    height: '100%',
  },
  angleChangeBtn: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  angleChangeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  anglePlaceholder: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  anglePlaceholderText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginTop: 4,
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
