'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/Card';
import { calculateHaversineDistanceKm } from '@/lib/gpsTelemetryEngine';

interface Props {
  bookingReference?: string;
  tripState?: string;
}

export const DriverGpsTracker: React.FC<Props> = ({
  bookingReference = 'KC-88429',
  tripState = 'TRIP_STARTED',
}) => {
  const [permissionStatus, setPermissionStatus] = useState<'GRANTED' | 'DENIED' | 'PROMPT' | 'UNSUPPORTED'>('PROMPT');
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number; accuracy: number; speed: number } | null>({
    lat: 13.0827,
    lng: 74.7954,
    accuracy: 4.5,
    speed: 0,
  });
  const [isTransmitting, setIsTransmitting] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const prevCoordsRef = useRef<{ lat: number; lng: number; timestamp: number } | null>(null);

  const calculateSpeedKmh = (lat: number, lng: number, rawSpeedMs: number | null | undefined): number => {
    const now = Date.now();
    // 1. Native HTML5 Geolocation speed in meters/second -> convert to km/h
    if (typeof rawSpeedMs === 'number' && rawSpeedMs > 0) {
      const spd = Math.round(rawSpeedMs * 3.6);
      prevCoordsRef.current = { lat, lng, timestamp: now };
      return spd;
    }

    // 2. Fallback: Distance-over-Time Haversine Delta Velocity (when raw speed is 0/null on desktop/low-acc GPS)
    if (prevCoordsRef.current) {
      const dtSeconds = (now - prevCoordsRef.current.timestamp) / 1000;
      if (dtSeconds >= 1) {
        const distKm = calculateHaversineDistanceKm(prevCoordsRef.current.lat, prevCoordsRef.current.lng, lat, lng);
        prevCoordsRef.current = { lat, lng, timestamp: now };
        if (distKm >= 0.002) { // Moved >= 2 meters
          const speedFromDelta = Math.round(distKm / (dtSeconds / 3600));
          return Math.min(180, Math.max(0, speedFromDelta));
        }
      }
    } else {
      prevCoordsRef.current = { lat, lng, timestamp: now };
    }

    return 0;
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      setPermissionStatus('GRANTED');

      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, accuracy, speed } = pos.coords;
          const computedSpeed = calculateSpeedKmh(latitude, longitude, speed);
          setCurrentCoords({
            lat: latitude,
            lng: longitude,
            accuracy: accuracy || 5,
            speed: computedSpeed,
          });
          sendTelemetryToServer(latitude, longitude, accuracy || 5, computedSpeed);
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            setPermissionStatus('DENIED');
            setErrorMsg('GPS Permission Denied. Please enable Location Services in Chrome/Android browser settings.');
          } else {
            setErrorMsg('Weak GPS signal. Retrying telemetry acquisition...');
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    } else {
      setPermissionStatus('UNSUPPORTED');
    }
  }, [bookingReference, tripState]);

  const sendTelemetryToServer = async (lat: number, lng: number, acc: number, spd: number) => {
    try {
      const token = localStorage.getItem('kc_driver_token') || 'mock_driver_token';
      await fetch('/api/gps/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          latitude: lat,
          longitude: lng,
          accuracyMeters: acc,
          speedKmh: spd,
          bookingReference,
          tripState,
        }),
      });
      setIsTransmitting(true);
    } catch {
      setIsTransmitting(false);
    }
  };

  return (
    <Card padded style={{ background: '#F0FDF4', border: '1px solid var(--green)', marginTop: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h4 className="h4" style={{ color: 'var(--green)', margin: 0 }}>
            📍 High-Precision Operational Driver GPS
          </h4>
          <p style={{ fontSize: '12px', color: 'var(--ink)', margin: '2px 0 0' }}>
            Transmitting location every 5s for dispatch tracking & trip meter evidence.
          </p>
        </div>

        <span
          style={{
            background: isTransmitting ? 'var(--green)' : '#991B1B',
            color: '#fff',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 700,
          }}
        >
          {isTransmitting ? '📡 TRANSMITTING' : '⚠️ RECONNECTING'}
        </span>
      </div>

      {permissionStatus === 'DENIED' && (
        <div style={{ background: '#FFFBEB', border: '1.5px solid #FCD34D', padding: '12px 14px', borderRadius: 'var(--r-m)', marginTop: '10px', color: '#92400E' }}>
          <div style={{ fontWeight: 800, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            ⚠️ Location Access Denied / GPS Turned Off
          </div>
          <p style={{ margin: '4px 0 8px', fontSize: '12px', lineHeight: 1.4 }}>
            Please click <b>"Allow Location"</b> in your browser address bar or tap the button below to turn on & enable GPS location telemetry.
          </p>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined' && 'geolocation' in navigator) {
                navigator.geolocation.getCurrentPosition(
                  (pos) => {
                    setPermissionStatus('GRANTED');
                    setErrorMsg(null);
                    setCurrentCoords({
                      lat: pos.coords.latitude,
                      lng: pos.coords.longitude,
                      accuracy: pos.coords.accuracy || 5,
                      speed: pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0,
                    });
                  },
                  (err) => {
                    setPermissionStatus('DENIED');
                    setErrorMsg('Location access denied. Please click "Allow Location" in your browser address bar.');
                  },
                  { enableHighAccuracy: true }
                );
              }
            }}
            style={{
              background: '#D97706',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            📡 Turn On & Allow GPS Location
          </button>
        </div>
      )}

      {errorMsg && permissionStatus !== 'DENIED' && (
        <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '8px 12px', borderRadius: 'var(--r-m)', fontSize: '12px', marginTop: '10px', fontWeight: 600 }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {currentCoords && (
        <div className="sum" style={{ background: '#fff', padding: '10px', borderRadius: 'var(--r-m)', marginTop: '10px', fontSize: '12.5px' }}>
          <div className="srow">
            <span>Coordinates (Lat, Lng)</span>
            <b>{currentCoords.lat.toFixed(4)}, {currentCoords.lng.toFixed(4)}</b>
          </div>
          <div className="srow">
            <span>Current Speed</span>
            <b>{currentCoords.speed} km/h</b>
          </div>
          <div className="srow">
            <span>GPS Accuracy</span>
            <b style={{ color: currentCoords.accuracy > 50 ? '#92400E' : 'var(--green)' }}>
              ±{currentCoords.accuracy.toFixed(1)} meters {currentCoords.accuracy > 50 && '(Low Accuracy)'}
            </b>
          </div>
        </div>
      )}
    </Card>
  );
};
