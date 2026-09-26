'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AdminNavbar } from '@/components/AdminNavbar';
import { BookingStatus, DriverVerificationStatus, getSupabaseClient } from '@kandy-cabs/shared';

export const dynamic = 'force-dynamic';

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [realtimeActive, setRealtimeActive] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setLastRefreshed(new Date());
  }, []);

  const fetchDashboardStats = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await fetch('/api/admin/dashboard/stats');
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setLastRefreshed(new Date());
      }
    } catch (err) {
      console.error('Failed to fetch dashboard metrics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardStats();

    // Auto-refresh stats every 30 seconds
    const interval = setInterval(() => {
      fetchDashboardStats(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchDashboardStats]);

  // Realtime listener for immediate stats update on new bookings or changes
  useEffect(() => {
    const supabase = getSupabaseClient();
    let channel: any = null;

    if (supabase) {
      try {
        channel = supabase
          .channel('admin-dashboard-stats-realtime')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'Booking' },
            () => {
              setRealtimeActive(true);
              fetchDashboardStats(true);
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'Driver' },
            () => {
              fetchDashboardStats(true);
            }
          )
          .subscribe();
      } catch (err) {
        console.warn('Realtime subscription error:', err);
      }
    }

    return () => {
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchDashboardStats]);

  const stats = data?.stats || {
    bookings: { total: 0, pendingAdmin: 0, dispatched: 0, active: 0, completed: 0, cancelled: 0 },
    financials: { grossRevenue: 0, advanceCollected: 0 },
    drivers: { total: 0, online: 0, pendingKyc: 0, approved: 0 },
    fleets: { categoriesCount: 0, pricingRulesCount: 0 },
  };

  const recentBookings = data?.recentBookings || [];
  const recentAuditLogs = data?.recentAuditLogs || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case BookingStatus.PENDING_ADMIN:
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case BookingStatus.DISPATCHED:
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case BookingStatus.DRIVER_ACCEPTED:
      case BookingStatus.DRIVER_EN_ROUTE:
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case BookingStatus.TRIP_STARTED:
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 animate-pulse';
      case BookingStatus.TRIP_COMPLETED:
        return 'bg-slate-100 text-slate-700 border-slate-300';
      case BookingStatus.CANCELLED:
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <AdminNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Header & Quick Action Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xl">⚡</span>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Operations Control Center</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 uppercase">
                Realtime Overview
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Live monitoring, dispatch queue, fleet operations, KYC verification, and financial summaries.
            </p>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700">
              <span className={`w-2 h-2 rounded-full ${realtimeActive ? 'bg-emerald-500 animate-ping' : 'bg-emerald-500'}`} />
              <span className="font-mono text-[11px]" suppressHydrationWarning>
                Updated: {mounted && lastRefreshed ? lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Syncing...'}
              </span>
            </div>

            <button
              onClick={() => fetchDashboardStats(false)}
              disabled={loading || refreshing}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center space-x-1.5 transition disabled:opacity-50 shadow-xs"
            >
              <span className={refreshing ? 'animate-spin' : ''}>🔄</span>
              <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* 4 Primary Top KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Action Required (Pending Admin) */}
          <Link
            href="/bookings?status=PENDING_ADMIN"
            className="group relative bg-white hover:bg-amber-50/40 border border-amber-200 hover:border-amber-400 rounded-2xl p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Needs Dispatch</p>
                <h3 className="text-3xl font-black text-slate-900 mt-1">
                  {loading ? '...' : stats.bookings.pendingAdmin}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                🚨
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2.5">
              <span>Awaiting manual dispatch</span>
              <span className="text-amber-600 group-hover:translate-x-1 transition-transform font-bold">Action →</span>
            </div>
          </Link>

          {/* Card 2: Active Rides on Road */}
          <Link
            href="/live-map"
            className="group relative bg-white hover:bg-blue-50/40 border border-blue-200 hover:border-blue-400 rounded-2xl p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Active Rides On Road</p>
                <h3 className="text-3xl font-black text-slate-900 mt-1">
                  {loading ? '...' : stats.bookings.active}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                🚗
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2.5">
              <span>
                <b className="text-emerald-700 font-bold">{stats.drivers.online}</b> Drivers Online
              </span>
              <span className="text-blue-600 group-hover:translate-x-1 transition-transform font-bold">Live Map →</span>
            </div>
          </Link>

          {/* Card 3: Gross Revenue / Financials */}
          <Link
            href="/payments"
            className="group relative bg-white hover:bg-emerald-50/40 border border-emerald-200 hover:border-emerald-400 rounded-2xl p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Total Bookings Volume</p>
                <h3 className="text-3xl font-black text-slate-900 mt-1">
                  {loading ? '...' : `₹${stats.financials.grossRevenue.toLocaleString('en-IN')}`}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                💳
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2.5">
              <span>
                ₹{stats.financials.advanceCollected.toLocaleString('en-IN')} Advance Coll.
              </span>
              <span className="text-emerald-600 group-hover:translate-x-1 transition-transform font-bold">Payouts →</span>
            </div>
          </Link>

          {/* Card 4: KYC & Drivers */}
          <Link
            href="/vehicle-evidence"
            className="group relative bg-white hover:bg-purple-50/40 border border-purple-200 hover:border-purple-400 rounded-2xl p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-purple-700">Pending Driver KYC</p>
                <h3 className="text-3xl font-black text-slate-900 mt-1">
                  {loading ? '...' : stats.drivers.pendingKyc}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                🛡️
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2.5">
              <span>
                <b className="text-purple-700 font-bold">{stats.drivers.approved}</b> Approved Drivers
              </span>
              <span className="text-purple-600 group-hover:translate-x-1 transition-transform font-bold">Review →</span>
            </div>
          </Link>
        </div>

        {/* Operational Modules Quick Access Grid */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <span>🗂️</span>
              <span>All Admin Dashboards & Operational Modules</span>
            </h2>
            <span className="text-xs text-slate-500">Direct navigation to system modules</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* 1. Bookings Management */}
            <Link
              href="/bookings"
              className="bg-white border border-slate-200 hover:border-amber-400 hover:bg-amber-50/20 p-4 rounded-xl transition duration-150 group shadow-xs hover:shadow-md"
            >
              <div className="flex items-center space-x-3 mb-2">
                <span className="text-2xl p-2 rounded-lg bg-amber-50 border border-amber-200 group-hover:bg-amber-100 transition-colors">
                  📋
                </span>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-amber-600 transition-colors">Bookings & Dispatch</h4>
                  <p className="text-[11px] text-slate-500">Total: {stats.bookings.total} bookings</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 line-clamp-2">
                Manage bookings, broadcast dispatch to nearby drivers, manual driver assign, and OTP overrides.
              </p>
            </Link>

            {/* 2. Live Map */}
            <Link
              href="/live-map"
              className="bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50/20 p-4 rounded-xl transition duration-150 group shadow-xs hover:shadow-md"
            >
              <div className="flex items-center space-x-3 mb-2">
                <span className="text-2xl p-2 rounded-lg bg-blue-50 border border-blue-200 group-hover:bg-blue-100 transition-colors">
                  🗺️
                </span>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">Live GPS Fleet Map</h4>
                  <p className="text-[11px] text-slate-500">{stats.drivers.online} drivers currently online</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 line-clamp-2">
                Live OpenStreetMap GPS tracking of all drivers, active trip routes, and location breadcrumbs.
              </p>
            </Link>

            {/* 3. Payments */}
            <Link
              href="/payments"
              className="bg-white border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/20 p-4 rounded-xl transition duration-150 group shadow-xs hover:shadow-md"
            >
              <div className="flex items-center space-x-3 mb-2">
                <span className="text-2xl p-2 rounded-lg bg-emerald-50 border border-emerald-200 group-hover:bg-emerald-100 transition-colors">
                  💳
                </span>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">Payments & Settlements</h4>
                  <p className="text-[11px] text-slate-500">Advances, Allowances & Balances</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 line-clamp-2">
                Track customer 25% advances, record balance UPI/Cash payments, and manage driver trip allowances.
              </p>
            </Link>

            {/* 4. Odometer Audit */}
            <Link
              href="/odometer-evidence"
              className="bg-white border border-slate-200 hover:border-rose-400 hover:bg-rose-50/20 p-4 rounded-xl transition duration-150 group shadow-xs hover:shadow-md"
            >
              <div className="flex items-center space-x-3 mb-2">
                <span className="text-2xl p-2 rounded-lg bg-rose-50 border border-rose-200 group-hover:bg-rose-100 transition-colors">
                  🔍
                </span>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-rose-600 transition-colors">Odometer Evidence Audit</h4>
                  <p className="text-[11px] text-slate-500">Photo Proof & GPS Verification</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 line-clamp-2">
                Audit start/end trip odometer photos with GPS geocoding and automated discrepancy alerts.
              </p>
            </Link>

            {/* 5. Vehicle KYC */}
            <Link
              href="/vehicle-evidence"
              className="bg-white border border-slate-200 hover:border-purple-400 hover:bg-purple-50/20 p-4 rounded-xl transition duration-150 group shadow-xs hover:shadow-md"
            >
              <div className="flex items-center space-x-3 mb-2">
                <span className="text-2xl p-2 rounded-lg bg-purple-50 border border-purple-200 group-hover:bg-purple-100 transition-colors">
                  🛡️
                </span>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-purple-600 transition-colors">Vehicle & Driver KYC</h4>
                  <p className="text-[11px] text-slate-500">{stats.drivers.pendingKyc} Pending Approvals</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 line-clamp-2">
                Onboard new drivers, review driving licenses, RC books, insurance papers, and vehicle photos.
              </p>
            </Link>

            {/* 6. Fleets */}
            <Link
              href="/fleets"
              className="bg-white border border-slate-200 hover:border-amber-400 hover:bg-amber-50/20 p-4 rounded-xl transition duration-150 group shadow-xs hover:shadow-md"
            >
              <div className="flex items-center space-x-3 mb-2">
                <span className="text-2xl p-2 rounded-lg bg-amber-50 border border-amber-200 group-hover:bg-amber-100 transition-colors">
                  🚐
                </span>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-amber-600 transition-colors">Fleet Categories</h4>
                  <p className="text-[11px] text-slate-500">{stats.fleets.categoriesCount} Configured Fleets</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 line-clamp-2">
                Configure Sedan, SUV, Crysta, and Tempo Traveller vehicle models, capacity, and features.
              </p>
            </Link>

            {/* 7. Pricing Rules */}
            <Link
              href="/pricing"
              className="bg-white border border-slate-200 hover:border-teal-400 hover:bg-teal-50/20 p-4 rounded-xl transition duration-150 group shadow-xs hover:shadow-md"
            >
              <div className="flex items-center space-x-3 mb-2">
                <span className="text-2xl p-2 rounded-lg bg-teal-50 border border-teal-200 group-hover:bg-teal-100 transition-colors">
                  🏷️
                </span>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-teal-600 transition-colors">Pricing Rules</h4>
                  <p className="text-[11px] text-slate-500">{stats.fleets.pricingRulesCount} Active Tariffs</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 line-clamp-2">
                Set per-km rates, min km thresholds, driver allowances, night charges, and GST policies.
              </p>
            </Link>

            {/* 8. Audit Logs */}
            <Link
              href="/audit-logs"
              className="bg-white border border-slate-200 hover:border-slate-400 hover:bg-slate-50 p-4 rounded-xl transition duration-150 group shadow-xs hover:shadow-md"
            >
              <div className="flex items-center space-x-3 mb-2">
                <span className="text-2xl p-2 rounded-lg bg-slate-100 border border-slate-200 group-hover:bg-slate-200 transition-colors">
                  📜
                </span>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-slate-700 transition-colors">Audit Trail</h4>
                  <p className="text-[11px] text-slate-500">Full System Activity History</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 line-clamp-2">
                Inspect immutable system audit trails, driver status changes, dispatch events, and OTP actions.
              </p>
            </Link>
          </div>
        </div>

        {/* 2-Column Split: Recent Bookings & Audit Stream */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Column 1: Live Bookings Feed */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <span className="text-base">📋</span>
                  <h3 className="text-sm font-bold text-slate-900">Recent Booking Activity</h3>
                </div>
                <Link
                  href="/bookings"
                  className="text-xs text-amber-600 hover:text-amber-700 font-bold transition"
                >
                  View All Bookings →
                </Link>
              </div>

              {recentBookings.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  {loading ? 'Loading bookings...' : 'No bookings found yet.'}
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {recentBookings.map((b: any) => (
                    <div key={b.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between text-xs">
                      <div className="space-y-0.5 max-w-[65%]">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-amber-700">
                            {b.humanReadableRef || `#${b.id.slice(0, 8)}`}
                          </span>
                          <span className="text-[10px] text-slate-600 font-medium uppercase px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">
                            {b.category || 'CAB'}
                          </span>
                        </div>
                        <p className="text-slate-800 truncate font-medium">
                          <span className="text-emerald-600">📍</span> {b.pickupAddress} ➔ {b.dropAddress}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          Customer: {b.customer?.user?.fullName || b.customer?.user?.phone || 'Guest'}
                        </p>
                      </div>

                      <div className="text-right space-y-1">
                        <span
                          className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full border ${getStatusBadge(
                            b.status
                          )}`}
                        >
                          {b.status}
                        </span>
                        <div className="font-bold text-slate-900">₹{b.totalFare?.toLocaleString('en-IN') || 0}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
              <span>Quick status breakdown:</span>
              <div className="flex items-center space-x-2">
                <span className="text-emerald-700 font-semibold">{stats.bookings.completed} Completed</span>
                <span>•</span>
                <span className="text-rose-700 font-semibold">{stats.bookings.cancelled} Cancelled</span>
              </div>
            </div>
          </div>

          {/* Column 2: Audit Stream */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <span className="text-base">📜</span>
                  <h3 className="text-sm font-bold text-slate-900">Latest System Actions</h3>
                </div>
                <Link
                  href="/audit-logs"
                  className="text-xs text-amber-600 hover:text-amber-700 font-bold transition"
                >
                  View Full Audit Trail →
                </Link>
              </div>

              {recentAuditLogs.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  {loading ? 'Loading audit trail...' : 'No audit records logged yet.'}
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {recentAuditLogs.map((log: any) => (
                    <div key={log.id} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between text-xs">
                      <div className="space-y-0.5 max-w-[70%]">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-slate-800">{log.action}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">
                          Target: {log.entityType} ({log.entityId ? `#${log.entityId.slice(0, 8)}` : 'System'})
                        </p>
                        <p className="text-[10px] text-slate-400">
                          By: {log.actor?.fullName || log.actor?.phone || 'System Automated'}
                        </p>
                      </div>

                      <div className="text-right text-[10px] text-slate-500 font-mono">
                        {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        <br />
                        {new Date(log.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-right">
              <Link
                href="/audit-logs"
                className="text-xs text-slate-500 hover:text-slate-800 transition"
              >
                Audits are cryptographically preserved & immutable
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
