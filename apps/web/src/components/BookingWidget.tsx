'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TripType } from '@kandycabs/shared';
import { PlaneTakeoff, PlaneLanding, AlertCircle, ArrowLeftRight, Car, RefreshCw, MapPin, Plane } from 'lucide-react';
import { LocationSearchInput } from './LocationSearchInput';
import { SelectedLocation } from '@/lib/locationProvider';

export function BookingWidget() {
  const router = useRouter();
  const [tripType, setTripType] = useState<TripType>(TripType.ONEWAY);
  const [airportTripMode, setAirportTripMode] = useState<'PICKUP' | 'DROP'>('PICKUP');

  // Selected Location Objects (empty by default, shown in dropdown on focus)
  const [pickupLocation, setPickupLocation] = useState<SelectedLocation>({
    placeName: '',
    address: '',
    latitude: 0,
    longitude: 0,
    isSelected: false,
  });

  const [dropLocation, setDropLocation] = useState<SelectedLocation>({
    placeName: '',
    address: '',
    latitude: 0,
    longitude: 0,
    isSelected: false,
  });

  // Dynamic Intermediate Stops State (Exclusively for Round Trips, empty by default)
  const [stops, setStops] = useState<SelectedLocation[]>([]);

  const [pickupDate, setPickupDate] = useState('2026-09-15');
  const [pickupTime, setPickupTime] = useState('07:00');
  const [returnDate, setReturnDate] = useState('2026-09-17');
  const [localPackage, setLocalPackage] = useState('8hr / 80km');

  // Global Validation Error State
  const [formError, setFormError] = useState<string | null>(null);

  // Switch to Airport Mode helper
  const handleSelectAirportTab = () => {
    setTripType(TripType.AIRPORT);
    setAirportTripMode('PICKUP');
    setPickupLocation({
      placeName: '',
      address: '',
      latitude: 0,
      longitude: 0,
      isSelected: false,
    });
    setDropLocation({
      placeName: '',
      address: '',
      latitude: 0,
      longitude: 0,
      isSelected: false,
    });
    setFormError(null);
  };

  // Multi-stop handlers (+ and - after previous location to add next location)
  const insertStopAfter = (index: number) => {
    if (stops.length >= 10) {
      setFormError('Maximum limit of 10 intermediate stops reached.');
      return;
    }
    const updated = [...stops];
    const emptyStop: SelectedLocation = {
      placeName: '',
      address: '',
      latitude: 0,
      longitude: 0,
      isSelected: false,
    };
    if (index < 0 || stops.length === 0) {
      updated.push(emptyStop);
    } else {
      updated.splice(index + 1, 0, emptyStop);
    }
    setStops(updated);
    setFormError(null);
  };

  const removeStop = (index: number) => {
    setStops(stops.filter((_, i) => i !== index));
  };

  const handleStopChange = (index: number, val: SelectedLocation) => {
    const updated = [...stops];
    updated[index] = val;
    setStops(updated);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Strict Location Selection Validation Rule
    if (!pickupLocation.isSelected || !pickupLocation.placeName) {
      setFormError('Please select a pickup location from the suggestions.');
      return;
    }

    if (tripType !== TripType.LOCAL && (!dropLocation.isSelected || !dropLocation.placeName)) {
      setFormError('Please select a destination location from the suggestions.');
      return;
    }

    if (tripType === TripType.ROUND) {
      const invalidStop = stops.find((s) => s.placeName.trim() !== '' && !s.isSelected);
      if (invalidStop) {
        setFormError('Please select all intermediate stops from the suggestions.');
        return;
      }
    }

    const validStops = stops.filter((s) => s.placeName && s.placeName.trim().length > 0);

    const query = new URLSearchParams({
      tripType,
      pickup: JSON.stringify(pickupLocation),
      drop: JSON.stringify(dropLocation),
      date: pickupDate,
      time: pickupTime,
      returnDate: tripType === TripType.ROUND ? returnDate : '',
      localPackage: tripType === TripType.LOCAL ? localPackage : '',
      stops: tripType === TripType.ROUND ? JSON.stringify(validStops) : '',
      airportMode: tripType === TripType.AIRPORT ? airportTripMode : '',
    });

    router.push(`/booking?${query.toString()}`);
  };

  return (
    <>
      <div className="w-full max-w-5xl mx-auto bg-white rounded-xl sm:rounded-2xl shadow-xl sm:shadow-2xl border border-gray-100 relative z-30 p-2 sm:p-2.5 md:p-3 lg:p-8">
        {/* TRIP TYPE TAB SELECTOR (Desktop & Tablet - Mobile uses Sticky Bottom Bar) */}
        <div className="hidden sm:block mb-1.5 sm:mb-1.5 md:mb-2 lg:mb-6">
          {/* Tablet & Desktop View: 1 Single Row Bar */}
          <div className="p-0.5 sm:p-1 md:p-1 bg-gray-100/90 rounded-xl sm:rounded-2xl border border-gray-200/80 shadow-inner">
            <div className="grid grid-cols-4 gap-1 sm:gap-1 md:gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setTripType(TripType.ONEWAY);
                  setFormError(null);
                }}
                className={`py-1 sm:py-1 md:py-1.5 lg:py-2.5 px-1 sm:px-2 md:px-2.5 lg:px-4 rounded-lg sm:rounded-xl font-extrabold text-[10px] sm:text-[11px] md:text-xs uppercase tracking-tight flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 transition active:scale-95 cursor-pointer ${
                  tripType === TripType.ONEWAY
                    ? 'bg-kandy-orange text-white shadow-md font-black'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-white/60'
                }`}
              >
                <Car className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>One Way</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTripType(TripType.ROUND);
                  setFormError(null);
                }}
                className={`py-1 sm:py-1 md:py-1.5 lg:py-2.5 px-1 sm:px-2 md:px-2.5 lg:px-4 rounded-lg sm:rounded-xl font-extrabold text-[10px] sm:text-[11px] md:text-xs uppercase tracking-tight flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 transition active:scale-95 cursor-pointer ${
                  tripType === TripType.ROUND
                    ? 'bg-kandy-orange text-white shadow-md font-black'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-white/60'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>Round Trip</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTripType(TripType.LOCAL);
                  setFormError(null);
                }}
                className={`py-1 sm:py-1 md:py-1.5 lg:py-2.5 px-1 sm:px-2 md:px-2.5 lg:px-4 rounded-lg sm:rounded-xl font-extrabold text-[10px] sm:text-[11px] md:text-xs uppercase tracking-tight flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 transition active:scale-95 cursor-pointer ${
                  tripType === TripType.LOCAL
                    ? 'bg-kandy-orange text-white shadow-md font-black'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-white/60'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>Local</span>
              </button>

              <button
                type="button"
                onClick={handleSelectAirportTab}
                className={`py-1 sm:py-1 md:py-1.5 lg:py-2.5 px-1 sm:px-2 md:px-2.5 lg:px-4 rounded-lg sm:rounded-xl font-extrabold text-[10px] sm:text-[11px] md:text-xs uppercase tracking-tight flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 transition active:scale-95 cursor-pointer ${
                  tripType === TripType.AIRPORT
                    ? 'bg-kandy-orange text-white shadow-md font-black'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-white/60'
                }`}
              >
                <Plane className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>Airport</span>
              </button>
            </div>
          </div>
        </div>

        {/* Form Error Banner */}
        {formError && (
          <div className="mb-3 p-2.5 bg-red-50 border-2 border-red-200 rounded-xl text-xs font-extrabold text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* Main Dynamic Booking Form */}
        <form onSubmit={handleSearch} className="space-y-1 sm:space-y-1.5 md:space-y-2 lg:space-y-5">
          {/* ROUTE LOCATION INPUTS CONTAINER */}
          <div className="relative bg-gray-50/80 p-1.5 sm:p-2 md:p-2.5 lg:p-5 rounded-lg sm:rounded-2xl border border-gray-200 space-y-1 sm:space-y-1 md:space-y-1.5 lg:space-y-4">
            {/* Dedicated Airport Transfer Direction Toggle (Positioned right above Pickup Location) */}
            {tripType === TripType.AIRPORT && (
              <div className="flex items-center justify-center gap-0.5 sm:gap-2 bg-orange-50/90 p-0 sm:p-1.5 rounded-md sm:rounded-xl border border-orange-200 text-xs font-bold mb-1 sm:mb-2">
                <button
                  type="button"
                  onClick={() => {
                    setAirportTripMode('PICKUP');
                    setPickupLocation({
                      placeName: '',
                      address: '',
                      latitude: 0,
                      longitude: 0,
                      isSelected: false,
                    });
                    setDropLocation({
                      placeName: '',
                      address: '',
                      latitude: 0,
                      longitude: 0,
                      isSelected: false,
                    });
                  }}
                  className={`flex-1 px-1.5 py-1 sm:px-4 sm:py-2 rounded-md sm:rounded-lg flex items-center justify-center gap-1 sm:gap-1.5 transition text-[10px] sm:text-xs ${
                    airportTripMode === 'PICKUP'
                      ? 'bg-kandy-orange text-white shadow-sm font-extrabold'
                      : 'text-kandy-ink hover:bg-white bg-white/70'
                  }`}
                >
                  <PlaneLanding className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                  <span>Pickup from Airport</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAirportTripMode('DROP');
                    setPickupLocation({
                      placeName: '',
                      address: '',
                      latitude: 0,
                      longitude: 0,
                      isSelected: false,
                    });
                    setDropLocation({
                      placeName: '',
                      address: '',
                      latitude: 0,
                      longitude: 0,
                      isSelected: false,
                    });
                  }}
                  className={`flex-1 px-1.5 py-1 sm:px-4 sm:py-2 rounded-md sm:rounded-lg flex items-center justify-center gap-1 sm:gap-1.5 transition text-[10px] sm:text-xs ${
                    airportTripMode === 'DROP'
                      ? 'bg-kandy-orange text-white shadow-sm font-extrabold'
                      : 'text-kandy-ink hover:bg-white bg-white/70'
                  }`}
                >
                  <PlaneTakeoff className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                  <span>Drop to Airport</span>
                </button>
              </div>
            )}
            {/* FROM Location */}
            <div className="relative">
              <LocationSearchInput
                label={tripType === TripType.LOCAL ? 'CITY / TOWN' : 'PICKUP LOCATION'}
                placeholder={
                  tripType === TripType.LOCAL
                    ? 'Enter City name'
                    : tripType === TripType.AIRPORT && airportTripMode === 'PICKUP'
                    ? 'Select Airport Location'
                    : 'Enter Pickup Place, Landmark, Railway Station...'
                }
                value={pickupLocation}
                onChange={(loc) => {
                  setPickupLocation(loc);
                  setFormError(null);
                }}
                isAirportOnly={tripType === TripType.AIRPORT && airportTripMode === 'PICKUP'}
                validationError={
                  !pickupLocation.isSelected && pickupLocation.placeName
                    ? tripType === TripType.LOCAL
                      ? 'Please select a city from the suggestions.'
                      : 'Please select a pickup location from suggestions.'
                    : null
                }
              />
            </div>

            {/* DYNAMIC INTERMEDIATE STOPS (EXCLUSIVELY FOR ROUND TRIP) */}
            {tripType === TripType.ROUND &&
              stops.map((stopLoc, sIdx) => (
                <div key={sIdx} className="relative">
                  <LocationSearchInput
                    label={`INTERMEDIATE STOP #${sIdx + 1}`}
                    placeholder={`Search Waypoint / Stop #${sIdx + 1}...`}
                    value={stopLoc}
                    onChange={(loc) => {
                      handleStopChange(sIdx, loc);
                      setFormError(null);
                    }}
                    showDelete={true}
                    showAdd={stops.length < 10}
                    onDelete={() => removeStop(sIdx)}
                    onAddNext={() => insertStopAfter(sIdx)}
                    validationError={
                      !stopLoc.isSelected && stopLoc.placeName ? 'Please select a location from suggestions.' : null
                    }
                  />
                </div>
              ))}

            {/* SWAP BUTTON (Floating between FROM and TO for non-local trips) */}
            {tripType !== TripType.LOCAL && (
              <div className="flex justify-center -my-1 sm:-my-1 relative z-20">
                <button
                  type="button"
                  onClick={() => {
                    const temp = pickupLocation;
                    setPickupLocation(dropLocation);
                    setDropLocation(temp);
                  }}
                  title="Swap Pickup & Drop Locations"
                  className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full bg-white hover:bg-orange-50 text-kandy-orange border-2 border-kandy-orange/30 shadow-md flex items-center justify-center transition transform active:scale-90 hover:rotate-180 cursor-pointer"
                >
                  <ArrowLeftRight className="w-3 h-3 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 rotate-90" />
                </button>
              </div>
            )}

            {/* TO Location (Final Destination) - Hidden for LOCAL package */}
            {tripType !== TripType.LOCAL && (
              <div className="relative">
                <LocationSearchInput
                  label={
                    tripType === TripType.AIRPORT && airportTripMode === 'DROP'
                      ? 'DROP AIRPORT'
                      : 'DESTINATION LOCATION'
                  }
                  placeholder={
                    tripType === TripType.AIRPORT && airportTripMode === 'DROP'
                      ? 'Select Airport Location'
                      : 'Enter Drop City, Hotel, Landmark...'
                  }
                  value={dropLocation}
                  onChange={(loc) => {
                    setDropLocation(loc);
                    setFormError(null);
                  }}
                  isAirportOnly={tripType === TripType.AIRPORT && airportTripMode === 'DROP'}
                  showAdd={tripType === TripType.ROUND && stops.length < 10}
                  onAddNext={() => insertStopAfter(stops.length - 1)}
                  showDelete={tripType === TripType.ROUND && stops.length > 0}
                  onDelete={() => removeStop(stops.length - 1)}
                  validationError={
                    !dropLocation.isSelected && dropLocation.placeName ? 'Please select a destination from suggestions.' : null
                  }
                />
              </div>
            )}
          </div>

          {/* DATE & TIME SELECTORS GRID (2-column grid on mobile & tablet) */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 sm:gap-2 md:gap-3 lg:gap-4">
            {/* PICK UP DATE */}
            <div className="bg-gray-50 p-1.5 sm:p-2 md:p-2.5 lg:p-3.5 rounded-md sm:rounded-xl border border-gray-200">
              <label className="block text-[9px] sm:text-[10px] md:text-[11px] font-black uppercase text-gray-700 tracking-wider mb-0.5">
                PICK UP DATE
              </label>
              <input
                type="date"
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
                className="w-full bg-transparent text-[11px] sm:text-xs md:text-sm font-bold text-gray-900 focus:outline-none min-h-[26px] sm:min-h-[30px] md:min-h-[34px] lg:min-h-[36px]"
                required
              />
            </div>

            {/* RETURN DATE (FOR ROUND TRIP) */}
            {tripType === TripType.ROUND && (
              <div className="bg-gray-50 p-1.5 sm:p-2 md:p-2.5 lg:p-3.5 rounded-md sm:rounded-xl border border-gray-200">
                <label className="block text-[9px] sm:text-[10px] md:text-[11px] font-black uppercase text-gray-700 tracking-wider mb-0.5">
                  RETURN DATE
                </label>
                <input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="w-full bg-transparent text-[11px] sm:text-xs md:text-sm font-bold text-gray-900 focus:outline-none min-h-[26px] sm:min-h-[30px] md:min-h-[34px] lg:min-h-[36px]"
                  required
                />
              </div>
            )}

            {/* PICK UP TIME */}
            <div className="bg-gray-50 p-1.5 sm:p-2 md:p-2.5 lg:p-3.5 rounded-md sm:rounded-xl border border-gray-200">
              <label className="block text-[9px] sm:text-[10px] md:text-[11px] font-black uppercase text-gray-700 tracking-wider mb-0.5">
                PICK UP TIME
              </label>
              <input
                type="time"
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value)}
                className="w-full bg-transparent text-[11px] sm:text-xs md:text-sm font-bold text-gray-900 focus:outline-none min-h-[26px] sm:min-h-[30px] md:min-h-[34px] lg:min-h-[36px]"
                required
              />
            </div>
          </div>

          {/* Prominent High-Contrast CTA Button */}
          <div className="pt-1">
            <button
              type="submit"
              className="w-full py-2 sm:py-2.5 md:py-3 lg:py-4 px-4 sm:px-6 md:px-8 bg-gradient-to-r from-kandy-orange via-orange-500 to-amber-500 hover:from-orange-600 hover:to-kandy-orange text-white font-black text-xs sm:text-xs md:text-sm uppercase tracking-widest rounded-lg sm:rounded-xl shadow-md sm:shadow-lg hover:shadow-2xl transition transform active:scale-98 border-b-2 sm:border-b-3 lg:border-b-4 border-orange-800 flex items-center justify-center gap-1.5 sm:gap-2 min-h-[38px] sm:min-h-[40px] md:min-h-[44px] lg:min-h-[52px]"
            >
              <span>EXPLORE CABS & RATES →</span>
            </button>
          </div>
        </form>
      </div>

    {/* Sticky Bottom Trip Type Bar for Mobile Devices (1 Row, Medium Icon, Small Font) */}
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.12)] p-2 sm:hidden">
      <div className="grid grid-cols-4 gap-1.5 max-w-md mx-auto">
        <button
          type="button"
          onClick={() => {
            setTripType(TripType.ONEWAY);
            setFormError(null);
          }}
          className={`py-2 px-1 rounded-xl font-extrabold text-[10px] uppercase tracking-tight flex flex-col items-center justify-center gap-1 transition active:scale-95 cursor-pointer ${
            tripType === TripType.ONEWAY
              ? 'bg-kandy-orange text-white shadow-md font-black'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Car className="w-5 h-5 shrink-0" />
          <span>One Way</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setTripType(TripType.ROUND);
            setFormError(null);
          }}
          className={`py-2 px-1 rounded-xl font-extrabold text-[10px] uppercase tracking-tight flex flex-col items-center justify-center gap-1 transition active:scale-95 cursor-pointer ${
            tripType === TripType.ROUND
              ? 'bg-kandy-orange text-white shadow-md font-black'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <RefreshCw className="w-5 h-5 shrink-0" />
          <span>Round Trip</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setTripType(TripType.LOCAL);
            setFormError(null);
          }}
          className={`py-2 px-1 rounded-xl font-extrabold text-[10px] uppercase tracking-tight flex flex-col items-center justify-center gap-1 transition active:scale-95 cursor-pointer ${
            tripType === TripType.LOCAL
              ? 'bg-kandy-orange text-white shadow-md font-black'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <MapPin className="w-5 h-5 shrink-0" />
          <span>Local</span>
        </button>

        <button
          type="button"
          onClick={handleSelectAirportTab}
          className={`py-2 px-1 rounded-xl font-extrabold text-[10px] uppercase tracking-tight flex flex-col items-center justify-center gap-1 transition active:scale-95 cursor-pointer ${
            tripType === TripType.AIRPORT
              ? 'bg-kandy-orange text-white shadow-md font-black'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Plane className="w-5 h-5 shrink-0" />
          <span>Airport</span>
        </button>
      </div>
    </div>
    </>
  );
}
