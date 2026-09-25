'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ALL_LOCATIONS, PlaceLocation } from '@/lib/locations';

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  targetType: 'PICKUP' | 'DROP' | 'STOP';
  selectedAddress: string;
  onSelectLocation: (place: PlaceLocation) => void;
}

export function LocationPickerModal({
  isOpen,
  onClose,
  title,
  targetType,
  selectedAddress,
  onSelectLocation,
}: LocationPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'MANGALURU' | 'AIRPORTS' | 'OUTSTATION'>('ALL');
  const [osmResults, setOsmResults] = useState<PlaceLocation[]>([]);
  const [isSearchingOsm, setIsSearchingOsm] = useState(false);
  const [fetchingGps, setFetchingGps] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setOsmResults([]);
      setActiveCategory('ALL');
      setGpsError('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Live OSM Nominatim Search (Debounced 350ms)
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setOsmResults([]);
      setIsSearchingOsm(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingOsm(true);
      try {
        const q = encodeURIComponent(`${searchQuery.trim()}, Karnataka, India`);
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${q}&countrycodes=in&limit=8&addressdetails=1`
        );
        if (res.ok) {
          const data = await res.json();
          const places: PlaceLocation[] = data.map((item: any) => {
            const parts = item.display_name.split(',');
            return {
              label: parts[0]?.trim() || item.display_name,
              sublabel: parts.slice(1, 4).join(',').trim(),
              lat: parseFloat(item.lat),
              lng: parseFloat(item.lon),
              category: 'OUTSTATION',
              source: 'OSM_LIVE',
            };
          });
          setOsmResults(places);
        }
      } catch (err) {
        console.error('OSM Search Error:', err);
      } finally {
        setIsSearchingOsm(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch Live Current Location via Browser GPS & OSM Reverse Geocode
  const handleFetchCurrentLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    setFetchingGps(true);
    setGpsError('');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
          );
          if (res.ok) {
            const data = await res.json();
            const parts = (data.display_name || '').split(',');
            const label = parts.slice(0, 2).join(',').trim() || 'Current Location';
            const sublabel = parts.slice(2, 5).join(',').trim() || `GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
            
            const place: PlaceLocation = {
              label: `${label} (Current Location)`,
              sublabel,
              lat: latitude,
              lng: longitude,
              category: 'MANGALURU',
              source: 'OSM_LIVE',
            };
            onSelectLocation(place);
            onClose();
          } else {
            throw new Error('Reverse geocode failed');
          }
        } catch {
          const place: PlaceLocation = {
            label: `Current GPS Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
            sublabel: 'Browser Live Location',
            lat: latitude,
            lng: longitude,
            category: 'MANGALURU',
            source: 'OSM_LIVE',
          };
          onSelectLocation(place);
          onClose();
        } finally {
          setFetchingGps(false);
        }
      },
      (err) => {
        setFetchingGps(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError('Location permission denied. Please allow location access in your browser.');
        } else {
          setGpsError('Unable to retrieve your location. Please select from the list.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Filter verified locations
  const filteredPresetLocations = ALL_LOCATIONS.filter((loc) => {
    // 1. Category Filter
    if (activeCategory !== 'ALL' && loc.category !== activeCategory) {
      return false;
    }
    // 2. Search Query Filter
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      loc.label.toLowerCase().includes(q) ||
      loc.sublabel?.toLowerCase().includes(q) ||
      loc.keywords?.some((k) => k.toLowerCase().includes(q))
    );
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white text-slate-900 animate-fadeIn">
      {/* Modal Header */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">
            {targetType === 'PICKUP' ? '🟢' : targetType === 'DROP' ? '🔴' : '🟡'}
          </span>
          <div>
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-500 font-medium">Karnataka Door-to-Door Verified Search</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition text-sm font-bold"
        >
          ✕
        </button>
      </div>

      {/* Search Bar & GPS Button */}
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80 space-y-2.5 shrink-0">
        <div className="relative flex items-center">
          <span className="absolute left-3.5 text-slate-400 pointer-events-none">🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search area, landmark, airport, temple, beach..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-medium shadow-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Quick Current Location GPS Pill - ONLY for PICKUP */}
        {targetType === 'PICKUP' && (
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleFetchCurrentLocation}
              disabled={fetchingGps}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-bold transition shadow-xs disabled:opacity-50"
            >
              {fetchingGps ? (
                <>
                  <span className="animate-spin text-sm">⏳</span>
                  <span>Detecting GPS Location...</span>
                </>
              ) : (
                <>
                  <span>⚡ Use Live GPS Location</span>
                </>
              )}
            </button>
            {gpsError && (
              <span className="text-[11px] text-red-600 font-medium">{gpsError}</span>
            )}
          </div>
        )}

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          {[
            { id: 'ALL', label: 'All Locations' },
            { id: 'MANGALURU', label: '🏖️ Mangaluru & Udupi' },
            { id: 'AIRPORTS', label: '✈️ Airports & Stations' },
            { id: 'OUTSTATION', label: '🛣️ Outstation Cities' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveCategory(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-bold transition shadow-xs ${
                activeCategory === tab.id
                  ? 'bg-orange-500 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Locations List — scrollable */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-1 divide-y divide-slate-100 custom-scrollbar bg-white">
        {/* OSM Live Loading Indicator */}
        {isSearchingOsm && (
          <div className="p-3 text-center text-xs text-orange-600 font-medium flex items-center justify-center gap-2">
            <span className="animate-spin">⏳</span>
            <span>Searching OpenStreetMap across Karnataka...</span>
          </div>
        )}

        {/* Live OpenStreetMap Results */}
        {osmResults.length > 0 && (
          <div className="pb-2">
            <div className="px-3 py-1 text-[11px] font-bold text-orange-700 uppercase tracking-wider flex items-center gap-1">
              <span>🌐 OpenStreetMap Live Matches</span>
            </div>
            {osmResults.map((loc, idx) => (
              <button
                key={`osm-${idx}`}
                type="button"
                onClick={() => {
                  onSelectLocation(loc);
                  onClose();
                }}
                className="w-full p-2.5 rounded-xl text-left hover:bg-orange-50/70 transition flex items-start justify-between gap-3 group border border-transparent"
              >
                <div className="flex items-start gap-2.5">
                  <span className="text-base mt-0.5">📍</span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-slate-900 group-hover:text-orange-600 transition">
                        {loc.label}
                      </span>
                      <span className="text-[9px] bg-orange-100 text-orange-800 border border-orange-300 px-1 rounded font-black">
                        OSM Live
                      </span>
                    </div>
                    {loc.sublabel && (
                      <p className="text-xs text-slate-500 line-clamp-1">{loc.sublabel}</p>
                    )}
                  </div>
                </div>
                <span className="text-xs text-orange-600 font-bold opacity-0 group-hover:opacity-100 transition self-center">
                  Select →
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Verified Presets */}
        <div>
          {osmResults.length > 0 && (
            <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              ⭐ Verified Karnataka Hubs & Landmarks
            </div>
          )}

          {filteredPresetLocations.length === 0 && osmResults.length === 0 && !isSearchingOsm && (
            <div className="p-8 text-center text-slate-400 space-y-2">
              <p className="text-2xl">🔍</p>
              <p className="text-sm font-semibold text-slate-700">No exact preset found for &quot;{searchQuery}&quot;</p>
              <p className="text-xs text-slate-500">
                Try searching by area or town name (e.g. Shakthinagar, Mudipu, Surathkal, Belur).
              </p>
            </div>
          )}

          {filteredPresetLocations.map((loc, idx) => {
            const isSelected = selectedAddress === loc.label;
            return (
              <button
                key={`preset-${idx}`}
                type="button"
                onClick={() => {
                  onSelectLocation(loc);
                  onClose();
                }}
                className={`w-full p-2.5 rounded-xl text-left transition flex items-start justify-between gap-3 group ${
                  isSelected
                    ? 'bg-orange-50/90 border border-orange-300'
                    : 'hover:bg-slate-50 border border-transparent'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <span className="text-base mt-0.5">
                    {loc.category === 'AIRPORTS' ? '✈️' : loc.category === 'OUTSTATION' ? '🛣️' : '📍'}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-bold transition ${
                          isSelected ? 'text-orange-900' : 'text-slate-800 group-hover:text-orange-600'
                        }`}
                      >
                        {loc.label}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.5 rounded-full font-bold">
                          ✓ Selected
                        </span>
                      )}
                    </div>
                    {loc.sublabel && (
                      <p className={`text-xs line-clamp-1 ${isSelected ? 'text-orange-700/80' : 'text-slate-500'}`}>
                        {loc.sublabel}
                      </p>
                    )}
                  </div>
                </div>
                <span className={`text-xs transition self-center font-bold ${
                  isSelected ? 'text-orange-600' : 'text-slate-400 group-hover:text-orange-600'
                }`}>
                  ›
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500 shrink-0">
        <span>💡 100% Free OpenStreetMap & OSRM Routing</span>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg font-bold transition shadow-xs"
        >
          Close
        </button>
      </div>
    </div>
  );
}
