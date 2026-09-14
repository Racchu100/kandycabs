'use client';

import React from 'react';
import { Phone, Car, AlertTriangle, ChevronRight, ShieldCheck } from 'lucide-react';

interface DriverHeaderProps {
  driverName: string;
  driverPhone?: string;
  vehicleName?: string;
  photoUrl?: string;
  isOnline: boolean;
  onToggleOnline: () => void;
  hasPendingDocs: boolean;
  pendingCount: number;
  onOpenDocModal: () => void;
}

export const DriverHeader: React.FC<DriverHeaderProps> = ({
  driverName,
  driverPhone,
  vehicleName = 'Swift Dzire Sedan',
  photoUrl,
  isOnline,
  onToggleOnline,
  hasPendingDocs,
  pendingCount,
  onOpenDocModal,
}) => {
  const initial = (driverName || 'D').charAt(0).toUpperCase();

  return (
    <div className="space-y-2.5">
      {/* Slim Header Profile Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-2xs">
        <div className="flex items-center justify-between gap-3">
          {/* Left: Avatar & Info */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="relative shrink-0">
              {photoUrl ? (
                <img
                  src={`/api/driver/documents/file?path=${encodeURIComponent(photoUrl)}`}
                  alt={driverName}
                  className="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover shadow-2xs border border-slate-200"
                />
              ) : (
                <div className="w-11 h-11 sm:w-12 sm:h-12 bg-gradient-to-tr from-kandy-orange to-amber-400 text-white rounded-full flex items-center justify-center font-black text-lg shadow-2xs border border-orange-200">
                  {initial}
                </div>
              )}
              {/* Online / Offline Dot */}
              <span
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                  isOnline ? 'bg-emerald-500' : 'bg-red-500'
                }`}
                title={isOnline ? 'Driver Online' : 'Driver Offline'}
              ></span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm sm:text-base font-black text-slate-900 truncate">{driverName}</h1>
                <span title="Approved by Admin">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500 truncate flex items-center gap-1 mt-0.5">
                <span>{vehicleName}</span>
                <span>•</span>
                <span>+91 {driverPhone || '9481086058'}</span>
              </p>
            </div>
          </div>

          {/* Right: Online / Offline Toggle Switch */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:inline text-[11px] font-extrabold text-slate-600 uppercase">
              {isOnline ? 'Online' : 'Offline'}
            </span>
            <button
              type="button"
              onClick={onToggleOnline}
              className={`w-11 h-6 rounded-full flex items-center p-0.5 transition-colors cursor-pointer ${
                isOnline ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
              title="Toggle Online / Offline Status"
            >
              <span
                className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                  isOnline ? 'translate-x-5' : 'translate-x-0'
                }`}
              ></span>
            </button>
          </div>
        </div>
      </div>

      {/* Slim Pending Docs Banner (Amber reserved strictly for action-required alert) */}
      {hasPendingDocs && (
        <button
          type="button"
          onClick={onOpenDocModal}
          className="w-full bg-amber-50 hover:bg-amber-100/90 border border-amber-200 text-amber-900 rounded-xl p-2.5 px-3.5 flex items-center justify-between text-xs font-extrabold shadow-2xs transition group cursor-pointer"
        >
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
            <span className="truncate">
              {pendingCount} Pending Verification Documents — Upload Now
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-amber-600 group-hover:translate-x-0.5 transition-transform shrink-0 ml-2" />
        </button>
      )}
    </div>
  );
};
