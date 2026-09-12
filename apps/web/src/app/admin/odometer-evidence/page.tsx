'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Gauge,
  Camera,
  MapPin,
  X,
  Search,
  CheckCircle2,
  Clock,
} from 'lucide-react';

interface OdometerEntry {
  id: string;
  humanReadableRef: string;
  status: string;
  customerName: string;
  driverName: string;
  vehicleNumber: string;
  scheduledAt: string | null;
  tripStartedAt: string | null;
  tripCompletedAt: string | null;
  startingOdometer: number | null;
  startingOdometerImagePath: string | null;
  finalOdometer: number | null;
  finalOdometerImagePath: string | null;
  startLat: number | null;
  startLng: number | null;
  startLocation: string | null;
  endLat: number | null;
  endLng: number | null;
  endLocation: string | null;
  actualDistanceKm: number | null;
}

type FilterType = 'ALL' | 'TRIP_STARTED' | 'TRIP_COMPLETED';

function resolveImageSrc(path: string | null): string | null {
  if (!path) return null;
  // Already an absolute URL
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  // Relative paths: serve from /api/uploads or directly if rooted
  if (path.startsWith('/')) return path;
  if (path.startsWith('drivers/') || path.startsWith('uploads/')) return `/${path}`;
  return `/${path}`;
}

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'TRIP_COMPLETED') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
        <CheckCircle2 className="h-3 w-3" />
        Completed
      </span>
    );
  }
  if (status === 'TRIP_STARTED') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 animate-pulse">
        <Clock className="h-3 w-3" />
        In Progress
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">
      {status}
    </span>
  );
}

function OdometerImageModal({
  entry,
  onClose,
}: {
  entry: OdometerEntry;
  onClose: () => void;
}) {
  const startSrc = resolveImageSrc(entry.startingOdometerImagePath);
  const endSrc = resolveImageSrc(entry.finalOdometerImagePath);

  const startGps =
    entry.startLocation ||
    (entry.startLat != null && entry.startLng != null
      ? `${entry.startLat.toFixed(5)}, ${entry.startLng.toFixed(5)}`
      : null);

  const endGps =
    entry.endLocation ||
    (entry.endLat != null && entry.endLng != null
      ? `${entry.endLat.toFixed(5)}, ${entry.endLng.toFixed(5)}`
      : null);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl overflow-y-auto max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-kandy-border px-3.5 py-2.5 sm:px-6 sm:py-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-kandy-ink flex items-center gap-2">
              <Camera className="h-4 w-4 sm:h-5 sm:w-5 text-kandy-orange" />
              Odometer Images
            </h2>
            <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">
              {entry.humanReadableRef || entry.id} &nbsp;·&nbsp; {entry.customerName} &nbsp;·&nbsp; {entry.driverName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 sm:p-1.5 text-gray-400 hover:bg-gray-100 hover:text-kandy-ink transition-colors"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-3.5 sm:p-6 grid grid-cols-1 gap-3.5 sm:gap-6 sm:grid-cols-2">
          {/* Start Odometer */}
          <div className="flex flex-col gap-2 sm:gap-3">
            <h3 className="text-xs sm:text-sm font-semibold text-kandy-ink flex items-center gap-1.5">
              <Gauge className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-kandy-orange" />
              Start Odometer
              {entry.startingOdometer != null && (
                <span className="ml-auto font-bold text-kandy-orange">
                  {entry.startingOdometer.toLocaleString()} km
                </span>
              )}
            </h3>
            {startSrc ? (
              <div className="overflow-hidden rounded-xl border border-kandy-border bg-gray-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={startSrc}
                  alt="Start odometer"
                  className="h-40 sm:h-52 w-full object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                    const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
                <div
                  className="hidden h-40 sm:h-52 w-full flex-col items-center justify-center gap-2 bg-gray-100 text-gray-400"
                >
                  <Camera className="h-6 w-6 sm:h-8 sm:w-8" />
                  <span className="text-xs">Image failed to load</span>
                </div>
              </div>
            ) : (
              <div className="flex h-40 sm:h-52 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 text-gray-400">
                <Camera className="h-6 w-6 sm:h-8 sm:w-8" />
                <span className="text-xs">No image uploaded</span>
              </div>
            )}
            {/* Start GPS */}
            <div className="flex items-start gap-1.5 text-[11px] sm:text-xs text-gray-500">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-kandy-orange" />
              {startGps ? (
                <span>{startGps}</span>
              ) : (
                <span className="italic text-gray-400">No GPS recorded</span>
              )}
            </div>
          </div>

          {/* End Odometer */}
          <div className="flex flex-col gap-2 sm:gap-3">
            <h3 className="text-xs sm:text-sm font-semibold text-kandy-ink flex items-center gap-1.5">
              <Gauge className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-kandy-orange" />
              End Odometer
              {entry.finalOdometer != null && (
                <span className="ml-auto font-bold text-kandy-orange">
                  {entry.finalOdometer.toLocaleString()} km
                </span>
              )}
            </h3>
            {endSrc ? (
              <div className="overflow-hidden rounded-xl border border-kandy-border bg-gray-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={endSrc}
                  alt="End odometer"
                  className="h-40 sm:h-52 w-full object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                    const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
                <div
                  className="hidden h-40 sm:h-52 w-full flex-col items-center justify-center gap-2 bg-gray-100 text-gray-400"
                >
                  <Camera className="h-6 w-6 sm:h-8 sm:w-8" />
                  <span className="text-xs">Image failed to load</span>
                </div>
              </div>
            ) : (
              <div className="flex h-40 sm:h-52 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 text-gray-400">
                <Camera className="h-6 w-6 sm:h-8 sm:w-8" />
                <span className="text-xs">No image uploaded</span>
              </div>
            )}
            {/* End GPS */}
            <div className="flex items-start gap-1.5 text-[11px] sm:text-xs text-gray-500">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-kandy-orange" />
              {endGps ? (
                <span>{endGps}</span>
              ) : (
                <span className="italic text-gray-400">No GPS recorded</span>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        {entry.actualDistanceKm != null && (
          <div className="border-t border-kandy-border px-3.5 py-2.5 sm:px-6 sm:py-4 flex items-center gap-2 text-xs sm:text-sm font-medium text-kandy-ink">
            <Gauge className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-kandy-orange" />
            Actual distance travelled:&nbsp;
            <span className="font-bold text-kandy-orange">
              {entry.actualDistanceKm.toFixed(1)} km
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OdometerEvidencePage() {
  const [entries, setEntries] = useState<OdometerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [selectedEntry, setSelectedEntry] = useState<OdometerEntry | null>(null);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/odometer-evidence');
      const data = await res.json();
      setEntries(data.entries || []);
    } catch (err) {
      console.error('Failed to fetch odometer evidence:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const filtered = entries.filter((e) => {
    const matchesFilter =
      filter === 'ALL' || e.status === filter;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      (e.humanReadableRef || '').toLowerCase().includes(q) ||
      e.customerName.toLowerCase().includes(q) ||
      e.driverName.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  const filterOptions: { label: string; value: FilterType }[] = [
    { label: 'All', value: 'ALL' },
    { label: 'Trip Started', value: 'TRIP_STARTED' },
    { label: 'Trip Completed', value: 'TRIP_COMPLETED' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-4 sm:mb-6 flex flex-col gap-0.5 sm:gap-1">
        <div className="flex items-center gap-2">
          <Gauge className="h-5 w-5 sm:h-7 sm:w-7 text-kandy-orange" />
          <h1 className="text-xl sm:text-2xl font-bold text-kandy-ink">Odometer Evidence</h1>
        </div>
        <p className="text-xs sm:text-sm text-gray-500 ml-7 sm:ml-9">
          Trip start &amp; end odometer readings and images
        </p>
      </div>

      {/* Controls */}
      <div className="mb-3.5 sm:mb-5 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search ref, driver, customer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-kandy-border bg-white py-1.5 sm:py-2.5 pl-8 sm:pl-9 pr-3 sm:pr-4 text-xs sm:text-sm text-kandy-ink placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-kandy-orange/40"
          />
        </div>

        {/* Filter pills */}
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {filterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`rounded-full px-3 py-1 sm:px-4 sm:py-1.5 text-[11px] sm:text-xs font-semibold transition-colors ${
                filter === opt.value
                  ? 'bg-kandy-orange text-white shadow'
                  : 'bg-white border border-kandy-border text-gray-600 hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table card */}
      <div className="rounded-card border border-kandy-border bg-white shadow-card overflow-x-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 sm:py-24 text-gray-400">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full border-4 border-kandy-orange border-t-transparent animate-spin" />
            <span className="text-xs sm:text-sm">Loading odometer records…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 sm:py-24 text-gray-400">
            <Gauge className="h-10 w-10 sm:h-12 sm:w-12" />
            <span className="text-xs sm:text-sm">No records found</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-kandy-border text-xs sm:text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    'Ref ID',
                    'Customer',
                    'Driver',
                    'Vehicle',
                    'Start Reading',
                    'End Reading',
                    'Distance',
                    'Start Time',
                    'End Time',
                    'Images',
                    'Status',
                  ].map((col) => (
                    <th
                      key={col}
                      className="whitespace-nowrap px-2.5 py-2 sm:px-4 sm:py-3 text-left text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-gray-500"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-kandy-border">
                {filtered.map((entry) => {
                  const hasImages =
                    !!entry.startingOdometerImagePath || !!entry.finalOdometerImagePath;
                  return (
                    <tr
                      key={entry.id}
                      className="hover:bg-orange-50/40 transition-colors"
                    >
                      {/* Ref ID */}
                      <td className="whitespace-nowrap px-2.5 py-2 sm:px-4 sm:py-3 font-mono text-[11px] sm:text-xs font-semibold text-kandy-ink">
                        {entry.humanReadableRef || entry.id}
                      </td>

                      {/* Customer */}
                      <td className="whitespace-nowrap px-2.5 py-2 sm:px-4 sm:py-3 text-kandy-ink text-xs sm:text-sm">
                        {entry.customerName}
                      </td>

                      {/* Driver */}
                      <td className="whitespace-nowrap px-2.5 py-2 sm:px-4 sm:py-3 text-kandy-ink text-xs sm:text-sm">
                        {entry.driverName}
                      </td>

                      {/* Vehicle */}
                      <td className="whitespace-nowrap px-2.5 py-2 sm:px-4 sm:py-3 text-gray-600 text-xs sm:text-sm">
                        {entry.vehicleNumber}
                      </td>

                      {/* Start Reading */}
                      <td className="whitespace-nowrap px-2.5 py-2 sm:px-4 sm:py-3">
                        {entry.startingOdometer != null ? (
                          <span className="font-semibold text-kandy-ink text-xs sm:text-sm">
                            {entry.startingOdometer.toLocaleString()} km
                          </span>
                        ) : (
                          <span className="italic text-gray-400 text-[11px] sm:text-xs">Not recorded</span>
                        )}
                      </td>

                      {/* End Reading */}
                      <td className="whitespace-nowrap px-2.5 py-2 sm:px-4 sm:py-3">
                        {entry.finalOdometer != null ? (
                          <span className="font-semibold text-kandy-ink text-xs sm:text-sm">
                            {entry.finalOdometer.toLocaleString()} km
                          </span>
                        ) : (
                          <span className="italic text-gray-400 text-[11px] sm:text-xs">Not recorded</span>
                        )}
                      </td>

                      {/* Distance */}
                      <td className="whitespace-nowrap px-2.5 py-2 sm:px-4 sm:py-3">
                        {entry.actualDistanceKm != null ? (
                          <span className="font-semibold text-kandy-orange text-xs sm:text-sm">
                            {entry.actualDistanceKm.toFixed(1)} km
                          </span>
                        ) : (
                          <span className="italic text-gray-400 text-[11px] sm:text-xs">—</span>
                        )}
                      </td>

                      {/* Start Time */}
                      <td className="whitespace-nowrap px-2.5 py-2 sm:px-4 sm:py-3 text-[11px] sm:text-xs text-gray-600">
                        {formatTime(entry.tripStartedAt)}
                      </td>

                      {/* End Time */}
                      <td className="whitespace-nowrap px-2.5 py-2 sm:px-4 sm:py-3 text-[11px] sm:text-xs text-gray-600">
                        {formatTime(entry.tripCompletedAt)}
                      </td>

                      {/* Images */}
                      <td className="whitespace-nowrap px-2.5 py-2 sm:px-4 sm:py-3">
                        <button
                          onClick={() => setSelectedEntry(entry)}
                          className={`inline-flex items-center gap-1 sm:gap-1.5 rounded-lg px-2 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-semibold transition-colors ${
                            hasImages
                              ? 'bg-kandy-orange text-white hover:bg-kandy-orange/90 shadow-sm'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          <Camera className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          VIEW IMAGES
                        </button>
                      </td>

                      {/* Status */}
                      <td className="whitespace-nowrap px-2.5 py-2 sm:px-4 sm:py-3">
                        <StatusBadge status={entry.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {selectedEntry && (
        <OdometerImageModal
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
        />
      )}
    </div>
  );
}
