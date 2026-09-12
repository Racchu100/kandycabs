import React from 'react';
import { prisma } from '@/lib/prisma';

export const revalidate = 0;

export default async function AdminAuditLogsPage() {
  let logs: any[] = [];
  try {
    logs = await prisma.auditLog.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
    });
  } catch (err) {
    console.warn('Prisma audit logs fetch fallback:', err);
  }

  return (
    <div className="space-y-3.5 sm:space-y-6">
      <div>
        <h1 className="text-lg sm:text-2xl font-black text-kandy-ink">System Audit Trail Logs</h1>
        <p className="text-[11px] sm:text-xs text-kandy-muted mt-0.5">Immutable trail of all admin operations, dispatches, price changes & contact releases</p>
      </div>

      <div className="bg-white rounded-card border border-kandy-border shadow-card overflow-x-auto">
        <table className="w-full text-left text-xs text-kandy-ink border-collapse">
          <thead>
            <tr className="bg-kandy-ink text-white uppercase text-[9px] sm:text-[10px] tracking-wider font-bold">
              <th className="p-2 sm:p-3.5 whitespace-nowrap">Timestamp</th>
              <th className="p-2 sm:p-3.5 whitespace-nowrap">Action</th>
              <th className="p-2 sm:p-3.5 whitespace-nowrap">Entity Type</th>
              <th className="p-2 sm:p-3.5 whitespace-nowrap">Entity ID</th>
              <th className="p-2 sm:p-3.5 whitespace-nowrap">Payload Snapshot</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-medium text-[11px] sm:text-xs">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-4 sm:p-6 text-center text-xs sm:text-sm text-kandy-muted">
                  No audit logs recorded yet. (Admin actions will log automatically)
                </td>
              </tr>
            ) : (
              logs.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="p-2 sm:p-3.5 text-kandy-muted font-mono whitespace-nowrap">{new Date(l.createdAt).toLocaleString('en-IN')}</td>
                  <td className="p-2 sm:p-3.5 font-bold text-kandy-orange whitespace-nowrap">{l.action}</td>
                  <td className="p-2 sm:p-3.5 uppercase whitespace-nowrap">{l.entityType}</td>
                  <td className="p-2 sm:p-3.5 font-mono whitespace-nowrap">{l.entityId}</td>
                  <td className="p-2 sm:p-3.5 font-mono text-[10px] text-gray-600 max-w-xs truncate">{l.afterJson}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
