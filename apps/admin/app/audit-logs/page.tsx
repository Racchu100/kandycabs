'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminNavbar } from '@/components/AdminNavbar';

export const dynamic = 'force-dynamic';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalCount: 0, totalPages: 1, limit: 30, page: 1 });

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: '30',
        action: actionFilter,
        ...(search ? { search } : {}),
      });

      const res = await fetch(`/api/admin/audit-logs?${queryParams}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        if (data.pagination) setPagination(data.pagination);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, search]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes('APPROVED') || action.includes('VERIFIED')) {
      return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    }
    if (action.includes('REJECTED') || action.includes('CANCELLED')) {
      return 'bg-rose-100 text-rose-800 border-rose-300';
    }
    if (action.includes('OVERRIDE')) {
      return 'bg-amber-100 text-amber-800 border-amber-300';
    }
    if (action.includes('DISPATCH') || action.includes('ACCEPTED')) {
      return 'bg-blue-100 text-blue-800 border-blue-300';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <AdminNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
              <span>📜</span> System & Operational Audit Logs
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Immutable, chronological record of all administrative, dispatch, KYC, payment, and security actions
            </p>
          </div>
          <button
            onClick={() => fetchLogs()}
            className="px-3.5 py-2 bg-white hover:bg-slate-100 text-xs font-semibold rounded-lg border border-slate-200 flex items-center gap-1.5 text-slate-700 transition shadow-xs"
          >
            <span>🔄</span> Refresh
          </button>
        </div>

        {/* Filters & Search */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row gap-4 justify-between items-center shadow-xs">
          <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
            {[
              { id: 'ALL', label: 'All Events' },
              { id: 'PAYMENT_VERIFIED_WEBHOOK', label: '💳 Payments' },
              { id: 'DRIVER_KYC_APPROVED', label: '✓ KYC Approved' },
              { id: 'DRIVER_KYC_REJECTED', label: '✕ KYC Rejected' },
              { id: 'OTP_OVERRIDE_APPROVED', label: '🔐 OTP Overrides' },
              { id: 'BOOKING_DISPATCHED', label: '📡 Dispatches' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActionFilter(tab.id);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  actionFilter === tab.id
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearchSubmit} className="w-full md:w-80 flex gap-2">
            <input
              type="text"
              placeholder="Search by action, reason, user, or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
            />
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition shadow-xs"
            >
              Search
            </button>
          </form>
        </div>

        {/* Audit Logs Table / Feed */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          {loading ? (
            <div className="py-20 text-center text-slate-400 text-sm">
              <div className="inline-block animate-spin text-2xl mb-2">🔄</div>
              <div>Loading audit trail...</div>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              <div className="text-3xl mb-2">📜</div>
              <div>No audit logs found matching your query.</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Actor</th>
                    <th className="py-3 px-4">Entity</th>
                    <th className="py-3 px-4">Details & Rationale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono font-medium text-slate-800">
                          {new Date(log.createdAt).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500">
                          {new Date(log.createdAt).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${getActionBadgeColor(
                            log.action
                          )}`}
                        >
                          {log.action}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{log.actorName}</div>
                        {log.actorPhone && <div className="text-[10px] text-slate-500">{log.actorPhone}</div>}
                        <div className="text-[9px] text-amber-800 font-bold uppercase">{log.actorRole}</div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="text-slate-800 font-medium">{log.entityType}</div>
                        <div className="text-[10px] font-mono text-slate-500 truncate max-w-[140px]" title={log.entityId}>
                          {log.entityId}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-slate-700 text-xs leading-relaxed max-w-xl">
                          {log.reason || 'No additional details logged.'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs text-slate-600">
            <div>
              Showing {logs.length} of {pagination.totalCount} log records
            </div>
            <div className="flex gap-2 items-center">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-50 text-slate-700 rounded transition shadow-2xs font-medium"
              >
                Previous
              </button>
              <span className="px-2 py-1 font-semibold text-slate-700">
                Page {page} of {pagination.totalPages}
              </span>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-50 text-slate-700 rounded transition shadow-2xs font-medium"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
