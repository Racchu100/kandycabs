'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Radio,
  Gauge,
  MapPin,
  Navigation,
  AlertTriangle,
  ShieldCheck,
  Clock,
  CheckCircle2,
  RefreshCw,
  Phone,
  Car,
  User,
  ExternalLink,
} from 'lucide-react';

interface ActiveDriver {
  id: string;
  bookingId: string;
  humanReadableRef: string;
  status: string;
  gpsStatus: 'LIVE' | 'GPS_DELAYED' | 'OFFLINE';
  driver: {
    id: string;
    fullName: string;
    phone: string;
  };
  vehicle: {
    name: string;
    registrationNumber?: string;
  };
  customer: {
    fullName: string;
    phone: string;
  };
  pickupAddress: string;
  dropAddress: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  speedKmh: number;
  locationName?: string;
  updatedAt: string;
  routePoints?: { latitude: number; longitude: number; timestamp: string }[];
}

type StatusFilter = 'ALL' | 'LIVE' | 'GPS_DELAYED' | 'OFFLINE';

export default function AdminLiveTrackingPage() {
  const [drivers, setDrivers] = useState<ActiveDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState<ActiveDriver | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('ALL');
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>('');
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // 1. Fetch live active driver locations from backend
  const fetchTrackingData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/tracking');
      if (res.ok) {
        const data = await res.json();
        const list: ActiveDriver[] = data.activeDrivers || [];
        setDrivers(list);
        setLastRefreshedAt(new Date().toLocaleTimeString('en-IN'));

        // If selected driver is active, update their data reference
        if (selectedDriver) {
          const updated = list.find((d) => d.id === selectedDriver.id);
          if (updated) setSelectedDriver(updated);
        } else if (list.length > 0) {
          setSelectedDriver(list[0]);
        }
      }
    } catch (err) {
      console.warn('[Admin Tracking] Error fetching live data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDriver]);

  // 2. Initial load & 5-second lightweight polling
  useEffect(() => {
    fetchTrackingData();
    const timer = setInterval(() => {
      fetchTrackingData();
    }, 5000);
    return () => clearInterval(timer);
  }, [fetchTrackingData]);

  // 3. Dynamically load Leaflet CSS & JS via CDN
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
      const script = document.createElement('script');
      script.id = 'leaflet-js';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => setLeafletLoaded(true);
      document.body.appendChild(script);
    } else {
      setLeafletLoaded(true);
    }
  }, []);

  // 4. Initialize Leaflet Map
  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    if (!mapRef.current) {
      // Create map instance centered at Mangaluru/Bangalore default
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
      }).setView([12.8449, 74.8498], 12);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      mapRef.current = map;
    }
  }, [leafletLoaded]);

  // 5. Update Map Markers dynamically when drivers data updates
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    const map = mapRef.current;
    const existingMarkers = markersRef.current;
    const currentDriverIds = new Set(drivers.map((d) => d.id));

    // Remove old markers for completed/cancelled trips
    existingMarkers.forEach((marker, id) => {
      if (!currentDriverIds.has(id)) {
        map.removeLayer(marker);
        existingMarkers.delete(id);
      }
    });

    if (drivers.length === 0) return;

    const bounds: [number, number][] = [];

    drivers.forEach((d) => {
      const lat = d.latitude;
      const lng = d.longitude;
      bounds.push([lat, lng]);

      const badgeColor =
        d.gpsStatus === 'LIVE'
          ? '#10b981' // emerald-500
          : d.gpsStatus === 'GPS_DELAYED'
          ? '#f59e0b' // amber-500
          : '#ef4444'; // red-500

      const markerHtml = `
        <div style="position:relative; display:flex; align-items:center; justify-center; width:36px; height:36px;">
          <div style="position:absolute; width:100%; height:100%; border-radius:50%; background-color:${badgeColor}; opacity:0.3; ${
            d.gpsStatus === 'LIVE' ? 'animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;' : ''
          }"></div>
          <div style="position:relative; width:32px; height:32px; border-radius:50%; background:#1a1a2e; border:2px solid ${badgeColor}; display:flex; items-center; justify-content:center; color:white; font-size:14px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3);">
            🚗
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'custom-driver-marker-icon',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const popupContent = `
        <div style="font-family: Arial, sans-serif; padding: 4px; min-width: 180px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <strong style="color:#f97316; font-size:13px;">${d.humanReadableRef}</strong>
            <span style="font-size:9px; font-weight:bold; padding:2px 6px; border-radius:4px; background:${badgeColor}; color:white; text-transform:uppercase;">${d.gpsStatus}</span>
          </div>
          <p style="margin:2px 0; font-weight:bold; font-size:12px; color:#1a1a2e;">${d.driver.fullName}</p>
          <p style="margin:2px 0; font-size:11px; color:#666;">📞 +91 ${d.driver.phone}</p>
          <p style="margin:2px 0; font-size:11px; color:#666;">🚘 ${d.vehicle.name}</p>
          <p style="margin:2px 0; font-size:11px; color:#666;">👤 ${d.customer.fullName}</p>
          <p style="margin:2px 0; font-size:11px; font-weight:bold; color:#0f172a;">📍 ${d.locationName || 'Kodialbail, Lalbagh, Mangaluru, 575003, Dakshina Kannada, Karnataka'}</p>
          <div style="margin:6px 0; padding:4px 6px; border-radius:4px; background:#f3f4f6; font-size:11px; font-weight:bold; color:${d.speedKmh > 0 ? '#059669' : '#4b5563'}; display:flex; justify-content:space-between;">
            <span>⚡ Speedometer:</span>
            <span style="font-family: monospace;">${d.speedKmh > 0 ? `${d.speedKmh} km/h` : '0 km/h (Stopped)'}</span>
          </div>
          <hr style="margin:6px 0; border:0; border-top:1px solid #eee;" />
          <p style="margin:2px 0; font-size:10px; color:#888;">GPS: ${lat.toFixed(4)}°, ${lng.toFixed(4)}° (±${d.accuracy}m)</p>
        </div>
      `;

      if (existingMarkers.has(d.id)) {
        const marker = existingMarkers.get(d.id);
        marker.setLatLng([lat, lng]);
        marker.setIcon(customIcon);
        marker.getPopup().setContent(popupContent);
      } else {
        const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);
        marker.bindPopup(popupContent);
        marker.on('click', () => setSelectedDriver(d));
        existingMarkers.set(d.id, marker);
      }
    });

    // Auto fit map bounds around all active drivers
    if (bounds.length > 0) {
      try {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      } catch (e) {}
    }
  }, [drivers, leafletLoaded]);

  // Center Map on selected driver click
  const handleSelectDriver = (d: ActiveDriver) => {
    setSelectedDriver(d);
    if (mapRef.current && d.latitude && d.longitude) {
      mapRef.current.flyTo([d.latitude, d.longitude], 14, { duration: 1 });
      const marker = markersRef.current.get(d.id);
      if (marker) marker.openPopup();
    }
  };

  const filteredDrivers = drivers.filter(
    (d) => filter === 'ALL' || d.gpsStatus === filter
  );

  const liveCount = drivers.filter((d) => d.gpsStatus === 'LIVE').length;
  const delayedCount = drivers.filter((d) => d.gpsStatus === 'GPS_DELAYED').length;
  const offlineCount = drivers.filter((d) => d.gpsStatus === 'OFFLINE').length;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-kandy-ink flex items-center gap-2">
            <Radio className="w-6 h-6 text-kandy-orange animate-pulse" />
            <span>Live GPS Tracking Console</span>
          </h1>
          <p className="text-xs text-kandy-muted mt-0.5">
            Real-time device GPS locations of active en-route drivers on OpenStreetMap
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right text-[11px] font-bold text-kandy-muted">
            <span>Auto-refreshing (5s)</span>
            {lastRefreshedAt && (
              <span className="block text-[10px] text-gray-400 font-semibold">
                Last updated: {lastRefreshedAt}
              </span>
            )}
          </div>
          <button
            onClick={fetchTrackingData}
            className="p-2 bg-white border border-kandy-border rounded-lg text-kandy-ink hover:bg-gray-100 transition shadow-sm"
            title="Manual Refresh"
          >
            <RefreshCw className={`w-4 h-4 text-kandy-orange ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-card border border-kandy-border shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-kandy-bg flex items-center justify-center shrink-0">
            <Car className="w-4 h-4 text-kandy-orange" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-kandy-muted uppercase tracking-wider">Active Drivers</p>
            <p className="text-xl font-black text-kandy-ink">{drivers.length}</p>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-card border border-kandy-border shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
            <Radio className="w-4 h-4 text-emerald-600 animate-ping" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-kandy-muted uppercase tracking-wider">🟢 Live</p>
            <p className="text-xl font-black text-emerald-700">{liveCount}</p>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-card border border-kandy-border shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-kandy-muted uppercase tracking-wider">🟡 GPS Delayed</p>
            <p className="text-xl font-black text-amber-700">{delayedCount}</p>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-card border border-kandy-border shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-kandy-muted uppercase tracking-wider">🔴 Offline</p>
            <p className="text-xl font-black text-red-600">{offlineCount}</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Active Drivers Sidebar + Interactive Map */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Active Drivers List */}
        <div className="lg:col-span-1 space-y-4">
          {/* Status Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {(['ALL', 'LIVE', 'GPS_DELAYED', 'OFFLINE'] as StatusFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-md text-[10px] font-extrabold uppercase transition whitespace-nowrap shadow-sm ${
                  filter === f
                    ? 'bg-kandy-orange text-white ring-2 ring-orange-300'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                {f === 'ALL'
                  ? `ALL (${drivers.length})`
                  : f === 'LIVE'
                  ? `🟢 LIVE (${liveCount})`
                  : f === 'GPS_DELAYED'
                  ? `🟡 DELAYED (${delayedCount})`
                  : `🔴 OFFLINE (${offlineCount})`}
              </button>
            ))}
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {filteredDrivers.length === 0 ? (
              <div className="bg-white p-8 rounded-card border border-kandy-border text-center text-kandy-muted">
                <Car className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-kandy-ink">No active drivers currently en-route</p>
                <p className="text-[11px] text-kandy-muted mt-0.5">
                  When a driver starts a trip in the Driver App, their live GPS location will appear here automatically.
                </p>
              </div>
            ) : (
              filteredDrivers.map((d) => {
                const isSelected = selectedDriver?.id === d.id;
                const statusBg =
                  d.gpsStatus === 'LIVE'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : d.gpsStatus === 'GPS_DELAYED'
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-red-100 text-red-700 border-red-300';

                return (
                  <div
                    key={d.id}
                    onClick={() => handleSelectDriver(d)}
                    className={`p-4 rounded-card border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-2 border-kandy-orange bg-orange-50/50 shadow-md'
                        : 'border-kandy-border bg-white hover:bg-gray-50 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-black text-kandy-orange text-sm">{d.humanReadableRef}</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded border flex items-center gap-1 font-mono ${
                          d.speedKmh > 0 ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-gray-100 text-gray-700 border-gray-300'
                        }`}>
                          <Gauge className={`w-3 h-3 ${d.speedKmh > 0 ? 'text-emerald-600' : 'text-gray-400'}`} />
                          <span>{d.speedKmh > 0 ? `${d.speedKmh} km/h` : '0 km/h'}</span>
                        </span>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border uppercase ${statusBg}`}>
                          {d.gpsStatus}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs font-black text-kandy-ink mb-1">{d.driver.fullName}</p>
                    <p className="text-[11px] font-semibold text-kandy-muted mb-2">
                      🚘 {d.vehicle.name} &bull; 📞 +91 {d.driver.phone}
                    </p>

                    <div className="text-[11px] text-gray-600 bg-gray-50 p-2 rounded border border-gray-100 space-y-1">
                      <div className="truncate">
                        <strong className="text-kandy-ink">Route:</strong> {d.pickupAddress} ➔ {d.dropAddress}
                      </div>
                      <div className="text-[10px] font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                        <span className="truncate">{d.locationName || 'Kodialbail, Lalbagh, Mangaluru, 575003, Dakshina Kannada, Karnataka'}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono pt-1 border-t border-gray-200">
                        <span>
                          GPS: {d.latitude.toFixed(4)}°, {d.longitude.toFixed(4)}°
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`font-extrabold ${d.speedKmh > 0 ? 'text-emerald-600' : 'text-gray-500'}`}>
                            {d.speedKmh > 0 ? `⚡ ${d.speedKmh} km/h` : '0 km/h'}
                          </span>
                          <span>±{d.accuracy}m</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Full Interactive OpenStreetMap + Driver Telemetry */}
        <div className="lg:col-span-2 space-y-4">
          {/* Leaflet Map Box */}
          <div className="bg-white rounded-card border border-kandy-border shadow-card overflow-hidden">
            <div className="bg-kandy-ink text-white px-4 py-3 flex items-center justify-between text-xs font-bold">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-kandy-orange" />
                <span>Interactive Live Driver Map (OpenStreetMap)</span>
              </div>
              <span className="text-[10px] font-semibold text-gray-400">
                Click any driver marker to view details
              </span>
            </div>

            {/* Map Container */}
            <div className="relative h-[480px] w-full bg-gray-100">
              <div ref={mapContainerRef} className="w-full h-full z-0" />

              {!leafletLoaded && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center gap-2 text-kandy-muted text-xs font-bold">
                  <RefreshCw className="w-5 h-5 animate-spin text-kandy-orange" />
                  <span>Loading OpenStreetMap tiles…</span>
                </div>
              )}
            </div>

            {/* Selected Driver Telemetry Detail Bar */}
            {selectedDriver ? (
              <div className="p-5 bg-white border-t border-kandy-border space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-gray-100">
                  <div>
                    <span className="text-[10px] font-black uppercase text-kandy-orange tracking-wider">
                      Selected Driver Telemetry
                    </span>
                    <h3 className="text-lg font-black text-kandy-ink">
                      {selectedDriver.driver.fullName}{' '}
                      <span className="text-xs font-bold text-kandy-muted font-mono">
                        ({selectedDriver.humanReadableRef})
                      </span>
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-extrabold px-3 py-1 rounded-full uppercase border ${
                        selectedDriver.gpsStatus === 'LIVE'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : selectedDriver.gpsStatus === 'GPS_DELAYED'
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-red-100 text-red-700 border-red-300'
                      }`}
                    >
                      {selectedDriver.gpsStatus}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                  <div className="bg-kandy-bg p-3 rounded-lg border border-kandy-border">
                    <span className="text-[10px] font-extrabold uppercase text-kandy-muted block flex items-center gap-1">
                      <Gauge className="w-3 h-3 text-kandy-orange" /> Speedometer
                    </span>
                    <span className={`font-black font-mono text-sm block mt-0.5 ${selectedDriver.speedKmh > 0 ? 'text-emerald-700 animate-pulse' : 'text-gray-600'}`}>
                      {selectedDriver.speedKmh > 0 ? `⚡ ${selectedDriver.speedKmh} km/h` : '⏹ 0 km/h'}
                    </span>
                  </div>

                  <div className="bg-kandy-bg p-3 rounded-lg border border-kandy-border">
                    <span className="text-[10px] font-extrabold uppercase text-kandy-muted block">
                      Driver Contact
                    </span>
                    <span className="font-bold text-kandy-ink">+91 {selectedDriver.driver.phone}</span>
                  </div>

                  <div className="bg-kandy-bg p-3 rounded-lg border border-kandy-border">
                    <span className="text-[10px] font-extrabold uppercase text-kandy-muted block">
                      Assigned Vehicle
                    </span>
                    <span className="font-bold text-kandy-ink">{selectedDriver.vehicle.name}</span>
                  </div>

                  <div className="bg-kandy-bg p-3 rounded-lg border border-kandy-border">
                    <span className="text-[10px] font-extrabold uppercase text-kandy-muted block">
                      Customer
                    </span>
                    <span className="font-bold text-kandy-ink">{selectedDriver.customer.fullName}</span>
                  </div>

                  <div className="bg-kandy-bg p-3 rounded-lg border border-kandy-border">
                    <span className="text-[10px] font-extrabold uppercase text-kandy-muted block">
                      GPS Accuracy
                    </span>
                    <span className="font-bold text-emerald-700 font-mono">
                      ±{selectedDriver.accuracy} meters
                    </span>
                  </div>
                </div>

                <div className="bg-gray-900 text-white p-3.5 rounded-xl flex items-center justify-between text-xs font-mono">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-gray-400 uppercase block">
                      Device Coordinates & Exact Location
                    </span>
                    <div className="text-emerald-400 font-bold text-xs flex items-center gap-1.5 font-sans">
                      <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span>{selectedDriver.locationName || 'Kodialbail, Lalbagh, Mangaluru, 575003, Dakshina Kannada, Karnataka'}</span>
                    </div>
                    <span className="text-kandy-orange font-bold text-[11px] block">
                      {selectedDriver.latitude.toFixed(5)}° N, {selectedDriver.longitude.toFixed(5)}° E
                    </span>
                  </div>
                  <a
                    href={`https://www.google.com/maps?q=${selectedDriver.latitude},${selectedDriver.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-kandy-orange hover:bg-kandy-orangeHover text-white font-bold text-[10px] uppercase rounded-lg transition shadow shrink-0"
                  >
                    <span>Google Maps</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-xs font-bold text-kandy-muted">
                Select an active driver to view full telemetry details.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
