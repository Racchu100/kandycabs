import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { customerApiClient, customerTokenStorage } from '../lib/api';

const { width } = Dimensions.get('window');

export default function CustomerLoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0);

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [step, setStep] = useState<'PHONE' | 'OTP' | 'NAME'>('PHONE');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

  // Check if customer is already logged in -> auto-redirect to Home
  useEffect(() => {
    let mounted = true;
    const checkAuth = async () => {
      try {
        const token = await customerTokenStorage.getTokenAsync();
        if (token && mounted) {
          router.replace('/');
          return;
        }
      } catch (err) {
        console.warn('Auth check error:', err);
      } finally {
        if (mounted) setCheckingAuth(false);
      }
    };
    checkAuth();
    return () => {
      mounted = false;
    };
  }, [router]);

  const handleSendOtp = async () => {
    const cleanedPhone = phone.trim().replace(/\D/g, '');
    if (cleanedPhone.length !== 10) {
      Alert.alert('Invalid Mobile Number', 'Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    setLoading(true);
    try {
      const res = await customerApiClient.fetch('/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ phone: cleanedPhone, role: 'CUSTOMER' }),
      });

      if (res.success) {
        const receivedOtp = res.debugOtp || res.devOtp || '1234';
        setDevOtpHint(receivedOtp);
        setOtp(receivedOtp);
        setStep('OTP');
      } else {
        Alert.alert('Unable to Send OTP', res.message || 'Failed to send OTP. Please try again.');
      }
    } catch (err: any) {
      Alert.alert('Network Error', err.message || 'Unable to connect to authentication server. Please check your internet.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.trim().length !== 4) {
      Alert.alert('Invalid OTP', 'Please enter the 4-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const cleanedPhone = phone.trim().replace(/\D/g, '');
      const res = await customerApiClient.fetch('/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          phone: cleanedPhone,
          otp: otp.trim(),
        }),
      });

      if (res.success && res.token) {
        customerTokenStorage.setToken(res.token);
        if (res.user) {
          customerTokenStorage.setUser(res.user);
        }

        // If customer already has a registered name, go straight to home page
        if (res.hasRegisteredName || (res.user?.fullName && res.user.fullName !== 'Kandy Customer')) {
          router.replace('/');
        } else {
          // New customer without name -> prompt for name
          setStep('NAME');
        }
      } else {
        Alert.alert('Verification Failed', res.message || 'Incorrect OTP code. Please try again.');
      }
    } catch (err: any) {
      Alert.alert('Verification Error', err.message || 'OTP verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveName = async () => {
    if (!name.trim()) {
      Alert.alert('Name Required', 'Please enter your name to complete registration.');
      return;
    }

    setLoading(true);
    try {
      const res = await customerApiClient.fetch('/api/auth/update-profile', {
        method: 'POST',
        body: JSON.stringify({ fullName: name.trim() }),
      });
      if (res?.user) {
        customerTokenStorage.setUser(res.user);
      }
      router.replace('/');
    } catch (err: any) {
      // Even if name update had a minor issue, token is valid
      router.replace('/');
    } finally {
      setLoading(false);
    }
  };

  // Fast demo customer login helper for instant testing
  const handleQuickDemoLogin = async (demoPhone: string) => {
    setPhone(demoPhone);
    setLoading(true);
    try {
      const otpRes = await customerApiClient.fetch('/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ phone: demoPhone, role: 'CUSTOMER' }),
      });
      const code = otpRes.debugOtp || otpRes.devOtp || '1234';
      const verifyRes = await customerApiClient.fetch('/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ phone: demoPhone, otp: code }),
      });

      if (verifyRes.success && verifyRes.token) {
        customerTokenStorage.setToken(verifyRes.token);
        if (verifyRes.user) {
          customerTokenStorage.setUser(verifyRes.user);
        }
        router.replace('/');
      } else {
        setDevOtpHint(code);
        setOtp(code);
        setStep('OTP');
      }
    } catch {
      // fallback to manual OTP screen
      setPhone(demoPhone);
      setStep('OTP');
      setOtp('1234');
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <View style={styles.splashContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <Image
          source={require('../assets/images/logo.png')}
          style={styles.splashLogo}
          resizeMode="contain"
        />
        <ActivityIndicator size="large" color="#ea580c" style={{ marginTop: 24 }} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.scrollContent, { paddingTop: topInset + 8 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top Brand Header */}
          <View style={styles.brandHeader}>
            <Image
              source={require('../assets/images/logo.png')}
              style={styles.brandLogo}
              resizeMode="contain"
            />
            <Text style={styles.welcomeSub}>Welcome to</Text>
            <Text style={styles.welcomeBrand}>KANDY CABS</Text>
            <Text style={styles.tagline}>Your Trusted Travel Partner</Text>
            <Text style={styles.servicesLine}>Inter-State   |   Outstation   |   Local</Text>
          </View>

          {/* Hero Banner with Scenery & Innova Car */}
          <View style={styles.heroContainer}>
            <Image
              source={require('../assets/images/login-hero.png')}
              style={styles.heroImage}
              resizeMode="cover"
            />
          </View>

          {/* Customer Login Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>
                {step === 'PHONE'
                  ? 'Customer Login'
                  : step === 'OTP'
                  ? 'Verify Code'
                  : 'Complete Profile'}
              </Text>
              <Text style={styles.cardSubtitle}>
                {step === 'PHONE'
                  ? 'Login to book your cab, manage bookings and get the best travel experience.'
                  : step === 'OTP'
                  ? `Enter the 4-digit code sent to +91 ${phone}`
                  : 'Please enter your full name to complete your registration.'}
              </Text>
            </View>

            {/* STEP 1: Phone Number Input */}
            {step === 'PHONE' && (
              <View style={styles.form}>
                <Text style={styles.inputLabel}>MOBILE NUMBER</Text>
                <View style={styles.phoneInputRow}>
                  <View style={styles.flagPrefix}>
                    <Ionicons name="call" size={16} color="#ea580c" style={{ marginRight: 6 }} />
                    <Text style={styles.prefixText}>+91</Text>
                  </View>
                  <TextInput
                    style={styles.phoneInput}
                    placeholder="98765 43210"
                    placeholderTextColor="#94a3b8"
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={phone}
                    onChangeText={setPhone}
                    editable={!loading}
                  />
                </View>

                {/* Primary Login Button */}
                <TouchableOpacity
                  style={[styles.primaryButton, loading && styles.buttonDisabled]}
                  onPress={handleSendOtp}
                  disabled={loading}
                  activeOpacity={0.88}
                >
                  {loading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Login with OTP</Text>
                  )}
                </TouchableOpacity>

                {/* Quick 1-Tap Demo Logins */}
                <View style={styles.demoSection}>
                  <View style={styles.demoDivider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>QUICK DEMO LOGINS</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  <View style={styles.demoButtonsRow}>
                    <TouchableOpacity
                      style={styles.demoPill}
                      onPress={() => handleQuickDemoLogin('9876543210')}
                      disabled={loading}
                    >
                      <Ionicons name="person-circle" size={20} color="#ea580c" />
                      <View style={{ marginLeft: 8 }}>
                        <Text style={styles.demoName}>Rajesh Kumar</Text>
                        <Text style={styles.demoPhone}>+91 98765 43210</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.demoPill}
                      onPress={() => handleQuickDemoLogin('9123456789')}
                      disabled={loading}
                    >
                      <Ionicons name="person-circle" size={20} color="#0284c7" />
                      <View style={{ marginLeft: 8 }}>
                        <Text style={styles.demoName}>Priya Sharma</Text>
                        <Text style={styles.demoPhone}>+91 91234 56789</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* STEP 2: OTP Verification */}
            {step === 'OTP' && (
              <View style={styles.form}>
                <Text style={styles.inputLabel}>4-DIGIT VERIFICATION CODE</Text>
                <View style={styles.otpInputWrapper}>
                  <TextInput
                    style={styles.otpInput}
                    placeholder="••••"
                    placeholderTextColor="#94a3b8"
                    keyboardType="number-pad"
                    maxLength={4}
                    value={otp}
                    onChangeText={setOtp}
                    editable={!loading}
                    autoFocus
                  />
                </View>

                {devOtpHint ? (
                  <TouchableOpacity
                    style={styles.devHintBanner}
                    onPress={() => setOtp(devOtpHint)}
                  >
                    <Ionicons name="flash" size={15} color="#ea580c" />
                    <Text style={styles.devHintText}>
                      Demo Code: <Text style={{ fontWeight: '800' }}>{devOtpHint}</Text> (Tap to auto-fill)
                    </Text>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  style={[styles.primaryButton, loading && styles.buttonDisabled]}
                  onPress={handleVerifyOtp}
                  disabled={loading}
                  activeOpacity={0.88}
                >
                  {loading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Verify & Proceed</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.backLink}
                  onPress={() => {
                    setStep('PHONE');
                    setOtp('');
                  }}
                  disabled={loading}
                >
                  <Ionicons name="arrow-back" size={16} color="#64748b" style={{ marginRight: 6 }} />
                  <Text style={styles.backLinkText}>Change Mobile Number</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* STEP 3: Complete Profile Name */}
            {step === 'NAME' && (
              <View style={styles.form}>
                <Text style={styles.inputLabel}>YOUR FULL NAME</Text>
                <View style={styles.nameInputRow}>
                  <Ionicons name="person-outline" size={18} color="#64748b" style={{ marginRight: 10 }} />
                  <TextInput
                    style={styles.nameInput}
                    placeholder="e.g. Rachel Sharma"
                    placeholderTextColor="#94a3b8"
                    value={name}
                    onChangeText={setName}
                    editable={!loading}
                    autoFocus
                  />
                </View>

                <TouchableOpacity
                  style={[styles.primaryButton, loading && styles.buttonDisabled]}
                  onPress={handleSaveName}
                  disabled={loading}
                  activeOpacity={0.88}
                >
                  {loading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Continue to Home</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Trust Footer */}
            <View style={styles.trustFooter}>
              <View style={styles.trustItem}>
                <Ionicons name="shield-checkmark" size={14} color="#16a34a" />
                <Text style={styles.trustText}>Verified Chauffeurs</Text>
              </View>
              <Text style={styles.trustDot}>•</Text>
              <View style={styles.trustItem}>
                <Ionicons name="time" size={14} color="#ea580c" />
                <Text style={styles.trustText}>24/7 Helpline</Text>
              </View>
              <Text style={styles.trustDot}>•</Text>
              <View style={styles.trustItem}>
                <Ionicons name="checkmark-circle" size={14} color="#0284c7" />
                <Text style={styles.trustText}>Zero Surge</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  screen: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  splashContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashLogo: {
    width: 200,
    height: 70,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  brandHeader: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  brandLogo: {
    width: 190,
    height: 52,
    marginBottom: 10,
  },
  welcomeSub: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    letterSpacing: 0.2,
  },
  welcomeBrand: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 0.8,
    marginTop: 1,
  },
  tagline: {
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
    marginTop: 2,
  },
  servicesLine: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 6,
    letterSpacing: 0.5,
  },
  heroContainer: {
    width: width,
    height: 185,
    marginTop: 6,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  card: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 10,
    marginTop: -20,
  },
  cardHeader: {
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
    lineHeight: 19,
  },
  form: {
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 16,
  },
  flagPrefix: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 10,
    borderRightWidth: 1,
    borderRightColor: '#cbd5e1',
    marginRight: 10,
  },
  prefixText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    letterSpacing: 0.5,
  },
  primaryButton: {
    backgroundColor: '#ea580c',
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  demoSection: {
    marginTop: 20,
  },
  demoDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    marginHorizontal: 12,
    letterSpacing: 0.8,
  },
  demoButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  demoPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  demoName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  demoPhone: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
  otpInputWrapper: {
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#ea580c',
    borderRadius: 14,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  otpInput: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 18,
    textAlign: 'center',
    width: '100%',
  },
  devHintBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  devHintText: {
    fontSize: 12,
    color: '#c2410c',
    marginLeft: 6,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 6,
  },
  backLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  nameInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 16,
  },
  nameInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  trustFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trustText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  trustDot: {
    marginHorizontal: 8,
    color: '#cbd5e1',
    fontSize: 12,
  },
});
