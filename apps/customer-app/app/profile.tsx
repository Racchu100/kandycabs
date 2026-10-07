import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
  Alert,
  Linking,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { customerApiClient, customerTokenStorage, formatDisplayPhone } from '../lib/api';
import { CustomerBottomDock } from '../components/CustomerBottomDock';
import { AuthModal } from '../components/AuthModal';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0);

  const [user, setUser] = useState<any | null>(customerTokenStorage.getUser());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Edit profile state
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [saving, setSaving] = useState(false);

  const loadProfile = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const token = customerTokenStorage.getToken();
      if (!token) {
        setUser(null);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const res = await customerApiClient.fetch('/api/auth/me');
      if (res?.user) {
        setUser(res.user);
        customerTokenStorage.setUser(res.user);
        setFullName(res.user.fullName || '');
        setEmail(res.user.email || '');
      } else {
        setUser(null);
      }
    } catch (err: any) {
      if (err?.status === 401) {
        customerTokenStorage.removeToken();
        setUser(null);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
    const unsub = customerTokenStorage.subscribe(() => {
      setUser(customerTokenStorage.getUser());
    });
    return () => unsub();
  }, [loadProfile]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadProfile(false);
  };

  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      Alert.alert('Required', 'Please enter your full name');
      return;
    }

    setSaving(true);
    try {
      const res = await customerApiClient.fetch('/api/auth/update-profile', {
        method: 'POST',
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim() || undefined,
        }),
      });

      if (res?.success && res.user) {
        setUser(res.user);
        customerTokenStorage.setUser(res.user);
        setIsEditing(false);
        Alert.alert('Profile Updated', 'Your profile details have been successfully saved.');
      } else {
        // Fallback local update
        const updated = { ...user, fullName: fullName.trim(), email: email.trim() };
        setUser(updated);
        customerTokenStorage.setUser(updated);
        setIsEditing(false);
        Alert.alert('Profile Updated', 'Your profile name has been updated.');
      }
    } catch {
      // Local fallback
      const updated = { ...user, fullName: fullName.trim(), email: email.trim() };
      setUser(updated);
      customerTokenStorage.setUser(updated);
      setIsEditing(false);
      Alert.alert('Profile Updated', 'Your profile name has been updated.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => {
            customerTokenStorage.removeToken();
            setUser(null);
            Alert.alert('Signed Out', 'You have been signed out.');
            router.replace('/');
          },
        },
      ]
    );
  };

  const handleCallSupport = () => {
    Linking.openURL('tel:+918045689000');
  };

  const handleWhatsApp = () => {
    Linking.openURL('https://wa.me/919900447660?text=Hello%20Kandy%20Cabs%2C%20I%20need%20assistance%20with%20my%20account.');
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
        >
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#ea580c']} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#ea580c" />
            <Text style={styles.loadingText}>Loading profile details...</Text>
          </View>
        ) : user ? (
          <>
            {/* User Hero Banner */}
            <View style={styles.heroCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user.fullName ? user.fullName[0].toUpperCase() : 'U'}
                </Text>
              </View>
              <View style={styles.heroDetails}>
                <Text style={styles.heroName}>{user.fullName || 'Valued Customer'}</Text>
                <Text style={styles.heroPhone}>{formatDisplayPhone(user.phone)}</Text>
                <View style={styles.badgeRow}>
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#16a34a" />
                    <Text style={styles.verifiedText}>Verified Customer</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Profile Information Section */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Account Details</Text>
                {!isEditing ? (
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => setIsEditing(true)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="pencil-sharp" size={14} color="#ea580c" />
                    <Text style={styles.editBtnText}>Edit</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => {
                      setIsEditing(false);
                      setFullName(user.fullName || '');
                      setEmail(user.email || '');
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                )}
              </View>

              {isEditing ? (
                <View style={styles.editForm}>
                  <Text style={styles.inputLabel}>FULL NAME</Text>
                  <TextInput
                    style={styles.textInput}
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Your Full Name"
                    placeholderTextColor="#94a3b8"
                  />

                  <Text style={[styles.inputLabel, { marginTop: 14 }]}>EMAIL ADDRESS (FOR GST INVOICES)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="your.email@example.com"
                    placeholderTextColor="#94a3b8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />

                  <TouchableOpacity
                    style={[styles.saveButton, saving && { opacity: 0.7 }]}
                    onPress={handleSaveProfile}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.saveButtonText}>Save Changes</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.detailsList}>
                  <View style={styles.detailRow}>
                    <View style={styles.detailIconBox}>
                      <Ionicons name="person-outline" size={18} color="#ea580c" />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Full Name</Text>
                      <Text style={styles.detailValue}>{user.fullName || 'Not provided'}</Text>
                    </View>
                  </View>

                  <View style={styles.detailDivider} />

                  <View style={styles.detailRow}>
                    <View style={styles.detailIconBox}>
                      <Ionicons name="call-outline" size={18} color="#ea580c" />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Registered Mobile</Text>
                      <Text style={styles.detailValue}>{formatDisplayPhone(user.phone)}</Text>
                    </View>
                  </View>

                  <View style={styles.detailDivider} />

                  <View style={styles.detailRow}>
                    <View style={styles.detailIconBox}>
                      <Ionicons name="mail-outline" size={18} color="#ea580c" />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Email Address</Text>
                      <Text style={styles.detailValue}>{user.email || 'None added (used for tax receipts)'}</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* Quick Actions & Navigation */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>

              {/* My Bookings */}
              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => router.push('/my-bookings')}
                activeOpacity={0.7}
              >
                <View style={styles.actionItemLeft}>
                  <View style={[styles.actionIconBox, { backgroundColor: '#fff7ed' }]}>
                    <Ionicons name="receipt-outline" size={20} color="#ea580c" />
                  </View>
                  <View>
                    <Text style={styles.actionItemTitle}>My Bookings & Invoices</Text>
                    <Text style={styles.actionItemSubtitle}>View active rides, driver tracking & history</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
              </TouchableOpacity>

              <View style={styles.actionDivider} />

              {/* Book Cab */}
              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => router.push('/select-trip-type')}
                activeOpacity={0.7}
              >
                <View style={styles.actionItemLeft}>
                  <View style={[styles.actionIconBox, { backgroundColor: '#eff6ff' }]}>
                    <Ionicons name="car-sport-outline" size={20} color="#0284c7" />
                  </View>
                  <View>
                    <Text style={styles.actionItemTitle}>Book a New Cab</Text>
                    <Text style={styles.actionItemSubtitle}>One-way, round trip, airport & rentals</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {/* Help & Support */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Support & Helpline</Text>

              <TouchableOpacity
                style={styles.supportButton}
                onPress={handleCallSupport}
                activeOpacity={0.7}
              >
                <Ionicons name="call" size={20} color="#16a34a" />
                <View style={styles.supportButtonText}>
                  <Text style={styles.supportButtonLabel}>24/7 Helpline Support</Text>
                  <Text style={styles.supportButtonNumber}>+91 80456 89000</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.supportButton, { marginTop: 10, borderColor: '#25d366', backgroundColor: '#f0fdf4' }]}
                onPress={handleWhatsApp}
                activeOpacity={0.7}
              >
                <Ionicons name="logo-whatsapp" size={20} color="#25d366" />
                <View style={styles.supportButtonText}>
                  <Text style={[styles.supportButtonLabel, { color: '#166534' }]}>WhatsApp Live Assistance</Text>
                  <Text style={[styles.supportButtonNumber, { color: '#15803d' }]}>Instant Booking & Driver Inquiries</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Sign Out Button */}
            <TouchableOpacity
              style={styles.signOutButton}
              onPress={handleSignOut}
              activeOpacity={0.7}
            >
              <Ionicons name="log-out-outline" size={20} color="#dc2626" />
              <Text style={styles.signOutButtonText}>Sign Out from Device</Text>
            </TouchableOpacity>
          </>
        ) : (
          /* Guest State */
          <View style={styles.guestContainer}>
            <View style={styles.guestAvatar}>
              <Ionicons name="person" size={44} color="#94a3b8" />
            </View>
            <Text style={styles.guestTitle}>You are not signed in</Text>
            <Text style={styles.guestSubtitle}>
              Sign in with your mobile number to view your bookings, trip receipts, and live driver tracking.
            </Text>
            <TouchableOpacity
              style={styles.signInButton}
              onPress={() => setIsAuthModalOpen(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="log-in-outline" size={20} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.signInButtonText}>Sign In / Register</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Persistent Bottom Dock */}
      <CustomerBottomDock
        activeTab="PROFILE"
        onPressProfile={() => {
          if (!user) setIsAuthModalOpen(true);
        }}
      />

      {/* Auth Modal */}
      <AuthModal
        visible={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(u) => {
          setUser(u);
          setIsAuthModalOpen(false);
          loadProfile(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerRightPlaceholder: {
    width: 36,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#fed7aa',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ea580c',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '900',
  },
  heroDetails: {
    flex: 1,
  },
  heroName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  heroPhone: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#fff7ed',
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ea580c',
  },
  cancelBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  editForm: {
    marginTop: 4,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#ea580c',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  detailsList: {
    marginTop: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  detailIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 1,
  },
  detailDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 8,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  actionItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  actionItemSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  actionDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 4,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: 12,
    padding: 12,
  },
  supportButtonText: {
    marginLeft: 12,
  },
  supportButtonLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#166534',
  },
  supportButtonNumber: {
    fontSize: 15,
    fontWeight: '800',
    color: '#15803d',
    marginTop: 1,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
    marginTop: 4,
  },
  signOutButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#dc2626',
  },
  guestContainer: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 20,
  },
  guestAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  guestTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  guestSubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ea580c',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
    width: '100%',
  },
  signInButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
});
