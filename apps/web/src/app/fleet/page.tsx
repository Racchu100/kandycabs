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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {FLEET_FULL.map((v, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-gray-200/90 shadow-sm p-4 sm:p-5 flex flex-col justify-between hover:shadow-md transition"
              >
                <div>
                  {/* Top: Car Image */}
                  <div className="relative w-full h-44 sm:h-48 overflow-hidden rounded-xl bg-gray-50 mb-3.5 flex items-center justify-center">
                    <img
                      src={v.image}
                      alt={v.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Title & Rating Badge */}
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="text-base sm:text-lg font-black text-gray-900 line-clamp-1">
                      {v.name}
                    </h3>
                    <span className="bg-black text-amber-400 text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded-md flex items-center gap-0.5 shrink-0">
                      4.8 ★
                    </span>
                  </div>

                  {/* Subtitle */}
                  <p className="text-xs text-gray-500 font-semibold mb-3">
                    {v.seats} seater AC Cab ({v.models})
                  </p>

                  {/* Specs List */}
                  <div className="space-y-1.5 text-xs text-gray-700 font-medium">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🧑‍✈️</span>
                      <span>Driver allowance Included</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🧳</span>
                      <span>Luggage: {v.bootCapacity} | Extra KM: ₹{v.extraKmRate}/km</span>
                    </div>
                    <div className="flex items-center gap-1 pt-0.5">
                      <span className="font-bold text-gray-800">Fuel:</span>
                      <span className="font-semibold text-gray-600">CNG / Diesel</span>
                    </div>
                  </div>
                </div>

                {/* Divider Line */}
                <div className="border-t border-gray-100 my-4"></div>

                {/* Bottom: Rate & CTA Button */}
                <div className="text-center">
                  <span className="text-[10px] sm:text-[11px] font-extrabold text-gray-400 uppercase tracking-wider block mb-0.5">
                    OUTSTATION RATE
                  </span>
                  <div className="text-2xl sm:text-3xl font-extrabold text-[#0073E6] tracking-tight mb-3">
                    ₹{v.perKmRate}<span className="text-xs font-semibold text-gray-500">/km</span>
                  </div>

                  <Link
                    href={`/booking?vehicle=${encodeURIComponent(v.name)}`}
                    className="w-full py-3 bg-[#FF6B1A] hover:bg-orange-600 text-white font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl shadow-md hover:shadow-lg transition active:scale-95 flex items-center justify-center cursor-pointer"
                  >
                    BOOK THIS CAB →
                  </Link>
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
