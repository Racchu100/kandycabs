import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Phone, Mail, MapPin } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-kandy-ink text-white pt-3 sm:pt-4 md:pt-5 lg:pt-8 pb-3 sm:pb-4 md:pb-5 lg:pb-8 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-8 mb-3 sm:mb-4 md:mb-5 lg:mb-8">
          {/* Brand Info */}
          <div>
            <div className="mb-1.5 sm:mb-2">
              <div className="inline-block bg-white rounded-lg px-2 py-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/kandycabs-logo.png"
                  alt="Kandy Cabs"
                  className="h-7 sm:h-8 md:h-9 w-auto object-contain"
                />
              </div>
            </div>
            <p className="text-xs text-gray-400 leading-snug mb-2 sm:mb-2.5">
              South India&apos;s most trusted outstation & local cab booking platform. Premium chauffeur-driven cabs with transparent per-km pricing and zero hidden charges.
            </p>
            <div className="flex items-center gap-1.5 text-xs text-kandy-orange font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>100% Verified Drivers & Sanitized Cabs</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs sm:text-sm md:text-base font-bold text-white mb-1.5 sm:mb-2 border-l-2 border-kandy-orange pl-2">
              Services & Trip Types
            </h4>
            <ul className="space-y-1 sm:space-y-1.5 text-xs sm:text-sm text-gray-300">
              <li>
                <Link href="/booking?mode=ONEWAY" className="hover:text-kandy-orange transition">
                  One Way Outstation Cabs
                </Link>
              </li>
              <li>
                <Link href="/booking?mode=ROUND" className="hover:text-kandy-orange transition">
                  Round Trip Outstation Cabs
                </Link>
              </li>
              <li>
                <Link href="/booking?mode=LOCAL" className="hover:text-kandy-orange transition">
                  Local Hourly Rentals (8hr/80km)
                </Link>
              </li>
              <li>
                <Link href="/booking?mode=AIRPORT" className="hover:text-kandy-orange transition">
                  Airport Transfers
                </Link>
              </li>
            </ul>
          </div>

          {/* Popular Routes */}
          <div>
            <h4 className="text-xs sm:text-sm md:text-base font-bold text-white mb-1.5 sm:mb-2 border-l-2 border-kandy-orange pl-2">
              Popular Routes
            </h4>
            <ul className="space-y-1 sm:space-y-1.5 text-xs sm:text-sm text-gray-300">
              <li>Bangalore to Mangalore Cabs</li>
              <li>Bangalore to Coorg Cabs</li>
              <li>Bangalore to Mysore Cabs</li>
              <li>Bangalore to Ooty Cabs</li>
              <li>Bangalore to Wayanad Cabs</li>
              <li>Bangalore to Goa Cabs</li>
            </ul>
          </div>

          {/* Contact Details */}
          <div>
            <h4 className="text-xs sm:text-sm md:text-base font-bold text-white mb-1.5 sm:mb-2 border-l-2 border-kandy-orange pl-2">
              Support & Contact
            </h4>
            <ul className="space-y-1.5 text-xs sm:text-sm text-gray-300">
              <li className="flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-kandy-orange shrink-0 mt-0.5" />
                <span>#42, 1st Main Road, Indiranagar, Bangalore, Karnataka 560038</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-kandy-orange shrink-0" />
                <span>+91 98765 43210 / 080 4123 4567</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-kandy-orange shrink-0" />
                <span>support@kandycabs.com</span>
              </li>
              <li className="pt-0.5">
                <Link
                  href="/contact"
                  className="inline-block text-[11px] sm:text-xs font-bold text-kandy-orange bg-gray-900 border border-gray-700 px-2.5 py-1 rounded hover:border-kandy-orange transition"
                >
                  Join as Driver / Attach Vehicle →
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-2.5 sm:pt-3 md:pt-4 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between text-xs text-gray-400 gap-2 sm:gap-3">
          <p>© {new Date().getFullYear()} Kandy Cabs India Pvt Ltd. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 md:gap-6">
            <Link href="/about" className="hover:text-white transition">Privacy Policy</Link>
            <Link href="/about" className="hover:text-white transition">Terms of Service</Link>
            <Link href="/fleet" className="hover:text-white transition">Fleet & Rates</Link>
            <Link href="/admin/login" className="hover:text-white transition">Admin Portal</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
