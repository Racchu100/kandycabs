'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { BookingStatus, getSupabaseClient } from '@kandy-cabs/shared';
import { AdminNavbar } from '@/components/AdminNavbar';
import { reverseGeocodeLocation } from '@/lib/geocoding';
import type { DriverMapMarker } from '@/components/LiveLeafletMap';

// Dynamically import LiveLeafletMap with SSR disabled (Leaflet requires browser DOM)
const LiveLeafletMap = dynamic(() => import('@/components/LiveLeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 w-full h-full min-h-[500px] bg-slate-100 flex flex-col items-center justify-center text-slate-500">
      <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mb-3"></div>
      <span className="text-sm font-medium">Loading OpenStreetMap Leaflet Engine...</span>
    </div>
  ),
});

export default function AdminLiveMapPage() {
  const [drivers, setDrivers] = useState<DriverMapMarker[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<DriverMapMarker | null>(null);
  const [selectedBookingFilter, setSelectedBookingFilter] = useState<string>('ALL');
  const [breadcrumbs, setBreadcrumbs] = useState<any[]>([]);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [driverLocations, setDriverLocations] = useState<Record<string, string>>({});

  // Resolve driver place/building/area names when driver coordinates arrive
  useEffect(() => {
    drivers.forEach((d) => {
      if (typeof d.currentLat === 'number' && typeof d.currentLng === 'number') {
        const key = `${d.currentLat.toFixed(4)},${d.currentLng.toFixed(4)}`;
        if (!driverLocations[d.id] || !driverLocations[d.id].includes(key)) {
          reverseGeocodeLocation(d.currentLat, d.currentLng).then((addr) => {
            setDriverLocations((prev) => ({ ...prev, [d.id]: addr }));
          });
        }
      }
    });
  }, [drivers]);

  const fetchOnlineDrivers = useCallback(async (isBackground: boolean = false) => {
    if (!isBackground) setLoading(true);
    try {
      const res = await fetch('/api/admin/drivers/online');
      if (res.ok) {
        const data = await res.json();
        const incomingDrivers: DriverMapMarker[] = data.drivers || [];
        setDrivers(incomingDrivers);
        setSelectedDriver((prev) => {
          if (!prev) return null;
          const fresh = incomingDrivers.find((d) => d.id === prev.id);
          return fresh || prev;
        });
        setIsReconnecting(false);
      } else {
        setIsReconnecting(true);
      }
    } catch (err) {
      console.error('Failed to fetch online drivers:', err);
      setIsReconnecting(true);
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOnlineDrivers();
  }, [fetchOnlineDrivers]);

  // Realtime subscription on Driver table with 5s polling fallback
  useEffect(() => {
    const supabase = getSupabaseClient();
    let channel: any = null;
    let pollInterval: any = null;

    if (supabase) {
      try {
        channel = supabase
          .channel('admin-live-map-drivers')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'Driver' },
            (payload: any) => {
              setRealtimeConnected(true);
              setIsReconnecting(false);

              if (payload.eventType === 'UPDATE') {
                // Update driver's position live
                setDrivers((prev) =>
                  prev.map((d) =>
                    d.id === payload.new.id
                      ? {
                          ...d,
                          currentLat: payload.new.currentLat,
                          currentLng: payload.new.currentLng,
                          lastPingAt: payload.new.lastPingAt,
                          onlineStatus: payload.new.onlineStatus,
                        }
                      : d
                  )
                );

                setSelectedDriver((curr) =>
                  curr && curr.id === payload.new.id
                    ? {
                        ...curr,
                        currentLat: payload.new.currentLat,
                        currentLng: payload.new.currentLng,
                        lastPingAt: payload.new.lastPingAt,
                      }
                    : curr
                );
              }
            }
          )
          .subscribe((status: string) => {
            if (status === 'SUBSCRIBED') {
              setRealtimeConnected(true);
              setIsReconnecting(false);
            } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
              setRealtimeConnected(false);
              setIsReconnecting(true);
            }
          });
      } catch (e) {
        setRealtimeConnected(false);
        setIsReconnecting(true);
      }
    }

    // 1.5-second polling fallback for fast real-time tracking
    pollInterval = setInterval(() => {
      fetchOnlineDrivers(true);
    }, 1500);

    return () => {
      if (channel) channel.unsubscribe();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [fetchOnlineDrivers]);

  // Fetch breadcrumb points when a driver with active booking is selected
  useEffect(() => {
    if (selectedDriver && selectedDriver.assignedBookings.length > 0) {
      const activeBookingId = selectedDriver.assignedBookings[0].id;
      fetch(`/api/admin/bookings/${activeBookingId}/tracking`)
        .then((r) => r.json())
        .then((d) => setBreadcrumbs(d.points || []))
        .catch(() => setBreadcrumbs([]));
    } else {
      setBreadcrumbs([]);
    }
  }, [selectedDriver]);

  // Filtered drivers based on category tab
  const filteredDrivers: DriverMapMarker[] = drivers.filter((d) => {
    if (selectedBookingFilter === 'ALL') return true;
    if (selectedBookingFilter === 'IDLE') return d.assignedBookings.length === 0;
    if (selectedBookingFilter === 'ON_TRIP') return d.assignedBookings.length > 0;
    return true;
  });

  const idleCount = drivers.filter((d) => d.assignedBookings.length === 0).length;
  const onTripCount = drivers.filter((d) => d.assignedBookings.length > 0).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <AdminNavbar />
      {/* Top Bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sticky top-0 z-20 shadow-xs">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <span>🛰️ Live Fleet GPS Map (OpenStreetMap)</span>
            </h1>
            {isReconnecting ? (
              <span className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Reconnecting...</span>
              </span>
            ) : realtimeConnected ? (
              <span className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>Realtime GPS Connected</span>
              </span>
            ) : (
              <span className="text-xs text-slate-500">1.5s Live Polling</span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Realtime OpenStreetMap Leaflet telemetry: Driver phone GPS tracking & live fleet management
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href="/bookings"
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition border border-slate-300 shadow-xs"
          >
            ← Back to Bookings Table
          </Link>
        </div>
      </header>

      {/* Main Map Area */}
      <div className="flex-1 flex flex-col lg:flex-row relative overflow-hidden min-h-[calc(100vh-130px)]">
        {/* Leaflet OpenStreetMap Container */}
        <div className="flex-1 relative flex flex-col min-h-[500px] lg:min-h-[calc(100vh-130px)] bg-slate-100">
          <LiveLeafletMap
            drivers={filteredDrivers}
            selectedDriver={selectedDriver}
            onSelectDriver={setSelectedDriver}
            breadcrumbs={breadcrumbs}
          />
        </div>

        {/* Driver Detail & Fleet List Side Column */}
        <aside className="w-full lg:w-96 bg-white border-t lg:border-t-0 lg:border-l border-slate-200 p-5 flex flex-col justify-between overflow-y-auto max-h-screen shadow-sm">
          <div className="space-y-4">
            {/* Category Filter Tabs */}
            <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex gap-1 text-xs font-semibold">
              <button
                onClick={() => {
                  setSelectedBookingFilter('ALL');
                }}
                className={`flex-1 py-1.5 px-2 rounded-lg text-center transition ${
                  selectedBookingFilter === 'ALL'
                    ? 'bg-amber-500 text-slate-950 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({drivers.length})
              </button>
              <button
                onClick={() => {
                  setSelectedBookingFilter('IDLE');
                }}
                className={`flex-1 py-1.5 px-2 rounded-lg text-center transition ${
                  selectedBookingFilter === 'IDLE'
                    ? 'bg-emerald-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Idle ({idleCount})
              </button>
              <button
                onClick={() => {
                  setSelectedBookingFilter('ON_TRIP');
                }}
                className={`flex-1 py-1.5 px-2 rounded-lg text-center transition ${
                  selectedBookingFilter === 'ON_TRIP'
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                On-Trip ({onTripCount})
              </button>
            </div>

            {/* Selected Driver Detailed View */}
            {selectedDriver ? (
              <div className="space-y-4 pt-1">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
                  <button
                    onClick={() => setSelectedDriver(null)}
                    className="text-xs text-amber-600 hover:text-amber-700 font-bold flex items-center gap-1 transition"
                  >
                    <span>← Back to Driver List</span>
                  </button>
                  <button
                    onClick={() => setSelectedDriver(null)}
                    className="text-slate-500 hover:text-slate-800 text-xs bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-md"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-base text-slate-900">{selectedDriver.user.fullName}</h3>
                    <p className="text-xs text-slate-500 font-mono">{selectedDriver.user.phone}</p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                      selectedDriver.assignedBookings.length > 0
                        ? selectedDriver.assignedBookings[0].status === 'TRIP_STARTED'
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-blue-100 text-blue-800 border-blue-300'
                        : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    }`}
                  >
                    {selectedDriver.assignedBookings.length > 0
                      ? selectedDriver.assignedBookings[0].status === 'TRIP_STARTED'
                        ? 'Trip in Progress'
                        : 'En-Route'
                      : 'Idle / Available'}
                  </span>
                </div>

                {/* Status & Coordinates */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                  <div className="flex justify-between font-mono">
                    <span className="text-slate-500">GPS Coordinates:</span>
                    <span className="text-emerald-700 font-bold">
                      {selectedDriver.currentLat?.toFixed(5) || '12.97160'}°, {selectedDriver.currentLng?.toFixed(5) || '77.59460'}°
                    </span>
                  </div>

                  {/* Resolved Driver Locality / Area */}
                  <div className="pt-1.5 border-t border-slate-200 flex items-start justify-between gap-2">
                    <span className="text-slate-500 shrink-0">🏢 Current Area:</span>
                    <div className="text-right">
                      <span className="text-slate-900 font-semibold text-[11px] block">
                        {driverLocations[selectedDriver.id] || 'Resolving locality...'}
                      </span>
                      {selectedDriver.currentLat && selectedDriver.currentLng && (
                        <a
                          href={`https://www.google.com/maps?q=${selectedDriver.currentLat},${selectedDriver.currentLng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-blue-600 hover:text-blue-800 underline font-mono inline-block mt-0.5"
                        >
                          View in Google Maps ↗
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between font-mono pt-1 border-t border-slate-200">
                    <span className="text-slate-500">Last Ping:</span>
                    <span className="text-slate-700">
                      {selectedDriver.lastPingAt
                        ? new Date(selectedDriver.lastPingAt).toLocaleTimeString()
                        : 'Just now'}
                    </span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span className="text-slate-500">License No:</span>
                    <span className="text-slate-700">{selectedDriver.licenseNumber}</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span className="text-slate-500">Vehicle:</span>
                    <span className="text-slate-700">
                      {selectedDriver.vehicles[0]?.plateNumber || 'N/A'} ({selectedDriver.vehicles[0]?.category || 'Standard'})
                    </span>
                  </div>
                </div>

                {/* Active Assigned Booking */}
                {selectedDriver.assignedBookings.length > 0 ? (
                  <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200 space-y-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-blue-700">
                      Active Trip Assignment
                    </span>
                    {selectedDriver.assignedBookings.map((b) => (
                      <div key={b.id} className="text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="font-bold text-slate-900">{b.humanReadableRef}</span>
                          <span className="text-blue-700 font-semibold">{b.status}</span>
                        </div>
                        <p className="text-slate-600 truncate">📍 Pickup: {b.pickupAddress}</p>
                        <p className="text-slate-600 truncate">🏁 Drop: {b.dropAddress}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 text-center">
                    Driver is online and currently available for ride dispatches.
                  </div>
                )}

                {/* Breadcrumb Route Polyline Points */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold uppercase tracking-wider text-slate-600">
                      GPS Breadcrumb Trail ({breadcrumbs.length} points)
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">OpenStreetMap</span>
                  </div>

                  {breadcrumbs.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No GPS breadcrumbs logged yet for this trip.</p>
                  ) : (
                    <div className="max-h-40 overflow-y-auto space-y-1 pr-1 font-mono text-[11px]">
                      {breadcrumbs.map((pt, idx) => (
                        <div
                          key={pt.id || idx}
                          className="flex justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-700"
                        >
                          <span>
                            #{idx + 1} ({pt.lat.toFixed(4)}, {pt.lng.toFixed(4)})
                          </span>
                          <span className="text-slate-500 text-[10px]">
                            {new Date(pt.recordedAt).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Driver Cards List Column */
              <div className="space-y-2.5">
                <div className="flex justify-between items-center pb-1 border-b border-slate-200">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500">
                    {selectedBookingFilter === 'ALL'
                      ? `All Online Drivers (${filteredDrivers.length})`
                      : selectedBookingFilter === 'IDLE'
                      ? `Idle / Available Drivers (${filteredDrivers.length})`
                      : `On-Trip Drivers (${filteredDrivers.length})`}
                  </span>
                  <span className="text-[10px] text-amber-600 font-medium">Click driver to track</span>
                </div>

                {filteredDrivers.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-xs space-y-1">
                    <div className="text-2xl mb-1">🚗</div>
                    <p className="font-semibold text-slate-700">No drivers matching this filter</p>
                    <p className="text-[11px]">Drivers will appear here when they come online.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                    {filteredDrivers.map((d) => {
                      const isOnTrip = d.assignedBookings.length > 0;
                      const isTripStarted = isOnTrip && d.assignedBookings[0].status === 'TRIP_STARTED';
                      const vehicle = d.vehicles[0];
                      const resolvedLocation = driverLocations[d.id];

                      return (
                        <div
                          key={d.id}
                          onClick={() => setSelectedDriver(d)}
                          className="p-3 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 hover:border-amber-400 cursor-pointer transition shadow-xs group"
                        >
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div>
                              <h4 className="font-bold text-sm text-slate-900 group-hover:text-amber-600 transition flex items-center gap-1.5">
                                <span>🚕</span>
                                <span>{d.user.fullName}</span>
                              </h4>
                              <p className="text-[11px] text-slate-500 font-mono">{d.user.phone}</p>
                            </div>
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${
                                isOnTrip
                                  ? isTripStarted
                                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                                    : 'bg-blue-100 text-blue-800 border-blue-300'
                                  : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              }`}
                            >
                              {isOnTrip ? (isTripStarted ? 'Trip in Progress' : 'En-Route') : 'Idle / Available'}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-500 space-y-1 border-t border-slate-100 pt-2">
                            <div className="flex justify-between font-mono">
                              <span className="text-slate-400">Vehicle:</span>
                              <span className="text-slate-700">
                                {vehicle?.plateNumber || 'N/A'} ({vehicle?.category || 'Standard'})
                              </span>
                            </div>
                            <div className="flex justify-between font-mono">
                              <span className="text-slate-400">GPS Position:</span>
                              <span className="text-emerald-600 font-semibold">
                                {d.currentLat ? `${d.currentLat.toFixed(4)}, ${d.currentLng?.toFixed(4)}` : 'No fix'}
                              </span>
                            </div>
                            {resolvedLocation && (
                              <div className="text-[10px] text-slate-700 flex items-center gap-1 pt-0.5 truncate">
                                <span>🏢</span>
                                <span className="truncate">{resolvedLocation}</span>
                              </div>
                            )}
                            {isOnTrip && (
                              <div className="mt-1 pt-1 border-t border-slate-100 text-[10px] text-blue-700 truncate">
                                📍 {d.assignedBookings[0].pickupAddress} → {d.assignedBookings[0].dropAddress}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Summary Pill */}
          <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between text-xs text-slate-600 font-mono">
            <span>Online: <strong className="text-slate-900">{drivers.length}</strong></span>
            <span>Idle: <strong className="text-emerald-600">{idleCount}</strong></span>
            <span>On-Trip: <strong className="text-blue-600">{onTripCount}</strong></span>
          </div>
        </aside>
      </div>
    </div>
  );
}
