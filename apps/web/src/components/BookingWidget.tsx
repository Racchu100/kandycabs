'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TripType } from '@kandycabs/shared';
import { PlaneTakeoff, PlaneLanding, AlertCircle, ArrowLeftRight, ArrowUpDown, Car, RefreshCw, MapPin, Plane, Calendar, Clock } from 'lucide-react';
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
      <div className="w-full max-w-5xl mx-auto bg-white rounded-3xl sm:rounded-2xl shadow-[0_14px_45px_rgba(0,0,0,0.07)] border border-gray-100/90 relative z-30 p-4 sm:p-6 lg:p-8">
        {/* Top-left Orange Corner Accent Badge (Matching Reference Screenshot) */}
        <div className="absolute -top-1 -left-1 w-12 h-6 bg-[#FF6B1A] rounded-tl-3xl rounded-br-2xl pointer-events-none z-10"></div>

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
          <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-2xl text-xs font-bold text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* Main Dynamic Booking Form */}
        <form onSubmit={handleSearch} className="space-y-3 sm:space-y-4">
          {/* ROUTE LOCATION INPUTS CONTAINER */}
          <div className="relative space-y-2.5 sm:space-y-3">
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
                    : 'Enter Pickup Place, Landmark, Railway Stat'
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
                      ? 'Please select a city from suggestions.'
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

            {/* SWAP BUTTON (Floating circular orange control positioned between Pickup and Drop on right edge) */}
            {tripType !== TripType.LOCAL && (
              <div className="flex justify-end pr-3 -my-3 sm:-my-2 relative z-20">
                <button
                  type="button"
                  onClick={() => {
                    const temp = pickupLocation;
                    setPickupLocation(dropLocation);
                    setDropLocation(temp);
                  }}
                  title="Swap Pickup & Drop Locations"
                  className="w-9 h-9 sm:w-9 sm:h-9 rounded-full bg-gradient-to-b from-[#FF7A28] to-[#FF5500] text-white border-2 border-white shadow-md shadow-orange-500/30 flex items-center justify-center transition transform active:scale-90 hover:rotate-180 cursor-pointer"
                >
                  <ArrowUpDown className="w-4 h-4" />
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

          {/* DATE & TIME SELECTORS GRID (Side-by-Side 2 Column Grid Matching Reference Screenshot) */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
            {/* PICK UP DATE */}
            <div className="bg-[#F8F9FA] p-3 rounded-2xl border border-gray-200/90 flex flex-col justify-between">
              <div className="flex items-center gap-1.5 mb-1">
                <Calendar className="w-3.5 h-3.5 text-[#FF6B1A] shrink-0" />
                <label className="block text-[10px] sm:text-[11px] font-black uppercase text-[#1E293B] tracking-wider">
                  PICK UP DATE
                </label>
              </div>
              <input
                type="date"
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
                className="w-full bg-transparent text-xs sm:text-sm font-extrabold text-[#1E293B] focus:outline-none min-h-[32px] cursor-pointer"
                required
              />
            </div>

            {/* RETURN DATE (FOR ROUND TRIP) */}
            {tripType === TripType.ROUND && (
              <div className="bg-[#F8F9FA] p-3 rounded-2xl border border-gray-200/90 flex flex-col justify-between">
                <div className="flex items-center gap-1.5 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-[#FF6B1A] shrink-0" />
                  <label className="block text-[10px] sm:text-[11px] font-black uppercase text-[#1E293B] tracking-wider">
                    RETURN DATE
                  </label>
                </div>
                <input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="w-full bg-transparent text-xs sm:text-sm font-extrabold text-[#1E293B] focus:outline-none min-h-[32px] cursor-pointer"
                  required
                />
              </div>
            )}

            {/* PICK UP TIME */}
            <div className="bg-[#F8F9FA] p-3 rounded-2xl border border-gray-200/90 flex flex-col justify-between">
              <div className="flex items-center gap-1.5 mb-1">
                <Clock className="w-3.5 h-3.5 text-[#FF6B1A] shrink-0" />
                <label className="block text-[10px] sm:text-[11px] font-black uppercase text-[#1E293B] tracking-wider">
                  PICK UP TIME
                </label>
              </div>
              <input
                type="time"
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value)}
                className="w-full bg-transparent text-xs sm:text-sm font-extrabold text-[#1E293B] focus:outline-none min-h-[32px] cursor-pointer"
                required
              />
            </div>
          </div>

          {/* Prominent Gradient Orange CTA Button (EXPLORE CABS & RATES →) */}
          <div className="pt-1">
            <button
              type="submit"
              className="w-full py-4 px-6 bg-gradient-to-r from-[#FF7A28] via-[#FF6B1A] to-[#FF5500] hover:from-orange-600 hover:to-orange-500 text-white font-black text-xs sm:text-sm uppercase tracking-wider rounded-2xl shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer min-h-[52px]"
            >
              <span>EXPLORE CABS & RATES →</span>
            </button>
          </div>
        </form>
      </div>

      {/* Mobile Sticky Bottom Trip Navigation Bar (Fixed z-[9999] solid white background to prevent scroll overlap) */}
      <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-white border-t border-gray-200 shadow-[0_-8px_30px_rgba(0,0,0,0.15)] py-2.5 px-3 rounded-t-3xl sm:hidden">
        <div className="grid grid-cols-4 gap-2 max-w-md mx-auto">
          <button
            type="button"
            onClick={() => {
              setTripType(TripType.ONEWAY);
              setFormError(null);
            }}
            className={`py-2 px-1 rounded-2xl font-extrabold text-[10px] uppercase tracking-tight flex flex-col items-center justify-center gap-1 transition active:scale-95 cursor-pointer ${
              tripType === TripType.ONEWAY
                ? 'bg-gradient-to-r from-[#FF7A28] to-[#FF5500] text-white shadow-md shadow-orange-500/20 font-black'
                : 'bg-gray-100/90 text-[#475569] hover:bg-gray-200'
            }`}
          >
            <Car className="w-4.5 h-4.5 shrink-0" />
            <span>ONE WAY</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTripType(TripType.ROUND);
              setFormError(null);
            }}
            className={`py-2 px-1 rounded-2xl font-extrabold text-[10px] uppercase tracking-tight flex flex-col items-center justify-center gap-1 transition active:scale-95 cursor-pointer ${
              tripType === TripType.ROUND
                ? 'bg-gradient-to-r from-[#FF7A28] to-[#FF5500] text-white shadow-md shadow-orange-500/20 font-black'
                : 'bg-gray-100/90 text-[#475569] hover:bg-gray-200'
            }`}
          >
            <RefreshCw className="w-4.5 h-4.5 shrink-0" />
            <span>ROUND TRIP</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTripType(TripType.LOCAL);
              setFormError(null);
            }}
            className={`py-2 px-1 rounded-2xl font-extrabold text-[10px] uppercase tracking-tight flex flex-col items-center justify-center gap-1 transition active:scale-95 cursor-pointer ${
              tripType === TripType.LOCAL
                ? 'bg-gradient-to-r from-[#FF7A28] to-[#FF5500] text-white shadow-md shadow-orange-500/20 font-black'
                : 'bg-gray-100/90 text-[#475569] hover:bg-gray-200'
            }`}
          >
            <MapPin className="w-4.5 h-4.5 shrink-0" />
            <span>LOCAL</span>
          </button>

          <button
            type="button"
            onClick={handleSelectAirportTab}
            className={`py-2 px-1 rounded-2xl font-extrabold text-[10px] uppercase tracking-tight flex flex-col items-center justify-center gap-1 transition active:scale-95 cursor-pointer ${
              tripType === TripType.AIRPORT
                ? 'bg-gradient-to-r from-[#FF7A28] to-[#FF5500] text-white shadow-md shadow-orange-500/20 font-black'
                : 'bg-gray-100/90 text-[#475569] hover:bg-gray-200'
            }`}
          >
            <Plane className="w-4.5 h-4.5 shrink-0" />
            <span>AIRPORT</span>
          </button>
        </div>
      </div>
    </>
  );
}
