import { Platform } from 'react-native';
import { KandyApiClient, TokenStorage } from '@kandy-cabs/shared';

// Memory / Session token & profile storage for customer mobile app
class MobileTokenStorage implements TokenStorage {
  private token: string | null = null;
  private user: any | null = null;
  private listeners: Array<() => void> = [];

  getToken(): string | null {
    return this.token;
  }

  setToken(token: string): void {
    this.token = token;
    this.notify();
  }

  removeToken(): void {
    this.token = null;
    this.user = null;
    this.notify();
  }

  getUser(): any | null {
    return this.user;
  }

  setUser(user: any | null): void {
    this.user = user;
    this.notify();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => {
      try {
        l();
      } catch (e) {
        console.warn('Storage listener error:', e);
      }
    });
  }
}

export const customerTokenStorage = new MobileTokenStorage();

import Constants from 'expo-constants';

export function getDynamicBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/+$/, '');
  }
  return 'https://web-rgwp.vercel.app';
}

export const customerApiClient = new KandyApiClient({
  baseUrl: getDynamicBaseUrl,
  tokenStorage: customerTokenStorage,
});

export function formatDisplayPhone(rawPhone?: string | null): string {
  if (!rawPhone) return '';
  const digits = String(rawPhone).replace(/\D/g, '');
  const tenDigits = digits.slice(-10);
  if (!tenDigits) return '';
  return `+91 ${tenDigits}`;
}

