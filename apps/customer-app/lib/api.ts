import { Platform } from 'react-native';
import { KandyApiClient, TokenStorage } from '@kandy-cabs/shared';

// Memory / Async token storage for customer mobile app
class MobileTokenStorage implements TokenStorage {
  private token: string | null = null;

  getToken(): string | null {
    return this.token;
  }

  setToken(token: string): void {
    this.token = token;
  }

  removeToken(): void {
    this.token = null;
  }
}

export const customerTokenStorage = new MobileTokenStorage();

import Constants from 'expo-constants';

function getDynamicBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // 1. If running under Expo (Expo Go or Dev Client on physical phone/emulator)
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest?.debuggerHost ||
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;
  if (hostUri) {
    const hostIp = hostUri.split(':')[0];
    if (hostIp && hostIp !== 'localhost' && hostIp !== '127.0.0.1') {
      return `http://${hostIp}:3000`;
    }
  }

  // 2. Production cloud fallback
  return 'https://web-rgwp.vercel.app';
}

export const customerApiClient = new KandyApiClient({
  baseUrl: getDynamicBaseUrl(),
  tokenStorage: customerTokenStorage,
});

