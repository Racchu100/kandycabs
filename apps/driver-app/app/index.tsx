import 'fast-text-encoding';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, Image, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { driverApiClient } from '../lib/api';

export default function DriverAppIndex() {
  const router = useRouter();
  const [networkError, setNetworkError] = useState(false);

  useEffect(() => {
    checkDriverStatus();
  }, []);

  const checkDriverStatus = async () => {
    setNetworkError(false);

    try {
      // 1. Check if an authentication token exists (Case 1: No token)
      const token = await driverApiClient.getToken();
      if (!token) {
        // Immediately navigate to login with zero network overhead
        router.replace('/login');
        return;
      }

      // 2. Token exists -> Verify token with /api/driver/status (Case 2: Token exists)
      const statusRes = await driverApiClient.fetch('/api/driver/status');
      if (statusRes?.success && statusRes?.driver) {
        router.replace('/dashboard');
      } else {
        // Invalid or inactive driver payload -> clear token & go to login
        await driverApiClient.removeToken();
        router.replace('/login');
      }
    } catch (err: any) {
      if (err?.status === 401 || err?.status === 403) {
        // Expired or invalid token -> clear token & go to login
        await driverApiClient.removeToken();
        router.replace('/login');
      } else {
        // Temporary network or connection failure:
        // Do NOT create an infinite redirect loop. Expose retry / login fallback.
        setNetworkError(true);
      }
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
      {networkError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Connection Issue</Text>
          <Text style={styles.errorSubtitle}>
            Unable to connect to server. Please check your internet connection.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={checkDriverStatus}>
            <Text style={styles.retryButtonText}>Retry Connection</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.loginFallbackButton}
            onPress={async () => {
              await driverApiClient.removeToken();
              router.replace('/login');
            }}
          >
            <Text style={styles.loginFallbackText}>Go to Login Screen</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ActivityIndicator size="large" color="#ea580c" style={{ marginTop: 28 }} />
      )}
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
  errorContainer: {
    marginTop: 28,
    alignItems: 'center',
    paddingHorizontal: 16,
    width: '100%',
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f87171',
    marginBottom: 6,
  },
  errorSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  retryButton: {
    backgroundColor: '#ea580c',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  loginFallbackButton: {
    paddingVertical: 8,
  },
  loginFallbackText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
