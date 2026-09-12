'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Car,
  Navigation,
  Users,
  Tag,
  FileSpreadsheet,
  LogOut,
  Radio,
  Gauge,
  CreditCard,
  Camera,
  IndianRupee,
  Menu,
  X,
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Overview', href: '/admin', icon: LayoutDashboard },
  { label: 'Bookings & Dispatch', href: '/admin/bookings', icon: Car },
  { label: 'Live GPS Tracking', href: '/admin/tracking', icon: Radio },
  { label: 'Drivers & Onboarding', href: '/admin/drivers', icon: Users },
  { label: 'Fleet Management', href: '/admin/fleet', icon: Navigation },
  { label: 'Pricing Management', href: '/admin/pricing', icon: IndianRupee },
  { label: 'Coupons & Offers', href: '/admin/coupons', icon: Tag },
  { label: 'Odometer Evidence', href: '/admin/odometer-evidence', icon: Gauge },
  { label: 'Payments', href: '/admin/payments', icon: CreditCard },
  { label: 'Vehicle Evidence', href: '/admin/vehicle-evidence', icon: Camera },
  { label: 'Audit Logs', href: '/admin/audit-logs', icon: FileSpreadsheet },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-kandy-bg text-kandy-ink relative">
      {/* Mobile & Tablet Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Admin Slidable Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 inset-y-0 lg:h-screen left-0 z-50 w-72 lg:w-64 bg-kandy-ink text-white border-r border-gray-800 flex flex-col shrink-0 transform transition-transform duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="px-4 py-4 border-b border-gray-800 flex items-center justify-between lg:justify-center">
          <div className="bg-white rounded-xl px-3 py-1.5 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/kandycabs-logo.png"
              alt="Kandy Cabs"
              className="h-9 lg:h-10 w-auto object-contain"
            />
          </div>
          {/* Close button on mobile & tablet */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
            aria-label="Close sidebar"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 p-3 sm:p-4 space-y-1 text-xs font-bold overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-xl transition ${
                  isActive
                    ? 'bg-kandy-orange text-white shadow-md'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-kandy-orange'}`} />
                <span className="whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 sm:p-4 border-t border-gray-800">
          <button
            onClick={async () => {
              try {
                await fetch('/api/auth/logout', { method: 'POST' });
              } catch (e) {}
              localStorage.removeItem('kandy_user');
              localStorage.removeItem('kandy_token');
              window.location.href = '/';
            }}
            className="flex items-center gap-2 w-full px-3 py-2.5 text-xs font-bold text-gray-400 hover:text-white rounded-xl hover:bg-gray-800 transition"
          >
            <LogOut className="w-4 h-4 text-red-400 shrink-0" />
            <span>Sign Out Admin</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-12 sm:h-16 bg-white/95 backdrop-blur-xs border-b border-kandy-border px-2.5 sm:px-8 flex items-center justify-between shadow-sm sticky top-0 z-30">
          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
            {/* Hamburger button on mobile & tablet */}
            <button
              onClick={() => setIsMobileOpen(true)}
              className="lg:hidden p-1.5 text-kandy-ink hover:bg-gray-100 rounded-lg transition shrink-0"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5 sm:w-6 sm:h-6 text-kandy-orange" />
            </button>

            <div className="flex items-center gap-1 sm:gap-2 min-w-0">
              <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-emerald-500 rounded-full animate-pulse shrink-0"></span>
              <span className="text-[9px] sm:text-xs font-bold text-kandy-ink uppercase tracking-wider truncate">
                OPS SYSTEM LIVE
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 text-xs font-bold text-kandy-ink shrink-0">
            <span className="bg-kandy-orangeLight text-kandy-orange px-2 sm:px-2.5 py-0.5 sm:py-1 rounded border border-orange-200 text-[9px] sm:text-xs whitespace-nowrap">
              Role: Master Admin
            </span>
            <span className="hidden md:inline">Admin Operations (9481086058)</span>
          </div>
        </header>

        <div className="p-3 sm:p-8 flex-1">{children}</div>
      </main>
    </div>
  );
}
