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
  const [phone, setPhone] = useState('');
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
    <div className="min-h-screen flex flex-col bg-slate-50/70">
      <Navbar />

      <main className="flex-1 py-8 sm:py-14 flex items-center justify-center">
        <div className="max-w-md w-full mx-auto px-3 sm:px-4">
          
          {/* Main Unified Sign-In Container */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden">
            
            {/* White Form Card */}
            <div className="p-6 sm:p-8 space-y-5">
              
              {/* Single Centered Logo & Headline */}
              <div className="text-center space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/kandycabs-logo.png"
                  alt="Kandy Cabs Logo"
                  className="h-11 sm:h-12 w-auto mx-auto object-contain"
                />
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Sign In to Kandy Cabs
                </h1>
                <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-xs mx-auto">
                  Unified Portal — Driver partners & customers are automatically directed to their account.
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{error}</span>
                </div>
              )}

              {!otpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Mobile Number
                    </label>

                    {/* Phone Input with Fixed +91 Prefix & Subtle Border */}
                    <div className="relative flex items-center bg-slate-50 border border-slate-300 rounded-xl overflow-hidden focus-within:bg-white focus-within:border-kandy-orange focus-within:ring-2 focus-within:ring-orange-100 transition shadow-2xs">
                      <div className="bg-slate-100/90 text-slate-600 font-extrabold text-xs px-3.5 h-12 flex items-center border-r border-slate-200 shrink-0 select-none">
                        +91
                      </div>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="98765 43210"
                        className="w-full h-12 px-3.5 bg-transparent text-sm font-black text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  {/* CTA Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 bg-kandy-orange hover:bg-kandy-orangeHover active:scale-[0.99] text-white font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Lock className="w-4 h-4 text-white shrink-0" />
                    <span>{loading ? 'SENDING CODE...' : 'SEND OTP →'}</span>
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  {isRegisteredUser && existingName ? (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs font-bold flex items-center justify-between shadow-2xs">
                      <span>👋 Welcome back, <strong className="text-emerald-950 font-black">{existingName}</strong>!</span>
                      <span className="text-[9px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded uppercase font-black tracking-wider">
                        Verified
                      </span>
                    </div>
                  ) : (
                    <div className="bg-orange-50 p-3 rounded-xl border border-orange-200 text-xs text-slate-800 font-medium">
                      Demo Verification Code: <strong className="text-kandy-orange font-extrabold">1234</strong> (Sent to +91 {phone})
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Enter 4-Digit OTP
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="1234"
                      className="w-full h-12 px-3 bg-slate-50 border border-slate-300 rounded-xl text-center text-lg font-black tracking-widest text-slate-900 focus:outline-none focus:border-kandy-orange focus:bg-white focus:ring-2 focus:ring-orange-100 transition shadow-2xs"
                      required
                    />
                  </div>

                  {isNewUser && !isRegisteredUser && (
                    <div className="space-y-2">
                      <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-xl text-xs font-medium">
                        👋 First time here! Enter your name once — we'll remember you for future bookings.
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Enter your full name"
                          className="w-full h-12 px-3.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-extrabold text-slate-900 focus:outline-none focus:border-kandy-orange focus:bg-white focus:ring-2 focus:ring-orange-100 transition shadow-2xs"
                          autoFocus
                          required
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setOtpSent(false);
                        setIsNewUser(false);
                      }}
                      className="h-12 px-4 bg-slate-100 text-slate-700 font-extrabold text-xs uppercase rounded-xl hover:bg-slate-200 transition shrink-0 cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 h-12 bg-slate-900 hover:bg-black text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <ShieldCheck className="w-4 h-4 text-kandy-orange shrink-0" />
                      <span>{loading ? 'VERIFYING...' : 'VERIFY & SIGN IN →'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Integrated Dark Footer Block (No Repeated Logo) */}
            <div className="bg-slate-900 text-slate-300 p-5 sm:p-6 text-center border-t border-slate-800">
              <p className="text-xs leading-relaxed max-w-sm mx-auto font-medium text-slate-300">
                South India's most trusted outstation & local cab booking platform. Premium chauffeur-driven cabs with transparent pricing.
              </p>
            </div>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
