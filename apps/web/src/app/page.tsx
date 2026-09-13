import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { BookingWidget } from '@/components/BookingWidget';
import { ShieldCheck, Award, Users, MapPin, ArrowRight, CheckCircle2, PhoneCall, Sparkles } from 'lucide-react';

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
    <div className="min-h-screen flex flex-col bg-kandy-bg pb-20 sm:pb-0">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-1.5 sm:pt-3 md:pt-4 lg:pt-8 pb-1 sm:pb-6 md:pb-8 lg:pb-12 bg-gradient-to-b from-white via-gray-50 to-kandy-bg border-b border-kandy-border overflow-hidden">
        {/* Scenic Background Banner Image (Top right matching reference screenshot) */}
        <div className="absolute top-0 right-0 w-full sm:w-2/3 h-56 sm:h-full opacity-20 sm:opacity-30 pointer-events-none overflow-hidden z-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=1200&auto=format&fit=crop&q=80"
            alt="Scenic Coastal Highway"
            className="w-full h-full object-cover object-right-top"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/80 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-white"></div>
        </div>

        <div className="max-w-7xl mx-auto px-2.5 sm:px-4 md:px-6 lg:px-8 w-full pb-1.5 sm:pb-0 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-3 sm:mb-4">
            <div className="inline-flex items-center gap-1.5 bg-[#FFF4ED] text-[#FF6B1A] px-3 py-1 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider mb-2 border border-[#FFE0D1] shadow-2xs">
              <Sparkles className="w-3.5 h-3.5" />
              <span>South India&apos;s Premium Intercity Cab Service</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-kandy-ink tracking-tight leading-tight mb-2">
              Book Outstation & Local Cabs with <span className="text-[#FF6B1A]">Transparent Fares</span>
            </h1>
            <p className="text-xs sm:text-sm lg:text-base text-kandy-muted font-semibold max-w-md sm:max-w-xl mx-auto">
              Pay 25% advance only. Clean sanitized cabs, courteous verified drivers, and doorstep pickup.
            </p>
          </div>

          {/* Card Booking Widget */}
          <BookingWidget />

          {/* Mobile 4-Trust-Badges Grid (2x2 Grid matching reference screenshot) */}
          <div className="grid grid-cols-2 gap-2.5 mt-4 sm:hidden">
            <div className="flex items-center gap-2.5 p-3 bg-white rounded-2xl border border-gray-100/90 shadow-xs">
              <div className="w-9 h-9 bg-orange-50 text-[#FF6B1A] rounded-xl flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-[11px] font-black text-kandy-ink uppercase tracking-tight leading-tight">Verified Chauffeurs</h4>
                <p className="text-[9px] text-kandy-muted font-semibold leading-tight mt-0.5">Background checked</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-3 bg-white rounded-2xl border border-gray-100/90 shadow-xs">
              <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-[11px] font-black text-kandy-ink uppercase tracking-tight leading-tight">25% Advance Only</h4>
                <p className="text-[9px] text-kandy-muted font-semibold leading-tight mt-0.5">Rest after trip</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-3 bg-white rounded-2xl border border-gray-100/90 shadow-xs">
              <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-[11px] font-black text-kandy-ink uppercase tracking-tight leading-tight">Transparent Billing</h4>
                <p className="text-[9px] text-kandy-muted font-semibold leading-tight mt-0.5">Zero hidden costs</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-3 bg-white rounded-2xl border border-gray-100/90 shadow-xs">
              <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                <PhoneCall className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-[11px] font-black text-kandy-ink uppercase tracking-tight leading-tight">24x7 Ops Support</h4>
                <p className="text-[9px] text-kandy-muted font-semibold leading-tight mt-0.5">Live assistance</p>
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
      <section className="relative py-4 sm:py-6 lg:py-10 overflow-hidden">
        {/* Scenic Fleet Background Banner Image (Right side matching reference screenshot) */}
        <div className="absolute top-0 right-0 w-full sm:w-1/2 h-44 sm:h-56 opacity-15 pointer-events-none overflow-hidden z-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1506015391300-4802dc74de2e?w=1200&auto=format&fit=crop&q=80"
            alt="Scenic Mountain Road"
            className="w-full h-full object-cover object-right"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-kandy-bg via-kandy-bg/80 to-transparent"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-4 sm:mb-6 gap-2 sm:gap-4">
            <div>
              <span className="text-xs font-bold text-kandy-orange uppercase tracking-widest block mb-0.5">
                OUR VEHICLE FLEET
              </span>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-kandy-ink tracking-tight">
                Choose the Right Cab for Your Journey
              </h2>
            </div>
            <Link
              href="/fleet"
              className="text-xs font-bold text-kandy-orange hover:text-kandy-orangeHover flex items-center gap-1.5 uppercase tracking-wider"
            >
              <span>View Full Fleet & Rate Chart</span>
              <ArrowRight className="w-4 h-4" />
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
