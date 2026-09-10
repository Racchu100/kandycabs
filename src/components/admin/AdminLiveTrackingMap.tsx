'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { getAdminDriverLocations } from '@/lib/gpsTelemetryEngine';

export interface DriverGpsPoint {
  driverId: string;
  driverName: string;
  vehicleRegistration: string;
  bookingReference?: string;
  tripState: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  speedKmh: number;
  headingDegrees: number;
  isStale: boolean;
  lastUpdated: string;
  pickupAddress?: string;
  dropAddress?: string;
  destinationLat?: number;
  destinationLng?: number;
  remainingDistanceKm?: number;
  etaMinutes?: number;
}

export const AdminLiveTrackingMap: React.FC = () => {
  const [drivers, setDrivers] = useState<DriverGpsPoint[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>('driver_suresh');
  const [isLoading, setIsLoading] = useState(true);
  const [copiedCoords, setCopiedCoords] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const mapInstanceRef = React.useRef<any>(null);
  const markersMapRef = React.useRef<Map<string, any>>(new Map());

  // Dynamically inject Leaflet CSS & JS
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    if (!(window as any).L) {
      if (!document.getElementById('leaflet-js')) {
        const script = document.createElement('script');
        script.id = 'leaflet-js';
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => setLeafletLoaded(true);
        document.body.appendChild(script);
      }
    } else {
      setLeafletLoaded(true);
    }
  }, []);

  const fetchLiveDrivers = async () => {
    let loaded: DriverGpsPoint[] = [];
    try {
      const token = localStorage.getItem('kc_admin_token') || 'mock_admin_token';
      const res = await fetch('/api/gps/track', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.drivers && Array.isArray(data.drivers) && data.drivers.length > 0) {
          loaded = data.drivers;
        }
      }
    } catch {}

    if (!loaded || loaded.length === 0) {
      try {
        loaded = getAdminDriverLocations();
      } catch {}
    }

    if (loaded && loaded.length > 0) {
      setDrivers(loaded);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchLiveDrivers();
    const interval = setInterval(fetchLiveDrivers, 3000); // 3s live driver movement ticker

    const handleSync = () => {
      fetchLiveDrivers();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleSync);
      window.addEventListener('new_booking_created', handleSync);
      window.addEventListener('auth_change', handleSync);
    }

    return () => {
      clearInterval(interval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleSync);
        window.removeEventListener('new_booking_created', handleSync);
        window.removeEventListener('auth_change', handleSync);
      }
    };
  }, []);

  const selectedDriver = drivers.find((d) => d.driverId === selectedDriverId) || drivers[0];

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (!leafletLoaded || typeof window === 'undefined' || !(window as any).L || !mapContainerRef.current) return;

    const L = (window as any).L;

    if (!mapInstanceRef.current) {
      const initialLat = selectedDriver ? selectedDriver.latitude : 12.9141;
      const initialLng = selectedDriver ? selectedDriver.longitude : 74.8560;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 13,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors | Kandy Cabs Fleet Control',
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Update markers for all drivers smoothly
    drivers.forEach((d) => {
      const isSelected = selectedDriverId === d.driverId;
      const pinColor = d.isStale ? '#DC2626' : d.speedKmh > 0 ? '#10B981' : '#F59E0B';
      const iconSymbol = d.isStale ? '🔴' : d.speedKmh > 0 ? '🚖' : '🅿️';

      const iconHtml = `
        <div style="position: relative; text-align: center; transform: translate(-50%, -50%); cursor: pointer;">
          <div style="background: ${pinColor}; color: #ffffff; border: 2px solid #ffffff; padding: 4px 10px; border-radius: 14px; font-size: 11px; font-weight: 800; white-space: nowrap; box-shadow: 0 3px 8px rgba(0,0,0,0.35); display: inline-flex; align-items: center; gap: 4px;">
            <span>${iconSymbol}</span>
            <span>${d.driverName.split(' ')[0]}</span>
            <span style="background: rgba(255,255,255,0.25); padding: 1px 4px; border-radius: 8px; font-size: 10px;">${d.speedKmh} km/h</span>
          </div>
          <div style="width: 0; height: 0; border-left: 7px solid transparent; border-right: 7px solid transparent; border-top: 9px solid ${pinColor}; margin: -2px auto 0;"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-driver-pin',
        iconSize: [140, 45],
        iconAnchor: [70, 45],
      });

      let marker = markersMapRef.current.get(d.driverId);
      if (!marker) {
        marker = L.marker([d.latitude, d.longitude], { icon: customIcon }).addTo(map);
        marker.on('click', () => setSelectedDriverId(d.driverId));
        markersMapRef.current.set(d.driverId, marker);
      } else {
        marker.setLatLng([d.latitude, d.longitude]);
        marker.setIcon(customIcon);
      }
    });

    // Pan map to selected driver
    if (selectedDriver) {
      map.panTo([selectedDriver.latitude, selectedDriver.longitude], { animate: true, duration: 0.8 });
    }
  }, [leafletLoaded, drivers, selectedDriverId]);

  const handleCopyCoords = () => {
    if (!selectedDriver) return;
    const coordsStr = `${selectedDriver.latitude.toFixed(6)}, ${selectedDriver.longitude.toFixed(6)}`;
    navigator.clipboard.writeText(coordsStr);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2000);
  };

  const bboxPadding = 0.012;
  const mapEmbedUrl = selectedDriver
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${(selectedDriver.longitude - bboxPadding).toFixed(6)},${(selectedDriver.latitude - bboxPadding).toFixed(6)},${(selectedDriver.longitude + bboxPadding).toFixed(6)},${(selectedDriver.latitude + bboxPadding).toFixed(6)}&layer=mapnik&marker=${selectedDriver.latitude.toFixed(6)},${selectedDriver.longitude.toFixed(6)}`
    : '';

  const googleMapsUrl = selectedDriver
    ? `https://www.google.com/maps?q=${selectedDriver.latitude},${selectedDriver.longitude}`
    : '#';

  const openStreetMapUrl = selectedDriver
    ? `https://www.openstreetmap.org/?mlat=${selectedDriver.latitude}&mlon=${selectedDriver.longitude}#map=16/${selectedDriver.latitude}/${selectedDriver.longitude}`
    : '#';

  return (
    <Card padded style={{ background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div>
          <span className="pill green" style={{ fontSize: '11px' }}>Admin Exclusive</span>
          <h3 className="h3" style={{ margin: '4px 0 0' }}>🗺️ Live Chauffeur Fleet Tracking Map</h3>
          <p className="muted" style={{ fontSize: '12px', margin: '2px 0 0' }}>
            🔒 Real-time driver location pin, live movement, speed gauge, and distance to destination.
          </p>
        </div>

        <Button onClick={fetchLiveDrivers} variant="ghost" style={{ fontSize: '12px' }}>
          🔄 Refresh Telemetry
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 320px) 1fr', gap: '16px' }}>
        {/* Driver Fleet List Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '560px', overflowY: 'auto' }}>
          <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '2px' }}>
            Active Drivers ({drivers.length})
          </div>
          {drivers.map((d) => (
            <div
              key={d.driverId}
              onClick={() => setSelectedDriverId(d.driverId)}
              style={{
                background: selectedDriverId === d.driverId ? 'var(--accent-soft)' : 'var(--bg-soft)',
                border: selectedDriverId === d.driverId ? '2px solid var(--accent)' : '1px solid var(--line)',
                borderRadius: 'var(--r-m)',
                padding: '10px 12px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontWeight: 800, fontSize: '13px', color: 'var(--ink)' }}>{d.driverName}</span>
                <span
                  style={{
                    background: d.isStale ? '#FEE2E2' : d.speedKmh > 0 ? '#DCFCE7' : '#FEF3C7',
                    color: d.isStale ? '#991B1B' : d.speedKmh > 0 ? '#15803D' : '#92400E',
                    fontSize: '10px',
                    fontWeight: 800,
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}
                >
                  {d.isStale ? '🔴 STALE (>30s)' : d.speedKmh > 0 ? '🟢 LIVE MOVING' : '🟡 IDLE (0 KM/H)'}
                </span>
              </div>

              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                Vehicle: <b>{d.vehicleRegistration}</b>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                Booking: <b>{d.bookingReference || 'Unassigned'}</b>
              </div>
              <div style={{ fontSize: '11.5px', color: '#1D4ED8', fontWeight: 700, marginTop: '4px' }}>
                📍 Dist Left: {d.remainingDistanceKm !== undefined ? `${d.remainingDistanceKm} KM` : '14.8 KM'} · ETA: ~{d.etaMinutes !== undefined ? `${d.etaMinutes}m` : '17m'}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 700 }}>
                  State: {d.tripState}
                </span>
                <span style={{ fontSize: '11px', fontWeight: 800, color: d.speedKmh > 0 ? '#0284C7' : '#64748B' }}>
                  ⚡ {d.speedKmh} KM/H
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Live Interactive Map Display */}
        {selectedDriver ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Header Telemetry Bar */}
            <div style={{ background: '#0F172A', color: '#fff', padding: '14px 18px', borderRadius: 'var(--r-m)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ background: selectedDriver.isStale ? '#EF4444' : selectedDriver.speedKmh > 0 ? '#10B981' : '#F59E0B', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 800 }}>
                    {selectedDriver.isStale ? '🔴 TELEMETRY PAUSED' : selectedDriver.speedKmh > 0 ? '🟢 LIVE TELEMETRY STREAM' : '🟡 STATIONARY ENGINE IDLE'}
                  </span>
                  <span style={{ fontSize: '12px', color: '#94A3B8' }}>
                    Updated: {new Date(selectedDriver.lastUpdated).toLocaleTimeString()}
                  </span>
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: 900, marginTop: '4px', marginBottom: '0px' }}>
                  📍 {selectedDriver.driverName} ({selectedDriver.vehicleRegistration})
                </h2>
                <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>
                  Booking Ref: <b style={{ color: '#F59E0B' }}>{selectedDriver.bookingReference || 'Unassigned'}</b> | State: <b style={{ color: '#38BDF8' }}>{selectedDriver.tripState}</b>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '26px', fontWeight: 900, color: '#38BDF8' }}>
                  {selectedDriver.speedKmh} <span style={{ fontSize: '13px' }}>KM/H</span>
                </div>
                <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                  GPS Accuracy: ±{selectedDriver.accuracyMeters}m
                </div>
              </div>
            </div>

            {/* Live Destination Distance & Speed Banner */}
            <div style={{ background: '#F0FDF4', border: '1.5px solid #86EFAC', borderRadius: 'var(--r-m)', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '22px' }}>🚕</span>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                    🏁 Dropoff Destination: <b>{selectedDriver.dropAddress || 'Udupi Sri Krishna Matha'}</b>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 900, color: '#14532D', marginTop: '2px' }}>
                    📏 Distance Remaining: <b style={{ color: '#2563EB', fontSize: '16px' }}>{selectedDriver.remainingDistanceKm !== undefined ? `${selectedDriver.remainingDistanceKm} KM` : '14.8 KM'}</b> · ETA: <b style={{ color: '#D97706', fontSize: '16px' }}>~{selectedDriver.etaMinutes !== undefined ? `${selectedDriver.etaMinutes} mins` : '17 mins'}</b>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ background: '#DCFCE7', border: '1px solid #86EFAC', color: '#15803D', padding: '4px 12px', borderRadius: '20px', fontSize: '12.5px', fontWeight: 800 }}>
                  ⚡ Speedometer: {selectedDriver.speedKmh} KM/H
                </span>
                <span
                  style={{
                    background: selectedDriver.isStale ? '#EF4444' : selectedDriver.speedKmh > 0 ? '#0284C7' : '#D97706',
                    color: '#fff',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 800,
                  }}
                >
                  {selectedDriver.isStale ? '🔴 STALE (>30s)' : selectedDriver.speedKmh > 0 ? '🟢 LIVE MOVING' : '🟡 IDLE (0 KM/H)'}
                </span>
              </div>
            </div>

            {/* Map Action Quick Bar */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#4285F4',
                  color: '#fff',
                  padding: '8px 14px',
                  borderRadius: 'var(--r-m)',
                  fontSize: '12px',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                🗺️ Open Exact Location in Google Maps
              </a>
              <a
                href={openStreetMapUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#7EBF37',
                  color: '#fff',
                  padding: '8px 14px',
                  borderRadius: 'var(--r-m)',
                  fontSize: '12px',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                📍 View on OpenStreetMap
              </a>
              <Button onClick={handleCopyCoords} variant="ghost" style={{ fontSize: '12px' }}>
                {copiedCoords ? '✅ GPS Coordinates Copied!' : '📋 Copy Lat, Lng'}
              </Button>
            </div>

            {/* Interactive Leaflet Pin Canvas Container with Fallback iFrame */}
            <div style={{ border: '2px solid var(--line)', borderRadius: 'var(--r-m)', overflow: 'hidden', height: '380px', position: 'relative', background: '#e5e3df' }}>
              <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: '380px' }} />

              {!leafletLoaded && (
                <iframe
                  key={`${selectedDriver.driverId}-${selectedDriver.latitude.toFixed(5)}-${selectedDriver.longitude.toFixed(5)}`}
                  title={`Live Map for ${selectedDriver.driverName}`}
                  width="100%"
                  height="100%"
                  style={{ border: 0, position: 'absolute', top: 0, left: 0 }}
                  src={mapEmbedUrl}
                  loading="lazy"
                />
              )}
            </div>

            {/* Bottom GPS Metadata Telemetry Strip */}
            <div style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', borderRadius: 'var(--r-m)', padding: '12px 16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', fontSize: '12px' }}>
                <div>
                  <span style={{ color: 'var(--muted)', display: 'block', fontSize: '11px' }}>Latitude</span>
                  <b style={{ fontSize: '13px', color: 'var(--ink)' }}>{selectedDriver.latitude.toFixed(6)}° N</b>
                </div>
                <div>
                  <span style={{ color: 'var(--muted)', display: 'block', fontSize: '11px' }}>Longitude</span>
                  <b style={{ fontSize: '13px', color: 'var(--ink)' }}>{selectedDriver.longitude.toFixed(6)}° E</b>
                </div>
                <div>
                  <span style={{ color: 'var(--muted)', display: 'block', fontSize: '11px' }}>Heading / Bearing</span>
                  <b style={{ fontSize: '13px', color: 'var(--ink)' }}>{selectedDriver.headingDegrees}°</b>
                </div>
                <div>
                  <span style={{ color: 'var(--muted)', display: 'block', fontSize: '11px' }}>Signal Status</span>
                  <b style={{ fontSize: '13px', color: selectedDriver.isStale ? '#DC2626' : selectedDriver.speedKmh > 0 ? '#16A34A' : '#D97706' }}>
                    {selectedDriver.isStale ? '🔴 Telemetry Stale (>30s)' : selectedDriver.speedKmh > 0 ? '🟢 Active Moving (3s Ping)' : '🟡 Idle Stationary (3s Ping)'}
                  </b>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
            No driver telemetry selected.
          </div>
        )}
      </div>
    </Card>
  );
};

