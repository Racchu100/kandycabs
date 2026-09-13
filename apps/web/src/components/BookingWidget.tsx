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
      <div className="w-full max-w-5xl mx-auto bg-white rounded-3xl sm:rounded-2xl shadow-[0_12px_35px_rgba(0,0,0,0.08)] sm:shadow-2xl border border-gray-100 relative z-30 p-4 sm:p-6 lg:p-8">
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
        <form onSubmit={handleSearch} className="space-y-3 sm:space-y-3 lg:space-y-5">
          {/* ROUTE LOCATION INPUTS CONTAINER */}
          <div className="relative bg-gray-50/80 p-2.5 sm:p-3 lg:p-5 rounded-2xl border border-gray-200/90 space-y-2 sm:space-y-2 lg:space-y-4">
            {/* Dedicated Airport Transfer Direction Toggle (Positioned right above Pickup Location) */}
            {tripType === TripType.AIRPORT && (
              <div className="flex items-center justify-center gap-1 sm:gap-2 bg-orange-50/90 p-1 sm:p-1.5 rounded-xl border border-orange-200 text-xs font-bold mb-2">
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
                  className={`flex-1 px-2 py-1.5 sm:px-4 sm:py-2 rounded-lg flex items-center justify-center gap-1.5 transition text-[11px] sm:text-xs ${
                    airportTripMode === 'PICKUP'
                      ? 'bg-[#FF6B1A] text-white shadow-sm font-extrabold'
                      : 'text-kandy-ink hover:bg-white bg-white/70'
                  }`}
                >
                  <PlaneLanding className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
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
                  className={`flex-1 px-2 py-1.5 sm:px-4 sm:py-2 rounded-lg flex items-center justify-center gap-1.5 transition text-[11px] sm:text-xs ${
                    airportTripMode === 'DROP'
                      ? 'bg-[#FF6B1A] text-white shadow-sm font-extrabold'
                      : 'text-kandy-ink hover:bg-white bg-white/70'
                  }`}
                >
                  <PlaneTakeoff className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
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
                    : 'Enter Pickup Place, Landmark, Railway Stat...'
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

            {/* SWAP BUTTON (Floating on the right edge between FROM and TO) */}
            {tripType !== TripType.LOCAL && (
              <div className="flex justify-end pr-2 -my-2.5 sm:-my-1 relative z-20">
                <button
                  type="button"
                  onClick={() => {
                    const temp = pickupLocation;
                    setPickupLocation(dropLocation);
                    setDropLocation(temp);
                  }}
                  title="Swap Pickup & Drop Locations"
                  className="w-9 h-9 sm:w-8 sm:h-8 rounded-full bg-[#FF6B1A] text-white border-2 border-white shadow-md flex items-center justify-center transition transform active:scale-90 hover:rotate-180 cursor-pointer"
                >
                  <ArrowLeftRight className="w-4 h-4 rotate-90" />
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

          {/* DATE & TIME SELECTORS GRID (2-column grid side-by-side on mobile matching reference image) */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3 lg:gap-4">
            {/* PICK UP DATE */}
            <div className="bg-[#F8F9FA] p-2.5 sm:p-3 rounded-2xl border border-gray-200/90">
              <label className="block text-[9px] sm:text-[10px] md:text-[11px] font-black uppercase text-gray-700 tracking-wider mb-0.5">
                PICK UP DATE
              </label>
              <input
                type="date"
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
                className="w-full bg-transparent text-xs sm:text-xs md:text-sm font-bold text-gray-900 focus:outline-none min-h-[30px]"
                required
              />
            </div>

            {/* RETURN DATE (FOR ROUND TRIP) */}
            {tripType === TripType.ROUND && (
              <div className="bg-[#F8F9FA] p-2.5 sm:p-3 rounded-2xl border border-gray-200/90">
                <label className="block text-[9px] sm:text-[10px] md:text-[11px] font-black uppercase text-gray-700 tracking-wider mb-0.5">
                  RETURN DATE
                </label>
                <input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="w-full bg-transparent text-xs sm:text-xs md:text-sm font-bold text-gray-900 focus:outline-none min-h-[30px]"
                  required
                />
              </div>
            )}

            {/* PICK UP TIME */}
            <div className="bg-[#F8F9FA] p-2.5 sm:p-3 rounded-2xl border border-gray-200/90">
              <label className="block text-[9px] sm:text-[10px] md:text-[11px] font-black uppercase text-gray-700 tracking-wider mb-0.5">
                PICK UP TIME
              </label>
              <input
                type="time"
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value)}
                className="w-full bg-transparent text-xs sm:text-xs md:text-sm font-bold text-gray-900 focus:outline-none min-h-[30px]"
                required
              />
            </div>
          </div>

          {/* Prominent High-Contrast Gradient Orange CTA Button */}
          <div className="pt-1">
            <button
              type="submit"
              className="w-full py-3.5 sm:py-4 px-6 bg-gradient-to-r from-[#FF5500] via-[#FF6B1A] to-[#FFA000] hover:from-orange-600 hover:to-orange-500 text-white font-black text-xs sm:text-sm uppercase tracking-wider rounded-2xl shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer min-h-[48px] sm:min-h-[52px]"
            >
              <span>EXPLORE CABS & RATES →</span>
            </button>
          </div>
        </form>
      </div>

    {/* Sticky Bottom Trip Type Bar for Mobile Devices (1 Row, Matching Reference Image) */}
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-200/80 shadow-[0_-4px_25px_rgba(0,0,0,0.12)] p-2 sm:hidden">
      <div className="grid grid-cols-4 gap-1.5 max-w-md mx-auto">
        <button
          type="button"
          onClick={() => {
            setTripType(TripType.ONEWAY);
            setFormError(null);
          }}
          className={`py-2 px-1 rounded-xl font-extrabold text-[10px] uppercase tracking-tight flex flex-col items-center justify-center gap-1 transition active:scale-95 cursor-pointer ${
            tripType === TripType.ONEWAY
              ? 'bg-gradient-to-r from-[#FF5500] to-[#FF6B1A] text-white shadow-md font-black'
              : 'bg-gray-100/90 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Car className="w-4.5 h-4.5 shrink-0" />
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
              ? 'bg-gradient-to-r from-[#FF5500] to-[#FF6B1A] text-white shadow-md font-black'
              : 'bg-gray-100/90 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <RefreshCw className="w-4.5 h-4.5 shrink-0" />
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
              ? 'bg-gradient-to-r from-[#FF5500] to-[#FF6B1A] text-white shadow-md font-black'
              : 'bg-gray-100/90 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <MapPin className="w-4.5 h-4.5 shrink-0" />
          <span>Local</span>
        </button>

        <button
          type="button"
          onClick={handleSelectAirportTab}
          className={`py-2 px-1 rounded-xl font-extrabold text-[10px] uppercase tracking-tight flex flex-col items-center justify-center gap-1 transition active:scale-95 cursor-pointer ${
            tripType === TripType.AIRPORT
              ? 'bg-gradient-to-r from-[#FF5500] to-[#FF6B1A] text-white shadow-md font-black'
              : 'bg-gray-100/90 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Plane className="w-4.5 h-4.5 shrink-0" />
          <span>Airport</span>
        </button>
      </div>
    </div>
    </>
  );
}
