import * as Location from 'expo-location';
import { driverApiClient } from './api';

export interface LocationPoint {
  lat: number;
  lng: number;
  recordedAt: string;
}

type LocationChangeListener = (lat: number, lng: number) => void;

class LocationTrackerService {
  private isTracking: boolean = false;
  private currentTier: 'IDLE' | 'ACTIVE_TRIP' = 'IDLE';
  private activeBookingId: string | null = null;
  private intervalTimer: any = null;
  private watchSubscription: Location.LocationSubscription | null = null;
  private batchedPoints: LocationPoint[] = [];
  private hasPermission: boolean = false;
  private lastPingTime: number = 0;
  private listeners: Set<LocationChangeListener> = new Set();

  // Real GPS coordinates (initial fix default)
  private currentLat: number = 12.9716;
  private currentLng: number = 77.5946;

  public isCurrentlyTracking(): boolean {
    return this.isTracking;
  }

  public addListener(listener: LocationChangeListener) {
    this.listeners.add(listener);
    listener(this.currentLat, this.currentLng);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((fn) => {
      try {
        fn(this.currentLat, this.currentLng);
      } catch (_) {}
    });
  }

  public async requestPermissions(): Promise<boolean> {
    try {
      const isLocationServicesEnabled = await Location.hasServicesEnabledAsync();
      if (!isLocationServicesEnabled) {
        try {
          await Location.enableNetworkProviderAsync();
        } catch (_) {}
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      this.hasPermission = status === 'granted';
      return this.hasPermission;
    } catch (err) {
      console.warn('Location permission request failed:', err);
      return false;
    }
  }

  private lastSentLat: number = 0;
  private lastSentLng: number = 0;

  // Calculate distance between two lat/lng points in meters
  private getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  public async startIdleTracking() {
    if (this.isTracking && this.currentTier === 'IDLE') {
      return;
    }
    this.currentTier = 'IDLE';
    this.activeBookingId = null;
    await this.requestPermissions();
    await this.startWatchAndHeartbeat(
      Location.Accuracy.Balanced,
      5000, // 5s interval
      15,   // 15m distance threshold
      10000 // 10s heartbeat
    );
  }

  public async startActiveTripTracking(bookingId: string) {
    if (this.isTracking && this.currentTier === 'ACTIVE_TRIP' && this.activeBookingId === bookingId) {
      return;
    }
    this.currentTier = 'ACTIVE_TRIP';
    this.activeBookingId = bookingId;
    await this.requestPermissions();
    await this.startWatchAndHeartbeat(
      Location.Accuracy.High,
      3000, // 3s interval
      8,    // 8m distance threshold
      5000  // 5s heartbeat
    );
  }

  public stopTracking() {
    if (this.watchSubscription) {
      this.watchSubscription.remove();
      this.watchSubscription = null;
    }
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    this.isTracking = false;
    this.activeBookingId = null;
  }

  public updateManualPosition(lat: number, lng: number) {
    this.currentLat = lat;
    this.currentLng = lng;
    this.notifyListeners();
    this.throttledSendLocationPing(true);
  }

  private hasInitialFix: boolean = false;

  private async startWatchAndHeartbeat(
    accuracy: Location.Accuracy,
    timeInterval: number,
    distanceInterval: number,
    heartbeatMs: number
  ) {
    if (this.watchSubscription) {
      this.watchSubscription.remove();
      this.watchSubscription = null;
    }
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }

    this.isTracking = true;

    // 1. Fetch initial position once if not acquired
    if (!this.hasInitialFix) {
      await this.fetchInitialDeviceLocation();
    }

    // 2. Start adaptive battery-friendly GPS watcher
    try {
      if (this.hasPermission) {
        this.watchSubscription = await Location.watchPositionAsync(
          {
            accuracy,
            timeInterval,
            distanceInterval,
            mayShowUserSettingsDialog: false,
          },
          (loc) => {
            if (loc && loc.coords) {
              const { latitude, longitude } = loc.coords;
              const deltaMeters = this.getDistanceMeters(
                this.currentLat,
                this.currentLng,
                latitude,
                longitude
              );

              // Update state & notify UI if moved >= 3 meters
              if (deltaMeters >= 3 || !this.hasInitialFix) {
                this.currentLat = latitude;
                this.currentLng = longitude;
                this.hasInitialFix = true;
                this.notifyListeners();
                this.throttledSendLocationPing(false);
              }
            }
          }
        );
      }
    } catch (err) {
      console.warn('Failed to start Location.watchPositionAsync:', err);
    }

    // 3. Regular heartbeat timer to ensure persistent connection
    this.intervalTimer = setInterval(() => {
      this.throttledSendLocationPing(true);
    }, heartbeatMs);
  }

  private async fetchInitialDeviceLocation() {
    try {
      if (!this.hasPermission) {
        await this.requestPermissions();
      }

      if (this.hasPermission) {
        try {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          if (loc && loc.coords) {
            this.currentLat = loc.coords.latitude;
            this.currentLng = loc.coords.longitude;
            this.hasInitialFix = true;
            this.notifyListeners();
          }
        } catch (_) {}
      }
    } catch (err) {
      console.warn('Could not acquire initial GPS location:', err);
    }
    await this.sendLocationPing();
  }

  public async forceImmediatePing() {
    await this.fetchInitialDeviceLocation();
  }

  private isPinging: boolean = false;

  // Throttled ping: avoids HTTP spam if pings happen within minInterval
  private throttledSendLocationPing(force: boolean = false) {
    const now = Date.now();
    const minInterval = this.currentTier === 'ACTIVE_TRIP' ? 2500 : 4500;
    const timeSinceLastPing = now - this.lastPingTime;
    const distanceSinceLastSent = this.getDistanceMeters(
      this.lastSentLat,
      this.lastSentLng,
      this.currentLat,
      this.currentLng
    );

    if (force || timeSinceLastPing >= minInterval || distanceSinceLastSent >= 20) {
      this.sendLocationPing();
    }
  }

  private async sendLocationPing() {
    if (this.isPinging) return;
    this.isPinging = true;

    this.lastPingTime = Date.now();
    this.lastSentLat = this.currentLat;
    this.lastSentLng = this.currentLng;

    const point: LocationPoint = {
      lat: this.currentLat,
      lng: this.currentLng,
      recordedAt: new Date().toISOString(),
    };

    this.batchedPoints.push(point);

    if (this.batchedPoints.length > 10) {
      this.batchedPoints = this.batchedPoints.slice(-10);
    }

    try {
      await driverApiClient.fetch('/api/driver/ping', {
        method: 'POST',
        body: JSON.stringify({
          lat: this.currentLat,
          lng: this.currentLng,
          bookingId: this.activeBookingId,
          batchedPoints: this.batchedPoints,
        }),
      });

      this.batchedPoints = [];
    } catch (error) {
      // Retain silently for retry
    } finally {
      this.isPinging = false;
    }
  }

  public getCurrentCoordinates() {
    return { lat: this.currentLat, lng: this.currentLng, tier: this.currentTier, isTracking: this.isTracking };
  }
}

export const locationTracker = new LocationTrackerService();
