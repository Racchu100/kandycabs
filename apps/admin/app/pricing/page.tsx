'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminNavbar } from '@/components/AdminNavbar';
import { VehicleCategory, TripType, FuelType } from '@kandy-cabs/shared';

export const dynamic = 'force-dynamic';

export default function AdminPricingPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [tripTypeFilter, setTripTypeFilter] = useState('ALL');

  const [editingRule, setEditingRule] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (categoryFilter !== 'ALL') queryParams.set('category', categoryFilter);
      if (tripTypeFilter !== 'ALL') queryParams.set('tripType', tripTypeFilter);

      const res = await fetch(`/api/admin/pricing?${queryParams}`);
      if (res.ok) {
        const data = await res.json();
        setRules(data.rules || []);
      }
    } catch (err) {
      console.error('Failed to load pricing rules:', err);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, tripTypeFilter]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule) return;

    setSaving(true);
    try {
      const res = await fetch('/api/admin/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingRule),
      });

      if (res.ok) {
        setEditingRule(null);
        await fetchRules();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save pricing rule');
      }
    } catch (err) {
      console.error('Error saving pricing rule:', err);
      alert('Error saving rule');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <AdminNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
              <span>🏷️</span> Dynamic Fare Rules & Surcharges
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Live pricing matrix per Category × Trip Type × Fuel Type. Updates immediately take effect on customer booking quotes.
            </p>
          </div>
          <button
            onClick={() => fetchRules()}
            className="px-3.5 py-2 bg-white hover:bg-slate-100 text-xs font-semibold rounded-lg border border-slate-200 flex items-center gap-1.5 text-slate-700 transition shadow-xs"
          >
            <span>🔄</span> Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap gap-4 items-center shadow-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              {Object.values(VehicleCategory).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Trip Type</label>
            <select
              value={tripTypeFilter}
              onChange={(e) => setTripTypeFilter(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            >
              <option value="ALL">All Trip Types</option>
              {Object.values(TripType).map((tt) => (
                <option key={tt} value={tt}>
                  {tt}
                </option>
              ))}
            </select>
          </div>

          <div className="ml-auto text-xs text-slate-500">
            Found <span className="font-bold text-slate-900">{rules.length}</span> active fare rules
          </div>
        </div>

        {/* Rules Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          {loading ? (
            <div className="py-20 text-center text-slate-400 text-sm">
              <div className="inline-block animate-spin text-2xl mb-2">🔄</div>
              <div>Loading pricing matrix...</div>
            </div>
          ) : rules.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              No pricing rules found for selected filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Category × Trip Type</th>
                    <th className="py-3 px-4">Fuel Type</th>
                    <th className="py-3 px-4">Base Rate / KM</th>
                    <th className="py-3 px-4">Extra KM Rate</th>
                    <th className="py-3 px-4">Driver Allowance</th>
                    <th className="py-3 px-4">Night Surcharge</th>
                    <th className="py-3 px-4">GST Rate</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rules.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{r.category}</div>
                        <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded text-[10px] font-semibold">
                          {r.tripType}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-700">{r.fuelType}</span>
                      </td>

                      <td className="py-3 px-4 font-bold text-emerald-700">
                        ₹{r.baseRatePerKm}/km
                      </td>

                      <td className="py-3 px-4 font-semibold text-slate-800">
                        ₹{r.extraKmRate}/km
                      </td>

                      <td className="py-3 px-4 text-slate-800 font-medium">
                        ₹{r.driverAllowance}/day
                      </td>

                      <td className="py-3 px-4 text-slate-800">
                        <div className="font-medium">₹{r.nightCharge}</div>
                        <div className="text-[10px] text-slate-500">
                          {r.nightWindowStartHour}:00 - {r.nightWindowEndHour}:00
                        </div>
                      </td>

                      <td className="py-3 px-4 font-semibold text-blue-700">
                        {r.gstRatePercent}%
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            r.isActive ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-rose-100 text-rose-800 border-rose-300'
                          }`}
                        >
                          {r.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setEditingRule({ ...r })}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg text-xs font-bold transition shadow-2xs"
                        >
                          ✏️ Edit Rule
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Edit Rule Modal */}
      {editingRule && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>✏️</span> Edit Rule: {editingRule.category} • {editingRule.tripType} • {editingRule.fuelType}
              </h3>
              <button
                onClick={() => setEditingRule(null)}
                className="text-slate-400 hover:text-slate-700 p-1 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Base Rate / KM (₹)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={editingRule.baseRatePerKm}
                    onChange={(e) => setEditingRule({ ...editingRule, baseRatePerKm: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Extra KM Rate (₹)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={editingRule.extraKmRate}
                    onChange={(e) => setEditingRule({ ...editingRule, extraKmRate: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Driver Allowance (₹/day)</label>
                  <input
                    type="number"
                    value={editingRule.driverAllowance}
                    onChange={(e) => setEditingRule({ ...editingRule, driverAllowance: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Night Charge (₹)</label>
                  <input
                    type="number"
                    value={editingRule.nightCharge}
                    onChange={(e) => setEditingRule({ ...editingRule, nightCharge: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">GST Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingRule.gstRatePercent}
                    onChange={(e) => setEditingRule({ ...editingRule, gstRatePercent: parseFloat(e.target.value) || 5.0 })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Night Start (Hr)</label>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={editingRule.nightWindowStartHour}
                    onChange={(e) => setEditingRule({ ...editingRule, nightWindowStartHour: parseInt(e.target.value) || 22 })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Night End (Hr)</label>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={editingRule.nightWindowEndHour}
                    onChange={(e) => setEditingRule({ ...editingRule, nightWindowEndHour: parseInt(e.target.value) || 6 })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="ruleActive"
                  checked={editingRule.isActive}
                  onChange={(e) => setEditingRule({ ...editingRule, isActive: e.target.checked })}
                  className="w-4 h-4 accent-amber-500 rounded"
                />
                <label htmlFor="ruleActive" className="text-slate-700 font-semibold cursor-pointer">
                  Rule Active
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setEditingRule(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg shadow-xs"
                >
                  {saving ? 'Saving...' : 'Save Pricing Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
