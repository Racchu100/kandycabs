import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { BookingWidget } from '@/components/BookingWidget';
import { ShieldCheck, Award, Users, User, MapPin, ArrowRight, CheckCircle2, PhoneCall, Sparkles } from 'lucide-react';

const FLEET_TEASER = [
  {
    name: 'Hatchback (CNG / Diesel)',
    models: 'WagonR, Indica or equivalent',
    seats: 4,
    bootCapacity: '2 Small Bags',
    perKmRate: 11.5,
    extraKmRate: 12.0,
    image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&auto=format&fit=crop&q=60',
  },
  {
    name: 'Sedan (AC)',
    models: 'Dzire, Etios or equivalent',
    seats: 4,
    bootCapacity: '2 Large + 1 Small Bag',
    perKmRate: 13.5,
    extraKmRate: 14.0,
    image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&auto=format&fit=crop&q=60',
  },
  {
    name: 'SUV (6+1 Seater)',
    models: 'Ertiga, Marazzo or equivalent',
    seats: 6,
    bootCapacity: '3 Large Bags',
    perKmRate: 17.5,
    extraKmRate: 18.0,
    image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&auto=format&fit=crop&q=60',
  },
  {
    name: 'SUV Premium (Luxury)',
    models: 'Toyota Innova Crysta',
    seats: 7,
    bootCapacity: '4 Large Bags',
    perKmRate: 21.0,
    extraKmRate: 22.0,
    image: 'https://images.unsplash.com/photo-1563720223185-11003d516935?w=800&auto=format&fit=crop&q=60',
  },
];



export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-kandy-bg pb-28 sm:pb-0">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-3 sm:pt-6 md:pt-8 lg:pt-10 pb-4 sm:pb-8 md:pb-10 lg:pb-12 bg-gradient-to-b from-white via-orange-50/20 to-kandy-bg border-b border-kandy-border">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 w-full relative z-10">
          <div className="text-left max-w-2xl mb-4 sm:mb-6">
            {/* Main Headline */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-[#1E293B] tracking-tight leading-tight mb-2.5">
              Travel with confidence with <span className="text-[#FF6B1A]">Kandy Cabs</span>
            </h1>

            {/* Subtitle */}
            <h2 className="text-xs sm:text-sm md:text-base text-[#475569] font-medium leading-relaxed max-w-xl">
              Safe, reliable, and hassle-free rides for local, airport, and outstation journeys
            </h2>
          </div>

          {/* Card Booking Widget */}
          <BookingWidget />

          {/* Mobile 4-Trust-Badges Grid (2x2 Grid with comfortable padding & fitting icons) */}
          <div className="grid grid-cols-2 gap-2.5 mt-4 sm:hidden">
            <div className="flex items-center gap-2 p-2.5 bg-white rounded-2xl border border-gray-100/90 shadow-sm">
              <div className="w-7.5 h-7.5 bg-orange-100/80 text-[#FF6B1A] rounded-full flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-[10px] font-black text-[#1E293B] uppercase tracking-tight leading-tight">VERIFIED CHAUFFEURS</h4>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2.5 bg-white rounded-2xl border border-gray-100/90 shadow-sm">
              <div className="w-7.5 h-7.5 bg-emerald-100/80 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-[10px] font-black text-[#1E293B] uppercase tracking-tight leading-tight">25% ADVANCE ONLY</h4>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2.5 bg-white rounded-2xl border border-gray-100/90 shadow-sm">
              <div className="w-7.5 h-7.5 bg-blue-100/80 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-[10px] font-black text-[#1E293B] uppercase tracking-tight leading-tight">TRANSPARENT BILLING</h4>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2.5 bg-white rounded-2xl border border-gray-100/90 shadow-sm">
              <div className="w-7.5 h-7.5 bg-amber-100/80 text-amber-600 rounded-full flex items-center justify-center shrink-0">
                <PhoneCall className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-[10px] font-black text-[#1E293B] uppercase tracking-tight leading-tight">24X7 OPS SUPPORT</h4>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Desktop Standalone Trust Badges Strip */}
      <section className="hidden lg:block bg-white py-4 lg:py-6 border-b border-kandy-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-center gap-4 p-4 bg-kandy-bg rounded-xl border border-kandy-border shadow-xs">
              <div className="w-11 h-11 bg-kandy-orangeLight text-kandy-orange rounded-lg flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-black text-kandy-ink uppercase tracking-tight leading-tight">Verified Chauffeurs</h4>
                <p className="text-xs text-kandy-muted font-medium leading-snug mt-0.5">Background-checked drivers</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-kandy-bg rounded-xl border border-kandy-border shadow-xs">
              <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-black text-kandy-ink uppercase tracking-tight leading-tight">25% Advance Only</h4>
                <p className="text-xs text-kandy-muted font-medium leading-snug mt-0.5">Rest after trip completion</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-kandy-bg rounded-xl border border-kandy-border shadow-xs">
              <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
                <Award className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-black text-kandy-ink uppercase tracking-tight leading-tight">Transparent Billing</h4>
                <p className="text-xs text-kandy-muted font-medium leading-snug mt-0.5">Zero hidden per-km costs</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-kandy-bg rounded-xl border border-kandy-border shadow-xs">
              <div className="w-11 h-11 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center shrink-0">
                <PhoneCall className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-black text-kandy-ink uppercase tracking-tight leading-tight">24x7 Ops Assistance</h4>
                <p className="text-xs text-kandy-muted font-medium leading-snug mt-0.5">Live dispatch support</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Fleet Showcase Section */}
      <section className="relative py-6 sm:py-8 lg:py-12 bg-kandy-bg">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-4 sm:mb-6 gap-2 sm:gap-4">
            <div>
              <span className="text-xs font-black text-[#FF6B1A] uppercase tracking-wider block mb-0.5">
                OUR VEHICLE FLEET
              </span>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#1E293B] tracking-tight">
                Choose the Right Cab for Your Journey
              </h2>
              <div className="w-12 h-1 bg-[#FF6B1A] rounded-full mt-1.5 mb-1"></div>
            </div>
            <Link
              href="/fleet"
              className="text-xs font-black text-[#FF6B1A] hover:text-orange-600 flex items-center gap-1 uppercase tracking-wider transition"
            >
              <span>VIEW FULL FLEET & RATE CHART →</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {FLEET_TEASER.map((car, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-gray-200/90 shadow-sm p-4 flex flex-col justify-between hover:shadow-md transition"
              >
                <div>
                  {/* Top: Car Image */}
                  <div className="relative w-full h-36 sm:h-40 overflow-hidden rounded-xl bg-gray-50 mb-3 flex items-center justify-center">
                    <img
                      src={car.image}
                      alt={car.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Title & Rating Badge */}
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="text-sm sm:text-base font-black text-gray-900 line-clamp-1">
                      {car.name}
                    </h3>
                    <span className="bg-black text-amber-400 text-[10px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shrink-0">
                      4.8 ★
                    </span>
                  </div>

                  {/* Subtitle */}
                  <p className="text-[11px] text-gray-500 font-semibold mb-2.5">
                    {car.seats} seater AC Cab ({car.models})
                  </p>

                  {/* Specs List */}
                  <div className="space-y-1 text-[11px] text-gray-700 font-medium">
                    <div className="flex items-center gap-1.5">
                      <span>🧑‍✈️</span>
                      <span>Driver allowance Included</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span>🧳</span>
                      <span>Luggage: {car.bootCapacity} | Extra KM: ₹{car.extraKmRate}/km</span>
                    </div>
                    <div className="flex items-center gap-1 pt-0.5">
                      <span className="font-bold text-gray-800">Fuel:</span>
                      <span className="font-semibold text-gray-600">CNG / Diesel</span>
                    </div>
                  </div>
                </div>

                {/* Divider Line */}
                <div className="border-t border-gray-100 my-3"></div>

                {/* Rate & CTA Button */}
                <div className="text-center">
                  <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-0.5">
                    OUTSTATION RATE
                  </span>
                  <div className="text-xl sm:text-2xl font-extrabold text-[#0073E6] tracking-tight mb-2.5">
                    ₹{car.perKmRate}<span className="text-xs font-semibold text-gray-500">/km</span>
                  </div>

                  <Link
                    href={`/booking?vehicle=${encodeURIComponent(car.name)}`}
                    className="w-full py-2.5 bg-[#FF6B1A] hover:bg-orange-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md hover:shadow-lg transition active:scale-95 flex items-center justify-center cursor-pointer"
                  >
                    BOOK THIS CAB →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>



      <Footer />
    </div>
  );
}
