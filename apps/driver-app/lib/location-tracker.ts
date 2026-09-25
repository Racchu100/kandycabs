import * as Location from 'expo-location';
import { Linking, Platform } from 'react-native';
import { driverApiClient } from './api';

export interface LocationPoint {
  lat: number;
  lng: number;
  recordedAt: string;
}

export type LocationServiceStatus =
  | 'NOT_STARTED'
  | 'CHECKING_PERMISSIONS'
  | 'PERMISSION_DENIED'
  | 'SERVICES_DISABLED'
  | 'ACQUIRING'
  | 'READY'
  | 'ERROR';

export type LocationSource = 'lastKnown' | 'live' | 'manual' | 'none';

export interface LocationState {
  lat: number | null;
  lng: number | null;
  source: LocationSource;
  status: LocationServiceStatus;
  timestamp: number | null;
  errorMessage?: string;
}

export type LocationChangeListener = (
  lat: number | null,
  lng: number | null,
  state: LocationState
) => void;

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

  // Coordinates state: null until a real device fix is acquired
  private currentLat: number | null = null;
  private currentLng: number | null = null;
  private currentSource: LocationSource = 'none';
  private currentStatus: LocationServiceStatus = 'NOT_STARTED';
  private lastTimestamp: number | null = null;
  private errorMessage: string | undefined = undefined;
  private hasInitialFix: boolean = false;

  private lastSentLat: number = 0;
  private lastSentLng: number = 0;
  private isPinging: boolean = false;

  public isCurrentlyTracking(): boolean {
    return this.isTracking;
  }

  public getStatus(): LocationServiceStatus {
    return this.currentStatus;
  }

  public getState(): LocationState {
    return {
      lat: this.currentLat,
      lng: this.currentLng,
      source: this.currentSource,
      status: this.currentStatus,
      timestamp: this.lastTimestamp,
      errorMessage: this.errorMessage,
    };
  }

  public addListener(listener: LocationChangeListener) {
    this.listeners.add(listener);
    // Immediately emit current state to new subscriber
    listener(this.currentLat, this.currentLng, this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    const state = this.getState();
    this.listeners.forEach((fn) => {
      try {
        fn(this.currentLat, this.currentLng, state);
      } catch (_) {}
    });
  }

  public async requestPermissions(): Promise<{ granted: boolean; status: LocationServiceStatus; error?: string }> {
    try {
      this.currentStatus = 'CHECKING_PERMISSIONS';
      this.notifyListeners();

      // 1. Verify device location services (GPS hardware) are enabled
      const isLocationServicesEnabled = await Location.hasServicesEnabledAsync();
      if (!isLocationServicesEnabled) {
        try {
          if (Platform.OS === 'android') {
            await Location.enableNetworkProviderAsync();
          }
        } catch (_) {}

        const recheck = await Location.hasServicesEnabledAsync();
        if (!recheck) {
          this.currentStatus = 'SERVICES_DISABLED';
          this.hasPermission = false;
          this.errorMessage = 'Location Services (GPS) are disabled on this device.';
          this.notifyListeners();
          return { granted: false, status: 'SERVICES_DISABLED', error: this.errorMessage };
        }
      }

      // 2. Request runtime foreground location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        this.currentStatus = 'PERMISSION_DENIED';
        this.hasPermission = false;
        this.errorMessage = 'Location permission was denied by the user.';
        this.notifyListeners();
        return { granted: false, status: 'PERMISSION_DENIED', error: this.errorMessage };
      }

      this.hasPermission = true;
      this.errorMessage = undefined;
      this.currentStatus = this.hasInitialFix ? 'READY' : 'ACQUIRING';
      this.notifyListeners();
      return { granted: true, status: this.currentStatus };
    } catch (err: any) {
      console.warn('[LocationTracker] Permission request failed:', err);
      this.currentStatus = 'ERROR';
      this.hasPermission = false;
      this.errorMessage = err?.message || 'Failed to request location permissions';
      this.notifyListeners();
      return { granted: false, status: 'ERROR', error: this.errorMessage };
    }
  }

  public async openLocationSettings() {
    try {
      if (Platform.OS === 'android') {
        try {
          await Location.enableNetworkProviderAsync();
        } catch (_) {
          await Linking.openSettings();
        }
      } else {
        await Linking.openSettings();
      }
    } catch (_) {
      await Linking.openSettings();
    }
  }

  // Calculate distance between two lat/lng points in meters
  private getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
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
    this.currentSource = 'manual';
    this.hasInitialFix = true;
    this.currentStatus = 'READY';
    this.lastTimestamp = Date.now();
    this.notifyListeners();
    this.throttledSendLocationPing(true);
  }

  private async acquireInitialPosition() {
    // 1. Fast immediate fix from OS cache (< 50ms)
    try {
      const lastKnown = await Location.getLastKnownPositionAsync({
        maxAge: 600000, // up to 10 min cache
      });
      if (lastKnown && lastKnown.coords) {
        const { latitude, longitude } = lastKnown.coords;
        if (__DEV__) {
          console.log(`[LocationTracker] Acquired lastKnown location: lat=${latitude}, lng=${longitude}, time=${new Date().toISOString()}`);
        }
        if (this.currentSource !== 'live') {
          this.currentLat = latitude;
          this.currentLng = longitude;
          this.currentSource = 'lastKnown';
          this.hasInitialFix = true;
          this.currentStatus = 'READY';
          this.lastTimestamp = Date.now();
          this.notifyListeners();
          this.throttledSendLocationPing(true);
        }
      }
    } catch (e) {
      if (__DEV__) {
        console.log('[LocationTracker] getLastKnownPositionAsync unavailable, waiting for live fix');
      }
    }

    // 2. Single-shot fetch with bounded 5-second timeout (never blocks the watcher pipeline)
    this.fetchFreshCurrentPosition(5000);
  }

  private async fetchFreshCurrentPosition(timeoutMs: number = 5000) {
    try {
      const fetchPromise = Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        mayShowUserSettingsDialog: true,
      });

      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs));
      const loc = await Promise.race([fetchPromise, timeoutPromise]);

      if (loc && loc.coords) {
        const { latitude, longitude } = loc.coords;
        if (__DEV__) {
          console.log(`[LocationTracker] Acquired live single-shot location: lat=${latitude}, lng=${longitude}, time=${new Date().toISOString()}`);
        }
        this.currentLat = latitude;
        this.currentLng = longitude;
        this.currentSource = 'live';
        this.hasInitialFix = true;
        this.currentStatus = 'READY';
        this.lastTimestamp = Date.now();
        this.notifyListeners();
        this.throttledSendLocationPing(true);
      }
    } catch (err) {
      if (__DEV__) {
        console.log('[LocationTracker] Single-shot getCurrentPositionAsync completed or timed out; continuous watcher is active');
      }
    }
  }

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

    // Check & request permissions
    const permResult = await this.requestPermissions();
    if (!permResult.granted) {
      return;
    }

    // Trigger fast initial acquisition asynchronously (non-blocking)
    this.acquireInitialPosition();

    // Start continuous live GPS watcher immediately
    try {
      this.watchSubscription = await Location.watchPositionAsync(
        {
          accuracy,
          timeInterval,
          distanceInterval,
          mayShowUserSettingsDialog: true,
        },
        (loc) => {
          if (loc && loc.coords) {
            const { latitude, longitude } = loc.coords;
            if (__DEV__) {
              console.log(`[LocationTracker] Live GPS watch update: lat=${latitude}, lng=${longitude}, time=${new Date().toISOString()}`);
            }

            const deltaMeters =
              this.currentLat != null && this.currentLng != null
                ? this.getDistanceMeters(this.currentLat, this.currentLng, latitude, longitude)
                : 999;

            if (deltaMeters >= 3 || !this.hasInitialFix || this.currentSource !== 'live') {
              this.currentLat = latitude;
              this.currentLng = longitude;
              this.currentSource = 'live';
              this.hasInitialFix = true;
              this.currentStatus = 'READY';
              this.lastTimestamp = Date.now();
              this.notifyListeners();
              this.throttledSendLocationPing(false);
            }
          }
        }
      );
    } catch (err: any) {
      console.warn('[LocationTracker] Failed to start Location.watchPositionAsync:', err);
      this.currentStatus = 'ERROR';
      this.errorMessage = err?.message || 'Failed to start GPS location watcher';
      this.notifyListeners();
    }

    // Periodic heartbeat to maintain live driver location telemetry
    this.intervalTimer = setInterval(() => {
      if (this.currentLat != null && this.currentLng != null) {
        this.throttledSendLocationPing(true);
      }
    }, heartbeatMs);
  }

  public async forceImmediatePing() {
    if (!this.hasPermission) {
      const permResult = await this.requestPermissions();
      if (!permResult.granted) return;
    }
    await this.acquireInitialPosition();
  }

  // Throttled ping: avoids HTTP spam if pings happen within minInterval
  private throttledSendLocationPing(force: boolean = false) {
    if (this.currentLat == null || this.currentLng == null) {
      return;
    }

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
    if (this.isPinging || this.currentLat == null || this.currentLng == null) return;
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
    return {
      lat: this.currentLat,
      lng: this.currentLng,
      source: this.currentSource,
      status: this.currentStatus,
      hasInitialFix: this.hasInitialFix,
      tier: this.currentTier,
      isTracking: this.isTracking,
    };
  }
}

export const locationTracker = new LocationTrackerService();
