import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const TRIP_PROCESS_KEY = 'kandy_trip_in_process_';
const listeners: Array<() => void> = [];

export function subscribeTripState(listener: () => void) {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

function notifyTripState() {
  listeners.forEach((l) => {
    try {
      l();
    } catch (_) {}
  });
}

// In-memory cache for fast synchronous access during renders
const memoryState: Record<string, boolean> = {};

export async function setTripInProcess(bookingId: string, inProcess: boolean): Promise<void> {
  if (!bookingId) return;
  memoryState[bookingId] = inProcess;
  const key = `${TRIP_PROCESS_KEY}${bookingId}`;
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        if (inProcess) {
          localStorage.setItem(key, 'true');
        } else {
          localStorage.removeItem(key);
        }
      }
    } else {
      if (inProcess) {
        await SecureStore.setItemAsync(key, 'true');
      } else {
        await SecureStore.deleteItemAsync(key);
      }
    }
  } catch (_) {}
  notifyTripState();
}

export async function getTripInProcess(bookingId: string): Promise<boolean> {
  if (!bookingId) return false;
  if (typeof memoryState[bookingId] === 'boolean') {
    return memoryState[bookingId];
  }
  const key = `${TRIP_PROCESS_KEY}${bookingId}`;
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = localStorage.getItem(key) === 'true';
        const changed = memoryState[bookingId] !== val;
        memoryState[bookingId] = val;
        if (changed) notifyTripState();
        return val;
      }
    } else {
      const val = (await SecureStore.getItemAsync(key)) === 'true';
      const changed = memoryState[bookingId] !== val;
      memoryState[bookingId] = val;
      if (changed) notifyTripState();
      return val;
    }
  } catch (_) {}
  return false;
}

export function getTripInProcessSync(bookingId: string): boolean {
  if (!bookingId) return false;
  if (typeof memoryState[bookingId] === 'boolean') {
    return memoryState[bookingId];
  }
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    const val = localStorage.getItem(`${TRIP_PROCESS_KEY}${bookingId}`) === 'true';
    memoryState[bookingId] = val;
    return val;
  }
  return false;
}
