import 'fast-text-encoding';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { driverApiClient } from '../lib/api';
import { DriverVerificationStatus } from '@kandy-cabs/shared';

export default function DriverAppIndex() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkDriverStatus();
  }, []);

  const checkDriverStatus = async () => {
    setChecking(true);
    try {
      const statusRes = await driverApiClient.fetch('/api/driver/status');
      if (statusRes.success && statusRes.driver) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    } catch (err) {
      // Unauthenticated -> navigate to login
      router.replace('/login');
    } finally {
      setChecking(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/images/logo-white.png')}
        style={styles.logoImage}
        resizeMode="contain"
      />
      <View style={styles.badge}>
        <Text style={styles.badgeText}>Driver Partner Network</Text>
      </View>
      <ActivityIndicator size="large" color="#ea580c" style={{ marginTop: 28 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f1d',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  logoImage: {
    width: 240,
    height: 75,
    marginBottom: 10,
  },
  badge: {
    backgroundColor: 'rgba(234, 88, 12, 0.15)',
    borderColor: 'rgba(234, 88, 12, 0.4)',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 4,
  },
  badgeText: {
    fontSize: 12,
    color: '#fb923c',
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
