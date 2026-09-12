import React from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Car, Users, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';

const FLEET_FULL = [
  {
    category: 'HATCHBACK',
    name: 'Hatchback (CNG / Diesel)',
    models: 'Maruti WagonR, Indica or equivalent',
    seats: 4,
    bootCapacity: '2 Small Bags',
    perKmRate: 11.5,
    extraKmRate: 12.0,
    driverAllowance: 300,
    nightCharge: 250,
    image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&auto=format&fit=crop&q=60',
    features: ['Air Conditioned', 'Clean Sanitized Interior', 'Ideal for 1-4 passengers'],
  },
  {
    category: 'SEDAN',
    name: 'Sedan (AC)',
    models: 'Swift Dzire, Toyota Etios or equivalent',
    seats: 4,
    bootCapacity: '2 Large + 1 Small Bag',
    perKmRate: 13.5,
    extraKmRate: 14.0,
    driverAllowance: 350,
    nightCharge: 250,
    image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&auto=format&fit=crop&q=60',
    features: ['Comfortable Legroom', 'Spacious Trunk Boot', 'Most Popular for Intercity'],
  },
  {
    category: 'SUV',
    name: 'SUV (6+1 Seater AC)',
    models: 'Maruti Ertiga, Mahindra Marazzo',
    seats: 6,
    bootCapacity: '3 Large Bags',
    perKmRate: 17.5,
    extraKmRate: 18.0,
    driverAllowance: 400,
    nightCharge: 300,
    image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&auto=format&fit=crop&q=60',
    features: ['Family Group Travel', 'Foldable Rear Seats', 'High Ground Clearance'],
  },
  {
    category: 'SUV_PREMIUM',
    name: 'SUV Premium (Luxury)',
    models: 'Toyota Innova Crysta',
    seats: 7,
    bootCapacity: '4 Large Bags',
    perKmRate: 21.0,
    extraKmRate: 22.0,
    driverAllowance: 500,
    nightCharge: 350,
    image: 'https://images.unsplash.com/photo-1563720223185-11003d516935?w=800&auto=format&fit=crop&q=60',
    features: ['Captain Seat Recliners', 'Top Chauffeurs', 'Premium Outstation Choice'],
  },
  {
    category: 'TEMPO_TRAVELER',
    name: 'Tempo Traveler (12-16 Seater)',
    models: 'Force Tempo Traveler Luxury',
    seats: 12,
    bootCapacity: 'Ample Overhead & Rear Space',
    perKmRate: 26.0,
    extraKmRate: 28.0,
    driverAllowance: 600,
    nightCharge: 400,
    image: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=800&auto=format&fit=crop&q=60',
    features: ['Pushback Seats', 'Individual AC Vents', 'Corporate & Wedding Groups'],
  },
];

export default function FleetPage() {
  return (
    <div className="min-h-screen flex flex-col bg-kandy-bg">
      <Navbar />

      <main className="flex-1 pt-2 sm:pt-4 pb-8">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-4 sm:mb-6">
            <span className="text-xs font-bold text-kandy-orange uppercase tracking-widest block mb-0.5">
              KANDY CABS FLEET CATALOG
            </span>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-kandy-ink tracking-tight mb-1.5">
              Explore Our Vehicles & Per-KM Rates
            </h1>
            <p className="text-xs sm:text-sm text-kandy-muted">
              All vehicles are chauffeur-driven, equipped with GPS tracking, sanitized after every trip, and backed by transparent per-km billing.
            </p>
          </div>

          <div className="space-y-4">
            {FLEET_FULL.map((v, idx) => (
              <div
                key={idx}
                className="bg-white rounded-xl border border-gray-200 transition overflow-hidden shadow-sm hover:shadow-md"
              >
                <div className="p-3.5 sm:p-4 md:p-5 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
                  {/* Left: Car Image & Details */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 flex-1 w-full">
                    <img
                      src={v.image}
                      alt={v.name}
                      className="w-full sm:w-48 md:w-56 h-36 sm:h-32 md:h-36 object-contain rounded-lg shrink-0"
                    />
                    <div className="space-y-1 text-left min-w-0 flex-1 w-full">
                      <div className="flex items-center gap-2 justify-start flex-wrap">
                        <h3 className="text-base sm:text-lg font-black text-gray-900">
                          {v.name}
                        </h3>
                        <span className="bg-black text-amber-400 text-[10px] sm:text-[11px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          4.8 ★
                        </span>
                      </div>
                      <p className="text-[11px] sm:text-xs text-gray-500 font-semibold">
                        {v.seats} seater AC Cab ({v.models})
                      </p>

                      <div className="pt-0.5 space-y-0.5 text-[11px] sm:text-xs text-gray-700 font-medium">
                        <div className="flex items-center gap-1.5 justify-start">
                          <span>🧑‍✈️</span>
                          <span>Driver allowance Included</span>
                        </div>
                        <div className="flex items-center gap-1.5 justify-start flex-wrap">
                          <span>🧳</span>
                          <span>Luggage: {v.bootCapacity} | Extra KM: ₹{v.extraKmRate}/km</span>
                        </div>
                      </div>

                      <div className="pt-1 flex flex-wrap items-center gap-2 text-[11px] sm:text-xs">
                        <span className="font-bold text-gray-700">Fuel:</span>
                        <span className="font-semibold text-gray-600">CNG / Diesel</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Pricing & CTA Button */}
                  <div className="text-center md:text-right shrink-0 space-y-1.5 border-t md:border-t-0 md:border-l border-gray-100 pt-3 md:pt-0 md:pl-6 w-full md:w-auto">
                    <div>
                      <span className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase block">Outstation Rate</span>
                      <span className="text-2xl sm:text-3xl font-black text-sky-600">
                        ₹{v.perKmRate}<span className="text-xs text-gray-500 font-normal">/km</span>
                      </span>
                    </div>

                    <Link
                      href={`/booking?vehicle=${encodeURIComponent(v.name)}`}
                      className="w-full md:w-auto inline-flex items-center justify-center px-6 py-2.5 sm:px-8 sm:py-2.5 bg-kandy-orange hover:bg-orange-600 text-white font-black text-xs sm:text-sm uppercase tracking-wider rounded-lg shadow-md hover:shadow-lg transition transform active:scale-95 cursor-pointer"
                    >
                      BOOK THIS CAB →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
