'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { BookingStatus, getSupabaseClient } from '@kandy-cabs/shared';
import { BroadcastDispatchModal } from '@/components/BroadcastDispatchModal';
import { OtpOverrideModal } from '@/components/OtpOverrideModal';
import { BookingDetailDrawer } from '@/components/BookingDetailDrawer';
import { AdminNavbar } from '@/components/AdminNavbar';

export const dynamic = 'force-dynamic';

const STATUS_FILTERS = [
  'ALL',
  BookingStatus.PENDING_ADMIN,
  BookingStatus.DISPATCHED,
  BookingStatus.DRIVER_ACCEPTED,
  BookingStatus.DRIVER_EN_ROUTE,
  BookingStatus.TRIP_STARTED,
  BookingStatus.TRIP_COMPLETED,
  BookingStatus.CANCELLED,
];

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalCount: 0, totalPages: 1, limit: 25, page: 1 });
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [realtimeActive, setRealtimeActive] = useState(false);

  // Modals & Drawer State
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [dispatchBooking, setDispatchBooking] = useState<{ id: string; ref: string } | null>(null);

  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpBooking, setOtpBooking] = useState<{ id: string; ref: string } | null>(null);

  const [debouncedSearch, setDebouncedSearch] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef(false);

  // Debounce search input by 350ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchBookings = useCallback(
    async (isBackground: boolean = false) => {
      // If a background fetch is requested while a fetch is already in flight, skip to prevent queuing
      if (isBackground && inFlightRef.current) return;

      // Abort previous in-flight user request if starting a new foreground request
      if (!isBackground && abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      if (!isBackground) {
        abortControllerRef.current = controller;
        setLoading(true);
      }
      inFlightRef.current = true;

      try {
        const queryParams = new URLSearchParams({
          page: String(page),
          limit: '25',
          status: statusFilter,
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
        });

        const res = await fetch(`/api/admin/bookings?${queryParams}`, {
          signal: controller.signal,
        });

        if (res.ok) {
          const data = await res.json();
          setBookings(data.bookings || []);
          if (data.pagination) {
            setPagination(data.pagination);
          }
          setIsReconnecting(false);
        } else {
          if (!isBackground) setIsReconnecting(true);
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Fetch bookings error:', err);
          if (!isBackground) setIsReconnecting(true);
        }
      } finally {
        inFlightRef.current = false;
        if (!isBackground) setLoading(false);
      }
    },
    [page, statusFilter, debouncedSearch]
  );

  // Initial fetch and on filter/page change
  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Realtime subscription with Supabase + 20-second polling fallback
  useEffect(() => {
    const supabase = getSupabaseClient();
    let channel: any = null;
    let pollInterval: any = null;

    if (supabase) {
      try {
        channel = supabase
          .channel('admin-bookings-realtime')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'Booking' },
            (payload: any) => {
              setRealtimeActive(true);
              setIsReconnecting(false);

              if (payload.eventType === 'INSERT') {
                // Prepend new booking to in-memory state
                setBookings((prev) => [payload.new, ...prev]);
                setPagination((p) => ({ ...p, totalCount: p.totalCount + 1 }));
              } else if (payload.eventType === 'UPDATE') {
                // Patch updated booking in-memory
                setBookings((prev) =>
                  prev.map((b) => (b.id === payload.new.id ? { ...b, ...payload.new } : b))
                );
              } else if (payload.eventType === 'DELETE') {
                setBookings((prev) => prev.filter((b) => b.id !== payload.old.id));
              }
            }
          )
          .subscribe((status: string) => {
            if (status === 'SUBSCRIBED') {
              setRealtimeActive(true);
              setIsReconnecting(false);
            } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
              setRealtimeActive(false);
              setIsReconnecting(true);
            }
          });
      } catch (e) {
        setRealtimeActive(false);
        setIsReconnecting(true);
      }
    } else {
      setIsReconnecting(false);
    }

    // Fallback 20-second polling for guaranteed background sync
    pollInterval = setInterval(() => {
      fetchBookings(true);
    }, 20000);

    return () => {
      if (channel) {
        channel.unsubscribe();
      }
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchBookings]);

  const handleOpenDrawer = (id: string) => {
    setSelectedBookingId(id);
    setDrawerOpen(true);
  };

  const handleOpenDispatch = (id: string, ref: string) => {
    setDispatchBooking({ id, ref });
    setDispatchModalOpen(true);
  };

  const handleOpenOtpOverride = (id: string, ref: string) => {
    setOtpBooking({ id, ref });
    setOtpModalOpen(true);
  };

  const getStatusBadgeClass = (status: BookingStatus) => {
    switch (status) {
      case BookingStatus.PENDING_ADMIN:
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case BookingStatus.DISPATCHED:
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case BookingStatus.DRIVER_ACCEPTED:
      case BookingStatus.DRIVER_EN_ROUTE:
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case BookingStatus.TRIP_STARTED:
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case BookingStatus.TRIP_COMPLETED:
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case BookingStatus.CANCELLED:
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <AdminNavbar />
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6 flex-1">
        {/* Top Navbar / Navigation */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-xs border border-slate-200">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Kandy Cabs Operations</h1>
              {isReconnecting ? (
                <span className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Reconnecting... (5s polling active)</span>
                </span>
              ) : realtimeActive ? (
                <span className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>Realtime Connected</span>
                </span>
              ) : null}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Live Fleet Bookings & Operations Command Center
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/live-map"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center space-x-1.5"
            >
              <span>🗺️ Open Live Fleet Map (Flow A)</span>
            </Link>
          </div>
        </div>

        {/* Pending Driver Override Alert Banner */}
        {bookings.some(
          (b) =>
            b.tripEvents?.some((e: any) => e.type === 'OVERRIDE_REQUESTED') &&
            (b.status === BookingStatus.DRIVER_ACCEPTED || b.status === BookingStatus.DRIVER_EN_ROUTE)
        ) && (
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-4 sm:p-5 rounded-2xl shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-amber-400">
            <div className="flex items-center space-x-3">
              <span className="text-2xl animate-bounce">⚠️</span>
              <div>
                <h3 className="font-extrabold text-sm tracking-tight text-white">
                  Driver Requested Admin Authorization to Start Trip!
                </h3>
                <p className="text-xs text-amber-100 mt-0.5">
                  Customer phone is unreachable or out of battery. Admin authorization is requested to bypass OTP and start the ride.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {bookings
                .filter(
                  (b) =>
                    b.tripEvents?.some((e: any) => e.type === 'OVERRIDE_REQUESTED') &&
                    (b.status === BookingStatus.DRIVER_ACCEPTED || b.status === BookingStatus.DRIVER_EN_ROUTE)
                )
                .map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => handleOpenOtpOverride(b.id, b.humanReadableRef)}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-extrabold rounded-xl shadow-xs transition flex items-center space-x-1.5"
                  >
                    <span>🔑 Authorize {b.humanReadableRef}</span>
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Filters & Search */}
        <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Status Pills */}
          <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setStatusFilter(s);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  statusFilter === s
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {s.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="w-full md:w-72">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search reference, customer, phone, location..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Bookings Table */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Ref & Date</th>
                  <th className="px-5 py-3.5">Customer</th>
                  <th className="px-5 py-3.5">Route</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Assigned Driver</th>
                  <th className="px-5 py-3.5">Fare</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading && bookings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                      Loading bookings...
                    </td>
                  </tr>
                ) : bookings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                      No matching bookings found for the selected filter.
                    </td>
                  </tr>
                ) : (
                  bookings.map((b) => {
                    const hasOverrideRequest =
                      b.tripEvents?.some((e: any) => e.type === 'OVERRIDE_REQUESTED') &&
                      (b.status === BookingStatus.DRIVER_ACCEPTED || b.status === BookingStatus.DRIVER_EN_ROUTE);

                    return (
                    <tr key={b.id} className={`hover:bg-slate-50/70 transition ${hasOverrideRequest ? 'bg-amber-50/60' : ''}`}>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-900 block">
                          {b.humanReadableRef}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(b.createdAt).toLocaleDateString()} {new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="font-bold text-slate-800 block">
                          {b.customer?.user?.fullName || 'Customer'}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {b.customerPhoneReleased ? b.customer?.user?.phone : '🔒 Phone Hidden'}
                        </span>
                      </td>

                      <td className="px-5 py-4 max-w-xs">
                        <div className="truncate text-slate-700 font-medium" title={b.pickupAddress}>
                          📍 {b.pickupAddress}
                        </div>
                        <div className="truncate text-slate-500 text-[11px]" title={b.dropAddress}>
                          🏁 {b.dropAddress}
                        </div>
                        <span className="text-[10px] text-indigo-600 font-semibold mt-0.5 inline-block">
                          {b.tripType} • {b.distanceKm} km
                        </span>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${getStatusBadgeClass(
                            b.status
                          )}`}
                        >
                          {b.status}
                        </span>
                        {hasOverrideRequest && (
                          <span className="block mt-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse text-center">
                            ⚠️ OVERRIDE REQ
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        {b.assignedDriver ? (
                          <div className="space-y-1">
                            <span className="font-bold text-slate-800 block">
                              {b.assignedDriver.user?.fullName}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono block">
                              {b.assignedDriver.user?.phone}
                            </span>
                            {b.driverPaymentStatus === 'PAID' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <span>✓</span> Driver Paid
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                                <span>✗</span> Driver Not Paid
                              </span>
                            )}
                          </div>
                        ) : b.status === BookingStatus.DISPATCHED ? (
                          <span className="text-blue-600 font-semibold text-[11px]">
                            📡 Dispatched ({b.dispatches?.length || 0} drivers)
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                        )}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="font-bold text-slate-900 block">
                          ₹{Number(b.estimatedFare).toFixed(2)}
                        </span>
                        <span className="text-[10px] text-emerald-600 font-semibold">
                          Adv: ₹{Number(b.advanceAmount).toFixed(2)} (PAID)
                        </span>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap text-right space-x-1.5">
                        {hasOverrideRequest && (
                          <button
                            type="button"
                            onClick={() => handleOpenOtpOverride(b.id, b.humanReadableRef)}
                            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-[11px] shadow-xs animate-pulse"
                            title="Driver requested Admin OTP Override to start trip"
                          >
                            🔑 Authorize Start
                          </button>
                        )}

                        {b.status === BookingStatus.PENDING_ADMIN && (
                          <button
                            type="button"
                            onClick={() => handleOpenDispatch(b.id, b.humanReadableRef)}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[11px] shadow-xs"
                          >
                            Dispatch
                          </button>
                        )}

                        {b.status === BookingStatus.DISPATCHED && (
                          <button
                            type="button"
                            onClick={() => handleOpenDispatch(b.id, b.humanReadableRef)}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[11px] shadow-xs"
                            title="Re-broadcast ride to online drivers"
                          >
                            Re-dispatch
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenDrawer(b.id)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[11px]"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="p-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Showing page {pagination.page} of {pagination.totalPages} ({pagination.totalCount} total bookings)
              </span>
              <div className="flex space-x-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals & Slide-out Drawers */}
      <BookingDetailDrawer
        bookingId={selectedBookingId}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onOpenDispatch={(id, ref) => handleOpenDispatch(id, ref)}
        onOpenOtpOverride={(id, ref) => handleOpenOtpOverride(id, ref)}
        onRefresh={fetchBookings}
      />

      {dispatchBooking && (
        <BroadcastDispatchModal
          bookingId={dispatchBooking.id}
          bookingRef={dispatchBooking.ref}
          isOpen={dispatchModalOpen}
          onClose={() => {
            setDispatchModalOpen(false);
            setDispatchBooking(null);
          }}
          onSuccess={fetchBookings}
        />
      )}

      {otpBooking && (
        <OtpOverrideModal
          bookingId={otpBooking.id}
          bookingRef={otpBooking.ref}
          isOpen={otpModalOpen}
          onClose={() => {
            setOtpModalOpen(false);
            setOtpBooking(null);
          }}
          onSuccess={fetchBookings}
        />
      )}
    </div>
  );
}
