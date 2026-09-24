'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminNavbar } from '@/components/AdminNavbar';
import { VehicleCategory } from '@kandy-cabs/shared';

export const dynamic = 'force-dynamic';

export default function AdminFleetsPage() {
  const [fleets, setFleets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingFleet, setEditingFleet] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchFleets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/fleets');
      if (res.ok) {
        const data = await res.json();
        setFleets(data.fleets || []);
      }
    } catch (err) {
      console.error('Failed to load fleet categories:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFleets();
  }, [fetchFleets]);

  const handleSaveFleet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFleet) return;

    setSaving(true);
    try {
      const res = await fetch('/api/admin/fleets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingFleet),
      });

      if (res.ok) {
        setEditingFleet(null);
        await fetchFleets();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save fleet configuration');
      }
    } catch (err) {
      console.error('Error saving fleet:', err);
      alert('Error saving fleet category');
    } finally {
      setSaving(false);
    }
  };

  const [search, setSearch] = useState('');

  const displayedFleets = React.useMemo(() => {
    if (!fleets || fleets.length === 0) return [];
    if (!search.trim()) return fleets;
    const q = search.toLowerCase().trim();
    return fleets.filter((f) => {
      const catMatch = f.category?.toLowerCase().includes(q);
      const nameMatch = f.name?.toLowerCase().includes(q);
      const descMatch = f.description?.toLowerCase().includes(q);
      return catMatch || nameMatch || descMatch;
    });
  }, [fleets, search]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <AdminNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>🚐</span> Fleet Vehicle Categories Management
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Configure vehicle classes, seat capacities, base rates across fuel types, and driver allowances
            </p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Quick search fleet categories..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
              />
              <span className="absolute left-2.5 top-2 text-xs text-slate-500">🔍</span>
            </div>
            <button
              onClick={() => fetchFleets()}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-1.5 text-slate-200 transition"
            >
              <span>🔄</span> Refresh
            </button>
          </div>
        </div>

        {/* Fleet Categories Grid */}
        {loading && fleets.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-sm">
            <div className="inline-block animate-spin text-2xl mb-2">🔄</div>
            <div>Loading fleet configuration...</div>
          </div>
        ) : displayedFleets.length === 0 ? (
          <div className="py-20 text-center text-slate-500 text-xs bg-slate-900/50 rounded-2xl border border-slate-800/80">
            No fleet categories match "{search}".
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedFleets.map((fleet) => (
              <div
                key={fleet.category}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition shadow-sm"
              >
                <div className="space-y-4">
                  {/* Category Header */}
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        {fleet.category}
                      </span>
                      <h3 className="text-lg font-bold text-white mt-1">{fleet.name}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{fleet.description}</p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        fleet.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                      }`}
                    >
                      {fleet.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* Vehicle Capacity Badges */}
                  <div className="flex gap-4 py-2 border-y border-slate-800 text-xs text-slate-300">
                    <div>👥 Seats: <span className="font-bold text-white">{fleet.seatCount}</span></div>
                    <div>🧳 Luggage: <span className="font-bold text-white">{fleet.luggageCount} bags</span></div>
                  </div>

                  {/* Fuel Rates Grid */}
                  <div>
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Base Rates per Km:
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className={`p-2 rounded-lg border ${fleet.cngEnabled !== false ? 'bg-slate-950 border-slate-800' : 'bg-slate-950/40 border-slate-900 opacity-60'}`}>
                        <div className="text-[10px] text-slate-400 font-bold flex items-center justify-center gap-1">
                          <span>CNG</span>
                          {fleet.cngEnabled === false && <span className="text-[8px] text-rose-400">OFF</span>}
                        </div>
                        <div className={`font-black mt-0.5 ${fleet.cngEnabled !== false ? 'text-emerald-400' : 'text-slate-500'}`}>
                          {fleet.cngEnabled !== false ? `₹${fleet.cngRate}/km` : 'Disabled'}
                        </div>
                      </div>
                      <div className={`p-2 rounded-lg border ${fleet.petrolEnabled !== false ? 'bg-slate-950 border-slate-800' : 'bg-slate-950/40 border-slate-900 opacity-60'}`}>
                        <div className="text-[10px] text-slate-400 font-bold flex items-center justify-center gap-1">
                          <span>PETROL</span>
                          {fleet.petrolEnabled === false && <span className="text-[8px] text-rose-400">OFF</span>}
                        </div>
                        <div className={`font-black mt-0.5 ${fleet.petrolEnabled !== false ? 'text-amber-400' : 'text-slate-500'}`}>
                          {fleet.petrolEnabled !== false ? `₹${fleet.petrolRate}/km` : 'Disabled'}
                        </div>
                      </div>
                      <div className={`p-2 rounded-lg border ${fleet.dieselEnabled !== false ? 'bg-slate-950 border-slate-800' : 'bg-slate-950/40 border-slate-900 opacity-60'}`}>
                        <div className="text-[10px] text-slate-400 font-bold flex items-center justify-center gap-1">
                          <span>DIESEL</span>
                          {fleet.dieselEnabled === false && <span className="text-[8px] text-rose-400">OFF</span>}
                        </div>
                        <div className={`font-black mt-0.5 ${fleet.dieselEnabled !== false ? 'text-blue-400' : 'text-slate-500'}`}>
                          {fleet.dieselEnabled !== false ? `₹${fleet.dieselRate}/km` : 'Disabled'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Allowances & Rules */}
                  <div className="space-y-1.5 text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Extra Km Rate:</span>
                      <span className="font-bold text-white">₹{fleet.extraKmRate}/km</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Driver Allowance:</span>
                      <span className="font-bold text-white">₹{fleet.driverAllowance}/day</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Night Surcharge:</span>
                      <span className="font-bold text-white">₹{fleet.nightCharge}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Min Base (Outstation):</span>
                      <span className="font-bold text-white">{fleet.minRoundTripKmPerDay} km/day</span>
                    </div>
                    <div className="pt-2 border-t border-slate-800/80 flex justify-between text-[11px]">
                      <span className="text-slate-400">Local 4 Hr / 40 KM:</span>
                      <span className="font-bold text-amber-400">₹{fleet.localPackage4hrBase ?? 1200}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Local 8 Hr / 80 KM:</span>
                      <span className="font-bold text-amber-400">₹{fleet.localPackage8hrBase ?? 2200}</span>
                    </div>
                  </div>
                </div>

                {/* Edit Button */}
                <div className="mt-5 pt-3 border-t border-slate-800">
                  <button
                    onClick={() => setEditingFleet({ ...fleet })}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold rounded-xl border border-slate-700 transition"
                  >
                    ✏️ Edit Category Rates & Specs
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Edit Fleet Modal */}
      {editingFleet && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>✏️</span> Edit Fleet Category: {editingFleet.category}
              </h3>
              <button
                onClick={() => setEditingFleet(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveFleet} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Display Name</label>
                  <input
                    type="text"
                    value={editingFleet.name}
                    onChange={(e) => setEditingFleet({ ...editingFleet, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Description</label>
                  <input
                    type="text"
                    value={editingFleet.description || ''}
                    onChange={(e) => setEditingFleet({ ...editingFleet, description: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Seat Count</label>
                  <input
                    type="number"
                    value={editingFleet.seatCount}
                    onChange={(e) => setEditingFleet({ ...editingFleet, seatCount: parseInt(e.target.value) || 4 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Luggage Bags</label>
                  <input
                    type="number"
                    value={editingFleet.luggageCount}
                    onChange={(e) => setEditingFleet({ ...editingFleet, luggageCount: parseInt(e.target.value) || 2 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                    required
                  />
                </div>
              </div>

              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div className="font-bold text-amber-400 uppercase text-xs">Per-Km Rates by Fuel (₹/km) & Enablement</div>
                <div className="grid grid-cols-3 gap-3">
                  {/* CNG */}
                  <div className={`p-2.5 rounded-xl border ${editingFleet.cngEnabled !== false ? 'bg-slate-900 border-slate-700' : 'bg-slate-900/40 border-slate-800 opacity-60'}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-slate-300 font-bold text-[11px]">CNG Rate</label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingFleet.cngEnabled !== false}
                          onChange={(e) => setEditingFleet({ ...editingFleet, cngEnabled: e.target.checked })}
                          className="w-3.5 h-3.5 accent-emerald-500 rounded"
                        />
                        <span className="text-[10px] text-emerald-400 font-semibold">Active</span>
                      </label>
                    </div>
                    <input
                      type="number"
                      step="0.5"
                      disabled={editingFleet.cngEnabled === false}
                      value={editingFleet.cngRate}
                      onChange={(e) => setEditingFleet({ ...editingFleet, cngRate: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-bold disabled:opacity-50"
                      required
                    />
                  </div>

                  {/* Petrol */}
                  <div className={`p-2.5 rounded-xl border ${editingFleet.petrolEnabled !== false ? 'bg-slate-900 border-slate-700' : 'bg-slate-900/40 border-slate-800 opacity-60'}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-slate-300 font-bold text-[11px]">Petrol Rate</label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingFleet.petrolEnabled !== false}
                          onChange={(e) => setEditingFleet({ ...editingFleet, petrolEnabled: e.target.checked })}
                          className="w-3.5 h-3.5 accent-amber-500 rounded"
                        />
                        <span className="text-[10px] text-amber-400 font-semibold">Active</span>
                      </label>
                    </div>
                    <input
                      type="number"
                      step="0.5"
                      disabled={editingFleet.petrolEnabled === false}
                      value={editingFleet.petrolRate}
                      onChange={(e) => setEditingFleet({ ...editingFleet, petrolRate: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-bold disabled:opacity-50"
                      required
                    />
                  </div>

                  {/* Diesel */}
                  <div className={`p-2.5 rounded-xl border ${editingFleet.dieselEnabled !== false ? 'bg-slate-900 border-slate-700' : 'bg-slate-900/40 border-slate-800 opacity-60'}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-slate-300 font-bold text-[11px]">Diesel Rate</label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingFleet.dieselEnabled !== false}
                          onChange={(e) => setEditingFleet({ ...editingFleet, dieselEnabled: e.target.checked })}
                          className="w-3.5 h-3.5 accent-blue-500 rounded"
                        />
                        <span className="text-[10px] text-blue-400 font-semibold">Active</span>
                      </label>
                    </div>
                    <input
                      type="number"
                      step="0.5"
                      disabled={editingFleet.dieselEnabled === false}
                      value={editingFleet.dieselRate}
                      onChange={(e) => setEditingFleet({ ...editingFleet, dieselRate: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-bold disabled:opacity-50"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Local Packages Base Rates */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="font-bold text-amber-400 uppercase flex items-center gap-1.5">
                  <span>🏷️</span> Local Hourly Packages (Base Fare)
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">4 Hours / 40 KM Base (₹)</label>
                    <input
                      type="number"
                      value={editingFleet.localPackage4hrBase ?? 1200}
                      onChange={(e) => setEditingFleet({ ...editingFleet, localPackage4hrBase: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-bold"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">Extra KM charged at ₹{editingFleet.extraKmRate}/km after 40 km</span>
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">8 Hours / 80 KM Base (₹)</label>
                    <input
                      type="number"
                      value={editingFleet.localPackage8hrBase ?? 2200}
                      onChange={(e) => setEditingFleet({ ...editingFleet, localPackage8hrBase: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-bold"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">Extra KM charged at ₹{editingFleet.extraKmRate}/km after 80 km</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Extra Km Rate (₹)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={editingFleet.extraKmRate}
                    onChange={(e) => setEditingFleet({ ...editingFleet, extraKmRate: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Driver Allowance (₹)</label>
                  <input
                    type="number"
                    value={editingFleet.driverAllowance}
                    onChange={(e) => setEditingFleet({ ...editingFleet, driverAllowance: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Night Charge (₹)</label>
                  <input
                    type="number"
                    value={editingFleet.nightCharge}
                    onChange={(e) => setEditingFleet({ ...editingFleet, nightCharge: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Min Base Km / Day</label>
                  <input
                    type="number"
                    value={editingFleet.minRoundTripKmPerDay}
                    onChange={(e) => setEditingFleet({ ...editingFleet, minRoundTripKmPerDay: parseFloat(e.target.value) || 250 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={editingFleet.isActive}
                  onChange={(e) => setEditingFleet({ ...editingFleet, isActive: e.target.checked })}
                  className="w-4 h-4 accent-amber-500 rounded"
                />
                <label htmlFor="isActive" className="text-slate-300 font-semibold cursor-pointer">
                  Category Active for Public Bookings
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setEditingFleet(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg shadow"
                >
                  {saving ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
