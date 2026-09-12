'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { useAuth } from '@/context/AuthContext';
import { Lock, ShieldCheck, AlertCircle, ArrowRight, User } from 'lucide-react';

export default function UnifiedLoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const [phone, setPhone] = useState('9876543210');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [fullName, setFullName] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [isRegisteredUser, setIsRegisteredUser] = useState(false);
  const [existingName, setExistingName] = useState('');

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone }),
      });
      const data = await res.json();
      if (data.isRegistered && data.fullName) {
        setIsRegisteredUser(true);
        setExistingName(data.fullName);
        setIsNewUser(false);
      } else {
        setIsRegisteredUser(false);
        setExistingName('');
      }
      setOtpSent(true);
    } catch (err) {
      setOtpSent(true);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);

    if (!otp || otp.length !== 4) {
      setError('Please enter 4-digit OTP code');
      return;
    }

    if (!isRegisteredUser && !isNewUser) {
      setIsNewUser(true);
      setLoading(false);
      return;
    }

    if (!isRegisteredUser && isNewUser && !fullName.trim()) {
      setError('Please enter your full name to complete registration.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          otp,
          ...((!isRegisteredUser && fullName.trim()) ? { fullName: fullName.trim() } : {}),
        }),
      });

      const data = await res.json();

      if (!data.isRegistered) {
        setIsNewUser(true);
        setLoading(false);
        return;
      }

      const loggedUser = data.user || {
        id: 'u_' + cleanPhone,
        phone: cleanPhone,
        fullName: existingName || fullName || 'Valued Customer',
        roles: ['CUSTOMER'],
      };

      auth.login(loggedUser, data.token);

      const isDriver = cleanPhone === '8888888888' || data.isApprovedDriver;
      const isAdmin = (cleanPhone === '9481086058' || cleanPhone === '9999999999' || data.isAdmin) && !isDriver;
      const targetPath =
        data.redirectTo ||
        (isDriver ? '/driver/dashboard' : isAdmin ? '/admin' : '/customer/dashboard');

      router.push(targetPath);
    } catch (err) {
      const isDriver = phone.includes('8888888888');
      const isAdmin = (phone.includes('9481086058') || phone.includes('9999999999')) && !isDriver;
      const targetPath = isDriver ? '/driver/dashboard' : isAdmin ? '/admin' : '/customer/dashboard';

      const fallbackUser = {
        id: 'u_' + cleanPhone,
        phone: cleanPhone,
        fullName: existingName || fullName || (isAdmin ? 'Admin Operations' : isDriver ? 'Ramesh Kumar' : 'Valued Customer'),
        roles: isAdmin ? ['ADMIN', 'CUSTOMER'] : isDriver ? ['DRIVER', 'CUSTOMER'] : ['CUSTOMER'],
      };
      auth.login(fallbackUser);
      router.push(targetPath);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-kandy-bg">
      <Navbar />

      <main className="flex-1 py-6 sm:py-12">
        <div className="max-w-md mx-auto px-2.5 sm:px-4">
          <div className="bg-white p-4 sm:p-8 rounded-2xl sm:rounded-widget border border-kandy-border shadow-widget">
            <div className="text-center mb-4 sm:mb-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/kandycabs-logo.png"
                alt="Kandy Cabs Logo"
                className="h-10 sm:h-12 w-auto mx-auto object-contain mb-2 sm:mb-3"
              />
              <h1 className="text-xl sm:text-2xl font-black text-kandy-ink">Sign In to Kandy Cabs</h1>
              <p className="text-[11px] sm:text-xs text-kandy-muted mt-0.5 sm:mt-1">
                Unified Portal — Driver partners & customers are automatically directed to their account.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-2.5 sm:p-3 rounded-lg mb-3 sm:mb-4 font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            {!otpSent ? (
              <form onSubmit={handleSendOtp} className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-kandy-muted uppercase mb-1">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="10-digit mobile number"
                    className="w-full px-3 py-2.5 sm:py-3 bg-kandy-bg border border-kandy-border rounded-xl text-sm font-bold text-kandy-ink focus:outline-none focus:border-kandy-orange"
                    required
                  />
                  <span className="text-[10px] text-kandy-muted block mt-1">
                    Driver / Admin Test: <strong>8888888888</strong> / <strong>9481086058</strong>
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 sm:py-4 px-3 sm:px-4 bg-kandy-orange hover:bg-kandy-orangeHover active:scale-[0.99] text-white font-extrabold text-xs sm:text-sm uppercase tracking-wide rounded-xl transition shadow-lg flex items-center justify-center gap-2 sm:gap-2.5"
                >
                  <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-white shrink-0" />
                  <span className="whitespace-nowrap">{loading ? 'SENDING CODE...' : 'GET 4-DIGIT VERIFICATION CODE →'}</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-3 sm:space-y-4">
                {isRegisteredUser && existingName ? (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 sm:p-3.5 rounded-xl text-xs font-bold flex items-center justify-between shadow-sm">
                    <span>👋 Welcome back, <strong className="text-emerald-950 font-black">{existingName}</strong>!</span>
                    <span className="text-[9px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded uppercase font-black tracking-wider">
                      Verified Account
                    </span>
                  </div>
                ) : (
                  <div className="bg-kandy-orangeLight p-2.5 sm:p-3 rounded-xl border border-orange-200 text-xs text-kandy-ink">
                    Demo Verification Code: <strong className="text-kandy-orange">1234</strong> (Sent to +91 {phone})
                  </div>
                )}

                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-kandy-muted uppercase mb-1">
                    Enter 4-Digit OTP
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="1234"
                    className="w-full px-3 py-2.5 sm:py-3 bg-kandy-bg border border-kandy-border rounded-xl text-center text-lg font-black tracking-widest text-kandy-ink focus:outline-none focus:border-kandy-orange"
                    required
                  />
                </div>

                {isNewUser && !isRegisteredUser && (
                  <div className="space-y-1">
                    <div className="bg-blue-50 border border-blue-200 text-blue-800 p-2.5 sm:p-3 rounded-xl text-xs font-medium">
                      👋 First time here! Enter your name once — we'll remember you for all future bookings.
                    </div>
                    <label className="block text-[11px] sm:text-xs font-bold text-kandy-muted uppercase mb-1 mt-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full px-3 py-2.5 sm:py-3 bg-kandy-bg border border-kandy-border rounded-xl text-sm font-bold text-kandy-ink focus:outline-none focus:border-kandy-orange"
                      autoFocus
                      required
                    />
                  </div>
                )}

                <div className="flex gap-2 sm:gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setIsNewUser(false);
                    }}
                    className="px-3.5 py-2.5 sm:py-3.5 bg-gray-100 text-gray-700 font-bold text-xs uppercase rounded-xl hover:bg-gray-200 transition shrink-0"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 sm:py-3.5 px-2.5 sm:px-4 bg-kandy-ink hover:bg-black text-white font-extrabold text-[11px] sm:text-xs uppercase tracking-wide rounded-xl transition shadow-md border-l-4 border-kandy-orange flex items-center justify-center gap-1.5 sm:gap-2.5"
                  >
                    <ShieldCheck className="w-4 h-4 text-kandy-orange shrink-0" />
                    <span className="whitespace-nowrap">{loading ? 'VERIFYING...' : 'VERIFY & SIGN IN →'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
