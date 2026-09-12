'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, MinusCircle, PlusCircle, CheckCircle2, AlertCircle } from 'lucide-react';
import { searchLocations, SelectedLocation } from '@/lib/locationProvider';

interface LocationSearchInputProps {
  label?: string;
  placeholder?: string;
  value: SelectedLocation;
  onChange: (location: SelectedLocation) => void;
  isAirportOnly?: boolean;
  onDelete?: () => void;
  onAddNext?: () => void;
  showDelete?: boolean;
  showAdd?: boolean;
  validationError?: string | null;
}

export function LocationSearchInput({
  label,
  placeholder = 'Search place, road, landmark, city...',
  value,
  onChange,
  isAirportOnly = false,
  onDelete,
  onAddNext,
  showDelete = false,
  showAdd = false,
  validationError,
}: LocationSearchInputProps) {
  const [inputValue, setInputValue] = useState(value.placeName || value.address || '');
  const [suggestions, setSuggestions] = useState<SelectedLocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync internal input value if external value changes (and is selected)
  useEffect(() => {
    if (value.isSelected) {
      setInputValue(value.placeName || value.address);
    }
  }, [value.placeName, value.address, value.isSelected]);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    setIsOpen(true);
    setError(null);

    // Mark as unselected until user explicitly clicks a suggestion
    onChange({
      placeName: val,
      address: val,
      latitude: 0,
      longitude: 0,
      isSelected: false,
    });

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!val.trim()) {
      setIsLoading(true);
      searchLocations('', isAirportOnly)
        .then((res) => setSuggestions(res))
        .catch(() => setSuggestions([]))
        .finally(() => setIsLoading(false));
      return;
    }

    setIsLoading(true);

    // 300ms Debounce to prevent excessive API requests
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const results = await searchLocations(val, isAirportOnly);
        setSuggestions(results);
      } catch (err) {
        console.error('Location search error:', err);
        setError('Unable to load locations. Please try again.');
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);
  };

  const handleFocus = async () => {
    setIsOpen(true);
    setError(null);
    if (!inputValue.trim() || suggestions.length === 0) {
      setIsLoading(true);
      try {
        const res = await searchLocations(inputValue.trim(), isAirportOnly);
        setSuggestions(res);
      } catch (err) {
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSelectSuggestion = async (item: SelectedLocation) => {
    setInputValue(item.placeName);
    setIsOpen(false);

    // If Google placeId is present and lat/lng are 0, fetch full place details
    if (item.placeId && item.placeId.startsWith('ChIJ') && (!item.latitude || !item.longitude)) {
      try {
        const res = await fetch(`/api/places/details?placeId=${item.placeId}`);
        if (res.ok) {
          const details = await res.json();
          onChange(details);
          return;
        }
      } catch (e) {
        console.warn('Place details fetch failed:', e);
      }
    }

    onChange({
      ...item,
      isSelected: true,
    });
  };

  return (
    <div ref={containerRef} className="w-full">
      {label && (
        <div className="flex items-center justify-between mb-0.5">
          <label className="block text-[9px] sm:text-[11px] font-black uppercase text-gray-700 tracking-wider">
            {label}
          </label>
        </div>
      )}

      {/* Input Box & Dropdown Wrapper */}
      <div className="relative">
        <div className={`relative flex items-center bg-gray-50 hover:bg-white focus-within:bg-white border-2 transition rounded-md sm:rounded-lg lg:rounded-xl px-2 py-0.5 sm:px-2.5 sm:py-1 md:px-3 md:py-1 min-h-[32px] sm:min-h-[34px] md:min-h-[36px] lg:min-h-[38px] shadow-xs ${
          validationError && !value.isSelected ? 'border-red-400 focus-within:border-red-500' : 'border-gray-200 focus-within:border-kandy-orange focus-within:ring-2 focus-within:ring-kandy-orange/20'
        }`}>
          <Search className="w-3 h-3 sm:w-3.5 sm:h-4 text-kandy-orange shrink-0 mr-1.5" />

          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={handleFocus}
            placeholder={placeholder}
            className="w-full bg-transparent text-[11px] sm:text-xs lg:text-sm font-bold text-gray-900 focus:outline-none placeholder-gray-400"
          />

          {value.isSelected && (
            <span title="Location selected" className="ml-1.5 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
            </span>
          )}

          {/* Action Controls (+ and -) */}
          {(showDelete || showAdd) && (
            <div className="flex items-center gap-1 shrink-0 ml-1.5">
              {showDelete && onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  title="Remove Stop"
                  className="text-gray-400 hover:text-red-600 transition p-0.5 active:scale-95"
                >
                  <MinusCircle className="w-4 h-4" />
                </button>
              )}
              {showAdd && onAddNext && (
                <button
                  type="button"
                  onClick={onAddNext}
                  title="Add Next Stop"
                  className="text-gray-400 hover:text-kandy-orange transition p-0.5 active:scale-95"
                >
                  <PlusCircle className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Validation Warning */}
        {validationError && !value.isSelected && (
          <div className="text-[10px] font-extrabold text-red-600 mt-0.5 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* SUGGESTIONS DROPDOWN (Positioned exactly at the bottom of search box) */}
        {isOpen && (
          <div className="absolute left-0 right-0 top-full mt-0.5 bg-white border-2 border-kandy-orange/40 rounded-lg sm:rounded-xl shadow-2xl z-50 max-h-48 sm:max-h-64 overflow-y-auto py-0.5 text-xs divide-y divide-gray-100">
            {!inputValue.trim() && !isLoading && (
              <div className="px-2.5 py-1 bg-gray-50 text-[9px] font-black text-gray-500 uppercase tracking-wider flex items-center justify-between border-b border-gray-200">
                <span>{isAirportOnly ? 'POPULAR AIRPORTS' : 'POPULAR LANDMARKS & CITIES'}</span>
                <span className="h-0.5 bg-gray-300 w-8 rounded"></span>
              </div>
            )}

            {isLoading && (
              <div className="p-2.5 text-center text-gray-500 font-semibold text-xs flex items-center justify-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-kandy-orange" />
                <span>Searching locations...</span>
              </div>
            )}

            {error && !isLoading && (
              <div className="p-2 text-center text-red-500 font-semibold text-xs">{error}</div>
            )}

            {!isLoading && !error && suggestions.length === 0 && inputValue.trim().length >= 2 && (
              <div className="p-2.5 text-center text-gray-500 text-[11px] font-medium">
                No matching locations found.
              </div>
            )}

            {!isLoading &&
              !error &&
              suggestions.map((item, idx) => (
                <div
                  key={idx}
                  onMouseDown={() => handleSelectSuggestion(item)}
                  className="px-2.5 py-1.5 hover:bg-orange-50 active:bg-orange-100 cursor-pointer transition flex items-center gap-2 group"
                >
                  <Search className="w-3 h-3 text-kandy-orange shrink-0 group-hover:scale-110 transition-transform" />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-xs text-gray-900 group-hover:text-kandy-orange truncate">
                      {item.placeName}
                    </div>
                    <div className="text-[10px] text-gray-500 truncate">
                      {item.address}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
