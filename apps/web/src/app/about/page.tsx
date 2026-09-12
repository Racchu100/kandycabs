import React from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ShieldCheck, Award, Users, Heart, Phone } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-kandy-bg">
      <Navbar />

      <main className="flex-1 flex flex-col justify-center py-3 sm:py-5 lg:py-6">
        <div className="max-w-4xl mx-auto px-3.5 sm:px-6 lg:px-8 w-full">
          <div className="text-center mb-3 sm:mb-4 lg:mb-5">
            <span className="text-[10px] sm:text-xs font-bold text-kandy-orange uppercase tracking-widest block mb-0.5 sm:mb-1">
              ABOUT KANDY CABS
            </span>
            <h1 className="text-lg sm:text-2xl lg:text-2xl font-extrabold text-kandy-ink tracking-tight mb-1 sm:mb-2">
              South India&apos;s Most Trusted Intercity Cab Service
            </h1>
            <p className="text-xs sm:text-xs text-kandy-muted leading-snug max-w-2xl mx-auto">
              Founded with a mission to make outstation road travel safe, reliable, transparent, and hassle-free for families, corporate travelers, and tourists alike.
            </p>
          </div>

          <div className="bg-white p-4 sm:p-5 lg:p-6 rounded-widget border border-kandy-border shadow-widget space-y-4 sm:space-y-5 mb-3 sm:mb-4">
            <div>
              <h2 className="text-sm sm:text-base lg:text-lg font-bold text-kandy-ink mb-2 sm:mb-2.5 border-l-4 border-kandy-orange pl-2.5">
                Our Core Pillars
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-3.5 lg:gap-4 pt-1.5 sm:pt-2">
                <div className="p-3.5 sm:p-4 lg:p-4 bg-kandy-bg rounded-card border border-kandy-border">
                  <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7 text-kandy-orange mb-1.5 sm:mb-2 shrink-0" />
                  <h4 className="text-xs font-bold text-kandy-ink mb-1">100% Verified Drivers</h4>
                  <p className="text-[11px] sm:text-xs text-kandy-muted leading-relaxed">Thorough background check, police verification, and commercial driving license auditing.</p>
                </div>
                <div className="p-3.5 sm:p-4 lg:p-4 bg-kandy-bg rounded-card border border-kandy-border">
                  <Award className="w-6 h-6 sm:w-7 sm:h-7 text-kandy-orange mb-1.5 sm:mb-2 shrink-0" />
                  <h4 className="text-xs font-bold text-kandy-ink mb-1">Transparent Billing</h4>
                  <p className="text-[11px] sm:text-xs text-kandy-muted leading-relaxed">Itemized per-km rates with exact 25% advance online payment and zero surge pricing.</p>
                </div>
                <div className="p-3.5 sm:p-4 lg:p-4 bg-kandy-bg rounded-card border border-kandy-border">
                  <Users className="w-6 h-6 sm:w-7 sm:h-7 text-kandy-orange mb-1.5 sm:mb-2 shrink-0" />
                  <h4 className="text-xs font-bold text-kandy-ink mb-1">24x7 Ops Assistance</h4>
                  <p className="text-[11px] sm:text-xs text-kandy-muted leading-relaxed">Dedicated dispatch team tracking your trip live from start to finish.</p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-sm sm:text-base lg:text-lg font-bold text-kandy-ink mb-2 sm:mb-2.5 border-l-4 border-kandy-orange pl-2.5">
                Fleet Quality Assurance
              </h2>
              <p className="text-[11px] sm:text-xs text-kandy-muted leading-relaxed">
                Every vehicle in the Kandy Cabs network undergoes periodic 50-point safety and cleanliness inspections. Before every outstation trip, driver partners verify odometer readings, tire pressure, AC functionality, and interior cleanliness via our mandatory driver mobile app checklist.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
