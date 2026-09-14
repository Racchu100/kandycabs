'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { useAuth } from '@/context/AuthContext';
import {
  Car,
  Calendar,
  Clock,
  MapPin,
  FileText,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  XCircle,
  PhoneCall,
  User,
  ShieldCheck,
  Printer,
  Download,
  X,
  Navigation,
  LogOut,
} from 'lucide-react';

interface BookingItem {
  id: string;
  humanReadableRef: string;
  tripType: string;
  pickupAddress: string;
  dropAddress: string;
  scheduledAt: string;
  distanceKm?: number;
  estimatedFare: number;
  advanceAmount: number;
  advancePaymentStatus: string;
  balanceAmount: number;
  balancePaymentStatus: string;
  tollAmount: number;
  status: string;
  priceSnapshot?: any;
  customerPhoneReleased: boolean;
  customer?: {
    fullName?: string;
    phone?: string;
  };
  assignedDriver?: {
    fullName: string;
    licenseNumber?: string;
    user?: { phone: string };
  };
  vehicle?: {
    name: string;
    category: string;
  };
}

const formatPickupDate = (isoString?: string) => {
  if (!isoString) return 'Date Pending';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch (e) {
    return isoString;
  }
};

const formatPickupTime = (isoString?: string) => {
  if (!isoString) return '06:00 AM';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '06:00 AM';
    return d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch (e) {
    return '06:00 AM';
  }
};

export default function CustomerDashboardPage() {
  const { user, loading: authLoading, logout: handleDashboardLogout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const fetchedUserRef = useRef<string | null>(null);

  // Invoice modal state
  const [selectedInvoiceBooking, setSelectedInvoiceBooking] = useState<BookingItem | null>(null);

  // Cancellation modal state
  const [cancelTargetBooking, setCancelTargetBooking] = useState<BookingItem | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelWarning, setCancelWarning] = useState<string | null>(null);
  const [cancelSuccess, setCancelSuccess] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // OTP Login modal state
  const [loginPhone, setLoginPhone] = useState('');
  const [loginOtp, setLoginOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const handleOpenCancelModal = (b: BookingItem) => {
    setCancelTargetBooking(b);
    setCancelReason('');
    setCancelSuccess(null);

    // Calculate time until departure (in hours)
    const scheduledTime = new Date(b.scheduledAt).getTime();
    const now = Date.now();
    const diffHours = (scheduledTime - now) / (1000 * 60 * 60);

    if (diffHours < 2) {
      setCancelWarning(
        `Rides can only be cancelled at least 2 hours before departure time. Your pickup is scheduled for ${formatPickupDate(
          b.scheduledAt
        )} at ${formatPickupTime(
          b.scheduledAt
        )} (less than 2 hours away). Please contact Kandy Cabs Operations (+91 98765 43210) for urgent changes.`
      );
    } else {
      setCancelWarning(null);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelTargetBooking) return;
    setCancelling(true);
    try {
      const res = await fetch('/api/customer/cancel-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: cancelTargetBooking.id,
          cancellationReason: cancelReason || 'Cancelled by customer online',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCancelSuccess('Booking cancelled successfully!');
        setBookings((prev) =>
          prev.map((item) =>
            item.id === cancelTargetBooking.id || item.humanReadableRef === cancelTargetBooking.humanReadableRef
              ? { ...item, status: 'CANCELLED' }
              : item
          )
        );
        setTimeout(() => {
          setCancelTargetBooking(null);
        }, 1500);
      } else {
        setCancelWarning(data.error || 'Failed to cancel booking.');
      }
    } catch (err: any) {
      setCancelWarning('Error processing cancellation request.');
    } finally {
      setCancelling(false);
    }
  };

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!user) {
      setBookings([]);
      setLoading(false);
      return;
    }

    const userKey = `${user.id}_${user.phone}`;
    if (fetchedUserRef.current === userKey) {
      setLoading(false);
      return;
    }

    fetchedUserRef.current = userKey;
    fetchCustomerBookings(user.id, user.phone);
  }, [user, authLoading]);

  const fetchCustomerBookings = async (userId: string, phone?: string) => {
    try {
      const res = await fetch('/api/customer/bookings');
      if (res.ok) {
        const data = await res.json();
        const rawBookings = Array.isArray(data.bookings) ? data.bookings : [];
        const paidBookings = rawBookings.filter((b: any) => b.advancePaymentStatus === 'PAID');
        setBookings(paidBookings);
      } else {
        setBookings([]);
      }
    } catch (err) {
      console.warn('Error fetching customer bookings:', err);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-kandy-bg">
        <Navbar />
        <div className="flex-1 flex items-center justify-center font-bold text-kandy-muted">
          Loading Customer Portal...
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-kandy-bg">
      <Navbar />

      <main className="flex-1 pt-1.5 sm:pt-2.5 pb-6">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          {!user ? (
            /* Unauthenticated Prompt */
            <div className="max-w-md mx-auto bg-white p-5 sm:p-8 rounded-widget border border-kandy-border shadow-widget text-center space-y-3">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-kandy-orangeLight text-kandy-orange rounded-full mx-auto flex items-center justify-center font-black text-xl sm:text-2xl border border-orange-200">
                <User className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-kandy-ink">Customer Account Access</h2>
              <p className="text-xs text-kandy-muted">
                Please sign in to view your bookings, trip receipts, and active ride status.
              </p>
              <Link
                href="/login"
                className="block w-full py-2.5 sm:py-3 bg-kandy-orange hover:bg-kandy-orangeHover text-white font-extrabold rounded text-xs uppercase tracking-wider transition shadow-md"
              >
                SIGN IN WITH MOBILE OTP →
              </Link>
            </div>
          ) : (
            /* Logged-In Customer Dashboard */
            <div className="space-y-6">
              {/* Personalization Welcome Banner */}
              <div className="bg-gradient-to-r from-orange-50/90 via-amber-50/80 to-orange-100/60 border border-orange-200/80 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-tr from-orange-500 to-amber-500 text-white rounded-full flex items-center justify-center font-black text-2xl shadow-md border-2 border-white shrink-0">
                    {user.fullName.charAt(0)}
                  </div>
                  <div className="space-y-0.5">
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                      {user.isNewUser ? `Welcome, ${user.fullName}!` : `Welcome back, ${user.fullName}!`}
                    </h1>
                    <p className="text-xs text-slate-600 font-bold flex items-center gap-1.5">
                      <PhoneCall className="w-3.5 h-3.5 text-slate-400" />
                      <span>+91 {user.phone} • Customer Account</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 w-full md:w-auto">
                  <Link
                    href="/booking"
                    className="flex-1 md:flex-none text-center px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-black uppercase tracking-wider rounded-2xl transition shadow-md flex items-center justify-center gap-1.5"
                  >
                    <span>+ BOOK NEW CAB</span>
                  </Link>
                  <button
                    onClick={handleDashboardLogout}
                    className="px-5 py-3 bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 text-xs font-black rounded-2xl transition shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <LogOut className="w-4 h-4 text-slate-700" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>

              {/* Bookings Section */}
              <div className="space-y-4">
                <div className="border-l-4 border-orange-500 pl-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-slate-800" />
                  <h2 className="text-xl font-black text-slate-900">
                    Your Bookings & Trip Invoices
                  </h2>
                </div>

                {bookings.length === 0 ? (
                  <div className="bg-white p-8 sm:p-12 text-center rounded-3xl border border-slate-200 shadow-sm space-y-3">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                      <Car className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-black text-slate-900">No Active Bookings Found</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">You haven&apos;t booked any intercity cab yet.</p>
                    <Link
                      href="/booking"
                      className="inline-block px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md"
                    >
                      Book Your First Cab →
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bookings.map((b) => (
                      <div
                        key={b.id}
                        className="bg-white rounded-3xl border border-slate-200/90 shadow-lg p-5 sm:p-6 space-y-4"
                      >
                        {/* Top Header Row: Ref & Status Pills */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm text-slate-500 font-bold">Ref:</span>
                            <span className="text-xl font-black text-orange-500">
                              {b.humanReadableRef}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="bg-slate-900 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{b.tripType}</span>
                            </span>

                            <span
                              className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider border flex items-center gap-1 ${
                                b.status === 'TRIP_COMPLETED'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : b.status === 'CANCELLED'
                                  ? 'bg-red-100 text-red-800 border-red-300'
                                  : 'bg-amber-100 text-amber-900 border-amber-300/60'
                              }`}
                            >
                              <Clock className="w-3 h-3" />
                              <span>{b.status === 'DRIVER_ACCEPTED' ? 'DISPATCH ACCEPTED' : b.status.replace('_', ' ')}</span>
                            </span>
                          </div>
                        </div>

                        {/* Route Locations */}
                        <div className="space-y-2 text-xs font-bold text-slate-800 pl-1">
                          <div className="flex items-start gap-2.5">
                            <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <span>{b.pickupAddress}</span>
                          </div>
                          <div className="flex items-start gap-2.5">
                            <Navigation className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                            <span>{b.dropAddress}</span>
                          </div>
                        </div>

                        {/* Date & Time Strip */}
                        <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-700 pt-1 border-t border-slate-100">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-orange-500" />
                            <span>{formatPickupDate(b.scheduledAt)}</span>
                          </span>

                          <span className="flex items-center gap-1.5 text-orange-600 bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200">
                            <Clock className="w-4 h-4 text-orange-500" />
                            <span>{formatPickupTime(b.scheduledAt)}</span>
                          </span>

                          <span className="flex items-center gap-1.5 text-slate-600">
                            <User className="w-4 h-4 text-slate-400" />
                            <span>{b.vehicle?.name || 'HATCHBACK (CNG)'} {b.distanceKm ? `• ~${b.distanceKm} km` : ''}</span>
                          </span>
                        </div>

                        {/* Driver Status Banner */}
                        <div>
                          {b.customerPhoneReleased && b.assignedDriver ? (
                            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl text-xs text-emerald-900 flex items-center justify-between">
                              <div className="font-bold">
                                <strong>Driver Assigned:</strong> {b.assignedDriver.fullName}
                              </div>
                              <a
                                href={`tel:${b.assignedDriver.user?.phone}`}
                                className="flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-1 rounded-xl font-black text-xs uppercase shadow-sm"
                              >
                                <PhoneCall className="w-3.5 h-3.5" /> Call Driver
                              </a>
                            </div>
                          ) : (
                            <div className="bg-orange-50/60 border border-orange-200/80 p-3 rounded-2xl text-xs text-slate-700 flex items-center gap-2.5">
                              <ShieldCheck className="w-5 h-5 text-orange-500 shrink-0" />
                              <span className="font-medium">Driver details will be released by ops prior to pickup time.</span>
                            </div>
                          )}
                        </div>

                        {/* Footer: Price Summary Box & Action Buttons */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                          {/* Price Summary */}
                          <div className="md:col-span-2 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-1.5">
                            <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                              ESTIMATED TOTAL
                            </div>
                            <div className="text-2xl font-black text-slate-900">
                              ₹{b.estimatedFare.toLocaleString()}
                            </div>
                            <div className="flex justify-between items-center text-xs font-black text-emerald-600 pt-1 border-t border-slate-200/60">
                              <span>25% Advance Paid:</span>
                              <span>₹{b.advanceAmount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                              <span>Balance Pending:</span>
                              <span>₹{b.balanceAmount.toLocaleString()}</span>
                            </div>
                          </div>

                          {/* Action Buttons Column */}
                          <div className="flex flex-col justify-center gap-2">
                            {b.status !== 'CANCELLED' && b.status !== 'TRIP_COMPLETED' && (
                              <button
                                onClick={() => handleOpenCancelModal(b)}
                                className="w-full py-2.5 px-4 border-2 border-red-500 hover:bg-red-50 text-red-600 font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5"
                              >
                                <XCircle className="w-4 h-4 text-red-600" />
                                <span>CANCEL RIDE</span>
                              </button>
                            )}
                            <button
                              onClick={() => setSelectedInvoiceBooking(b)}
                              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-black text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-md flex items-center justify-center gap-1.5"
                            >
                              <FileText className="w-4 h-4 text-orange-500" />
                              <span>VIEW INVOICE</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Invoice Modal */}
      {selectedInvoiceBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4">
          <div className="bg-white rounded-widget border border-kandy-border max-w-2xl w-full max-h-[90vh] overflow-y-auto p-3.5 sm:p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-kandy-border pb-2.5 sm:pb-4 mb-3 sm:mb-6">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/kandycabs-logo.png"
                  alt="Kandy Cabs Logo"
                  className="h-8 sm:h-10 w-auto object-contain shrink-0"
                />
                <div>
                  <h3 className="text-base sm:text-lg font-black text-kandy-ink">Tax Invoice</h3>
                  <p className="text-[9px] sm:text-[10px] text-kandy-muted font-medium">Kandy Cabs India Pvt Ltd • GSTIN: 29AABCK1234F1Z5</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedInvoiceBooking(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-kandy-ink" />
              </button>
            </div>

            <div className="space-y-2.5 sm:space-y-4 text-xs text-kandy-ink mb-3.5 sm:mb-6">
              <div className="flex justify-between bg-kandy-bg p-2 sm:p-3 rounded">
                <div>
                  <div className="text-kandy-muted font-bold text-[10px] sm:text-xs">Invoice Ref:</div>
                  <div className="font-extrabold text-kandy-orange text-xs sm:text-sm">{selectedInvoiceBooking.humanReadableRef}</div>
                </div>
                <div className="text-right">
                  <div className="text-kandy-muted font-bold text-[10px] sm:text-xs">Invoice Date:</div>
                  <div className="font-bold text-xs sm:text-sm">{new Date().toLocaleDateString('en-IN')}</div>
                </div>
              </div>

              {/* Scheduled Pickup Date & Pickup Time Box */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 bg-orange-50/80 border border-orange-200 p-2 sm:p-3 rounded">
                <div>
                  <span className="text-[9px] sm:text-[10px] text-kandy-muted font-bold uppercase block">Scheduled Pickup Date & Time</span>
                  <div className="font-extrabold text-kandy-orange text-[11px] sm:text-xs flex items-center gap-1.5 mt-0.5 sm:mt-1">
                    <Calendar className="w-3.5 h-3.5 text-kandy-orange shrink-0" />
                    <span>{formatPickupDate(selectedInvoiceBooking.scheduledAt)}</span>
                    <span className="mx-0.5 text-orange-300">•</span>
                    <Clock className="w-3.5 h-3.5 text-kandy-orange shrink-0" />
                    <span>{formatPickupTime(selectedInvoiceBooking.scheduledAt)}</span>
                  </div>
                </div>
                <div>
                  <span className="text-[9px] sm:text-[10px] text-kandy-muted font-bold uppercase block">Trip Distance & Type</span>
                  <div className="font-bold text-kandy-ink text-[11px] sm:text-xs flex items-center gap-2 mt-0.5 sm:mt-1">
                    <span>~{selectedInvoiceBooking.distanceKm || 180} km</span>
                    <span className="text-kandy-muted">•</span>
                    <span className="bg-kandy-ink text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase">
                      {selectedInvoiceBooking.tripType}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-4 border-b border-kandy-border pb-2.5 sm:pb-4 text-[11px] sm:text-xs">
                <div>
                  <span className="text-kandy-muted font-bold block uppercase text-[9px] sm:text-[10px]">Pickup Location</span>
                  <span className="font-semibold">{selectedInvoiceBooking.pickupAddress}</span>
                </div>
                <div>
                  <span className="text-kandy-muted font-bold block uppercase text-[9px] sm:text-[10px]">Drop Location</span>
                  <span className="font-semibold">{selectedInvoiceBooking.dropAddress}</span>
                </div>
              </div>

              <div className="space-y-1 sm:space-y-2 text-[11px] sm:text-xs">
                <div className="flex justify-between py-0.5 sm:py-1 border-b border-gray-100">
                  <span>Customer Details:</span>
                  <span className="font-bold text-kandy-ink">
                    {user?.fullName || selectedInvoiceBooking.customer?.fullName || 'Valued Customer'} (+91 {user?.phone || 'Account'})
                  </span>
                </div>
                <div className="flex justify-between py-0.5 sm:py-1 border-b border-gray-100">
                  <span>Vehicle Model:</span>
                  <span className="font-bold">{selectedInvoiceBooking.vehicle?.name || 'SEDAN (Standard)'}</span>
                </div>
                <div className="flex justify-between py-0.5 sm:py-1 border-b border-gray-100">
                  <span>Trip Fare Subtotal:</span>
                  <span className="font-bold">₹{Math.round(selectedInvoiceBooking.estimatedFare * 0.95).toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-0.5 sm:py-1 border-b border-gray-100">
                  <span>Driver Allowance:</span>
                  <span className="font-bold text-emerald-700">
                    {selectedInvoiceBooking.priceSnapshot?.breakdown?.driverAllowance
                      ? `₹${selectedInvoiceBooking.priceSnapshot.breakdown.driverAllowance.toLocaleString()} (Included)`
                      : 'Included in Fare'}
                  </span>
                </div>
                <div className="flex justify-between py-0.5 sm:py-1 border-b border-gray-100">
                  <span>GST (5%):</span>
                  <span className="font-bold">₹{Math.round(selectedInvoiceBooking.estimatedFare * 0.05).toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1.5 text-xs sm:text-sm font-black text-kandy-orange border-t-2 border-kandy-border">
                  <span>Total Invoice Amount:</span>
                  <span>₹{selectedInvoiceBooking.estimatedFare.toLocaleString()}</span>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 p-2 sm:p-3 rounded space-y-1 text-[11px] sm:text-xs">
                <div className="flex justify-between font-bold text-emerald-800">
                  <span>25% Advance Paid Online:</span>
                  <span>₹{selectedInvoiceBooking.advanceAmount.toLocaleString()} (PAID)</span>
                </div>
                <div className="flex justify-between font-bold text-kandy-ink">
                  <span>75% Balance Pending:</span>
                  <span>₹{selectedInvoiceBooking.balanceAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 sm:gap-3 pt-2.5 sm:pt-4 border-t border-kandy-border">
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-kandy-bg text-kandy-ink font-bold text-[11px] sm:text-xs rounded hover:bg-gray-200 flex items-center gap-1 sm:gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" /> Print Invoice
              </button>
              <button
                onClick={() => window.print()}
                className="px-3.5 py-1.5 sm:px-5 sm:py-2 bg-kandy-orange text-white font-bold text-[11px] sm:text-xs uppercase tracking-wider rounded hover:bg-kandy-orangeHover flex items-center gap-1 sm:gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Modal */}
      {cancelTargetBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-widget border border-kandy-border max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-kandy-border pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-red-100 text-red-600 rounded flex items-center justify-center">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-kandy-ink">Cancel Ride</h3>
                  <p className="text-[10px] text-kandy-muted">Ref: {cancelTargetBooking.humanReadableRef}</p>
                </div>
              </div>
              <button
                onClick={() => setCancelTargetBooking(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-kandy-ink" />
              </button>
            </div>

            {cancelSuccess ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded text-xs font-bold text-center flex flex-col items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                <span>{cancelSuccess}</span>
              </div>
            ) : cancelWarning ? (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-300 text-amber-900 p-4 rounded text-xs leading-relaxed space-y-2">
                  <div className="flex items-center gap-2 font-bold text-amber-800 text-sm">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                    <span>Cancellation Notice</span>
                  </div>
                  <p>{cancelWarning}</p>
                </div>
                <div className="flex justify-end pt-2 border-t border-kandy-border">
                  <button
                    onClick={() => setCancelTargetBooking(null)}
                    className="px-5 py-2 bg-kandy-ink text-white text-xs font-extrabold uppercase rounded hover:bg-black"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-kandy-ink leading-relaxed">
                  Are you sure you want to cancel booking <strong>{cancelTargetBooking.humanReadableRef}</strong> scheduled for{' '}
                  <strong>{formatPickupDate(cancelTargetBooking.scheduledAt)}</strong> at{' '}
                  <strong>{formatPickupTime(cancelTargetBooking.scheduledAt)}</strong>?
                </p>

                <div>
                  <label className="block text-[11px] font-bold text-kandy-muted uppercase mb-1">
                    Reason for Cancellation (Optional)
                  </label>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="e.g. Plans changed, booked another cab..."
                    rows={3}
                    className="w-full text-xs p-2.5 border border-kandy-border rounded focus:outline-none focus:ring-1 focus:ring-kandy-orange"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-kandy-border">
                  <button
                    onClick={() => setCancelTargetBooking(null)}
                    disabled={cancelling}
                    className="px-4 py-2 text-xs font-bold text-kandy-ink border border-kandy-border rounded hover:bg-gray-100"
                  >
                    Keep Ride
                  </button>
                  <button
                    onClick={handleConfirmCancel}
                    disabled={cancelling}
                    className="px-5 py-2 text-xs font-extrabold text-white bg-red-600 hover:bg-red-700 rounded uppercase tracking-wider disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
