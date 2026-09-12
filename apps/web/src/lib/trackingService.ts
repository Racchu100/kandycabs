/**
 * Driver Tracking & Telemetry Service Abstraction
 * Designed for clean plug-and-play architecture (LocalTrackingService -> SupabaseTrackingService)
 */

export interface LocationPayload {
  bookingId: string;
  driverId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number | null;
  speed?: number | null;
  timestamp: string;
  status: string;
  locationName?: string;
}

export type TrackingState =
  | 'LOCATION_PERMISSION_REQUIRED'
  | 'WAITING_FOR_GPS'
  | 'GPS_ACTIVE'
  | 'CUSTOMER_LOCATION_CONFIRMED'
  | 'NAVIGATION_STARTED'
  | 'DRIVER_APPROACHING_PICKUP'
  | 'DRIVER_ARRIVED'
  | 'TRIP_STARTED'
  | 'TRACKING_STOPPED';

export interface ITrackingService {
  sendLocation(payload: LocationPayload): Promise<boolean>;
  confirmCustomerLocation(bookingId: string, lat: number, lng: number): Promise<boolean>;
  updateTrackingStatus(bookingId: string, status: TrackingState): Promise<boolean>;
  getConfirmedCustomerLocation(bookingId: string): Promise<{ lat: number; lng: number } | null>;
}

class LocalTrackingService implements ITrackingService {
  async sendLocation(payload: LocationPayload): Promise<boolean> {
    try {
      const res = await fetch('/api/driver/trip/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: payload.bookingId,
          driverId: payload.driverId,
          lat: payload.latitude,
          lng: payload.longitude,
          latitude: payload.latitude,
          longitude: payload.longitude,
          accuracy: payload.accuracy,
          heading: payload.heading,
          speedKmh: payload.speed ? Math.round(payload.speed * 3.6) : 0,
          locationName: payload.locationName,
          trackingStatus: payload.status,
          timestamp: payload.timestamp,
        }),
      });
      return res.ok;
    } catch (err) {
      console.warn('[LocalTrackingService] Location telemetry error:', err);
      return false;
    }
  }

  async confirmCustomerLocation(bookingId: string, lat: number, lng: number): Promise<boolean> {
    try {
      const res = await fetch('/api/driver/trip/confirm-pickup-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, lat, lng }),
      });
      return res.ok;
    } catch (err) {
      console.warn('[LocalTrackingService] Confirm customer location error:', err);
      return false;
    }
  }

  async updateTrackingStatus(bookingId: string, status: TrackingState): Promise<boolean> {
    try {
      const res = await fetch('/api/driver/trip/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, trackingStatus: status }),
      });
      return res.ok;
    } catch (err) {
      console.warn('[LocalTrackingService] Update tracking status error:', err);
      return false;
    }
  }

  async getConfirmedCustomerLocation(bookingId: string): Promise<{ lat: number; lng: number } | null> {
    try {
      const res = await fetch(`/api/driver/trip/${bookingId}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.trip?.confirmedPickupLat && data?.trip?.confirmedPickupLng) {
          return {
            lat: data.trip.confirmedPickupLat,
            lng: data.trip.confirmedPickupLng,
          };
        }
      }
      return null;
    } catch (err) {
      return null;
    }
  }
}

// Export singleton service instance
export const trackingService: ITrackingService = new LocalTrackingService();
