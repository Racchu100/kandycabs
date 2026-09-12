'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Shield,
  CheckCircle2,
  XCircle,
  Car,
  User,
  FileText,
  Camera,
  X,
  Search,
  Phone,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';

interface DriverEvidence {
  id: string;
  fullName: string;
  phone: string;
  licenseNumber: string;
  vehicleName: string;
  vehicleNumber: string;
  status: string;
  isVerifiedByAdmin: boolean;
  isActive: boolean;
  licenseDocUrl: string | null;
  rcDocUrl: string | null;
  insuranceDocUrl: string | null;
  vehiclePhotos: string[];
  docsUploaded: boolean;
}

function getImgSrc(pathOrUrl: string | null | undefined): string | null {
  if (!pathOrUrl) return null;
  if (pathOrUrl.startsWith('http') || pathOrUrl.startsWith('data:')) return pathOrUrl;
  return `/api/driver/documents/file?path=${encodeURIComponent(pathOrUrl)}`;
}

const VEHICLE_PHOTO_LABELS = ['Front', 'Back', 'Left Side', 'Right Side', 'Interior'];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    APPROVED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
    REJECTED: 'bg-red-100 text-red-700 border-red-200',
    INACTIVE: 'bg-gray-100 text-gray-600 border-gray-200',
  };
  const cls = map[status] || 'bg-gray-100 text-gray-600 border-gray-200';
  return (
    <span className={`inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${cls}`}>
      {status}
    </span>
  );
}

interface LightboxProps {
  src: string;
  label: string;
  onClose: () => void;
}

function Lightbox({ src, label, onClose }: LightboxProps) {
  return (
    <div
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-3xl w-full bg-white rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 bg-kandy-ink">
          <span className="text-white font-bold text-sm">{label}</span>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <img src={src} alt={label} className="w-full max-h-[75vh] object-contain bg-gray-100" />
      </div>
    </div>
  );
}

interface DocImageCardProps {
  label: string;
  src: string | null;
  onOpen: (src: string, label: string) => void;
}

function DocImageCard({ label, src, onOpen }: DocImageCardProps) {
  return (
    <div className="rounded-lg border border-kandy-border bg-kandy-bg overflow-hidden">
      <div className="px-3 py-2 bg-white border-b border-kandy-border">
        <span className="text-[10px] font-black uppercase tracking-wider text-kandy-muted flex items-center gap-1">
          <FileText className="w-3 h-3" />
          {label}
        </span>
      </div>
      {src ? (
        <button
          type="button"
          onClick={() => onOpen(src, label)}
          className="block w-full relative group"
          title={`View ${label} fullscreen`}
        >
          <img src={src} alt={label} className="w-full h-36 object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="text-white text-[10px] font-bold uppercase">Click to expand</span>
          </div>
        </button>
      ) : (
        <div className="h-36 flex items-center justify-center">
          <span className="text-[11px] font-bold text-gray-400">No image uploaded</span>
        </div>
      )}
    </div>
  );
}

interface VehiclePhotoGridProps {
  photos: string[];
  onOpen: (src: string, label: string) => void;
}

function VehiclePhotoGrid({ photos, onOpen }: VehiclePhotoGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
      {VEHICLE_PHOTO_LABELS.map((label, idx) => {
        const rawPath = photos[idx] || null;
        const src = rawPath ? getImgSrc(rawPath) : null;
        return (
          <div key={label} className="text-center space-y-1">
            {src ? (
              <button
                type="button"
                onClick={() => onOpen(src, label)}
                className="block w-full group relative"
                title={`View ${label} fullscreen`}
              >
                <img src={src} alt={label} className="w-full h-20 object-cover rounded border border-kandy-border" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded">
                  <Camera className="w-4 h-4 text-white" />
                </div>
              </button>
            ) : (
              <div className="w-full h-20 rounded border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center">
                <span className="text-[9px] font-bold text-gray-400">No image</span>
              </div>
            )}
            <span className="text-[9px] font-bold text-kandy-muted block">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

interface DetailPanelProps {
  driver: DriverEvidence;
  onClose: () => void;
  onLightbox: (src: string, label: string) => void;
}

function DetailPanel({ driver, onClose, onLightbox }: DetailPanelProps) {
  const licenseSrc = getImgSrc(driver.licenseDocUrl);
  const rcSrc = getImgSrc(driver.rcDocUrl);
  const insuranceSrc = getImgSrc(driver.insuranceDocUrl);

  return (
    <div className="bg-white rounded-card border border-kandy-border shadow-card h-full flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between px-3.5 py-3 sm:px-5 sm:py-4 border-b border-kandy-border">
        <div className="space-y-1 min-w-0 pr-4">
          <h2 className="text-sm sm:text-base font-black text-kandy-ink truncate">{driver.fullName}</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={driver.status} />
            {driver.isVerifiedByAdmin ? (
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                <ShieldCheck className="w-3.5 h-3.5" /> Verified
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700">
                <ShieldAlert className="w-3.5 h-3.5" /> Unverified
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 p-1 sm:p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
          title="Close"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="overflow-y-auto flex-1 p-3.5 sm:p-5 space-y-4 sm:space-y-6">
        {/* Section 1 - Driver Info */}
        <section>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-kandy-orange mb-3 flex items-center gap-2">
            <User className="w-3.5 h-3.5" /> Driver Info
          </h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase text-kandy-muted block">Full Name</span>
              <span className="font-bold text-kandy-ink">{driver.fullName}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-kandy-muted block">Phone</span>
              <span className="font-bold text-kandy-ink flex items-center gap-1">
                <Phone className="w-3 h-3 text-kandy-muted" />
                +91 {driver.phone}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-kandy-muted block">License No.</span>
              <span className="font-mono font-bold text-kandy-ink">{driver.licenseNumber}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-kandy-muted block">Status</span>
              <StatusBadge status={driver.status} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-kandy-muted block">Vehicle Name</span>
              <span className="font-bold text-kandy-ink flex items-center gap-1">
                <Car className="w-3 h-3 text-kandy-muted" />
                {driver.vehicleName}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-kandy-muted block">Vehicle Number</span>
              <span className="font-mono font-bold text-kandy-ink">{driver.vehicleNumber}</span>
            </div>
          </div>
        </section>

        {/* Section 2 - Documents */}
        <section>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-kandy-orange mb-3 flex items-center gap-2">
            <FileText className="w-3.5 h-3.5" /> Documents
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <DocImageCard label="Driving License" src={licenseSrc} onOpen={onLightbox} />
            <DocImageCard label="RC Book" src={rcSrc} onOpen={onLightbox} />
            <DocImageCard label="Insurance Certificate" src={insuranceSrc} onOpen={onLightbox} />
          </div>
        </section>

        {/* Section 3 - Vehicle Photos */}
        <section>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-kandy-orange mb-3 flex items-center gap-2">
            <Camera className="w-3.5 h-3.5" /> Vehicle Photos
          </h3>
          <VehiclePhotoGrid photos={driver.vehiclePhotos || []} onOpen={onLightbox} />
        </section>
      </div>
    </div>
  );
}

function AdminVehicleEvidenceContent() {
  const searchParams = useSearchParams();
  const [drivers, setDrivers] = useState<DriverEvidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<DriverEvidence | null>(null);
  const [lightbox, setLightbox] = useState<{ src: string; label: string } | null>(null);

  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/vehicle-evidence');
      if (res.ok) {
        const data = await res.json();
        const list: DriverEvidence[] = data.drivers || [];
        setDrivers(list);

        // Auto-select driver from ?driver= query param (phone or id)
        const driverParam = searchParams?.get('driver');
        if (driverParam) {
          const match = list.find(
            (d) =>
              d.phone.replace(/\D/g, '').slice(-10) === driverParam.replace(/\D/g, '').slice(-10) ||
              d.id === driverParam
          );
          if (match) setSelected(match);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch vehicle evidence:', err);
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  const filtered = drivers.filter((d) => {
    const q = search.toLowerCase();
    return d.fullName.toLowerCase().includes(q) || d.phone.includes(q);
  });

  const openLightbox = useCallback((src: string, label: string) => {
    setLightbox({ src, label });
  }, []);

  const closeLightbox = useCallback(() => setLightbox(null), []);

  return (
    <div className="space-y-3.5 sm:space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-lg sm:text-2xl font-black text-kandy-ink">Driver Vehicle Evidence</h1>
        <p className="text-[11px] sm:text-xs text-kandy-muted mt-0.5">Driver documents, vehicle photos and verification status</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-3.5 sm:gap-5 items-start">
        {/* Left panel — driver list */}
        <div className="w-full lg:w-80 shrink-0 space-y-2.5 sm:space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-kandy-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or phone…"
              className="w-full pl-9 pr-4 py-2 sm:py-2.5 text-xs font-semibold bg-white border border-kandy-border rounded-lg shadow-sm focus:outline-none focus:border-kandy-orange text-kandy-ink"
            />
          </div>

          <div className="space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto pr-0.5">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-kandy-orange border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-xs font-bold text-kandy-muted">
                No drivers found
              </div>
            ) : (
              filtered.map((d) => (
                <React.Fragment key={d.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(selected?.id === d.id ? null : d)}
                    className={`w-full text-left px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-card border shadow-card transition-all group ${
                      selected?.id === d.id
                        ? 'bg-kandy-orange border-kandy-orange text-white'
                        : 'bg-white border-kandy-border hover:border-kandy-orange hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className={`text-xs font-black truncate ${selected?.id === d.id ? 'text-white' : 'text-kandy-ink'}`}>
                          {d.fullName}
                        </p>
                        <p className={`text-[10px] font-semibold mt-0.5 flex items-center gap-1 ${selected?.id === d.id ? 'text-white/80' : 'text-kandy-muted'}`}>
                          <Phone className="w-3 h-3" />
                          +91 {d.phone}
                        </p>
                        <p className={`text-[10px] font-semibold mt-0.5 flex items-center gap-1 ${selected?.id === d.id ? 'text-white/80' : 'text-kandy-muted'}`}>
                          <Car className="w-3 h-3" />
                          {d.vehicleName}
                        </p>
                      </div>
                      <div className="shrink-0 mt-0.5">
                        {d.status === 'APPROVED' ? (
                          <CheckCircle2 className={`w-4 h-4 ${selected?.id === d.id ? 'text-white' : 'text-emerald-500'}`} />
                        ) : d.status === 'REJECTED' ? (
                          <XCircle className={`w-4 h-4 ${selected?.id === d.id ? 'text-white' : 'text-red-500'}`} />
                        ) : (
                          <Shield className={`w-4 h-4 ${selected?.id === d.id ? 'text-white' : 'text-amber-500'}`} />
                        )}
                      </div>
                    </div>
                    <div className="mt-2">
                      {selected?.id === d.id ? (
                        <span className="inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border bg-white/20 border-white/40 text-white">
                          {d.status}
                        </span>
                      ) : (
                        <StatusBadge status={d.status} />
                      )}
                    </div>
                  </button>

                  {/* Mobile Only: Expand detail panel directly beneath clicked driver button */}
                  {selected?.id === d.id && (
                    <div className="lg:hidden mt-2 mb-3">
                      <DetailPanel
                        driver={selected}
                        onClose={() => setSelected(null)}
                        onLightbox={openLightbox}
                      />
                    </div>
                  )}
                </React.Fragment>
              ))
            )}
          </div>
        </div>

        {/* Right panel — details (Desktop only) */}
        <div className="hidden lg:block flex-1 min-w-0">
          {selected ? (
            <DetailPanel
              driver={selected}
              onClose={() => setSelected(null)}
              onLightbox={openLightbox}
            />
          ) : (
            <div className="bg-white rounded-card border border-kandy-border shadow-card flex items-center justify-center min-h-[400px]">
              <div className="text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-kandy-bg border border-kandy-border flex items-center justify-center mx-auto">
                  <Shield className="w-7 h-7 text-kandy-muted" />
                </div>
                <div>
                  <p className="text-sm font-bold text-kandy-ink">Select a Driver</p>
                  <p className="text-xs text-kandy-muted mt-0.5">Click on any driver card to view their evidence</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && <Lightbox src={lightbox.src} label={lightbox.label} onClose={closeLightbox} />}
    </div>
  );
}

export default function AdminVehicleEvidencePage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-xs font-bold text-kandy-muted">Loading driver evidence...</div>}>
      <AdminVehicleEvidenceContent />
    </React.Suspense>
  );
}
