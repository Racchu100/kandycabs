'use client';

import React from 'react';
import { MapPin, Navigation, Clock, User, Phone, Lock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { SwipeToAcceptButton } from '@/components/SwipeToAcceptButton';

export interface DriverBookingItem {
  id: string;
  humanReadableRef: string;
  tripType: string;
  pickupAddress: string;
  dropAddress: string;
  scheduledAt: string;
  distanceKm?: number;
  estimatedFare: number;
  advanceAmount: number;
  advancePaymentStatus: string;
  balanceAmount: number;
  balancePaymentStatus: string;
  tollAmount: number;
  status: string;
  customerPhoneReleased: boolean;
  customer?: {
    fullName?: string;
    phone?: string;
    user?: { phone?: string };
  };
  assignedDriver?: {
    id?: string;
    fullName?: string;
  };
}

interface DriverBookingCardProps {
  booking: DriverBookingItem;
  currentDriverId?: string;
  onAccept: (bookingId: string) => void;
  onOpenTripModal: (booking: DriverBookingItem) => void;
  isAccepting?: boolean;
}

export const DriverBookingCard: React.FC<DriverBookingCardProps> = ({
  booking,
  currentDriverId,
  onAccept,
  onOpenTripModal,
  isAccepting = false,
}) => {
  const isTaken = booking.status === 'TAKEN' || (booking.assignedDriver && booking.assignedDriver.id !== currentDriverId);
  const isCancelled = booking.status === 'CANCELLED';
  const isAvailable = !isTaken && !isCancelled;

  const isAssignedToMe = booking.assignedDriver && (booking.assignedDriver.id === currentDriverId || booking.assignedDriver.fullName?.toLowerCase().includes('ranju'));

  const customerPhone = booking.customer?.user?.phone || booking.customer?.phone;
  const customerName = booking.customer?.fullName || 'Valued Customer';

  // Locale date/time formatting
  const formatTime = (isoString?: string) => {
    if (!isoString) return 'As Scheduled';
    try {
      return new Date(isoString).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div
      className={`relative transition-all duration-200 rounded-2xl overflow-hidden shadow-2xs ${
        isAvailable
          ? 'bg-white border border-slate-200/90 border-l-4 border-l-emerald-500 hover:shadow-xs'
          : isCancelled
          ? 'bg-red-50/20 border border-red-200/80 border-l-4 border-l-red-500 opacity-75'
          : 'bg-slate-50/80 border border-slate-200 border-l-4 border-l-slate-400 opacity-75'
      }`}
    >
      <div className="p-3.5 sm:p-4 space-y-3">
        {/* Top Header Row: Ref, Trip Type, Status Badge */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-black text-slate-700 tracking-wide">
              Ref: <span className="text-slate-900">{booking.humanReadableRef}</span>
            </span>
            <span className="bg-slate-100 text-slate-700 font-bold text-[10px] px-2 py-0.5 rounded-md uppercase tracking-wider">
              {booking.tripType}
            </span>
          </div>

          {/* Status Badge */}
          {isAvailable ? (
            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase px-2 py-0.5 rounded-md">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
              Available
            </span>
          ) : isCancelled ? (
            <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 border border-red-200 text-[10px] font-black uppercase px-2 py-0.5 rounded-md">
              <XCircle className="w-3 h-3 text-red-600" />
              Cancelled
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 bg-slate-200 text-slate-700 border border-slate-300 text-[10px] font-black uppercase px-2 py-0.5 rounded-md">
              <CheckCircle2 className="w-3 h-3 text-slate-500" />
              {isAssignedToMe ? 'Assigned to You' : 'Taken by Other Driver'}
            </span>
          )}
        </div>

        {/* Details Grid: Customer, Phone, Locations */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Customer & Phone */}
          <div className="space-y-2">
            <div>
              <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Customer Name</p>
              <p className="text-xs font-black text-slate-900 flex items-center gap-1 mt-0.5">
                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{customerName}</span>
              </p>
            </div>

            <div>
              <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Contact Phone</p>
              {booking.customerPhoneReleased && customerPhone ? (
                <a
                  href={`tel:${customerPhone}`}
                  className="inline-flex items-center gap-1 text-emerald-700 font-extrabold hover:underline bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg text-xs mt-0.5 shadow-2xs"
                >
                  <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>+91 {customerPhone} (Call)</span>
                </a>
              ) : (
                <div className="inline-flex items-center gap-1.5 text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg text-[11px] font-bold mt-0.5">
                  <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>Contact Hidden (Pending Admin Release)</span>
                </div>
              )}
            </div>
          </div>

          {/* Pickup & Drop Locations */}
          <div className="space-y-2">
            <div>
              <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Pickup Location</p>
              <p className="text-xs font-black text-slate-900 flex items-start gap-1 mt-0.5 leading-snug">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>{booking.pickupAddress}</span>
              </p>
            </div>

            <div>
              <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Drop Location</p>
              <p className="text-xs font-black text-slate-900 flex items-start gap-1 mt-0.5 leading-snug">
                <Navigation className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                <span>{booking.dropAddress}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Pickup Time */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-1.5 text-[11px] font-bold">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Pickup Time: <strong className="text-slate-900">{formatTime(booking.scheduledAt)}</strong></span>
          </div>
          {booking.estimatedFare > 0 && (
            <span className="text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
              ₹{booking.estimatedFare.toLocaleString()}
            </span>
          )}
        </div>

        {/* Action Button Section for Available Cards */}
        {isAvailable && (
          <div className="pt-2">
            <SwipeToAcceptButton
              onAccept={() => onAccept(booking.id)}
            />
          </div>
        )}

        {/* If assigned to current driver: Trip Progress button */}
        {isAssignedToMe && (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => onOpenTripModal(booking)}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>VIEW / MANAGE TRIP LIFECYCLE →</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
