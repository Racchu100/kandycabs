import { Platform } from 'react-native';
import { customerApiClient } from './api';

let appSessionId: string = 'app_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now();

export type AppAnalyticsEventType =
  | 'VISIT'
  | 'VIEW_RATES'
  | 'VIEW_HATCHBACK'
  | 'VIEW_SEDAN'
  | 'VIEW_SUV'
  | 'VIEW_SUV_PREMIUM'
  | 'VIEW_TEMPO_TRAVELER'
  | 'STARTED_BOOKING'
  | 'COMPLETED_BOOKING';

export interface AppAnalyticsPayload {
  category?: string;
  tripType?: string;
  pickup?: string;
  drop?: string;
  metadata?: Record<string, any>;
}

export function trackAppEvent(eventType: AppAnalyticsEventType, payload: AppAnalyticsPayload = {}) {
  try {
    const device = Platform.OS === 'ios' ? 'iOS' : Platform.OS === 'android' ? 'Android' : 'Mobile';

    customerApiClient
      .fetch('/api/analytics/event', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: appSessionId,
          platform: 'CUSTOMER_APP',
          device,
          browser: 'Kandy Cabs App',
          city: 'Karnataka',
          referrer: 'App Launch',
          eventType,
          category: payload.category,
          tripType: payload.tripType,
          pickup: payload.pickup,
          drop: payload.drop,
          metadata: payload.metadata,
        }),
      })
      .catch(() => {});
  } catch (_) {
    // Non-blocking catch
  }
}
