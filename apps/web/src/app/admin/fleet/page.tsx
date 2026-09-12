'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Car,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  Shield,
  X,
  Save,
  ToggleLeft,
  ToggleRight,
  Search,
  IndianRupee,
  Upload,
  Camera,
  Image as ImageIcon,
} from 'lucide-react';

interface FleetVehicle {
  id: string;
  category: string;
  name: string;
  seatCount: number;
  baseFarePerKm: number;
  extraKmRate: number;
  driverAllowance: number;
  isActive: boolean;
  imageUrl?: string;
}

const DEFAULT_IMAGE_FALLBACK =
  'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&auto=format&fit=crop&q=60';

export default function AdminFleetPage() {
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal states
  const [editingVehicle, setEditingVehicle] = useState<FleetVehicle | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states for Edit / Add
  const [formData, setFormData] = useState({
    id: '',
    category: '',
    name: '',
    seatCount: 4,
    baseFarePerKm: 12,
    extraKmRate: 13,
    driverAllowance: 350,
    isActive: true,
    imageUrl: '',
  });

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/fleet');
      if (res.ok) {
        const data = await res.json();
        setVehicles(data.vehicles || []);
      }
    } catch (err) {
      console.warn('Failed to fetch fleet catalog:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  // Handle File Upload to Base64 Data URL
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB limit. Please choose a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setFormData((prev) => ({ ...prev, imageUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Open Edit Modal
  const handleOpenEdit = (v: FleetVehicle) => {
    setEditingVehicle(v);
    setFormData({
      id: v.id,
      category: v.category,
      name: v.name,
      seatCount: v.seatCount,
      baseFarePerKm: v.baseFarePerKm,
      extraKmRate: v.extraKmRate,
      driverAllowance: v.driverAllowance,
      isActive: v.isActive,
      imageUrl: v.imageUrl || '',
    });
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setShowAddModal(true);
    setFormData({
      id: '',
      category: '',
      name: '',
      seatCount: 4,
      baseFarePerKm: 15,
      extraKmRate: 16,
      driverAllowance: 400,
      isActive: true,
      imageUrl: '',
    });
  };

  // Submit Edit Rates
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/fleet', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        const data = await res.json();
        setVehicles((prev) =>
          prev.map((v) => (v.id === formData.id || v.category === formData.category ? data.vehicle : v))
        );
        setEditingVehicle(null);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update rates');
      }
    } catch (err) {
      console.error('Failed to save rates:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Submit New Vehicle
  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.category) {
      alert('Please fill in vehicle name and category code');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/fleet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        const data = await res.json();
        setVehicles((prev) => [...prev, data.vehicle]);
        setShowAddModal(false);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to add vehicle category');
      }
    } catch (err) {
      console.error('Failed to create vehicle category:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Active/Inactive live
  const handleToggleActive = async (v: FleetVehicle) => {
    const nextState = !v.isActive;
    setVehicles((prev) =>
      prev.map((item) => (item.id === v.id ? { ...item, isActive: nextState } : item))
    );
    try {
      await fetch('/api/admin/fleet', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: v.id, category: v.category, isActive: nextState }),
      });
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  // Delete Category
  const handleDelete = async (v: FleetVehicle) => {
    if (!confirm(`Are you sure you want to remove ${v.name} (${v.category}) from the fleet catalog?`)) {
      return;
    }
    setVehicles((prev) => prev.filter((item) => item.id !== v.id));
    try {
      await fetch(`/api/admin/fleet?id=${encodeURIComponent(v.id)}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('Failed to delete vehicle:', err);
    }
  };

  const filtered = vehicles.filter(
    (v) =>
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-kandy-ink">Fleet Catalog &amp; Per-KM Rate Management</h1>
          <p className="text-xs text-kandy-muted mt-0.5">
            Manage active vehicle categories, seating capacity, base rates &amp; driver allowances
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-kandy-orange hover:bg-kandy-orangeHover text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md flex items-center gap-1.5 transition"
        >
          <Plus className="w-4 h-4" /> Add Vehicle Category
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-card border border-kandy-border shadow-sm flex items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-kandy-muted absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vehicle name or category…"
            className="w-full pl-9 pr-3.5 py-2 bg-kandy-bg border border-kandy-border rounded text-xs font-semibold text-kandy-ink placeholder-kandy-muted focus:outline-none focus:ring-1 focus:ring-kandy-orange"
          />
        </div>
        <span className="text-xs font-bold text-kandy-muted hidden sm:inline">
          Total Categories: <span className="text-kandy-ink">{filtered.length}</span>
        </span>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-kandy-muted gap-3">
          <div className="w-6 h-6 border-2 border-kandy-orange border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold uppercase tracking-wider">Loading Fleet Catalog…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-card border border-kandy-border shadow-sm p-12 text-center text-kandy-muted">
          <Car className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-kandy-ink">No vehicle categories found</p>
          <p className="text-xs text-kandy-muted mt-0.5">Click "+ Add Vehicle Category" above to create one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((v) => (
            <div
              key={v.id}
              className={`bg-white rounded-card border shadow-card overflow-hidden flex flex-col justify-between transition-all ${
                v.isActive ? 'border-kandy-border' : 'border-gray-200 opacity-60 bg-gray-50/50'
              }`}
            >
              {/* Vehicle Image Banner */}
              <div className="relative h-40 bg-gray-100 border-b border-kandy-border overflow-hidden group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={v.imageUrl || DEFAULT_IMAGE_FALLBACK}
                  alt={v.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                  <span className="bg-kandy-ink/90 backdrop-blur-sm text-white text-[10px] font-black px-2.5 py-1 rounded uppercase tracking-wider shadow">
                    {v.category}
                  </span>
                  <button
                    onClick={() => handleToggleActive(v)}
                    title="Click to toggle Active / Inactive status"
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase transition cursor-pointer border shadow ${
                      v.isActive
                        ? 'bg-emerald-500/90 text-white border-emerald-400 backdrop-blur-sm hover:bg-emerald-600'
                        : 'bg-gray-800/90 text-gray-300 border-gray-600 backdrop-blur-sm hover:bg-black'
                    }`}
                  >
                    {v.isActive ? (
                      <>
                        <ToggleRight className="w-3.5 h-3.5 text-white" />
                        <span>ACTIVE</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-3.5 h-3.5 text-gray-400" />
                        <span>INACTIVE</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="absolute bottom-3 left-3 text-white">
                  <h3 className="text-base font-black tracking-tight drop-shadow">{v.name}</h3>
                  <p className="text-[11px] font-bold text-gray-200">{v.seatCount} Passenger Capacity</p>
                </div>
              </div>

              {/* Body Content */}
              <div className="p-5 space-y-4">
                {/* Rates breakdown box */}
                <div className="space-y-2 text-xs text-kandy-ink bg-kandy-bg p-3.5 rounded-xl border border-kandy-border">
                  <div className="flex justify-between items-center">
                    <span className="text-kandy-muted font-semibold">Base Rate:</span>
                    <strong className="text-kandy-orange font-black text-sm">₹{v.baseFarePerKm}/km</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-kandy-muted font-semibold">Extra KM Rate:</span>
                    <strong className="font-bold text-kandy-ink">₹{v.extraKmRate}/km</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-kandy-muted font-semibold">Driver Allowance:</span>
                    <strong className="font-bold text-kandy-ink">₹{v.driverAllowance}/day</strong>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-kandy-border">
                  <button
                    onClick={() => handleDelete(v)}
                    className="px-2.5 py-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 font-bold text-xs rounded transition flex items-center gap-1"
                    title="Delete category"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="text-[10px] uppercase">Delete</span>
                  </button>

                  <button
                    onClick={() => handleOpenEdit(v)}
                    className="px-3.5 py-1.5 bg-kandy-ink hover:bg-black text-white font-extrabold text-xs rounded-lg flex items-center gap-1.5 transition shadow-sm"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-kandy-orange" />
                    <span>Edit Rates &amp; Image</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Rates & Image Modal */}
      {editingVehicle && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
          onClick={() => setEditingVehicle(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md my-2 sm:my-6 overflow-hidden flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-3.5 sm:px-6 py-2.5 sm:py-4 bg-kandy-ink text-white shrink-0">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 sm:w-5 sm:h-5 text-kandy-orange shrink-0" />
                <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider">Edit Fleet Rates — {editingVehicle.name}</h2>
              </div>
              <button
                onClick={() => setEditingVehicle(null)}
                className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-3.5 sm:p-6 space-y-2.5 sm:space-y-4 text-xs overflow-y-auto flex-1">
              {/* IMAGE UPLOAD & PREVIEW COLUMN */}
              <div>
                <label className="block font-extrabold uppercase text-kandy-muted text-[10px] sm:text-xs mb-1 flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5 text-kandy-orange shrink-0" />
                  Vehicle Image / Photo
                </label>
                <div className="space-y-1.5 sm:space-y-2">
                  {formData.imageUrl ? (
                    <div className="relative h-28 sm:h-32 rounded-xl overflow-hidden border-2 border-kandy-orange group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, imageUrl: '' })}
                        className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition shadow"
                        title="Remove Image"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : null}

                  <div className="flex gap-2">
                    <label className="flex-1 flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-kandy-bg border border-dashed border-kandy-border rounded-xl text-[11px] sm:text-xs font-bold text-kandy-ink cursor-pointer hover:bg-gray-100 transition">
                      <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-kandy-orange shrink-0" />
                      <span>{formData.imageUrl ? 'Change Image File' : 'Upload Image File'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <input
                    type="text"
                    placeholder="Or paste image URL (https://...)"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 bg-kandy-bg border border-kandy-border rounded-xl text-[10px] sm:text-[11px] font-semibold text-kandy-ink focus:outline-none focus:ring-1 focus:ring-kandy-orange"
                  />
                </div>
              </div>

              <div>
                <label className="block font-extrabold uppercase text-kandy-muted text-[10px] sm:text-xs mb-1">Vehicle Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 bg-kandy-bg border border-kandy-border rounded text-[11px] sm:text-xs font-bold text-kandy-ink focus:outline-none focus:ring-1 focus:ring-kandy-orange"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div>
                  <label className="block font-extrabold uppercase text-kandy-muted text-[10px] sm:text-xs mb-1">Category Code</label>
                  <input
                    type="text"
                    value={formData.category}
                    disabled
                    className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 bg-gray-100 border border-kandy-border rounded text-[11px] sm:text-xs font-bold text-gray-500 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block font-extrabold uppercase text-kandy-muted text-[10px] sm:text-xs mb-1">Seat Capacity</label>
                  <input
                    type="number"
                    value={formData.seatCount}
                    onChange={(e) => setFormData({ ...formData, seatCount: Number(e.target.value) })}
                    className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 bg-kandy-bg border border-kandy-border rounded text-[11px] sm:text-xs font-bold text-kandy-ink focus:outline-none focus:ring-1 focus:ring-kandy-orange"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-0.5">
                <div>
                  <label className="block font-extrabold uppercase text-kandy-muted text-[9px] sm:text-[10px] mb-1">Base Rate (₹/km)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.baseFarePerKm}
                    onChange={(e) => setFormData({ ...formData, baseFarePerKm: Number(e.target.value) })}
                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 bg-kandy-bg border border-kandy-border rounded text-[11px] sm:text-xs font-black text-kandy-orange focus:outline-none focus:ring-1 focus:ring-kandy-orange"
                    required
                  />
                </div>
                <div>
                  <label className="block font-extrabold uppercase text-kandy-muted text-[9px] sm:text-[10px] mb-1">Extra KM (₹/km)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.extraKmRate}
                    onChange={(e) => setFormData({ ...formData, extraKmRate: Number(e.target.value) })}
                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 bg-kandy-bg border border-kandy-border rounded text-[11px] sm:text-xs font-bold text-kandy-ink focus:outline-none focus:ring-1 focus:ring-kandy-orange"
                    required
                  />
                </div>
                <div>
                  <label className="block font-extrabold uppercase text-kandy-muted text-[9px] sm:text-[10px] mb-1">Driver Batta (₹/day)</label>
                  <input
                    type="number"
                    step="10"
                    value={formData.driverAllowance}
                    onChange={(e) => setFormData({ ...formData, driverAllowance: Number(e.target.value) })}
                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 bg-kandy-bg border border-kandy-border rounded text-[11px] sm:text-xs font-bold text-kandy-ink focus:outline-none focus:ring-1 focus:ring-kandy-orange"
                    required
                  />
                </div>
              </div>

              <div className="pt-1 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="editIsActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded text-kandy-orange focus:ring-kandy-orange shrink-0"
                />
                <label htmlFor="editIsActive" className="font-extrabold uppercase text-kandy-ink text-[10px] sm:text-xs cursor-pointer">
                  Vehicle Active in Booking Catalog
                </label>
              </div>

              <div className="pt-2 sm:pt-4 grid grid-cols-2 gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setEditingVehicle(null)}
                  className="py-2 sm:py-2.5 px-2 sm:px-3 border border-kandy-border font-bold text-[10px] sm:text-xs uppercase text-kandy-muted rounded-xl hover:bg-gray-100 transition whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="py-2 sm:py-2.5 px-2 sm:px-3 bg-kandy-orange hover:bg-kandy-orangeHover text-white font-extrabold text-[10px] sm:text-xs uppercase rounded-xl transition shadow-md flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span>{submitting ? 'Saving…' : 'Save Rates & Image'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Vehicle Category Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md my-2 sm:my-6 overflow-hidden flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-3.5 sm:px-6 py-2.5 sm:py-4 bg-kandy-ink text-white shrink-0">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-kandy-orange shrink-0" />
                <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider">Add Vehicle Category</h2>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="p-3.5 sm:p-6 space-y-2.5 sm:space-y-4 text-xs overflow-y-auto flex-1">
              {/* IMAGE UPLOAD & PREVIEW COLUMN */}
              <div>
                <label className="block font-extrabold uppercase text-kandy-muted text-[10px] sm:text-xs mb-1 flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5 text-kandy-orange shrink-0" />
                  Vehicle Image / Photo
                </label>
                <div className="space-y-1.5 sm:space-y-2">
                  {formData.imageUrl ? (
                    <div className="relative h-28 sm:h-32 rounded-xl overflow-hidden border-2 border-kandy-orange group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, imageUrl: '' })}
                        className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition shadow"
                        title="Remove Image"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : null}

                  <div className="flex gap-2">
                    <label className="flex-1 flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-kandy-bg border border-dashed border-kandy-border rounded-xl text-[11px] sm:text-xs font-bold text-kandy-ink cursor-pointer hover:bg-gray-100 transition">
                      <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-kandy-orange shrink-0" />
                      <span>{formData.imageUrl ? 'Change Image File' : 'Upload Image File'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <input
                    type="text"
                    placeholder="Or paste image URL (https://...)"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 bg-kandy-bg border border-kandy-border rounded-xl text-[10px] sm:text-[11px] font-semibold text-kandy-ink focus:outline-none focus:ring-1 focus:ring-kandy-orange"
                  />
                </div>
              </div>

              <div>
                <label className="block font-extrabold uppercase text-kandy-muted text-[10px] sm:text-xs mb-1">Vehicle Name / Models</label>
                <input
                  type="text"
                  placeholder="e.g. Toyota Innova Hycross"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 bg-kandy-bg border border-kandy-border rounded text-[11px] sm:text-xs font-bold text-kandy-ink focus:outline-none focus:ring-1 focus:ring-kandy-orange"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div>
                  <label className="block font-extrabold uppercase text-kandy-muted text-[10px] sm:text-xs mb-1">Category Code</label>
                  <input
                    type="text"
                    placeholder="e.g. SUV_HYBRID"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 bg-kandy-bg border border-kandy-border rounded text-[11px] sm:text-xs font-bold text-kandy-ink uppercase focus:outline-none focus:ring-1 focus:ring-kandy-orange"
                    required
                  />
                </div>
                <div>
                  <label className="block font-extrabold uppercase text-kandy-muted text-[10px] sm:text-xs mb-1">Seat Capacity</label>
                  <input
                    type="number"
                    value={formData.seatCount}
                    onChange={(e) => setFormData({ ...formData, seatCount: Number(e.target.value) })}
                    className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 bg-kandy-bg border border-kandy-border rounded text-[11px] sm:text-xs font-bold text-kandy-ink focus:outline-none focus:ring-1 focus:ring-kandy-orange"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-0.5">
                <div>
                  <label className="block font-extrabold uppercase text-kandy-muted text-[9px] sm:text-[10px] mb-1">Base Rate (₹/km)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.baseFarePerKm}
                    onChange={(e) => setFormData({ ...formData, baseFarePerKm: Number(e.target.value) })}
                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 bg-kandy-bg border border-kandy-border rounded text-[11px] sm:text-xs font-black text-kandy-orange focus:outline-none focus:ring-1 focus:ring-kandy-orange"
                    required
                  />
                </div>
                <div>
                  <label className="block font-extrabold uppercase text-kandy-muted text-[9px] sm:text-[10px] mb-1">Extra KM (₹/km)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.extraKmRate}
                    onChange={(e) => setFormData({ ...formData, extraKmRate: Number(e.target.value) })}
                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 bg-kandy-bg border border-kandy-border rounded text-[11px] sm:text-xs font-bold text-kandy-ink focus:outline-none focus:ring-1 focus:ring-kandy-orange"
                    required
                  />
                </div>
                <div>
                  <label className="block font-extrabold uppercase text-kandy-muted text-[9px] sm:text-[10px] mb-1">Driver Batta (₹/day)</label>
                  <input
                    type="number"
                    step="10"
                    value={formData.driverAllowance}
                    onChange={(e) => setFormData({ ...formData, driverAllowance: Number(e.target.value) })}
                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 bg-kandy-bg border border-kandy-border rounded text-[11px] sm:text-xs font-bold text-kandy-ink focus:outline-none focus:ring-1 focus:ring-kandy-orange"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 sm:pt-4 grid grid-cols-2 gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="py-2 sm:py-2.5 px-2 sm:px-3 border border-kandy-border font-bold text-[10px] sm:text-xs uppercase text-kandy-muted rounded-xl hover:bg-gray-100 transition whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="py-2 sm:py-2.5 px-2 sm:px-3 bg-kandy-orange hover:bg-kandy-orangeHover text-white font-extrabold text-[10px] sm:text-xs uppercase rounded-xl transition shadow-md flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span>{submitting ? 'Creating…' : 'Create Category'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
