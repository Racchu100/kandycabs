import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { driverApiClient } from '../lib/api';
import { DriverVerificationStatus } from '@kandy-cabs/shared';

export default function DriverLoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [debugOtp, setDebugOtp] = useState('');

  const handleSendOtp = async () => {
    if (phone.length < 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const res = await driverApiClient.auth.sendOtp(phone, 'DRIVER');
      if (res.success) {
        if (!res.isRegistered || !res.isDriver) {
          setError('No driver registered with this number. Please contact admin to register as a driver partner.');
          return;
        }
        setStep('OTP');
        if (res.debugOtp) setDebugOtp(res.debugOtp);
      } else {
        setError(res.message || 'No driver registered with this number. Please contact admin.');
      }
    } catch (err: any) {
      setError(err.message || 'No driver registered with this number. Please contact admin.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 4) {
      setError('Please enter the 4-digit OTP');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const res = await driverApiClient.auth.verifyOtp(phone, otp);
      if (res.success) {
        // Check driver status
        const statusRes = await driverApiClient.fetch('/api/driver/status').catch(() => null);
        if (!statusRes?.driver) {
          setError('No driver registered with this number. Please contact admin to register as a driver partner.');
          await driverApiClient.auth.logout().catch(() => {});
          return;
        }
        if (statusRes?.driver) {
          router.replace('/dashboard');
        }
      } else {
        setError(res.message || 'Verification failed');
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        <View style={styles.header}>
          <Image
            source={require('../assets/images/logo-white.png')}
            style={styles.logoImage}
            contentFit="contain"
            cachePolicy="memory-disk"
            transition={200}
          />
          <Text style={styles.badge}>DRIVER PARTNER</Text>
          <Text style={styles.subtitle}>Sign in to accept rides and manage your trips</Text>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {step === 'PHONE' ? (
          <View style={styles.form}>
            <Text style={styles.label}>Mobile Number</Text>
            <View style={styles.phoneInputContainer}>
              <Text style={styles.prefix}>+91</Text>
              <TextInput
                style={styles.input}
                placeholder="9876543210"
                placeholderTextColor="#64748b"
                keyboardType="phone-pad"
                maxLength={10}
                value={phone}
                onChangeText={setPhone}
              />
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={handleSendOtp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.buttonText}>Get Verification Code</Text>
              )}
            </TouchableOpacity>

            {/* Quick Demo Driver Logins */}
            <View style={{ marginTop: 24, borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 16 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 10, textAlign: 'center', letterSpacing: 0.5 }}>
                ⚡ Quick Demo Driver Logins
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: '#0f172a',
                  borderWidth: 1,
                  borderColor: '#f59e0b',
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
                onPress={async () => {
                  setPhone('9587425635');
                  setLoading(true);
                  setError('');
                  try {
                    const otpRes = await driverApiClient.auth.sendOtp('9587425635', 'DRIVER');
                    const devCode = otpRes.debugOtp || '1234';
                    const verifyRes = await driverApiClient.auth.verifyOtp('9587425635', devCode);
                    if (verifyRes.success) {
                      router.replace('/dashboard');
                    } else {
                      setStep('OTP');
                    }
                  } catch (e: any) {
                    setError(e.message || 'Quick login failed');
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                activeOpacity={0.8}
              >
                <View>
                  <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 14 }}>👨🏽‍✈️ Mukesh (Driver)</Text>
                  <Text style={{ color: '#f59e0b', fontSize: 12, fontWeight: '600', marginTop: 2 }}>KA 01 MJ 2023 • +91 9587425635</Text>
                </View>
                <Text style={{ color: '#f59e0b', fontWeight: '800', fontSize: 13 }}>LOGIN →</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  backgroundColor: '#0f172a',
                  borderWidth: 1,
                  borderColor: '#38bdf8',
                  borderRadius: 12,
                  padding: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
                onPress={async () => {
                  setPhone('8888888888');
                  setLoading(true);
                  setError('');
                  try {
                    const otpRes = await driverApiClient.auth.sendOtp('8888888888', 'DRIVER');
                    const devCode = otpRes.debugOtp || '1234';
                    const verifyRes = await driverApiClient.auth.verifyOtp('8888888888', devCode);
                    if (verifyRes.success) {
                      router.replace('/dashboard');
                    } else {
                      setStep('OTP');
                    }
                  } catch (e: any) {
                    setError(e.message || 'Quick login failed');
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                activeOpacity={0.8}
              >
                <View>
                  <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 14 }}>👨🏽‍✈️ Ramesh Kumar (Driver)</Text>
                  <Text style={{ color: '#38bdf8', fontSize: 12, fontWeight: '600', marginTop: 2 }}>KA-01-SD-2002 • +91 8888888888</Text>
                </View>
                <Text style={{ color: '#38bdf8', fontWeight: '800', fontSize: 13 }}>LOGIN →</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={styles.label}>Enter 4-Digit OTP</Text>
            <TextInput
              style={styles.otpInput}
              placeholder="••••"
              placeholderTextColor="#64748b"
              keyboardType="number-pad"
              maxLength={4}
              value={otp}
              onChangeText={setOtp}
            />

            {debugOtp ? (
              <Text style={styles.debugText}>Dev OTP: {debugOtp}</Text>
            ) : null}

            <TouchableOpacity
              style={[styles.button, { backgroundColor: '#10b981' }]}
              onPress={handleVerifyOtp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.buttonText}>Verify & Continue</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setStep('PHONE')}
              style={styles.backButton}
            >
              <Text style={styles.backButtonText}>Change Mobile Number</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  inner: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 28,
    alignItems: 'center',
  },
  logoImage: {
    width: 220,
    height: 70,
    marginBottom: 12,
  },
  badge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#f59e0b',
    backgroundColor: '#3b2505',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
    letterSpacing: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 6,
    textAlign: 'center',
  },
  form: {
    backgroundColor: '#1e293b',
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#cbd5e1',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#475569',
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  prefix: {
    fontSize: 16,
    fontWeight: '700',
    color: '#94a3b8',
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  otpInput: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#475569',
    paddingVertical: 14,
    fontSize: 24,
    color: '#ffffff',
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#f59e0b',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  errorText: {
    color: '#f87171',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
    backgroundColor: '#450a0a',
    padding: 10,
    borderRadius: 8,
  },
  debugText: {
    color: '#fbbf24',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '600',
  },
  backButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
});
