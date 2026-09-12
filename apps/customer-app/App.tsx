import React, { useState } from 'react';
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
} from 'react-native';
import { KANDY_THEME } from '@kandycabs/shared';

export default function App() {
  const [phone, setPhone] = useState('9876543210');
  const [otp, setOtp] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  // Active Trip State
  const [activeTrip] = useState({
    ref: 'KC73744',
    tripType: 'ONEWAY',
    pickup: 'Bangalore, KA',
    drop: 'Coorg (Madikeri), KA',
    date: '15 Sep 2026, 06:00 AM',
    fare: '₹4,250',
    advancePaid: '₹1,063',
    status: 'DRIVER EN ROUTE',
    driverName: 'Ramesh Kumar',
    driverPhone: '8888888888',
  });

  const handleSendOtp = () => {
    setOtpSent(true);
    Alert.alert('SMS OTP Sent', 'Use demo 4-digit code: 1234');
  };

  const handleVerifyOtp = () => {
    if (otp === '1234' || otp === '') {
      setIsLoggedIn(true);
    } else {
      Alert.alert('Error', 'Invalid OTP');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={KANDY_THEME.colors.ink} />
      
      {/* Header Bar */}
      <View style={styles.header}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>KC</Text>
        </View>
        <View>
          <Text style={styles.headerTitle}>KANDY CABS</Text>
          <Text style={styles.headerSubtitle}>Customer Mobile App</Text>
        </View>
      </View>

      {!isLoggedIn ? (
        <View style={styles.authContainer}>
          <View style={styles.authCard}>
            <Text style={styles.cardTitle}>Login / Register</Text>
            <Text style={styles.cardDesc}>Enter mobile number for SMS OTP verification</Text>

            {!otpSent ? (
              <>
                <Text style={styles.inputLabel}>MOBILE NUMBER</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="10-digit mobile number"
                />
                <TouchableOpacity style={styles.primaryButton} onPress={handleSendOtp}>
                  <Text style={styles.buttonText}>SEND 4-DIGIT OTP →</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.demoOtpBox}>
                  <Text style={styles.demoOtpText}>Demo Master OTP: 1234</Text>
                </View>
                <Text style={styles.inputLabel}>ENTER 4-DIGIT OTP</Text>
                <TextInput
                  style={[styles.input, { textAlign: 'center', fontSize: 20, letterSpacing: 6 }]}
                  keyboardType="number-pad"
                  maxLength={4}
                  value={otp}
                  onChangeText={setOtp}
                  placeholder="1234"
                />
                <TouchableOpacity style={styles.primaryButton} onPress={handleVerifyOtp}>
                  <Text style={styles.buttonText}>VERIFY & LOGIN →</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      ) : (
        <ScrollView style={styles.scrollContent}>
          {/* Active Booking Status Card */}
          <View style={styles.tripCard}>
            <View style={styles.tripHeader}>
              <Text style={styles.tripRef}>Ref: {activeTrip.ref}</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{activeTrip.status}</Text>
              </View>
            </View>

            <View style={styles.routeContainer}>
              <Text style={styles.routeText}>📍 {activeTrip.pickup}</Text>
              <Text style={styles.routeArrow}>↓</Text>
              <Text style={styles.routeText}>🏁 {activeTrip.drop}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Scheduled Date:</Text>
              <Text style={styles.infoValue}>{activeTrip.date}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Estimated Total:</Text>
              <Text style={styles.infoValue}>{activeTrip.fare}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>25% Advance Paid:</Text>
              <Text style={[styles.infoValue, { color: KANDY_THEME.colors.success }]}>
                {activeTrip.advancePaid} (PAID)
              </Text>
            </View>

            {/* Assigned Driver Box */}
            <View style={styles.driverBox}>
              <Text style={styles.driverTitle}>Assigned Chauffeur:</Text>
              <Text style={styles.driverName}>{activeTrip.driverName}</Text>
              <TouchableOpacity
                style={styles.callButton}
                onPress={() => Alert.alert('Calling Driver', `Dialing +91 ${activeTrip.driverPhone}`)}
              >
                <Text style={styles.callButtonText}>📞 CALL CHAUFFEUR (+91 {activeTrip.driverPhone})</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Actions */}
          <TouchableOpacity
            style={styles.bookNewButton}
            onPress={() => Alert.alert('New Booking', 'Navigating to Intercity Booking Wizard...')}
          >
            <Text style={styles.bookNewText}>+ BOOK NEW CAB</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: KANDY_THEME.colors.bg,
  },
  header: {
    backgroundColor: KANDY_THEME.colors.ink,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBadge: {
    width: 36,
    height: 36,
    backgroundColor: KANDY_THEME.colors.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 18,
  },
  headerTitle: {
    color: KANDY_THEME.colors.primary,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  authCard: {
    backgroundColor: KANDY_THEME.colors.white,
    padding: 24,
    borderRadius: 14,
    shadowColor: KANDY_THEME.colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: KANDY_THEME.colors.ink,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    color: KANDY_THEME.colors.textMuted,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: KANDY_THEME.colors.textMuted,
    marginBottom: 6,
  },
  input: {
    backgroundColor: KANDY_THEME.colors.bg,
    borderWidth: 1,
    borderColor: KANDY_THEME.colors.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '600',
    color: KANDY_THEME.colors.ink,
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: KANDY_THEME.colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  demoOtpBox: {
    backgroundColor: KANDY_THEME.colors.primaryLight,
    padding: 10,
    borderRadius: 6,
    marginBottom: 14,
  },
  demoOtpText: {
    color: KANDY_THEME.colors.primary,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  tripCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: KANDY_THEME.colors.border,
    marginBottom: 16,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  tripRef: {
    fontSize: 16,
    fontWeight: '900',
    color: KANDY_THEME.colors.primary,
  },
  statusBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    color: '#92400E',
    fontWeight: '800',
    fontSize: 10,
  },
  routeContainer: {
    backgroundColor: KANDY_THEME.colors.bg,
    padding: 12,
    borderRadius: 8,
    marginBottom: 14,
  },
  routeText: {
    fontSize: 13,
    fontWeight: '700',
    color: KANDY_THEME.colors.ink,
  },
  routeArrow: {
    fontSize: 14,
    color: KANDY_THEME.colors.primary,
    marginVertical: 2,
    marginLeft: 6,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 12,
    color: KANDY_THEME.colors.textMuted,
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '700',
    color: KANDY_THEME.colors.ink,
  },
  driverBox: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 8,
    padding: 12,
    marginTop: 14,
  },
  driverTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065F46',
    textTransform: 'uppercase',
  },
  driverName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#064E3B',
    marginVertical: 4,
  },
  callButton: {
    backgroundColor: '#059669',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 6,
  },
  callButtonText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 11,
  },
  bookNewButton: {
    backgroundColor: KANDY_THEME.colors.ink,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: KANDY_THEME.colors.primary,
  },
  bookNewText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 13,
  },
});
