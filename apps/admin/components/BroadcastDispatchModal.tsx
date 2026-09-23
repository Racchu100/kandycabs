'use client';

import React, { useState, useEffect, useMemo } from 'react';

interface DriverOption {
  id: string;
  onlineStatus: boolean;
  profilePhotoUrl?: string | null;
  verificationStatus?: string;
  user: { fullName: string; phone: string };
  vehicles: { category: string; plateNumber: string }[];
  currentLat?: number | null;
  currentLng?: number | null;
  assignedBookings?: any[];
}

interface BroadcastDispatchModalProps {
  bookingId: string;
  bookingRef: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function BroadcastDispatchModal({
  bookingId,
  bookingRef,
  isOpen,
  onClose,
  onSuccess,
}: BroadcastDispatchModalProps) {
  const [onlineDrivers, setOnlineDrivers] = useState<DriverOption[]>([]);
  const [selectedDriverIds, setSelectedDriverIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ONLINE' | 'OFFLINE'>('ALL');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError('');
      setSelectedDriverIds([]);
      setSearchQuery('');
      setStatusFilter('ALL');
      fetch('/api/admin/drivers/online')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.drivers)) {
            setOnlineDrivers(data.drivers);
          }
        })
        .catch(() => {
          setError('Failed to fetch drivers');
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  // Filtered drivers based on search query and status filter
  const filteredDrivers = useMemo(() => {
    return onlineDrivers.filter((driver) => {
      // Status filter
      if (statusFilter === 'ONLINE' && !driver.onlineStatus) return false;
      if (statusFilter === 'OFFLINE' && driver.onlineStatus) return false;

      // Search query matching
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const nameMatch = driver.user.fullName?.toLowerCase().includes(q);
      const phoneMatch = driver.user.phone?.toLowerCase().includes(q);
      const plateMatch = driver.vehicles?.some((v) => v.plateNumber?.toLowerCase().includes(q));
      const catMatch = driver.vehicles?.some((v) => v.category?.toLowerCase().includes(q));
      return nameMatch || phoneMatch || plateMatch || catMatch;
    });
  }, [onlineDrivers, statusFilter, searchQuery]);

  if (!isOpen) return null;

  const toggleDriver = (id: string) => {
    setSelectedDriverIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const selectAllFiltered = () => {
    const filteredIds = filteredDrivers.map((d) => d.id);
    const allFilteredSelected = filteredIds.every((id) => selectedDriverIds.includes(id));

    if (allFilteredSelected) {
      setSelectedDriverIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedDriverIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleDispatch = async () => {
    if (selectedDriverIds.length === 0) {
      setError('Please select at least one driver');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverIds: selectedDriverIds }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to dispatch booking');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Dispatch failed');
    } finally {
      setSubmitting(false);
    }
  };

  const onlineCount = onlineDrivers.filter((d) => d.onlineStatus).length;
  const offlineCount = onlineDrivers.length - onlineCount;
  const isAllFilteredSelected =
    filteredDrivers.length > 0 &&
    filteredDrivers.every((d) => selectedDriverIds.includes(d.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl animate-fade-in flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>📡</span> Broadcast Ride Dispatch
            </h3>
            <p className="text-xs text-slate-500">
              Booking Ref: <span className="font-semibold text-slate-800">{bookingRef}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg font-semibold w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="my-3 rounded-lg bg-red-50 p-3 text-xs text-red-700 font-medium">
            {error}
          </div>
        )}

        {/* Search Input & Status Filter Controls */}
        <div className="py-3 space-y-2.5">
          {/* Live Search Box */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-sm">
              🔍
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search driver by name, phone, plate, or vehicle..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 placeholder-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Pills & Select All Row */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition ${
                  statusFilter === 'ALL'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All ({onlineDrivers.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('ONLINE')}
                className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition ${
                  statusFilter === 'ONLINE'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                ● Online ({onlineCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('OFFLINE')}
                className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition ${
                  statusFilter === 'OFFLINE'
                    ? 'bg-slate-700 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                ○ Offline ({offlineCount})
              </button>
            </div>

            <button
              type="button"
              onClick={selectAllFiltered}
              disabled={filteredDrivers.length === 0}
              className="text-xs text-indigo-600 font-semibold hover:text-indigo-800 disabled:opacity-40"
            >
              {isAllFilteredSelected ? 'Deselect All' : 'Select All'}
            </button>
          </div>
        </div>

        {/* Drivers List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[160px] max-h-80">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500">
              <div className="inline-block animate-spin text-lg mb-1">🔄</div>
              <div>Loading registered drivers...</div>
            </div>
          ) : filteredDrivers.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              {searchQuery ? 'No drivers matching search query.' : 'No drivers found.'}
            </div>
          ) : (
            filteredDrivers.map((driver) => {
              const isSelected = selectedDriverIds.includes(driver.id);
              const vehicle = driver.vehicles[0];
              const isOnTrip = driver.assignedBookings && driver.assignedBookings.length > 0;

              return (
                <div
                  key={driver.id}
                  onClick={() => toggleDriver(driver.id)}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                    <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex-shrink-0 overflow-hidden flex items-center justify-center">
                      {driver.profilePhotoUrl ? (
                        <img
                          src={driver.profilePhotoUrl}
                          alt={driver.user.fullName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-base">👨🏽‍✈️</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-slate-900 truncate">
                          {driver.user.fullName}
                        </span>
                        {isOnTrip ? (
                          <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">
                            On Trip
                          </span>
                        ) : driver.onlineStatus ? (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                            ● Online
                          </span>
                        ) : (
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                            ○ Offline
                          </span>
                        )}
                        {driver.verificationStatus && driver.verificationStatus !== 'APPROVED' && (
                          <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1 py-0.2 rounded font-semibold">
                            Pending Review
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate">
                        {driver.user.phone} •{' '}
                        {vehicle
                          ? `${vehicle.category} (${vehicle.plateNumber || 'No Plate'})`
                          : 'No Vehicle Assigned'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-between items-center pt-4 border-t border-slate-100 mt-2">
          <div className="text-xs text-slate-500">
            Selected: <span className="font-bold text-slate-800">{selectedDriverIds.length}</span> / {onlineDrivers.length}
          </div>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting || selectedDriverIds.length === 0}
              onClick={handleDispatch}
              className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition disabled:opacity-50 shadow-md shadow-indigo-500/20"
            >
              {submitting
                ? 'Broadcasting...'
                : `Broadcast to ${selectedDriverIds.length} Driver(s)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
