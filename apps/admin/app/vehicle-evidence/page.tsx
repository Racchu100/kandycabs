'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminNavbar } from '@/components/AdminNavbar';
import { DriverVerificationStatus } from '@kandy-cabs/shared';

export const dynamic = 'force-dynamic';

export default function AdminVehicleEvidencePage() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [counts, setCounts] = useState({ all: 0, pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedDriver, setSelectedDriver] = useState<any | null>(null);

  // Review modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Add Driver modal state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addDriverLoading, setAddDriverLoading] = useState(false);
  const [addDriverError, setAddDriverError] = useState('');
  const [newDriver, setNewDriver] = useState({
    fullName: '',
    phone: '',
    licenseNumber: '',
    category: 'SEDAN',
    plateNumber: '',
    fuelType: 'DIESEL',
  });

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddDriverError('');
    setAddDriverLoading(true);
    try {
      const res = await fetch('/api/admin/vehicle-evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDriver),
      });
      const data = await res.json();
      if (res.ok) {
        setAddModalOpen(false);
        setNewDriver({
          fullName: '',
          phone: '',
          licenseNumber: '',
          category: 'SEDAN',
          plateNumber: '',
          fuelType: 'DIESEL',
        });
        await fetchDrivers();
      } else {
        setAddDriverError(data.error || 'Failed to add driver');
      }
    } catch (err: any) {
      setAddDriverError(err.message || 'Failed to add driver');
    } finally {
      setAddDriverLoading(false);
    }
  };

  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/vehicle-evidence?status=${statusFilter}`);
      if (res.ok) {
        const data = await res.json();
        setDrivers(data.drivers || []);
        if (data.counts) setCounts(data.counts);
        if (data.drivers?.length > 0 && !selectedDriver) {
          setSelectedDriver(data.drivers[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load vehicle evidence:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  const handleReview = async (driverId: string, status: DriverVerificationStatus, notes?: string) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/vehicle-evidence/${driverId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, adminNotes: notes }),
      });

      if (res.ok) {
        setRejectModalOpen(false);
        setRejectNotes('');
        await fetchDrivers();
        if (selectedDriver?.driverId === driverId) {
          setSelectedDriver((prev: any) => ({
            ...prev,
            verificationStatus: status,
            adminNotes: notes,
          }));
        }
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update review status');
      }
    } catch (err) {
      console.error('Error submitting review:', err);
      alert('Error updating review status');
    } finally {
      setSubmitting(false);
    }
  };

  const [search, setSearch] = useState('');

  // Instant client-side filtering for 0ms response
  const displayedDrivers = React.useMemo(() => {
    if (!drivers || drivers.length === 0) return [];
    return drivers.filter((d) => {
      if (statusFilter !== 'ALL' && d.verificationStatus !== statusFilter) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const nameMatch = d.fullName?.toLowerCase().includes(q);
        const phoneMatch = d.phone?.includes(q);
        const licenseMatch = d.licenseNumber?.toLowerCase().includes(q);
        const plateMatch = d.vehicle?.plateNumber?.toLowerCase().includes(q);
        const catMatch = d.vehicle?.category?.toLowerCase().includes(q);
        return nameMatch || phoneMatch || licenseMatch || plateMatch || catMatch;
      }
      return true;
    });
  }, [drivers, statusFilter, search]);

  // Keep selected driver synced with filtered list
  useEffect(() => {
    if (displayedDrivers.length > 0) {
      const exists = displayedDrivers.some((d) => d.driverId === selectedDriver?.driverId);
      if (!exists) {
        setSelectedDriver(displayedDrivers[0]);
      }
    }
  }, [displayedDrivers, selectedDriver]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <AdminNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>🛡️</span> Vehicle & Driver KYC Evidence Review
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Verify driving licenses, RC books, insurance papers and 5-angle vehicle photos
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAddModalOpen(true)}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition"
            >
              <span>+</span> Add Driver
            </button>
            <button
              onClick={() => fetchDrivers()}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-1.5 text-slate-200 transition"
            >
              <span>🔄</span> Refresh
            </button>
          </div>
        </div>

        {/* Status Filter Tabs & Search Bar */}
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'ALL', label: 'All Drivers', count: counts.all },
              { id: 'PENDING', label: 'Pending Review', count: counts.pending, badgeColor: 'bg-amber-500/20 text-amber-300' },
              { id: 'APPROVED', label: 'Approved', count: counts.approved, badgeColor: 'bg-emerald-500/20 text-emerald-300' },
              { id: 'REJECTED', label: 'Rejected', count: counts.rejected, badgeColor: 'bg-rose-500/20 text-rose-300' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition active:scale-95 ${
                  statusFilter === tab.id
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    statusFilter === tab.id ? 'bg-slate-950/30 text-slate-950' : tab.badgeColor || 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="relative md:w-72">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search driver, phone, vehicle plate, license..."
              className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
            />
            <span className="absolute left-2.5 top-2.5 text-xs text-slate-500">🔍</span>
          </div>
        </div>

        {/* Master-Detail Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Drivers List */}
          <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col h-[750px] relative">
            {loading && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800 overflow-hidden z-10">
                <div className="h-full bg-amber-500 animate-pulse w-full" />
              </div>
            )}
            <div className="p-3 bg-slate-950 border-b border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center">
              <span>Registered Drivers ({displayedDrivers.length})</span>
            </div>

            <div className={`flex-1 overflow-y-auto divide-y divide-slate-800 transition-opacity ${loading && drivers.length > 0 ? 'opacity-80' : 'opacity-100'}`}>
              {loading && drivers.length === 0 ? (
                <div className="py-20 text-center text-slate-400 text-sm">
                  <div className="inline-block animate-spin text-2xl mb-2">🔄</div>
                  <div>Loading drivers...</div>
                </div>
              ) : displayedDrivers.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-xs">
                  No drivers match the selected filter or search.
                </div>
              ) : (
                displayedDrivers.map((d) => {
                  const isSelected = selectedDriver?.driverId === d.driverId;
                  return (
                    <div
                      key={d.driverId}
                      onClick={() => setSelectedDriver(d)}
                      className={`p-4 cursor-pointer transition ${
                        isSelected ? 'bg-slate-800 border-l-4 border-amber-500' : 'hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex-shrink-0 overflow-hidden flex items-center justify-center">
                          {d.profilePhotoUrl ? (
                            <img src={d.profilePhotoUrl} alt={d.fullName} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-lg">👨🏽‍✈️</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-1">
                            <div className="font-bold text-white text-sm truncate">{d.fullName}</div>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border flex-shrink-0 ${
                                d.verificationStatus === 'APPROVED'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : d.verificationStatus === 'REJECTED'
                                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              }`}
                            >
                              {d.verificationStatus}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">{d.phone}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            DL: <span className="font-mono text-slate-200">{d.licenseNumber}</span>
                          </div>
                          {d.vehicle && (
                            <div className="text-[10px] text-amber-300 mt-1 font-medium">
                              🚗 {d.vehicle.category} • {d.vehicle.plateNumber || 'No Plate'}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Evidence Inspector & Action Panel */}
          <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col h-[750px] overflow-y-auto">
            {selectedDriver ? (
              <div className="space-y-6">
                {/* Driver Info Header & Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-800 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-slate-950 border-2 border-amber-500/40 flex-shrink-0 overflow-hidden flex items-center justify-center shadow-lg">
                      {selectedDriver.profilePhotoUrl ? (
                        <img
                          src={selectedDriver.profilePhotoUrl}
                          alt={selectedDriver.fullName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl">👨🏽‍✈️</span>
                      )}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        {selectedDriver.fullName}
                      </h2>
                      <div className="text-xs text-slate-400 mt-1 flex flex-wrap gap-4">
                        <span>📞 {selectedDriver.phone}</span>
                        <span>🆔 DL: {selectedDriver.licenseNumber}</span>
                        <span>📅 Registered: {new Date(selectedDriver.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      disabled={submitting || selectedDriver.verificationStatus === 'APPROVED'}
                      onClick={() => handleReview(selectedDriver.driverId, DriverVerificationStatus.APPROVED)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5"
                    >
                      <span>✓</span> Approve Driver
                    </button>
                    <button
                      disabled={submitting || selectedDriver.verificationStatus === 'REJECTED'}
                      onClick={() => setRejectModalOpen(true)}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5"
                    >
                      <span>✕</span> Reject Driver
                    </button>
                  </div>
                </div>

                {/* Status & Feedback alert */}
                {selectedDriver.adminNotes && (
                  <div className="p-3 bg-rose-950/40 border border-rose-500/30 rounded-xl text-xs text-rose-300">
                    <span className="font-bold">Admin Feedback:</span> {selectedDriver.adminNotes}
                  </div>
                )}

                {/* KYC Documents Review (Profile Photo, License, RC, Insurance) */}
                <div>
                  <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-3">
                    1. Official KYC & Profile Documents
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Driver Profile Photo */}
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col items-center">
                      <div className="text-xs font-bold text-slate-300 mb-2">Driver Profile Photo</div>
                      {selectedDriver.profilePhotoUrl ? (
                        <a href={selectedDriver.profilePhotoUrl} target="_blank" rel="noreferrer" className="w-full flex flex-col items-center">
                          <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-amber-500 shadow-md my-2">
                            <img
                              src={selectedDriver.profilePhotoUrl}
                              alt="Driver Profile Photo"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <span className="text-[10px] text-amber-400 font-semibold mt-1">🔍 View Full Size</span>
                        </a>
                      ) : (
                        <div className="w-full h-36 flex items-center justify-center bg-slate-900 rounded-lg text-slate-500 text-xs">
                          No Photo
                        </div>
                      )}
                    </div>

                    {/* License */}
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col items-center">
                      <div className="text-xs font-bold text-slate-300 mb-2">Driving License</div>
                      {selectedDriver.licenseDocUrl ? (
                        <a href={selectedDriver.licenseDocUrl} target="_blank" rel="noreferrer" className="w-full">
                          <img
                            src={selectedDriver.licenseDocUrl}
                            alt="License"
                            className="w-full h-36 object-contain bg-black rounded-lg border border-slate-800"
                          />
                        </a>
                      ) : (
                        <div className="w-full h-36 flex items-center justify-center bg-slate-900 rounded-lg text-slate-500 text-xs">
                          No Document
                        </div>
                      )}
                    </div>

                    {/* RC Book */}
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col items-center">
                      <div className="text-xs font-bold text-slate-300 mb-2">RC Certificate</div>
                      {selectedDriver.rcDocUrl ? (
                        <a href={selectedDriver.rcDocUrl} target="_blank" rel="noreferrer" className="w-full">
                          <img
                            src={selectedDriver.rcDocUrl}
                            alt="RC Book"
                            className="w-full h-36 object-contain bg-black rounded-lg border border-slate-800"
                          />
                        </a>
                      ) : (
                        <div className="w-full h-36 flex items-center justify-center bg-slate-900 rounded-lg text-slate-500 text-xs">
                          No Document
                        </div>
                      )}
                    </div>

                    {/* Insurance */}
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col items-center">
                      <div className="text-xs font-bold text-slate-300 mb-2">Vehicle Insurance</div>
                      {selectedDriver.insuranceDocUrl ? (
                        <a href={selectedDriver.insuranceDocUrl} target="_blank" rel="noreferrer" className="w-full">
                          <img
                            src={selectedDriver.insuranceDocUrl}
                            alt="Insurance"
                            className="w-full h-36 object-contain bg-black rounded-lg border border-slate-800"
                          />
                        </a>
                      ) : (
                        <div className="w-full h-36 flex items-center justify-center bg-slate-900 rounded-lg text-slate-500 text-xs">
                          No Document
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 5 Vehicle Angle Photos */}
                <div>
                  <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-3">
                    2. Vehicle Inspection Photos (5 Angles)
                  </h3>
                  {selectedDriver.vehiclePhotos?.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {['Front', 'Rear', 'Left Side', 'Right Side', 'Interior'].map((angle, idx) => {
                        const photoUrl = selectedDriver.vehiclePhotos[idx];
                        return (
                          <div key={angle} className="bg-slate-950 border border-slate-800 rounded-xl p-2 text-center">
                            <div className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase">{angle}</div>
                            {photoUrl ? (
                              <a href={photoUrl} target="_blank" rel="noreferrer">
                                <img
                                  src={photoUrl}
                                  alt={angle}
                                  className="w-full h-24 object-cover bg-black rounded-lg border border-slate-800"
                                />
                              </a>
                            ) : (
                              <div className="w-full h-24 flex items-center justify-center bg-slate-900 rounded-lg text-[10px] text-slate-500">
                                Pending
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-slate-950 border border-slate-800 rounded-xl text-slate-500 text-xs">
                      No vehicle angle photos uploaded yet by driver.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                <div className="text-4xl mb-2">🚗</div>
                <div>Select a driver from the left list to review KYC evidence.</div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Reject Reason Modal */}
      {rejectModalOpen && selectedDriver && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>✕</span> Reject Driver KYC
            </h3>
            <p className="text-xs text-slate-400">
              Provide specific feedback explaining why the documents or vehicle photos were rejected. The driver will see this feedback in their mobile app to fix and re-upload.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Rejection Reason / Notes:</label>
              <textarea
                rows={4}
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                placeholder="e.g. RC book photo is blurry; Driving License has expired. Please re-upload clear copies."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                disabled={submitting}
                onClick={() => {
                  setRejectModalOpen(false);
                  setRejectNotes('');
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-semibold rounded-lg"
              >
                Cancel
              </button>
              <button
                disabled={submitting || !rejectNotes.trim()}
                onClick={() =>
                  handleReview(
                    selectedDriver.driverId,
                    DriverVerificationStatus.REJECTED,
                    rejectNotes.trim()
                  )
                }
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow"
              >
                {submitting ? 'Submitting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Driver Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>➕</span> Register New Driver & Vehicle
              </h3>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {addDriverError && (
              <div className="p-3 bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs rounded-lg">
                ⚠️ {addDriverError}
              </div>
            )}

            <form onSubmit={handleAddDriver} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Driver Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newDriver.fullName}
                    onChange={(e) => setNewDriver({ ...newDriver, fullName: e.target.value })}
                    placeholder="e.g. Suresh Gowda"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Mobile Number (10 digits) *</label>
                  <div className="flex">
                    <span className="bg-slate-800 text-slate-400 px-3 py-2.5 rounded-l-lg border border-r-0 border-slate-700 font-semibold">
                      +91
                    </span>
                    <input
                      type="tel"
                      maxLength={10}
                      required
                      value={newDriver.phone}
                      onChange={(e) => setNewDriver({ ...newDriver, phone: e.target.value.replace(/\D/g, '') })}
                      placeholder="9876543210"
                      className="w-full bg-slate-950 border border-slate-700 rounded-r-lg p-2.5 text-white font-bold placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Driving License Number *</label>
                  <input
                    type="text"
                    required
                    value={newDriver.licenseNumber}
                    onChange={(e) => setNewDriver({ ...newDriver, licenseNumber: e.target.value })}
                    placeholder="e.g. KA01-20220005432"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none uppercase"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Vehicle Plate / Reg Number *</label>
                  <input
                    type="text"
                    required
                    value={newDriver.plateNumber}
                    onChange={(e) => setNewDriver({ ...newDriver, plateNumber: e.target.value })}
                    placeholder="e.g. KA 01 MJ 5678"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Vehicle Category *</label>
                  <select
                    value={newDriver.category}
                    onChange={(e) => setNewDriver({ ...newDriver, category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:border-amber-500 focus:outline-none"
                  >
                    <option value="HATCHBACK">Hatchback (WagonR, Tiago)</option>
                    <option value="SEDAN">Sedan (Dzire, Etios)</option>
                    <option value="SUV">SUV 6+1 (Ertiga, Carens)</option>
                    <option value="SUV_PREMIUM">SUV Premium 7+1 (Innova Crysta)</option>
                    <option value="TEMPO_TRAVELER">Tempo Traveller 12+1 (Force)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Fuel Type *</label>
                  <select
                    value={newDriver.fuelType}
                    onChange={(e) => setNewDriver({ ...newDriver, fuelType: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:border-amber-500 focus:outline-none"
                  >
                    <option value="DIESEL">Diesel</option>
                    <option value="PETROL">Petrol</option>
                    <option value="CNG">CNG</option>
                  </select>
                </div>
              </div>

              <p className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg font-medium">
                ✅ Adding this driver will automatically mark them as <strong>APPROVED</strong>, allowing them to immediately log into the Driver App and receive broadcast ride dispatches.
              </p>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  disabled={addDriverLoading}
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-semibold rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addDriverLoading}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow-md shadow-amber-500/20 disabled:opacity-50 transition"
                >
                  {addDriverLoading ? 'Registering Driver...' : 'Register & Approve Driver →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
