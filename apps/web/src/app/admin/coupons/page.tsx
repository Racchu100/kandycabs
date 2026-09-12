'use client';

import React, { useState } from 'react';
import { Plus } from 'lucide-react';

export default function AdminCouponsPage() {
  const [coupons] = useState([
    { code: 'KANDY100', type: 'FLAT', value: 100, usageLimit: 500, usedCount: 42, isActive: true },
    { code: 'FIRST250', type: 'FLAT', value: 250, usageLimit: 200, usedCount: 18, isActive: true },
    { code: 'FESTIVE10', type: 'PERCENTAGE', value: 10, usageLimit: 300, usedCount: 5, isActive: true },
  ]);

  return (
    <div className="space-y-3.5 sm:space-y-6">
      <div className="flex flex-wrap sm:flex-nowrap justify-between items-center gap-3 sm:gap-4">
        <div>
          <h1 className="text-lg sm:text-2xl font-black text-kandy-ink">Coupons & Offer Codes</h1>
          <p className="text-[11px] sm:text-xs text-kandy-muted">Manage FLAT and PERCENTAGE promo codes for booking discounts</p>
        </div>
        <button
          onClick={() => alert('Create coupon code modal')}
          className="px-3 py-1.5 sm:px-4 sm:py-2.5 bg-kandy-orange hover:bg-kandy-orangeHover text-white font-extrabold text-[10px] sm:text-xs uppercase tracking-wider rounded shadow flex items-center gap-1 sm:gap-1.5 shrink-0"
        >
          <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Create Promo Coupon
        </button>
      </div>

      <div className="bg-white rounded-card border border-kandy-border shadow-card overflow-x-auto">
        <table className="w-full text-left text-xs text-kandy-ink border-collapse">
          <thead>
            <tr className="bg-kandy-ink text-white uppercase text-[9px] sm:text-[10px] tracking-wider font-bold">
              <th className="p-2 sm:p-3.5 whitespace-nowrap">Coupon Code</th>
              <th className="p-2 sm:p-3.5 whitespace-nowrap">Type</th>
              <th className="p-2 sm:p-3.5 whitespace-nowrap">Discount Value</th>
              <th className="p-2 sm:p-3.5 whitespace-nowrap">Usage Count</th>
              <th className="p-2 sm:p-3.5 whitespace-nowrap">Status</th>
              <th className="p-2 sm:p-3.5 text-right whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-medium text-[11px] sm:text-xs">
            {coupons.map((c, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="p-2 sm:p-3.5 font-black text-kandy-orange whitespace-nowrap">{c.code}</td>
                <td className="p-2 sm:p-3.5 whitespace-nowrap">{c.type}</td>
                <td className="p-2 sm:p-3.5 font-bold whitespace-nowrap">
                  {c.type === 'FLAT' ? `₹${c.value} OFF` : `${c.value}% OFF`}
                </td>
                <td className="p-2 sm:p-3.5 whitespace-nowrap">{c.usedCount} / {c.usageLimit}</td>
                <td className="p-2 sm:p-3.5 whitespace-nowrap">
                  <span className="bg-emerald-100 text-emerald-700 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                    ACTIVE
                  </span>
                </td>
                <td className="p-2 sm:p-3.5 text-right whitespace-nowrap">
                  <button
                    onClick={() => alert(`Deactivate coupon ${c.code}`)}
                    className="px-2 py-0.5 sm:px-3 sm:py-1 bg-red-50 text-red-600 font-bold text-[9px] sm:text-[10px] uppercase rounded border border-red-200"
                  >
                    Deactivate
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
