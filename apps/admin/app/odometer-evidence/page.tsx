'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminNavbar } from '@/components/AdminNavbar';
import { reverseGeocodeLocation } from '@/lib/geocoding';

export const dynamic = 'force-dynamic';

export default function AdminOdometerEvidencePage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [threshold, setThreshold] = useState('10');
  const [discrepancyOnly, setDiscrepancyOnly] = useState(false);
  const [summary, setSummary] = useState({ totalCount: 0, discrepancyCount: 0 });

  // Lightbox Modal state
  const [lightboxItem, setLightboxItem] = useState<any | null>(null);
  const [startLocName, setStartLocName] = useState<string>('');
  const [finalLocName, setFinalLocName] = useState<string>('');
  const [driverLiveLocName, setDriverLiveLocName] = useState<string>('');

  // Resolve reverse-geocoded area/place names whenever a lightbox item is selected
  useEffect(() => {
    if (!lightboxItem) {
      setStartLocName('');
      setFinalLocName('');
      setDriverLiveLocName('');
      return;
    }

    if (lightboxItem.startGpsLat && lightboxItem.startGpsLng) {
      reverseGeocodeLocation(lightboxItem.startGpsLat, lightboxItem.startGpsLng).then(setStartLocName);
    } else if (lightboxItem.pickupAddress) {
      setStartLocName(lightboxItem.pickupAddress);
    }

    if (lightboxItem.finalGpsLat && lightboxItem.finalGpsLng) {
      reverseGeocodeLocation(lightboxItem.finalGpsLat, lightboxItem.finalGpsLng).then(setFinalLocName);
    } else if (lightboxItem.dropAddress) {
      setFinalLocName(lightboxItem.dropAddress);
    }

    if (lightboxItem.driverCurrentLat && lightboxItem.driverCurrentLng) {
      reverseGeocodeLocation(lightboxItem.driverCurrentLat, lightboxItem.driverCurrentLng).then(setDriverLiveLocName);
    }
  }, [lightboxItem]);

  const fetchOdometerData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/odometer-evidence?threshold=${threshold}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setSummary({
          totalCount: data.totalCount || 0,
          discrepancyCount: data.discrepancyCount || 0,
        });
      }
    } catch (err) {
      console.error('Failed to load odometer audit data:', err);
    } finally {
      setLoading(false);
    }
  }, [threshold]);

  useEffect(() => {
    fetchOdometerData();
  }, [fetchOdometerData]);

  const displayedItems = discrepancyOnly ? items.filter((i) => i.hasDiscrepancy) : items;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <AdminNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>🔍</span> Odometer & GPS Distance Audit
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Verify starting vs final odometer photos against Flow A breadcrumb GPS distance
            </p>
          </div>
          <button
            onClick={() => fetchOdometerData()}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-1.5 text-slate-200 transition"
          >
            <span>🔄</span> Refresh
          </button>
        </div>

        {/* Stats & Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Total Audited Trips</div>
            <div className="text-2xl font-black text-white mt-1">{summary.totalCount}</div>
            <div className="text-[10px] text-slate-400 mt-1">With photo evidence</div>
          </div>

          <div className="bg-gradient-to-br from-rose-950/40 to-slate-900 border border-rose-500/20 p-4 rounded-xl">
            <div className="text-[11px] font-medium text-rose-400 uppercase tracking-wider">Flagged Discrepancies</div>
            <div className="text-2xl font-black text-rose-300 mt-1">{summary.discrepancyCount}</div>
            <div className="text-[10px] text-rose-400/80 mt-1">&gt;{threshold}% variance vs GPS/Est</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-center">
            <label className="text-[11px] font-semibold text-slate-300 mb-1.5">Discrepancy Threshold:</label>
            <select
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value="5">5% Variance</option>
              <option value="10">10% Variance (Recommended)</option>
              <option value="15">15% Variance</option>
              <option value="20">20% Variance</option>
            </select>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-white">Filter Flags</div>
              <div className="text-[10px] text-slate-400">Show only flagged trips</div>
            </div>
            <input
              type="checkbox"
              checked={discrepancyOnly}
              onChange={(e) => setDiscrepancyOnly(e.target.checked)}
              className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Audit Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="py-20 text-center text-slate-400 text-sm">
              <div className="inline-block animate-spin text-2xl mb-2">🔄</div>
              <div>Analyzing odometer photos and GPS breadcrumbs...</div>
            </div>
          ) : displayedItems.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              <div className="text-3xl mb-2">✅</div>
              <div>No trip evidence found matching the selected filter.</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Booking / Trip</th>
                    <th className="py-3 px-4">Driver & Vehicle</th>
                    <th className="py-3 px-4">Starting Odometer</th>
                    <th className="py-3 px-4">Final Odometer</th>
                    <th className="py-3 px-4">Odometer Dist.</th>
                    <th className="py-3 px-4">GPS Dist.</th>
                    <th className="py-3 px-4">Variance / Audit</th>
                    <th className="py-3 px-4 text-right">Photo Lightbox</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {displayedItems.map((item) => (
                    <tr
                      key={item.bookingId}
                      className={`hover:bg-slate-800/50 transition ${
                        item.hasDiscrepancy ? 'bg-rose-950/20' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-amber-400">{item.humanReadableRef}</div>
                        <div className="text-slate-300 font-medium">{item.customerName}</div>
                        <div className="text-[10px] text-slate-400 uppercase">{item.tripType}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-200">{item.driverName}</div>
                        <div className="text-[10px] text-slate-400">{item.vehiclePlate}</div>
                        <div className="text-[10px] text-slate-400">{item.category}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-slate-200">
                          {item.startingOdometer !== null ? `${item.startingOdometer} km` : '—'}
                        </div>
                        {item.startingOdometerImagePath ? (
                          <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-400">
                            <span>📷</span> Photo attached
                          </div>
                        ) : (
                          <div className="mt-1 text-[10px] text-slate-400">No photo</div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-slate-200">
                          {item.finalOdometer !== null ? `${item.finalOdometer} km` : '—'}
                        </div>
                        {item.finalOdometerImagePath ? (
                          <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-400">
                            <span>📷</span> Photo attached
                          </div>
                        ) : (
                          <div className="mt-1 text-[10px] text-slate-400">No photo</div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-100">
                          {item.odometerDistanceKm !== null ? `${item.odometerDistanceKm} km` : '—'}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {item.gpsTrackedDistanceKm !== null ? (
                          <div>
                            <div className="font-bold text-blue-300">{item.gpsTrackedDistanceKm} km</div>
                            <div className="text-[9px] text-slate-400">
                              ({item.breadcrumbPointsCount} GPS points)
                            </div>
                          </div>
                        ) : (
                          <div className="text-slate-400">
                            <div>Est: {item.estimatedDistanceKm} km</div>
                            <div className="text-[9px] text-slate-400">(No breadcrumbs)</div>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {item.discrepancyPercent !== null ? (
                          <div>
                            <div className="font-bold">{item.discrepancyPercent}%</div>
                            {item.hasDiscrepancy ? (
                              <span className="inline-block mt-0.5 px-2 py-0.5 bg-rose-500/20 text-rose-400 border border-rose-500/40 rounded text-[10px] font-black animate-pulse">
                                🚨 &gt;{threshold}% VARIANCE
                              </span>
                            ) : (
                              <span className="inline-block mt-0.5 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[10px] font-semibold">
                                ✓ Verified In-Range
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setLightboxItem(item)}
                          className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold transition"
                        >
                          Compare Photos 🔎
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Lightbox Side-by-Side Photo Modal */}
      {lightboxItem && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>📸</span> Odometer Photo Evidence: {lightboxItem.humanReadableRef}
                </h3>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-0.5">
                  <span>Driver: <strong className="text-slate-200">{lightboxItem.driverName}</strong> ({lightboxItem.driverPhone})</span>
                  <span>•</span>
                  <span>Vehicle: <strong className="text-slate-200">{lightboxItem.vehiclePlate}</strong></span>
                  {lightboxItem.driverCurrentLat && lightboxItem.driverCurrentLng && (
                    <>
                      <span>•</span>
                      <span className="text-emerald-400 font-mono flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        Live GPS: {lightboxItem.driverCurrentLat.toFixed(5)}, {lightboxItem.driverCurrentLng.toFixed(5)}
                        {driverLiveLocName ? ` (${driverLiveLocName})` : ''}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={() => setLightboxItem(null)}
                className="text-slate-400 hover:text-white p-2 rounded-lg bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Modal Body: Side-by-Side Images */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Starting Odometer */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col">
                  <div className="w-full flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                      1. Starting Odometer Photo
                    </span>
                    <span className="text-xs font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded">
                      {lightboxItem.startingOdometer !== null ? `${lightboxItem.startingOdometer} KM` : 'N/A'}
                    </span>
                  </div>
                  {lightboxItem.startingOdometerImagePath && !lightboxItem.startingOdometerImagePath.startsWith('file://') ? (
                    <img
                      src={lightboxItem.startingOdometerImagePath}
                      alt="Starting Odometer"
                      className="w-full h-72 object-contain bg-black rounded-lg border border-slate-800"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://placehold.co/800x600/1e293b/94a3b8?text=Image+Unavailable';
                      }}
                    />
                  ) : (
                    <div className="w-full h-72 flex flex-col items-center justify-center bg-slate-900 rounded-lg text-slate-400 border border-slate-800 p-4 text-center">
                      <div className="text-3xl mb-2">📸</div>
                      <div className="text-xs font-semibold text-slate-300">
                        {lightboxItem.startingOdometerImagePath?.startsWith('file://')
                          ? 'Photo captured on driver device (Local URI from older test)'
                          : 'No starting photo recorded'}
                      </div>
                      {lightboxItem.startingOdometerImagePath?.startsWith('file://') && (
                        <div className="text-[10px] text-amber-400/80 mt-1">
                          New photos taken with updated driver app will render here automatically in HD.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Starting Photo Location Details Card */}
                  <div className="mt-3 bg-slate-900 border border-slate-800/80 rounded-lg p-3 text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-400">
                      <span>📍 START GPS LOCATION</span>
                      {lightboxItem.startGpsLat && lightboxItem.startGpsLng && (
                        <a
                          href={`https://www.google.com/maps?q=${lightboxItem.startGpsLat},${lightboxItem.startGpsLng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-sky-400 hover:text-sky-300 underline flex items-center gap-0.5"
                        >
                          Open in Maps ↗
                        </a>
                      )}
                    </div>
                    <div className="text-[11px] font-mono text-slate-300">
                      Coordinates: <span className="text-white font-bold">{lightboxItem.startGpsLat ? `${lightboxItem.startGpsLat.toFixed(5)}° N, ${lightboxItem.startGpsLng.toFixed(5)}° E` : 'Not recorded'}</span>
                    </div>
                    <div className="text-[11px] text-slate-300">
                      🏢 <strong className="text-slate-200">Area / Building:</strong>{' '}
                      <span className="text-emerald-300 font-medium">
                        {startLocName || lightboxItem.pickupAddress || 'Locating area...'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Final Odometer */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col">
                  <div className="w-full flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                      2. Final Odometer Photo
                    </span>
                    <span className="text-xs font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded">
                      {lightboxItem.finalOdometer !== null ? `${lightboxItem.finalOdometer} KM` : 'N/A'}
                    </span>
                  </div>
                  {lightboxItem.finalOdometerImagePath && !lightboxItem.finalOdometerImagePath.startsWith('file://') ? (
                    <img
                      src={lightboxItem.finalOdometerImagePath}
                      alt="Final Odometer"
                      className="w-full h-72 object-contain bg-black rounded-lg border border-slate-800"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://placehold.co/800x600/1e293b/94a3b8?text=Image+Unavailable';
                      }}
                    />
                  ) : (
                    <div className="w-full h-72 flex flex-col items-center justify-center bg-slate-900 rounded-lg text-slate-400 border border-slate-800 p-4 text-center">
                      <div className="text-3xl mb-2">📸</div>
                      <div className="text-xs font-semibold text-slate-300">
                        {lightboxItem.finalOdometerImagePath?.startsWith('file://')
                          ? 'Photo captured on driver device (Local URI from older test)'
                          : 'No final photo recorded'}
                      </div>
                      {lightboxItem.finalOdometerImagePath?.startsWith('file://') && (
                        <div className="text-[10px] text-amber-400/80 mt-1">
                          New photos taken with updated driver app will render here automatically in HD.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Final Photo Location Details Card */}
                  <div className="mt-3 bg-slate-900 border border-slate-800/80 rounded-lg p-3 text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-blue-400">
                      <span>📍 FINAL GPS LOCATION</span>
                      {lightboxItem.finalGpsLat && lightboxItem.finalGpsLng && (
                        <a
                          href={`https://www.google.com/maps?q=${lightboxItem.finalGpsLat},${lightboxItem.finalGpsLng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-sky-400 hover:text-sky-300 underline flex items-center gap-0.5"
                        >
                          Open in Maps ↗
                        </a>
                      )}
                    </div>
                    <div className="text-[11px] font-mono text-slate-300">
                      Coordinates: <span className="text-white font-bold">{lightboxItem.finalGpsLat ? `${lightboxItem.finalGpsLat.toFixed(5)}° N, ${lightboxItem.finalGpsLng.toFixed(5)}° E` : 'Not recorded'}</span>
                    </div>
                    <div className="text-[11px] text-slate-300">
                      🏢 <strong className="text-slate-200">Area / Building:</strong>{' '}
                      <span className="text-blue-300 font-medium">
                        {finalLocName || lightboxItem.dropAddress || 'Locating area...'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Distance Summary Metrics */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase">Odometer Distance</div>
                  <div className="text-lg font-bold text-white mt-0.5">
                    {lightboxItem.odometerDistanceKm !== null ? `${lightboxItem.odometerDistanceKm} km` : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase">GPS Breadcrumb Dist</div>
                  <div className="text-lg font-bold text-blue-300 mt-0.5">
                    {lightboxItem.gpsTrackedDistanceKm !== null ? `${lightboxItem.gpsTrackedDistanceKm} km` : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase">Booked Estimated Dist</div>
                  <div className="text-lg font-bold text-slate-300 mt-0.5">{lightboxItem.estimatedDistanceKm} km</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase">Discrepancy</div>
                  <div
                    className={`text-lg font-black mt-0.5 ${
                      lightboxItem.hasDiscrepancy ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {lightboxItem.discrepancyPercent !== null ? `${lightboxItem.discrepancyPercent}%` : '—'}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex justify-end">
              <button
                onClick={() => setLightboxItem(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition"
              >
                Close Lightbox
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
