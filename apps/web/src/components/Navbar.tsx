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
import { SideMenu } from '@/components/SideMenu';

interface NavbarProps {
  transparentOnTop?: boolean;
}

export function Navbar({ transparentOnTop = false }: NavbarProps = {}) {
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

  const isAdmin = Boolean(
    user &&
    (user.phone?.includes('9481086058') ||
      user.phone?.includes('9999999999') ||
      (Array.isArray(user.roles) && user.roles.includes('ADMIN')))
  );

  const isApprovedDriver = Boolean(
    user &&
    (user.driver?.status === 'APPROVED' ||
      user.driver?.isVerifiedByAdmin === true ||
      (Array.isArray(user.roles) && user.roles.includes('DRIVER')))
  );

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-200 ${
        isScrolled
          ? 'bg-white/95 backdrop-blur-md shadow-md border-b border-gray-100/80'
          : transparentOnTop
          ? 'bg-transparent shadow-none border-b-0'
          : 'bg-white shadow-none border-b-0'
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
      <SideMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        user={user}
        isAdmin={isAdmin}
        isApprovedDriver={isApprovedDriver}
        onLogout={handleLogout}
        supportPhone="+91 98765 43210"
      />
    </header>
  );
}
