'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Car,
  Phone,
  ShieldCheck,
  User,
  Menu,
  X,
  LogIn,
  LogOut,
  Home,
  IndianRupee,
  Info,
  Headphones,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, logout: handleLogout } = useAuth();
  const pathname = usePathname();

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

          {/* Desktop Navigation Links (Visible on Large Desktop Screens >= 1024px) */}
          <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold text-kandy-ink">
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
                  type="button"
                  onClick={handleLogout}
                  className="px-3.5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition shadow-sm cursor-pointer"
                >
                  Logout
                </button>
              </div>
            )}
          </div>

          {/* Mobile & Tablet Hamburger Menu Button */}
          <div className="lg:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-kandy-ink hover:text-kandy-orange transition cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile & Tablet Slideable Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[999999] flex">
          {/* Backdrop Blur Overlay */}
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />

          {/* Slideable Right Drawer Panel */}
          <div className="relative ml-auto w-80 max-w-[88vw] bg-white h-dvh max-h-screen shadow-2xl z-[1000000] flex flex-col justify-between p-3 sm:p-4 overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="space-y-2">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <Link href="/" onClick={() => setMobileMenuOpen(false)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/kandycabs-logo.png"
                    alt="Kandy Cabs Logo"
                    className="h-7 w-auto object-contain"
                  />
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* User Greeting / Profile Card (ONLY rendered when logged in) */}
              {user && (
                <Link
                  href="/customer/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="relative overflow-hidden bg-gradient-to-r from-orange-50/90 via-orange-100/40 to-orange-50/70 border border-orange-100/90 rounded-xl p-2 px-2.5 flex items-center justify-between shadow-2xs group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#FF6B1A]/15 text-[#FF6B1A] flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-[#FF6B1A]" />
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-gray-500 block leading-tight">
                        {user.isNewUser ? 'Welcome,' : 'Welcome back,'}
                      </span>
                      <span className="text-xs font-black text-gray-900 flex items-center gap-0.5 leading-tight group-hover:text-[#FF6B1A] transition">
                        {user.fullName || user.phone || 'User'}
                        <ChevronRight className="w-3 h-3 text-gray-400 group-hover:text-[#FF6B1A] transition" />
                      </span>
                    </div>
                  </div>
                </Link>
              )}

              {/* Navigation Menu Items with Custom Icons & Active Indicator */}
              <nav className="space-y-1">
                {[
                  { name: 'Home', href: '/', icon: Home },
                  { name: 'Book Cab', href: '/booking', icon: Car },
                  { name: 'Fleet & Rates', href: '/fleet', icon: IndianRupee },
                  { name: 'About Us', href: '/about', icon: Info },
                  { name: 'Contact', href: '/contact', icon: Headphones },
                ].map((item) => {
                  const isActive = pathname === item.href;
                  const IconComp = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between p-1.5 px-2.5 rounded-xl transition ${
                        isActive
                          ? 'bg-[#FFF5EE] border border-orange-200/90 text-[#FF6B1A] font-black shadow-2xs relative'
                          : 'hover:bg-gray-50 text-gray-800 font-bold group'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-7.5 h-7.5 rounded-lg flex items-center justify-center shrink-0 transition ${
                            isActive
                              ? 'bg-[#FF6B1A] text-white shadow-xs'
                              : 'bg-slate-100 text-slate-700 group-hover:bg-orange-100 group-hover:text-[#FF6B1A]'
                          }`}
                        >
                          <IconComp className="w-3.5 h-3.5" />
                        </div>
                        <span className={`text-xs ${isActive ? 'text-[#FF6B1A] font-extrabold' : 'text-gray-900 font-extrabold group-hover:text-[#FF6B1A]'}`}>
                          {item.name}
                        </span>
                      </div>

                      {isActive ? (
                        <div className="w-1.5 h-5 bg-[#FF6B1A] rounded-full shrink-0" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#FF6B1A] shrink-0 transition" />
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Bottom Actions Section: User Status + Portals + Logout + Support Call */}
            <div className="pt-2 space-y-2 mt-2 shrink-0">
              {/* User Logged-in Header Badge (Only shown when user is authenticated) */}
              {user && (
                <div className="flex items-center gap-1.5 px-1 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                  <User className="w-3 h-3 text-gray-400 shrink-0" />
                  <span>
                    LOGGED IN AS: <strong className="text-gray-900 font-black">{user.fullName || user.phone || 'USER'}</strong>
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-1.5">
                {/* Driver Portal Button (Charcoal Dark Card - ONLY shown if approved driver) */}
                {user && isApprovedDriver && (
                  <Link
                    href="/driver/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full bg-[#232731] hover:bg-slate-900 text-white rounded-xl py-2 px-3 flex items-center justify-between font-extrabold text-xs shadow-xs transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Car className="w-4 h-4 text-[#FF6B1A] shrink-0" />
                      <span>Driver Portal</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  </Link>
                )}

                {/* Admin Console Button (ONLY shown if admin) */}
                {user && isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full bg-kandy-orange hover:bg-orange-600 text-white rounded-xl py-2 px-3 flex items-center justify-between font-extrabold text-xs shadow-xs transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-white shrink-0" />
                      <span>Admin Console</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-white shrink-0" />
                  </Link>
                )}

                {/* Customer Portal Button (White Card with Orange Border - ONLY shown if logged in) */}
                {user && (
                  <Link
                    href="/customer/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full bg-white border-2 border-[#FF6B1A] text-[#FF6B1A] hover:bg-orange-50/80 rounded-xl py-2 px-3 flex items-center justify-between font-extrabold text-xs shadow-2xs transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <User className="w-4 h-4 text-[#FF6B1A] shrink-0" />
                      <span>Customer Portal (My Account)</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-[#FF6B1A] shrink-0" />
                  </Link>
                )}

                {/* Logout or Sign In Button */}
                {user ? (
                  <button
                    type="button"
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full py-2.5 px-3 bg-[#DC2626] hover:bg-red-700 active:bg-red-800 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-white shrink-0" />
                    <span>LOGOUT</span>
                  </button>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full py-2.5 px-3 bg-gradient-to-r from-[#FF7A28] to-[#FF5500] hover:from-orange-600 hover:to-orange-500 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
                  >
                    <LogIn className="w-4 h-4 text-white shrink-0" />
                    <span>SIGN IN / LOGIN →</span>
                  </Link>
                )}
              </div>

              {/* Call 24×7 Support Card */}
              <div className="bg-[#FFF5EE] border border-orange-100 rounded-xl p-2 px-2.5 flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#FF6B1A] text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[9px] font-bold text-gray-500 block leading-tight">Call 24×7 Support</span>
                    <a href="tel:+919876543210" className="text-xs font-black text-[#1E293B] hover:text-[#FF6B1A] transition leading-tight block">
                      +91 98765 43210
                    </a>
                  </div>
                </div>
                <a
                  href="tel:+919876543210"
                  className="w-7 h-7 rounded-full bg-orange-100 text-[#FF6B1A] flex items-center justify-center hover:bg-[#FF6B1A] hover:text-white transition shrink-0 ml-2"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
