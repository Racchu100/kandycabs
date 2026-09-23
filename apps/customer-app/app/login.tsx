import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { customerApiClient, customerTokenStorage } from '../lib/api';

export default function CustomerLoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [loading, setLoading] = useState(false);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

  const handleSendOtp = async () => {
    const cleanedPhone = phone.trim().replace(/\D/g, '');
    if (cleanedPhone.length !== 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    try {
      const res = await customerApiClient.fetch('/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ phone: cleanedPhone }),
      });

      if (res.success) {
        const receivedOtp = res.debugOtp || res.devOtp || '1234';
        setDevOtpHint(receivedOtp);
        setOtp(receivedOtp); // auto-populate for effortless testing
        setStep('OTP');
      } else {
        Alert.alert('Error', res.message || 'Failed to send OTP. Please try again.');
      }
    } catch (err: any) {
      Alert.alert('Network Error', err.message || 'Unable to contact auth server.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.trim().length !== 4) {
      Alert.alert('Invalid OTP', 'Please enter the 4-digit code sent to your phone.');
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
        router.replace('/dashboard');
      } else {
        Alert.alert('Verification Failed', res.message || 'Incorrect OTP code.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'OTP verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <View style={styles.header}>
          <Image
            source={require('../assets/images/logo-white.png')}
            style={styles.logoImage}
            contentFit="contain"
            cachePolicy="memory-disk"
            transition={200}
          />
          <Text style={styles.tagline}>Book Reliable Intercity & Local Cabs</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>
            {step === 'PHONE' ? 'Enter Mobile Number' : 'Enter 4-Digit OTP'}
          </Text>
          <Text style={styles.subtitle}>
            {step === 'PHONE'
              ? "We'll send a one-time verification code"
              : `Code sent to +91 ${phone}`}
          </Text>

          {step === 'PHONE' ? (
            <View style={styles.inputContainer}>
              <Text style={styles.prefix}>+91</Text>
              <TextInput
                style={styles.input}
                placeholder="9876543210"
                placeholderTextColor="#64748b"
                keyboardType="phone-pad"
                maxLength={10}
                value={phone}
                onChangeText={setPhone}
                editable={!loading}
              />
            </View>
          ) : (
            <View style={styles.otpWrapper}>
              <TextInput
                style={styles.otpInput}
                placeholder="••••"
                placeholderTextColor="#64748b"
                keyboardType="number-pad"
                maxLength={4}
                value={otp}
                onChangeText={setOtp}
                editable={!loading}
                autoFocus
              />
              {devOtpHint ? (
                <TouchableOpacity
                  style={styles.devHintButton}
                  onPress={() => setOtp(devOtpHint)}
                >
                  <Text style={styles.devHintText}>⚡ Tap to use Dev OTP: {devOtpHint}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={step === 'PHONE' ? handleSendOtp : handleVerifyOtp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#020617" />
            ) : (
              <Text style={styles.buttonText}>
                {step === 'PHONE' ? 'Get OTP' : 'Verify & Continue'}
              </Text>
            )}
          </TouchableOpacity>

          {step === 'OTP' && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setStep('PHONE')}
              disabled={loading}
            >
              <Text style={styles.backButtonText}>← Change Phone Number</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#020617',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoImage: {
    width: 180,
    height: 48,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  subtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  prefix: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#f59e0b',
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 48,
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '600',
  },
  otpWrapper: {
    width: '100%',
    marginBottom: 16,
  },
  otpInput: {
    backgroundColor: '#020617',
    borderWidth: 1.5,
    borderColor: '#f59e0b',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 26,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 10,
    height: 56,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  devHintButton: {
    backgroundColor: '#064e3b',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'center',
    marginTop: 4,
  },
  devHintText: {
    color: '#34d399',
    fontSize: 12,
    fontWeight: '700',
  },
  button: {
    backgroundColor: '#f59e0b',
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#020617',
    fontSize: 15,
    fontWeight: 'bold',
  },
  backButton: {
    alignItems: 'center',
    marginTop: 16,
    padding: 8,
  },
  backButtonText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
});
