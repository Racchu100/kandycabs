'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Car, Phone, ShieldCheck, User, Menu, X, LogIn, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, logout: handleLogout } = useAuth();

  React.useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isAdmin =
    user &&
    (user.phone?.includes('9481086058') ||
      user.phone?.includes('9999999999') ||
      (Array.isArray(user.roles) && user.roles.includes('ADMIN')));

  const isApprovedDriver =
    user &&
    (user.driver?.status === 'APPROVED' ||
      user.driver?.isVerifiedByAdmin === true ||
      (Array.isArray(user.roles) && user.roles.includes('DRIVER')));

  return (
    <header
      className={`sticky top-0 z-50 bg-white transition-all duration-200 ${
        isScrolled ? 'shadow-md border-b border-gray-100/80' : 'shadow-none border-b-0'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-14 md:h-16 lg:h-20">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/kandycabs-logo.png"
              alt="Kandy Cabs – Safe | Reliable | Hassle Free"
              className="h-9 sm:h-10 md:h-12 lg:h-14 w-auto object-contain group-hover:opacity-90 transition-opacity"
            />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-kandy-ink">
            <Link href="/" className="hover:text-kandy-orange transition">
              Home
            </Link>
            <Link href="/booking" className="hover:text-kandy-orange transition">
              Book Cab
            </Link>
            <Link href="/fleet" className="hover:text-kandy-orange transition">
              Fleet & Rates
            </Link>
            <Link href="/about" className="hover:text-kandy-orange transition">
              About Us
            </Link>
            <Link href="/contact" className="hover:text-kandy-orange transition">
              Contact
            </Link>
          </nav>

          {/* Right Action Controls */}
          <div className="hidden lg:flex items-center gap-3">
            <a
              href="tel:+919876543210"
              className="flex items-center gap-2 text-xs font-bold text-kandy-ink bg-kandy-bg px-3.5 py-2.5 rounded-lg hover:bg-gray-200 transition"
            >
              <Phone className="w-3.5 h-3.5 text-kandy-orange" />
              <span>+91 98765 43210</span>
            </a>

            {!user ? (
              /* SINGLE UNIFIED SIGN IN BUTTON WHEN LOGGED OUT */
              <Link
                href="/login"
                className="flex items-center gap-2 text-xs font-black text-white bg-gradient-to-r from-kandy-orange to-orange-600 hover:from-orange-600 hover:to-kandy-orange px-6 py-2.5 rounded-lg transition shadow-md border-b-2 border-orange-800"
              >
                <LogIn className="w-4 h-4 text-white" />
                <span>SIGN IN →</span>
              </Link>
            ) : (
              /* Role-aware Navigation for Logged-In Users */
              <div className="flex items-center gap-3">
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-1.5 text-xs font-black text-white bg-kandy-orange px-3.5 py-2.5 rounded-lg hover:bg-kandy-orangeHover transition shadow-md"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Admin Console</span>
                  </Link>
                )}

                {isApprovedDriver && (
                  <Link
                    href="/driver/dashboard"
                    className="flex items-center gap-2 text-xs font-extrabold text-white bg-kandy-ink hover:bg-black px-4 py-2.5 rounded-lg transition shadow-md"
                  >
                    <Car className="w-3.5 h-3.5 text-kandy-orange" />
                    <span>Driver Portal</span>
                  </Link>
                )}

                <Link
                  href="/customer/dashboard"
                  className="flex items-center gap-2 text-xs font-extrabold text-kandy-orange border-2 border-kandy-orange bg-white px-4 py-2.5 rounded-lg hover:bg-orange-50 transition shadow-sm"
                >
                  <User className="w-3.5 h-3.5 text-kandy-orange" />
                  <span>My Account</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="px-3.5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition shadow-sm"
                >
                  Logout
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-kandy-ink hover:text-kandy-orange transition"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Slideable Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[100] flex">
          {/* Backdrop Blur Overlay */}
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />

          {/* Slideable Right Drawer Panel */}
          <div className="relative ml-auto w-80 max-w-[85vw] bg-white h-dvh min-h-screen shadow-2xl z-[101] flex flex-col justify-between p-5 overflow-y-auto pb-20 animate-in slide-in-from-right duration-300">
            {/* Top Navigation Links */}
            <div className="space-y-4">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <Link href="/" onClick={() => setMobileMenuOpen(false)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/kandycabs-logo.png"
                    alt="Kandy Cabs Logo"
                    className="h-8 w-auto object-contain"
                  />
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 text-gray-500 hover:text-kandy-ink rounded-lg bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Links */}
              <nav className="space-y-1 font-bold text-sm text-kandy-ink">
                <Link
                  href="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3.5 py-2.5 hover:bg-orange-50 hover:text-kandy-orange rounded-lg transition"
                >
                  Home
                </Link>
                <Link
                  href="/booking"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3.5 py-2.5 hover:bg-orange-50 hover:text-kandy-orange rounded-lg transition"
                >
                  Book Cab
                </Link>
                <Link
                  href="/fleet"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3.5 py-2.5 hover:bg-orange-50 hover:text-kandy-orange rounded-lg transition"
                >
                  Fleet & Rates
                </Link>
                <Link
                  href="/about"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3.5 py-2.5 hover:bg-orange-50 hover:text-kandy-orange rounded-lg transition"
                >
                  About Us
                </Link>
                <Link
                  href="/contact"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3.5 py-2.5 hover:bg-orange-50 hover:text-kandy-orange rounded-lg transition"
                >
                  Contact
                </Link>
              </nav>
            </div>

            {/* Bottom Actions: Account Portals, Contact Number, Sign In & Logout */}
            <div className="pt-4 border-t border-gray-200 space-y-2.5 mt-6 shrink-0 pb-10">
              {!user ? (
                /* LOGGED OUT STATE: SIGN IN BUTTON */
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 text-center py-3 bg-gradient-to-r from-kandy-orange to-orange-600 text-white font-black text-sm rounded-xl shadow-md border-b-2 border-orange-800"
                >
                  <LogIn className="w-4 h-4" />
                  <span>SIGN IN / LOGIN</span>
                </Link>
              ) : (
                /* LOGGED IN STATE: USER INFO + PORTALS + LOGOUT */
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider px-1">
                    Logged in as: <span className="text-kandy-ink font-extrabold">{user.fullName || user.phone || 'Customer'}</span>
                  </div>

                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-center gap-2 text-center py-2.5 bg-kandy-orange text-white font-extrabold text-xs rounded-xl shadow"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Admin Console</span>
                    </Link>
                  )}
                  {isApprovedDriver && (
                    <Link
                      href="/driver/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-center gap-2 text-center py-2.5 bg-kandy-ink text-white font-extrabold text-xs rounded-xl shadow"
                    >
                      <Car className="w-4 h-4 text-kandy-orange" />
                      <span>Driver Portal</span>
                    </Link>
                  )}
                  <Link
                    href="/customer/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 text-center py-2.5 border-2 border-kandy-orange text-kandy-orange font-extrabold text-xs rounded-xl hover:bg-orange-50 transition"
                  >
                    <User className="w-4 h-4" />
                    <span>Customer Portal (My Account)</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 transition shadow-md"
                  >
                    <LogOut className="w-4 h-4 text-white shrink-0" />
                    <span>LOGOUT</span>
                  </button>
                </div>
              )}

              {/* Direct Phone Contact Link */}
              <a
                href="tel:+919876543210"
                className="flex items-center justify-center gap-2 py-2.5 bg-gray-100 hover:bg-gray-200 text-kandy-ink rounded-xl font-bold text-xs border border-gray-200 transition"
              >
                <Phone className="w-4 h-4 text-kandy-orange shrink-0" />
                <span>Call 24x7 Support: +91 98765 43210</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
