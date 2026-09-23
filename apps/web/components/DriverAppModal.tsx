'use client';

import React from 'react';

interface DriverAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  driverName?: string | null;
}

export function DriverAppModal({ isOpen, onClose, driverName }: DriverAppModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-8 shadow-2xl border border-slate-100 space-y-4 sm:space-y-6 relative animate-scale-in max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 sm:top-5 sm:right-5 text-slate-400 hover:text-slate-700 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition text-base sm:text-lg font-bold"
        >
          ✕
        </button>

        {/* Header Icon & Title */}
        <div className="text-center space-y-1 sm:space-y-2">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-amber-500 text-slate-950 rounded-xl sm:rounded-2xl mx-auto flex items-center justify-center text-2xl sm:text-3xl shadow-lg shadow-amber-500/20">
            🚕
          </div>
          <div className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-amber-100 text-amber-900 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
            Driver Partner Network
          </div>
          <h3 className="text-lg sm:text-2xl font-black text-slate-900">
            Kandy Cabs Driver App
          </h3>
          {driverName && (
            <p className="text-xs sm:text-sm font-bold text-emerald-700">
              Welcome back, {driverName}!
            </p>
          )}
          <p className="text-[11px] sm:text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
            The website is designed for customer ride bookings. To receive live trip requests, toggle your duty status, and track your daily payouts, please use the <strong>Kandy Cabs Driver App</strong>.
          </p>
        </div>

        {/* App Features List */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 space-y-2 sm:space-y-3">
          <h4 className="text-[10px] sm:text-xs font-black text-slate-800 uppercase tracking-wider">
            Driver App Features:
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5 text-[11px] sm:text-xs text-slate-700">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-[10px] sm:text-[11px] flex-shrink-0">
                ✓
              </span>
              <span>Live Broadcast Ride Alerts</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-[10px] sm:text-[11px] flex-shrink-0">
                ✓
              </span>
              <span>Online / Offline Duty Toggle</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-[10px] sm:text-[11px] flex-shrink-0">
                ✓
              </span>
              <span>Turn-by-Turn GPS Navigation</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-[10px] sm:text-[11px] flex-shrink-0">
                ✓
              </span>
              <span>Start Trip with OTP & Payouts</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 sm:space-y-2.5 pt-0.5 sm:pt-1">
          <button
            type="button"
            onClick={() => {
              alert('Kandy Driver App APK / Expo build is configured in apps/driver-app. Run `npm run web --workspace=driver-app` or install the Driver APK.');
            }}
            className="w-full py-2.5 sm:py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm shadow-md shadow-amber-500/20 transition flex items-center justify-center gap-2"
          >
            <span>📲 Download / Launch Driver App</span>
            <span>→</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold text-slate-600 hover:text-slate-900 transition text-center"
          >
            Continue as Customer on Website (Book Cab) →
          </button>
        </div>
      </div>
    </div>
  );
}
