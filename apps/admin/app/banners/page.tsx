'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AdminNavbar } from '@/components/AdminNavbar';

export const dynamic = 'force-dynamic';

interface BannerItem {
  id: string;
  badge?: string;
  tagline?: string;
  subTagline?: string;
  image: string;
  btnText: string;
  category?: 'ONEWAY' | 'ROUND' | 'AIRPORT' | 'LOCAL' | 'CORPORATE' | 'TOUR';
  bannerType?: 'APP_BANNER' | 'PROMO_GRAPHIC';
  showTextOverlay?: boolean;
  showCtaButton?: boolean;
  linkUrl?: string;
  isActive: boolean;
  order: number;
  createdAt?: string;
}

const CATEGORY_OPTIONS: { id: NonNullable<BannerItem['category']>; label: string; icon: string }[] = [
  { id: 'ONEWAY', label: 'One-Way Drop', icon: '🚗' },
  { id: 'ROUND', label: 'Round Trip', icon: '🔄' },
  { id: 'AIRPORT', label: 'Airport Transfer', icon: '✈️' },
  { id: 'LOCAL', label: 'Local Rental', icon: '⏱️' },
  { id: 'CORPORATE', label: 'Corporate Travel', icon: '💼' },
  { id: 'TOUR', label: 'Tour & Pilgrimage', icon: '🌴' },
];

const PRESET_TEMPLATES = [
  {
    badge: 'PILGRIMAGE & TOURS',
    tagline: 'Coastal Karnataka Temple Tours',
    subTagline: 'Dharmasthala • Udupi • Murudeshwar • Kollur',
    btnText: 'Explore Tours',
    category: 'TOUR' as const,
    bannerType: 'APP_BANNER' as const,
    showTextOverlay: true,
    showCtaButton: true,
    linkUrl: '',
    image: 'https://images.unsplash.com/photo-1596178065887-1198b6148b2b?w=1200&auto=format&fit=crop&q=80',
  },
  {
    badge: 'LUXURY GROUP TRAVEL',
    tagline: 'Force Urbania & Tempo Traveller',
    subTagline: '10 to 17 Seater Luxury Vans for Weddings & Ghats',
    btnText: 'Book Urbania',
    category: 'TOUR' as const,
    bannerType: 'APP_BANNER' as const,
    showTextOverlay: true,
    showCtaButton: true,
    linkUrl: '',
    image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1200&auto=format&fit=crop&q=80',
  },
  {
    badge: 'AIRPORT TRANSFERS',
    tagline: 'Mangaluru & Bengaluru Direct Drops',
    subTagline: 'Zero Flight Surge • Flight Tracking Included',
    btnText: 'Book Airport Cab',
    category: 'AIRPORT' as const,
    bannerType: 'APP_BANNER' as const,
    showTextOverlay: true,
    showCtaButton: true,
    linkUrl: '',
    image: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1200&auto=format&fit=crop&q=80',
  },
  {
    badge: 'PROMOTIONAL POSTER',
    tagline: 'Festive Season Discounts',
    subTagline: 'Flat ₹500 OFF on all Outstation Routes',
    btnText: 'Claim Offer',
    category: 'ONEWAY' as const,
    bannerType: 'PROMO_GRAPHIC' as const,
    showTextOverlay: false,
    showCtaButton: true,
    linkUrl: 'https://kandycabs.com/offers',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80',
  },
];

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Partial<BannerItem> | null>(null);
  const [imageInputMode, setImageInputMode] = useState<'upload' | 'url'>('upload');
  const [previewIndex, setPreviewIndex] = useState(0);

  const fetchBanners = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/banners');
      if (res.ok) {
        const data = await res.json();
        setBanners(data.banners || []);
      }
    } catch (err) {
      console.error('Failed to load banners:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  const handleOpenAddModal = (template?: typeof PRESET_TEMPLATES[0]) => {
    if (template) {
      setEditingBanner({
        badge: template.badge,
        tagline: template.tagline,
        subTagline: template.subTagline,
        btnText: template.btnText,
        category: template.category,
        bannerType: template.bannerType || 'APP_BANNER',
        showTextOverlay: template.showTextOverlay ?? true,
        showCtaButton: template.showCtaButton ?? true,
        linkUrl: template.linkUrl || '',
        image: template.image,
        isActive: true,
        order: banners.length + 1,
      });
      setImageInputMode('url');
    } else {
      setEditingBanner({
        badge: 'SPECIAL PROMO',
        tagline: '',
        subTagline: '',
        btnText: 'Book Now',
        category: 'ONEWAY',
        bannerType: 'PROMO_GRAPHIC',
        showTextOverlay: false,
        showCtaButton: true,
        linkUrl: '',
        image: '',
        isActive: true,
        order: banners.length + 1,
      });
      setImageInputMode('upload');
    }
    setShowModal(true);
  };

  const handleOpenEditModal = (banner: BannerItem) => {
    setEditingBanner({
      ...banner,
      bannerType: banner.bannerType || (banner.tagline ? 'APP_BANNER' : 'PROMO_GRAPHIC'),
      showTextOverlay: banner.showTextOverlay !== undefined ? banner.showTextOverlay : (banner.bannerType !== 'PROMO_GRAPHIC'),
      showCtaButton: banner.showCtaButton !== undefined ? banner.showCtaButton : Boolean(banner.btnText),
      linkUrl: banner.linkUrl || '',
    });
    setImageInputMode(banner.image.startsWith('data:') ? 'upload' : 'url');
    setShowModal(true);
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      alert('File size exceeds 4MB. Please choose an image smaller than 4MB (Recommended: < 500KB).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64Data = uploadEvent.target?.result as string;
      setEditingBanner((prev) => (prev ? { ...prev, image: base64Data } : null));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBanner?.image?.trim()) {
      alert('Please upload an image or provide an image URL.');
      return;
    }

    // For APP_BANNER with text overlay, tagline is useful
    if (editingBanner.bannerType === 'APP_BANNER' && editingBanner.showTextOverlay && !editingBanner?.tagline?.trim()) {
      alert('Please enter a banner headline / tagline for App Dynamic Banner.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingBanner),
      });

      if (res.ok) {
        setShowModal(false);
        setEditingBanner(null);
        await fetchBanners();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to save banner.');
      }
    } catch (err) {
      console.error('Error saving banner:', err);
      alert('Network error while saving banner.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promotional banner?')) return;

    try {
      const res = await fetch(`/api/admin/banners?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchBanners();
      } else {
        alert('Failed to delete banner.');
      }
    } catch (err) {
      console.error('Error deleting banner:', err);
      alert('Network error while deleting banner.');
    }
  };

  const handleToggleActive = async (banner: BannerItem) => {
    try {
      const res = await fetch('/api/admin/banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...banner, isActive: !banner.isActive }),
      });
      if (res.ok) {
        await fetchBanners();
      }
    } catch (err) {
      console.error('Error toggling status:', err);
    }
  };

  const activeBanners = banners.filter((b) => b.isActive);
  const currentSimBanner = activeBanners[previewIndex];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <AdminNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center space-x-3">
              <span className="text-3xl">🖼️</span>
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Promotional & Carousel Banners
                </h1>
                <p className="text-sm text-slate-500 mt-1 font-medium">
                  Manage promotional graphic flyers, custom posters, and dynamic hero sliders shown on Customer App & Web.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => handleOpenAddModal()}
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition shadow-sm hover:shadow active:scale-95"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add New Banner</span>
            </button>
          </div>
        </div>

        {/* IMAGE SIZE & SPECIFICATIONS GUIDE BOX */}
        <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-100/60 border-2 border-amber-300/80 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center text-2xl font-bold shrink-0 shadow-sm">
              📐
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                Image Dimensions & Banner Types Guide
                <span className="text-[11px] font-extrabold px-2.5 py-0.5 bg-amber-200 text-amber-900 rounded-full uppercase tracking-wider">
                  Important Standard
                </span>
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                You can choose between <strong>Promotional Graphic / Poster</strong> (pure image with custom CTA button, no text overlay covering the artwork) or <strong>App Dynamic Banner</strong> (dynamic headline, subtitle & badge over background).
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                {/* 1. Dimensions */}
                <div className="bg-white/90 backdrop-blur rounded-xl p-3.5 border border-amber-200/80 shadow-xs">
                  <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                    Recommended Dimensions
                  </div>
                  <div className="text-base font-black text-slate-900 mt-1">
                    1200 × 600 px <span className="text-xs text-slate-500 font-semibold">(2:1 Ratio)</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Mobile Viewport: 800 × 400 px minimum
                  </div>
                </div>

                {/* 2. Aspect Ratio */}
                <div className="bg-white/90 backdrop-blur rounded-xl p-3.5 border border-amber-200/80 shadow-xs">
                  <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                    Aspect Ratio
                  </div>
                  <div className="text-base font-black text-slate-900 mt-1">
                    2:1 <span className="text-xs text-slate-500 font-semibold">or 16:9 Landscape</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Avoid square (1:1) or vertical (9:16) images
                  </div>
                </div>

                {/* 3. File Size & Format */}
                <div className="bg-white/90 backdrop-blur rounded-xl p-3.5 border border-amber-200/80 shadow-xs">
                  <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                    File Format & Size
                  </div>
                  <div className="text-base font-black text-slate-900 mt-1">
                    WebP, JPG, or PNG
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Max: 4 MB (Best speed: &lt; 500 KB)
                  </div>
                </div>

                {/* 4. Banner Types */}
                <div className="bg-white/90 backdrop-blur rounded-xl p-3.5 border border-amber-200/80 shadow-xs">
                  <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                    Selectable Styles
                  </div>
                  <div className="text-sm font-black text-slate-900 mt-1">
                    🎨 Poster vs 📱 Dynamic
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Poster mode hides overlay text & dark card
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* LIVE APP CAROUSEL SIMULATOR */}
        {activeBanners.length > 0 && currentSimBanner && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <span>📱</span>
                  <span>Live Mobile App Simulator Preview</span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    {currentSimBanner.showTextOverlay === false ? '🎨 Promotional Poster Mode' : '📱 Dynamic Text Mode'}
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Showing how customer sees active carousel banner #{previewIndex + 1} of {activeBanners.length}
                </p>
              </div>

              {/* Slider Dots / Controls */}
              <div className="flex items-center space-x-2">
                {activeBanners.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setPreviewIndex(idx)}
                    className={`h-2.5 rounded-full transition-all duration-300 ${
                      previewIndex === idx ? 'w-8 bg-amber-500' : 'w-2.5 bg-slate-200 hover:bg-slate-300'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Simulated Banner Card */}
            <div className="relative w-full max-w-2xl mx-auto h-52 sm:h-64 rounded-2xl overflow-hidden shadow-lg border border-slate-300 group bg-slate-100">
              <img
                src={currentSimBanner.image}
                alt={currentSimBanner.tagline || 'Promotional Banner'}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-700"
              />

              {/* MODE 1: PROMOTIONAL POSTER (NO TEXT OVERLAY, ONLY CLEAN FLOATING CTA) */}
              {currentSimBanner.showTextOverlay === false ? (
                <div className="absolute inset-0 p-5 flex flex-col justify-between pointer-events-none">
                  <div className="flex justify-end">
                    <span className="text-[10px] text-white/90 font-bold bg-slate-950/70 px-2.5 py-1 rounded-md backdrop-blur">
                      Target: {currentSimBanner.category}
                    </span>
                  </div>

                  {currentSimBanner.btnText ? (
                    <div className="flex justify-end">
                      <span className="px-4 py-2 bg-amber-500 text-slate-950 text-xs font-black rounded-xl shadow-lg border border-amber-300 inline-flex items-center space-x-1.5 pointer-events-auto">
                        <span>{currentSimBanner.btnText}</span>
                        <span>→</span>
                      </span>
                    </div>
                  ) : null}
                </div>
              ) : (
                /* MODE 2: APP DYNAMIC BANNER (WITH DARK GLASS CARD & HEADLINE) */
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/50 to-transparent flex flex-col justify-between p-6 sm:p-7">
                  {/* Top Badge */}
                  <div>
                    {currentSimBanner.badge ? (
                      <span className="inline-block px-3 py-1 bg-amber-500 text-slate-950 font-black text-[11px] rounded-lg tracking-wider uppercase shadow-sm">
                        {currentSimBanner.badge}
                      </span>
                    ) : null}
                  </div>

                  {/* Tagline & Action Button */}
                  <div className="space-y-3">
                    <div>
                      {currentSimBanner.tagline ? (
                        <h4 className="text-xl sm:text-2xl font-black text-white leading-tight drop-shadow-md">
                          {currentSimBanner.tagline}
                        </h4>
                      ) : null}
                      {currentSimBanner.subTagline ? (
                        <p className="text-xs sm:text-sm text-slate-200 font-medium mt-1 drop-shadow">
                          {currentSimBanner.subTagline}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      {currentSimBanner.btnText ? (
                        <span className="px-4 py-2 bg-amber-500 text-slate-950 text-xs font-black rounded-xl shadow-md inline-flex items-center space-x-1.5">
                          <span>{currentSimBanner.btnText}</span>
                          <span>→</span>
                        </span>
                      ) : <div />}
                      <span className="text-[11px] text-white/80 font-bold bg-black/40 px-2.5 py-1 rounded-md backdrop-blur">
                        Category: {currentSimBanner.category}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* QUICK PRESET TEMPLATES */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <span>⚡</span>
              <span>Quick Preset Tour & Promo Templates</span>
            </h3>
            <span className="text-xs text-slate-500 font-medium">Click to instantly populate banner form</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {PRESET_TEMPLATES.map((tpl, i) => (
              <div
                key={i}
                onClick={() => handleOpenAddModal(tpl)}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-amber-50/50 hover:border-amber-300 transition cursor-pointer flex flex-col justify-between group shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-amber-700 uppercase tracking-wide">
                      {tpl.badge}
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded">
                      {tpl.showTextOverlay === false ? 'Poster' : 'Dynamic'}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-slate-900 mt-1 group-hover:text-amber-900 line-clamp-1">
                    {tpl.tagline}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{tpl.subTagline}</div>
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] text-amber-700 font-bold">
                  <span>+ Use Template</span>
                  <span>→</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* BANNERS MANAGEMENT LIST */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900">Configured Carousel Banners ({banners.length})</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Active banners automatically rotate in the customer app. Promotional posters render with clean full-bleed graphics.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500 font-semibold">Loading banners...</div>
          ) : banners.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="text-4xl">🖼️</div>
              <div className="text-base font-bold text-slate-700">No Carousel Banners Found</div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Create promotional posters or dynamic app banners to showcase your deals and fleet.
              </p>
              <button
                onClick={() => handleOpenAddModal()}
                className="px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-amber-400"
              >
                + Add First Banner
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {banners.map((b, idx) => (
                <div
                  key={b.id}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/80 transition"
                >
                  <div className="flex items-center space-x-4">
                    {/* Thumbnail */}
                    <div className="w-28 h-16 rounded-xl overflow-hidden bg-slate-200 shrink-0 border border-slate-300 relative shadow-2xs">
                      <img
                        src={b.image}
                        alt={b.tagline || 'Banner'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as any).src = 'https://placehold.co/1200x600/1e293b/f59e0b?text=Kandy+Cabs';
                        }}
                      />
                      <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] font-bold px-1 rounded">
                        #{b.order || idx + 1}
                      </span>
                    </div>

                    {/* Content Details */}
                    <div>
                      <div className="flex items-center space-x-2">
                        {/* Type badge */}
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${
                          b.showTextOverlay === false
                            ? 'bg-purple-100 text-purple-800 border-purple-300'
                            : 'bg-blue-100 text-blue-800 border-blue-300'
                        }`}>
                          {b.showTextOverlay === false ? '🎨 Poster / Graphic' : '📱 Dynamic Text'}
                        </span>

                        {b.badge && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 bg-amber-100 text-amber-800 rounded border border-amber-300 tracking-wider">
                            {b.badge}
                          </span>
                        )}

                        {b.category && b.showTextOverlay !== false && (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                            {b.category}
                          </span>
                        )}

                        {b.linkUrl && (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-200 max-w-[180px] truncate" title={b.linkUrl}>
                            🔗 {b.linkUrl}
                          </span>
                        )}

                        {b.isActive ? (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-pulse" />
                            Active
                          </span>
                        ) : (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 bg-slate-200 text-slate-600 rounded">
                            Inactive
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-black text-slate-900 mt-1">
                        {b.tagline || (b.showTextOverlay === false ? 'Promotional Graphic Poster (Clean Artwork)' : 'Untitled Banner')}
                      </h4>
                      {b.subTagline && <p className="text-xs text-slate-500 font-medium">{b.subTagline}</p>}
                      <div className="text-[11px] text-slate-400 mt-1 font-semibold flex items-center gap-2">
                        {b.showCtaButton !== false && b.btnText ? (
                          <span>Button CTA: <span className="text-slate-700 font-bold">"{b.btnText}"</span></span>
                        ) : (
                          <span className="text-slate-500 italic bg-slate-100 px-2 py-0.5 rounded text-[10px]">No CTA Button (Full Poster Clickable)</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 self-end md:self-center">
                    <button
                      onClick={() => handleToggleActive(b)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        b.isActive
                          ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                      }`}
                    >
                      {b.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(b)}
                      className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteBanner(b.id)}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* MODAL: ADD / EDIT BANNER */}
      {showModal && editingBanner && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 my-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  {editingBanner.id ? 'Edit Banner' : 'Create New Carousel Banner'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Choose between Promotional Graphic Poster or App Dynamic Banner
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-2xl font-bold p-1 leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBanner} className="space-y-4">
              {/* SELECTABLE BANNER TYPE SELECTOR */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block">
                  Select Banner Style / Type *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Option 1: Promotional Poster / Graphic */}
                  <div
                    onClick={() =>
                      setEditingBanner({
                        ...editingBanner,
                        bannerType: 'PROMO_GRAPHIC',
                        showTextOverlay: false,
                      })
                    }
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                      editingBanner.showTextOverlay === false
                        ? 'border-amber-500 bg-amber-50/60 shadow-xs'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-xl">🎨</span>
                      <div className="font-extrabold text-xs text-slate-900">Promotional Poster / Graphic</div>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 font-medium">
                      Pure graphic image without dark text overlay. Set a custom redirect URL and optional CTA button.
                    </p>
                  </div>

                  {/* Option 2: App Dynamic Banner */}
                  <div
                    onClick={() =>
                      setEditingBanner({
                        ...editingBanner,
                        bannerType: 'APP_BANNER',
                        showTextOverlay: true,
                      })
                    }
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                      editingBanner.showTextOverlay !== false
                        ? 'border-amber-500 bg-amber-50/60 shadow-xs'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-xl">📱</span>
                      <div className="font-extrabold text-xs text-slate-900">App Dynamic Banner</div>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 font-medium">
                      Adds dynamic headline, subtitle, top pill badge, category navigation, and dark glass card over image.
                    </p>
                  </div>
                </div>
              </div>

              {/* Image Input Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                    Banner Background / Poster Image *
                  </label>
                  <div className="flex items-center space-x-2 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setImageInputMode('upload')}
                      className={`px-2.5 py-1 rounded-md transition ${
                        imageInputMode === 'upload'
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Upload File
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageInputMode('url')}
                      className={`px-2.5 py-1 rounded-md transition ${
                        imageInputMode === 'url'
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Image URL
                    </button>
                  </div>
                </div>

                {imageInputMode === 'upload' ? (
                  <div className="border-2 border-dashed border-slate-300 hover:border-amber-400 rounded-xl p-4 text-center bg-slate-50 hover:bg-amber-50/20 transition cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileUpload}
                      className="hidden"
                      id="bannerFileInput"
                    />
                    <label htmlFor="bannerFileInput" className="cursor-pointer block space-y-1">
                      <div className="text-2xl">📤</div>
                      <div className="text-xs font-bold text-slate-700">
                        Click to select an image from your computer
                      </div>
                      <div className="text-[11px] text-slate-400">
                        PNG, JPG, or WebP • Recommended 1200×600 px (&lt; 4 MB)
                      </div>
                    </label>
                  </div>
                ) : (
                  <input
                    type="url"
                    placeholder="https://example.com/banner-image.jpg"
                    value={editingBanner.image || ''}
                    onChange={(e) => setEditingBanner({ ...editingBanner, image: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                )}

                {/* Live Modal Image Preview */}
                {editingBanner.image && (
                  <div className="relative w-full h-40 rounded-xl overflow-hidden border border-slate-300 bg-slate-100 mt-2">
                    <img
                      src={editingBanner.image}
                      alt="Banner Preview"
                      className="w-full h-full object-cover"
                    />

                    {editingBanner.showTextOverlay === false ? (
                      /* Promotional Poster Preview: clean image with optional CTA button */
                      <div className="absolute inset-0 p-3 flex flex-col justify-between pointer-events-none">
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] text-white font-bold bg-slate-950/80 px-2 py-0.5 rounded">
                            Poster Preview
                          </span>
                          {editingBanner.linkUrl && (
                            <span className="text-[10px] text-emerald-300 font-bold bg-slate-950/80 px-2 py-0.5 rounded max-w-[200px] truncate">
                              🔗 {editingBanner.linkUrl}
                            </span>
                          )}
                        </div>
                        {editingBanner.showCtaButton !== false && editingBanner.btnText ? (
                          <div className="flex justify-end">
                            <span className="px-3 py-1.5 bg-amber-500 text-slate-950 font-black text-xs rounded-lg shadow-md">
                              {editingBanner.btnText} →
                            </span>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      /* App Dynamic Banner Preview */
                      <>
                        {editingBanner.badge ? (
                          <div className="absolute top-2 left-2 px-2 py-0.5 bg-amber-500 text-slate-950 font-black text-[10px] rounded">
                            {editingBanner.badge}
                          </div>
                        ) : null}
                        <div className="absolute bottom-2 left-2 right-2 bg-black/70 backdrop-blur-xs p-2 rounded-lg text-white">
                          <div className="text-xs font-bold truncate">
                            {editingBanner.tagline || 'Your Headline Will Appear Here'}
                          </div>
                          <div className="text-[10px] text-slate-200 truncate">
                            {editingBanner.subTagline || 'Sub-tagline description'}
                          </div>
                          {editingBanner.showCtaButton !== false && editingBanner.btnText && (
                            <div className="flex justify-end mt-1">
                              <span className="px-2 py-0.5 bg-amber-500 text-slate-950 font-black text-[10px] rounded">
                                {editingBanner.btnText}
                              </span>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* DYNAMIC FIELDS (ONLY SHOWN FOR APP DYNAMIC BANNER TYPE) */}
              {editingBanner.showTextOverlay !== false && (
                <>
                  {/* Grid: Badge */}
                  <div>
                    <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1">
                      Top Pill Badge
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. PILGRIMAGE & TOURS"
                      value={editingBanner.badge || ''}
                      onChange={(e) => setEditingBanner({ ...editingBanner, badge: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* Headline / Tagline */}
                  <div>
                    <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1">
                      Main Headline / Tagline *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Coastal Karnataka Temple Tours"
                      value={editingBanner.tagline || ''}
                      onChange={(e) => setEditingBanner({ ...editingBanner, tagline: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* Sub-Tagline */}
                  <div>
                    <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1">
                      Sub-Tagline / Description
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Dharmasthala • Udupi • Murudeshwar • Kollur"
                      value={editingBanner.subTagline || ''}
                      onChange={(e) => setEditingBanner({ ...editingBanner, subTagline: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* Target Booking Category */}
                  <div>
                    <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1">
                      Target Booking Category *
                    </label>
                    <select
                      value={editingBanner.category || 'ONEWAY'}
                      onChange={(e) =>
                        setEditingBanner({ ...editingBanner, category: e.target.value as BannerItem['category'] })
                      }
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      {CATEGORY_OPTIONS.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.icon} {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              {/* ACTION CTA BUTTON & REDIRECT URL CONFIGURATION */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <label htmlFor="modalShowCta" className="text-xs font-extrabold text-slate-900 uppercase tracking-wider block cursor-pointer">
                      Include Action CTA Button
                    </label>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Display a floating action button over the banner (e.g. "Book Now", "Claim Offer")
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    id="modalShowCta"
                    checked={editingBanner.showCtaButton ?? true}
                    onChange={(e) =>
                      setEditingBanner({
                        ...editingBanner,
                        showCtaButton: e.target.checked,
                        btnText: e.target.checked ? (editingBanner.btnText || 'Book Now') : '',
                      })
                    }
                    className="w-4 h-4 text-amber-500 focus:ring-amber-400 border-slate-300 rounded cursor-pointer"
                  />
                </div>

                {editingBanner.showCtaButton !== false ? (
                  <div className="space-y-3 pt-2 border-t border-slate-200">
                    <div>
                      <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1">
                        Action Button CTA Text *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Book Now / Claim Offer / Explore Tours"
                        value={editingBanner.btnText || ''}
                        onChange={(e) => setEditingBanner({ ...editingBanner, btnText: e.target.value })}
                        className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1">
                        CTA Button Redirect URL / Web Link (Optional)
                      </label>
                      <input
                        type="url"
                        placeholder="e.g. https://www.graphitexdigitals.com/ or https://wa.me/919900000000"
                        value={editingBanner.linkUrl || ''}
                        onChange={(e) => setEditingBanner({ ...editingBanner, linkUrl: e.target.value })}
                        className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <p className="text-[11px] text-slate-500 mt-1 font-medium">
                        When customer clicks this CTA button in the customer app, it will redirect directly to this link. If left empty, it opens the booking flow.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-slate-200">
                    <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1">
                      Banner Flyer Click URL / Web Link (Optional)
                    </label>
                    <input
                      type="url"
                      placeholder="e.g. https://www.graphitexdigitals.com/ or https://wa.me/919900000000"
                      value={editingBanner.linkUrl || ''}
                      onChange={(e) => setEditingBanner({ ...editingBanner, linkUrl: e.target.value })}
                      className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <p className="text-[11px] text-slate-500 mt-1 font-medium">
                      No CTA button is shown. Tapping anywhere on the banner flyer will open this link.
                    </p>
                  </div>
                )}
              </div>

              {/* Display Order */}
              <div>
                <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1">
                  Display Order / Sequence
                </label>
                <input
                  type="number"
                  min={1}
                  value={editingBanner.order || 1}
                  onChange={(e) => setEditingBanner({ ...editingBanner, order: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="modalIsActive"
                  checked={editingBanner.isActive ?? true}
                  onChange={(e) => setEditingBanner({ ...editingBanner, isActive: e.target.checked })}
                  className="w-4 h-4 text-amber-500 focus:ring-amber-400 border-slate-300 rounded cursor-pointer"
                />
                <label htmlFor="modalIsActive" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Activate banner immediately on Customer App
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl transition shadow-sm hover:shadow disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingBanner.id ? 'Update Banner' : 'Publish Banner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
