'use client';

import React, { useState, useEffect } from 'react';

export interface SelectedLocationData {
  locationId?: string;
  displayName: string;
  address: string;
  latitude: number;
  longitude: number;
}

interface LocationItem {
  id: string;
  displayName: string;
  address: string;
  latitude: number;
  longitude: number;
  distanceKmFromMangaluru: number;
  isPopular: boolean;
  category: string;
}

interface LocationAutocompleteProps {
  id: string;
  label: string;
  value: string;
  onChange: (data: SelectedLocationData) => void;
  placeholder?: string;
}

export const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  id,
  label,
  value,
  onChange,
  placeholder = 'Type city, landmark, or airport...',
}) => {
  const [query, setQuery] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [popularLocations, setPopularLocations] = useState<LocationItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Fetch initial popular locations
  useEffect(() => {
    fetch('/api/locations?popular=true')
      .then((res) => res.json())
      .then((data) => {
        if (data.locations) {
          setPopularLocations(data.locations);
          setLocations(data.locations);
        }
      })
      .catch(() => {});
  }, []);

  // Server-side debounced search
  useEffect(() => {
    if (!query.trim()) {
      setLocations(popularLocations);
      return;
    }

    const timer = setTimeout(() => {
      setLoading(true);
      fetch(`/api/locations?query=${encodeURIComponent(query)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.locations) {
            setLocations(data.locations);
          }
        })
        .finally(() => setLoading(false));
    }, 200);

    return () => clearTimeout(timer);
  }, [query, popularLocations]);

  const handleSelect = (item: LocationItem) => {
    setQuery(item.displayName);
    setIsOpen(false);
    onChange({
      locationId: item.id,
      displayName: item.displayName,
      address: item.address,
      latitude: item.latitude,
      longitude: item.longitude,
    });
  };

  const handleClear = () => {
    setQuery('');
    setIsOpen(true);
    onChange({
      displayName: '',
      address: '',
      latitude: 0,
      longitude: 0,
    });
  };

  return (
    <div className="fld" style={{ position: 'relative' }}>
      <label htmlFor={id} style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>{label}</span>
        {query && (
          <button
            type="button"
            onClick={handleClear}
            style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '11px', cursor: 'pointer' }}
          >
            ✕ Clear
          </button>
        )}
      </label>

      <div style={{ position: 'relative' }}>
        <input
          id={id}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          required
          style={{ width: '100%', paddingRight: '30px' }}
        />
        {loading && (
          <span style={{ position: 'absolute', right: '10px', top: '12px', fontSize: '11px', color: 'var(--muted)' }}>
            ...
          </span>
        )}
      </div>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 100,
            background: '#ffffff',
            border: '1px solid var(--line)',
            borderRadius: 'var(--r-m)',
            boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
            margin: '4px 0 0',
            padding: '8px',
            maxHeight: '260px',
            overflowY: 'auto',
          }}
        >
          {/* Popular Destinations Quick Pills */}
          {!query && popularLocations.length > 0 && (
            <div style={{ marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px solid var(--line)' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
                🌟 Popular Coastal Destinations
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                {popularLocations.slice(0, 5).map((pop) => (
                  <button
                    key={pop.id}
                    type="button"
                    onClick={() => handleSelect(pop)}
                    style={{
                      background: 'var(--bg-soft)',
                      border: '1px solid var(--line)',
                      borderRadius: '12px',
                      padding: '3px 8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--ink)',
                      cursor: 'pointer',
                    }}
                  >
                    📍 {pop.displayName.split('/')[0]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Autocomplete List */}
          {locations.length > 0 ? (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {locations.map((item) => (
                <li
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  style={{
                    padding: '8px 10px',
                    fontSize: '13px',
                    cursor: 'pointer',
                    borderRadius: 'var(--r-s)',
                    marginBottom: '2px',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-soft)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ fontWeight: 700, color: 'var(--ink)' }}>
                    📍 {item.displayName}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '1px' }}>
                    {item.address} ({item.distanceKmFromMangaluru} km from Mangaluru)
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: 'var(--muted)' }}>
              No matching coastal locations found.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
