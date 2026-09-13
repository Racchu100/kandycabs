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
    image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&auto=format&fit=crop&q=60',
    tags: ['Ac Cabs', 'Pocket Friendly', '4 Passengers'],
  },
  {
    name: 'Sedan (AC)',
    models: 'Dzire, Etios or equivalent',
    seats: 4,
    image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&auto=format&fit=crop&q=60',
    tags: ['Extra Boot Space', 'Popular Outstation', '4 Passengers'],
  },
  {
    name: 'SUV (6+1 Seater)',
    models: 'Ertiga, Marazzo or equivalent',
    seats: 6,
    image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&auto=format&fit=crop&q=60',
    tags: ['Family Travel', 'Luggage Space', '6 Passengers'],
  },
  {
    name: 'SUV Premium (Luxury)',
    models: 'Toyota Innova Crysta',
    seats: 7,
    image: 'https://images.unsplash.com/photo-1563720223185-11003d516935?w=800&auto=format&fit=crop&q=60',
    tags: ['Luxury Captain Seats', 'Premium Chauffeur', '7 Passengers'],
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
            {/* White Pill Badge with Orange Accent */}
            <div className="inline-flex items-center gap-2 bg-white text-[#FF6B1A] px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wide mb-3 border border-[#FF6B1A]/25 shadow-sm">
              <Sparkles className="w-4 h-4 text-[#FF6B1A]" />
              <span>South India&apos;s Premium Intercity Cab Service</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-[#1E293B] tracking-tight leading-tight mb-2.5">
              Book Outstation & Local Cabs with <span className="text-[#FF6B1A] block sm:inline">Transparent Fares</span>
            </h1>

            {/* Subtitle */}
            <p className="text-xs sm:text-sm md:text-base text-[#475569] font-medium leading-relaxed max-w-xl">
              Pay 25% advance only. Clean sanitized cabs, courteous verified drivers, and doorstep pickup.
            </p>
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            {FLEET_TEASER.map((car, idx) => (
              <div
                key={idx}
                className="bg-white rounded-card border border-kandy-border overflow-hidden shadow-card hover:shadow-widget transition group flex flex-col"
              >
                <div className="relative h-36 sm:h-40 lg:h-44 w-full bg-gray-100 overflow-hidden">
                  <img
                    src={car.image}
                    alt={car.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>

                <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-bold text-kandy-ink mb-0.5">{car.name}</h3>
                    <p className="text-xs text-kandy-muted mb-2.5">{car.models}</p>

                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {car.tags.map((tag, tIdx) => (
                        <span
                          key={tIdx}
                          className="bg-kandy-bg text-kandy-ink text-[10px] font-bold px-2 py-0.5 rounded border border-kandy-border"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <Link
                    href={`/booking?vehicle=${encodeURIComponent(car.name)}`}
                    className="w-full text-center py-2 bg-kandy-orange hover:bg-kandy-orangeHover text-white font-bold rounded text-xs uppercase tracking-wider transition shadow"
                  >
                    SELECT CAB & BOOK →
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
