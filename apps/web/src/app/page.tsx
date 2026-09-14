import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { BookingWidget } from '@/components/BookingWidget';
import { FleetCard } from '@/components/FleetCard';
import { ShieldCheck, Award, Users, User, MapPin, ArrowRight, CheckCircle2, PhoneCall, Sparkles } from 'lucide-react';

const FLEET_TEASER = [
  {
    name: 'Hatchback',
    models: 'WagonR, Indica or equivalent',
    seats: 4,
    bootCapacity: '2 Small Bags',
    perKmRate: 11.5,
    extraKmRate: 12.0,
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&auto=format&fit=crop&q=60',
  },
  {
    name: 'Sedan',
    models: 'Dzire, Etios or equivalent',
    seats: 4,
    bootCapacity: '2 Large + 1 Small Bag',
    perKmRate: 13.5,
    extraKmRate: 14.0,
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=800&auto=format&fit=crop&q=60',
  },
  {
    name: 'SUV',
    models: 'Ertiga, Marazzo or equivalent',
    seats: 6,
    bootCapacity: '3 Large Bags',
    perKmRate: 17.5,
    extraKmRate: 18.0,
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&auto=format&fit=crop&q=60',
  },
  {
    name: 'SUV Premium',
    models: 'Toyota Innova Crysta',
    seats: 7,
    bootCapacity: '4 Large Bags',
    perKmRate: 21.0,
    extraKmRate: 22.0,
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1563720223185-11003d516935?w=800&auto=format&fit=crop&q=60',
  },
];



export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-kandy-bg pb-[calc(var(--bottom-bar-height,0px)+2.5rem)] sm:pb-0">
      {/* Top Header & Hero Container with Seamless Mountain Road Background starting from very top */}
      <div className="relative overflow-hidden border-b border-kandy-border">
        {/* Scenic Mountain Road Background Image starting from very top */}
        <div
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transform scale-105"
          style={{ backgroundImage: "url('/hero-bg.jpg')" }}
        />
        {/* Soft White/Light Gradient Overlay for High Text & Header Contrast */}
        <div className="absolute inset-0 z-0 bg-gradient-to-r from-white/95 via-white/85 to-white/50 md:via-white/75 md:to-white/25" />

        {/* Top Header Navbar with Transparent Background */}
        <Navbar transparentOnTop={true} />

        {/* Hero Section Content (Pushed down with top padding to clear fixed header height) */}
        <section className="relative pt-[calc(var(--header-height,64px)+1rem)] sm:pt-20 md:pt-24 lg:pt-28 pb-6 sm:pb-10 md:pb-12 lg:pb-16 z-10">
          <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 w-full">
            <div className="text-left max-w-2xl mb-4 sm:mb-6">
              {/* Main Headline */}
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-[#0F172A] tracking-tight leading-tight mb-2.5 drop-shadow-xs">
                Travel with confidence with <span className="text-[#FF6B1A]">Kandy Cabs</span>
              </h1>

              {/* Subtitle */}
              <h2 className="text-xs sm:text-sm md:text-base text-[#334155] font-bold leading-relaxed max-w-xl drop-shadow-xs">
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
    </div>

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
      <section id="fleet" className="relative py-6 sm:py-8 lg:py-12 bg-kandy-bg scroll-mt-[calc(var(--header-height,64px)+1rem)] pb-[calc(var(--bottom-bar-height,0px)+2.5rem)] sm:pb-12">

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
              <FleetCard
                key={idx}
                name={car.name}
                models={car.models}
                seats={car.seats}
                bootCapacity={car.bootCapacity}
                perKmRate={car.perKmRate}
                extraKmRate={car.extraKmRate}
                rating={car.rating}
                image={car.image}
                bookingUrl={`/booking?vehicle=${encodeURIComponent(car.name)}`}
              />
            ))}
          </div>
        </div>
      </section>



      <Footer />
    </div>
  );
}
