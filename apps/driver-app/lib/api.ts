import { Platform } from 'react-native';
import { KandyApiClient, TokenStorage } from '@kandy-cabs/shared';

// Memory/Async token storage for mobile with Web localStorage persistence
class MobileTokenStorage implements TokenStorage {
  private token: string | null = null;

  getToken(): string | null {
    if (!this.token && typeof window !== 'undefined' && window.localStorage) {
      try {
        this.token = window.localStorage.getItem('kandy_driver_token');
      } catch (e) {
        // ignore
      }
    }
    return this.token;
  }

  setToken(token: string): void {
    this.token = token;
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem('kandy_driver_token', token);
      } catch (e) {
        // ignore
      }
    }
  }

  removeToken(): void {
    this.token = null;
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem('kandy_driver_token');
      } catch (e) {
        // ignore
      }
    }
  }
}

export const driverTokenStorage = new MobileTokenStorage();

import Constants from 'expo-constants';

function getDynamicBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // 1. If running under Expo (Expo Go or Dev Client on physical phone/emulator)
  const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest?.debuggerHost || (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;
  if (hostUri) {
    const hostIp = hostUri.split(':')[0];
    if (hostIp && hostIp !== 'localhost' && hostIp !== '127.0.0.1') {
      return `http://${hostIp}:3000`;
    }
  }

  // 2. Production cloud fallback
  return 'https://web-rgwp.vercel.app';
}

export const driverApiClient = new KandyApiClient({
  baseUrl: getDynamicBaseUrl(),
  tokenStorage: driverTokenStorage,
});

