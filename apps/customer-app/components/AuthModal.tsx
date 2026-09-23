import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { customerApiClient, customerTokenStorage } from '../lib/api';

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
}

export function AuthModal({ visible, onClose, onSuccess }: AuthModalProps) {
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [otp, setOtp] = useState('');
  const [debugOtp, setDebugOtp] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSendOtp = async () => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await customerApiClient.fetch('/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ phone: cleaned }),
      });

      if (res && res.success) {
        setIsRegistered(res.isRegistered);
        if (res.debugOtp) {
          setDebugOtp(res.debugOtp);
          setOtp(res.debugOtp);
        }
        setStep('OTP');
      } else {
        setErrorMsg(res?.message || 'Failed to send OTP. Please try again.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Connection failed. Please check your network.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 4) {
      setErrorMsg('Please enter the 4-digit OTP code');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await customerApiClient.fetch('/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          phone: phone.replace(/\D/g, ''),
          otp: otp.trim(),
          fullName: fullName.trim() || undefined,
        }),
      });

      if (res && res.success) {
        if (res.token) {
          customerTokenStorage.setToken(res.token);
        }
        onSuccess(res.user);
        onClose();
        // Reset state
        setStep('PHONE');
        setPhone('');
        setOtp('');
        setDebugOtp(null);
      } else {
        setErrorMsg(res?.message || 'Invalid OTP. Please check and try again.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoid}
        >
          <SafeAreaView style={styles.sheetContainer}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>
                {step === 'PHONE' ? 'Sign In / Register' : 'Enter Verification Code'}
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color="#1e293b" />
              </TouchableOpacity>
            </View>

            <View style={styles.body}>
              {errorMsg && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={18} color="#dc2626" />
                  <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
              )}

              {step === 'PHONE' ? (
                <>
                  <Text style={styles.instruction}>
                    Enter your 10-digit mobile number to access your bookings and instant cab quotes.
                  </Text>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>MOBILE NUMBER</Text>
                    <View style={styles.phoneInputRow}>
                      <View style={styles.countryCodeBadge}>
                        <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
                      </View>
                      <TextInput
                        style={styles.phoneInput}
                        keyboardType="phone-pad"
                        placeholder="9876543210"
                        placeholderTextColor="#94a3b8"
                        maxLength={10}
                        value={phone}
                        onChangeText={(t) => {
                          setPhone(t.replace(/\D/g, ''));
                          setErrorMsg(null);
                        }}
                        autoFocus
                      />
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.primaryBtn, loading && styles.btnDisabled]}
                    onPress={handleSendOtp}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <>
                        <Text style={styles.primaryBtnText}>Get OTP Code</Text>
                        <Ionicons name="arrow-forward" size={18} color="#ffffff" style={{ marginLeft: 6 }} />
                      </>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={styles.otpHeaderRow}>
                    <Text style={styles.otpSentText}>
                      Code sent to <Text style={{ fontWeight: '800', color: '#0f172a' }}>+91 {phone}</Text>
                    </Text>
                    <TouchableOpacity onPress={() => setStep('PHONE')}>
                      <Text style={styles.changePhoneText}>Change</Text>
                    </TouchableOpacity>
                  </View>

                  {!isRegistered && (
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>YOUR FULL NAME</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="e.g. Rachel Sharma"
                        placeholderTextColor="#94a3b8"
                        value={fullName}
                        onChangeText={setFullName}
                      />
                    </View>
                  )}

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>4-DIGIT OTP CODE</Text>
                    <TextInput
                      style={styles.otpInput}
                      keyboardType="number-pad"
                      maxLength={4}
                      placeholder="••••"
                      placeholderTextColor="#cbd5e1"
                      value={otp}
                      onChangeText={(t) => {
                        setOtp(t.replace(/\D/g, ''));
                        setErrorMsg(null);
                      }}
                      autoFocus
                    />
                  </View>

                  {debugOtp && (
                    <View style={styles.devCodeBadge}>
                      <Text style={styles.devCodeText}>⚡ Dev Code: {debugOtp} (Auto-filled)</Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={[styles.primaryBtn, loading && styles.btnDisabled]}
                    onPress={handleVerifyOtp}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text style={styles.primaryBtnText}>Verify & Continue</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  keyboardAvoid: {
    width: '100%',
  },
  sheetContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  body: {
    padding: 20,
  },
  instruction: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 19,
    marginBottom: 18,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
  },
  countryCodeBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
  },
  countryCodeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  otpHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  otpSentText: {
    fontSize: 13,
    color: '#64748b',
  },
  changePhoneText: {
    fontSize: 13,
    color: '#ea580c',
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  otpInput: {
    borderWidth: 1.5,
    borderColor: '#ea580c',
    borderRadius: 14,
    backgroundColor: '#fff7ed',
    paddingVertical: 12,
    fontSize: 26,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
    letterSpacing: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  devCodeBadge: {
    backgroundColor: '#ffedd5',
    borderWidth: 1,
    borderColor: '#fed7aa',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 16,
  },
  devCodeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#c2410c',
  },
  primaryBtn: {
    backgroundColor: '#ea580c',
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 6,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
});
