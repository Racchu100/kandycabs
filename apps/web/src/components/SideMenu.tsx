'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Car,
  Tag,
  Info,
  Headphones,
  ChevronRight,
  User,
  ShieldCheck,
  LogOut,
  LogIn,
  PhoneCall,
  HelpCircle,
  Phone,
  X,
} from 'lucide-react';

export interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  isAdmin?: boolean;
  isApprovedDriver?: boolean;
  onLogout: () => void;
  supportPhone?: string;
  navItems?: NavItem[];
  appVersion?: string;
}

const DEFAULT_NAV_ITEMS: NavItem[] = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Book Cab', href: '/booking', icon: Car },
  { name: 'Fleet & Rates', href: '/fleet', icon: Tag },
  { name: 'About Us', href: '/about', icon: Info },
  { name: 'Contact', href: '/contact', icon: Headphones },
  { name: 'Need Assistance?', href: '/contact', icon: HelpCircle },
];

export const SideMenu: React.FC<SideMenuProps> = ({
  isOpen,
  onClose,
  user,
  isAdmin = false,
  isApprovedDriver = false,
  onLogout,
  supportPhone = '+91 98765 43210',
  navItems = DEFAULT_NAV_ITEMS,
  appVersion = 'v2.4.1',
}) => {
  const pathname = usePathname();

  if (!isOpen) return null;

  // Determine user role badge title
  const userRoleTitle = isAdmin
    ? 'System Administrator'
    : isApprovedDriver
    ? 'Verified Driver Partner'
    : user
    ? 'Customer Account'
    : 'Guest Visitor';

  return (
    <div className="lg:hidden fixed inset-0 z-[999999] flex">
      {/* Backdrop Overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      />

      {/* Slideable Right Drawer Panel */}
      <div className="relative ml-auto w-80 sm:w-[400px] max-w-[90vw] bg-white h-dvh max-h-screen shadow-2xl z-[1000000] flex flex-col justify-between p-4 sm:p-5 overflow-y-auto animate-in slide-in-from-right duration-300">
        
        {/* TOP & MAIN NAV SECTION */}
        <div className="space-y-6">
          {/* Header Block: Logo & User Identity Card */}
          <div className="space-y-4">
            {/* Drawer Header Row */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <Link href="/" onClick={onClose} className="flex items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/kandycabs-logo.png"
                  alt="Kandy Cabs Logo"
                  className="h-8 w-auto object-contain"
                />
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* User Welcome Identity Card (Single Identity Element) */}
            {user ? (
              <Link
                href="/customer/dashboard"
                onClick={onClose}
                className="group bg-slate-50 hover:bg-slate-100/90 border border-slate-200/80 rounded-2xl p-3.5 flex items-center justify-between transition shadow-2xs cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-orange-100 text-kandy-orange flex items-center justify-center font-black text-sm shrink-0 border border-orange-200">
                    <User className="w-5 h-5 text-kandy-orange" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] font-semibold text-slate-500 block leading-tight">
                      {user.isNewUser ? 'Welcome,' : 'Welcome back,'}
                    </span>
                    <span className="text-sm font-black text-slate-900 truncate block leading-snug group-hover:text-kandy-orange transition">
                      {user.fullName || user.phone || 'Valued User'}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 block tracking-wide">
                      {userRoleTitle}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-kandy-orange group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
              </Link>
            ) : (
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-900 block leading-tight">
                      Welcome to Kandy Cabs
                    </span>
                    <span className="text-[11px] font-medium text-slate-500 block">
                      Sign in for bookings & dispatches
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* MAIN NAV ITEMS (Includes 'Need Assistance?' as final nav item) */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href && item.name !== 'Need Assistance?';
              const IconComp = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center justify-between p-2.5 px-3 rounded-xl transition cursor-pointer ${
                    isActive
                      ? 'bg-orange-50/90 text-kandy-orange font-black shadow-2xs border border-orange-100'
                      : 'hover:bg-slate-100/80 text-slate-700 font-bold group'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-5 h-5 flex items-center justify-center shrink-0">
                      <IconComp
                        className={`w-5 h-5 stroke-[2] transition-colors ${
                          isActive
                            ? 'text-kandy-orange'
                            : 'text-slate-500 group-hover:text-slate-900'
                        }`}
                      />
                    </div>
                    <span
                      className={`text-xs ${
                        isActive
                          ? 'text-kandy-orange font-black'
                          : 'text-slate-800 font-extrabold group-hover:text-slate-900'
                      }`}
                    >
                      {item.name}
                    </span>
                  </div>

                  <ChevronRight
                    className={`w-4 h-4 shrink-0 transition-transform ${
                      isActive
                        ? 'text-kandy-orange'
                        : 'text-slate-400 group-hover:text-slate-600 group-hover:translate-x-0.5'
                    }`}
                  />
                </Link>
              );
            })}
          </nav>
        </div>

        {/* BOTTOM SECTION: Actions, Support Footer & Quiet App Version */}
        <div className="space-y-6 pt-4 border-t border-slate-100 shrink-0 mt-6">
          {/* Action Buttons Stack (Exact Alignment across Driver Portal, Customer Portal & Logout) */}
          <div className="space-y-2.5">
            {/* 1. Driver Portal - Primary Filled Dark Button */}
            {user && isApprovedDriver && (
              <Link
                href="/driver/dashboard"
                onClick={onClose}
                className="w-full h-11 bg-slate-900 hover:bg-black active:bg-slate-950 text-white rounded-xl px-3.5 flex items-center justify-between font-extrabold text-xs shadow-sm transition cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-5 h-5 flex items-center justify-center shrink-0">
                    <Car className="w-4 h-4 text-kandy-orange stroke-[2]" />
                  </div>
                  <span className="truncate">Driver Portal</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </Link>
            )}

            {/* Admin Console (if Admin) */}
            {user && isAdmin && (
              <Link
                href="/admin"
                onClick={onClose}
                className="w-full h-11 bg-kandy-orange hover:bg-kandy-orangeHover text-white rounded-xl px-3.5 flex items-center justify-between font-extrabold text-xs shadow-sm transition cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-5 h-5 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4 text-white stroke-[2]" />
                  </div>
                  <span className="truncate">Admin Console</span>
                </div>
                <ChevronRight className="w-4 h-4 text-white/80 shrink-0" />
              </Link>
            )}

            {/* 2. Customer Portal (My Account) - Ghost / Subtler Text Button */}
            {user && (
              <Link
                href="/customer/dashboard"
                onClick={onClose}
                className="w-full h-11 hover:bg-slate-100 text-slate-700 rounded-xl px-3.5 flex items-center justify-between font-extrabold text-xs transition cursor-pointer border border-transparent hover:border-slate-200"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-5 h-5 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-slate-500 stroke-[2]" />
                  </div>
                  <span className="truncate">Customer Portal (My Account)</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </Link>
            )}

            {/* 3. Logout / Sign In - Lower emphasis outline style with matching alignment */}
            {user ? (
              <button
                type="button"
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className="w-full h-11 border border-red-200 hover:bg-red-50 active:bg-red-100 text-red-600 font-extrabold text-xs rounded-xl px-3.5 flex items-center justify-between transition cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-5 h-5 flex items-center justify-center shrink-0">
                    <LogOut className="w-4 h-4 text-red-600 stroke-[2]" />
                  </div>
                  <span className="truncate">Logout</span>
                </div>
                <div className="w-4 h-4 shrink-0" />
              </button>
            ) : (
              <Link
                href="/login"
                onClick={onClose}
                className="w-full h-11 bg-kandy-orange hover:bg-kandy-orangeHover text-white font-black text-xs uppercase tracking-wider rounded-xl px-3.5 flex items-center justify-between transition shadow-sm cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-5 h-5 flex items-center justify-center shrink-0">
                    <LogIn className="w-4 h-4 text-white stroke-[2]" />
                  </div>
                  <span className="truncate">SIGN IN / LOGIN</span>
                </div>
                <ChevronRight className="w-4 h-4 text-white/80 shrink-0" />
              </Link>
            )}
          </div>

          {/* 4. SUPPORT FOOTER: Single-line utility bar */}
          <div className="bg-slate-50 rounded-xl p-3 px-3.5 flex items-center justify-between border border-slate-200/80 text-xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-5 h-5 flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4 text-slate-500 stroke-[2]" />
              </div>
              <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-medium text-slate-500">24×7 Support:</span>
                <a
                  href={`tel:${supportPhone.replace(/\s+/g, '')}`}
                  className="font-black text-slate-900 hover:text-kandy-orange transition"
                >
                  {supportPhone}
                </a>
              </div>
            </div>
            <a
              href={`tel:${supportPhone.replace(/\s+/g, '')}`}
              className="w-7 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center transition shrink-0 ml-2 shadow-2xs"
              title="Call Support Now"
            >
              <PhoneCall className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* 5. APP VERSION METADATA AT VERY BOTTOM */}
          <div className="text-center pt-1">
            <span className="text-[11px] font-medium text-slate-400 tracking-wider">
              {appVersion}
            </span>
          </div>

        </div>
      </div>
    </div>
  );
};
