'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TripMode } from '@/types';

export const BookingSearchCard: React.FC = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TripMode>('oneway');
  const [pickup, setPickup] = useState('mangaluru');
  const [drop, setDrop] = useState('udupi');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('08:00');
  const [passengers, setPassengers] = useState('4');

  const [roundTripDays, setRoundTripDays] = useState('2');
  const [localPackage, setLocalPackage] = useState('8h-80km');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const queryParams = {
      mode: activeTab,
      pickup,
      ...(activeTab !== 'local' ? { drop } : { package: localPackage }),
      date,
      time,
      passengers,
      days: activeTab === 'round' ? roundTripDays : '1',
    };

    const query = new URLSearchParams(queryParams).toString();
    const bookingPath = `/booking?${query}`;

    // Save draft parameters to sessionStorage
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('kandy_cabs_draft', JSON.stringify(queryParams));
      } catch {}
    }

    // Check if customer is logged in
    let isLoggedIn = false;
    if (typeof window !== 'undefined') {
      const custUser = localStorage.getItem('kc_user');
      const token = localStorage.getItem('kc_token');
      if (custUser || token) {
        isLoggedIn = true;
      }
    }

    if (isLoggedIn) {
      router.push(bookingPath);
    } else {
      // Require customer login first
      router.push(`/login?redirect=${encodeURIComponent(bookingPath)}&reason=booking`);
    }
  };

  return (
    <div className="hsearch">
      <div className="hs-tabs" role="tablist" aria-label="Trip Mode Selection">
        <button
          type="button"
          className={activeTab === 'oneway' ? 'on' : ''}
          onClick={() => setActiveTab('oneway')}
        >
          One-way drop
        </button>
        <button
          type="button"
          className={activeTab === 'round' ? 'on' : ''}
          onClick={() => setActiveTab('round')}
        >
          Round trip
        </button>
        <button
          type="button"
          className={activeTab === 'airport' ? 'on' : ''}
          onClick={() => setActiveTab('airport')}
        >
          Airport transfer
        </button>
        <button
          type="button"
          className={activeTab === 'local' ? 'on' : ''}
          onClick={() => setActiveTab('local')}
        >
          Local rental
        </button>
      </div>

      <form onSubmit={handleSearch} className="hs-row">
        <div className="hs-fields">
          <div className="hf">
            <label htmlFor="hs-pickup">Pickup Location</label>
            <select
              id="hs-pickup"
              value={pickup}
              onChange={(e) => setPickup(e.target.value)}
            >
              <option value="mangaluru">Mangaluru City</option>
              <option value="airport">Mangaluru Airport (IXE)</option>
              <option value="udupi">Udupi / Manipal</option>
              <option value="surathkal">Surathkal NITK</option>
              <option value="puttur">Puttur</option>
            </select>
          </div>

          {activeTab === 'local' ? (
            <div className="hf">
              <label htmlFor="hs-package">Package</label>
              <select
                id="hs-package"
                value={localPackage}
                onChange={(e) => setLocalPackage(e.target.value)}
              >
                <option value="4h-40km">4 hr / 40 km</option>
                <option value="8h-80km">8 hr / 80 km (Full Day)</option>
                <option value="12h-120km">12 hr / 120 km (Extended)</option>
              </select>
            </div>
          ) : (
            <div className="hf">
              <label htmlFor="hs-drop">Drop Destination</label>
              <select
                id="hs-drop"
                value={drop}
                onChange={(e) => setDrop(e.target.value)}
              >
                <option value="udupi">Udupi Sri Krishna Matha</option>
                <option value="manipal">Manipal University</option>
                <option value="dharmasthala">Dharmasthala Temple</option>
                <option value="subramanya">Kukke Subramanya</option>
                <option value="coorg">Madikeri / Coorg</option>
                <option value="bengaluru">Bengaluru City</option>
                <option value="goa">Panaji / South Goa</option>
              </select>
            </div>
          )}

          <div className="hf">
            <label htmlFor="hs-date">Pickup Date</label>
            <input
              id="hs-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="hf">
            <label htmlFor="hs-time">Time</label>
            <input
              id="hs-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>

          {activeTab === 'round' && (
            <div className="hf">
              <label htmlFor="hs-days">Trip Duration</label>
              <select
                id="hs-days"
                value={roundTripDays}
                onChange={(e) => setRoundTripDays(e.target.value)}
              >
                <option value="1">1 Day</option>
                <option value="2">2 Days</option>
                <option value="3">3 Days</option>
                <option value="4">4 Days</option>
                <option value="5">5 Days</option>
                <option value="6">6 Days</option>
                <option value="7">7 Days</option>
                <option value="10">10 Days</option>
                <option value="14">14 Days</option>
              </select>
            </div>
          )}

          <div className="hf">
            <label htmlFor="hs-passengers">Passengers</label>
            <select
              id="hs-passengers"
              value={passengers}
              onChange={(e) => setPassengers(e.target.value)}
            >
              <option value="1">1 Passenger</option>
              <option value="2">2 Passengers</option>
              <option value="4">3-4 Passengers (Sedan)</option>
              <option value="6">5-6 Passengers (MUV)</option>
              <option value="7">7 Passengers (MPV)</option>
              <option value="13">8-13 Passengers (Tempo)</option>
            </select>
          </div>
        </div>

        <button type="submit" className="hs-go" aria-label="Search vehicles">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.6-3.6" />
          </svg>
          <span>Search vehicles</span>
        </button>
      </form>
    </div>
  );
};
