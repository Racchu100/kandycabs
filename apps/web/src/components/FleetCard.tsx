import React from 'react';
import Link from 'next/link';
import { Star, UserCheck, Luggage, Fuel, ArrowRight } from 'lucide-react';

export interface FleetCardProps {
  name: string;
  models?: string;
  seats: number;
  bootCapacity: string;
  perKmRate: number;
  extraKmRate?: number;
  fuel?: string;
  rating?: number;
  image: string;
  driverAllowanceText?: string;
  bookingUrl?: string;
  onBook?: () => void;
}

export function FleetCard({
  name,
  models,
  seats,
  bootCapacity,
  perKmRate,
  extraKmRate,
  fuel = 'CNG / Diesel',
  rating = 4.8,
  image,
  driverAllowanceText = 'Driver allowance Included',
  bookingUrl,
  onBook,
}: FleetCardProps) {
  const ctaContent = (
    <>
      <span>BOOK THIS CAB</span>
      <ArrowRight className="w-4 h-4" />
    </>
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm p-4 sm:p-5 flex flex-col justify-between hover:shadow-md transition duration-200 group">
      <div>
        {/* Top: Car Image */}
        <div className="relative w-full h-40 sm:h-44 overflow-hidden rounded-xl bg-gray-50 mb-3.5 flex items-center justify-center">
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
          />
        </div>

        {/* Header: Title & Rating Badge */}
        <div className="flex items-center justify-between gap-2 mb-1">
          <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight line-clamp-1">
            {name}
          </h3>
          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-200/80 text-[11px] font-black px-2 py-0.5 rounded-full shrink-0">
            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
            {rating.toFixed(1)}
          </span>
        </div>

        {/* Subtitle / Models */}
        {models && (
          <p className="text-xs text-slate-500 font-semibold mb-3">
            {seats} seater AC Cab ({models})
          </p>
        )}

        {/* Specs List with Fixed-width Left Icons */}
        <div className="space-y-2 text-xs text-slate-700 font-medium">
          <div className="flex items-center gap-2.5">
            <div className="w-5 text-slate-400 flex items-center justify-center shrink-0">
              <UserCheck className="w-4 h-4 text-slate-500" />
            </div>
            <span className="text-slate-700">{driverAllowanceText}</span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-5 text-slate-400 flex items-center justify-center shrink-0">
              <Luggage className="w-4 h-4 text-slate-500" />
            </div>
            <span className="text-slate-700">
              Luggage: {bootCapacity} {extraKmRate ? `| Extra KM: ₹${extraKmRate}/km` : ''}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-5 text-slate-400 flex items-center justify-center shrink-0">
              <Fuel className="w-4 h-4 text-slate-500" />
            </div>
            <span className="text-slate-700">
              <strong className="text-slate-900">Fuel:</strong> {fuel}
            </span>
          </div>
        </div>
      </div>

      {/* Horizontal Divider */}
      <div className="border-t border-gray-100 my-4" />

      {/* Bottom: Rate & CTA Button */}
      <div>
        <div className="flex items-baseline justify-between mb-3">
          <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
            OUTSTATION RATE
          </span>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            ₹{perKmRate}
            <span className="text-xs font-semibold text-slate-500 ml-0.5">/km</span>
          </div>
        </div>

        {bookingUrl ? (
          <Link
            href={bookingUrl}
            className="w-full py-3 bg-slate-900 hover:bg-black text-white font-bold text-xs sm:text-sm uppercase tracking-wider rounded-xl shadow-sm hover:shadow transition active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
          >
            {ctaContent}
          </Link>
        ) : (
          <button
            type="button"
            onClick={onBook}
            className="w-full py-3 bg-slate-900 hover:bg-black text-white font-bold text-xs sm:text-sm uppercase tracking-wider rounded-xl shadow-sm hover:shadow transition active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
          >
            {ctaContent}
          </button>
        )}
      </div>
    </div>
  );
}
