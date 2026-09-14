import React from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { FleetCard } from '@/components/FleetCard';
import { Car, Users, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';

const FLEET_FULL = [
  {
    category: 'HATCHBACK',
    name: 'Hatchback',
    models: 'Maruti WagonR, Indica or equivalent',
    seats: 4,
    bootCapacity: '2 Small Bags',
    perKmRate: 11.5,
    extraKmRate: 12.0,
    driverAllowance: 300,
    nightCharge: 250,
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&auto=format&fit=crop&q=60',
    features: ['Air Conditioned', 'Clean Sanitized Interior', 'Ideal for 1-4 passengers'],
  },
  {
    category: 'SEDAN',
    name: 'Sedan',
    models: 'Swift Dzire, Toyota Etios or equivalent',
    seats: 4,
    bootCapacity: '2 Large + 1 Small Bag',
    perKmRate: 13.5,
    extraKmRate: 14.0,
    driverAllowance: 350,
    nightCharge: 250,
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=800&auto=format&fit=crop&q=60',
    features: ['Comfortable Legroom', 'Spacious Trunk Boot', 'Most Popular for Intercity'],
  },
  {
    category: 'SUV',
    name: 'SUV',
    models: 'Maruti Ertiga, Mahindra Marazzo',
    seats: 6,
    bootCapacity: '3 Large Bags',
    perKmRate: 17.5,
    extraKmRate: 18.0,
    driverAllowance: 400,
    nightCharge: 300,
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&auto=format&fit=crop&q=60',
    features: ['Family Group Travel', 'Foldable Rear Seats', 'High Ground Clearance'],
  },
  {
    category: 'SUV_PREMIUM',
    name: 'SUV Premium',
    models: 'Toyota Innova Crysta',
    seats: 7,
    bootCapacity: '4 Large Bags',
    perKmRate: 21.0,
    extraKmRate: 22.0,
    driverAllowance: 500,
    nightCharge: 350,
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1563720223185-11003d516935?w=800&auto=format&fit=crop&q=60',
    features: ['Captain Seat Recliners', 'Top Chauffeurs', 'Premium Outstation Choice'],
  },
  {
    category: 'TEMPO_TRAVELER',
    name: 'Tempo Traveler',
    models: 'Force Tempo Traveler Luxury',
    seats: 12,
    bootCapacity: 'Ample Overhead & Rear Space',
    perKmRate: 26.0,
    extraKmRate: 28.0,
    driverAllowance: 600,
    nightCharge: 400,
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=800&auto=format&fit=crop&q=60',
    features: ['Pushback Seats', 'Individual AC Vents', 'Corporate & Wedding Groups'],
  },
];

export default function FleetPage() {
  return (
    <div className="min-h-screen flex flex-col bg-kandy-bg pb-[calc(var(--bottom-bar-height,0px)+2.5rem)] sm:pb-0">
      <Navbar />

      <main className="flex-1 pt-4 sm:pt-6 pb-[calc(var(--bottom-bar-height,0px)+2.5rem)] sm:pb-8">
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
              <FleetCard
                key={idx}
                name={v.name}
                models={v.models}
                seats={v.seats}
                bootCapacity={v.bootCapacity}
                perKmRate={v.perKmRate}
                extraKmRate={v.extraKmRate}
                rating={v.rating}
                image={v.image}
                bookingUrl={`/booking?vehicle=${encodeURIComponent(v.name)}`}
              />
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
