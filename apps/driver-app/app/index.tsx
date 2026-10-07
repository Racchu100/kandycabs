import 'fast-text-encoding';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, Image, TouchableOpacity, StatusBar, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { driverApiClient } from '../lib/api';

export default function DriverAppIndex() {
  const router = useRouter();
  const [networkError, setNetworkError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(() => {
      if (isMounted) {
        checkDriverStatus();
      }
    }, 120);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  const checkDriverStatus = async () => {
    setNetworkError(false);

    try {
      // 1. Check if an authentication token exists (Case 1: No token)
      const token = await driverApiClient.getToken();
      if (!token) {
        // Navigate to login safely
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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={false} />

      <View style={styles.centerBox}>
        <Image
          source={require('../assets/images/logo.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <View style={styles.badge}>
          <Text style={styles.badgeText}>DRIVER PARTNER NETWORK</Text>
        </View>

        {networkError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Connection Issue</Text>
            <Text style={styles.errorSubtitle}>
              Unable to connect to server. Please check your internet connection.
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={checkDriverStatus} activeOpacity={0.85}>
              <Text style={styles.retryButtonText}>Retry Connection</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.loginFallbackButton}
              onPress={async () => {
                await driverApiClient.removeToken();
                router.replace('/login');
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.loginFallbackText}>Go to Login Screen</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.spinnerWrapper}>
            <ActivityIndicator size="large" color="#ea580c" />
            <Text style={styles.loadingText}>Starting Driver App...</Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Safe • Reliable • 24/7 Outstation & City Cabs</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  logoImage: {
    width: 260,
    height: 90,
    marginBottom: 12,
  },
  badge: {
    backgroundColor: 'rgba(234, 88, 12, 0.09)',
    borderColor: 'rgba(234, 88, 12, 0.35)',
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 24,
    marginTop: 4,
  },
  badgeText: {
    fontSize: 11.5,
    color: '#ea580c',
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  spinnerWrapper: {
    marginTop: 36,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 12.5,
    color: '#64748b',
    fontWeight: '600',
  },
  errorContainer: {
    marginTop: 32,
    alignItems: 'center',
    paddingHorizontal: 16,
    width: '100%',
    maxWidth: 320,
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ef4444',
    marginBottom: 6,
  },
  errorSubtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  retryButton: {
    backgroundColor: '#ea580c',
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 10,
    marginBottom: 10,
    width: '100%',
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 13.5,
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
  footer: {
    paddingBottom: 8,
  },
  footerText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
});
