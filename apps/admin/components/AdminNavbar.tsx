'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

export function AdminNavbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navLinks = [
    { href: '/dashboard', label: 'Overview', icon: '📊' },
    { href: '/bookings', label: 'Bookings', icon: '📋' },
    { href: '/live-map', label: 'Live Map', icon: '🗺️' },
    { href: '/payments', label: 'Payments', icon: '💳' },
    { href: '/odometer-evidence', label: 'Odometer Audit', icon: '🔍' },
    { href: '/vehicle-evidence', label: 'Vehicle KYC', icon: '🛡️' },
    { href: '/fleets', label: 'Fleets', icon: '🚐' },
    { href: '/pricing', label: 'Pricing Rules', icon: '🏷️' },
    { href: '/audit-logs', label: 'Audit Logs', icon: '📜' },
  ];

  return (
    <header className="bg-white border-b border-slate-200 text-slate-900 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <Link href="/dashboard" className="flex items-center space-x-2.5">
              <img
                src="/images/logo.png"
                alt="Kandy Cabs"
                className="h-9 w-auto object-contain"
              />
              <span className="text-[10px] bg-amber-100 text-amber-800 font-extrabold px-2 py-0.5 rounded border border-amber-300 tracking-wider">
                ADMIN
              </span>
            </Link>
          </div>

          {/* Desktop Nav Tabs */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || (link.href !== '/bookings' && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch={true}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <span>{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right: User / Logout */}
          <div className="flex items-center space-x-3">
            {user ? (
              <div className="flex items-center space-x-3">
                <div className="hidden sm:block text-right">
                  <div className="text-xs font-semibold text-slate-800">{user.fullName || 'Admin User'}</div>
                  <div className="text-[10px] text-slate-500">{user.phone}</div>
                </div>
                <button
                  onClick={() => logout()}
                  className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded border border-slate-200 transition"
                  title="Sign out"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="px-3 py-1 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded transition shadow-xs"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Sub-Nav */}
      <div className="lg:hidden flex overflow-x-auto px-4 py-2 bg-slate-50 border-t border-slate-200 space-x-2 text-xs no-scrollbar">
        {navLinks.map((link) => {
          const isActive = pathname === link.href || (link.href !== '/bookings' && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              prefetch={true}
              className={`flex-shrink-0 px-2.5 py-1 rounded font-medium flex items-center space-x-1 ${
                isActive ? 'bg-amber-500 text-slate-950' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>
    </header>
  );
}
