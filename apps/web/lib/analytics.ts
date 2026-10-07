// Lightweight Web Analytics Tracker for Kandy Cabs
const SESSION_KEY = 'kandy_analytics_session_id';

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return 'server_session';
  try {
    let sid = localStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = 'web_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now();
      localStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return 'fallback_session_' + Date.now();
  }
}

export type WebAnalyticsEventType =
  | 'VISIT'
  | 'VIEW_RATES'
  | 'VIEW_HATCHBACK'
  | 'VIEW_SEDAN'
  | 'VIEW_SUV'
  | 'VIEW_SUV_PREMIUM'
  | 'VIEW_TEMPO_TRAVELER'
  | 'STARTED_BOOKING'
  | 'COMPLETED_BOOKING';

export interface AnalyticsPayload {
  category?: string;
  tripType?: string;
  pickup?: string;
  drop?: string;
  metadata?: Record<string, any>;
}

export async function trackWebEvent(eventType: WebAnalyticsEventType, payload: AnalyticsPayload = {}) {
  if (typeof window === 'undefined') return;

  try {
    const sessionId = getOrCreateSessionId();
    const userAgent = navigator.userAgent || '';
    let device = 'Desktop';
    if (/android/i.test(userAgent)) device = 'Android Web';
    else if (/iphone|ipad|ipod/i.test(userAgent)) device = 'iOS Web';
    else if (/windows/i.test(userAgent)) device = 'Windows';
    else if (/mac/i.test(userAgent)) device = 'Mac';

    // Asynchronous non-blocking fire-and-forget beacon
    fetch('/api/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        platform: device.includes('Web') ? 'MOBILE_WEB' : 'WEB',
        device,
        browser: navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Safari',
        city: 'Mangaluru / Karnataka',
        referrer: document.referrer || 'Direct',
        eventType,
        category: payload.category,
        tripType: payload.tripType,
        pickup: payload.pickup,
        drop: payload.drop,
        metadata: payload.metadata,
      }),
      keepalive: true,
    }).catch(() => {});
  } catch (err) {
    // Non-blocking catch
  }
}
